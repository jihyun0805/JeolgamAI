"use client";

import dagre from "dagre";
import { useCallback, useEffect, useMemo, useState } from "react";
import MainSidebar from "@/app/components/main-sidebar";
import PageTopBar from "@/app/components/page-top-bar";
import { authFetch } from "@/lib/auth-fetch";

type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};

type InfraAction = "deletePod" | "deleteService" | "restartDeployment";

interface DockerContainerSnapshot {
  id: string;
  name: string;
  image: string;
  status: string;
  ports: string;
}

interface DockerNetworkSnapshot {
  id: string;
  name: string;
  driver: string;
  scope: string;
}

interface DockerVolumeSnapshot {
  name: string;
  driver: string;
  mountpoint: string;
}

interface HostProcessSnapshot {
  pid: number;
  command: string;
  args: string;
  processType: "java" | "node" | "python" | "go" | "system" | "unknown";
}

interface K8sNodeSnapshot {
  name: string;
  status: "Ready" | "NotReady" | "Unknown";
  version: string;
}

interface K8sPodSnapshot {
  namespace: string;
  name: string;
  phase: string;
  node: string;
  ready: string;
  restartCount: number;
  images: string[];
  labels: Record<string, string>;
}

interface K8sServiceSnapshot {
  namespace: string;
  name: string;
  type: string;
  clusterIP: string;
  ports: string[];
  selector: Record<string, string>;
}

interface K8sDeploymentSnapshot {
  namespace: string;
  name: string;
  replicas: number;
  readyReplicas: number;
  images: string[];
  selector: Record<string, string>;
}

interface K8sNamespaceSummary {
  name: string;
  podCount: number;
  serviceCount: number;
  deploymentCount: number;
}

interface InfraSnapshot {
  collectedAt: string;
  mode: "live" | "mock";
  host: {
    hostname: string;
    platform: string;
    arch: string;
    uptimeSec: number;
  };
  toolStatus: {
    docker: boolean;
    kubectl: boolean;
    process: boolean;
  };
  deploymentSignals: {
    docker: {
      available: boolean;
      engineRunning: boolean;
      containers: DockerContainerSnapshot[];
      networks: DockerNetworkSnapshot[];
      volumes: DockerVolumeSnapshot[];
      error?: string;
    };
    process: {
      available: boolean;
      processes: HostProcessSnapshot[];
      error?: string;
    };
    kubernetes: {
      available: boolean;
      context: string;
      nodes: K8sNodeSnapshot[];
      namespaces: K8sNamespaceSummary[];
      pods: K8sPodSnapshot[];
      services: K8sServiceSnapshot[];
      deployments: K8sDeploymentSnapshot[];
      error?: string;
    };
  };
  warnings: string[];
}

type ResourceSelection =
  | { kind: "pod"; namespace: string; name: string }
  | { kind: "service"; namespace: string; name: string }
  | { kind: "deployment"; namespace: string; name: string }
  | { kind: "docker"; name: string }
  | { kind: "network"; name: string }
  | { kind: "volume"; name: string }
  | { kind: "process"; pid: number };

type ResourceKind = "deployment" | "service" | "pod";
type ResourceTone = "healthy" | "warning" | "neutral";
type EdgeKind = "dep_pod" | "svc_pod";
type InfraViewMode = "all" | "k8s" | "docker";

interface TopologyEdge {
  key: string;
  kind: EdgeKind;
  fromKey: string;
  toKey: string;
  highlight: boolean;
}

interface GraphNodeLayout {
  id: string;
  kind: ResourceKind;
  namespace: string;
  name: string;
  title: string;
  subtitle: string;
  tone: ResourceTone;
  active: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GraphEdgeLayout {
  id: string;
  kind: EdgeKind;
  highlight: boolean;
  points: Array<{ x: number; y: number }>;
}

interface NamespaceGraphLayout {
  width: number;
  height: number;
  nodes: GraphNodeLayout[];
  edges: GraphEdgeLayout[];
}

const GRAPH_NODE_WIDTH = 260;
const GRAPH_NODE_HEIGHT = 56;

function ToolBadge({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  return (
    <span
      className={`rounded-full border px-2 py-1 text-[11px] font-bold uppercase ${
        active
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
          : "border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800"
      }`}
    >
      {label}
    </span>
  );
}

function ViewModeTab({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1.5 text-[11px] font-bold transition ${
        active
          ? "border-[#2a6ef5] bg-[#2a6ef5]/15 text-[#2a6ef5]"
          : "border-slate-300 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      {label}
    </button>
  );
}

function ResourceTypeIcon({ kind }: { kind: ResourceKind }) {
  const baseProps = {
    className: "h-3.5 w-3.5",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (kind === "deployment") {
    return (
      <svg {...baseProps}>
        <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.2" />
        <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.2" />
        <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.2" />
        <rect x="13" y="13" width="7.5" height="7.5" rx="1.2" />
      </svg>
    );
  }

  if (kind === "service") {
    return (
      <svg {...baseProps}>
        <circle cx="7.5" cy="12" r="2.2" />
        <circle cx="16.5" cy="7" r="2.2" />
        <circle cx="16.5" cy="17" r="2.2" />
        <path d="M9.7 11.2 14.2 8.3" />
        <path d="m9.7 12.8 4.5 2.9" />
      </svg>
    );
  }

  return (
    <svg {...baseProps}>
      <rect x="4.5" y="5.5" width="15" height="13" rx="2" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function getResourceToneClass(tone: ResourceTone, active: boolean): string {
  if (active) {
    return "border-[#2a6ef5] bg-[#2a6ef5]/10";
  }

  if (tone === "healthy") {
    return "border-emerald-500/30 bg-emerald-500/[0.05]";
  }

  if (tone === "warning") {
    return "border-amber-500/30 bg-amber-500/[0.06]";
  }

  return "border-slate-200 dark:border-slate-700";
}

function ResourceNode({
  kind,
  title,
  subtitle,
  tone,
  active,
  onClick,
}: {
  kind: ResourceKind;
  title: string;
  subtitle: string;
  tone: ResourceTone;
  active: boolean;
  onClick: () => void;
}) {
  const label = kind === "deployment" ? "deploy" : kind === "service" ? "svc" : "pod";
  return (
    <button
      onClick={onClick}
      className={`h-14 w-full rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${getResourceToneClass(tone, active)}`}
    >
      <div className="mb-0.5 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="text-slate-500">
            <ResourceTypeIcon kind={kind} />
          </span>
          <p className="truncate font-semibold">{title}</p>
        </div>
        <span className="rounded bg-slate-900/10 px-1.5 py-0.5 text-[10px] font-bold uppercase dark:bg-slate-100/10">
          {label}
        </span>
      </div>
      <p className="truncate text-slate-500 dark:text-slate-400">{subtitle}</p>
    </button>
  );
}

function normalizeWorkloadName(name: string): string {
  return name
    .toLowerCase()
    .replace(/-(deployment|deploy)$/, "")
    .replace(/-(service|svc)$/, "");
}

function podMatchesWorkload(podName: string, workloadName: string): boolean {
  const normalizedPod = podName.toLowerCase();
  const normalizedWorkload = normalizeWorkloadName(workloadName);

  return (
    normalizedPod === normalizedWorkload ||
    normalizedPod.startsWith(`${normalizedWorkload}-`) ||
    normalizedPod.startsWith(`${normalizedWorkload}.`)
  );
}

function matchesSelector(
  labels: Record<string, string> | undefined,
  selector: Record<string, string> | undefined,
): boolean {
  if (!labels || !selector) return false;
  const entries = Object.entries(selector);
  if (entries.length === 0) return false;
  return entries.every(([key, value]) => labels[key] === value);
}

function buildTopologyEdges(params: {
  namespace: string;
  deployments: K8sDeploymentSnapshot[];
  services: K8sServiceSnapshot[];
  pods: K8sPodSnapshot[];
  selected: ResourceSelection | null;
}): TopologyEdge[] {
  const { namespace, deployments, services, pods, selected } = params;
  const edges: TopologyEdge[] = [];
  const seen = new Set<string>();

  const isSelectedInNamespace =
    selected &&
    selected.kind !== "docker" &&
    selected.kind !== "network" &&
    selected.kind !== "volume" &&
    selected.kind !== "process" &&
    selected.namespace === namespace;

  for (let di = 0; di < deployments.length; di += 1) {
    const deployment = deployments[di];
    for (let pi = 0; pi < pods.length; pi += 1) {
      const pod = pods[pi];
      const linkedBySelector = matchesSelector(pod.labels, deployment.selector);
      const linkedByName = podMatchesWorkload(pod.name, deployment.name);
      if (!linkedBySelector && !linkedByName) continue;

      const key = `dep-${di}-pod-${pi}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const highlight = Boolean(
        isSelectedInNamespace &&
          selected &&
          ((selected.kind === "deployment" && selected.name === deployment.name) ||
            (selected.kind === "pod" && selected.name === pod.name)),
      );

      edges.push({
        key,
        kind: "dep_pod",
        fromKey: `dep:${deployment.name}`,
        toKey: `pod:${pod.name}`,
        highlight,
      });
    }
  }

  for (let si = 0; si < services.length; si += 1) {
    const service = services[si];
    for (let pi = 0; pi < pods.length; pi += 1) {
      const pod = pods[pi];
      const linkedBySelector = matchesSelector(pod.labels, service.selector);
      const linkedByName = podMatchesWorkload(pod.name, service.name);
      if (!linkedBySelector && !linkedByName) continue;

      const key = `svc-${si}-pod-${pi}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const highlight = Boolean(
        isSelectedInNamespace &&
          selected &&
          ((selected.kind === "service" && selected.name === service.name) ||
            (selected.kind === "pod" && selected.name === pod.name)),
      );

      edges.push({
        key,
        kind: "svc_pod",
        fromKey: `svc:${service.name}`,
        toKey: `pod:${pod.name}`,
        highlight,
      });
    }
  }

  return edges;
}

function buildNamespaceGraph(params: {
  namespace: string;
  deployments: K8sDeploymentSnapshot[];
  services: K8sServiceSnapshot[];
  pods: K8sPodSnapshot[];
  selected: ResourceSelection | null;
}): NamespaceGraphLayout {
  const { namespace, deployments, services, pods, selected } = params;
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({
    rankdir: "LR",
    nodesep: 26,
    ranksep: 90,
    marginx: 24,
    marginy: 20,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  const nodesMeta = new Map<
    string,
    Omit<GraphNodeLayout, "x" | "y" | "width" | "height">
  >();

  for (const deployment of deployments) {
    const id = `dep:${deployment.name}`;
    graph.setNode(id, { width: GRAPH_NODE_WIDTH, height: GRAPH_NODE_HEIGHT });
    nodesMeta.set(id, {
      id,
      kind: "deployment",
      namespace,
      name: deployment.name,
      title: deployment.name,
      subtitle: `${deployment.readyReplicas}/${deployment.replicas} replicas`,
      tone:
        deployment.replicas > 0 && deployment.readyReplicas === deployment.replicas
          ? "healthy"
          : "warning",
      active:
        selected?.kind === "deployment" &&
        selected.namespace === namespace &&
        selected.name === deployment.name,
    });
  }

  for (const service of services) {
    const id = `svc:${service.name}`;
    graph.setNode(id, { width: GRAPH_NODE_WIDTH, height: GRAPH_NODE_HEIGHT });
    nodesMeta.set(id, {
      id,
      kind: "service",
      namespace,
      name: service.name,
      title: service.name,
      subtitle: `${service.type} · ${service.clusterIP}`,
      tone: "neutral",
      active:
        selected?.kind === "service" &&
        selected.namespace === namespace &&
        selected.name === service.name,
    });
  }

  for (const pod of pods) {
    const id = `pod:${pod.name}`;
    graph.setNode(id, { width: GRAPH_NODE_WIDTH, height: GRAPH_NODE_HEIGHT });
    nodesMeta.set(id, {
      id,
      kind: "pod",
      namespace,
      name: pod.name,
      title: pod.name,
      subtitle: `${pod.phase} · ready ${pod.ready}`,
      tone: pod.phase === "Running" ? "healthy" : "warning",
      active:
        selected?.kind === "pod" &&
        selected.namespace === namespace &&
        selected.name === pod.name,
    });
  }

  const edges = buildTopologyEdges({
    namespace,
    deployments,
    services,
    pods,
    selected,
  });

  for (const edge of edges) {
    graph.setEdge(edge.fromKey, edge.toKey, {
      kind: edge.kind,
      highlight: edge.highlight,
      id: edge.key,
    });
  }

  dagre.layout(graph);

  const graphNodes = graph.nodes();
  if (graphNodes.length === 0) {
    return {
      width: 520,
      height: 180,
      nodes: [],
      edges: [],
    };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const nodes: GraphNodeLayout[] = graphNodes
    .map((id) => {
      const pos = graph.node(id) as { x: number; y: number; width: number; height: number };
      const meta = nodesMeta.get(id);
      if (!meta) return null;
      minX = Math.min(minX, pos.x - pos.width / 2);
      minY = Math.min(minY, pos.y - pos.height / 2);
      maxX = Math.max(maxX, pos.x + pos.width / 2);
      maxY = Math.max(maxY, pos.y + pos.height / 2);
      return {
        ...meta,
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
      };
    })
    .filter((node): node is GraphNodeLayout => Boolean(node));

  const normalizeX = (value: number) => value - minX + 24;
  const normalizeY = (value: number) => value - minY + 16;

  const normalizedNodes = nodes.map((node) => ({
    ...node,
    x: normalizeX(node.x),
    y: normalizeY(node.y),
  }));

  const graphEdges = graph
    .edges()
    .map((edgeInfo) => {
      const edge = graph.edge(edgeInfo) as {
        points?: Array<{ x: number; y: number }>;
        kind?: EdgeKind;
        highlight?: boolean;
        id?: string;
      };
      const points = (edge.points || []).map((point) => ({
        x: normalizeX(point.x),
        y: normalizeY(point.y),
      }));
      if (points.length < 2) return null;
      return {
        id: edge.id || `${edgeInfo.v}-${edgeInfo.w}`,
        kind: edge.kind || "dep_pod",
        highlight: Boolean(edge.highlight),
        points,
      } satisfies GraphEdgeLayout;
    })
    .filter((edge): edge is GraphEdgeLayout => Boolean(edge));

  const width = Math.max(560, maxX - minX + 56);
  const height = Math.max(180, maxY - minY + 40);

  return {
    width,
    height,
    nodes: normalizedNodes,
    edges: graphEdges,
  };
}

export default function InfrastructureMapPage() {
  const [snapshot, setSnapshot] = useState<InfraSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [viewMode, setViewMode] = useState<InfraViewMode>("all");
  const [namespaceFilter, setNamespaceFilter] = useState("all");
  const [selected, setSelected] = useState<ResourceSelection | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [executingAction, setExecutingAction] = useState<InfraAction | null>(null);

  const handleSelect = useCallback((next: ResourceSelection) => {
    setSelected(next);
    setDetailsOpen(true);
  }, []);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await authFetch("/api/infrastructure/agent", { cache: "no-store" });
      const payload = (await response.json()) as ApiEnvelope<InfraSnapshot>;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "인프라 데이터를 불러오지 못했습니다.");
      }

      const snapshotData = payload.data;
      setSnapshot(snapshotData);
      setMessage("");
      setSelected((prev) => {
        if (prev) return prev;
        const firstPod = snapshotData.deploymentSignals.kubernetes.pods[0];
        if (firstPod) {
          return {
            kind: "pod",
            namespace: firstPod.namespace,
            name: firstPod.name,
          };
        }

        const firstContainer = snapshotData.deploymentSignals.docker.containers[0];
        if (firstContainer) {
          return { kind: "docker", name: firstContainer.name };
        }

        const firstNetwork = snapshotData.deploymentSignals.docker.networks[0];
        if (firstNetwork) {
          return { kind: "network", name: firstNetwork.name };
        }

        const firstVolume = snapshotData.deploymentSignals.docker.volumes[0];
        if (firstVolume) {
          return { kind: "volume", name: firstVolume.name };
        }

        const firstProcess = snapshotData.deploymentSignals.process.processes[0];
        if (firstProcess) {
          return { kind: "process", pid: firstProcess.pid };
        }

        return prev;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot().catch(() => undefined);
  }, [loadSnapshot]);

  const filteredNamespaces = useMemo(() => {
    if (!snapshot) return [];
    const namespaces = snapshot.deploymentSignals.kubernetes.namespaces;
    if (namespaceFilter === "all") return namespaces;
    return namespaces.filter((item) => item.name === namespaceFilter);
  }, [snapshot, namespaceFilter]);

  const selectedNamespace = useMemo(() => {
    if (
      !selected ||
      selected.kind === "docker" ||
      selected.kind === "network" ||
      selected.kind === "volume" ||
      selected.kind === "process"
    ) {
      return null;
    }
    return selected.namespace;
  }, [selected]);

  const selectedResource = useMemo(() => {
    if (!snapshot || !selected) return null;

    if (selected.kind === "pod") {
      return (
        snapshot.deploymentSignals.kubernetes.pods.find(
          (item) => item.namespace === selected.namespace && item.name === selected.name,
        ) || null
      );
    }

    if (selected.kind === "service") {
      return (
        snapshot.deploymentSignals.kubernetes.services.find(
          (item) => item.namespace === selected.namespace && item.name === selected.name,
        ) || null
      );
    }

    if (selected.kind === "deployment") {
      return (
        snapshot.deploymentSignals.kubernetes.deployments.find(
          (item) => item.namespace === selected.namespace && item.name === selected.name,
        ) || null
      );
    }

    if (selected.kind === "docker") {
      return (
        snapshot.deploymentSignals.docker.containers.find(
          (item) => item.name === selected.name,
        ) || null
      );
    }

    if (selected.kind === "network") {
      return (
        snapshot.deploymentSignals.docker.networks.find((item) => item.name === selected.name) ||
        null
      );
    }

    if (selected.kind === "volume") {
      return (
        snapshot.deploymentSignals.docker.volumes.find((item) => item.name === selected.name) ||
        null
      );
    }

    return (
      snapshot.deploymentSignals.process.processes.find((item) => item.pid === selected.pid) ||
      null
    );
  }, [selected, snapshot]);

  const hasK8sData = Boolean(
    snapshot?.deploymentSignals.kubernetes.available &&
      snapshot.deploymentSignals.kubernetes.namespaces.length > 0,
  );
  const hasDockerData = Boolean(
    snapshot?.deploymentSignals.docker.available ||
      (snapshot?.deploymentSignals.docker.containers.length ?? 0) > 0 ||
      (snapshot?.deploymentSignals.docker.networks.length ?? 0) > 0 ||
      (snapshot?.deploymentSignals.docker.volumes.length ?? 0) > 0 ||
      (snapshot?.deploymentSignals.process.processes.length ?? 0) > 0,
  );
  const showK8s = viewMode === "all" || viewMode === "k8s";
  const showDocker = viewMode === "all" || viewMode === "docker";

  useEffect(() => {
    if (viewMode === "k8s" && !hasK8sData) {
      setViewMode(hasDockerData ? "docker" : "all");
    }
    if (viewMode === "docker" && !hasDockerData) {
      setViewMode(hasK8sData ? "k8s" : "all");
    }
  }, [hasDockerData, hasK8sData, viewMode]);

  useEffect(() => {
    if (!selected) return;
    const isK8sSelected =
      selected.kind === "pod" ||
      selected.kind === "service" ||
      selected.kind === "deployment";
    const isDockerSelected =
      selected.kind === "docker" ||
      selected.kind === "network" ||
      selected.kind === "volume" ||
      selected.kind === "process";

    if ((viewMode === "k8s" && isDockerSelected) || (viewMode === "docker" && isK8sSelected)) {
      setSelected(null);
      setDetailsOpen(false);
    }
  }, [selected, viewMode]);

  async function runAction(action: InfraAction, namespace: string, name: string) {
    setExecutingAction(action);
    setError("");
    setMessage("");

    try {
      const response = await authFetch("/api/infrastructure/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, namespace, name }),
      });

      const payload = (await response.json()) as ApiEnvelope<{
        executed: boolean;
        mode: "live" | "mock";
      }>;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "작업 실행에 실패했습니다.");
      }

      if (payload.data.mode === "mock") {
        setMessage("mock 모드: 실제 작업은 실행되지 않았습니다.");
      } else {
        setMessage("작업이 실행되었습니다.");
      }

      await loadSnapshot();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : String(actionError));
    } finally {
      setExecutingAction(null);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8] text-slate-900 dark:bg-[#0f1218] dark:text-slate-100">
      <MainSidebar active="infrastructure" />

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageTopBar
          title="인프라 맵"
          description="ArgoCD 스타일로 Kubernetes / Docker / Process 배포 상태를 조회하고 제어합니다."
          actions={
            <button
              onClick={() => loadSnapshot().catch(() => undefined)}
              className="rounded-lg bg-[#2a6ef5] px-4 py-2 text-sm font-bold text-white hover:bg-[#2a6ef5]/90"
            >
              새로고침
            </button>
          }
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-[1600px] space-y-4">
            <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1a2029]">
              <div className="flex flex-wrap items-center gap-2">
                <ToolBadge
                  label={`mode:${snapshot?.mode ?? "-"}`}
                  active={snapshot?.mode === "live"}
                />
                <ToolBadge
                  label="docker"
                  active={Boolean(snapshot?.toolStatus.docker)}
                />
                <ToolBadge
                  label="kubectl"
                  active={Boolean(snapshot?.toolStatus.kubectl)}
                />
                <ToolBadge
                  label="process"
                  active={Boolean(snapshot?.toolStatus.process)}
                />
                <div className="mx-1 hidden h-4 w-px bg-slate-300 dark:bg-slate-700 md:block" />
                <ViewModeTab
                  label="All"
                  active={viewMode === "all"}
                  onClick={() => setViewMode("all")}
                />
                <ViewModeTab
                  label="Kubernetes"
                  active={viewMode === "k8s"}
                  disabled={!hasK8sData}
                  onClick={() => setViewMode("k8s")}
                />
                <ViewModeTab
                  label="Docker"
                  active={viewMode === "docker"}
                  disabled={!hasDockerData}
                  onClick={() => setViewMode("docker")}
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  수집 시각:{" "}
                  {snapshot
                    ? new Date(snapshot.collectedAt).toLocaleString("ko-KR")
                    : "-"}
                </span>
              </div>

              {snapshot?.warnings.length ? (
                <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-300">
                  {snapshot.warnings.join(" / ")}
                </div>
              ) : null}
              {error ? (
                <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500">
                  {error}
                </div>
              ) : null}
              {message ? (
                <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-500">
                  {message}
                </div>
              ) : null}
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
              <div className="space-y-4">
                {showK8s ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1a2029]">
                    <h3 className="mb-3 text-sm font-bold">Namespace 필터</h3>
                    <select
                      value={namespaceFilter}
                      onChange={(event) => setNamespaceFilter(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      <option value="all">전체</option>
                      {snapshot?.deploymentSignals.kubernetes.namespaces.map((item) => (
                        <option key={item.name} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {showDocker ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1a2029]">
                    <h3 className="mb-3 text-sm font-bold">Docker Containers</h3>
                    <div className="max-h-52 space-y-2 overflow-auto">
                      {snapshot?.deploymentSignals.docker.containers.length ? (
                        snapshot.deploymentSignals.docker.containers.map((container) => (
                          <button
                            key={container.id}
                            onClick={() =>
                              handleSelect({ kind: "docker", name: container.name })
                            }
                            className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${
                              selected?.kind === "docker" && selected.name === container.name
                                ? "border-[#2a6ef5] bg-[#2a6ef5]/5"
                                : "border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            <p className="font-semibold">{container.name}</p>
                            <p className="truncate text-slate-500">{container.image}</p>
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">컨테이너가 없습니다.</p>
                      )}
                    </div>
                  </div>
                ) : null}

                {showDocker ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1a2029]">
                    <h3 className="mb-3 text-sm font-bold">Docker Networks</h3>
                    <div className="max-h-52 space-y-2 overflow-auto">
                      {snapshot?.deploymentSignals.docker.networks.length ? (
                        snapshot.deploymentSignals.docker.networks.map((network) => (
                          <button
                            key={network.id || network.name}
                            onClick={() => handleSelect({ kind: "network", name: network.name })}
                            className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${
                              selected?.kind === "network" && selected.name === network.name
                                ? "border-[#2a6ef5] bg-[#2a6ef5]/5"
                                : "border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            <p className="font-semibold">{network.name}</p>
                            <p className="truncate text-slate-500">
                              {network.driver} · {network.scope}
                            </p>
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">네트워크가 없습니다.</p>
                      )}
                    </div>
                  </div>
                ) : null}

                {showDocker ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1a2029]">
                    <h3 className="mb-3 text-sm font-bold">Docker Volumes</h3>
                    <div className="max-h-52 space-y-2 overflow-auto">
                      {snapshot?.deploymentSignals.docker.volumes.length ? (
                        snapshot.deploymentSignals.docker.volumes.map((volume) => (
                          <button
                            key={volume.name}
                            onClick={() => handleSelect({ kind: "volume", name: volume.name })}
                            className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${
                              selected?.kind === "volume" && selected.name === volume.name
                                ? "border-[#2a6ef5] bg-[#2a6ef5]/5"
                                : "border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            <p className="font-semibold">{volume.name}</p>
                            <p className="truncate text-slate-500">{volume.driver}</p>
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">볼륨이 없습니다.</p>
                      )}
                    </div>
                  </div>
                ) : null}

                {showDocker ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1a2029]">
                    <h3 className="mb-3 text-sm font-bold">Host Processes</h3>
                    <div className="max-h-52 space-y-2 overflow-auto">
                      {snapshot?.deploymentSignals.process.processes.length ? (
                        snapshot.deploymentSignals.process.processes.map((processItem) => (
                          <button
                            key={processItem.pid}
                            onClick={() => handleSelect({ kind: "process", pid: processItem.pid })}
                            className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${
                              selected?.kind === "process" && selected.pid === processItem.pid
                                ? "border-[#2a6ef5] bg-[#2a6ef5]/5"
                                : "border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            <p className="font-semibold">PID {processItem.pid}</p>
                            <p className="truncate text-slate-500">{processItem.processType}</p>
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">프로세스가 없습니다.</p>
                      )}
                    </div>
                  </div>
                ) : null}

                {showK8s ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs dark:border-slate-800 dark:bg-[#1a2029]">
                    <h3 className="mb-2 text-sm font-bold">노드 상태</h3>
                    <div className="space-y-2">
                      {snapshot?.deploymentSignals.kubernetes.nodes.length ? (
                        snapshot.deploymentSignals.kubernetes.nodes.map((node) => (
                          <div
                            key={node.name}
                            className="rounded-lg border border-slate-200 p-2 dark:border-slate-700"
                          >
                            <p className="truncate font-semibold">{node.name}</p>
                            <p className="text-slate-500">
                              {node.status} · {node.version}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-500">노드 정보를 찾지 못했습니다.</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                {showK8s ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1a2029]">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold">Kubernetes Topology</h3>
                    <div className="flex items-center gap-2">
                      {selected ? (
                        <button
                          onClick={() => setDetailsOpen((prev) => !prev)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-bold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                        >
                          {detailsOpen ? "상세 닫기" : "상세 열기"}
                        </button>
                      ) : null}
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        context: {snapshot?.deploymentSignals.kubernetes.context || "-"}
                      </p>
                    </div>
                  </div>

                  {!hasK8sData ? (
                    <p className="text-sm text-slate-500">
                      Kubernetes 데이터를 찾지 못했습니다. 연동 상태 또는 권한을 확인하세요.
                    </p>
                  ) : loading ? (
                    <p className="text-sm text-slate-500">데이터를 불러오는 중입니다...</p>
                  ) : !snapshot ? (
                    <p className="text-sm text-slate-500">표시할 데이터가 없습니다.</p>
                  ) : (
                    <div className="space-y-3">
                      {filteredNamespaces.length === 0 ? (
                        <p className="text-sm text-slate-500">해당 namespace가 없습니다.</p>
                      ) : (
                        filteredNamespaces.map((namespace) => {
                          const deployments =
                            snapshot.deploymentSignals.kubernetes.deployments.filter(
                              (item) => item.namespace === namespace.name,
                            );
                          const pods = snapshot.deploymentSignals.kubernetes.pods.filter(
                            (item) => item.namespace === namespace.name,
                          );
                          const services =
                            snapshot.deploymentSignals.kubernetes.services.filter(
                              (item) => item.namespace === namespace.name,
                            );

                          return (
                            <div
                              key={namespace.name}
                              className={`rounded-xl border p-4 ${
                                selectedNamespace === namespace.name
                                  ? "border-[#2a6ef5]/50 bg-[#2a6ef5]/5"
                                  : "border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              <div className="mb-3 flex items-center justify-between">
                                <h4 className="font-bold">{namespace.name}</h4>
                                <span className="text-[11px] text-slate-500">
                                  deploy {namespace.deploymentCount} · pod {namespace.podCount} ·
                                  svc {namespace.serviceCount}
                                </span>
                              </div>

                              {(() => {
                                const layout = buildNamespaceGraph({
                                  namespace: namespace.name,
                                  deployments,
                                  services,
                                  pods,
                                  selected,
                                });
                                const safeNsId = namespace.name.replace(/[^a-zA-Z0-9_-]/g, "_");
                                const markerBlueId = `edgeArrowBlue_${safeNsId}`;
                                const markerTealId = `edgeArrowTeal_${safeNsId}`;

                                return (
                                  <div className="overflow-auto rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                                    {layout.nodes.length === 0 ? (
                                      <div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-xs text-slate-400 dark:border-slate-700">
                                        no kubernetes resources
                                      </div>
                                    ) : (
                                      <div
                                        className="relative"
                                        style={{ width: layout.width, height: layout.height }}
                                      >
                                        <svg
                                          className="pointer-events-none absolute inset-0 z-0"
                                          width={layout.width}
                                          height={layout.height}
                                          viewBox={`0 0 ${layout.width} ${layout.height}`}
                                          aria-hidden
                                        >
                                          <defs>
                                            <marker
                                              id={markerBlueId}
                                              markerWidth="8"
                                              markerHeight="8"
                                              refX="6"
                                              refY="4"
                                              orient="auto"
                                            >
                                              <path d="M0,0 L8,4 L0,8 z" fill="#3B82F6" />
                                            </marker>
                                            <marker
                                              id={markerTealId}
                                              markerWidth="8"
                                              markerHeight="8"
                                              refX="6"
                                              refY="4"
                                              orient="auto"
                                            >
                                              <path d="M0,0 L8,4 L0,8 z" fill="#14B8A6" />
                                            </marker>
                                          </defs>

                                          {layout.edges.map((edge) => {
                                            const path = edge.points
                                              .map((point, index) =>
                                                `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
                                              )
                                              .join(" ");
                                            const stroke =
                                              edge.kind === "dep_pod" ? "#3B82F6" : "#14B8A6";
                                            const markerEnd =
                                              edge.kind === "dep_pod"
                                                ? `url(#${markerBlueId})`
                                                : `url(#${markerTealId})`;

                                            return (
                                              <path
                                                key={edge.id}
                                                d={path}
                                                stroke={stroke}
                                                strokeWidth={edge.highlight ? 2.5 : 1.2}
                                                opacity={edge.highlight ? 0.95 : 0.45}
                                                strokeLinejoin="round"
                                                strokeLinecap="round"
                                                fill="none"
                                                markerEnd={markerEnd}
                                              />
                                            );
                                          })}
                                        </svg>

                                        <div className="relative z-10">
                                          {layout.nodes.map((node) => (
                                            <div
                                              key={node.id}
                                              className="absolute"
                                              style={{
                                                left: node.x - node.width / 2,
                                                top: node.y - node.height / 2,
                                                width: node.width,
                                              }}
                                            >
                                              <ResourceNode
                                                kind={node.kind}
                                                title={node.title}
                                                subtitle={node.subtitle}
                                                tone={node.tone}
                                                active={node.active}
                                                onClick={() =>
                                                  handleSelect({
                                                    kind: node.kind,
                                                    namespace: node.namespace,
                                                    name: node.name,
                                                  })
                                                }
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                  </div>
                ) : null}

                {showDocker ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#1a2029]">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-bold">Docker Runtime Topology</h3>
                      <div className="flex items-center gap-2">
                        {selected ? (
                          <button
                            onClick={() => setDetailsOpen((prev) => !prev)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-bold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                          >
                            {detailsOpen ? "상세 닫기" : "상세 열기"}
                          </button>
                        ) : null}
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          host: {snapshot?.host.hostname ?? "-"}
                        </p>
                      </div>
                    </div>

                    {!hasDockerData ? (
                      <p className="text-sm text-slate-500">
                        Docker/Process 런타임 데이터를 찾지 못했습니다.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                          <p className="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
                            Containers
                          </p>
                          <div className="space-y-2">
                            {snapshot?.deploymentSignals.docker.containers.length ? (
                              snapshot.deploymentSignals.docker.containers.map((container) => (
                                <button
                                  key={`docker-topology-${container.id}`}
                                  onClick={() =>
                                    handleSelect({ kind: "docker", name: container.name })
                                  }
                                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${
                                    selected?.kind === "docker" &&
                                    selected.name === container.name
                                      ? "border-[#2a6ef5] bg-[#2a6ef5]/10"
                                      : "border-slate-200 dark:border-slate-700"
                                  }`}
                                >
                                  <p className="font-semibold">{container.name}</p>
                                  <p className="truncate text-slate-500">{container.image}</p>
                                  <p className="truncate text-[11px] text-slate-500">
                                    {container.status} · {container.ports}
                                  </p>
                                </button>
                              ))
                            ) : (
                              <p className="text-xs text-slate-500">컨테이너가 없습니다.</p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                          <p className="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
                            Networks
                          </p>
                          <div className="space-y-2">
                            {snapshot?.deploymentSignals.docker.networks.length ? (
                              snapshot.deploymentSignals.docker.networks.map((network) => (
                                <button
                                  key={`network-topology-${network.id || network.name}`}
                                  onClick={() =>
                                    handleSelect({ kind: "network", name: network.name })
                                  }
                                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${
                                    selected?.kind === "network" &&
                                    selected.name === network.name
                                      ? "border-[#2a6ef5] bg-[#2a6ef5]/10"
                                      : "border-slate-200 dark:border-slate-700"
                                  }`}
                                >
                                  <p className="font-semibold">{network.name}</p>
                                  <p className="truncate text-slate-500">
                                    {network.driver} · {network.scope}
                                  </p>
                                </button>
                              ))
                            ) : (
                              <p className="text-xs text-slate-500">네트워크가 없습니다.</p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                          <p className="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
                            Volumes
                          </p>
                          <div className="space-y-2">
                            {snapshot?.deploymentSignals.docker.volumes.length ? (
                              snapshot.deploymentSignals.docker.volumes.map((volume) => (
                                <button
                                  key={`volume-topology-${volume.name}`}
                                  onClick={() =>
                                    handleSelect({ kind: "volume", name: volume.name })
                                  }
                                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${
                                    selected?.kind === "volume" && selected.name === volume.name
                                      ? "border-[#2a6ef5] bg-[#2a6ef5]/10"
                                      : "border-slate-200 dark:border-slate-700"
                                  }`}
                                >
                                  <p className="font-semibold">{volume.name}</p>
                                  <p className="truncate text-slate-500">{volume.driver}</p>
                                  <p className="truncate text-[11px] text-slate-500">
                                    {volume.mountpoint}
                                  </p>
                                </button>
                              ))
                            ) : (
                              <p className="text-xs text-slate-500">볼륨이 없습니다.</p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                          <p className="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
                            Host Processes
                          </p>
                          <div className="space-y-2">
                            {snapshot?.deploymentSignals.process.processes.length ? (
                              snapshot.deploymentSignals.process.processes.map((processItem) => (
                                <button
                                  key={`process-topology-${processItem.pid}`}
                                  onClick={() =>
                                    handleSelect({ kind: "process", pid: processItem.pid })
                                  }
                                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${
                                    selected?.kind === "process" &&
                                    selected.pid === processItem.pid
                                      ? "border-[#2a6ef5] bg-[#2a6ef5]/10"
                                      : "border-slate-200 dark:border-slate-700"
                                  }`}
                                >
                                  <p className="font-semibold">PID {processItem.pid}</p>
                                  <p className="text-slate-500">{processItem.processType}</p>
                                  <p className="truncate text-[11px] text-slate-500">
                                    {processItem.command}
                                  </p>
                                </button>
                              ))
                            ) : (
                              <p className="text-xs text-slate-500">프로세스가 없습니다.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {!showK8s && !showDocker ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-[#1a2029]">
                    표시 가능한 인프라 모드가 없습니다.
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </main>

        {detailsOpen ? (
          <button
            aria-label="상세 패널 닫기"
            onClick={() => setDetailsOpen(false)}
            className="absolute inset-0 z-20 bg-slate-950/35 backdrop-blur-[1px]"
          />
        ) : null}

        <aside
          className={`absolute top-0 right-0 z-30 h-full w-full max-w-md border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 dark:border-slate-800 dark:bg-[#111722] ${
            detailsOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-extrabold">상세 정보</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {selected
                    ? selected.kind === "process"
                      ? `process · pid ${selected.pid}`
                      : selected.kind === "docker"
                        ? `docker · ${selected.name}`
                        : selected.kind === "network"
                          ? `network · ${selected.name}`
                          : selected.kind === "volume"
                            ? `volume · ${selected.name}`
                            : `${selected.kind} · ${selected.namespace}/${selected.name}`
                    : "리소스를 선택하세요"}
                </p>
              </div>
              <button
                onClick={() => setDetailsOpen(false)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-bold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                닫기
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4 text-xs">
              {!selected || !selectedResource ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-3 text-slate-500 dark:border-slate-700">
                  그래프 또는 좌측 리스트에서 리소스를 선택하세요.
                </div>
              ) : null}

              {selected && selected.kind === "pod" && selectedResource ? (
                <div className="space-y-2 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <p className="font-semibold">{selected.name}</p>
                  <p>namespace: {selected.namespace}</p>
                  <p>ready: {(selectedResource as K8sPodSnapshot).ready}</p>
                  <p>restart: {(selectedResource as K8sPodSnapshot).restartCount}</p>
                  <p>node: {(selectedResource as K8sPodSnapshot).node}</p>
                  <p className="truncate text-slate-500">
                    image: {(selectedResource as K8sPodSnapshot).images.join(", ")}
                  </p>
                  <button
                    disabled={executingAction !== null}
                    onClick={() =>
                      runAction("deletePod", selected.namespace, selected.name).catch(
                        () => undefined,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {executingAction === "deletePod"
                      ? "Pod 재시작 중..."
                      : "Pod Kill (재생성)"}
                  </button>
                </div>
              ) : null}

              {selected && selected.kind === "service" && selectedResource ? (
                <div className="space-y-2 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <p className="font-semibold">{selected.name}</p>
                  <p>namespace: {selected.namespace}</p>
                  <p>type: {(selectedResource as K8sServiceSnapshot).type}</p>
                  <p>clusterIP: {(selectedResource as K8sServiceSnapshot).clusterIP}</p>
                  <p className="text-slate-500">
                    ports: {(selectedResource as K8sServiceSnapshot).ports.join(", ")}
                  </p>
                  <button
                    disabled={executingAction !== null}
                    onClick={() =>
                      runAction("deleteService", selected.namespace, selected.name).catch(
                        () => undefined,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {executingAction === "deleteService"
                      ? "Service 삭제 중..."
                      : "Service 삭제"}
                  </button>
                </div>
              ) : null}

              {selected && selected.kind === "deployment" && selectedResource ? (
                <div className="space-y-2 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <p className="font-semibold">{selected.name}</p>
                  <p>namespace: {selected.namespace}</p>
                  <p>
                    replicas: {(selectedResource as K8sDeploymentSnapshot).readyReplicas}/
                    {(selectedResource as K8sDeploymentSnapshot).replicas}
                  </p>
                  <p className="truncate text-slate-500">
                    image: {(selectedResource as K8sDeploymentSnapshot).images.join(", ")}
                  </p>
                  <button
                    disabled={executingAction !== null}
                    onClick={() =>
                      runAction("restartDeployment", selected.namespace, selected.name).catch(
                        () => undefined,
                      )
                    }
                    className="mt-2 w-full rounded-lg bg-[#2a6ef5] px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {executingAction === "restartDeployment"
                      ? "Rollout Restart 중..."
                      : "Deployment Restart"}
                  </button>
                </div>
              ) : null}

              {selected && selected.kind === "docker" && selectedResource ? (
                <div className="space-y-2 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <p className="font-semibold">
                    {(selectedResource as DockerContainerSnapshot).name}
                  </p>
                  <p>image: {(selectedResource as DockerContainerSnapshot).image}</p>
                  <p>status: {(selectedResource as DockerContainerSnapshot).status}</p>
                  <p>ports: {(selectedResource as DockerContainerSnapshot).ports}</p>
                </div>
              ) : null}

              {selected && selected.kind === "network" && selectedResource ? (
                <div className="space-y-2 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <p className="font-semibold">
                    {(selectedResource as DockerNetworkSnapshot).name}
                  </p>
                  <p>driver: {(selectedResource as DockerNetworkSnapshot).driver}</p>
                  <p>scope: {(selectedResource as DockerNetworkSnapshot).scope}</p>
                  <p className="text-slate-500">id: {(selectedResource as DockerNetworkSnapshot).id}</p>
                </div>
              ) : null}

              {selected && selected.kind === "volume" && selectedResource ? (
                <div className="space-y-2 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <p className="font-semibold">{(selectedResource as DockerVolumeSnapshot).name}</p>
                  <p>driver: {(selectedResource as DockerVolumeSnapshot).driver}</p>
                  <p className="break-all text-slate-500">
                    mountpoint: {(selectedResource as DockerVolumeSnapshot).mountpoint}
                  </p>
                </div>
              ) : null}

              {selected && selected.kind === "process" && selectedResource ? (
                <div className="space-y-2 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <p className="font-semibold">PID {(selectedResource as HostProcessSnapshot).pid}</p>
                  <p>type: {(selectedResource as HostProcessSnapshot).processType}</p>
                  <p className="break-all text-slate-500">
                    {(selectedResource as HostProcessSnapshot).args}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
