package com.jeolgamai.backend.domain.kubernetesintegration.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class KubernetesIntegrationResponse {

    private Long id;
    private String integrationName;
    private String clusterName;
    private String apiServerUrl;
    private String readOnlyTokenMasked;
    private LocalDateTime createdAt;
}
