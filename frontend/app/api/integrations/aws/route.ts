import { fail, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { validateAwsLive } from "@/lib/integration-validators";
import { IntegrationConfig } from "@/lib/types";
import {
  addAuditEvent,
  addNotification,
  createId,
  maskSecret,
  nowIso,
  upsertIntegration,
} from "@/lib/store";

type AwsAuthMode = "role" | "access_key";

interface AwsIntegrationBody {
  name?: string;
  authMode?: AwsAuthMode;
  roleArn?: string;
  externalId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
}

function validateRoleConfig(body: AwsIntegrationBody): string[] {
  const errors: string[] = [];

  if (!body.roleArn) errors.push("roleArn은 필수입니다.");
  if (body.roleArn && !body.roleArn.startsWith("arn:aws:iam::")) {
    errors.push("roleArn 형식이 올바르지 않습니다.");
  }

  return errors;
}

function validateAccessKeyConfig(body: AwsIntegrationBody): string[] {
  const errors: string[] = [];

  if (!body.accessKeyId) errors.push("accessKeyId는 필수입니다.");
  if (!body.secretAccessKey) errors.push("secretAccessKey는 필수입니다.");

  if (body.accessKeyId && !body.accessKeyId.startsWith("AKIA")) {
    errors.push("accessKeyId 형식이 올바르지 않습니다.");
  }

  return errors;
}

export async function POST(request: Request) {
  const auth = requireRole(request, ["system_admin", "company_admin"]);
  if (!auth.ok) {
    if (auth.session) {
      addAuditEvent({
        actor: auth.session.userId,
        actorRole: auth.session.role,
        action: "integration.create",
        targetType: "integration",
        targetId: "aws",
        result: "forbidden",
      });
    }
    return auth.response;
  }

  const body = (await request.json()) as AwsIntegrationBody;
  const authMode = body.authMode ?? "role";

  if (!body.region) {
    return fail("VALIDATION_ERROR", "region은 필수입니다.", 400);
  }

  const errors =
    authMode === "role" ? validateRoleConfig(body) : validateAccessKeyConfig(body);

  if (errors.length > 0) {
    return fail("VALIDATION_ERROR", errors.join(" "), 400);
  }

  const now = nowIso();
  const liveValidation = await validateAwsLive({
    authMode,
    region: body.region,
    roleArn: body.roleArn,
    externalId: body.externalId,
    accessKeyId: body.accessKeyId,
    secretAccessKey: body.secretAccessKey,
  });

  const checks =
    liveValidation?.checks ?? [
      { key: "sts_assume_role", passed: true, message: "mock validation" },
      { key: "cost_explorer_read", passed: true, message: "mock validation" },
      { key: "ec2_read", passed: true, message: "mock validation" },
      { key: "rds_read", passed: true, message: "mock validation" },
      { key: "s3_read", passed: true, message: "mock validation" },
    ];

  const status = liveValidation?.status ?? "active";
  const integration: IntegrationConfig = {
    id: createId("int_aws"),
    type: "aws",
    name: body.name || "AWS Production",
    status,
    workspaceId: auth.session.workspaceId,
    connectedAt: now,
    validatedAt: now,
    meta: {
      authMode,
      region: body.region,
      roleArn: body.roleArn ?? "",
      externalId: body.externalId ? maskSecret(body.externalId) : "",
      accessKeyId: body.accessKeyId ? maskSecret(body.accessKeyId) : "",
      secretAccessKey: body.secretAccessKey
        ? maskSecret(body.secretAccessKey)
        : "",
      validationMode: liveValidation?.mode ?? "mock",
      validation: checks
        .map((item) => `${item.key}:${item.passed ? "ok" : "fail"}`)
        .join(", "),
    },
  };

  upsertIntegration(integration);
  addAuditEvent({
    actor: auth.session.userId,
    actorRole: auth.session.role,
    action: "integration.create",
    targetType: "integration",
    targetId: integration.id,
    result: "success",
    metadata: {
      provider: "aws",
      authMode,
    },
  });

  addNotification({
    workspaceId: integration.workspaceId,
    severity:
      integration.status === "active"
        ? "info"
        : integration.status === "partial"
          ? "warning"
          : "critical",
    title:
      integration.status === "active"
        ? "AWS 연동이 완료되었습니다"
        : integration.status === "partial"
          ? "AWS 연동이 부분 완료되었습니다"
          : "AWS 연동 검증에 실패했습니다",
    body: `${integration.name} (${body.region}) · mode=${liveValidation?.mode ?? "mock"}`,
  });

  return ok({
    integration,
    checks,
  });
}
