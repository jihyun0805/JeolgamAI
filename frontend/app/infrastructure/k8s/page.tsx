"use client";

import { useEffect, useState } from "react";
import MainSidebar from "@/app/components/main-sidebar";
import PageTopBar from "@/app/components/page-top-bar";

interface K8sInfrastructurePayload {
  workspaceId: string;
  clusterName: string;
  summary: {
    nodeCount: number;
    namespaceCount: number;
    deploymentCount: number;
    serviceCount: number;
    podCount: number;
  };
  namespaces: Array<{
    name: string;
    podCount: number;
    serviceCount: number;
    deploymentCount: number;
  }>;
  deployments: Array<{
    namespace: string;
    name: string;
    replicas: number;
    readyReplicas: number;
    images: string[];
  }>;
  services: Array<{
    namespace: string;
    name: string;
    type: string;
    clusterIP: string;
    ports: string[];
  }>;
  pods: Array<{
    namespace: string;
    name: string;
    phase: string;
    node: string;
    ready: string;
    restartCount: number;
    images: string[];
  }>;
  warnings: string[];
}

export default function K8sInfrastructurePage() {
  const [data, setData] = useState<K8sInfrastructurePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          setData(payload.data as K8sInfrastructurePayload);
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

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8] text-slate-900 dark:bg-[#0B0E14] dark:text-slate-100">
      <MainSidebar active="k8s_infra" />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageTopBar
          title="K8s 인프라"
          description="backend가 Kubernetes API endpoint를 직접 조회한 현재 프로젝트의 인프라 상태입니다."
        />

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
              <p className="text-xs font-bold tracking-[0.24em] text-[#1c59f2] uppercase">
                Active Cluster
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">
                {loading ? "로딩 중" : data?.clusterName ?? "Kubernetes Cluster"}
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                frontend가 직접 `kubectl`을 호출하지 않고 backend connector를 통해 가져옵니다.
              </p>
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

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              {[
                { label: "Nodes", value: String(data?.summary.nodeCount ?? 0) },
                { label: "Namespaces", value: String(data?.summary.namespaceCount ?? 0) },
                { label: "Deployments", value: String(data?.summary.deploymentCount ?? 0) },
                { label: "Services", value: String(data?.summary.serviceCount ?? 0) },
                { label: "Pods", value: String(data?.summary.podCount ?? 0) },
              ].map((card) => (
                <article
                  key={card.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#161B22]"
                >
                  <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="mt-3 text-2xl font-black tracking-tight">
                    {loading ? "..." : card.value}
                  </p>
                </article>
              ))}
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
                <h3 className="text-lg font-bold">Namespaces</h3>
                <div className="mt-4 space-y-3">
                  {(data?.namespaces ?? []).map((item) => (
                    <div
                      key={item.name}
                      className="rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800"
                    >
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        deploy {item.deploymentCount} · svc {item.serviceCount} · pod {item.podCount}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <div className="space-y-6">
                <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
                  <h3 className="text-lg font-bold">Deployments</h3>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="pb-3 pr-4">Namespace</th>
                          <th className="pb-3 pr-4">Name</th>
                          <th className="pb-3 pr-4">Replicas</th>
                          <th className="pb-3">Image</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data?.deployments ?? []).map((item) => (
                          <tr
                            key={`${item.namespace}-${item.name}`}
                            className="border-t border-slate-200 dark:border-slate-800"
                          >
                            <td className="py-3 pr-4">{item.namespace}</td>
                            <td className="py-3 pr-4 font-semibold">{item.name}</td>
                            <td className="py-3 pr-4">
                              {item.readyReplicas}/{item.replicas}
                            </td>
                            <td className="py-3">{item.images.join(", ")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
                  <h3 className="text-lg font-bold">Pods</h3>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="pb-3 pr-4">Namespace</th>
                          <th className="pb-3 pr-4">Pod</th>
                          <th className="pb-3 pr-4">Phase</th>
                          <th className="pb-3 pr-4">Ready</th>
                          <th className="pb-3">Node</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data?.pods ?? []).map((item) => (
                          <tr
                            key={`${item.namespace}-${item.name}`}
                            className="border-t border-slate-200 dark:border-slate-800"
                          >
                            <td className="py-3 pr-4">{item.namespace}</td>
                            <td className="py-3 pr-4 font-semibold">{item.name}</td>
                            <td className="py-3 pr-4">{item.phase}</td>
                            <td className="py-3 pr-4">{item.ready}</td>
                            <td className="py-3">{item.node}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
