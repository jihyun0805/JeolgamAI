import {
  CostBreakdownItem,
  InfrastructureResource,
  Project,
} from "@/lib/types";

export const AWS_SEOUL_REGION = "ap-northeast-2";

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function seededNumber(seed: string, min: number, max: number, precision = 1) {
  const hash = hashString(seed);
  const ratio = (hash % 1000) / 1000;
  const value = min + (max - min) * ratio;
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function seededCost(seed: string, base: number, spread: number) {
  return Math.round(base + seededNumber(seed, -spread, spread, 0));
}

export function buildProjectResources(project: Pick<Project, "id" | "name" | "awsRegion">) {
  const region = project.awsRegion || AWS_SEOUL_REGION;
  const slug = project.name.replace(/\s+/g, "-").toUpperCase();

  const resources: InfrastructureResource[] = [
    {
      id: `${project.id}-ec2-web`,
      name: `${slug}-WEB-ASG`,
      type: "ec2.m7i.large",
      region,
      status: "running",
      cpuUsagePercent: seededNumber(`${project.id}:ec2-web:cpu`, 28, 68),
      memoryUsagePercent: seededNumber(`${project.id}:ec2-web:mem`, 38, 76),
      monthlyCost: seededCost(`${project.id}:ec2-web:cost`, 246000, 32000),
      riskLevel: "low",
    },
    {
      id: `${project.id}-ec2-api`,
      name: `${slug}-API-SERVICE`,
      type: "ec2.m7i.xlarge",
      region,
      status: "warning",
      cpuUsagePercent: seededNumber(`${project.id}:ec2-api:cpu`, 2, 14),
      memoryUsagePercent: seededNumber(`${project.id}:ec2-api:mem`, 12, 28),
      monthlyCost: seededCost(`${project.id}:ec2-api:cost`, 418000, 56000),
      riskLevel: "high",
    },
    {
      id: `${project.id}-rds`,
      name: `${slug}-AURORA-POSTGRES`,
      type: "rds.db.r6g.large",
      region,
      status: "available",
      cpuUsagePercent: seededNumber(`${project.id}:rds:cpu`, 34, 62),
      memoryUsagePercent: seededNumber(`${project.id}:rds:mem`, 58, 88),
      monthlyCost: seededCost(`${project.id}:rds:cost`, 623000, 74000),
      riskLevel: "medium",
    },
    {
      id: `${project.id}-s3`,
      name: `${slug}-LOG-ARCHIVE`,
      type: "s3.standard",
      region,
      status: "available",
      cpuUsagePercent: null,
      memoryUsagePercent: null,
      monthlyCost: seededCost(`${project.id}:s3:cost`, 148000, 18000),
      riskLevel: "medium",
    },
    {
      id: `${project.id}-nat`,
      name: `${slug}-NAT-GATEWAY`,
      type: "network.nat-gateway",
      region,
      status: "warning",
      cpuUsagePercent: null,
      memoryUsagePercent: null,
      monthlyCost: seededCost(`${project.id}:nat:cost`, 287000, 22000),
      riskLevel: "high",
    },
    {
      id: `${project.id}-ebs`,
      name: `${slug}-UNATTACHED-EBS`,
      type: "ebs.gp3.500gb",
      region,
      status: "unused",
      cpuUsagePercent: null,
      memoryUsagePercent: null,
      monthlyCost: seededCost(`${project.id}:ebs:cost`, 52000, 7000),
      riskLevel: "critical",
    },
    {
      id: `${project.id}-eks`,
      name: `${slug}-EKS-NODEGROUP`,
      type: "eks.mng.m6i.large",
      region,
      status: "running",
      cpuUsagePercent: seededNumber(`${project.id}:eks:cpu`, 22, 56),
      memoryUsagePercent: seededNumber(`${project.id}:eks:mem`, 32, 68),
      monthlyCost: seededCost(`${project.id}:eks:cost`, 472000, 44000),
      riskLevel: "medium",
    },
  ];

  return resources;
}

export function buildCostBreakdown(resources: InfrastructureResource[]): CostBreakdownItem[] {
  const byService = new Map<
    string,
    {
      usageType: string;
      region: string;
      monthlyCost: number;
      resourceCount: number;
    }
  >();

  for (const resource of resources) {
    const key =
      resource.type.startsWith("ec2")
        ? "Amazon EC2"
        : resource.type.startsWith("rds")
          ? "Amazon RDS"
          : resource.type.startsWith("s3")
            ? "Amazon S3"
            : resource.type.startsWith("network.nat")
              ? "AWS NAT Gateway"
              : resource.type.startsWith("eks")
                ? "Amazon EKS"
                : "Amazon EBS";

    const usageType =
      key === "Amazon EC2"
        ? "On-Demand Instance Usage"
        : key === "Amazon RDS"
          ? "Aurora Provisioned"
          : key === "Amazon S3"
            ? "Standard Storage"
            : key === "AWS NAT Gateway"
              ? "Regional Data Processing"
              : key === "Amazon EKS"
                ? "Managed Node Group"
                : "General Purpose SSD";

    const current = byService.get(key) ?? {
      usageType,
      region: resource.region ?? AWS_SEOUL_REGION,
      monthlyCost: 0,
      resourceCount: 0,
    };

    current.monthlyCost += resource.monthlyCost;
    current.resourceCount += 1;
    byService.set(key, current);
  }

  return [...byService.entries()]
    .map(([service, data]) => ({
      service,
      usageType: data.usageType,
      region: data.region,
      monthlyCost: Math.round(data.monthlyCost),
      resourceCount: data.resourceCount,
    }))
    .sort((left, right) => right.monthlyCost - left.monthlyCost);
}

export function buildPrometheusOverview(project: Pick<Project, "id" | "name">) {
  const baseLatency = seededNumber(`${project.id}:latency`, 62, 110, 1);
  const baseCpu = seededNumber(`${project.id}:cpu`, 34, 72, 1);
  const baseMemory = seededNumber(`${project.id}:memory`, 42, 81, 1);
  const baseErrorRate = seededNumber(`${project.id}:error`, 0.1, 1.7, 2);

  const labels = ["00h", "04h", "08h", "12h", "16h", "20h", "24h"];
  const createSeries = (seed: string, base: number, range: number, precision = 1) =>
    labels.map((label, index) => ({
      label,
      value: Math.max(
        0,
        Math.round(
          (base +
            seededNumber(`${project.id}:${seed}:${index}`, -range, range, precision)) *
            10,
        ) / 10,
      ),
    }));

  return {
    projectId: project.id,
    projectName: project.name,
    labels,
    summary: {
      cpuUsagePercent: baseCpu,
      memoryUsagePercent: baseMemory,
      p95LatencyMs: baseLatency,
      errorRatePercent: baseErrorRate,
      scrapeHealthPercent: seededNumber(`${project.id}:scrape-health`, 96, 100, 1),
    },
    series: {
      cpuUsage: createSeries("cpu-series", baseCpu, 11),
      memoryUsage: createSeries("memory-series", baseMemory, 10),
      latencyMs: createSeries("latency-series", baseLatency, 18),
      errorRatePercent: createSeries("error-series", baseErrorRate, 0.6, 2),
    },
  };
}
