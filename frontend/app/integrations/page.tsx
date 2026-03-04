"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import MainSidebar from "@/app/components/main-sidebar";
import PageTopBar from "@/app/components/page-top-bar";

type IntegrationStatus = "active" | "partial" | "failed";

type IntegrationType = "aws" | "k8s" | "prometheus";

interface IntegrationConfig {
  id: string;
  type: IntegrationType;
  name: string;
  status: IntegrationStatus;
  validatedAt: string;
  meta: Record<string, string>;
}

interface IntegrationsResponse {
  workspaceId: string;
  integrations: IntegrationConfig[];
  coverage: {
    aws: boolean;
    k8s: boolean;
    prometheus: boolean;
  };
}

interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

const statusClassMap: Record<IntegrationStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  partial: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  failed: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

function IntegrationCard({
  title,
  status,
  subtitle,
}: {
  title: string;
  status?: IntegrationStatus;
  subtitle: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#161B22]">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold">{title}</h3>
        {status ? (
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusClassMap[status]}`}
          >
            {status}
          </span>
        ) : (
          <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase dark:border-slate-700">
            not connected
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  );
}

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(false);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [lastAnalysisId, setLastAnalysisId] = useState<string>("");
  const [data, setData] = useState<IntegrationsResponse | null>(null);

  const [awsForm, setAwsForm] = useState({
    name: "AWS Production",
    authMode: "role",
    roleArn: "",
    externalId: "",
    accessKeyId: "",
    secretAccessKey: "",
    region: "ap-northeast-2",
  });

  const [k8sForm, setK8sForm] = useState({
    name: "EKS Prod",
    clusterName: "prod-cluster",
    apiServerUrl: "",
    token: "",
  });

  const [promForm, setPromForm] = useState({
    name: "Prometheus",
    baseUrl: "",
    token: "",
    includeLatency: true,
  });

  const integrationsByType = useMemo(() => {
    const map = new Map<IntegrationType, IntegrationConfig>();
    data?.integrations.forEach((integration) => {
      map.set(integration.type, integration);
    });
    return map;
  }, [data]);

  async function loadIntegrations() {
    const response = await fetch("/api/integrations", { cache: "no-store" });
    const payload = (await response.json()) as ApiEnvelope<IntegrationsResponse>;

    if (!payload.ok || !payload.data) {
      throw new Error(payload.error?.message ?? "연동 상태를 불러오지 못했습니다.");
    }

    setData(payload.data);
  }

  useEffect(() => {
    loadIntegrations().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    });
  }, []);

  async function submitForm(endpoint: string, body: object, successMessage: string) {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as ApiEnvelope<unknown>;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message ?? "요청 처리에 실패했습니다.");
      }

      setMessage(successMessage);
      await loadIntegrations();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitAws(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const body =
      awsForm.authMode === "role"
        ? {
            name: awsForm.name,
            authMode: "role",
            roleArn: awsForm.roleArn,
            externalId: awsForm.externalId,
            region: awsForm.region,
          }
        : {
            name: awsForm.name,
            authMode: "access_key",
            accessKeyId: awsForm.accessKeyId,
            secretAccessKey: awsForm.secretAccessKey,
            region: awsForm.region,
          };

    await submitForm("/api/integrations/aws", body, "AWS 연동이 저장되었습니다.");
  }

  async function onSubmitK8s(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitForm(
      "/api/integrations/k8s",
      {
        name: k8sForm.name,
        clusterName: k8sForm.clusterName,
        apiServerUrl: k8sForm.apiServerUrl,
        token: k8sForm.token,
      },
      "Kubernetes 연동이 저장되었습니다.",
    );
  }

  async function onSubmitPrometheus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const enabledQueries = promForm.includeLatency
      ? ["cpu_usage", "memory_usage", "error_rate", "latency"]
      : ["cpu_usage", "memory_usage", "error_rate"];

    await submitForm(
      "/api/integrations/prometheus",
      {
        name: promForm.name,
        baseUrl: promForm.baseUrl,
        token: promForm.token,
        enabledQueries,
      },
      "Prometheus 연동이 저장되었습니다.",
    );
  }

  async function runAnalysis() {
    setRunningAnalysis(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/analysis/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lookbackDays: 30, triggeredBy: "manual" }),
      });

      const payload = (await response.json()) as ApiEnvelope<{ id: string }>;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "분석 실행에 실패했습니다.");
      }

      setLastAnalysisId(payload.data.id);
      setMessage("샘플 분석이 완료되었습니다. 대시보드에서 결과를 확인하세요.");
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : String(runError));
    } finally {
      setRunningAnalysis(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8] text-slate-900 dark:bg-[#0B0E14] dark:text-slate-100">
      <MainSidebar active="integrations" />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageTopBar
          title="데이터 연동 설정"
          description="AWS / Kubernetes / Prometheus 연동 후 분석을 실행하세요."
          actions={
            <>
              <Link
                href="/dashboard"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                대시보드
              </Link>
              <Link
                href="/analysis/infrastructure"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                인프라 분석
              </Link>
              <button
                onClick={runAnalysis}
                disabled={runningAnalysis}
                className="rounded-lg bg-[#1c59f2] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1c59f2]/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {runningAnalysis ? "분석 실행 중..." : "샘플 분석 실행"}
              </button>
            </>
          }
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-6 xl:grid-cols-3">
            <section className="space-y-6 xl:col-span-2">
          <form
            onSubmit={onSubmitAws}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">AWS 연동</h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                IAM Role 권장
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">
                연동 이름
                <input
                  value={awsForm.name}
                  onChange={(event) =>
                    setAwsForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </label>

              <label className="text-sm font-medium">
                리전
                <input
                  value={awsForm.region}
                  onChange={(event) =>
                    setAwsForm((prev) => ({ ...prev, region: event.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </label>

              <label className="text-sm font-medium md:col-span-2">
                인증 방식
                <select
                  value={awsForm.authMode}
                  onChange={(event) =>
                    setAwsForm((prev) => ({
                      ...prev,
                      authMode: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="role">Cross-account IAM Role</option>
                  <option value="access_key">Access Key (fallback)</option>
                </select>
              </label>

              {awsForm.authMode === "role" ? (
                <>
                  <label className="text-sm font-medium md:col-span-2">
                    Role ARN
                    <input
                      value={awsForm.roleArn}
                      onChange={(event) =>
                        setAwsForm((prev) => ({ ...prev, roleArn: event.target.value }))
                      }
                      placeholder="arn:aws:iam::123456789012:role/JeolgamReadOnlyRole"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <label className="text-sm font-medium md:col-span-2">
                    External ID
                    <input
                      value={awsForm.externalId}
                      onChange={(event) =>
                        setAwsForm((prev) => ({ ...prev, externalId: event.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="text-sm font-medium">
                    Access Key ID
                    <input
                      value={awsForm.accessKeyId}
                      onChange={(event) =>
                        setAwsForm((prev) => ({
                          ...prev,
                          accessKeyId: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Secret Access Key
                    <input
                      type="password"
                      value={awsForm.secretAccessKey}
                      onChange={(event) =>
                        setAwsForm((prev) => ({
                          ...prev,
                          secretAccessKey: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                </>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-[#1c59f2] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1c59f2]/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                AWS 검증 및 저장
              </button>
            </div>
          </form>

          <form
            onSubmit={onSubmitK8s}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]"
          >
            <h2 className="mb-4 text-lg font-bold">Kubernetes 연동</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">
                연동 이름
                <input
                  value={k8sForm.name}
                  onChange={(event) =>
                    setK8sForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </label>

              <label className="text-sm font-medium">
                클러스터 이름
                <input
                  value={k8sForm.clusterName}
                  onChange={(event) =>
                    setK8sForm((prev) => ({ ...prev, clusterName: event.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </label>

              <label className="text-sm font-medium md:col-span-2">
                API Server URL
                <input
                  value={k8sForm.apiServerUrl}
                  onChange={(event) =>
                    setK8sForm((prev) => ({ ...prev, apiServerUrl: event.target.value }))
                  }
                  placeholder="https://xxxx.gr7.ap-northeast-2.eks.amazonaws.com"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </label>

              <label className="text-sm font-medium md:col-span-2">
                Read-only Token
                <input
                  value={k8sForm.token}
                  onChange={(event) =>
                    setK8sForm((prev) => ({ ...prev, token: event.target.value }))
                  }
                  type="password"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-[#1c59f2] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1c59f2]/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                K8s 검증 및 저장
              </button>
            </div>
          </form>

          <form
            onSubmit={onSubmitPrometheus}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]"
          >
            <h2 className="mb-4 text-lg font-bold">Prometheus 연동</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">
                연동 이름
                <input
                  value={promForm.name}
                  onChange={(event) =>
                    setPromForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </label>

              <label className="text-sm font-medium">
                Base URL
                <input
                  value={promForm.baseUrl}
                  onChange={(event) =>
                    setPromForm((prev) => ({ ...prev, baseUrl: event.target.value }))
                  }
                  placeholder="https://prometheus.example.com"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </label>

              <label className="text-sm font-medium md:col-span-2">
                API Token
                <input
                  value={promForm.token}
                  onChange={(event) =>
                    setPromForm((prev) => ({ ...prev, token: event.target.value }))
                  }
                  type="password"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </label>

              <label className="flex items-center gap-2 text-sm font-medium md:col-span-2">
                <input
                  type="checkbox"
                  checked={promForm.includeLatency}
                  onChange={(event) =>
                    setPromForm((prev) => ({
                      ...prev,
                      includeLatency: event.target.checked,
                    }))
                  }
                />
                latency 쿼리 포함 (해제 시 partial 상태 검증)
              </label>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-[#1c59f2] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1c59f2]/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Prometheus 검증 및 저장
              </button>
            </div>
          </form>
            </section>

            <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
              연결 상태
            </h3>
            <div className="space-y-3">
              <IntegrationCard
                title="AWS"
                subtitle="Cost Explorer / EC2 / RDS / S3"
                status={integrationsByType.get("aws")?.status}
              />
              <IntegrationCard
                title="Kubernetes"
                subtitle="nodes / pods / requests / limits"
                status={integrationsByType.get("k8s")?.status}
              />
              <IntegrationCard
                title="Prometheus"
                subtitle="CPU / Memory / Error / Latency"
                status={integrationsByType.get("prometheus")?.status}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
              다음 단계
            </h3>
            <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>1. 연동 검증을 완료합니다.</li>
              <li>2. 샘플 분석을 실행합니다.</li>
              <li>3. 대시보드에서 점수와 권고를 검토합니다.</li>
              <li>4. 실행 가이드에서 승인/적용을 진행합니다.</li>
            </ol>

            {lastAnalysisId ? (
              <div className="mt-4 rounded-lg border border-[#1c59f2]/30 bg-[#1c59f2]/10 p-3 text-xs text-[#1c59f2]">
                최근 분석 ID: <span className="font-bold">{lastAnalysisId}</span>
              </div>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                href="/dashboard"
                className="rounded-lg bg-[#1c59f2] px-3 py-2 text-center text-xs font-bold text-white hover:bg-[#1c59f2]/90"
              >
                대시보드
              </Link>
              <Link
                href="/ai-optimization"
                className="rounded-lg border border-slate-300 px-3 py-2 text-center text-xs font-bold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                AI 최적화
              </Link>
            </div>
          </div>

          {message ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-400">
              {error}
            </div>
          ) : null}
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
