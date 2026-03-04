import {
  CostExplorerClient,
  GetCostAndUsageCommand,
} from "@aws-sdk/client-cost-explorer";
import { DescribeRegionsCommand, EC2Client } from "@aws-sdk/client-ec2";
import { DescribeDBInstancesCommand, RDSClient } from "@aws-sdk/client-rds";
import { ListBucketsCommand, S3Client } from "@aws-sdk/client-s3";
import {
  AssumeRoleCommand,
  GetCallerIdentityCommand,
  STSClient,
} from "@aws-sdk/client-sts";
import { isLiveConnectorValidationEnabled } from "@/lib/runtime-mode";

export type ValidationStatus = "active" | "partial" | "failed";

export interface ValidationCheck {
  key: string;
  passed: boolean;
  message: string;
}

export interface ValidationResult {
  mode: "live" | "mock";
  status: ValidationStatus;
  checks: ValidationCheck[];
}

interface AwsValidationInput {
  authMode: "role" | "access_key";
  region: string;
  roleArn?: string;
  externalId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

interface K8sValidationInput {
  apiServerUrl: string;
  token: string;
}

interface PromValidationInput {
  baseUrl: string;
  token: string;
  requiredQueries: string[];
}

const DEFAULT_TIMEOUT_MS = 8000;

function withTimeout(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    done: () => clearTimeout(timer),
  };
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function validateAwsLive(
  input: AwsValidationInput,
): Promise<ValidationResult | null> {
  if (!isLiveConnectorValidationEnabled()) return null;

  const checks: ValidationCheck[] = [];

  try {
    let credentials:
      | {
          accessKeyId: string;
          secretAccessKey: string;
          sessionToken?: string;
        }
      | undefined;

    if (input.authMode === "access_key") {
      const sts = new STSClient({
        region: input.region,
        credentials: {
          accessKeyId: input.accessKeyId || "",
          secretAccessKey: input.secretAccessKey || "",
        },
      });

      await sts.send(new GetCallerIdentityCommand({}));
      checks.push({
        key: "sts_identity",
        passed: true,
        message: "GetCallerIdentity 성공",
      });

      credentials = {
        accessKeyId: input.accessKeyId || "",
        secretAccessKey: input.secretAccessKey || "",
      };
    } else {
      const sts = new STSClient({ region: input.region });
      const assumed = await sts.send(
        new AssumeRoleCommand({
          RoleArn: input.roleArn,
          RoleSessionName: "jeolgamai-validation",
          ExternalId: input.externalId,
          DurationSeconds: 900,
        }),
      );

      if (!assumed.Credentials) {
        throw new Error("AssumeRole은 성공했지만 임시 자격증명을 받지 못했습니다.");
      }

      checks.push({
        key: "sts_assume_role",
        passed: true,
        message: "AssumeRole 성공",
      });

      credentials = {
        accessKeyId: assumed.Credentials.AccessKeyId || "",
        secretAccessKey: assumed.Credentials.SecretAccessKey || "",
        sessionToken: assumed.Credentials.SessionToken,
      };
    }

    const costClient = new CostExplorerClient({
      region: "us-east-1",
      credentials,
    });
    const ec2Client = new EC2Client({ region: input.region, credentials });
    const rdsClient = new RDSClient({ region: input.region, credentials });
    const s3Client = new S3Client({ region: input.region, credentials });

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const serviceChecks: Array<Promise<ValidationCheck>> = [
      costClient
        .send(
          new GetCostAndUsageCommand({
            TimePeriod: {
              Start: yesterday.toISOString().slice(0, 10),
              End: now.toISOString().slice(0, 10),
            },
            Granularity: "DAILY",
            Metrics: ["UnblendedCost"],
          }),
        )
        .then(() => ({
          key: "cost_explorer_read",
          passed: true,
          message: "Cost Explorer 조회 성공",
        }))
        .catch((error: unknown) => ({
          key: "cost_explorer_read",
          passed: false,
          message: safeErrorMessage(error),
        })),
      ec2Client
        .send(new DescribeRegionsCommand({ AllRegions: false }))
        .then(() => ({
          key: "ec2_read",
          passed: true,
          message: "EC2 DescribeRegions 성공",
        }))
        .catch((error: unknown) => ({
          key: "ec2_read",
          passed: false,
          message: safeErrorMessage(error),
        })),
      rdsClient
        .send(new DescribeDBInstancesCommand({ MaxRecords: 20 }))
        .then(() => ({
          key: "rds_read",
          passed: true,
          message: "RDS DescribeDBInstances 성공",
        }))
        .catch((error: unknown) => ({
          key: "rds_read",
          passed: false,
          message: safeErrorMessage(error),
        })),
      s3Client
        .send(new ListBucketsCommand({}))
        .then(() => ({
          key: "s3_read",
          passed: true,
          message: "S3 ListBuckets 성공",
        }))
        .catch((error: unknown) => ({
          key: "s3_read",
          passed: false,
          message: safeErrorMessage(error),
        })),
    ];

    const results = await Promise.all(serviceChecks);
    checks.push(...results);

    const passedCount = checks.filter((item) => item.passed).length;
    const status: ValidationStatus =
      passedCount === checks.length
        ? "active"
        : passedCount >= 3
          ? "partial"
          : "failed";

    return {
      mode: "live",
      status,
      checks,
    };
  } catch (error) {
    checks.push({
      key: input.authMode === "role" ? "sts_assume_role" : "sts_identity",
      passed: false,
      message: safeErrorMessage(error),
    });

    return {
      mode: "live",
      status: "failed",
      checks,
    };
  }
}

export async function validateK8sLive(
  input: K8sValidationInput,
): Promise<ValidationResult | null> {
  if (!isLiveConnectorValidationEnabled()) return null;

  const checks: ValidationCheck[] = [];
  const endpoints = [
    { key: "cluster_api", path: "/api" },
    { key: "nodes_list", path: "/api/v1/nodes?limit=1" },
    { key: "namespaces_list", path: "/api/v1/namespaces?limit=1" },
    { key: "pods_list", path: "/api/v1/pods?limit=1" },
  ];

  for (const endpoint of endpoints) {
    const { signal, done } = withTimeout(DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${input.apiServerUrl.replace(/\/$/, "")}${endpoint.path}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${input.token}`,
            Accept: "application/json",
          },
          signal,
        },
      );

      if (response.ok) {
        checks.push({
          key: endpoint.key,
          passed: true,
          message: `${endpoint.path} 조회 성공`,
        });
      } else {
        checks.push({
          key: endpoint.key,
          passed: false,
          message: `${endpoint.path} 응답코드 ${response.status}`,
        });
      }
    } catch (error) {
      checks.push({
        key: endpoint.key,
        passed: false,
        message: safeErrorMessage(error),
      });
    } finally {
      done();
    }
  }

  const passedCount = checks.filter((item) => item.passed).length;
  const status: ValidationStatus =
    passedCount === checks.length
      ? "active"
      : passedCount >= 2
        ? "partial"
        : "failed";

  return {
    mode: "live",
    status,
    checks,
  };
}

export async function validatePrometheusLive(
  input: PromValidationInput,
): Promise<ValidationResult | null> {
  if (!isLiveConnectorValidationEnabled()) return null;

  const checks: ValidationCheck[] = [];

  const queryMap: Record<string, string> = {
    cpu_usage: "sum(rate(container_cpu_usage_seconds_total[5m]))",
    memory_usage: "sum(container_memory_working_set_bytes)",
    error_rate: "sum(rate(http_requests_total{status=~\"5..\"}[5m]))",
    latency: "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
  };

  for (const key of input.requiredQueries) {
    const query = queryMap[key] ?? "up";
    const url = `${input.baseUrl.replace(/\/$/, "")}/api/v1/query?query=${encodeURIComponent(query)}`;
    const { signal, done } = withTimeout(DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${input.token}`,
          Accept: "application/json",
        },
        signal,
      });

      if (!response.ok) {
        checks.push({
          key,
          passed: false,
          message: `응답코드 ${response.status}`,
        });
        continue;
      }

      const payload = (await response.json()) as { status?: string };
      checks.push({
        key,
        passed: payload.status === "success",
        message:
          payload.status === "success"
            ? "쿼리 성공"
            : `응답 status=${payload.status ?? "unknown"}`,
      });
    } catch (error) {
      checks.push({
        key,
        passed: false,
        message: safeErrorMessage(error),
      });
    } finally {
      done();
    }
  }

  const passedCount = checks.filter((item) => item.passed).length;
  const status: ValidationStatus =
    passedCount === checks.length
      ? "active"
      : passedCount >= 2
        ? "partial"
        : "failed";

  return {
    mode: "live",
    status,
    checks,
  };
}
