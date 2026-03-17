package com.jeolgamai.backend.domain.integration.service;

import com.jeolgamai.backend.domain.integration.dto.AwsInfrastructureResponse;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.costexplorer.CostExplorerClient;
import software.amazon.awssdk.services.costexplorer.model.GetCostAndUsageRequest;
import software.amazon.awssdk.services.costexplorer.model.GetCostAndUsageResponse;
import software.amazon.awssdk.services.costexplorer.model.Granularity;
import software.amazon.awssdk.services.costexplorer.model.GroupDefinition;
import software.amazon.awssdk.services.costexplorer.model.GroupDefinitionType;
import software.amazon.awssdk.services.ec2.Ec2Client;
import software.amazon.awssdk.services.ec2.model.DescribeInstancesRequest;
import software.amazon.awssdk.services.ec2.model.DescribeInstancesResponse;
import software.amazon.awssdk.services.rds.RdsClient;
import software.amazon.awssdk.services.rds.model.DBInstance;
import software.amazon.awssdk.services.rds.model.DescribeDbInstancesRequest;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.Bucket;
import software.amazon.awssdk.services.s3.model.BucketLocationConstraint;
import software.amazon.awssdk.services.s3.model.GetBucketLocationRequest;
import software.amazon.awssdk.services.s3.model.ListBucketsRequest;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AwsInfrastructureService {

    private final ConnectorRegistryService connectorRegistryService;
    private final AwsValidationService awsValidationService;

    public AwsInfrastructureService(
            ConnectorRegistryService connectorRegistryService,
            AwsValidationService awsValidationService
    ) {
        this.connectorRegistryService = connectorRegistryService;
        this.awsValidationService = awsValidationService;
    }

    public AwsInfrastructureResponse getInfrastructure(String workspaceId) {
        ConnectorRegistryService.AwsConnectorConfig connector = connectorRegistryService
                .getAwsConnector(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("AWS connector가 backend에 등록되어 있지 않습니다."));

        AwsCredentialsProvider credentialsProvider = awsValidationService.createCredentialsProvider(connector);
        Region region = Region.of(connector.region());

        List<String> warnings = new ArrayList<>();
        List<AwsInfrastructureResponse.Resource> resources = new ArrayList<>();
        Map<String, Integer> resourceCountByService = new LinkedHashMap<>();
        resourceCountByService.put("Amazon Elastic Compute Cloud - Compute", 0);
        resourceCountByService.put("Amazon Relational Database Service", 0);
        resourceCountByService.put("Amazon Simple Storage Service", 0);

        try (Ec2Client ec2Client = Ec2Client.builder()
                .region(region)
                .credentialsProvider(credentialsProvider)
                .build();
             RdsClient rdsClient = RdsClient.builder()
                     .region(region)
                     .credentialsProvider(credentialsProvider)
                     .build();
             S3Client s3Client = S3Client.builder()
                     .region(region)
                     .credentialsProvider(credentialsProvider)
                     .build();
             CostExplorerClient costExplorerClient = CostExplorerClient.builder()
                     .region(Region.US_EAST_1)
                     .credentialsProvider(credentialsProvider)
                     .build()) {

            DescribeInstancesResponse ec2Response = ec2Client.describeInstances(
                    DescribeInstancesRequest.builder().maxResults(50).build()
            );
            ec2Response.reservations().forEach(reservation ->
                    reservation.instances().forEach(instance -> resources.add(
                            new AwsInfrastructureResponse.Resource(
                                    instance.instanceId(),
                                    instance.tags().stream()
                                            .filter(tag -> "Name".equals(tag.key()))
                                            .map(tag -> tag.value())
                                            .findFirst()
                                            .orElse(instance.instanceId()),
                                    "EC2",
                                    instance.state() == null ? "-" : instance.state().nameAsString(),
                                    connector.region()
                            )
                    ))
            );
            resourceCountByService.put("Amazon Elastic Compute Cloud - Compute", resources.size());

            int rdsCount = 0;
            for (DBInstance instance : rdsClient.describeDBInstances(
                    DescribeDbInstancesRequest.builder().maxRecords(50).build()
            ).dbInstances()) {
                rdsCount += 1;
                resources.add(new AwsInfrastructureResponse.Resource(
                        instance.dbInstanceIdentifier(),
                        instance.dbInstanceIdentifier(),
                        "RDS",
                        instance.dbInstanceStatus(),
                        connector.region()
                ));
            }
            resourceCountByService.put("Amazon Relational Database Service", rdsCount);

            int bucketCount = 0;
            for (Bucket bucket : s3Client.listBuckets(ListBucketsRequest.builder().build()).buckets()) {
                try {
                    BucketLocationConstraint location = s3Client.getBucketLocation(
                            GetBucketLocationRequest.builder().bucket(bucket.name()).build()
                    ).locationConstraint();
                    String bucketRegion = location == null || location == BucketLocationConstraint.UNKNOWN_TO_SDK_VERSION
                            ? "us-east-1"
                            : location.toString();
                    if (!connector.region().equals(bucketRegion)) {
                        continue;
                    }
                    bucketCount += 1;
                    resources.add(new AwsInfrastructureResponse.Resource(
                            bucket.name(),
                            bucket.name(),
                            "S3",
                            "Available",
                            bucketRegion
                    ));
                } catch (Exception exception) {
                    warnings.add("S3 bucket location 조회 실패: " + bucket.name());
                }
            }
            resourceCountByService.put("Amazon Simple Storage Service", bucketCount);

            List<AwsInfrastructureResponse.ServiceCost> costByService = loadServiceCosts(
                    costExplorerClient,
                    resourceCountByService
            );

            double totalCost = costByService.stream()
                    .mapToDouble(AwsInfrastructureResponse.ServiceCost::monthToDateCost)
                    .sum();

            resources.sort(Comparator.comparing(AwsInfrastructureResponse.Resource::type)
                    .thenComparing(AwsInfrastructureResponse.Resource::name));

            return new AwsInfrastructureResponse(
                    "live",
                    workspaceId,
                    connector.region(),
                    new AwsInfrastructureResponse.Summary(
                            round(totalCost),
                            resourceCountByService.get("Amazon Elastic Compute Cloud - Compute"),
                            resourceCountByService.get("Amazon Relational Database Service"),
                            resourceCountByService.get("Amazon Simple Storage Service")
                    ),
                    costByService,
                    resources,
                    warnings
            );
        }
    }

    private List<AwsInfrastructureResponse.ServiceCost> loadServiceCosts(
            CostExplorerClient costExplorerClient,
            Map<String, Integer> resourceCountByService
    ) {
        LocalDate today = LocalDate.now();
        LocalDate start = today.withDayOfMonth(1);
        LocalDate endExclusive = today.plusDays(1);

        GetCostAndUsageResponse response = costExplorerClient.getCostAndUsage(
                GetCostAndUsageRequest.builder()
                        .timePeriod(builder -> builder.start(start.toString()).end(endExclusive.toString()))
                        .granularity(Granularity.MONTHLY)
                        .metrics("UnblendedCost")
                        .groupBy(GroupDefinition.builder()
                                .type(GroupDefinitionType.DIMENSION)
                                .key("SERVICE")
                                .build())
                        .build()
        );

        Map<String, Double> amountByService = new LinkedHashMap<>();
        response.resultsByTime().forEach(timeResult ->
                timeResult.groups().forEach(group -> {
                    if (group.keys().isEmpty()) {
                        return;
                    }
                    String service = group.keys().get(0);
                    String amount = group.metrics().get("UnblendedCost") == null
                            ? "0"
                            : group.metrics().get("UnblendedCost").amount();
                    amountByService.put(service, Double.parseDouble(amount));
                })
        );

        List<AwsInfrastructureResponse.ServiceCost> costs = new ArrayList<>();
        resourceCountByService.forEach((service, count) -> costs.add(
                new AwsInfrastructureResponse.ServiceCost(
                        service,
                        round(amountByService.getOrDefault(service, 0D)),
                        count
                )
        ));
        costs.sort(Comparator.comparing(AwsInfrastructureResponse.ServiceCost::monthToDateCost).reversed());
        return costs;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
