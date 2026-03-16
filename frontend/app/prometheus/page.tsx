"use client";

import { useEffect, useId, useState } from "react";
import MainSidebar from "@/app/components/main-sidebar";
import PageTopBar from "@/app/components/page-top-bar";

type SeriesPoint = {
  label: string;
  value: number;
};

type RangePreset = "6h" | "24h" | "7d" | "30d" | "custom";

const RANGE_PRESET_OPTIONS: Array<{ key: Exclude<RangePreset, "custom">; label: string; hours: number }> = [
  { key: "6h", label: "최근 6시간", hours: 6 },
  { key: "24h", label: "최근 24시간", hours: 24 },
  { key: "7d", label: "최근 7일", hours: 24 * 7 },
  { key: "30d", label: "최근 30일", hours: 24 * 30 },
];

interface PrometheusPayload {
  project?: {
    id: string;
    name: string;
    awsRegion: string;
  } | null;
  overview: {
    summary: {
      cpuUsagePercent: number;
      memoryUsagePercent: number;
      p95LatencyMs: number;
      errorRatePercent: number;
      scrapeHealthPercent: number;
    };
    series: Record<
      string,
      Array<{
        label: string;
        value: number;
      }>
    >;
    timeRange?: {
      from: string;
      to: string;
      stepSeconds: number;
    };
    warnings?: string[];
    authMode?: "basic" | "bearer";
    baseUrl?: string;
  };
}

function hasMetricWarning(warnings: string[] | undefined, metricKey: string) {
  return (warnings ?? []).some((warning) => warning.includes(`${metricKey} `));
}

function formatMetricValue(value: number, unit: "percent" | "ms") {
  if (unit === "ms") {
    return `${Number.isInteger(value) ? value : value.toFixed(2)}ms`;
  }

  return `${value.toFixed(2)}%`;
}

function toDateTimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function buildPresetRange(preset: Exclude<RangePreset, "custom">) {
  const option = RANGE_PRESET_OPTIONS.find((item) => item.key === preset) ?? RANGE_PRESET_OPTIONS[1];
  const to = new Date();
  const from = new Date(to.getTime() - option.hours * 60 * 60 * 1000);
  return {
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
    fromInput: toDateTimeLocalValue(from),
    toInput: toDateTimeLocalValue(to),
  };
}

function formatRangeText(from: string | undefined, to: string | undefined) {
  if (!from || !to) {
    return "최근 24시간";
  }

  const formatter = new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${formatter.format(new Date(from))} ~ ${formatter.format(new Date(to))}`;
}

function LineChart({
  points,
  color,
  unit,
}: {
  points: SeriesPoint[];
  color: string;
  unit: "percent" | "ms";
}) {
  const gradientId = useId().replace(/:/g, "");

  if (points.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        시계열 데이터가 없습니다.
      </div>
    );
  }

  const width = 640;
  const height = 240;
  const padding = { top: 18, right: 18, bottom: 42, left: 18 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const baseMin = Math.min(0, minValue);
  const safeRange = Math.max(maxValue - baseMin, Math.abs(maxValue) * 0.15, 1);
  const scaleMin = baseMin;
  const scaleMax = baseMin + safeRange;
  const stepX = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth / 2;

  const toX = (index: number) => padding.left + stepX * index;
  const toY = (value: number) =>
    padding.top + chartHeight - ((value - scaleMin) / (scaleMax - scaleMin)) * chartHeight;

  const coordinates = points.map((point, index) => ({
    ...point,
    x: toX(index),
    y: toY(point.value),
  }));

  const linePath = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${coordinates[coordinates.length - 1].x} ${height - padding.bottom} L ${coordinates[0].x} ${height - padding.bottom} Z`;
  const ticks = Array.from({ length: 4 }, (_, index) => {
    const ratio = index / 3;
    const value = scaleMax - (scaleMax - scaleMin) * ratio;
    return {
      y: padding.top + chartHeight * ratio,
      value,
    };
  });

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-[#0F141C]">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={tick.y}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={tick.y}
              y2={tick.y}
              stroke="rgba(148, 163, 184, 0.18)"
              strokeDasharray="4 6"
            />
            <text
              x={width - padding.right}
              y={tick.y - 6}
              textAnchor="end"
              fontSize="11"
              fill="rgba(148, 163, 184, 0.85)"
            >
              {formatMetricValue(tick.value, unit)}
            </text>
          </g>
        ))}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {coordinates.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="5" fill={color} fillOpacity="0.22" />
            <circle cx={point.x} cy={point.y} r="2.6" fill={color} />
            <text
              x={point.x}
              y={height - 12}
              textAnchor="middle"
              fontSize="11"
              fill="rgba(148, 163, 184, 0.9)"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function MetricTable({
  points,
  unit,
}: {
  points: SeriesPoint[];
  unit: "percent" | "ms";
}) {
  if (points.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-[#0F141C]">
          <tr>
            {points.map((point) => (
              <th
                key={`head-${point.label}`}
                className="px-3 py-2 text-left font-semibold whitespace-nowrap text-slate-500 dark:text-slate-400"
              >
                {point.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="bg-white dark:bg-[#161B22]">
            {points.map((point) => (
              <td
                key={`value-${point.label}`}
                className="px-3 py-2 font-semibold whitespace-nowrap text-slate-700 dark:text-slate-200"
              >
                {formatMetricValue(point.value, unit)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function MetricPanel({
  title,
  points,
  color,
  unit,
}: {
  title: string;
  points: SeriesPoint[];
  color: string;
  unit: "percent" | "ms";
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold">{title}</h3>
        {points.length > 0 ? (
          <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
            latest {formatMetricValue(points[points.length - 1].value, unit)}
          </span>
        ) : null}
      </div>
      <div className="mt-6">
        <LineChart color={color} points={points} unit={unit} />
      </div>
      <div className="mt-4">
        <MetricTable points={points} unit={unit} />
      </div>
    </article>
  );
}

export default function PrometheusPage() {
  const defaultRange = buildPresetRange("24h");
  const [data, setData] = useState<PrometheusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<RangePreset>("24h");
  const [appliedRange, setAppliedRange] = useState({
    from: defaultRange.fromIso,
    to: defaultRange.toIso,
  });
  const [customFrom, setCustomFrom] = useState(defaultRange.fromInput);
  const [customTo, setCustomTo] = useState(defaultRange.toInput);
  const warnings = data?.overview.warnings ?? [];
  const latencyUnavailable = hasMetricWarning(warnings, "latency");
  const errorRateUnavailable = hasMetricWarning(warnings, "error_rate");

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          from: appliedRange.from,
          to: appliedRange.to,
        });
        const response = await fetch(`/api/prometheus/overview?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok || !payload?.ok || !payload?.data) {
          throw new Error(
            payload?.error?.message ?? "Prometheus 개요 데이터를 불러오지 못했습니다.",
          );
        }

        if (!cancelled) {
          setData(payload.data as PrometheusPayload);
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

    loadOverview().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [appliedRange.from, appliedRange.to]);

  function applyPresetRange(preset: Exclude<RangePreset, "custom">) {
    const nextRange = buildPresetRange(preset);
    setSelectedPreset(preset);
    setAppliedRange({
      from: nextRange.fromIso,
      to: nextRange.toIso,
    });
    setCustomFrom(nextRange.fromInput);
    setCustomTo(nextRange.toInput);
  }

  function applyCustomRange() {
    if (!customFrom || !customTo) {
      setError("사용자 지정 기간은 시작/종료 시각이 모두 필요합니다.");
      return;
    }

    const fromDate = new Date(customFrom);
    const toDate = new Date(customTo);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      setError("사용자 지정 기간 형식이 올바르지 않습니다.");
      return;
    }

    if (fromDate >= toDate) {
      setError("시작 시각은 종료 시각보다 이전이어야 합니다.");
      return;
    }

    setSelectedPreset("custom");
    setAppliedRange({
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8] text-slate-900 dark:bg-[#0B0E14] dark:text-slate-100">
      <MainSidebar active="prometheus" />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageTopBar
          title="Prometheus 모니터링"
          description="현재 프로젝트의 Prometheus 지표를 프로젝트 스코프로 표시합니다."
        />

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
              <p className="text-xs font-bold tracking-[0.24em] text-[#1c59f2] uppercase">
                Active Project
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">
                {data?.project?.name ?? "프로젝트 로딩 중"}
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Prometheus 연결이 된 현재 프로젝트만 조회됩니다.
              </p>
              {data?.overview.baseUrl ? (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {data.overview.baseUrl} · auth={data.overview.authMode ?? "unknown"}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                조회 기간: {formatRangeText(data?.overview.timeRange?.from, data?.overview.timeRange?.to)}
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#161B22]">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="space-y-3">
                  <p className="text-xs font-bold tracking-[0.22em] text-slate-500 uppercase dark:text-slate-400">
                    Time Range
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {RANGE_PRESET_OPTIONS.map((option) => {
                      const active = selectedPreset === option.key;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => applyPresetRange(option.key)}
                          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                            active
                              ? "border-[#1c59f2] bg-[#1c59f2] text-white"
                              : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    시작 시각
                    <input
                      type="datetime-local"
                      value={customFrom}
                      onChange={(event) => {
                        setSelectedPreset("custom");
                        setCustomFrom(event.target.value);
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-[#0F141C] dark:text-slate-100"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    종료 시각
                    <input
                      type="datetime-local"
                      value={customTo}
                      onChange={(event) => {
                        setSelectedPreset("custom");
                        setCustomTo(event.target.value);
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-[#0F141C] dark:text-slate-100"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={applyCustomRange}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                  >
                    적용
                  </button>
                </div>
              </div>
            </section>

            {error ? (
              <section className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                {error}
              </section>
            ) : null}

            {data?.overview.warnings?.length ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                {data.overview.warnings.join(" / ")}
              </section>
            ) : null}

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              {[
                {
                  label: "CPU 평균",
                  value: `${data?.overview.summary.cpuUsagePercent ?? 0}%`,
                },
                {
                  label: "메모리 평균",
                  value: `${data?.overview.summary.memoryUsagePercent ?? 0}%`,
                },
                {
                  label: "P95 Latency",
                  value: latencyUnavailable
                    ? "N/A"
                    : `${data?.overview.summary.p95LatencyMs ?? 0}ms`,
                },
                {
                  label: "에러율",
                  value: errorRateUnavailable
                    ? "N/A"
                    : `${data?.overview.summary.errorRatePercent ?? 0}%`,
                },
                {
                  label: "Scrape Health",
                  value: `${data?.overview.summary.scrapeHealthPercent ?? 0}%`,
                },
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

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <MetricPanel
                title="CPU Usage"
                color="#1c59f2"
                points={data?.overview.series.cpuUsage ?? []}
                unit="percent"
              />

              <MetricPanel
                title="Memory Usage"
                color="#16a34a"
                points={data?.overview.series.memoryUsage ?? []}
                unit="percent"
              />

              <MetricPanel
                title="P95 Latency"
                color="#f59e0b"
                points={data?.overview.series.latencyMs ?? []}
                unit="ms"
              />

              <MetricPanel
                title="Error Rate"
                color="#ef4444"
                points={data?.overview.series.errorRatePercent ?? []}
                unit="percent"
              />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
