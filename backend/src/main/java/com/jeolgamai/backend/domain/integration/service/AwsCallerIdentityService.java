package com.jeolgamai.backend.domain.integration.service;

import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sts.StsClient;
import software.amazon.awssdk.services.sts.model.GetCallerIdentityRequest;
import software.amazon.awssdk.services.sts.model.GetCallerIdentityResponse;

@Service
public class AwsCallerIdentityService {

    public AwsCallerIdentity resolve(String region, AwsCredentialsProvider credentialsProvider) {
        try (StsClient stsClient = StsClient.builder()
                .region(Region.of(region))
                .credentialsProvider(credentialsProvider)
                .build()) {
            GetCallerIdentityResponse response = stsClient.getCallerIdentity(GetCallerIdentityRequest.builder().build());
            return new AwsCallerIdentity(response.account(), response.arn());
        }
    }

    public record AwsCallerIdentity(
            String accountId,
            String callerArn
    ) {
    }
}
