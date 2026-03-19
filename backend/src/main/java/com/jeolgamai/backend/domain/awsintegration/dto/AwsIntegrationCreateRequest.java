package com.jeolgamai.backend.domain.awsintegration.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
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
    @Size(max = 191)
    private String workspaceId;

    @NotBlank
    @Size(max = 100)
    @JsonAlias("name")
    private String integrationName;

    @NotBlank
    @Pattern(regexp = "^[a-z]{2}(-gov)?-[a-z]+-\\d$", message = "Invalid AWS region format")
    private String region;

    @NotBlank
    @JsonAlias("authMode")
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
