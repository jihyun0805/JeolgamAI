"use client";

import { Children, ReactNode, useEffect, useRef, useState } from "react";
import Image from "next/image";
import MainSidebar from "@/app/components/main-sidebar";
import PageTopBar from "@/app/components/page-top-bar";

type HealthTone = "healthy" | "progressing" | "degraded" | "neutral";
type GraphNodeKind =
  | "app"
  | "ingress"
  | "service"
  | "endpoint"
  | "deployment"
  | "replicaset"
  | "pod"
  | "node";
type NodeChip = { label: string; title?: string };

type SidebarSection = {
  label: string;
  rows?: Array<{ key: string; value: string }>;
  tags?: string[];
};

type SidebarResource = {
  kind: GraphNodeKind;
  title: string;
  subtitle: string;
  tone: HealthTone;
  sections: SidebarSection[];
};

const TOPOLOGY_ROW_HEIGHT = 184;
const TOPOLOGY_ROW_GAP = 24;
const TOPOLOGY_HEADER_OFFSET = 92;
const TOPOLOGY_CANVAS_WIDTH = 1760;
const TOPOLOGY_CANVAS_PADDING_X = 96;
const TOPOLOGY_STAGE_TOP_INSET = 36;
const TOPOLOGY_STAGE_BOTTOM_INSET = 28;

interface K8sInfrastructurePayload {
  workspaceId: string;
  clusterName: string;
  summary: {
    nodeCount: number;
    namespaceCount: number;
    deploymentCount: number;
    replicaSetCount?: number;
    serviceCount: number;
    ingressCount?: number;
    endpointCount?: number;
    podCount: number;
  };
  nodes: Array<{
    name: string;
    status: string;
    version: string;
  }>;
  namespaces: Array<{
    name: string;
    podCount: number;
    serviceCount: number;
    deploymentCount: number;
  }>;
  ingresses?: Array<{
    namespace: string;
    name: string;
    ingressClass: string;
    address: string;
    hosts: string[];
    serviceNames: string[];
  }>;
  deployments: Array<{
    namespace: string;
    name: string;
    replicas: number;
    readyReplicas: number;
    images: string[];
    selector: Record<string, string>;
  }>;
  replicaSets?: Array<{
    namespace: string;
    name: string;
    replicas: number;
    readyReplicas: number;
    ownerDeployment: string;
    images: string[];
    selector: Record<string, string>;
  }>;
  services: Array<{
    namespace: string;
    name: string;
    type: string;
    clusterIP: string;
    ports: string[];
    selector: Record<string, string>;
  }>;
  endpoints?: Array<{
    namespace: string;
    name: string;
    readyAddressCount: number;
    notReadyAddressCount: number;
    podTargets: string[];
  }>;
  pods: Array<{
    namespace: string;
    name: string;
    phase: string;
    node: string;
    ownerKind?: string;
    ownerName?: string;
    ready: string;
    restartCount: number;
    images: string[];
    labels: Record<string, string>;
  }>;
  warnings: string[];
}

function statusTone(status: string): HealthTone {
  const normalized = status.toLowerCase();
  if (normalized === "ready" || normalized === "running" || normalized === "healthy") {
    return "healthy";
  }
  if (normalized === "pending" || normalized === "progressing" || normalized === "updating") {
    return "progressing";
  }
  if (normalized === "notready" || normalized === "failed" || normalized === "error") {
    return "degraded";
  }
  return "neutral";
}

function toneClass(tone: HealthTone) {
  switch (tone) {
    case "healthy":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
    case "progressing":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
    case "degraded":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-[#111824] dark:text-slate-300";
  }
}

function cardAccentClass(tone: HealthTone) {
  switch (tone) {
    case "healthy":
      return "from-emerald-500/18 to-cyan-500/10 dark:from-emerald-500/16 dark:to-cyan-400/8";
    case "progressing":
      return "from-amber-500/18 to-orange-500/10 dark:from-amber-500/16 dark:to-orange-400/8";
    case "degraded":
      return "from-rose-500/18 to-fuchsia-500/10 dark:from-rose-500/16 dark:to-fuchsia-400/8";
    default:
      return "from-slate-300/40 to-slate-200/20 dark:from-slate-700/30 dark:to-slate-700/10";
  }
}

function selectorMatches(selector: Record<string, string>, labels: Record<string, string>) {
  const entries = Object.entries(selector);
  if (entries.length === 0) {
    return false;
  }

  return entries.every(([key, value]) => labels[key] === value);
}

function deploymentTone(deployment: K8sInfrastructurePayload["deployments"][number]): HealthTone {
  if (deployment.replicas === 0) {
    return "neutral";
  }
  if (deployment.readyReplicas === deployment.replicas) {
    return "healthy";
  }
  if (deployment.readyReplicas > 0) {
    return "progressing";
  }
  return "degraded";
}

function namespaceTone(
  namespace: K8sInfrastructurePayload["namespaces"][number],
  data: K8sInfrastructurePayload,
): HealthTone {
  const deployments = data.deployments.filter((item) => item.namespace === namespace.name);
  const pods = data.pods.filter((item) => item.namespace === namespace.name);

  if (deployments.some((item) => deploymentTone(item) === "degraded")) {
    return "degraded";
  }
  if (pods.some((item) => statusTone(item.phase) === "degraded")) {
    return "degraded";
  }
  if (deployments.some((item) => deploymentTone(item) === "progressing")) {
    return "progressing";
  }
  if (namespace.podCount + namespace.serviceCount + namespace.deploymentCount === 0) {
    return "neutral";
  }
  return "healthy";
}

function clusterTone(data: K8sInfrastructurePayload | null): HealthTone {
  if (!data) return "neutral";
  if (data.nodes.some((node) => statusTone(node.status) === "degraded")) {
    return "degraded";
  }
  if (data.deployments.some((item) => deploymentTone(item) === "degraded")) {
    return "degraded";
  }
  if (data.deployments.some((item) => deploymentTone(item) === "progressing")) {
    return "progressing";
  }
  return "healthy";
}

function formatSelector(selector: Record<string, string>) {
  const entries = Object.entries(selector);
  if (entries.length === 0) {
    return "selector 없음";
  }
  return entries.map(([key, value]) => `${key}=${value}`).join(", ");
}

function shortenMiddle(value: string, prefix = 18, suffix = 12) {
  if (value.length <= prefix + suffix + 3) {
    return value;
  }
  return `${value.slice(0, prefix)}...${value.slice(-suffix)}`;
}

function formatImageChip(image: string): NodeChip {
  const [reference, digest] = image.split("@");
  const imageName = reference.split("/").pop() ?? reference;
  const shortDigest = digest ? `@${shortenMiddle(digest, 10, 8)}` : "";

  return {
    label: `${imageName}${shortDigest}`,
    title: image,
  };
}

function toChip(value: string): NodeChip {
  return {
    label: shortenMiddle(value, 24, 10),
    title: value,
  };
}

function namespaceScore(namespace: K8sInfrastructurePayload["namespaces"][number]) {
  return namespace.deploymentCount * 5 + namespace.serviceCount * 3 + namespace.podCount * 2;
}

function getTopologyLaneHeight(rows: number) {
  const safeRows = Math.max(1, rows);
  return (
    TOPOLOGY_STAGE_TOP_INSET +
    safeRows * TOPOLOGY_ROW_HEIGHT +
    Math.max(0, safeRows - 1) * TOPOLOGY_ROW_GAP +
    TOPOLOGY_STAGE_BOTTOM_INSET
  );
}

function getTopologyCanvasHeight(rows: number) {
  return 84 + getTopologyLaneHeight(rows);
}

function clampTopologyZoom(value: number) {
  return Math.min(1.6, Math.max(0.35, Number(value.toFixed(2))));
}

function getTopologyRowTop(rowIndex: number) {
  return TOPOLOGY_STAGE_TOP_INSET + rowIndex * (TOPOLOGY_ROW_HEIGHT + TOPOLOGY_ROW_GAP);
}

function getTopologyRowCenter(rowIndex: number) {
  return TOPOLOGY_HEADER_OFFSET + TOPOLOGY_ROW_HEIGHT / 2 + getTopologyRowTop(rowIndex);
}

function createSequentialRowIndices(count: number) {
  const safeCount = Math.max(1, count);
  return Array.from({ length: safeCount }, (_, index) => index);
}

function HealthBadge({
  tone,
  label,
}: {
  tone: HealthTone;
  label: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${toneClass(tone)}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {label}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
      <p className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
    </article>
  );
}

const K8S_ICON_PATHS: Partial<Record<GraphNodeKind, string>> = {
  app: "/icons/k8s/namespace.svg",
  ingress: "/icons/k8s/ingress.svg",
  service: "/icons/k8s/service.svg",
  endpoint: "/icons/k8s/endpoint.svg",
  deployment: "/icons/k8s/deployment.svg",
  replicaset: "/icons/k8s/replicaset.svg",
  pod: "/icons/k8s/pod.svg",
  node: "/icons/k8s/node.svg",
};

function GraphIcon({ kind }: { kind: GraphNodeKind }) {
  const iconPath = K8S_ICON_PATHS[kind];

  if (iconPath) {
    return (
      <Image
        src={iconPath}
        alt=""
        aria-hidden
        width={28}
        height={28}
        className="h-7 w-7 object-contain drop-shadow-[0_10px_24px_rgba(50,108,229,0.18)]"
      />
    );
  }

  const baseProps = {
    className: "h-6 w-6",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (kind) {
    case "app":
      return (
        <svg {...baseProps}>
          <path d="M12 4 5 8l7 4 7-4-7-4Z" />
          <path d="m5 12 7 4 7-4" />
          <path d="m5 16 7 4 7-4" />
        </svg>
      );
    case "service":
      return (
        <svg {...baseProps}>
          <rect x="4" y="5" width="16" height="4" rx="1.2" />
          <path d="M8 9v3" />
          <path d="M16 9v3" />
          <rect x="6" y="12" width="4" height="6" rx="1.2" />
          <rect x="14" y="12" width="4" height="6" rx="1.2" />
        </svg>
      );
    case "ingress":
      return (
        <svg {...baseProps}>
          <path d="M4 9.5h16" />
          <path d="M8 9.5V6.5" />
          <path d="M12 9.5V4.5" />
          <path d="M16 9.5V6.5" />
          <path d="M6 14.5h12" />
          <path d="M12 14.5v5" />
        </svg>
      );
    case "endpoint":
      return (
        <svg {...baseProps}>
          <circle cx="7" cy="12" r="2.2" />
          <circle cx="17" cy="7" r="2.2" />
          <circle cx="17" cy="17" r="2.2" />
          <path d="M9.2 11 14.8 8.1" />
          <path d="M9.2 13 14.8 15.9" />
        </svg>
      );
    case "deployment":
      return (
        <svg {...baseProps}>
          <circle cx="12" cy="12" r="8" />
          <path d="m12 8 3 4-3 4-3-4 3-4Z" />
        </svg>
      );
    case "replicaset":
      return (
        <svg {...baseProps}>
          <circle cx="8" cy="8" r="3.5" />
          <circle cx="16" cy="8" r="3.5" />
          <circle cx="12" cy="16" r="3.5" />
        </svg>
      );
    case "pod":
      return (
        <svg {...baseProps}>
          <path d="M12 4 5 8v8l7 4 7-4V8l-7-4Z" />
          <path d="m5 8 7 4 7-4" />
          <path d="M12 12v8" />
        </svg>
      );
    default:
      return (
        <svg {...baseProps}>
          <path d="M12 3v6" />
          <path d="M6 9v6" />
          <path d="M18 9v6" />
          <path d="M4 15h16" />
          <path d="M8 21h8" />
        </svg>
      );
  }
}

function ResourceMapNode({
  kind,
  title,
  subtitle,
  tone,
  meta,
  chips,
  onClick,
}: {
  kind: GraphNodeKind;
  title: string;
  subtitle: string;
  tone: HealthTone;
  meta?: string;
  chips?: NodeChip[];
  onClick?: () => void;
}) {
  return (
    <article
      className={`relative mx-auto h-[176px] w-full max-w-[320px] overflow-hidden rounded-[24px] border bg-white px-6 py-5 shadow-sm dark:bg-[#161B22] ${
        onClick
          ? "cursor-pointer border-slate-200 transition-all hover:border-[#1c59f2]/40 hover:shadow-md dark:border-slate-800 dark:hover:border-[#1c59f2]/40"
          : "border-slate-200 dark:border-slate-800"
      }`}
      onClick={onClick}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${cardAccentClass(tone)} opacity-70`} />
      <div className="relative flex h-full items-start gap-5">
        <div className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[18px] border ${toneClass(tone)}`}>
          <GraphIcon kind={kind} />
        </div>
        <div className="flex h-full min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-black leading-tight tracking-tight" title={title}>
                {title}
              </p>
              <p className="mt-1 truncate text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
                {subtitle}
              </p>
            </div>
            <HealthBadge
              tone={tone}
              label={
                tone === "healthy"
                  ? "Healthy"
                  : tone === "progressing"
                    ? "Progressing"
                    : tone === "degraded"
                      ? "Degraded"
                      : "Idle"
              }
            />
          </div>
          {meta ? (
            <p
              className="mt-3 truncate text-sm leading-6 text-slate-500 dark:text-slate-400"
              title={meta}
            >
              {meta}
            </p>
          ) : null}
          {chips?.length ? (
            <div className="mt-auto flex min-w-0 items-center gap-2 overflow-hidden pt-4">
              {chips.slice(0, 2).map((chip) => (
                <span
                  key={`${title}-${chip.title ?? chip.label}`}
                  title={chip.title ?? chip.label}
                  className="inline-flex min-w-0 max-w-[128px] shrink rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-[#0B0E14] dark:text-slate-300"
                >
                  <span className="truncate">{chip.label}</span>
                </span>
              ))}
              {chips.length > 2 ? (
                <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-[#0B0E14] dark:text-slate-400">
                  +{chips.length - 2}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function StageColumn({
  label,
  count,
  tone,
  rows,
  rowIndices,
  children,
}: {
  label: string;
  count: string;
  tone: "sky" | "violet" | "emerald" | "slate";
  rows: number;
  rowIndices: number[];
  children: ReactNode;
}) {
  const items = Children.toArray(children);
  const laneHeight = getTopologyLaneHeight(rows);
  const toneClassName =
    tone === "sky"
      ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300"
      : tone === "violet"
        ? "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300"
        : tone === "emerald"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-[#111824] dark:text-slate-300";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 rounded-[20px] border border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-[#11161D]">
        <p className="text-[11px] font-bold tracking-[0.22em] text-slate-400 uppercase">{label}</p>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClassName}`}>
          {count}
        </span>
      </div>
      <div className="relative" style={{ height: laneHeight }}>
        {items.map((child, index) => (
          <div
            key={`stage-${label}-${index}`}
            className="absolute inset-x-0 flex items-center justify-center"
            style={{
              top: getTopologyRowTop(rowIndices[index] ?? index),
              height: TOPOLOGY_ROW_HEIGHT,
            }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

function BranchConnector({
  rows,
  edges,
  label,
  className = "",
}: {
  rows: number;
  edges: Array<{ sourceRow: number; targetRow: number }>;
  label: string;
  className?: string;
}) {
  const width = 156;
  const sourceX = 12;
  const trunkX = 74;
  const targetX = 144;
  const totalHeight = TOPOLOGY_HEADER_OFFSET + getTopologyLaneHeight(rows);
  const uniqueEdges = Array.from(
    new Map(
      edges.map((edge) => [`${edge.sourceRow}-${edge.targetRow}`, edge]),
    ).values(),
  );

  return (
    <div
      className={`relative hidden xl:flex items-stretch justify-center ${className}`}
      style={{ height: totalHeight }}
      title={label}
    >
      <svg
        viewBox={`0 0 ${width} ${totalHeight}`}
        className="h-full w-full"
        preserveAspectRatio="none"
      >
        {uniqueEdges.map((edge, index) => {
          const sourceCenterY = getTopologyRowCenter(edge.sourceRow);
          const targetCenterY = getTopologyRowCenter(edge.targetRow);

          return (
            <g key={`edge-${index}-${edge.sourceRow}-${edge.targetRow}`}>
              <line
                x1={sourceX}
                y1={sourceCenterY}
                x2={trunkX}
                y2={sourceCenterY}
                stroke="rgba(71, 85, 105, 0.75)"
                strokeWidth="2"
                strokeDasharray="4 6"
              />
              <line
                x1={trunkX}
                y1={sourceCenterY}
                x2={trunkX}
                y2={targetCenterY}
                stroke="rgba(71, 85, 105, 0.75)"
                strokeWidth="2"
                strokeDasharray="4 6"
              />
              <line
                x1={trunkX}
                y1={targetCenterY}
                x2={targetX}
                y2={targetCenterY}
                stroke="rgba(71, 85, 105, 0.75)"
                strokeWidth="2"
                strokeDasharray="4 6"
              />
              <rect
                x={sourceX - 4}
                y={sourceCenterY - 4}
                width="8"
                height="8"
                rx="1.5"
                fill="#11161D"
                stroke="rgba(100, 116, 139, 0.85)"
              />
              <path
                d={`M ${targetX - 10} ${targetCenterY - 7} L ${targetX} ${targetCenterY} L ${targetX - 10} ${targetCenterY + 7}`}
                fill="none"
                stroke="rgba(100, 116, 139, 0.95)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}


function ResourceDetailSidebar({
  resource,
  onClose,
}: {
  resource: SidebarResource;
  onClose: () => void;
}) {
  const toneLabel =
    resource.tone === "healthy"
      ? "Healthy"
      : resource.tone === "progressing"
        ? "Progressing"
        : resource.tone === "degraded"
          ? "Degraded"
          : "Idle";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-20 bg-black/25 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <div className="fixed right-0 top-0 z-30 flex h-full w-full max-w-[400px] flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#161B22]">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 p-6 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">
              {resource.subtitle}
            </p>
            <h2 className="mt-1.5 break-all text-xl font-black leading-tight tracking-tight">
              {resource.title}
            </h2>
            <div className="mt-3">
              <HealthBadge tone={resource.tone} label={toneLabel} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="닫기"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {resource.sections.map((section) => (
              <div key={section.label}>
                <p className="mb-3 text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">
                  {section.label}
                </p>
                {section.rows?.length ? (
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#0B0E14]">
                    {section.rows.map((row) => (
                      <div key={row.key}>
                        <span className="block text-[11px] font-semibold text-slate-400">
                          {row.key}
                        </span>
                        <span className="mt-0.5 block break-all text-sm text-slate-700 dark:text-slate-200">
                          {row.value || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
                {section.tags?.length ? (
                  <div className="space-y-2">
                    {section.tags.map((tag) => (
                      <span
                        key={tag}
                        title={tag}
                        className="block w-full break-all rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-5 font-semibold text-slate-600 dark:border-slate-700 dark:bg-[#0B0E14] dark:text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function K8sInfrastructurePage() {
  const topologyViewportRef = useRef<HTMLDivElement | null>(null);
  const [data, setData] = useState<K8sInfrastructurePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedNamespace, setSelectedNamespace] = useState("");
  const [namespaceSearch, setNamespaceSearch] = useState("");
  const [workloadSearch, setWorkloadSearch] = useState("");
  const [topologyZoom, setTopologyZoom] = useState(0.85);
  const [selectedResource, setSelectedResource] = useState<SidebarResource | null>(null);

  function getFitTopologyZoom() {
    const viewportWidth = topologyViewportRef.current?.clientWidth ?? 0;
    if (!viewportWidth) {
      return 0.85;
    }

    return clampTopologyZoom((viewportWidth - 32) / (TOPOLOGY_CANVAS_WIDTH + TOPOLOGY_CANVAS_PADDING_X * 2));
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInfrastructure() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/infrastructure/k8s", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !payload?.ok || !payload?.data) {
          throw new Error(
            payload?.error?.message ?? "Kubernetes 인프라 데이터를 불러오지 못했습니다.",
          );
        }

        if (!cancelled) {
          const next = payload.data as K8sInfrastructurePayload;
          setData(next);
          setSelectedNamespace((current) => {
            if (current && next.namespaces.some((item) => item.name === current)) {
              return current;
            }

            const preferred = [...next.namespaces].sort(
              (left, right) => namespaceScore(right) - namespaceScore(left),
            )[0];
            return preferred?.name ?? "";
          });
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

    loadInfrastructure().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const clusterHealth = clusterTone(data);
  const namespaceKeyword = namespaceSearch.trim().toLowerCase();
  const filteredNamespaces = (data?.namespaces ?? []).filter((item) => {
    return item.name.toLowerCase().includes(namespaceKeyword);
  });
  const activeNamespace =
    data?.namespaces.find((item) => item.name === selectedNamespace) ??
    filteredNamespaces[0] ??
    data?.namespaces[0] ??
    null;

  const workloadKeyword = workloadSearch.trim().toLowerCase();
  const namespaceIngresses = data?.ingresses?.filter((item) => item.namespace === activeNamespace?.name) ?? [];
  const namespaceDeployments = data?.deployments.filter((item) => item.namespace === activeNamespace?.name) ?? [];
  const namespaceReplicaSets = data?.replicaSets?.filter((item) => item.namespace === activeNamespace?.name) ?? [];
  const namespaceServices = data?.services.filter((item) => item.namespace === activeNamespace?.name) ?? [];
  const namespaceEndpoints = data?.endpoints?.filter((item) => item.namespace === activeNamespace?.name) ?? [];
  const namespacePods = data?.pods.filter((item) => item.namespace === activeNamespace?.name) ?? [];

  const filteredDeployments = namespaceDeployments.filter((item) => {
    if (!workloadKeyword) return true;
    return (
      item.name.toLowerCase().includes(workloadKeyword) ||
      formatSelector(item.selector).toLowerCase().includes(workloadKeyword) ||
      item.images.some((image) => image.toLowerCase().includes(workloadKeyword))
    );
  });

  const filteredServices = namespaceServices.filter((item) => {
    if (!workloadKeyword) return true;
    return (
      item.name.toLowerCase().includes(workloadKeyword) ||
      item.type.toLowerCase().includes(workloadKeyword) ||
      item.ports.some((port) => port.toLowerCase().includes(workloadKeyword))
    );
  });

  const filteredPods = namespacePods.filter((item) => {
    if (!workloadKeyword) return true;
    return (
      item.name.toLowerCase().includes(workloadKeyword) ||
      item.phase.toLowerCase().includes(workloadKeyword) ||
      item.node.toLowerCase().includes(workloadKeyword)
    );
  });

  useEffect(() => {
    setSelectedResource(null);
  }, [selectedNamespace, workloadSearch]);

  useEffect(() => {
    setTopologyZoom(getFitTopologyZoom());

    const viewport = topologyViewportRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver(() => {
      setTopologyZoom(getFitTopologyZoom());
    });
    observer.observe(viewport);

    requestAnimationFrame(() => {
      viewport.scrollTo({ left: 0, top: 0 });
    });

    return () => observer.disconnect();
  }, [selectedNamespace, workloadSearch]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8] text-slate-900 dark:bg-[#0B0E14] dark:text-slate-100">
      <MainSidebar active="k8s_infra" />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageTopBar
          title="K8s 인프라"
          description="서비스가 어떤 워크로드와 pod, node로 이어지는지 시각적으로 확인합니다."
        />

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
              <div>
                <div>
                  <p className="text-xs font-bold tracking-[0.24em] text-[#1c59f2] uppercase">
                    Live Cluster Canvas
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <h2 className="text-3xl font-black tracking-tight">
                      {loading ? "클러스터 로딩 중" : data?.clusterName ?? "Kubernetes Cluster"}
                    </h2>
                    <HealthBadge
                      tone={clusterHealth}
                      label={
                        clusterHealth === "healthy"
                          ? "Healthy"
                          : clusterHealth === "progressing"
                            ? "Progressing"
                            : clusterHealth === "degraded"
                              ? "Degraded"
                            : "Unknown"
                      }
                    />
                  </div>
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    선택한 namespace 안에서 서비스 진입점부터 deployment, pod, node 배치까지 이어지는 흐름을 보여줍니다.
                  </p>
                </div>
              </div>
            </section>

            {error ? (
              <section className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                {error}
              </section>
            ) : null}

            {data?.warnings.length ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                {data.warnings.join(" / ")}
              </section>
            ) : null}

            <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <SummaryCard
                label="Nodes"
                value={loading ? "..." : String(data?.summary.nodeCount ?? 0)}
                hint="클러스터가 현재 사용하는 노드 수"
              />
              <SummaryCard
                label="Namespaces"
                value={loading ? "..." : String(data?.summary.namespaceCount ?? 0)}
                hint="서비스가 분리된 운영 공간"
              />
              <SummaryCard
                label="Deployments"
                value={loading ? "..." : String(data?.summary.deploymentCount ?? 0)}
                hint="현재 배포된 워크로드 수"
              />
              <SummaryCard
                label="Pods"
                value={loading ? "..." : String(data?.summary.podCount ?? 0)}
                hint="실제로 떠 있는 실행 단위"
              />
            </section>

            {/* Namespace 가로 pill 선택기 */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="whitespace-nowrap text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">
                  Namespace
                </span>
                <input
                  value={namespaceSearch}
                  onChange={(event) => setNamespaceSearch(event.target.value)}
                  placeholder="검색"
                  className="h-8 w-36 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-[#1c59f2] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-[#0B0E14] dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  {filteredNamespaces.slice(0, 16).map((namespace) => {
                    const isActive = activeNamespace?.name === namespace.name;
                    const tone = data ? namespaceTone(namespace, data) : "neutral";
                    const dotClass =
                      tone === "healthy"
                        ? "bg-emerald-400"
                        : tone === "progressing"
                          ? "bg-amber-400"
                          : tone === "degraded"
                            ? "bg-rose-400"
                            : "bg-slate-400";
                    return (
                      <button
                        key={namespace.name}
                        type="button"
                        onClick={() => setSelectedNamespace(namespace.name)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          isActive
                            ? "border-[#1c59f2]/30 bg-[#1c59f2]/10 text-[#1c59f2]"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-[#0B0E14] dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-[#101621]"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
                        <span className="max-w-[160px] truncate">{namespace.name}</span>
                      </button>
                    );
                  })}
                  {filteredNamespaces.length > 16 && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-400 dark:border-slate-700 dark:bg-[#0B0E14]">
                      +{filteredNamespaces.length - 16}
                    </span>
                  )}
                  {!filteredNamespaces.length && (
                    <span className="text-xs text-slate-400">일치하는 namespace 없음</span>
                  )}
                </div>
              </div>
            </section>

            {/* Live Resource Map – 전체 폭, 모든 deployment 한 번에 */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">
                    Resource Topology
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2.5">
                    <h3 className="text-2xl font-black tracking-tight">
                      {activeNamespace?.name ?? "namespace 선택 중"}
                    </h3>
                    {activeNamespace && data ? (
                      <HealthBadge
                        tone={namespaceTone(activeNamespace, data)}
                        label={
                          namespaceTone(activeNamespace, data) === "healthy"
                            ? "Healthy"
                            : namespaceTone(activeNamespace, data) === "progressing"
                              ? "Progressing"
                              : namespaceTone(activeNamespace, data) === "degraded"
                                ? "Degraded"
                                : "Idle"
                        }
                      />
                    ) : null}
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-[#0B0E14] dark:text-slate-300">
                      svc {filteredServices.length} · deploy {filteredDeployments.length} · pod {filteredPods.length}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    서비스 진입점부터 deployment, pod, node 배치까지 이어지는 흐름을 보여줍니다.
                  </p>
                </div>
                <input
                  value={workloadSearch}
                  onChange={(event) => setWorkloadSearch(event.target.value)}
                  placeholder="service, deployment, pod 검색"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#1c59f2] focus:bg-white focus:outline-none xl:w-72 dark:border-slate-700 dark:bg-[#0B0E14] dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="mt-6 space-y-5">
                {filteredDeployments.map((deployment) => {
                      const deploymentServices = namespaceServices.filter((service) => {
                        return (
                          selectorMatches(service.selector, deployment.selector) ||
                          selectorMatches(deployment.selector, service.selector)
                        );
                      });
                      const serviceNames = deploymentServices.map((service) => service.name);
                      const relatedIngresses = namespaceIngresses.filter((ingress) =>
                        ingress.serviceNames.some((serviceName) => serviceNames.includes(serviceName)),
                      );
                      const relatedEndpoints = namespaceEndpoints.filter((endpoint) =>
                        serviceNames.includes(endpoint.name),
                      );
                      const candidateReplicaSets = namespaceReplicaSets.filter((replicaSet) => {
                        return (
                          replicaSet.ownerDeployment === deployment.name ||
                          selectorMatches(replicaSet.selector, deployment.selector) ||
                          selectorMatches(deployment.selector, replicaSet.selector)
                        );
                      });
                      const deploymentPods = namespacePods.filter((pod) => {
                        const ownedByReplicaSet =
                          pod.ownerKind === "ReplicaSet" &&
                          candidateReplicaSets.some((replicaSet) => replicaSet.name === pod.ownerName);
                        return ownedByReplicaSet || selectorMatches(deployment.selector, pod.labels);
                      });
                      const activeReplicaSetNames = new Set(
                        deploymentPods
                          .filter((pod) => pod.ownerKind === "ReplicaSet" && pod.ownerName)
                          .map((pod) => pod.ownerName as string),
                      );
                      const activeReplicaSetNamesForFlow = new Set(
                        candidateReplicaSets
                          .filter((replicaSet) => {
                            const ownsLivePod = activeReplicaSetNames.has(replicaSet.name);
                            const hasActiveReplicas = replicaSet.replicas > 0 || replicaSet.readyReplicas > 0;
                            return ownsLivePod || hasActiveReplicas;
                          })
                          .map((replicaSet) => replicaSet.name),
                      );
                      const relatedReplicaSets = [...candidateReplicaSets].sort((left, right) => {
                        const leftActive = activeReplicaSetNamesForFlow.has(left.name) ? 0 : 1;
                        const rightActive = activeReplicaSetNamesForFlow.has(right.name) ? 0 : 1;
                        if (leftActive !== rightActive) {
                          return leftActive - rightActive;
                        }
                        if (left.readyReplicas !== right.readyReplicas) {
                          return right.readyReplicas - left.readyReplicas;
                        }
                        if (left.replicas !== right.replicas) {
                          return right.replicas - left.replicas;
                        }
                        return left.name.localeCompare(right.name);
                      });
                      const endpointsByServiceName = new Map(
                        relatedEndpoints.map((endpoint) => [endpoint.name, endpoint]),
                      );
                      const entryCount = Math.max(relatedIngresses.length, 1);
                      const serviceStageCount = Math.max(deploymentServices.length, 1);
                      const workloadCount = Math.max(relatedReplicaSets.length + 1, 1);
                      const runtimeCount = Math.max(deploymentPods.length, 1);
                      const laneRows = Math.max(
                        entryCount,
                        serviceStageCount,
                        workloadCount,
                        runtimeCount,
                        1,
                      );
                      const entryRows = createSequentialRowIndices(entryCount);
                      const serviceRows = createSequentialRowIndices(serviceStageCount);
                      const workloadRows = createSequentialRowIndices(workloadCount);
                      const runtimeRows = createSequentialRowIndices(runtimeCount);
                      const canvasHeight = getTopologyCanvasHeight(laneRows);
                      const deploymentIsFlowSource =
                        deploymentPods.length > 0 || deployment.replicas > 0 || deployment.readyReplicas > 0;
                      const deploymentRow = workloadRows[0];
                      const replicaSetRowsByName = new Map(
                        relatedReplicaSets.map((replicaSet, index) => [
                          replicaSet.name,
                          workloadRows[index + 1],
                        ]),
                      );
                      const serviceTargetRowsByName = new Map(
                        deploymentServices.map((service) => {
                          const endpoint = endpointsByServiceName.get(service.name);
                          const targetRows = new Set<number>();

                          if (deploymentIsFlowSource) {
                            targetRows.add(deploymentRow);
                          }

                          for (const podName of endpoint?.podTargets ?? []) {
                            const pod = deploymentPods.find((item) => item.name === podName);
                            if (!pod) {
                              continue;
                            }

                            if (
                              pod.ownerKind === "ReplicaSet" &&
                              pod.ownerName &&
                              replicaSetRowsByName.has(pod.ownerName)
                            ) {
                              const replicaSetRow = replicaSetRowsByName.get(pod.ownerName);
                              if (replicaSetRow !== undefined) {
                                targetRows.add(replicaSetRow);
                              }
                              continue;
                            }

                            targetRows.add(deploymentRow);
                          }

                          return [service.name, Array.from(targetRows.values())];
                        }),
                      );
                      const serviceRowsByName = new Map(
                        deploymentServices.map((service, index) => [service.name, serviceRows[index]]),
                      );
                      const podRowsByName = new Map(
                        deploymentPods.map((pod, index) => [pod.name, runtimeRows[index]]),
                      );
                      const entryEdges =
                        relatedIngresses.length > 0
                          ? relatedIngresses.flatMap((ingress, ingressIndex) => {
                              const sourceRow = entryRows[ingressIndex];
                              return ingress.serviceNames.flatMap((serviceName) => {
                                const targetRow = serviceRowsByName.get(serviceName);
                                return targetRow === undefined ? [] : [{ sourceRow, targetRow }];
                              });
                            })
                          : (() => {
                              const sourceRow = entryRows[0];
                              const targetRows = deploymentServices.length
                                ? deploymentServices
                                    .map((service) => serviceRowsByName.get(service.name))
                                    .filter((row): row is number => row !== undefined)
                                : [serviceRows[0]];
                              return targetRows.map((targetRow) => ({ sourceRow, targetRow }));
                            })();
                      const serviceToWorkloadEdges =
                        deploymentServices.length > 0
                          ? deploymentServices.flatMap((service) => {
                              const sourceRow = serviceRowsByName.get(service.name);
                              if (sourceRow === undefined) {
                                return [];
                              }

                              const targetRows = new Set(serviceTargetRowsByName.get(service.name) ?? []);
                              if (targetRows.size === 0) {
                                targetRows.add(deploymentRow);
                              }

                              return Array.from(targetRows).map((targetRow) => ({ sourceRow, targetRow }));
                            })
                          : [{ sourceRow: serviceRows[0], targetRow: deploymentRow }];
                      const workloadToRuntimeEdges = [
                        ...(deploymentIsFlowSource
                          ? deploymentPods.flatMap((pod) => {
                              if (
                                pod.ownerKind === "ReplicaSet" &&
                                pod.ownerName &&
                                replicaSetRowsByName.has(pod.ownerName)
                              ) {
                                return [];
                              }

                              const targetRow = podRowsByName.get(pod.name);
                              return targetRow === undefined ? [] : [{ sourceRow: deploymentRow, targetRow }];
                            })
                          : []),
                        ...relatedReplicaSets.flatMap((replicaSet) => {
                          const sourceRow = replicaSetRowsByName.get(replicaSet.name);
                          if (
                            sourceRow === undefined ||
                            !activeReplicaSetNamesForFlow.has(replicaSet.name)
                          ) {
                            return [];
                          }

                          return deploymentPods.flatMap((pod) => {
                            if (pod.ownerKind !== "ReplicaSet" || pod.ownerName !== replicaSet.name) {
                              return [];
                            }
                            const targetRow = podRowsByName.get(pod.name);
                            return targetRow === undefined ? [] : [{ sourceRow, targetRow }];
                          });
                        }),
                      ];

                      return (
                        <div
                          key={`${deployment.namespace}-${deployment.name}`}
                          className="rounded-[32px] border border-slate-200 bg-slate-50/70 px-8 py-8 shadow-sm dark:border-slate-800 dark:bg-[#0B0E14]"
                        >
                          <div
                            ref={topologyViewportRef}
                            className="overflow-auto rounded-[24px] border border-slate-200/70 bg-[#0B0E14]/70 p-6 dark:border-slate-800"
                          >
                            <div
                              className="mx-auto"
                              style={{
                                width:
                                  (TOPOLOGY_CANVAS_WIDTH + TOPOLOGY_CANVAS_PADDING_X * 2) *
                                  topologyZoom,
                                height: canvasHeight * topologyZoom,
                              }}
                            >
                              <div
                                className="origin-top-left"
                                style={{
                                  width: TOPOLOGY_CANVAS_WIDTH + TOPOLOGY_CANVAS_PADDING_X * 2,
                                  height: canvasHeight,
                                  transform: `scale(${topologyZoom})`,
                                }}
                              >
                                <div className="px-12">
                                  <div className="grid w-[1760px] grid-cols-[300px_156px_320px_156px_320px_156px_320px] items-start gap-y-4">
                              <StageColumn
                                label="Entry"
                                count={
                                  relatedIngresses.length
                                    ? `${relatedIngresses.length} ingress`
                                    : "internal"
                                }
                                tone="slate"
                                rows={laneRows}
                                rowIndices={entryRows}
                              >
                                {relatedIngresses.length ? relatedIngresses.map((ingress) => (
                                  <ResourceMapNode
                                    key={`${deployment.name}-${ingress.name}`}
                                    kind="ingress"
                                    title={ingress.name}
                                    subtitle="Ingress"
                                    tone="healthy"
                                    meta={`${ingress.ingressClass} · ${ingress.address}`}
                                    chips={(ingress.hosts.length ? ingress.hosts : ingress.serviceNames).map(toChip)}
                                    onClick={() => setSelectedResource({
                                      kind: "ingress",
                                      title: ingress.name,
                                      subtitle: "Ingress",
                                      tone: "healthy",
                                      sections: [
                                        {
                                          label: "Info",
                                          rows: [
                                            { key: "Namespace", value: ingress.namespace },
                                            { key: "Class", value: ingress.ingressClass },
                                            { key: "Address", value: ingress.address || "—" },
                                          ],
                                        },
                                        ...(ingress.hosts.length ? [{ label: "Hosts", tags: ingress.hosts }] : []),
                                        { label: "Backend Services", tags: ingress.serviceNames },
                                      ],
                                    })}
                                  />
                                )) : (
                                  <ResourceMapNode
                                    kind="ingress"
                                    title="외부 진입 없음"
                                    subtitle="Entry"
                                    tone="neutral"
                                    meta="Ingress 없이 namespace 내부에서만 연결되는 워크로드입니다."
                                  />
                                )}
                              </StageColumn>

                              <BranchConnector
                                rows={laneRows}
                                edges={entryEdges}
                                label={relatedIngresses.length ? "INGRESS -> SERVICE" : "INTERNAL -> SERVICE"}
                              />

                              <StageColumn
                                label="Service"
                                count={`${serviceStageCount} services`}
                                tone="sky"
                                rows={laneRows}
                                rowIndices={serviceRows}
                              >
                                {deploymentServices.length ? deploymentServices.map((service) => (
                                  (() => {
                                    const endpoint = endpointsByServiceName.get(service.name);
                                    const totalEndpointTargets =
                                      (endpoint?.readyAddressCount ?? 0) + (endpoint?.notReadyAddressCount ?? 0);
                                    const endpointSummary = endpoint
                                      ? ` · endpoint ${endpoint.readyAddressCount}/${totalEndpointTargets} ready`
                                      : "";

                                    const serviceTone = endpoint && endpoint.notReadyAddressCount > 0 ? "progressing" : "healthy";
                                    return (
                                  <ResourceMapNode
                                    key={`${deployment.name}-${service.name}`}
                                    kind="service"
                                    title={service.name}
                                    subtitle="Service"
                                    tone={serviceTone}
                                    meta={`${service.type} · ${service.ports[0] ?? "port 정보 없음"}${endpointSummary}`}
                                    chips={[
                                      ...service.ports.map((port) => toChip(port)),
                                      ...(endpoint ? [toChip(`targets ${endpoint.readyAddressCount}`)] : []),
                                    ]}
                                    onClick={() => setSelectedResource({
                                      kind: "service",
                                      title: service.name,
                                      subtitle: "Service",
                                      tone: serviceTone,
                                      sections: [
                                        {
                                          label: "Network",
                                          rows: [
                                            { key: "Namespace", value: service.namespace },
                                            { key: "Type", value: service.type },
                                            { key: "Cluster IP", value: service.clusterIP },
                                          ],
                                        },
                                        ...(service.ports.length ? [{ label: "Ports", tags: service.ports }] : []),
                                        ...(Object.keys(service.selector).length
                                          ? [{ label: "Selector", tags: Object.entries(service.selector).map(([k, v]) => `${k}=${v}`) }]
                                          : []),
                                        ...(endpoint
                                          ? [{
                                              label: "Endpoints",
                                              rows: [
                                                { key: "Ready", value: String(endpoint.readyAddressCount) },
                                                { key: "Not Ready", value: String(endpoint.notReadyAddressCount) },
                                              ],
                                            }]
                                          : []),
                                      ],
                                    })}
                                  />
                                    );
                                  })()
                                )) : (
                                  <ResourceMapNode
                                    kind="service"
                                    title="연결된 서비스 없음"
                                    subtitle="Service"
                                    tone="neutral"
                                    meta="이 workload에 직접 연결된 service를 아직 찾지 못했습니다."
                                  />
                                )}
                              </StageColumn>

                              <BranchConnector
                                rows={laneRows}
                                edges={serviceToWorkloadEdges}
                                label="SERVICE -> WORKLOAD"
                              />

                              <StageColumn
                                label="Workload"
                                count={`${workloadCount} workloads`}
                                tone="violet"
                                rows={laneRows}
                                rowIndices={workloadRows}
                              >
                                <ResourceMapNode
                                  kind="deployment"
                                  title={deployment.name}
                                  subtitle="Deployment"
                                  tone={deploymentTone(deployment)}
                                  meta={`${deployment.readyReplicas}/${deployment.replicas} replicas ready`}
                                  chips={Object.entries(deployment.selector).map(([key, value]) =>
                                    toChip(`${key}=${value}`),
                                  )}
                                  onClick={() => setSelectedResource({
                                    kind: "deployment",
                                    title: deployment.name,
                                    subtitle: "Deployment",
                                    tone: deploymentTone(deployment),
                                    sections: [
                                      {
                                        label: "Status",
                                        rows: [
                                          { key: "Namespace", value: deployment.namespace },
                                          { key: "Replicas", value: `${deployment.readyReplicas}/${deployment.replicas} ready` },
                                        ],
                                      },
                                      ...(Object.keys(deployment.selector).length
                                        ? [{ label: "Selector", tags: Object.entries(deployment.selector).map(([k, v]) => `${k}=${v}`) }]
                                        : []),
                                      ...(deployment.images.length ? [{ label: "Images", tags: deployment.images }] : []),
                                    ],
                                  })}
                                />
                                {relatedReplicaSets.map((replicaSet) => {
                                  const replicaSetTone =
                                    replicaSet.readyReplicas === replicaSet.replicas
                                      ? "healthy"
                                      : replicaSet.readyReplicas > 0
                                        ? "progressing"
                                        : "degraded";
                                  return (
                                  <ResourceMapNode
                                    key={`${deployment.name}-${replicaSet.name}`}
                                    kind="replicaset"
                                    title={replicaSet.name}
                                    subtitle="ReplicaSet"
                                    tone={replicaSetTone}
                                    meta={`${replicaSet.readyReplicas}/${replicaSet.replicas} replicas ready`}
                                    chips={replicaSet.images.map(formatImageChip)}
                                    onClick={() => setSelectedResource({
                                      kind: "replicaset",
                                      title: replicaSet.name,
                                      subtitle: "ReplicaSet",
                                      tone: replicaSetTone,
                                      sections: [
                                        {
                                          label: "Status",
                                          rows: [
                                            { key: "Namespace", value: replicaSet.namespace },
                                            { key: "Replicas", value: `${replicaSet.readyReplicas}/${replicaSet.replicas} ready` },
                                            { key: "Owner", value: replicaSet.ownerDeployment || "—" },
                                          ],
                                        },
                                        ...(Object.keys(replicaSet.selector).length
                                          ? [{ label: "Selector", tags: Object.entries(replicaSet.selector).map(([k, v]) => `${k}=${v}`) }]
                                          : []),
                                        ...(replicaSet.images.length ? [{ label: "Images", tags: replicaSet.images }] : []),
                                      ],
                                    })}
                                  />
                                  );
                                })}
                              </StageColumn>

                              <BranchConnector
                                rows={laneRows}
                                edges={workloadToRuntimeEdges}
                                label="WORKLOAD -> POD"
                              />

                              <StageColumn
                                label="Runtime"
                                count={`${runtimeCount} pods`}
                                tone="emerald"
                                rows={laneRows}
                                rowIndices={runtimeRows}
                              >
                                {deploymentPods.length ? deploymentPods.map((pod) => (
                                  <ResourceMapNode
                                    key={`${deployment.name}-${pod.name}`}
                                    kind="pod"
                                    title={pod.name}
                                    subtitle="Pod"
                                    tone={statusTone(pod.phase)}
                                    meta={`${pod.ready} ready · restarts ${pod.restartCount} · node ${shortenMiddle(pod.node, 18, 10)}`}
                                    chips={[toChip(pod.node), ...pod.images.map(formatImageChip)]}
                                    onClick={() => setSelectedResource({
                                      kind: "pod",
                                      title: pod.name,
                                      subtitle: "Pod",
                                      tone: statusTone(pod.phase),
                                      sections: [
                                        {
                                          label: "Status",
                                          rows: [
                                            { key: "Namespace", value: pod.namespace },
                                            { key: "Phase", value: pod.phase },
                                            { key: "Ready", value: pod.ready },
                                            { key: "Node", value: pod.node },
                                            { key: "Restarts", value: String(pod.restartCount) },
                                          ],
                                        },
                                        ...(pod.ownerKind
                                          ? [{
                                              label: "Owner",
                                              rows: [
                                                { key: "Kind", value: pod.ownerKind },
                                                { key: "Name", value: pod.ownerName ?? "—" },
                                              ],
                                            }]
                                          : []),
                                        ...(pod.images.length ? [{ label: "Images", tags: pod.images }] : []),
                                        ...(Object.keys(pod.labels).length
                                          ? [{ label: "Labels", tags: Object.entries(pod.labels).map(([k, v]) => `${k}=${v}`) }]
                                          : []),
                                      ],
                                    })}
                                  />
                                )) : (
                                  <ResourceMapNode
                                    kind="pod"
                                    title="생성된 pod 없음"
                                    subtitle="Pod"
                                    tone="neutral"
                                    meta="workload에 연결된 pod를 아직 확인하지 못했습니다."
                                  />
                                )}
                              </StageColumn>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {!filteredDeployments.length ? (
                      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-[#0B0E14] dark:text-slate-400">
                        현재 필터에서 보여줄 deployment가 없습니다.
                      </div>
                    ) : null}
              </div>
            </section>

          </div>
        </div>
      </main>

      {selectedResource && (
        <ResourceDetailSidebar
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
        />
      )}
    </div>
  );
}
