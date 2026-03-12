package com.jeolgamai.backend.domain.prometheusintegration.dto;

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
public class PrometheusIntegrationCreateRequest {

    @NotBlank
    @Size(max = 100)
    private String integrationName;

    @NotBlank
    @Pattern(regexp = "^https?://.+$", message = "Base URL must start with http:// or https://")
    @Size(max = 255)
    private String baseUrl;

    @NotBlank
    @Size(max = 4000)
    private String apiToken;

    private boolean includeLatencyQuery;
}
