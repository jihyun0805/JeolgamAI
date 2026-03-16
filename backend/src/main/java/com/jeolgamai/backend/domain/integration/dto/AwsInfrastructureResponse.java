package com.jeolgamai.backend.domain.integration.dto;

import java.util.List;

public record AwsInfrastructureResponse(
        String mode,
        String workspaceId,
        String region,
        Summary summary,
        List<ServiceCost> costByService,
        List<Resource> resources,
        List<String> warnings
) {
    public record Summary(
            double monthToDateCost,
            int ec2InstanceCount,
            int rdsInstanceCount,
            int s3BucketCount
    ) {
    }

    public record ServiceCost(
            String service,
            double monthToDateCost,
            int resourceCount
    ) {
    }

    public record Resource(
            String id,
            String name,
            String type,
            String status,
            String region
    ) {
    }
}
