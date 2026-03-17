#!/usr/bin/env python3
"""GitLab MR diff를 GMS(OpenAI 호환 엔드포인트)로 보내 코드 리뷰 코멘트를 남긴다."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import textwrap
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Iterable


REVIEW_MARKER = "<!-- gms-ai-review -->"


@dataclass
class ReviewArea:
    name: str
    path_prefix: str
    label: str


AREAS = (
    ReviewArea(name="frontend", path_prefix="frontend/", label="프론트엔드"),
    ReviewArea(name="backend", path_prefix="backend/", label="백엔드"),
)


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def require_any_env(*names: str) -> str:
    for name in names:
        value = os.getenv(name, "").strip()
        if value:
            return value
    joined = ", ".join(names)
    raise SystemExit(f"Missing required environment variable: one of {joined}")


def run_git(*args: str) -> str:
    completed = subprocess.run(
        ["git", *args],
        check=True,
        capture_output=True,
        text=True,
    )
    return completed.stdout


def fetch_target_branch(target_branch: str) -> None:
    subprocess.run(
        ["git", "fetch", "origin", target_branch, "--depth=200"],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )


def get_changed_files(target_branch: str) -> list[str]:
    diff_output = run_git("diff", "--name-only", f"origin/{target_branch}...HEAD", "--", "frontend", "backend")
    return [line.strip() for line in diff_output.splitlines() if line.strip()]


def area_files(files: Iterable[str], prefix: str) -> list[str]:
    return [path for path in files if path.startswith(prefix)]


def get_diff(target_branch: str, files: list[str], max_bytes: int) -> str:
    if not files:
        return ""
    diff = run_git("diff", "--unified=3", f"origin/{target_branch}...HEAD", "--", *files)
    encoded = diff.encode("utf-8")
    if len(encoded) <= max_bytes:
        return diff

    truncated = encoded[:max_bytes].decode("utf-8", errors="ignore")
    notice = (
        "\n\n[주의] 변경 diff가 길어서 일부만 전달했습니다. "
        "모델은 잘린 범위 기준으로 리뷰합니다.\n"
    )
    return truncated + notice


def call_gms_review(gms_key: str, model: str, area: ReviewArea, files: list[str], diff: str) -> str:
    file_list = "\n".join(f"- {path}" for path in files) if files else "- 변경 파일 없음"
    prompt = textwrap.dedent(
        f"""
        너는 GitLab Merge Request 전용 시니어 코드 리뷰어다.
        아래 변경분은 {area.label} 영역만 포함한다.

        리뷰 원칙:
        - 버그, 보안, 회귀, 운영 리스크, 테스트 누락을 우선 본다.
        - 사소한 스타일 지적은 생략한다.
        - 실제 문제가 있는 항목만 적는다.
        - 문제가 없으면 '중대한 문제 없음'이라고 쓰고, 남은 리스크만 짧게 적는다.
        - 답변은 한국어로 작성한다.

        출력 형식:
        1. 한 줄 총평
        2. 주요 발견사항
           - 형식: [심각도] 파일경로 - 문제 - 이유 - 권장 수정
        3. 테스트/검증 메모

        변경 파일:
        {file_list}

        변경 diff:
        ```diff
        {diff}
        ```
        """
    ).strip()

    body = {
        "model": model,
        "temperature": 0.1,
        "messages": [
            {
                "role": "system",
                "content": "코드 리뷰 품질을 우선하고, 과장 없이 사실만 말한다.",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
    }
    req = urllib.request.Request(
        "https://gms.ssafy.io/gmsapi/api.openai.com/v1/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {gms_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise SystemExit(f"GMS review request failed: HTTP {exc.code} {detail}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"GMS review request failed: {exc.reason}") from exc

    choices = payload.get("choices") or []
    if not choices:
        raise SystemExit(f"GMS review response missing choices: {json.dumps(payload, ensure_ascii=False)}")
    message = choices[0].get("message") or {}
    content = message.get("content", "").strip()
    if not content:
        raise SystemExit(f"GMS review response missing content: {json.dumps(payload, ensure_ascii=False)}")
    return content


def build_note(area_reviews: list[tuple[ReviewArea, list[str], str]], skipped: list[ReviewArea], truncated_limit: int) -> str:
    sections: list[str] = [
        REVIEW_MARKER,
        "## GMS 자동 코드 리뷰",
        "",
        f"- 모델: `{os.getenv('GMS_REVIEW_MODEL', 'gpt-4o-mini')}`",
        f"- 기준 브랜치: `{require_env('CI_MERGE_REQUEST_TARGET_BRANCH_NAME')}`",
        f"- 리뷰 범위: `frontend/**`, `backend/**`",
        f"- diff 최대 전달 크기: 영역당 `{truncated_limit}` bytes",
        "",
    ]

    for area, files, review in area_reviews:
        sections.extend(
            [
                f"### {area.label}",
                "",
                "**변경 파일**",
                "",
                *[f"- `{path}`" for path in files],
                "",
                review,
                "",
            ]
        )

    if skipped:
        sections.extend(
            [
                "### 스킵된 영역",
                "",
                *[f"- {area.label}: 변경 파일 없음" for area in skipped],
                "",
            ]
        )

    sections.extend(
        [
            "---",
            "- 이 코멘트는 MR 재실행 시 같은 봇 코멘트를 갱신합니다.",
            "- 설정 변수: `GMS_KEY`, `GITLAB_API_TOKEN`, 선택값 `GMS_REVIEW_MODEL`",
        ]
    )
    return "\n".join(sections).strip()


def gitlab_request(method: str, url: str, token: str, data: dict | None = None) -> dict | list:
    encoded = None
    headers = {"PRIVATE-TOKEN": token}
    if data is not None:
        encoded = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(url, data=encoded, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise SystemExit(f"GitLab API request failed: {method} {url} -> HTTP {exc.code} {detail}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"GitLab API request failed: {method} {url} -> {exc.reason}") from exc


def upsert_mr_note(note_body: str) -> None:
    api_base = require_env("CI_API_V4_URL")
    project_id = urllib.parse.quote_plus(require_env("CI_PROJECT_ID"))
    mr_iid = require_env("CI_MERGE_REQUEST_IID")
    token = require_env("GITLAB_API_TOKEN")
    notes_url = f"{api_base}/projects/{project_id}/merge_requests/{mr_iid}/notes"

    notes = gitlab_request("GET", notes_url, token)
    existing = None
    if isinstance(notes, list):
        for note in notes:
            body = note.get("body", "")
            if REVIEW_MARKER in body:
                existing = note
                break

    if existing:
        note_id = existing["id"]
        gitlab_request("PUT", f"{notes_url}/{note_id}", token, {"body": note_body})
        print(f"Updated existing MR review note: {note_id}")
    else:
        created = gitlab_request("POST", notes_url, token, {"body": note_body})
        print(f"Created MR review note: {created.get('id')}")


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    target_branch = require_env("CI_MERGE_REQUEST_TARGET_BRANCH_NAME")
    gms_key = require_any_env("GMS_KEY", "GMS_API_KEY")
    model = os.getenv("GMS_REVIEW_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"
    max_bytes = int(os.getenv("GMS_REVIEW_MAX_DIFF_BYTES", "45000"))

    fetch_target_branch(target_branch)
    changed_files = get_changed_files(target_branch)
    if not changed_files:
        print("No frontend/backend changes detected; nothing to review.")
        return

    area_reviews: list[tuple[ReviewArea, list[str], str]] = []
    skipped: list[ReviewArea] = []
    for area in AREAS:
        files = area_files(changed_files, area.path_prefix)
        if not files:
            skipped.append(area)
            continue
        diff = get_diff(target_branch, files, max_bytes=max_bytes)
        if not diff.strip():
            skipped.append(area)
            continue
        review = call_gms_review(gms_key=gms_key, model=model, area=area, files=files, diff=diff)
        area_reviews.append((area, files, review))

    if not area_reviews:
        print("No frontend/backend diff remained after filtering; nothing to post.")
        return

    note_body = build_note(area_reviews=area_reviews, skipped=skipped, truncated_limit=max_bytes)
    if dry_run:
        print(note_body)
        return
    upsert_mr_note(note_body)


if __name__ == "__main__":
    main()
