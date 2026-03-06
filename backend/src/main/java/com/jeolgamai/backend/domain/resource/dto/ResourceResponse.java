package com.jeolgamai.backend.domain.resource.dto;

public record ResourceResponse(
        Long id,
        String team,
        String service,
        String region
) {
}
