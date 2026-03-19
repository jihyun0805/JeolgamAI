package com.jeolgamai.backend.domain.awsintegration.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AwsIntegrationResponse {

    private String workspaceId;
    private String integrationName;
    private String region;
    private String authMethod;
    private String roleArn;
    private String externalId;
    private String accessKeyId;
    private String accountId;
    private String callerArn;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime validatedAt;
}
