package com.jeolgamai.backend.domain.recommend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RecommendRequest {

    @NotNull
    private Long resourceId;

    @PositiveOrZero
    private double estimatedSavings;

    @Min(0)
    @Max(100)
    private double riskScore;

    @Min(0)
    @Max(100)
    private double feasibilityScore;

    @Min(0)
    @Max(100)
    private double priorityScore;

    @NotBlank
    private String status;
}
