package com.jeolgamai.backend.domain.cost.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyCostSummaryResponse {

    private String project;
    private List<String> integrations;
    private double totalMonthlyCost;
}
