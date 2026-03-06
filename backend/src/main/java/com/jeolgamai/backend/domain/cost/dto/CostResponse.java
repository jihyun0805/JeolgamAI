package com.jeolgamai.backend.domain.cost.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CostResponse {

    private Long id;
    private Long resourceId;
    private double monthlyCost;
}
