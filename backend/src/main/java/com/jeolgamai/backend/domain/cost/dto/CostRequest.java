package com.jeolgamai.backend.domain.cost.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record CostRequest(
        @NotNull Long resourceId,
        @PositiveOrZero double monthlyCost
) {
}
