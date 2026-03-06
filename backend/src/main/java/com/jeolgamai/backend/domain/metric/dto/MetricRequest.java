package com.jeolgamai.backend.domain.metric.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MetricRequest {

    @NotNull
    private Long resourceId;

    @Min(0)
    @Max(100)
    private double cpuAvg;

    @Min(0)
    @Max(100)
    private double memoryAvg;
}
