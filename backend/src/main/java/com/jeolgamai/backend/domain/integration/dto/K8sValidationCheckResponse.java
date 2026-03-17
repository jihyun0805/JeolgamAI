package com.jeolgamai.backend.domain.integration.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class K8sValidationCheckResponse {

    private String key;

    private boolean passed;

    private String message;
}
