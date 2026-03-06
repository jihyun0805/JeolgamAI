package com.jeolgamai.backend.domain.recommend.dto;

public record RecommendResponse(
        Long id,
        Long resourceId,
        double estimatedSavings,
        double riskScore,
        double feasibilityScore,
        double priorityScore,
        String status
) {
}
