package com.jeolgamai.backend.domain.metric.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record MetricRequest(
        @NotNull Long resourceId,
        @Min(0) @Max(100) double cpuAvg,
        @Min(0) @Max(100) double memoryAvg
) {
}
