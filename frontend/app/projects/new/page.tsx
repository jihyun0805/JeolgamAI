"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MainSidebar from "@/app/components/main-sidebar";
import PageTopBar from "@/app/components/page-top-bar";
import { authFetch } from "@/lib/auth-fetch";
import { updateStoredWorkspace } from "@/lib/jwt-store";

const REGION_OPTIONS = [
  {
    value: "ap-northeast-2",
    label: "서울 (ap-northeast-2)",
    description: "현재 비용 분석과 권고는 서울 리전 기준으로 가장 잘 맞춰져 있습니다.",
  },
  {
    value: "ap-northeast-1",
    label: "도쿄 (ap-northeast-1)",
    description: "프로젝트 분리용으로 선택할 수 있지만, 일부 비용 문구는 서울 기준으로 안내될 수 있습니다.",
  },
  {
    value: "us-west-2",
    label: "오레곤 (us-west-2)",
    description: "글로벌 워크로드 테스트용 리전입니다.",
  },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [awsRegion, setAwsRegion] = useState("ap-northeast-2");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedRegion = useMemo(
    () => REGION_OPTIONS.find((option) => option.value === awsRegion) ?? REGION_OPTIONS[0],
    [awsRegion],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError("프로젝트 이름은 2자 이상이어야 합니다.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const createResponse = await authFetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          awsRegion,
        }),
      });
      const createPayload = await createResponse.json().catch(() => null);
      if (!createResponse.ok || !createPayload?.ok || !createPayload?.data?.project) {
        throw new Error(createPayload?.error?.message ?? "프로젝트를 생성하지 못했습니다.");
      }

      const createdProject = createPayload.data.project as {
        id: string;
        name: string;
        awsRegion: string;
      };

      const selectResponse = await authFetch("/api/projects/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: createdProject.id }),
      });
      const selectPayload = await selectResponse.json().catch(() => null);
      if (!selectResponse.ok || !selectPayload?.ok) {
        throw new Error(selectPayload?.error?.message ?? "프로젝트 활성화에 실패했습니다.");
      }

      updateStoredWorkspace(createdProject.id);
      router.push(`/dashboard?createdProject=${encodeURIComponent(createdProject.id)}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "프로젝트 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#0b0f14] text-slate-100">
      <MainSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <PageTopBar
          title="프로젝트 생성"
          description="새 프로젝트를 만들고 바로 active project로 전환할 수 있습니다."
        />

        <main className="flex-1 overflow-auto px-6 py-8 md:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(17rem,19.5rem)]">
            <section className="rounded-[28px] border border-white/8 bg-[#171b22] p-6 shadow-[0_24px_80px_rgba(5,10,20,0.35)]">
              <div className="mb-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand">
                  New Workspace
                </p>
                <h1 className="mt-3 text-balance text-2xl font-black tracking-tight text-white sm:text-3xl">
                  운영 단위를 분리할 프로젝트를 만드세요
                </h1>
                <div className="mt-2 space-y-1 text-sm leading-relaxed text-slate-400 sm:leading-7 xl:text-[15px]">
                  <p className="text-pretty">
                    분석, 알림, 리포트, 권고는 모두 active project 기준으로 묶입니다. 프로젝트를 새로 만들면 현재 계정이
                    관리자 권한으로 바로 연결되고,
                  </p>
                  <p className="text-pretty xl:whitespace-nowrap">생성 직후 해당 프로젝트로 전환됩니다.</p>
                </div>
              </div>

              <form className="grid gap-6" onSubmit={onSubmit}>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(16rem,0.9fr)]">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-slate-200">프로젝트 이름</span>
                    <input
                      value={name}
                      onChange={(event) => {
                        setName(event.target.value);
                        setError("");
                      }}
                      placeholder="예: 서울 결제 인프라 비용 최적화"
                      className="h-14 rounded-2xl border border-white/10 bg-[#0f1319] px-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-brand/60 focus:ring-2 focus:ring-brand/15"
                    />
                    <span className="text-xs text-slate-500">
                      팀이 한눈에 알아볼 수 있는 서비스명 + 목적 조합으로 적는 것이 좋습니다.
                    </span>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-slate-200">AWS 리전</span>
                    <select
                      value={awsRegion}
                      onChange={(event) => setAwsRegion(event.target.value)}
                      className="h-14 rounded-2xl border border-white/10 bg-[#0f1319] px-4 text-base text-white outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/15"
                    >
                      {REGION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-slate-500">{selectedRegion.description}</span>
                  </label>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200">
                    {error}
                  </div>
                ) : null}

                <div className="rounded-[24px] border border-white/8 bg-[#0f1319] p-5">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">
                        Preview
                      </p>
                      <h2 className="mt-3 text-2xl font-black text-white">
                        {name.trim() || "새 프로젝트 이름"}
                      </h2>
                      <p className="mt-2 text-pretty text-sm leading-relaxed text-slate-400 sm:leading-7 xl:text-[15px]">
                        생성 후 이 프로젝트가 active project가 되고, 대시보드와 AI 최적화 화면이 이 기준으로 갱신됩니다.
                      </p>
                    </div>

                    <div className="w-full shrink-0 rounded-2xl border border-brand/20 bg-brand/10 px-4 py-4 lg:w-auto lg:min-w-[27rem]">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8fb5ff]">
                        생성 후 바로 할 일
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-200">
                        <li className="lg:whitespace-nowrap">
                          1. 연동 메뉴에서 AWS / K8s / Prometheus 연결
                        </li>
                        <li>2. 비용 분석 실행</li>
                        <li>3. 최적화 점수와 권고 확인</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-2">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/5"
                  >
                    이전으로
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-2xl bg-brand px-5 py-3 text-sm font-bold text-white transition hover:bg-[#4a83ff] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "프로젝트 생성 중..." : "프로젝트 생성하고 시작하기"}
                  </button>
                </div>
              </form>
            </section>

            <aside className="min-w-0 rounded-[28px] border border-white/8 bg-[#131720] px-4 py-5 shadow-[0_24px_80px_rgba(5,10,20,0.28)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">
                Guide
              </p>
              <h2 className="mt-2 text-lg font-black tracking-tight text-white xl:text-xl xl:whitespace-nowrap">
                프로젝트 분리 가이드
              </h2>

              <div className="mt-4 space-y-2.5">
                {[
                  {
                    title: "서비스 단위로 분리",
                    body: "결제, 백오피스, 데이터 파이프라인처럼 실제 운영 책임이 다른 단위로 나누세요.",
                  },
                  {
                    title: "리전 단위로 구분",
                    body: "서울과 글로벌 리전을 섞으면 비용 비교와 권고 해석이 어려워집니다.",
                  },
                  {
                    title: "시연용도 별도 분리",
                    body: "실서비스와 별개로 부하 테스트 또는 데모 프로젝트를 만들면 비교가 쉬워집니다.",
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl border border-white/8 bg-[#0f1319] px-3 py-2.5">
                    <h3 className="text-[13px] font-bold leading-snug text-white">{item.title}</h3>
                    <p className="mt-1.5 text-[12px] leading-5 text-slate-400">{item.body}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
