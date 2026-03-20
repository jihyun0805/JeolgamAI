"use client";

import { useEffect, useId, useState } from "react";
import MainSidebar from "@/app/components/main-sidebar";
import PageTopBar from "@/app/components/page-top-bar";
import { authFetch } from "@/lib/auth-fetch";

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

type TooltipPos = { x: number; y: number; containerWidth: number };

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
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPos>({ x: 0, y: 0, containerWidth: 0 });

  if (points.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        시계열 데이터가 없습니다.
      </div>
    );
  }

  const width = 640;
  const height = 220;
  const padding = { top: 20, right: 72, bottom: 30, left: 20 };
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

  // X축 레이블: 최대 5개 균등 배치
  const xTickCount = Math.min(5, points.length);
  const xTickIndices = Array.from({ length: xTickCount }, (_, i) =>
    xTickCount === 1 ? 0 : Math.round((i * (points.length - 1)) / (xTickCount - 1)),
  );

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const viewX = (relX / rect.width) * width;

    let closestIdx = 0;
    let minDist = Infinity;
    coordinates.forEach((pt, i) => {
      const d = Math.abs(pt.x - viewX);
      if (d < minDist) {
        minDist = d;
        closestIdx = i;
      }
    });

    setHoveredIdx(closestIdx);
    const pt = coordinates[closestIdx];
    setTooltipPos({
      x: (pt.x / width) * rect.width,
      y: (pt.y / height) * rect.height,
      containerWidth: rect.width,
    });
  }

  const hovered = hoveredIdx !== null ? coordinates[hoveredIdx] : null;

  return (
    <div className="relative rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-[#131820]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-52 w-full"
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIdx(null)}
        style={{ cursor: "crosshair" }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.26" />
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
              stroke="rgba(148, 163, 184, 0.16)"
              strokeDasharray="4 6"
            />
            <text
              x={width - 10}
              y={tick.y - 5}
              textAnchor="end"
              fontSize="10"
              fill="rgba(148, 163, 184, 0.8)"
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
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Hover vertical line */}
        {hovered && (
          <line
            x1={hovered.x}
            x2={hovered.x}
            y1={padding.top}
            y2={height - padding.bottom}
            stroke={color}
            strokeWidth="1.5"
            strokeDasharray="3 5"
            strokeOpacity="0.55"
          />
        )}

        {/* Data point dots */}
        {coordinates.map((pt, i) =>
          i === hoveredIdx ? (
            <g key={pt.label}>
              <circle cx={pt.x} cy={pt.y} r="7" fill={color} fillOpacity="0.15" />
              <circle cx={pt.x} cy={pt.y} r="4" fill={color} />
              <circle cx={pt.x} cy={pt.y} r="1.8" fill="white" />
            </g>
          ) : (
            <g key={pt.label}>
              <circle cx={pt.x} cy={pt.y} r="4" fill={color} fillOpacity="0.2" />
              <circle cx={pt.x} cy={pt.y} r="2.2" fill={color} />
            </g>
          ),
        )}

        {/* X축 레이블 – 5개만 */}
        {xTickIndices.map((idx) => (
          <text
            key={`xt-${idx}`}
            x={coordinates[idx].x}
            y={height - 7}
            textAnchor="middle"
            fontSize="10"
            fill="rgba(148, 163, 184, 0.85)"
          >
            {coordinates[idx].label}
          </text>
        ))}
      </svg>

      {/* HTML floating tooltip – 왜곡 없이 정확한 텍스트 렌더 */}
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 min-w-[108px] rounded-xl border border-slate-700/60 bg-slate-900/95 px-3 py-2 shadow-lg backdrop-blur-sm"
          style={{
            left:
              tooltipPos.x > tooltipPos.containerWidth / 2
                ? tooltipPos.x - 124
                : tooltipPos.x + 14,
            top: Math.max(6, tooltipPos.y - 44),
          }}
        >
          <p className="text-[10px] text-slate-400">{hovered.label}</p>
          <p className="mt-0.5 text-sm font-bold text-white">
            {formatMetricValue(hovered.value, unit)}
          </p>
        </div>
      )}
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
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1a2029]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold">{title}</h3>
        {points.length > 0 ? (
          <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
            latest {formatMetricValue(points[points.length - 1].value, unit)}
          </span>
        ) : null}
      </div>
      <div className="mt-5">
        <LineChart color={color} points={points} unit={unit} />
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
      if (!cancelled) {
        setLoading(true);
        setError("");
      }
      try {
        const params = new URLSearchParams({
          from: appliedRange.from,
          to: appliedRange.to,
        });
        const response = await authFetch(`/api/prometheus/overview?${params.toString()}`, {
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
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8] text-slate-900 dark:bg-[#0f1218] dark:text-slate-100">
      <MainSidebar active="prometheus" />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageTopBar
          title="Prometheus 모니터링"
          description="현재 프로젝트의 Prometheus 지표를 프로젝트 스코프로 표시합니다."
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4 md:px-8 md:pb-10 md:pt-8">
          <div className="w-full space-y-5">

            {/* 프로젝트 + 시간 범위 컨트롤 – 한 줄 통합 */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#1a2029]">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <div>
                    <p className="text-xs font-bold tracking-[0.22em] text-[#2a6ef5] uppercase">
                      Active Project
                    </p>
                    <h2 className="mt-0.5 text-xl font-black tracking-tight">
                      {data?.project?.name ?? "프로젝트 로딩 중"}
                    </h2>
                  </div>
                  <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    {formatRangeText(data?.overview.timeRange?.from, data?.overview.timeRange?.to)}
                  </span>
                </div>

                <div className="flex min-w-0 shrink flex-nowrap items-end gap-3">
                  {/* Range presets */}
                  <div className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-[#131820]">
                    {RANGE_PRESET_OPTIONS.map((option) => {
                      const active = selectedPreset === option.key;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => applyPresetRange(option.key)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            active
                              ? "bg-[#2a6ef5] text-white shadow-sm"
                              : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom range + Apply: 한 줄에 시작·종료·적용 */}
                  <div className="flex min-w-0 flex-1 flex-nowrap items-end gap-2">
                    <label className="flex min-w-0 flex-col text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span className="mb-1 block">시작</span>
                      <span className="relative inline-block w-full max-w-[180px]">
                        <input
                          type="datetime-local"
                          value={customFrom}
                          onChange={(event) => {
                            setSelectedPreset("custom");
                            setCustomFrom(event.target.value);
                          }}
                          className="w-full min-w-0 rounded-xl border border-slate-300 bg-white py-2 pl-3 pr-9 text-sm text-slate-700 dark:border-slate-700 dark:bg-[#131820] dark:text-slate-100"
                        />
                        <span
                          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400"
                          aria-hidden
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                            <line x1="16" x2="16" y1="2" y2="6" />
                            <line x1="8" x2="8" y1="2" y2="6" />
                            <line x1="3" x2="21" y1="10" y2="10" />
                          </svg>
                        </span>
                      </span>
                    </label>
                    <label className="flex min-w-0 flex-col text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span className="mb-1 block">종료</span>
                      <span className="relative inline-block w-full max-w-[180px]">
                        <input
                          type="datetime-local"
                          value={customTo}
                          onChange={(event) => {
                            setSelectedPreset("custom");
                            setCustomTo(event.target.value);
                          }}
                          className="w-full min-w-0 rounded-xl border border-slate-300 bg-white py-2 pl-3 pr-9 text-sm text-slate-700 dark:border-slate-700 dark:bg-[#131820] dark:text-slate-100"
                        />
                        <span
                          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400"
                          aria-hidden
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                            <line x1="16" x2="16" y1="2" y2="6" />
                            <line x1="8" x2="8" y1="2" y2="6" />
                            <line x1="3" x2="21" y1="10" y2="10" />
                          </svg>
                        </span>
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={applyCustomRange}
                      className="shrink-0 rounded-xl bg-[#2a6ef5] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#2563eb] dark:bg-[#2a6ef5] dark:hover:bg-[#2563eb]"
                    >
                      적용
                    </button>
                  </div>
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

            {/* 요약 지표 카드 */}
            <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {[
                {
                  label: "CPU 평균",
                  value: `${data?.overview.summary.cpuUsagePercent ?? 0}%`,
                  color: "#2a6ef5",
                },
                {
                  label: "메모리 평균",
                  value: `${data?.overview.summary.memoryUsagePercent ?? 0}%`,
                  color: "#16a34a",
                },
                {
                  label: "P95 Latency",
                  value: latencyUnavailable
                    ? "N/A"
                    : `${data?.overview.summary.p95LatencyMs ?? 0}ms`,
                  color: "#f59e0b",
                },
                {
                  label: "에러율",
                  value: errorRateUnavailable
                    ? "N/A"
                    : `${data?.overview.summary.errorRatePercent ?? 0}%`,
                  color: "#ef4444",
                },
                {
                  label: "Scrape Health",
                  value: `${data?.overview.summary.scrapeHealthPercent ?? 0}%`,
                  color: "#8b5cf6",
                },
              ].map((card) => (
                <article
                  key={card.label}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1a2029]"
                >
                  <p className="text-xs text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p
                    className="mt-2 text-2xl font-black tracking-tight"
                    style={{ color: loading ? undefined : card.color }}
                  >
                    {loading ? "..." : card.value}
                  </p>
                </article>
              ))}
            </section>

            {/* 차트 그리드 – hover tooltip 포함 (위 요약 카드와 이름 통일) */}
            <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <MetricPanel
                title="CPU 평균"
                color="#2a6ef5"
                points={data?.overview.series.cpuUsage ?? []}
                unit="percent"
              />

              <MetricPanel
                title="메모리 평균"
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
                title="에러율"
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
