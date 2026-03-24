"use client";

import { useEffect, useId, useState } from "react";
import MainSidebar from "@/app/components/main-sidebar";
import PageTopBar from "@/app/components/page-top-bar";
import { authFetch } from "@/lib/auth-fetch";

type SeriesPoint = {
  timestamp?: string;
  label: string;
  value: number;
};

type RangeValue = {
  lower: number;
  base: number;
  upper: number;
};

type ForecastMetric = {
  key: string;
  label: string;
  unit: string;
  currentValue: number;
  forecast1h: number;
  forecast6h: number;
  forecast24h: number;
  statusLabel: string;
  detail: string;
};

type ForecastSeries = {
  key: string;
  points: SeriesPoint[];
};

type AiForecastMetric = {
  key: string;
  label: string;
  unit: string;
  strategy: string;
  currentValue: number;
  forecast1h: RangeValue;
  forecast6h: RangeValue;
  forecast24h: RangeValue;
};

type AiForecastBandPoint = {
  label: string;
  lower: number;
  base: number;
  upper: number;
};

type AiForecastSeries = {
  key: string;
  points: AiForecastBandPoint[];
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
    forecast?: {
      methodology?: string;
      metrics: ForecastMetric[];
      chartSeries?: ForecastSeries[];
    };
    aiForecast?: {
      methodology?: string;
      provider?: string;
      metrics: AiForecastMetric[];
      chartSeries?: AiForecastSeries[];
    };
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

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const chunk =
    normalized.length === 3
      ? normalized
          .split("")
          .map((value) => value + value)
          .join("")
      : normalized;
  const red = Number.parseInt(chunk.slice(0, 2), 16);
  const green = Number.parseInt(chunk.slice(2, 4), 16);
  const blue = Number.parseInt(chunk.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function forecastToneClass(statusLabel: string) {
  if (statusLabel.includes("주의")) {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300";
  }
  if (statusLabel.includes("최적화")) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  }
  if (statusLabel.includes("안정")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  }
  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-[#131820] dark:text-slate-300";
}

function resolveForecastSeries(
  chartSeries: ForecastSeries[] | undefined,
  metrics: ForecastMetric[],
  key: string,
) {
  const series = chartSeries?.find((item) => item.key === key)?.points;
  if (series?.length) return series;

  const metric = metrics.find((item) => item.key === key);
  if (!metric) return [];
  return [
    { label: "1h", value: metric.forecast1h },
    { label: "6h", value: metric.forecast6h },
    { label: "24h", value: metric.forecast24h },
  ];
}

function resolveAiForecastSeries(
  chartSeries: AiForecastSeries[] | undefined,
  metrics: AiForecastMetric[],
  key: string,
) {
  const series = chartSeries?.find((item) => item.key === key)?.points;
  if (series?.length) return series;

  const metric = metrics.find((item) => item.key === key);
  if (!metric) return [];
  return [
    { label: "1h", lower: metric.forecast1h.lower, base: metric.forecast1h.base, upper: metric.forecast1h.upper },
    { label: "6h", lower: metric.forecast6h.lower, base: metric.forecast6h.base, upper: metric.forecast6h.upper },
    { label: "24h", lower: metric.forecast24h.lower, base: metric.forecast24h.base, upper: metric.forecast24h.upper },
  ];
}

function downsampleSeries(points: SeriesPoint[], maxPoints: number) {
  if (points.length <= maxPoints) {
    return points;
  }

  const sampled: SeriesPoint[] = [];
  for (let i = 0; i < maxPoints; i += 1) {
    const index = Math.round((i * (points.length - 1)) / Math.max(maxPoints - 1, 1));
    sampled.push(points[index]);
  }

  return sampled;
}

function downsampleBandSeries(points: AiForecastBandPoint[], maxPoints: number) {
  if (points.length <= maxPoints) {
    return points;
  }

  const sampled: AiForecastBandPoint[] = [];
  for (let i = 0; i < maxPoints; i += 1) {
    const index = Math.round((i * (points.length - 1)) / Math.max(maxPoints - 1, 1));
    sampled.push(points[index]);
  }
  return sampled;
}

function toDateInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

function buildPresetRange(preset: Exclude<RangePreset, "custom">) {
  const option = RANGE_PRESET_OPTIONS.find((item) => item.key === preset) ?? RANGE_PRESET_OPTIONS[1];
  const to = new Date();
  const from = new Date(to.getTime() - option.hours * 60 * 60 * 1000);
  return {
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
    fromInput: toDateInputValue(from),
    toInput: toDateInputValue(to),
  };
}

function formatRangeText(from: string | undefined, to: string | undefined) {
  if (!from || !to) {
    return "최근 기간";
  }

  const formatter = new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  });

  return `${formatter.format(new Date(from))} ~ ${formatter.format(new Date(to))}`;
}

function formatAxisLabel(date: Date, from: string | undefined, to: string | undefined) {
  if (!from || !to) {
    return "";
  }

  const durationMs = new Date(to).getTime() - new Date(from).getTime();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  if (durationMs <= 12 * 60 * 60 * 1000) {
    return `${hour}:${minute}`;
  }
  if (durationMs <= 8 * 24 * 60 * 60 * 1000) {
    return `${month}/${day} ${hour}:${minute}`;
  }
  return `${month}/${day}`;
}

type TooltipPos = { x: number; y: number; containerWidth: number };
type HoverTarget = { kind: "actual" | "forecast"; index: number };

function LineChart({
  points,
  forecastPoints,
  aiBandPoints,
  color,
  forecastColor,
  rangeFrom,
  rangeTo,
  unit,
}: {
  points: SeriesPoint[];
  forecastPoints?: SeriesPoint[];
  aiBandPoints?: AiForecastBandPoint[];
  color: string;
  forecastColor?: string;
  rangeFrom?: string;
  rangeTo?: string;
  unit: "percent" | "ms";
}) {
  const gradientId = useId().replace(/:/g, "");
  const forecastGradientId = `${gradientId}-forecast`;
  const projectedColor = forecastColor ?? color;
  const [hoveredTarget, setHoveredTarget] = useState<HoverTarget | null>(null);
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
  const maxFuturePoints = Math.max(3, Math.round(points.length / 4));
  const futurePoints = downsampleSeries(
    forecastPoints ?? [],
    maxFuturePoints,
  );
  const futureBandPoints = downsampleBandSeries(aiBandPoints ?? [], maxFuturePoints);
  const values = [
    ...points.map((point) => point.value),
    ...futurePoints.map((point) => point.value),
    ...futureBandPoints.flatMap((point) => [point.lower, point.base, point.upper]),
  ];
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const baseMin = Math.min(0, minValue);
  const safeRange = Math.max(maxValue - baseMin, Math.abs(maxValue) * 0.15, 1);
  const scaleMin = baseMin;
  const scaleMax = baseMin + safeRange;
  const actualRatio = futurePoints.length ? 0.8 : 1;
  const actualWidth = chartWidth * actualRatio;
  const forecastWidth = chartWidth - actualWidth;
  const actualStepX = points.length > 1 ? actualWidth / (points.length - 1) : actualWidth / 2;
  const forecastStepX = futurePoints.length
    ? forecastWidth / futurePoints.length
    : 0;

  const toY = (value: number) =>
    padding.top + chartHeight - ((value - scaleMin) / (scaleMax - scaleMin)) * chartHeight;

  const coordinates = points.map((point, index) => ({
    ...point,
    x: padding.left + actualStepX * index,
    y: toY(point.value),
  }));
  const forecastCoordinates = futurePoints.map((point, index) => ({
    ...point,
    x: padding.left + actualWidth + forecastStepX * (index + 1),
    y: toY(point.value),
  }));
  const aiBandCoordinates = futureBandPoints.map((point, index) => ({
    ...point,
    x:
      padding.left +
      actualWidth +
      (futureBandPoints.length
        ? (forecastWidth / futureBandPoints.length) * (index + 1)
        : 0),
    lowerY: toY(point.lower),
    baseY: toY(point.base),
    upperY: toY(point.upper),
  }));

  const linePath = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${coordinates[coordinates.length - 1].x} ${height - padding.bottom} L ${coordinates[0].x} ${height - padding.bottom} Z`;
  const forecastPath = forecastCoordinates.length
    ? [`M ${coordinates[coordinates.length - 1].x} ${coordinates[coordinates.length - 1].y}`]
        .concat(forecastCoordinates.map((point) => `L ${point.x} ${point.y}`))
        .join(" ")
    : "";
  const aiBandFillPath = aiBandCoordinates.length
    ? [
        `M ${coordinates[coordinates.length - 1].x} ${coordinates[coordinates.length - 1].y}`,
        ...aiBandCoordinates.map((point) => `L ${point.x} ${point.upperY}`),
        ...aiBandCoordinates
          .slice()
          .reverse()
          .map((point) => `L ${point.x} ${point.lowerY}`),
        `L ${coordinates[coordinates.length - 1].x} ${coordinates[coordinates.length - 1].y}`,
        "Z",
      ].join(" ")
    : "";
  const aiBandBasePath = aiBandCoordinates.length
    ? [`M ${coordinates[coordinates.length - 1].x} ${coordinates[coordinates.length - 1].y}`]
        .concat(aiBandCoordinates.map((point) => `L ${point.x} ${point.baseY}`))
        .join(" ")
    : "";

  const ticks = Array.from({ length: 4 }, (_, index) => {
    const ratio = index / 3;
    const value = scaleMax - (scaleMax - scaleMin) * ratio;
    return {
      y: padding.top + chartHeight * ratio,
      value,
    };
  });

  const actualTickCount = futurePoints.length ? 4 : 5;
  const actualTickDivisor = actualTickCount - 1;
  const actualTimeTicks =
    rangeFrom && rangeTo
      ? Array.from({ length: actualTickCount }, (_, index) => {
          const ratio = index / actualTickDivisor;
          const date = new Date(
            new Date(rangeFrom).getTime() +
              (new Date(rangeTo).getTime() - new Date(rangeFrom).getTime()) * ratio,
          );
          return {
            x: padding.left + actualWidth * ratio,
            label: formatAxisLabel(date, rangeFrom, rangeTo),
          };
        })
      : [];

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const viewX = (relX / rect.width) * width;

    let closestTarget: HoverTarget = { kind: "actual", index: 0 };
    let minDist = Infinity;
    coordinates.forEach((pt, i) => {
      const d = Math.abs(pt.x - viewX);
      if (d < minDist) {
        minDist = d;
        closestTarget = { kind: "actual", index: i };
      }
    });
    forecastCoordinates.forEach((pt, i) => {
      const d = Math.abs(pt.x - viewX);
      if (d < minDist) {
        minDist = d;
        closestTarget = { kind: "forecast", index: i };
      }
    });

    setHoveredTarget(closestTarget);
    const pt =
      closestTarget.kind === "forecast"
        ? forecastCoordinates[closestTarget.index]
        : coordinates[closestTarget.index];
    setTooltipPos({
      x: (pt.x / width) * rect.width,
      y: (pt.y / height) * rect.height,
      containerWidth: rect.width,
    });
  }

  const hovered =
    hoveredTarget?.kind === "forecast"
      ? (forecastCoordinates[hoveredTarget.index] ?? null)
      : hoveredTarget
        ? (coordinates[hoveredTarget.index] ?? null)
        : null;
  const hoveredStroke =
    hoveredTarget?.kind === "forecast"
      ? projectedColor
      : color;
  const finalForecast = forecastCoordinates.at(-1) ?? null;
  const forecastEndDate =
    rangeFrom && rangeTo && futurePoints.length
      ? new Date(new Date(rangeTo).getTime() + (new Date(rangeTo).getTime() - new Date(rangeFrom).getTime()) / 4)
      : null;
  const finalForecastAxisLabel = forecastEndDate
    ? formatAxisLabel(forecastEndDate, rangeFrom, rangeTo)
    : finalForecast?.label ?? "";

  return (
    <div className="relative rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-[#131820]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-52 w-full"
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredTarget(null)}
        style={{ cursor: "crosshair" }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.26" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={forecastGradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={projectedColor} stopOpacity="0.12" />
            <stop offset="100%" stopColor={projectedColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {forecastCoordinates.length || aiBandCoordinates.length ? (
          <rect
            x={padding.left + actualWidth}
            y={padding.top}
            width={forecastWidth}
            height={chartHeight}
            fill={hexToRgba(projectedColor, 0.04)}
            rx="12"
          />
        ) : null}

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

        {aiBandFillPath ? (
          <path d={aiBandFillPath} fill={hexToRgba(projectedColor, 0.14)} />
        ) : null}
        {aiBandBasePath ? (
          <path
            d={aiBandBasePath}
            fill="none"
            stroke={projectedColor}
            strokeWidth="1.75"
            strokeDasharray="5 5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.38"
          />
        ) : null}

        {forecastPath ? (
          <>
            <path
              d={`${forecastPath} L ${forecastCoordinates[forecastCoordinates.length - 1].x} ${height - padding.bottom} L ${coordinates[coordinates.length - 1].x} ${height - padding.bottom} Z`}
              fill={hexToRgba(projectedColor, 0.04)}
            />
            <path
              d={forecastPath}
              fill="none"
              stroke={projectedColor}
              strokeWidth="2.5"
              strokeDasharray="7 6"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeOpacity="0.62"
            />
          </>
        ) : null}

        {/* Hover vertical line */}
        {hovered && (
          <line
            x1={hovered.x}
            x2={hovered.x}
            y1={padding.top}
            y2={height - padding.bottom}
            stroke={hoveredStroke}
            strokeWidth="1.5"
            strokeDasharray="3 5"
            strokeOpacity="0.55"
          />
        )}

        {/* Data point dots */}
        {coordinates.map((pt, i) =>
          hoveredTarget?.kind === "actual" && i === hoveredTarget.index ? (
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

        {forecastCoordinates.map((pt, i) =>
          hoveredTarget?.kind === "forecast" && i === hoveredTarget.index ? (
            <g key={`forecast-${pt.label}`}>
              <circle cx={pt.x} cy={pt.y} r="7" fill={projectedColor} fillOpacity="0.15" />
              <circle cx={pt.x} cy={pt.y} r="4" fill={projectedColor} />
              <circle cx={pt.x} cy={pt.y} r="1.8" fill="white" />
            </g>
          ) : (
            <g key={`forecast-${pt.label}`}>
              <circle cx={pt.x} cy={pt.y} r="4.5" fill={projectedColor} fillOpacity="0.1" />
              <circle cx={pt.x} cy={pt.y} r="2.6" fill={projectedColor} fillOpacity="0.35" />
            </g>
          ),
        )}

        {/* X축 레이블 */}
        {actualTimeTicks.map((tick) => (
          <text
            key={`xt-${tick.x}`}
            x={tick.x}
            y={height - 7}
            textAnchor="middle"
            fontSize="10"
            fill="rgba(148, 163, 184, 0.85)"
          >
            {tick.label}
          </text>
        ))}

        {finalForecast ? (
          <text
            key={`forecast-label-${finalForecast.label}`}
            x={finalForecast.x}
            y={height - 7}
            textAnchor="middle"
            fontSize="10"
            fill={hexToRgba(projectedColor, 0.92)}
          >
            {finalForecastAxisLabel}
          </text>
        ) : null}

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
          <p className="text-[10px] text-slate-400">
            {hovered.label}
            {hoveredTarget?.kind === "forecast" ? " 예상" : ""}
          </p>
          <p className="mt-0.5 text-sm font-bold text-white">
            {hoveredTarget?.kind === "forecast" ? "약 " : ""}
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
  forecastPoints,
  aiBandPoints,
  color,
  forecastColor,
  rangeFrom,
  rangeTo,
  unit,
}: {
  title: string;
  points: SeriesPoint[];
  forecastPoints?: SeriesPoint[];
  aiBandPoints?: AiForecastBandPoint[];
  color: string;
  forecastColor?: string;
  rangeFrom?: string;
  rangeTo?: string;
  unit: "percent" | "ms";
}) {
  const projectedColor = forecastColor ?? color;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1a2029]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold">{title}</h3>
        <div className="flex items-center gap-2">
          {aiBandPoints?.length ? (
            <span
              className="rounded-full border px-3 py-1 text-xs font-semibold"
              style={{
                borderColor: hexToRgba(projectedColor, 0.22),
                backgroundColor: hexToRgba(projectedColor, 0.08),
                color: projectedColor,
              }}
            >
              AI 범위
            </span>
          ) : null}
          {forecastPoints?.length ? (
            <span
              className="rounded-full border px-3 py-1 text-xs font-semibold"
              style={{
                borderColor: hexToRgba(projectedColor, 0.28),
                backgroundColor: hexToRgba(projectedColor, 0.1),
                color: projectedColor,
              }}
            >
              산술선
            </span>
          ) : null}
          {points.length > 0 ? (
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              latest {formatMetricValue(points[points.length - 1].value, unit)}
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-5">
        <LineChart
          aiBandPoints={aiBandPoints}
          color={color}
          forecastColor={forecastColor}
          forecastPoints={forecastPoints}
          points={points}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          unit={unit}
        />
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
  const forecastMetrics = data?.overview.forecast?.metrics ?? [];
  const forecastChartSeries = data?.overview.forecast?.chartSeries;
  const aiForecastMetrics = data?.overview.aiForecast?.metrics ?? [];
  const aiForecastChartSeries = data?.overview.aiForecast?.chartSeries;
  const cpuForecast = resolveForecastSeries(forecastChartSeries, forecastMetrics, "cpu");
  const memoryForecast = resolveForecastSeries(forecastChartSeries, forecastMetrics, "memory");
  const latencyForecast = resolveForecastSeries(forecastChartSeries, forecastMetrics, "latency");
  const errorRateForecast = resolveForecastSeries(
    forecastChartSeries,
    forecastMetrics,
    "error_rate",
  );
  const cpuAiBand = resolveAiForecastSeries(aiForecastChartSeries, aiForecastMetrics, "cpu");
  const memoryAiBand = resolveAiForecastSeries(aiForecastChartSeries, aiForecastMetrics, "memory");
  const latencyAiBand = resolveAiForecastSeries(aiForecastChartSeries, aiForecastMetrics, "latency");
  const errorRateAiBand = resolveAiForecastSeries(
    aiForecastChartSeries,
    aiForecastMetrics,
    "error_rate",
  );

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
      setError("사용자 지정 기간은 시작/종료 날짜가 모두 필요합니다.");
      return;
    }

    const fromDate = new Date(`${customFrom}T00:00:00`);
    const toDate = new Date(`${customTo}T23:59:59`);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      setError("사용자 지정 날짜 형식이 올바르지 않습니다.");
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
                      <span className="mb-1 block">시작일</span>
                      <input
                        type="date"
                        value={customFrom}
                        onChange={(event) => {
                          setSelectedPreset("custom");
                          setCustomFrom(event.target.value);
                        }}
                        className="native-date-input w-full max-w-[180px] min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-[#131820] dark:text-slate-100"
                      />
                    </label>
                    <label className="flex min-w-0 flex-col text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span className="mb-1 block">종료일</span>
                      <input
                        type="date"
                        value={customTo}
                        onChange={(event) => {
                          setSelectedPreset("custom");
                          setCustomTo(event.target.value);
                        }}
                        className="native-date-input w-full max-w-[180px] min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-[#131820] dark:text-slate-100"
                      />
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
                aiBandPoints={cpuAiBand}
                color="#2a6ef5"
                forecastPoints={cpuForecast}
                points={data?.overview.series.cpuUsage ?? []}
                rangeFrom={data?.overview.timeRange?.from}
                rangeTo={data?.overview.timeRange?.to}
                unit="percent"
              />

              <MetricPanel
                title="메모리 평균"
                aiBandPoints={memoryAiBand}
                color="#16a34a"
                forecastPoints={memoryForecast}
                points={data?.overview.series.memoryUsage ?? []}
                rangeFrom={data?.overview.timeRange?.from}
                rangeTo={data?.overview.timeRange?.to}
                unit="percent"
              />

              <MetricPanel
                title="P95 Latency"
                aiBandPoints={latencyAiBand}
                color="#f59e0b"
                forecastPoints={latencyForecast}
                points={data?.overview.series.latencyMs ?? []}
                rangeFrom={data?.overview.timeRange?.from}
                rangeTo={data?.overview.timeRange?.to}
                unit="ms"
              />

              <MetricPanel
                title="에러율"
                aiBandPoints={errorRateAiBand}
                color="#ef4444"
                forecastPoints={errorRateForecast}
                points={data?.overview.series.errorRatePercent ?? []}
                rangeFrom={data?.overview.timeRange?.from}
                rangeTo={data?.overview.timeRange?.to}
                unit="percent"
              />
            </section>

            {data?.overview.forecast?.metrics?.length ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1a2029]">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.22em] text-[#2a6ef5] uppercase">
                      Forecast Table
                    </p>
                    <h3 className="mt-1 text-lg font-bold">예상 메트릭 사용량</h3>
                  </div>
                  {data.overview.forecast.methodology ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {data.overview.forecast.methodology}
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="min-w-[980px] w-full table-fixed border-collapse">
                    <colgroup>
                      <col className="w-[38%]" />
                      <col className="w-[11%]" />
                      <col className="w-[11%]" />
                      <col className="w-[11%]" />
                      <col className="w-[11%]" />
                      <col className="w-[18%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-[0.12em] text-slate-500 uppercase dark:border-slate-800 dark:bg-[#131820] dark:text-slate-400">
                        <th className="px-5 py-3 text-left">지표</th>
                        <th className="px-4 py-3 text-right">현재</th>
                        <th className="px-4 py-3 text-right">1시간 후</th>
                        <th className="px-4 py-3 text-right">6시간 후</th>
                        <th className="px-4 py-3 text-right">24시간 후</th>
                        <th className="px-5 py-3 text-center">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {data.overview.forecast.metrics.map((metric) => {
                        const unit = metric.unit === "ms" ? "ms" : "percent";
                        return (
                          <tr key={metric.key} className="align-middle">
                            <td className="px-5 py-5">
                              <div className="max-w-[30rem]">
                                <p className="text-[15px] font-semibold text-slate-900 dark:text-white">
                                  {metric.label}
                                </p>
                                <p className="mt-2 min-h-[3rem] break-keep text-sm leading-6 text-slate-500 dark:text-slate-400">
                                  {metric.detail}
                                </p>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-5 text-right text-[15px] font-semibold tabular-nums text-slate-900 dark:text-white">
                              {formatMetricValue(metric.currentValue, unit)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-5 text-right text-[15px] tabular-nums text-slate-600 dark:text-slate-300">
                              {formatMetricValue(metric.forecast1h, unit)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-5 text-right text-[15px] tabular-nums text-slate-600 dark:text-slate-300">
                              {formatMetricValue(metric.forecast6h, unit)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-5 text-right text-[15px] font-semibold tabular-nums text-[#2a6ef5]">
                              {formatMetricValue(metric.forecast24h, unit)}
                            </td>
                            <td className="px-5 py-5 text-center">
                              <span className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-bold ${forecastToneClass(metric.statusLabel)}`}>
                                {metric.statusLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
