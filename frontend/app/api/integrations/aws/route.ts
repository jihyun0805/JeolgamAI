import { fail, ok } from "@/lib/api-response";
import { requireBackendRole } from "@/lib/auth";
import { postBackendJson } from "@/lib/backend-client";
import { IntegrationConfig } from "@/lib/types";
import {
  addAuditEvent,
  addNotification,
  createId,
  maskSecret,
  nowIso,
  upsertIntegration,
} from "@/lib/store";

interface ValidationCheck {
  key: string;
  passed: boolean;
  message: string;
}

interface BackendAwsValidationResponse {
  mode: "live";
  status: "active" | "partial" | "failed";
  checks: ValidationCheck[];
}

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
  const auth = requireBackendRole(request, ["system_admin", "company_admin"]);
  if (!auth.ok) {
    if (auth.session) {
      addAuditEvent({
        actor: auth.session.userId,
        actorRole: auth.session.role,
        workspaceId: auth.session.workspaceId,
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

  if (body.region !== "ap-northeast-2") {
    return fail(
      "UNSUPPORTED_REGION",
      "현재 비용 분석은 AWS 서울 리전(ap-northeast-2)만 지원합니다.",
      400,
    );
  }

  const errors =
    authMode === "role" ? validateRoleConfig(body) : validateAccessKeyConfig(body);

  if (errors.length > 0) {
    return fail("VALIDATION_ERROR", errors.join(" "), 400);
  }

  let validation: BackendAwsValidationResponse;
  try {
    validation = await postBackendJson<BackendAwsValidationResponse>(
      "/api/integrations/aws/validate",
      {
        workspaceId: auth.session.workspaceId,
        authMode,
        region: body.region,
        roleArn: body.roleArn,
        externalId: body.externalId,
        accessKeyId: body.accessKeyId,
        secretAccessKey: body.secretAccessKey,
      },
      { accessToken: auth.session.backendAccessToken },
    );
  } catch (error) {
    return fail(
      "BACKEND_VALIDATION_FAILED",
      error instanceof Error ? error.message : "AWS backend 검증에 실패했습니다.",
      400,
    );
  }

  const now = nowIso();
  const integration: IntegrationConfig = {
    id: createId("int_aws"),
    type: "aws",
    name: body.name || "AWS Production",
    status: validation.status,
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
      validationMode: validation.mode,
      validation: validation.checks
        .map((item) => `${item.key}:${item.passed ? "ok" : "fail"}`)
        .join(", "),
    },
  };

  upsertIntegration(integration);
  addAuditEvent({
    actor: auth.session.userId,
    actorRole: auth.session.role,
    workspaceId: auth.session.workspaceId,
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
    body: `${integration.name} (${body.region}) · mode=${validation.mode}`,
  });

  return ok({
    integration,
    checks: validation.checks,
  });
}
