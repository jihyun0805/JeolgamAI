package com.jeolgamai.backend.domain.recommend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record RecommendRequest(
        @NotNull Long resourceId,
        @PositiveOrZero double estimatedSavings,
        @Min(0) @Max(100) double riskScore,
        @Min(0) @Max(100) double feasibilityScore,
        @Min(0) @Max(100) double priorityScore,
        @NotBlank String status
) {
}
