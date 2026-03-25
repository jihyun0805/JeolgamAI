"use client";

import { authFetch } from "@/lib/auth-fetch";
import { clearSession, updateStoredWorkspace } from "@/lib/jwt-store";
import { AppNotification } from "@/lib/types";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "@/app/components/theme-toggle";
import { MouseEvent as ReactMouseEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M7.5 9a4.5 4.5 0 1 1 9 0v4l1.5 2H6l1.5-2V9Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function getInitial(name: string) {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed[0].toUpperCase() : "U";
}

interface SessionPayload {
  userId: string;
  name: string;
  role: string;
  workspaceId: string;
  activeProject?: {
    id: string;
    name: string;
    awsRegion: string;
  } | null;
  projects?: Array<{
    id: string;
    name: string;
    awsRegion: string;
  }>;
}

interface NotificationPayload {
  notifications: AppNotification[];
  unreadCount: number;
}

function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function notificationToneClasses(severity: string) {
  switch (severity) {
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
    case "critical":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300";
    default:
      return "border-brand/20 bg-brand/10 text-brand";
  }
}

export default function PageTopBar({
  title,
  description,
  userName = "김철수 팀장",
  userRole = "재무 전략 파트",
  actions,
}: {
  title: string;
  description: string;
  userName?: string;
  userRole?: string;
  actions?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [switchingProject, setSwitchingProject] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  async function loadNotifications() {
    setNotificationsLoading(true);
    try {
      const response = await authFetch("/api/notifications", { cache: "no-store" });
      if (response.status === 401) return;
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok || !payload?.data) return;
      const data = payload.data as NotificationPayload;
      setNotifications((data.notifications ?? []).filter((item) => !item.read));
      setUnreadCount(data.unreadCount ?? 0);
    } finally {
      setNotificationsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const response = await authFetch("/api/auth/session", { cache: "no-store" });
      if (response.status === 401) {
        clearSession();
        router.replace(`/login?redirect=${encodeURIComponent(pathname || "/dashboard")}`);
        return;
      }
      if (!response.ok) return;
      const payload = await response.json();
      if (!payload?.ok || !payload?.data || cancelled) return;
      setSession(payload.data as SessionPayload);
    }

    loadSession().catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadNotifications().catch(() => {});

    const intervalId = window.setInterval(() => {
      loadNotifications().catch(() => {});
    }, 30000);

    function refreshNotifications() {
      loadNotifications().catch(() => {});
    }

    window.addEventListener("app:notifications:refresh", refreshNotifications);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("app:notifications:refresh", refreshNotifications);
    };
  }, []);

  /* close menu on outside click */
  useEffect(() => {
    if (!userMenuOpen && !notificationsOpen) return;

    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notificationsOpen, userMenuOpen]);

  const profileName = session?.name ?? userName;
  const canCreateProject =
    session?.role === "company_admin" || session?.role === "system_admin";
  const profileRole = useMemo(() => {
    if (session?.activeProject?.name) {
      return `${session.role} · ${session.activeProject.name}`;
    }
    return userRole;
  }, [session, userRole]);

  async function onSelectProject(projectId: string) {
    if (!projectId || projectId === session?.workspaceId) return;

    setSwitchingProject(true);
    try {
      const response = await authFetch("/api/projects/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) return;

      updateStoredWorkspace(projectId);
      setSession((prev) =>
        prev
          ? { ...prev, workspaceId: projectId, activeProject: payload.data?.project ?? prev.activeProject }
          : prev,
      );
      window.dispatchEvent(
        new CustomEvent("app:workspace:changed", {
          detail: {
            workspaceId: projectId,
            project: payload.data?.project ?? null,
          },
        }),
      );
      window.location.reload();
    } finally {
      setSwitchingProject(false);
    }
  }

  async function markNotificationsRead() {
    const unreadIds = notifications.filter((item) => !item.read).map((item) => item.id);
    if (unreadIds.length === 0) return;

    const response = await authFetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationIds: unreadIds }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok || !payload?.data) return;
    const data = payload.data as NotificationPayload;
    setNotifications((data.notifications ?? []).filter((item) => !item.read));
    setUnreadCount(data.unreadCount ?? 0);
  }

  async function markSingleNotificationRead(notificationId: string) {
    const response = await authFetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationIds: [notificationId] }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok || !payload?.data) return false;
    const data = payload.data as NotificationPayload;
    setNotifications((data.notifications ?? []).filter((item) => !item.read));
    setUnreadCount(data.unreadCount ?? 0);
    return true;
  }

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-[#1a2029]/90">
      <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-8">

        {/* left: title + description */}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold tracking-tight md:text-xl">{title}</h2>
          <p className="hidden truncate text-sm text-slate-500 dark:text-slate-400 md:block">
            {description}
          </p>
        </div>

        {/* right: project + actions + bell + user */}
        <div className="flex shrink-0 items-center gap-2 md:gap-3">

          {/* project selector */}
          {session?.projects && session.projects.length > 0 ? (
            <select
              className="hidden h-8 rounded-xl border border-slate-200 bg-slate-50 px-3 py-0 text-sm font-semibold text-slate-700 transition focus:border-brand focus:outline-none md:block dark:border-slate-700 dark:bg-[#0f1218] dark:text-slate-200"
              disabled={switchingProject}
              onChange={(e) => onSelectProject(e.target.value)}
              value={session.workspaceId}
            >
              {session.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} ({project.awsRegion})
                </option>
              ))}
            </select>
          ) : null}

          {canCreateProject ? (
            <Link
              href="/projects/new"
              className="hidden h-8 items-center gap-2 rounded-xl border border-brand/20 bg-brand/8 px-2 py-0 text-sm font-bold text-brand transition hover:border-brand/35 hover:bg-brand/12 md:inline-flex"
            >
              <PlusIcon />
              프로젝트 생성
            </Link>
          ) : null}

          {/* page-level action buttons */}
          {actions ? (
            <div className="hidden items-center gap-2 xl:flex">{actions}</div>
          ) : null}

          <ThemeToggle />

          {/* notification bell */}
          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              aria-label="알림"
              onClick={() => {
                setNotificationsOpen((prev) => !prev);
                if (!notificationsOpen) {
                  loadNotifications().catch(() => {});
                }
              }}
              className={`relative rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
                notificationsOpen ? "bg-slate-100 dark:bg-slate-800" : ""
              }`}
            >
              <BellIcon />
              {unreadCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full border border-white bg-rose-500 px-1 text-[10px] font-bold leading-none text-white dark:border-[#1a2029]">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </button>

            {notificationsOpen ? (
              <div className="absolute right-0 top-full z-30 mt-2 w-96 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-[#1a2029]">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">알림</p>
                    <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                      분석 및 리포트 완료 알림을 보여줍니다.
                    </p>
                  </div>
                  {unreadCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        markNotificationsRead().catch(() => {});
                      }}
                      className="text-xs font-semibold text-brand transition hover:underline"
                    >
                      모두 읽음
                    </button>
                  ) : null}
                </div>

                <div className="max-h-[24rem] overflow-y-auto">
                  {notificationsLoading ? (
                    <div className="space-y-2 p-4">
                      {[1, 2, 3].map((idx) => (
                        <div key={idx} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                      ))}
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                      아직 도착한 알림이 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-2 p-3">
                      {notifications.slice(0, 8).map((notification) => (
                        <Link
                          key={notification.id}
                          href={
                            notification.reportId
                              ? `/reports?reportId=${notification.reportId}`
                              : notification.analysisId
                              ? `/ai-optimization?analysisId=${notification.analysisId}`
                              : "/dashboard"
                          }
                          onClick={async (event: ReactMouseEvent<HTMLAnchorElement>) => {
                            event.preventDefault();
                            const href = notification.reportId
                              ? `/reports?reportId=${notification.reportId}`
                              : notification.analysisId
                              ? `/ai-optimization?analysisId=${notification.analysisId}`
                              : "/dashboard";
                            setNotificationsOpen(false);
                            if (!notification.read) {
                              await markSingleNotificationRead(notification.id).catch(() => false);
                            }
                            router.push(href);
                          }}
                          className="block rounded-2xl border border-slate-200 px-3.5 py-3 transition hover:border-brand/20 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-brand/20 dark:hover:bg-[#131820]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${notificationToneClasses(notification.severity)}`}>
                                  {notification.severity.toUpperCase()}
                                </span>
                                {!notification.read ? (
                                  <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                                ) : null}
                              </div>
                              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                                {notification.title}
                              </p>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                {notification.body}
                              </p>
                            </div>
                            <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
                              {formatNotificationTime(notification.createdAt)}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* user menu */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition ${
                userMenuOpen
                  ? "bg-slate-100 dark:bg-slate-800"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
            >
              <div className="hidden text-right lg:block">
                <p className="max-w-[120px] truncate text-xs font-bold text-slate-900 dark:text-white">
                  {profileName}
                </p>
                <p className="max-w-[120px] truncate text-[10px] text-slate-400 dark:text-slate-500">
                  {profileRole}
                </p>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-brand/15 text-xs font-bold text-brand">
                {getInitial(profileName)}
              </div>
            </button>

            {/* dropdown */}
            {userMenuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-[#1a2029]"
              >
                {/* user info */}
                <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {profileName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">
                    {profileRole}
                  </p>
                </div>

                {/* logout */}
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                  onClick={() => {
                    setUserMenuOpen(false);
                    clearSession();
                    window.location.href = "/api/auth/logout?redirect=/";
                  }}
                >
                  <LogoutIcon />
                  로그아웃
                </button>
              </div>
            ) : null}
          </div>

        </div>
      </div>
    </header>
  );
}
