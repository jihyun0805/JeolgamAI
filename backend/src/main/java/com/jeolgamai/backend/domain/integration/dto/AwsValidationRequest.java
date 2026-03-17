package com.jeolgamai.backend.domain.integration.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AwsValidationRequest {

    @NotBlank
    private String workspaceId;

    @NotBlank
    private String authMode;

    @NotBlank
    private String region;

    private String roleArn;

    private String externalId;

    private String accessKeyId;

    private String secretAccessKey;
}
