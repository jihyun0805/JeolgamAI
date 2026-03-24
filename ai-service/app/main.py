from __future__ import annotations

from datetime import datetime
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field

from .forecasting import (
    MetricPoint,
    build_chart_bands,
    horizon_bands,
    infer_step_seconds,
    round_metric,
    select_strategy,
)


class HealthResponse(BaseModel):
    status: Literal["ok"]


class SeriesPointInput(BaseModel):
    timestamp: datetime
    value: float


class MetricSeriesInput(BaseModel):
    key: str
    label: str
    unit: str
    points: list[SeriesPointInput]
    strategy: str | None = None


class ForecastRequest(BaseModel):
    workspaceId: str | None = None
    fromTs: datetime | None = Field(default=None, alias="from")
    toTs: datetime | None = Field(default=None, alias="to")
    stepSeconds: int | None = None
    metrics: list[MetricSeriesInput]

    class Config:
        populate_by_name = True


class RangeValue(BaseModel):
    lower: float
    base: float
    upper: float


class ForecastMetricResponse(BaseModel):
    key: str
    label: str
    unit: str
    strategy: str
    currentValue: float
    forecast1h: RangeValue
    forecast6h: RangeValue
    forecast24h: RangeValue


class ForecastChartPoint(BaseModel):
    timestamp: datetime
    lower: float
    base: float
    upper: float


class ForecastChartSeries(BaseModel):
    key: str
    points: list[ForecastChartPoint]


class ForecastResponse(BaseModel):
    methodology: str
    metrics: list[ForecastMetricResponse]
    chartSeries: list[ForecastChartSeries]


app = FastAPI(
    title="JeolgamAI Forecast Service",
    version="0.1.0",
    description="FastAPI service for infrastructure metric range forecasts",
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.post("/v1/forecast/metrics", response_model=ForecastResponse)
def forecast_metrics(payload: ForecastRequest) -> ForecastResponse:
    metrics: list[ForecastMetricResponse] = []
    chart_series: list[ForecastChartSeries] = []

    for metric in payload.metrics:
        points = [MetricPoint(timestamp=point.timestamp, value=point.value) for point in metric.points]
        if not points:
            continue

        step_seconds = infer_step_seconds(points, payload.stepSeconds)
        range_seconds = max(
            step_seconds,
            int((payload.toTs - payload.fromTs).total_seconds()) if payload.fromTs and payload.toTs else step_seconds * max(1, len(points) - 1),
        )
        strategy = select_strategy(metric.key, metric.strategy)
        bands = horizon_bands(metric.key, strategy, points, step_seconds, [3600, 21600, 86400])
        chart_bands = build_chart_bands(metric.key, strategy, points, step_seconds, range_seconds)

        metrics.append(
            ForecastMetricResponse(
                key=metric.key,
                label=metric.label,
                unit=metric.unit,
                strategy=strategy,
                currentValue=round_metric(points[-1].value),
                forecast1h=RangeValue(**bands[3600].__dict__),
                forecast6h=RangeValue(**bands[21600].__dict__),
                forecast24h=RangeValue(**bands[86400].__dict__),
            )
        )
        chart_series.append(
            ForecastChartSeries(
                key=metric.key,
                points=[
                    ForecastChartPoint(
                        timestamp=timestamp,
                        lower=band.lower,
                        base=band.base,
                        upper=band.upper,
                    )
                    for timestamp, band in chart_bands
                ],
            )
        )

    return ForecastResponse(
        methodology="Notebook validation에서 선택된 전략(baseline/median3)을 사용하고, 최근 residual과 변동성을 결합해 lower/base/upper 범위를 생성합니다.",
        metrics=metrics,
        chartSeries=chart_series,
    )
