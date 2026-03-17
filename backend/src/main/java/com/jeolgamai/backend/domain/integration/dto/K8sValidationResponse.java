package com.jeolgamai.backend.domain.integration.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class K8sValidationResponse {

    private String mode;

    private String status;

    private List<K8sValidationCheckResponse> checks;
}
