package com.jeolgamai.backend.domain.integration.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PrometheusValidationRequest {

    @NotBlank
    private String workspaceId;

    @NotBlank
    private String baseUrl;

    @NotBlank
    private String authMode;

    private String username;

    private String password;

    private String token;
}
