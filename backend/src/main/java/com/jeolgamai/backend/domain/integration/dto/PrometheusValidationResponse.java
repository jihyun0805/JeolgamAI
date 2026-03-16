package com.jeolgamai.backend.domain.integration.dto;

import java.util.List;

public record PrometheusValidationResponse(
        String mode,
        String status,
        List<Check> checks
) {
    public record Check(
            String key,
            boolean passed,
            String message
    ) {
    }
}
