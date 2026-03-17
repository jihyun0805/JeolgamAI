package com.jeolgamai.backend.domain.integration.dto;

import java.util.List;

public record PrometheusOverviewResponse(
        String mode,
        String workspaceId,
        String baseUrl,
        String authMode,
        Summary summary,
        Series series,
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

    public record TimeRange(
            String from,
            String to,
            long stepSeconds
    ) {
    }
}
