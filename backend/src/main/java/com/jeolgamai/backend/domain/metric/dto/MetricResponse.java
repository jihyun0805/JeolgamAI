package com.jeolgamai.backend.domain.metric.dto;

public record MetricResponse(
        Long id,
        Long resourceId,
        double cpuAvg,
        double memoryAvg
) {
}
