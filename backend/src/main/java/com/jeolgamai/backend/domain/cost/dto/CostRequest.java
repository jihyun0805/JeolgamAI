package com.jeolgamai.backend.domain.cost.dto;

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
public class CostRequest {

    @NotNull
    private Long resourceId;

    @PositiveOrZero
    private double monthlyCost;
}
