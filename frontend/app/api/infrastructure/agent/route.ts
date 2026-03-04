import os from "node:os";
import { execFile } from "node:child_process";
import { fail, ok } from "@/lib/api-response";
import { requireRole, requireSession } from "@/lib/auth";
import { isMockDataMode } from "@/lib/runtime-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InfraAction = "deletePod" | "deleteService" | "restartDeployment";

interface CommandResult {
  ok: boolean;
  command: string;
  stdout: string;
  stderr: string;
  error?: string;
  exitCode: number | null;
  durationMs: number;
}

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

interface ActionBody {
  action?: InfraAction;
  namespace?: string;
  name?: string;
}

interface K8sObjectMeta {
  name?: string;
  namespace?: string;
  labels?: Record<string, string>;
}

interface K8sNodeItem {
  metadata?: K8sObjectMeta;
  status?: {
    nodeInfo?: {
      kubeletVersion?: string;
    };
    conditions?: Array<{
      type?: string;
      status?: string;
    }>;
  };
}

interface K8sPodItem {
  metadata?: K8sObjectMeta;
  spec?: {
    nodeName?: string;
    containers?: Array<{ image?: string }>;
  };
  status?: {
    phase?: string;
    containerStatuses?: Array<{
      ready?: boolean;
      restartCount?: number;
    }>;
  };
}

interface K8sServiceItem {
  metadata?: K8sObjectMeta;
  spec?: {
    type?: string;
    clusterIP?: string;
    selector?: Record<string, string>;
    ports?: Array<{
      port?: number;
      protocol?: string;
      targetPort?: number | string;
    }>;
  };
}

interface K8sDeploymentItem {
  metadata?: K8sObjectMeta;
  spec?: {
    replicas?: number;
    selector?: {
      matchLabels?: Record<string, string>;
    };
    template?: {
      spec?: {
        containers?: Array<{ image?: string }>;
      };
    };
  };
  status?: {
    readyReplicas?: number;
  };
}

interface K8sListResponse<T> {
  items?: T[];
}

interface DockerVolumeInspectItem {
  Name?: string;
  Driver?: string;
  Mountpoint?: string;
}

const K8S_RESOURCE_NAME = /^[a-z0-9]([-.a-z0-9]*[a-z0-9])?$/;

function runBinary(binary: string, args: string[], timeoutMs = 7000): Promise<CommandResult> {
  const startedAt = Date.now();
  const command = [binary, ...args].join(" ");

  return new Promise((resolve) => {
    execFile(
      binary,
      args,
      {
        timeout: timeoutMs,
        maxBuffer: 4 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        const durationMs = Date.now() - startedAt;
        if (!error) {
          resolve({
            ok: true,
            command,
            stdout,
            stderr,
            exitCode: 0,
            durationMs,
          });
          return;
        }

        const commandError = error as NodeJS.ErrnoException & {
          code?: number | string;
          stdout?: string;
          stderr?: string;
        };

        resolve({
          ok: false,
          command,
          stdout: stdout || commandError.stdout || "",
          stderr: stderr || commandError.stderr || "",
          error: commandError.message,
          exitCode: typeof commandError.code === "number" ? commandError.code : null,
          durationMs,
        });
      },
    );
  });
}

async function isBinaryAvailable(binary: string): Promise<boolean> {
  const result = await runBinary("which", [binary], 2000);
  return result.ok && Boolean(result.stdout.trim());
}

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function splitLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function classifyProcessType(command: string, args: string): HostProcessSnapshot["processType"] {
  const normalizedCommand = command.toLowerCase();
  const normalizedArgs = args.toLowerCase();

  if (
    normalizedCommand.includes("java") ||
    /\bjava(\s|$)/.test(normalizedArgs) ||
    normalizedArgs.includes(".jar")
  ) {
    return "java";
  }
  if (normalizedCommand.includes("node") || /\bnode(\s|$)/.test(normalizedArgs)) {
    return "node";
  }
  if (normalizedCommand.includes("python") || /\bpython(\d+)?(\s|$)/.test(normalizedArgs)) {
    return "python";
  }
  if (normalizedCommand === "go" || /\bgo(\s|$)/.test(normalizedArgs)) {
    return "go";
  }
  if (normalizedCommand) return "system";
  return "unknown";
}

async function collectDockerSignals(): Promise<InfraSnapshot["deploymentSignals"]["docker"]> {
  const available = await isBinaryAvailable("docker");
  if (!available) {
    return {
      available: false,
      engineRunning: false,
      containers: [],
      networks: [],
      volumes: [],
      error: "docker CLI를 찾지 못했습니다.",
    };
  }

  const containerResult = await runBinary(
    "docker",
    ["ps", "--format", "{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"],
    5000,
  );

  if (!containerResult.ok) {
    return {
      available: true,
      engineRunning: false,
      containers: [],
      networks: [],
      volumes: [],
      error: containerResult.stderr || containerResult.error || "docker ps 실행 실패",
    };
  }

  const containers: DockerContainerSnapshot[] = splitLines(containerResult.stdout).map((line) => {
    const [id, name, image, status, ports] = line.split("\t");
    return {
      id: id || "",
      name: name || "",
      image: image || "",
      status: status || "",
      ports: ports || "-",
    };
  });

  const [networkResult, volumeResult] = await Promise.all([
    runBinary(
      "docker",
      ["network", "ls", "--format", "{{.ID}}\t{{.Name}}\t{{.Driver}}\t{{.Scope}}"],
      5000,
    ),
    runBinary("docker", ["volume", "ls", "--format", "{{.Name}}\t{{.Driver}}"], 5000),
  ]);

  const errors: string[] = [];

  const networks: DockerNetworkSnapshot[] = networkResult.ok
    ? splitLines(networkResult.stdout).map((line) => {
        const [id, name, driver, scope] = line.split("\t");
        return {
          id: id || "",
          name: name || "",
          driver: driver || "-",
          scope: scope || "-",
        };
      })
    : [];

  if (!networkResult.ok) {
    errors.push(networkResult.stderr || networkResult.error || "docker network ls 실행 실패");
  }

  let volumes: DockerVolumeSnapshot[] = [];
  const volumeRows = volumeResult.ok
    ? splitLines(volumeResult.stdout).map((line) => {
        const [name, driver] = line.split("\t");
        return {
          name: name || "",
          driver: driver || "-",
        };
      })
    : [];

  if (!volumeResult.ok) {
    errors.push(volumeResult.stderr || volumeResult.error || "docker volume ls 실행 실패");
  }

  if (volumeRows.length > 0) {
    const inspectResult = await runBinary(
      "docker",
      ["volume", "inspect", ...volumeRows.map((volume) => volume.name)],
      7000,
    );

    if (inspectResult.ok) {
      const inspected = parseJson<DockerVolumeInspectItem[]>(inspectResult.stdout) || [];
      const inspectedMap = new Map(
        inspected
          .filter((item) => item?.Name)
          .map((item) => [
            item.Name as string,
            {
              driver: item.Driver || "-",
              mountpoint: item.Mountpoint || "-",
            },
          ]),
      );

      volumes = volumeRows.map((volume) => {
        const inspectData = inspectedMap.get(volume.name);
        return {
          name: volume.name,
          driver: inspectData?.driver || volume.driver,
          mountpoint: inspectData?.mountpoint || "-",
        };
      });
    } else {
      errors.push(inspectResult.stderr || inspectResult.error || "docker volume inspect 실행 실패");
      volumes = volumeRows.map((volume) => ({
        name: volume.name,
        driver: volume.driver,
        mountpoint: "-",
      }));
    }
  }

  return {
    available: true,
    engineRunning: true,
    containers,
    networks,
    volumes,
    error: errors.length > 0 ? errors.join(" | ") : undefined,
  };
}

async function collectProcessSignals(): Promise<InfraSnapshot["deploymentSignals"]["process"]> {
  const processList = await runBinary("ps", ["-eo", "pid=,comm=,args="], 5000);

  if (!processList.ok) {
    return {
      available: false,
      processes: [],
      error: processList.stderr || processList.error || "프로세스 조회 실패",
    };
  }

  const processes: HostProcessSnapshot[] = [];

  for (const line of splitLines(processList.stdout)) {
    const match = line.match(/^(\d+)\s+(\S+)\s+(.*)$/);
    if (!match) continue;

    const pid = Number(match[1]);
    const command = match[2];
    const args = match[3];

    processes.push({
      pid,
      command,
      args,
      processType: classifyProcessType(command, args),
    });
  }

  return {
    available: true,
    processes: processes.slice(0, 120),
  };
}

function safeMetaName(metadata: K8sObjectMeta | undefined, fallback: string): string {
  return metadata?.name || fallback;
}

function safeMetaNamespace(metadata: K8sObjectMeta | undefined): string {
  return metadata?.namespace || "default";
}

function safeRecord(record: Record<string, string> | undefined): Record<string, string> {
  if (!record) return {};
  return Object.fromEntries(
    Object.entries(record).filter(([key, value]) => key && typeof value === "string"),
  );
}

async function collectKubernetesSignals(): Promise<InfraSnapshot["deploymentSignals"]["kubernetes"]> {
  const kubectlAvailable = await isBinaryAvailable("kubectl");
  if (!kubectlAvailable) {
    return {
      available: false,
      context: "",
      nodes: [],
      namespaces: [],
      pods: [],
      services: [],
      deployments: [],
      error: "kubectl CLI를 찾지 못했습니다.",
    };
  }

  const [contextResult, nodesResult, namespacesResult, podsResult, servicesResult, deploymentsResult] =
    await Promise.all([
      runBinary("kubectl", ["config", "current-context"], 3000),
      runBinary("kubectl", ["get", "nodes", "-o", "json"], 6000),
      runBinary("kubectl", ["get", "namespaces", "-o", "json"], 6000),
      runBinary("kubectl", ["get", "pods", "-A", "-o", "json"], 7000),
      runBinary("kubectl", ["get", "services", "-A", "-o", "json"], 7000),
      runBinary("kubectl", ["get", "deployments", "-A", "-o", "json"], 7000),
    ]);

  const nodesPayload = parseJson<K8sListResponse<K8sNodeItem>>(nodesResult.stdout);
  const namespacesPayload = parseJson<K8sListResponse<K8sObjectMeta>>(namespacesResult.stdout);
  const podsPayload = parseJson<K8sListResponse<K8sPodItem>>(podsResult.stdout);
  const servicesPayload = parseJson<K8sListResponse<K8sServiceItem>>(servicesResult.stdout);
  const deploymentsPayload = parseJson<K8sListResponse<K8sDeploymentItem>>(
    deploymentsResult.stdout,
  );

  const nodes: K8sNodeSnapshot[] = (nodesPayload?.items || []).map((item) => {
    const readyCondition = item.status?.conditions?.find(
      (condition) => condition.type === "Ready",
    );
    return {
      name: safeMetaName(item.metadata, "unknown-node"),
      status:
        readyCondition?.status === "True"
          ? "Ready"
          : readyCondition?.status === "False"
            ? "NotReady"
            : "Unknown",
      version: item.status?.nodeInfo?.kubeletVersion || "-",
    };
  });

  const pods: K8sPodSnapshot[] = (podsPayload?.items || []).map((item) => {
    const containerStatuses = item.status?.containerStatuses || [];
    const readyCount = containerStatuses.filter((status) => status.ready).length;
    const totalCount = containerStatuses.length;
    const restartCount = containerStatuses.reduce(
      (sum, status) => sum + (status.restartCount || 0),
      0,
    );
    return {
      namespace: safeMetaNamespace(item.metadata),
      name: safeMetaName(item.metadata, "unknown-pod"),
      phase: item.status?.phase || "Unknown",
      node: item.spec?.nodeName || "-",
      ready: totalCount > 0 ? `${readyCount}/${totalCount}` : "0/0",
      restartCount,
      images: (item.spec?.containers || [])
        .map((container) => container.image || "")
        .filter(Boolean),
      labels: safeRecord(item.metadata?.labels),
    };
  });

  const services: K8sServiceSnapshot[] = (servicesPayload?.items || []).map((item) => ({
    namespace: safeMetaNamespace(item.metadata),
    name: safeMetaName(item.metadata, "unknown-service"),
    type: item.spec?.type || "ClusterIP",
    clusterIP: item.spec?.clusterIP || "-",
    ports: (item.spec?.ports || []).map((port) => {
      const protocol = port.protocol || "TCP";
      const servicePort = typeof port.port === "number" ? String(port.port) : "?";
      const targetPort =
        typeof port.targetPort === "number" || typeof port.targetPort === "string"
          ? String(port.targetPort)
          : servicePort;
      return `${protocol}:${servicePort}->${targetPort}`;
    }),
    selector: safeRecord(item.spec?.selector),
  }));

  const deployments: K8sDeploymentSnapshot[] = (deploymentsPayload?.items || []).map(
    (item) => ({
      namespace: safeMetaNamespace(item.metadata),
      name: safeMetaName(item.metadata, "unknown-deployment"),
      replicas: item.spec?.replicas ?? 0,
      readyReplicas: item.status?.readyReplicas ?? 0,
      images: (item.spec?.template?.spec?.containers || [])
        .map((container) => container.image || "")
        .filter(Boolean),
      selector: safeRecord(item.spec?.selector?.matchLabels),
    }),
  );

  const namespaceMap = new Map<string, K8sNamespaceSummary>();
  for (const namespace of namespacesPayload?.items || []) {
    const name = safeMetaName(namespace, "default");
    namespaceMap.set(name, {
      name,
      podCount: 0,
      serviceCount: 0,
      deploymentCount: 0,
    });
  }

  for (const pod of pods) {
    const current = namespaceMap.get(pod.namespace) || {
      name: pod.namespace,
      podCount: 0,
      serviceCount: 0,
      deploymentCount: 0,
    };
    current.podCount += 1;
    namespaceMap.set(pod.namespace, current);
  }

  for (const service of services) {
    const current = namespaceMap.get(service.namespace) || {
      name: service.namespace,
      podCount: 0,
      serviceCount: 0,
      deploymentCount: 0,
    };
    current.serviceCount += 1;
    namespaceMap.set(service.namespace, current);
  }

  for (const deployment of deployments) {
    const current = namespaceMap.get(deployment.namespace) || {
      name: deployment.namespace,
      podCount: 0,
      serviceCount: 0,
      deploymentCount: 0,
    };
    current.deploymentCount += 1;
    namespaceMap.set(deployment.namespace, current);
  }

  const errors = [
    nodesResult.ok ? "" : nodesResult.stderr || nodesResult.error || "nodes 조회 실패",
    namespacesResult.ok
      ? ""
      : namespacesResult.stderr || namespacesResult.error || "namespaces 조회 실패",
    podsResult.ok ? "" : podsResult.stderr || podsResult.error || "pods 조회 실패",
    servicesResult.ok
      ? ""
      : servicesResult.stderr || servicesResult.error || "services 조회 실패",
    deploymentsResult.ok
      ? ""
      : deploymentsResult.stderr || deploymentsResult.error || "deployments 조회 실패",
  ].filter(Boolean);

  return {
    available: true,
    context: contextResult.ok ? contextResult.stdout.trim() : "",
    nodes,
    namespaces: [...namespaceMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    pods,
    services,
    deployments,
    error: errors.length > 0 ? errors.join(" | ") : undefined,
  };
}

function createMockSnapshot(): InfraSnapshot {
  return {
    collectedAt: new Date().toISOString(),
    mode: "mock",
    host: {
      hostname: "mock-ec2-node",
      platform: "linux",
      arch: "x64",
      uptimeSec: 86400,
    },
    toolStatus: {
      docker: true,
      kubectl: true,
      process: true,
    },
    deploymentSignals: {
      docker: {
        available: true,
        engineRunning: true,
        containers: [
          {
            id: "f3ae2cc0d3a1",
            name: "nginx-edge",
            image: "nginx:1.27",
            status: "Up 12 hours",
            ports: "0.0.0.0:80->80/tcp",
          },
        ],
        networks: [
          {
            id: "a1b2c3d4e5f6",
            name: "bridge",
            driver: "bridge",
            scope: "local",
          },
          {
            id: "f6e5d4c3b2a1",
            name: "infra-backbone",
            driver: "bridge",
            scope: "local",
          },
        ],
        volumes: [
          {
            name: "postgres-data",
            driver: "local",
            mountpoint: "/var/lib/docker/volumes/postgres-data/_data",
          },
          {
            name: "grafana-storage",
            driver: "local",
            mountpoint: "/var/lib/docker/volumes/grafana-storage/_data",
          },
        ],
      },
      process: {
        available: true,
        processes: [
          {
            pid: 24011,
            command: "java",
            args: "-jar /opt/apps/order-service.jar --spring.profiles.active=prod",
            processType: "java",
          },
          {
            pid: 24048,
            command: "node",
            args: "/srv/web/server.js",
            processType: "node",
          },
        ],
      },
      kubernetes: {
        available: true,
        context: "arn:aws:eks:ap-northeast-2:111111111111:cluster/prod-cluster",
        nodes: [
          {
            name: "ip-10-0-0-110.ap-northeast-2.compute.internal",
            status: "Ready",
            version: "v1.30.1-eks",
          },
        ],
        namespaces: [
          { name: "app", podCount: 3, serviceCount: 2, deploymentCount: 2 },
          { name: "observability", podCount: 4, serviceCount: 3, deploymentCount: 3 },
        ],
        pods: [
          {
            namespace: "app",
            name: "was-67d4f7d6d7-r8x2w",
            phase: "Running",
            node: "ip-10-0-0-110.ap-northeast-2.compute.internal",
            ready: "1/1",
            restartCount: 0,
            images: ["ghcr.io/demo/was:v1.3.2"],
            labels: {
              app: "was",
              "app.kubernetes.io/name": "was",
            },
          },
          {
            namespace: "app",
            name: "ws-6f94f5dbf8-lh5q8",
            phase: "Running",
            node: "ip-10-0-0-110.ap-northeast-2.compute.internal",
            ready: "1/1",
            restartCount: 1,
            images: ["ghcr.io/demo/ws:v1.3.2"],
            labels: {
              app: "ws",
              "app.kubernetes.io/name": "ws",
            },
          },
        ],
        services: [
          {
            namespace: "app",
            name: "was-svc",
            type: "ClusterIP",
            clusterIP: "10.43.18.102",
            ports: ["TCP:8080->8080"],
            selector: {
              app: "was",
            },
          },
          {
            namespace: "app",
            name: "ws-svc",
            type: "ClusterIP",
            clusterIP: "10.43.72.15",
            ports: ["TCP:80->3000"],
            selector: {
              app: "ws",
            },
          },
        ],
        deployments: [
          {
            namespace: "app",
            name: "was",
            replicas: 1,
            readyReplicas: 1,
            images: ["ghcr.io/demo/was:v1.3.2"],
            selector: {
              app: "was",
            },
          },
          {
            namespace: "app",
            name: "ws",
            replicas: 1,
            readyReplicas: 1,
            images: ["ghcr.io/demo/ws:v1.3.2"],
            selector: {
              app: "ws",
            },
          },
        ],
      },
    },
    warnings: ["mock 데이터가 표시됩니다. LIVE_CONNECTOR_VALIDATION=true 설정 시 실데이터 수집을 시도합니다."],
  };
}

async function collectInfraSnapshot(): Promise<InfraSnapshot> {
  const [docker, process, kubernetes] = await Promise.all([
    collectDockerSignals(),
    collectProcessSignals(),
    collectKubernetesSignals(),
  ]);

  const host = {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    uptimeSec: Math.round(os.uptime()),
  };

  const warnings: string[] = [];
  if (docker.error) warnings.push(`docker: ${docker.error}`);
  if (process.error) warnings.push(`process: ${process.error}`);
  if (kubernetes.error) warnings.push(`k8s: ${kubernetes.error}`);

  const hasLiveSignals =
    docker.available ||
    process.available ||
    kubernetes.available ||
    docker.containers.length > 0 ||
    docker.networks.length > 0 ||
    docker.volumes.length > 0 ||
    process.processes.length > 0 ||
    kubernetes.pods.length > 0;

  if (!hasLiveSignals && isMockDataMode()) {
    return createMockSnapshot();
  }

  return {
    collectedAt: new Date().toISOString(),
    mode: "live",
    host,
    toolStatus: {
      docker: docker.available,
      kubectl: kubernetes.available,
      process: process.available,
    },
    deploymentSignals: {
      docker,
      process,
      kubernetes,
    },
    warnings,
  };
}

function isSafeK8sIdentifier(value: string): boolean {
  return K8S_RESOURCE_NAME.test(value);
}

async function executeK8sAction(body: ActionBody) {
  const action = body.action;
  const name = body.name || "";
  const namespace = body.namespace || "";

  if (!action || !name || !namespace) {
    return fail("VALIDATION_ERROR", "action, namespace, name은 필수입니다.", 400);
  }

  if (!isSafeK8sIdentifier(name) || !isSafeK8sIdentifier(namespace)) {
    return fail("VALIDATION_ERROR", "name 또는 namespace 형식이 올바르지 않습니다.", 400);
  }

  if (isMockDataMode()) {
    return ok({
      executed: false,
      mode: "mock",
      action,
      namespace,
      name,
      message: "mock 모드에서는 작업이 실제 실행되지 않습니다.",
    });
  }

  const kubectlAvailable = await isBinaryAvailable("kubectl");
  if (!kubectlAvailable) {
    return fail("DEPENDENCY_MISSING", "kubectl CLI를 찾지 못했습니다.", 400);
  }

  let args: string[] = [];

  if (action === "deletePod") {
    args = ["delete", "pod", name, "-n", namespace, "--wait=false"];
  } else if (action === "deleteService") {
    args = ["delete", "service", name, "-n", namespace];
  } else if (action === "restartDeployment") {
    args = ["rollout", "restart", `deployment/${name}`, "-n", namespace];
  } else {
    return fail("VALIDATION_ERROR", "지원하지 않는 action 입니다.", 400);
  }

  const result = await runBinary("kubectl", args, 10000);
  if (!result.ok) {
    return fail(
      "ACTION_FAILED",
      result.stderr || result.error || "kubectl 명령 실행 실패",
      500,
    );
  }

  return ok({
    executed: true,
    mode: "live",
    action,
    namespace,
    name,
    command: result.command,
    output: splitLines(result.stdout),
  });
}

export async function GET(request: Request) {
  const auth = requireSession(request);
  if (!auth.ok && !isMockDataMode()) return auth.response;

  const snapshot = await collectInfraSnapshot();
  return ok(snapshot);
}

export async function POST(request: Request) {
  const auth = requireRole(request, ["system_admin", "company_admin"]);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as ActionBody;
  return executeK8sAction(body);
}
