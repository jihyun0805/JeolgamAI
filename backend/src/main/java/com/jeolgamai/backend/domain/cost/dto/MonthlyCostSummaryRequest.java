package com.jeolgamai.backend.domain.cost.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyCostSummaryRequest {

    @NotBlank
    private String project;

    @NotEmpty
    @Size(min = 1, max = 3)
    private List<@NotBlank String> integrations;
}
