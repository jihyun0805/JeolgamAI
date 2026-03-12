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
    @Pattern(
            regexp = "^(Cross-account IAM Role|Access Key \\(fallback\\))$",
            message = "authMethod must be either 'Cross-account IAM Role' or 'Access Key (fallback)'"
    )
    private String authMethod;

    @Pattern(regexp = "^arn:aws:iam::\\d{12}:role/.+$", message = "Invalid IAM Role ARN format")
    private String roleArn;

    @Size(max = 255)
    private String externalId;

    @Size(max = 128)
    private String accessKeyId;

    @Size(max = 255)
    private String secretAccessKey;
}
