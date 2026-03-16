package com.jeolgamai.backend.domain.integration.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class K8sValidationRequest {

    @NotBlank
    private String workspaceId;

    @NotBlank
    private String apiServerUrl;

    @NotBlank
    private String token;

    private String clusterName;

    private String caCertPem;
}
