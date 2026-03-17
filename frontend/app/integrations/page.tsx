"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
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
  backendRegistered?: boolean;
  meta: Record<string, string>;
}

interface IntegrationsResponse {
  workspaceId: string;
  integrations: IntegrationConfig[];
  localCoverage: { aws: boolean; k8s: boolean; prometheus: boolean };
  backendCoverage: { aws: boolean; k8s: boolean; prometheus: boolean };
  coverage: { aws: boolean; k8s: boolean; prometheus: boolean };
  warnings?: string[];
}

interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

/* ─── shared input style ────────────────────────────────────────────────── */
const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-[#1c59f2] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-[#0B0E14] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-[#1c59f2] dark:focus:bg-[#111824]";
const textareaCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-xs text-slate-800 placeholder:text-slate-400 transition focus:border-[#1c59f2] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-[#0B0E14] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-[#1c59f2] dark:focus:bg-[#111824]";

/* ─── field wrapper ─────────────────────────────────────────────────────── */
function Field({
  label,
  hint,
  span2,
  children,
}: {
  label: string;
  hint?: ReactNode;
  span2?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={span2 ? "md:col-span-2" : undefined}>
      <p className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      {children}
      {hint ? (
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400 dark:text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

/* ─── auth mode tab ─────────────────────────────────────────────────────── */
function AuthTab({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-[#0B0E14]">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            value === opt.value
              ? "bg-white text-slate-900 shadow-sm dark:bg-[#161B22] dark:text-slate-100"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ─── status badge ──────────────────────────────────────────────────────── */
function StatusBadge({
  status,
  backendRegistered,
}: {
  status?: IntegrationStatus;
  backendRegistered?: boolean;
}) {
  if (backendRegistered === false) {
    return (
      <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-bold uppercase text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
        connector 필요
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        연동됨
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        부분 연동
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-bold uppercase text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        실패
      </span>
    );
  }
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-400 dark:border-slate-700 dark:bg-[#0B0E14] dark:text-slate-500">
      미연동
    </span>
  );
}

/* ─── integration icon ──────────────────────────────────────────────────── */
function IntegrationIcon({ type }: { type: "aws" | "k8s" | "prometheus" }) {
  const baseProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-5 w-5",
    "aria-hidden": true,
  };

  if (type === "aws") {
    return (
      <svg {...baseProps}>
        <path d="M7 18.5h9.5a3.5 3.5 0 1 0-.5-7 5 5 0 0 0-9.7-1.3A3.8 3.8 0 0 0 7 18.5Z" />
      </svg>
    );
  }
  if (type === "k8s") {
    return (
      <svg {...baseProps}>
        <path d="M12 4 5 8v8l7 4 7-4V8l-7-4Z" />
        <path d="m5 8 7 4 7-4" />
        <path d="M12 12v8" />
      </svg>
    );
  }
  return (
    <svg {...baseProps}>
      <path d="M4 18V6" />
      <path d="M10 18v-7" />
      <path d="M16 18v-4" />
      <path d="M22 18V8" />
      <path d="m4 12 6-3 6 2 6-4" />
    </svg>
  );
}

/* ─── form section card ─────────────────────────────────────────────────── */
function FormCard({
  type,
  title,
  tagline,
  status,
  backendRegistered,
  iconColor,
  onSubmit,
  loading,
  submitLabel,
  children,
}: {
  type: "aws" | "k8s" | "prometheus";
  title: string;
  tagline: string;
  status?: IntegrationStatus;
  backendRegistered?: boolean;
  iconColor: string;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  submitLabel: string;
  children: ReactNode;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#161B22]"
    >
      {/* card header */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${iconColor}`}
          >
            <IntegrationIcon type={type} />
          </div>
          <div>
            <h2 className="font-black tracking-tight">{title}</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">{tagline}</p>
          </div>
        </div>
        <StatusBadge status={status} backendRegistered={backendRegistered} />
      </div>

      {/* fields */}
      <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">{children}</div>

      {/* footer */}
      <div className="flex items-center justify-end border-t border-slate-200 px-6 py-4 dark:border-slate-800">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-[#1c59f2] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#194fd8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "처리 중…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

/* ─── page ──────────────────────────────────────────────────────────────── */
export default function IntegrationsPage() {
  const [loading, setLoading] = useState(false);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
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
    caCertPem: "",
  });

  const [promForm, setPromForm] = useState({
    name: "Prometheus",
    baseUrl: "",
    authMode: "basic",
    username: "",
    password: "",
    token: "",
  });

  const integrationsByType = useMemo(() => {
    const map = new Map<IntegrationType, IntegrationConfig>();
    data?.integrations.forEach((i) => map.set(i.type, i));
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
    loadIntegrations().catch((e) => setError(e instanceof Error ? e.message : String(e)));
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
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitAws(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body =
      awsForm.authMode === "role"
        ? { name: awsForm.name, authMode: "role", roleArn: awsForm.roleArn, externalId: awsForm.externalId, region: awsForm.region }
        : { name: awsForm.name, authMode: "access_key", accessKeyId: awsForm.accessKeyId, secretAccessKey: awsForm.secretAccessKey, region: awsForm.region };
    await submitForm("/api/integrations/aws", body, "AWS 연동이 저장되었습니다.");
  }

  async function onSubmitK8s(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitForm(
      "/api/integrations/k8s",
      { name: k8sForm.name, clusterName: k8sForm.clusterName, apiServerUrl: k8sForm.apiServerUrl, token: k8sForm.token, caCertPem: k8sForm.caCertPem },
      "Kubernetes 연동이 저장되었습니다.",
    );
  }

  async function onSubmitPrometheus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitForm(
      "/api/integrations/prometheus",
      { name: promForm.name, baseUrl: promForm.baseUrl, authMode: promForm.authMode, username: promForm.username, password: promForm.password, token: promForm.token },
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
      setMessage("분석이 완료되었습니다. 대시보드에서 결과를 확인하세요.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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
          description="AWS · Kubernetes · Prometheus를 연동하고 비용 분석을 시작하세요."
          actions={
            <button
              onClick={runAnalysis}
              disabled={runningAnalysis}
              className="rounded-xl bg-[#1c59f2] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#194fd8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runningAnalysis ? "분석 중…" : "샘플 분석 실행"}
            </button>
          }
        />

        <main className="flex min-h-0 flex-1 overflow-y-auto p-4 md:p-8">
          <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">

            {/* ── left: forms ── */}
            <div className="space-y-6">

              {/* AWS */}
              <FormCard
                type="aws"
                title="AWS"
                tagline="Cost Explorer · EC2 · RDS · S3"
                status={integrationsByType.get("aws")?.status}
                backendRegistered={integrationsByType.get("aws")?.backendRegistered}
                iconColor="border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
                onSubmit={onSubmitAws}
                loading={loading}
                submitLabel="AWS 검증 및 저장"
              >
                <Field label="연동 이름">
                  <input
                    value={awsForm.name}
                    onChange={(e) => setAwsForm((p) => ({ ...p, name: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="리전">
                  <input
                    value={awsForm.region}
                    onChange={(e) => setAwsForm((p) => ({ ...p, region: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="인증 방식" span2>
                  <AuthTab
                    options={[
                      { value: "role", label: "Cross-account IAM Role (권장)" },
                      { value: "access_key", label: "Access Key" },
                    ]}
                    value={awsForm.authMode}
                    onChange={(v) => setAwsForm((p) => ({ ...p, authMode: v }))}
                  />
                </Field>

                {awsForm.authMode === "role" ? (
                  <>
                    <Field
                      label="Role ARN"
                      span2
                      hint="arn:aws:iam::123456789012:role/JeolgamReadOnlyRole 형식"
                    >
                      <input
                        value={awsForm.roleArn}
                        onChange={(e) => setAwsForm((p) => ({ ...p, roleArn: e.target.value }))}
                        placeholder="arn:aws:iam::123456789012:role/JeolgamReadOnlyRole"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="External ID" span2 hint="선택 사항 — IAM trust policy에 설정한 값을 입력합니다.">
                      <input
                        value={awsForm.externalId}
                        onChange={(e) => setAwsForm((p) => ({ ...p, externalId: e.target.value }))}
                        className={inputCls}
                      />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label="Access Key ID">
                      <input
                        value={awsForm.accessKeyId}
                        onChange={(e) => setAwsForm((p) => ({ ...p, accessKeyId: e.target.value }))}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Secret Access Key">
                      <input
                        type="password"
                        value={awsForm.secretAccessKey}
                        onChange={(e) => setAwsForm((p) => ({ ...p, secretAccessKey: e.target.value }))}
                        className={inputCls}
                      />
                    </Field>
                  </>
                )}
              </FormCard>

              {/* Kubernetes */}
              <FormCard
                type="k8s"
                title="Kubernetes"
                tagline="nodes · pods · requests · limits"
                status={integrationsByType.get("k8s")?.status}
                backendRegistered={integrationsByType.get("k8s")?.backendRegistered}
                iconColor="border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300"
                onSubmit={onSubmitK8s}
                loading={loading}
                submitLabel="K8s 검증 및 저장"
              >
                <Field label="연동 이름">
                  <input
                    value={k8sForm.name}
                    onChange={(e) => setK8sForm((p) => ({ ...p, name: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="클러스터 이름">
                  <input
                    value={k8sForm.clusterName}
                    onChange={(e) => setK8sForm((p) => ({ ...p, clusterName: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
                <Field
                  label="API Server URL"
                  span2
                  hint="IP 대신 kubeconfig의 server DNS endpoint를 권장합니다."
                >
                  <input
                    value={k8sForm.apiServerUrl}
                    onChange={(e) => setK8sForm((p) => ({ ...p, apiServerUrl: e.target.value }))}
                    placeholder="https://xxxx.gr7.ap-northeast-2.eks.amazonaws.com"
                    className={inputCls}
                  />
                </Field>
                <Field label="Read-only Token" span2>
                  <input
                    type="password"
                    value={k8sForm.token}
                    onChange={(e) => setK8sForm((p) => ({ ...p, token: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
                <Field
                  label="CA Certificate"
                  span2
                  hint="사설 CA 클러스터일 때만 입력합니다. kubeconfig의 certificate-authority-data 값을 붙여넣으세요."
                >
                  <textarea
                    value={k8sForm.caCertPem}
                    onChange={(e) => setK8sForm((p) => ({ ...p, caCertPem: e.target.value }))}
                    rows={5}
                    placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"}
                    className={textareaCls}
                  />
                </Field>
              </FormCard>

              {/* Prometheus */}
              <FormCard
                type="prometheus"
                title="Prometheus"
                tagline="CPU · Memory · Error rate · Latency"
                status={integrationsByType.get("prometheus")?.status}
                backendRegistered={integrationsByType.get("prometheus")?.backendRegistered}
                iconColor="border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300"
                onSubmit={onSubmitPrometheus}
                loading={loading}
                submitLabel="Prometheus 검증 및 저장"
              >
                <Field label="연동 이름">
                  <input
                    value={promForm.name}
                    onChange={(e) => setPromForm((p) => ({ ...p, name: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Base URL">
                  <input
                    value={promForm.baseUrl}
                    onChange={(e) => setPromForm((p) => ({ ...p, baseUrl: e.target.value }))}
                    placeholder="https://prometheus.example.com"
                    className={inputCls}
                  />
                </Field>
                <Field
                  label="인증 방식"
                  span2
                  hint={
                    promForm.authMode === "basic"
                      ? "nginx/basic auth 앞단 구성에 사용합니다."
                      : "토큰 기반 ingress 또는 gateway 구성에 사용합니다."
                  }
                >
                  <AuthTab
                    options={[
                      { value: "basic", label: "Basic Auth" },
                      { value: "bearer", label: "Bearer Token" },
                    ]}
                    value={promForm.authMode}
                    onChange={(v) => setPromForm((p) => ({ ...p, authMode: v }))}
                  />
                </Field>

                {promForm.authMode === "basic" ? (
                  <>
                    <Field label="Username">
                      <input
                        value={promForm.username}
                        onChange={(e) => setPromForm((p) => ({ ...p, username: e.target.value }))}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Password">
                      <input
                        type="password"
                        value={promForm.password}
                        onChange={(e) => setPromForm((p) => ({ ...p, password: e.target.value }))}
                        className={inputCls}
                      />
                    </Field>
                  </>
                ) : null}

                <Field
                  label="Bearer Token"
                  span2
                  hint="Bearer 접두어 없이 토큰 값만 입력합니다."
                >
                  <input
                    type="password"
                    value={promForm.token}
                    onChange={(e) => setPromForm((p) => ({ ...p, token: e.target.value }))}
                    placeholder={
                      promForm.authMode === "bearer"
                        ? "Prometheus access token"
                        : "Basic 모드에서는 비워도 됩니다"
                    }
                    className={inputCls}
                  />
                </Field>

                <Field
                  label="CA Certificate PEM"
                  span2
                  hint="온프레미스 또는 사설 CA 구성일 때만 입력합니다."
                >
                  <textarea
                    value={k8sForm.caCertPem}
                    onChange={(e) => setK8sForm((p) => ({ ...p, caCertPem: e.target.value }))}
                    rows={4}
                    placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"}
                    className={textareaCls}
                  />
                </Field>
              </FormCard>
            </div>

            {/* ── right: sidebar ── */}
            <aside className="space-y-4 xl:self-start xl:sticky xl:top-0">

              {/* connection status */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
                <p className="mb-4 text-[10px] font-bold tracking-[0.22em] text-slate-400 uppercase">
                  연결 상태
                </p>
                <div className="space-y-3">
                  {(
                    [
                      {
                        type: "aws" as const,
                        label: "AWS",
                        sub: "Cost Explorer · EC2 · RDS · S3",
                        iconColor: "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
                      },
                      {
                        type: "k8s" as const,
                        label: "Kubernetes",
                        sub: "nodes · pods · requests · limits",
                        iconColor: "border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300",
                      },
                      {
                        type: "prometheus" as const,
                        label: "Prometheus",
                        sub: "CPU · Memory · Errors · Latency",
                        iconColor: "border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300",
                      },
                    ] as const
                  ).map((src) => {
                    const cfg = integrationsByType.get(src.type);
                    return (
                      <div
                        key={src.type}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700/60"
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${src.iconColor}`}
                        >
                          <IntegrationIcon type={src.type} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{src.label}</p>
                          <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                            {src.sub}
                          </p>
                        </div>
                        <StatusBadge
                          status={cfg?.status}
                          backendRegistered={cfg?.backendRegistered}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* toasts */}
              {message ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/8 dark:text-emerald-300">
                  {message}
                </div>
              ) : null}
              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/8 dark:text-rose-300">
                  {error}
                </div>
              ) : null}
              {data?.warnings?.length ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/8 dark:text-amber-300">
                  {data.warnings.join(" / ")}
                </div>
              ) : null}
            </aside>

          </div>
        </main>
      </div>
    </div>
  );
}
