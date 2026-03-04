import Link from "next/link";
import MainSidebar from "@/app/components/main-sidebar";
import PageTopBar from "@/app/components/page-top-bar";

const MOCK_SESSION = {
  userId: "mock-admin",
  name: "김철수 팀장",
  role: "company_admin",
  workspaceId: "ws-jeolgam-default",
};

const MOCK_NOTIFICATIONS = [
  {
    id: "notif-1",
    severity: "critical",
    title: "Critical 권고가 감지되었습니다",
    body: "즉시 검토가 필요한 권고 2건",
    createdAt: "2026-02-25T02:20:00.000Z",
  },
  {
    id: "notif-2",
    severity: "warning",
    title: "Kubernetes 연동이 부분 완료되었습니다",
    body: "누락 권한: resourcequotas:list",
    createdAt: "2026-02-25T02:10:00.000Z",
  },
  {
    id: "notif-3",
    severity: "info",
    title: "분석이 완료되었습니다",
    body: "88점 (B) · 월 절감 예상 8,620,000원",
    createdAt: "2026-02-25T02:00:00.000Z",
  },
];

const MOCK_AUDITS = [
  {
    id: "audit-1",
    createdAt: "2026-02-25T02:19:00.000Z",
    actor: "mock-admin",
    actorRole: "company_admin",
    action: "recommendation.approve",
    targetId: "rec_mock_compute_01",
    result: "success",
  },
  {
    id: "audit-2",
    createdAt: "2026-02-25T02:14:00.000Z",
    actor: "mock-admin",
    actorRole: "company_admin",
    action: "analysis.run",
    targetId: "analysis_mock_20260225",
    result: "success",
  },
  {
    id: "audit-3",
    createdAt: "2026-02-25T02:08:00.000Z",
    actor: "mock-admin",
    actorRole: "company_admin",
    action: "integration.create",
    targetId: "int_aws_mock",
    result: "success",
  },
  {
    id: "audit-4",
    createdAt: "2026-02-25T01:52:00.000Z",
    actor: "mock-operator",
    actorRole: "company_operator",
    action: "analysis.run",
    targetId: "analysis_mock_20260224",
    result: "forbidden",
  },
];

export default function AdminOpsPage() {
  const session = MOCK_SESSION;
  const notifications = MOCK_NOTIFICATIONS;
  const audits = MOCK_AUDITS;
  const isAdmin = true;
  const analysisCount = 12;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8] text-slate-900 dark:bg-[#0B0E14] dark:text-slate-100">
      <MainSidebar active="ops" />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageTopBar
          title="운영 로그 센터"
          description="감사 로그, 시스템 알림, 사용자 권한 흐름을 확인합니다."
          userName={session.name}
          userRole={session.role}
          actions={
            <>
              <Link
                href="/dashboard"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                대시보드
              </Link>
              <Link
                href="/api/auth/logout?redirect=/"
                className="rounded-lg bg-[#1c59f2] px-4 py-2 text-sm font-bold text-white hover:bg-[#1c59f2]/90"
              >
                로그아웃
              </Link>
            </>
          }
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-[1440px] space-y-6">
            <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#161B22]">
            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              현재 사용자
            </p>
            <p className="mt-2 text-lg font-extrabold">{session.name}</p>
            <p className="text-xs text-slate-500">{session.role}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#161B22]">
            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              감사 이벤트
            </p>
            <p className="mt-2 text-lg font-extrabold">{audits.length}</p>
            <p className="text-xs text-slate-500">최근 100건 표시</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#161B22]">
            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              알림 수
            </p>
            <p className="mt-2 text-lg font-extrabold">{notifications.length}</p>
            <p className="text-xs text-slate-500">워크스페이스 기준</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#161B22]">
            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              최근 분석 수
            </p>
            <p className="mt-2 text-lg font-extrabold">{analysisCount}</p>
            <p className="text-xs text-slate-500">누적 스냅샷</p>
          </div>
            </section>

            {!isAdmin ? (
              <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-500">
                관리자 권한이 없어 감사 로그 전체 조회는 제한됩니다.
              </section>
            ) : null}

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#161B22]">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <h2 className="text-sm font-bold tracking-wider text-slate-500 uppercase">
                감사 로그
              </h2>
            </div>
            <div className="max-h-[540px] overflow-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 dark:bg-[#0B0E14] dark:text-slate-400">
                    <th className="px-4 py-3">시각</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.length === 0 ? (
                    <tr>
                      <td className="px-4 py-4 text-slate-500" colSpan={5}>
                        기록된 감사 로그가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    audits.map((event) => (
                      <tr
                        key={event.id}
                        className="border-t border-slate-100 dark:border-slate-800"
                      >
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(event.createdAt).toLocaleString("ko-KR")}
                        </td>
                        <td className="px-4 py-3">
                          {event.actor}
                          <div className="text-[10px] text-slate-400">{event.actorRole}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold">{event.action}</td>
                        <td className="px-4 py-3 text-slate-500">{event.targetId}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-2 py-0.5 font-bold ${
                              event.result === "success"
                                ? "bg-emerald-500/10 text-emerald-500"
                                : event.result === "forbidden"
                                  ? "bg-amber-500/10 text-amber-500"
                                  : "bg-rose-500/10 text-rose-500"
                            }`}
                          >
                            {event.result}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#161B22]">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <h2 className="text-sm font-bold tracking-wider text-slate-500 uppercase">
                시스템 알림
              </h2>
            </div>
            <div className="max-h-[540px] space-y-2 overflow-auto p-4">
              {notifications.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">
                  표시할 알림이 없습니다.
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-sm font-bold">{item.title}</p>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          item.severity === "critical"
                            ? "bg-rose-500/10 text-rose-500"
                            : item.severity === "warning"
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-sky-500/10 text-sky-500"
                        }`}
                      >
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.body}</p>
                    <p className="mt-2 text-[10px] text-slate-400">
                      {new Date(item.createdAt).toLocaleString("ko-KR")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
