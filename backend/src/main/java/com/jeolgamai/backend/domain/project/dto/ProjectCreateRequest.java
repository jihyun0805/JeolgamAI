package com.jeolgamai.backend.domain.project.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProjectCreateRequest {

    @NotBlank
    @Size(max = 100)
    private String projectName;

    @NotNull
    private Long userId;

    @NotNull
    private Long awsIntegrationId;

    @NotNull
    private Long prometheusIntegrationId;

    @NotNull
    private Long kubernetesIntegrationId;
}
