"use client";

import { useEffect, useState } from "react";
import MainSidebar from "@/app/components/main-sidebar";
import PageTopBar from "@/app/components/page-top-bar";
import { authFetch } from "@/lib/auth-fetch";

interface AwsInfrastructurePayload {
  workspaceId: string;
  region: string;
  summary: {
    monthToDateCost: number;
    ec2InstanceCount: number;
    rdsInstanceCount: number;
    s3BucketCount: number;
  };
  costByService: Array<{
    service: string;
    monthToDateCost: number;
    resourceCount: number;
  }>;
  resources: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    region: string;
  }>;
  warnings: string[];
}

export default function AwsInfrastructurePage() {
  const [data, setData] = useState<AwsInfrastructurePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadInfrastructure() {
      setLoading(true);
      setError("");

      try {
        const response = await authFetch("/api/infrastructure/aws", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !payload?.ok || !payload?.data) {
          throw new Error(payload?.error?.message ?? "AWS 인프라 데이터를 불러오지 못했습니다.");
        }

        if (!cancelled) {
          setData(payload.data as AwsInfrastructurePayload);
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
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8] text-slate-900 dark:bg-[#0f1218] dark:text-slate-100">
      <MainSidebar active="aws_infra" />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageTopBar
          title="AWS 인프라"
          description="backend가 AWS API를 직접 조회한 서울 리전 인프라/비용 요약입니다."
        />

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1a2029]">
              <p className="text-xs font-bold tracking-[0.24em] text-[#2a6ef5] uppercase">
                AWS Seoul
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">
                {loading ? "로딩 중" : data?.region ?? "ap-northeast-2"}
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                mock 데이터 대신 backend connector를 통해 조회합니다.
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

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Month To Date Cost",
                  value: `$${data?.summary.monthToDateCost.toFixed(2) ?? "0.00"}`,
                },
                {
                  label: "EC2 Instances",
                  value: String(data?.summary.ec2InstanceCount ?? 0),
                },
                {
                  label: "RDS Instances",
                  value: String(data?.summary.rdsInstanceCount ?? 0),
                },
                {
                  label: "S3 Buckets",
                  value: String(data?.summary.s3BucketCount ?? 0),
                },
              ].map((card) => (
                <article
                  key={card.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#1a2029]"
                >
                  <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="mt-3 text-2xl font-black tracking-tight">
                    {loading ? "..." : card.value}
                  </p>
                </article>
              ))}
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1a2029]">
                <h3 className="text-lg font-bold">Cost By Service</h3>
                <div className="mt-4 space-y-3">
                  {(data?.costByService ?? []).map((item) => (
                    <div
                      key={item.service}
                      className="rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold">{item.service}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            resources: {item.resourceCount}
                          </p>
                        </div>
                        <p className="text-sm font-black">${item.monthToDateCost.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1a2029]">
                <h3 className="text-lg font-bold">Resources</h3>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="pb-3 pr-4">Type</th>
                        <th className="pb-3 pr-4">Name</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3">Region</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.resources ?? []).map((resource) => (
                        <tr
                          key={`${resource.type}-${resource.id}`}
                          className="border-t border-slate-200 dark:border-slate-800"
                        >
                          <td className="py-3 pr-4 font-semibold">{resource.type}</td>
                          <td className="py-3 pr-4">{resource.name}</td>
                          <td className="py-3 pr-4">{resource.status}</td>
                          <td className="py-3">{resource.region}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
