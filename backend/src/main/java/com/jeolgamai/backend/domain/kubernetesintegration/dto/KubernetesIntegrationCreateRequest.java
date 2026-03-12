package com.jeolgamai.backend.domain.kubernetesintegration.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class KubernetesIntegrationCreateRequest {

    @NotBlank
    @Size(max = 100)
    private String integrationName;

    @NotBlank
    @Size(max = 100)
    private String clusterName;

    @NotBlank
    @Pattern(regexp = "^https?://.+$", message = "API server URL must start with http:// or https://")
    @Size(max = 255)
    private String apiServerUrl;

    @NotBlank
    @Size(max = 4000)
    private String readOnlyToken;
}
