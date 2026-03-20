"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authFetch } from "@/lib/auth-fetch";
import { clearSession } from "@/lib/jwt-store";

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
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  /* close menu on outside click */
  useEffect(() => {
    if (!userMenuOpen) return;

    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [userMenuOpen]);

  const profileName = session?.name ?? userName;
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

      setSession((prev) =>
        prev
          ? { ...prev, workspaceId: projectId, activeProject: payload.data?.project ?? prev.activeProject }
          : prev,
      );
      router.refresh();
    } finally {
      setSwitchingProject(false);
    }
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
              className="hidden h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 py-0 text-xs font-semibold text-slate-700 transition focus:border-[#2a6ef5] focus:outline-none md:block dark:border-slate-700 dark:bg-[#0f1218] dark:text-slate-200"
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

          {/* page-level action buttons */}
          {actions ? (
            <div className="hidden items-center gap-2 xl:flex">{actions}</div>
          ) : null}

          {/* notification bell */}
          <button
            type="button"
            aria-label="알림"
            className="relative rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <BellIcon />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full border-2 border-white bg-rose-500 dark:border-[#1a2029]" />
          </button>

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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#2a6ef5]/30 bg-[#2a6ef5]/15 text-xs font-bold text-[#2a6ef5]">
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
