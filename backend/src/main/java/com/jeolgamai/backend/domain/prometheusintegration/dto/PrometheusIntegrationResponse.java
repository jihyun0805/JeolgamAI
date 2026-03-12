package com.jeolgamai.backend.domain.prometheusintegration.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PrometheusIntegrationResponse {

    private Long id;
    private String integrationName;
    private String baseUrl;
    private String apiTokenMasked;
    private boolean includeLatencyQuery;
    private LocalDateTime createdAt;
}
