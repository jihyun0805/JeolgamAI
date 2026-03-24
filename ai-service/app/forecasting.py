from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from math import sqrt
from statistics import mean, median, pstdev
from typing import Iterable


DEFAULT_FORECAST_RATIO = 0.25
RESIDUAL_WINDOW = 24
RECENT_WINDOW = 5
MEDIAN_WINDOW = 3
UNCERTAINTY_SCALE = 1.15


STRATEGY_BY_METRIC = {
    "cpu": "median3",
    "memory": "baseline",
    "latency": "median3",
    "error_rate": "median3",
}


BOUNDS_BY_METRIC = {
    "cpu": (0.0, 100.0),
    "memory": (0.0, 100.0),
    "latency": (0.0, None),
    "error_rate": (0.0, 100.0),
}


@dataclass(frozen=True)
class MetricPoint:
    timestamp: datetime
    value: float


@dataclass(frozen=True)
class ForecastBand:
    lower: float
    base: float
    upper: float


def clamp(value: float, minimum: float | None, maximum: float | None) -> float:
    if minimum is not None and value < minimum:
        value = minimum
    if maximum is not None and value > maximum:
        value = maximum
    return value


def round_metric(value: float) -> float:
    return round(value, 2)


def infer_step_seconds(points: list[MetricPoint], fallback: int | None = None) -> int:
    if fallback and fallback > 0:
        return fallback
    if len(points) < 2:
        return 3600
    deltas = [
        max(1, int((points[index].timestamp - points[index - 1].timestamp).total_seconds()))
        for index in range(1, len(points))
    ]
    return round(mean(deltas)) if deltas else 3600


def select_strategy(metric_key: str, override: str | None = None) -> str:
    if override:
        return override
    return STRATEGY_BY_METRIC.get(metric_key, "baseline")


def recent_values(points: list[MetricPoint], window: int = RECENT_WINDOW) -> list[float]:
    return [point.value for point in points[-window:]]


def point_forecast(strategy: str, values: list[float]) -> float:
    if not values:
        return 0.0
    if strategy == "zero":
        return 0.0
    if strategy == "median3":
        return median(values[-MEDIAN_WINDOW:])
    if strategy == "mean5":
        return mean(values[-RECENT_WINDOW:])
    return values[-1]


def backtest_mae(strategy: str, values: list[float]) -> float:
    if len(values) < 4:
        return 0.0

    start_index = max(1, len(values) - RESIDUAL_WINDOW)
    residuals: list[float] = []
    for index in range(start_index, len(values)):
        history = values[:index]
        prediction = point_forecast(strategy, history)
        residuals.append(abs(values[index] - prediction))
    return mean(residuals) if residuals else 0.0


def diff_volatility(values: list[float]) -> float:
    if len(values) < 3:
        return 0.0
    diffs = [values[index] - values[index - 1] for index in range(1, len(values))]
    return pstdev(diffs[-RECENT_WINDOW:]) if len(diffs) > 1 else abs(diffs[-1])


def build_band(metric_key: str, strategy: str, values: list[float], horizon_steps: float) -> ForecastBand:
    minimum, maximum = BOUNDS_BY_METRIC.get(metric_key, (0.0, None))
    base = point_forecast(strategy, values)

    residual_mae = backtest_mae(strategy, values)
    volatility = diff_volatility(values)
    horizon_scale = max(1.0, sqrt(max(1.0, horizon_steps)))
    uncertainty = max(residual_mae, volatility * horizon_scale) * UNCERTAINTY_SCALE

    if metric_key == "error_rate" and max(values[-MEDIAN_WINDOW:], default=0.0) <= 0.05:
        uncertainty = min(uncertainty, 0.15)

    lower = clamp(base - uncertainty, minimum, maximum)
    upper = clamp(base + uncertainty, minimum, maximum)
    base = clamp(base, minimum, maximum)

    return ForecastBand(
        lower=round_metric(lower),
        base=round_metric(base),
        upper=round_metric(upper),
    )


def horizon_bands(
    metric_key: str,
    strategy: str,
    points: list[MetricPoint],
    step_seconds: int,
    horizons_seconds: Iterable[int],
) -> dict[int, ForecastBand]:
    values = [point.value for point in points]
    return {
        horizon: build_band(metric_key, strategy, values, max(1.0, horizon / max(step_seconds, 1)))
        for horizon in horizons_seconds
    }


def build_chart_bands(
    metric_key: str,
    strategy: str,
    points: list[MetricPoint],
    step_seconds: int,
    range_seconds: int,
) -> list[tuple[datetime, ForecastBand]]:
    if not points:
        return []
    forecast_window_seconds = max(step_seconds, int(range_seconds * DEFAULT_FORECAST_RATIO))
    values = [point.value for point in points]
    bands: list[tuple[datetime, ForecastBand]] = []
    horizon = step_seconds
    while horizon <= forecast_window_seconds:
        timestamp = points[-1].timestamp + timedelta(seconds=horizon)
        band = build_band(metric_key, strategy, values, max(1.0, horizon / max(step_seconds, 1)))
        bands.append((timestamp, band))
        horizon += step_seconds
    if not bands:
        bands.append((points[-1].timestamp + timedelta(seconds=step_seconds), build_band(metric_key, strategy, values, 1.0)))
    return bands
