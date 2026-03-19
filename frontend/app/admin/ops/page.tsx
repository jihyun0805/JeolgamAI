"use client";

import { useEffect, useState } from "react";
import MainSidebar from "@/app/components/main-sidebar";
import PageTopBar from "@/app/components/page-top-bar";

interface AuditEvent {
  id: string;
  createdAt: string;
  actor: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  result: string;
  metadata?: Record<string, string>;
}

function formatLogTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function getInitials(name: string) {
  return name
    .split(/[@._\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

function resultBadgeClass(result: string) {
  const r = result.toLowerCase();
  if (r === "success" || r === "ok" || r === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  }
  if (r === "error" || r === "failed" || r === "failure") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300";
  }
  if (r === "partial" || r === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  }
  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function SkeletonRow() {
  return (
    <tr>
      {[120, 160, 140, 260, 72].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div
            className="h-3.5 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800"
            style={{ width: w }}
          />
        </td>
      ))}
    </tr>
  );
}

export default function OpsPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAudit() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(page),
          size: String(pageSize),
        });
        const response = await fetch(`/api/audit?${params.toString()}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !payload?.ok || !payload?.data) {
          throw new Error(payload?.error?.message ?? "운영 로그를 불러오지 못했습니다.");
        }
        if (!cancelled) {
          setEvents(payload.data.events ?? []);
          setCount(payload.data.count ?? 0);
          setTotalPages(payload.data.totalPages ?? 1);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAudit().catch(() => {});
    return () => { cancelled = true; };
  }, [page, pageSize]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8] text-slate-900 dark:bg-[#0f1218] dark:text-slate-100">
      <MainSidebar active="ops" />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageTopBar
          title="운영 로그"
          description="현재 프로젝트 범위의 감사 이벤트를 시간 역순으로 표시합니다."
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-8">
          <div className="flex min-h-0 flex-1 flex-col gap-4">

            {error ? (
              <div className="shrink-0 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                {error}
              </div>
            ) : null}

            <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1a2029]">

              {/* toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <p className="text-[10px] font-bold tracking-[0.22em] text-slate-400 uppercase">
                    Audit Log
                  </p>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-[#0f1218] dark:text-slate-400">
                    총 {loading ? "…" : count.toLocaleString("ko-KR")}건
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">표시</span>
                  <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-[#0f1218]">
                    {[10, 20, 50].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => { setPage(1); setPageSize(size); }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          pageSize === size
                            ? "bg-white text-slate-900 shadow-sm dark:bg-[#1a2029] dark:text-slate-100"
                            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* table */}
              <div className="flex-1 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-[#131820]/60">
                      <th className="px-5 py-3 text-left text-[11px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                        시간
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                        Actor
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                        Action
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                        Target
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                        Result
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {loading
                      ? Array.from({ length: pageSize > 10 ? 8 : 5 }).map((_, i) => (
                          <SkeletonRow key={i} />
                        ))
                      : events.length === 0
                        ? (
                          <tr>
                            <td colSpan={5} className="px-5 py-16 text-center text-sm text-slate-400 dark:text-slate-500">
                              감사 로그가 없습니다.
                            </td>
                          </tr>
                        )
                        : events.map((event) => (
                          <tr
                            key={event.id}
                            className="transition-colors hover:bg-slate-50/80 dark:hover:bg-[#131820]/60"
                          >
                            {/* time */}
                            <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-slate-400 dark:text-slate-500">
                              {formatLogTime(event.createdAt)}
                            </td>

                            {/* actor */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2a6ef5]/10 text-[10px] font-bold text-[#2a6ef5] dark:bg-[#2a6ef5]/15">
                                  {getInitials(event.actor)}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold leading-tight" title={event.actor}>
                                    {event.actor}
                                  </p>
                                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                    {event.actorRole}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* action */}
                            <td className="px-5 py-3.5">
                              <code className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700 dark:border-slate-700/60 dark:bg-[#0f1218] dark:text-slate-300">
                                {event.action}
                              </code>
                            </td>

                            {/* target */}
                            <td className="max-w-[280px] px-5 py-3.5" title={`${event.targetType} / ${event.targetId}`}>
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {event.targetType}
                                </span>
                                {" / "}
                                {event.targetId}
                              </p>
                            </td>

                            {/* result */}
                            <td className="px-5 py-3.5">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${resultBadgeClass(event.result)}`}
                              >
                                {event.result}
                              </span>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>

              {/* pagination */}
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 dark:border-slate-800">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {loading ? "" : `${((page - 1) * pageSize + 1).toLocaleString("ko-KR")} – ${Math.min(page * pageSize, count).toLocaleString("ko-KR")} / ${count.toLocaleString("ko-KR")}건`}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((v) => Math.max(1, v - 1))}
                    disabled={page === 1}
                    className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    이전
                  </button>
                  <span className="min-w-[64px] text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
                    disabled={page === totalPages}
                    className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    다음
                  </button>
                </div>
              </div>

            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
