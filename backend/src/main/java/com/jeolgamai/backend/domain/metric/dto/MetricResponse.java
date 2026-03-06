package com.jeolgamai.backend.domain.metric.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MetricResponse {

    private Long id;
    private Long resourceId;
    private double cpuAvg;
    private double memoryAvg;
}
