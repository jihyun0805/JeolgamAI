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
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAudit().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [page, pageSize]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8] text-slate-900 dark:bg-[#0B0E14] dark:text-slate-100">
      <MainSidebar active="ops" />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageTopBar
          title="운영 로그"
          description="현재 active project 범위의 감사 로그만 표시합니다."
        />

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
              <p className="text-xs font-bold tracking-[0.24em] text-[#1c59f2] uppercase">
                Audit Scope
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">
                프로젝트 스코프 감사 로그
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                총 {loading ? "..." : count.toLocaleString("ko-KR")}건
              </p>
            </section>

            {error ? (
              <section className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                {error}
              </section>
            ) : null}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  페이지 {page} / {totalPages}
                </p>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  페이지 크기
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPage(1);
                      setPageSize(Number(event.target.value));
                    }}
                    className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-[#0B0E14] dark:text-slate-100"
                  >
                    {[10, 20, 50].map((size) => (
                      <option key={size} value={size}>
                        {size}개
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-[#0B0E14]">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">시간</th>
                      <th className="px-4 py-3 text-left font-semibold">Actor</th>
                      <th className="px-4 py-3 text-left font-semibold">Action</th>
                      <th className="px-4 py-3 text-left font-semibold">Target</th>
                      <th className="px-4 py-3 text-left font-semibold">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {events.map((event) => (
                      <tr key={event.id}>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {new Date(event.createdAt).toLocaleString("ko-KR")}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold">{event.actor}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {event.actorRole}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-semibold">{event.action}</td>
                        <td
                          className="max-w-[320px] px-4 py-3 text-slate-500 dark:text-slate-400"
                          title={`${event.targetType} / ${event.targetId}`}
                        >
                          <span className="block truncate">
                            {event.targetType} / {event.targetId}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {event.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={page === 1}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                >
                  이전
                </button>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={page === totalPages}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                >
                  다음
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
