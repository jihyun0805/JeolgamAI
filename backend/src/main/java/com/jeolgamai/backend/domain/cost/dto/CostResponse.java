package com.jeolgamai.backend.domain.cost.dto;

public record CostResponse(
        Long id,
        Long resourceId,
        double monthlyCost
) {
}
