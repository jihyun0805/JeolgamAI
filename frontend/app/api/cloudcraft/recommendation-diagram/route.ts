import { fail, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import {
  getAnalysisById,
  getIntegrations,
  getRecommendationsByAnalysis,
} from "@/lib/store";
import { isMockDataMode } from "@/lib/runtime-mode";

interface DiagramBody {
  analysisId?: string;
  recommendationId?: string;
}

interface DiagramNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

interface DiagramEdge {
  from: string;
  to: string;
}

function escapeXml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function toDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function renderDiagramSvg(params: {
  title: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  highlightNodeIds?: string[];
  accentColor?: string;
}): string {
  const { title, nodes, edges } = params;
  const accent = params.accentColor ?? "#2563eb";
  const highlights = new Set(params.highlightNodeIds ?? []);

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  const edgeSvg = edges
    .map((edge) => {
      const from = nodeMap.get(edge.from);
      const to = nodeMap.get(edge.to);
      if (!from || !to) return "";
      return `<line x1="${from.x + 110}" y1="${from.y + 24}" x2="${to.x}" y2="${to.y + 24}" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow)" />`;
    })
    .join("");

  const nodeSvg = nodes
    .map((node) => {
      const isHighlighted = highlights.has(node.id);
      return `<g>
  <rect x="${node.x}" y="${node.y}" width="220" height="48" rx="10" fill="${
    isHighlighted ? "#dbeafe" : "#f8fafc"
  }" stroke="${isHighlighted ? accent : "#cbd5e1"}" stroke-width="${isHighlighted ? 2.5 : 1.5}" />
  <text x="${node.x + 12}" y="${node.y + 29}" fill="#0f172a" font-size="13" font-family="Manrope, sans-serif" font-weight="${
    isHighlighted ? 800 : 600
  }">${escapeXml(node.label)}</text>
</g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8fbff"/>
      <stop offset="100%" stop-color="#eef4ff"/>
    </linearGradient>
    <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8"/>
    </marker>
  </defs>

  <rect x="0" y="0" width="960" height="540" fill="url(#bg)" />
  <rect x="24" y="24" width="912" height="492" rx="16" fill="white" stroke="#dbe3f0" />
  <text x="48" y="62" fill="#0f172a" font-size="24" font-family="Manrope, sans-serif" font-weight="800">${escapeXml(
    title,
  )}</text>
  <text x="48" y="88" fill="#64748b" font-size="13" font-family="Manrope, sans-serif">Cloudcraft-style Architecture View</text>

  ${edgeSvg}
  ${nodeSvg}
</svg>`;
}

function getAffectedNodeIdsByDomain(domain: string): string[] {
  switch (domain) {
    case "database":
      return ["rds-main"];
    case "storage":
      return ["s3-logs"];
    case "network":
      return ["nat-gw", "s3-logs"];
    case "eks":
      return ["ec2-api"];
    case "finops":
      return ["policy-engine", "ec2-api"];
    default:
      return ["ec2-api"];
  }
}

export async function POST(request: Request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as DiagramBody;

  if (!body.analysisId) {
    return fail("VALIDATION_ERROR", "analysisId는 필수입니다.", 400);
  }

  const analysis = getAnalysisById(body.analysisId);
  if (!analysis) {
    return fail("NOT_FOUND", `analysisId=${body.analysisId}를 찾을 수 없습니다.`, 404);
  }

  const hasAws = getIntegrations().some(
    (integration) => integration.type === "aws" && integration.status !== "failed",
  );

  if (!hasAws && !isMockDataMode()) {
    return fail(
      "CLOUDCRAFT_UNAVAILABLE",
      "AWS 연동이 없어 Cloudcraft 추천 다이어그램을 생성할 수 없습니다.",
      422,
    );
  }

  const recommendations = getRecommendationsByAnalysis(analysis.id);
  const selectedRecommendation =
    recommendations.find(
      (recommendation) => recommendation.id === body.recommendationId,
    ) ?? recommendations[0];

  const baseNodes: DiagramNode[] = [
    { id: "vpc", label: "Production VPC", x: 48, y: 156 },
    { id: "ec2-web", label: "EC2 Web Cluster", x: 320, y: 118 },
    { id: "ec2-api", label: "EC2 API Cluster", x: 320, y: 220 },
    { id: "rds-main", label: "RDS Primary", x: 616, y: 118 },
    { id: "s3-logs", label: "S3 Logs", x: 616, y: 220 },
  ];

  const baseEdges: DiagramEdge[] = [
    { from: "vpc", to: "ec2-web" },
    { from: "vpc", to: "ec2-api" },
    { from: "ec2-api", to: "rds-main" },
    { from: "ec2-api", to: "s3-logs" },
  ];

  const afterNodes = [...baseNodes];
  const afterEdges = [...baseEdges];

  if (selectedRecommendation?.domain === "storage") {
    const s3 = afterNodes.find((node) => node.id === "s3-logs");
    if (s3) s3.label = "S3 Logs (IA/Glacier Lifecycle)";
  }

  if (selectedRecommendation?.domain === "database") {
    const rds = afterNodes.find((node) => node.id === "rds-main");
    if (rds) rds.label = "RDS Primary (Reserved)";
  }

  if (selectedRecommendation?.domain === "compute") {
    const api = afterNodes.find((node) => node.id === "ec2-api");
    if (api) api.label = "EC2 API Cluster (Rightsized)";
  }

  if (selectedRecommendation?.domain === "network") {
    afterNodes.push({
      id: "nat-gw",
      label: "VPC Endpoint / NAT Offload",
      x: 616,
      y: 322,
    });
    afterEdges.push({ from: "ec2-api", to: "nat-gw" });
  }

  if (selectedRecommendation?.domain === "finops") {
    afterNodes.push({
      id: "policy-engine",
      label: "FinOps Policy Engine",
      x: 320,
      y: 322,
    });
    afterEdges.push({ from: "policy-engine", to: "ec2-api" });
  }

  const affectedNodeIds = getAffectedNodeIdsByDomain(
    selectedRecommendation?.domain ?? "compute",
  );

  const beforeSvg = renderDiagramSvg({
    title: "BEFORE Architecture",
    nodes: baseNodes,
    edges: baseEdges,
    highlightNodeIds: affectedNodeIds,
    accentColor: "#f59e0b",
  });

  const afterSvg = renderDiagramSvg({
    title: "AFTER Architecture",
    nodes: afterNodes,
    edges: afterEdges,
    highlightNodeIds: affectedNodeIds,
    accentColor: "#1c59f2",
  });

  return ok({
    diagramId: `cloudcraft-${analysis.id}`,
    summary: "현재 아키텍처와 추천 아키텍처 비교 다이어그램",
    beforeImageDataUrl: toDataUrl(beforeSvg),
    afterImageDataUrl: toDataUrl(afterSvg),
    selectedRecommendationId: selectedRecommendation?.id ?? null,
    selectedRecommendationTitle: selectedRecommendation?.title ?? null,
    nodes: baseNodes.map((node) => ({ id: node.id, label: node.label })),
    edges: baseEdges,
    recommendationMapping: recommendations.map((recommendation) => ({
      recommendationId: recommendation.id,
      recommendationTitle: recommendation.title,
      targetResource: recommendation.targetResource,
      affectedNodeIds: getAffectedNodeIdsByDomain(recommendation.domain),
    })),
  });
}
