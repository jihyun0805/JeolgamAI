package com.jeolgamai.backend.domain.project.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProjectResponse {

    private Long id;
    private String projectName;
    private Long userId;
    private Long awsIntegrationId;
    private Long prometheusIntegrationId;
    private Long kubernetesIntegrationId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
