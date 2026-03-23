package com.jeolgamai.backend.domain.integration.dto;

import java.util.List;

public record PrometheusOverviewResponse(
        String mode,
        String workspaceId,
        String baseUrl,
        String authMode,
        Summary summary,
        Series series,
        Forecast forecast,
        TimeRange timeRange,
        List<String> warnings
) {
    public record Summary(
            double cpuUsagePercent,
            double memoryUsagePercent,
            double p95LatencyMs,
            double errorRatePercent,
            double scrapeHealthPercent
    ) {
    }

    public record Series(
            List<Point> cpuUsage,
            List<Point> memoryUsage,
            List<Point> latencyMs,
            List<Point> errorRatePercent
    ) {
    }

    public record Point(
            String label,
            double value
    ) {
    }

    public record Forecast(
            String methodology,
            List<ForecastMetric> metrics,
            List<ForecastSeries> chartSeries
    ) {
    }

    public record ForecastMetric(
            String key,
            String label,
            String unit,
            double currentValue,
            double forecast1h,
            double forecast6h,
            double forecast24h,
            String statusLabel,
            String detail
    ) {
    }

    public record ForecastSeries(
            String key,
            List<Point> points
    ) {
    }

    public record TimeRange(
            String from,
            String to,
            long stepSeconds
    ) {
    }
}
