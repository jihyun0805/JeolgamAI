package com.jeolgamai.backend.domain.resource.dto;

import jakarta.validation.constraints.NotBlank;

public record ResourceRequest(
        @NotBlank String team,
        @NotBlank String service,
        @NotBlank String region
) {
}
