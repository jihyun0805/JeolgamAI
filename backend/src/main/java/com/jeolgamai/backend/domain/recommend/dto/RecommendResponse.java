package com.jeolgamai.backend.domain.recommend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RecommendResponse {

    private Long id;
    private Long resourceId;
    private double estimatedSavings;
    private double riskScore;
    private double feasibilityScore;
    private double priorityScore;
    private String status;
}
