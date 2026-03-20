"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import UserProfileChip from "@/app/components/user-profile-chip";
import { authFetch } from "@/lib/auth-fetch";

type SidebarIconName =
  | "query_stats"
  | "dashboard"
  | "monitoring"
  | "auto_awesome"
  | "description"
  | "list_alt"
  | "settings"
  | "person"
  | "cloud";

function SidebarIcon({
  name,
  className,
}: {
  name: SidebarIconName;
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

  switch (name) {
    case "query_stats":
      return (
        <svg {...baseProps}>
          <path d="M4 18V6" />
          <path d="M10 18v-7" />
          <path d="M16 18v-4" />
          <path d="M22 18V8" />
          <path d="m4 12 6-3 6 2 6-4" />
        </svg>
      );
    case "dashboard":
      return (
        <svg {...baseProps}>
          <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.2" />
          <rect x="13" y="3.5" width="7.5" height="5.5" rx="1.2" />
          <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.2" />
          <rect x="13" y="11" width="7.5" height="9.5" rx="1.2" />
        </svg>
      );
    case "monitoring":
      return (
        <svg {...baseProps}>
          <path d="M3 18.5h18" />
          <path d="m5 14 3-4 3 2 4-5 4 3" />
          <circle cx="8" cy="10" r="1" />
          <circle cx="15" cy="7" r="1" />
        </svg>
      );
    case "auto_awesome":
      return (
        <svg {...baseProps}>
          <path d="m12 3 1.6 3.8L17.5 8 13.7 9.6 12 13.5 10.3 9.6 6.5 8l3.9-1.2L12 3Z" />
          <path d="m18.5 13 1 2.3 2.5.7-2.5 1-1 2.3-1-2.3-2.5-1 2.5-.7 1-2.3Z" />
        </svg>
      );
    case "description":
      return (
        <svg {...baseProps}>
          <path d="M7 3.5h7l3.5 3.5V20a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
          <path d="M14 3.5V7h3.5" />
          <path d="M9 11h6" />
          <path d="M9 14.5h6" />
        </svg>
      );
    case "list_alt":
      return (
        <svg {...baseProps}>
          <rect x="3.5" y="4" width="17" height="16" rx="2" />
          <path d="M8.5 9h8" />
          <path d="M8.5 13h8" />
          <path d="M8.5 17h8" />
          <circle cx="6.5" cy="9" r="0.8" />
          <circle cx="6.5" cy="13" r="0.8" />
          <circle cx="6.5" cy="17" r="0.8" />
        </svg>
      );
    case "settings":
      return (
        <svg {...baseProps}>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19 12h2" />
          <path d="M3 12h2" />
          <path d="m16.9 7.1 1.4-1.4" />
          <path d="m5.7 18.3 1.4-1.4" />
          <path d="M12 3v2" />
          <path d="M12 19v2" />
          <path d="m16.9 16.9 1.4 1.4" />
          <path d="m5.7 5.7 1.4 1.4" />
        </svg>
      );
    case "person":
      return (
        <svg {...baseProps}>
          <circle cx="12" cy="8" r="3" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
    case "cloud":
      return (
        <svg {...baseProps}>
          <path d="M7 18.5h9.5a3.5 3.5 0 1 0-.5-7 5 5 0 0 0-9.7-1.3A3.8 3.8 0 0 0 7 18.5Z" />
        </svg>
      );
    default:
      return null;
  }
}

type SidebarKey =
  | "dashboard"
  | "analysis"
  | "prometheus"
  | "aws_infra"
  | "k8s_infra"
  | "infrastructure"
  | "chat"
  | "reports"
  | "ops"
  | "integrations"
  | "execution";

const menuItems: Array<{
  key: SidebarKey;
  href: string;
  label: string;
  icon: SidebarIconName;
  iconSrc?: string;
  coverageKey?: "aws" | "k8s" | "prometheus";
}> = [
  { key: "dashboard", href: "/dashboard", label: "대시보드", icon: "dashboard" },
  {
    key: "analysis",
    href: "/analysis/infrastructure",
    label: "비용 분석",
    icon: "monitoring",
  },
  {
    key: "prometheus",
    href: "/prometheus",
    label: "Prometheus",
    icon: "query_stats",
    iconSrc: "/icons/sidebar/prometheus.png",
    coverageKey: "prometheus",
  },
  {
    key: "aws_infra",
    href: "/infrastructure/aws",
    label: "AWS 인프라",
    icon: "cloud",
    iconSrc: "/icons/sidebar/aws.png",
    coverageKey: "aws",
  },
  {
    key: "k8s_infra",
    href: "/infrastructure/k8s",
    label: "K8s 인프라",
    icon: "list_alt",
    iconSrc: "/icons/sidebar/k8s.png",
    coverageKey: "k8s",
  },
  { key: "chat", href: "/ai-optimization", label: "AI 최적화", icon: "auto_awesome" },
  { key: "reports", href: "/reports", label: "리포트", icon: "description" },
  { key: "ops", href: "/admin/ops", label: "운영 로그", icon: "settings" },
];

interface SessionPayload {
  name: string;
  role: string;
  activeProject?: {
    name: string;
  } | null;
}

interface CoveragePayload {
  aws: boolean;
  k8s: boolean;
  prometheus: boolean;
}

let coverageCache: CoveragePayload | null = null;

export default function MainSidebar({ active }: { active: SidebarKey }) {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [coverage, setCoverage] = useState<CoveragePayload>(
    coverageCache ?? { aws: false, k8s: false, prometheus: false },
  );
  const [coverageLoaded, setCoverageLoaded] = useState(Boolean(coverageCache));
  const isSettingsActive = active === "integrations";

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const [sessionResponse, integrationResponse] = await Promise.all([
        authFetch("/api/auth/session", { cache: "no-store" }),
        authFetch("/api/integrations", { cache: "no-store" }),
      ]);

      if (sessionResponse.ok) {
        const payload = await sessionResponse.json();
        if (payload?.ok && payload?.data && !cancelled) {
          setSession(payload.data as SessionPayload);
        }
      }

      if (integrationResponse.ok) {
        const payload = await integrationResponse.json();
        if (payload?.ok && payload?.data?.coverage && !cancelled) {
          const next = payload.data.coverage as CoveragePayload;
          coverageCache = next;
          setCoverage(next);
          setCoverageLoaded(true);
        }
      }
    }

    loadSession().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f1218] md:flex">
      <div className="flex items-stretch gap-3 p-6">
        <div className="flex w-14 shrink-0 items-center justify-center">
          <Image src="/logo.png" alt="JeolgamAI" width={48} height={48} className="h-full w-auto max-w-full object-contain" />
        </div>
        <div className="flex flex-col justify-center gap-0.5">
          <h1 className="text-xl font-extrabold tracking-tight text-[#2a6ef5]">JeolgamAI</h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Cloud Cost Intelligence</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
        {menuItems.map((item) => {
          const isActive = item.key === active;
          const isDisabled = item.coverageKey ? !coverage[item.coverageKey] : false;
          const className = `flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
            isActive
              ? "bg-[#2a6ef5]/10 text-[#2a6ef5]"
              : isDisabled
                ? "cursor-pointer text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`;

          if (isDisabled) {
            return (
              <Link key={item.key} className={className} href="/integrations">
                {item.iconSrc ? (
                  <Image src={item.iconSrc} alt="" width={20} height={20} className="h-5 w-5 shrink-0 object-contain" unoptimized />
                ) : (
                  <SidebarIcon name={item.icon} className="h-5 w-5 shrink-0" />
                )}
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span className="text-sm font-semibold whitespace-nowrap">{item.label}</span>
                  {coverageLoaded ? (
                    <span className="shrink-0 rounded-md border border-[#2a6ef5]/40 bg-[#2a6ef5]/10 px-2 py-1 text-[10px] font-bold text-[#2a6ef5] dark:border-[#2a6ef5]/50 dark:bg-[#2a6ef5]/15">
                      연동 필요 →
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.key}
              className={className}
              href={item.href}
            >
              {item.iconSrc ? (
                <Image src={item.iconSrc} alt="" width={20} height={20} className="h-5 w-5 shrink-0 object-contain" unoptimized />
              ) : (
                <SidebarIcon name={item.icon} className="h-5 w-5" />
              )}
              <span className="text-sm font-semibold whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-slate-200 p-4 dark:border-slate-800">
<Link
          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
            isSettingsActive
              ? "bg-[#2a6ef5]/10 text-[#2a6ef5]"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
          href="/integrations"
        >
          <SidebarIcon name="settings" className="h-5 w-5" />
          <span className="text-sm font-medium whitespace-nowrap">연동</span>
        </Link>
        <div className="mt-2 rounded-xl bg-slate-100 px-3 py-2.5 dark:bg-slate-800/50">
          <UserProfileChip
            userName={session?.name ?? "Protected User"}
            userRole={session?.activeProject?.name ?? session?.role ?? "Project Scoped"}
            variant="sidebar"
          />
        </div>
      </div>
    </aside>
  );
}
