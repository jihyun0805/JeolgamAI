import { ReactNode } from "react";
import Link from "next/link";
import UserProfileChip from "@/app/components/user-profile-chip";

function TopBarIcon({
  name,
  className,
}: {
  name: "search" | "notifications";
  className?: string;
}) {
  const baseProps = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "search") {
    return (
      <svg {...baseProps}>
        <circle cx="11" cy="11" r="6" />
        <path d="m16 16 4.5 4.5" />
      </svg>
    );
  }

  return (
    <svg {...baseProps}>
      <path d="M7.5 9a4.5 4.5 0 1 1 9 0v4l1.5 2H6l1.5-2V9Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  );
}

export default function PageTopBar({
  title,
  description,
  searchPlaceholder = "검색...",
  userName = "김철수 팀장",
  userRole = "재무 전략 파트",
  actions,
}: {
  title: string;
  description: string;
  searchPlaceholder?: string;
  userName?: string;
  userRole?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-[#161B22]/90">
      <div className="flex items-start justify-between gap-3 px-4 py-3 md:items-center md:gap-4 md:px-8">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold tracking-tight md:text-xl">{title}</h2>
          <p className="hidden truncate text-sm text-slate-500 dark:text-slate-400 md:block">
            {description}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          {actions ? (
            <div className="hidden items-center gap-2 xl:flex">{actions}</div>
          ) : null}

          <div className="relative hidden 2xl:block">
            <TopBarIcon
              name="search"
              className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              className="w-56 rounded-lg border-none bg-slate-100 py-2 pr-4 pl-10 text-sm focus:ring-1 focus:ring-[#1c59f2] 2xl:w-64 dark:bg-[#0B0E14]"
              placeholder={searchPlaceholder}
              type="text"
            />
          </div>

          <button className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-[#0B0E14]">
            <TopBarIcon name="notifications" className="h-5 w-5" />
            <span className="absolute top-2 right-2 size-2 rounded-full border-2 border-white bg-red-500 dark:border-[#161B22]" />
          </button>

          <div className="mx-1 hidden h-8 w-px bg-slate-200 sm:block dark:bg-slate-700" />

          <Link
            href="/api/auth/logout?redirect=/"
            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
          >
            로그아웃
          </Link>

          <UserProfileChip userName={userName} userRole={userRole} variant="topbar" />
        </div>
      </div>
    </header>
  );
}
