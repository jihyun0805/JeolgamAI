package com.jeolgamai.backend.domain.awsintegration.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AwsIntegrationCreateRequest {

    @NotBlank
    @Size(max = 100)
    private String integrationName;

    @NotBlank
    @Pattern(regexp = "^[a-z]{2}(-gov)?-[a-z]+-\\d$", message = "Invalid AWS region format")
    private String region;

    @NotBlank
    @Size(max = 50)
    private String authMethod;

    @NotBlank
    @Pattern(regexp = "^arn:aws:iam::\\d{12}:role/.+$", message = "Invalid IAM Role ARN format")
    private String roleArn;

    @NotBlank
    @Size(max = 255)
    private String externalId;
}
