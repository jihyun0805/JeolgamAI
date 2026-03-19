package com.jeolgamai.backend.domain.integration.service;

import com.jeolgamai.backend.domain.integration.dto.AwsValidationRequest;
import com.jeolgamai.backend.domain.integration.dto.AwsValidationResponse;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.AwsSessionCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.costexplorer.CostExplorerClient;
import software.amazon.awssdk.services.costexplorer.model.GetCostAndUsageRequest;
import software.amazon.awssdk.services.costexplorer.model.Granularity;
import software.amazon.awssdk.services.ec2.Ec2Client;
import software.amazon.awssdk.services.ec2.model.DescribeRegionsRequest;
import software.amazon.awssdk.services.rds.RdsClient;
import software.amazon.awssdk.services.rds.model.DescribeDbInstancesRequest;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.ListBucketsRequest;
import software.amazon.awssdk.services.sts.StsClient;
import software.amazon.awssdk.services.sts.model.AssumeRoleRequest;
import software.amazon.awssdk.services.sts.model.AssumeRoleResponse;
import software.amazon.awssdk.services.sts.model.GetCallerIdentityRequest;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class AwsValidationService {

    private final ConnectorRegistryService connectorRegistryService;

    public AwsValidationService(ConnectorRegistryService connectorRegistryService) {
        this.connectorRegistryService = connectorRegistryService;
    }

    public AwsValidationResponse validate(AwsValidationRequest request) {
        String workspaceId = normalizeWorkspaceId(request.getWorkspaceId());
        String authMode = normalizeAuthMode(request.getAuthMode());
        String region = normalizeRegion(request.getRegion());

        List<AwsValidationResponse.Check> checks = new ArrayList<>();
        AwsCredentialsProvider credentialsProvider = null;

        try {
            credentialsProvider = buildCredentialsProvider(authMode, region, request, checks);

            CostExplorerClient costExplorerClient = CostExplorerClient.builder()
                    .region(Region.US_EAST_1)
                    .credentialsProvider(credentialsProvider)
                    .build();
            Ec2Client ec2Client = Ec2Client.builder()
                    .region(Region.of(region))
                    .credentialsProvider(credentialsProvider)
                    .build();
            RdsClient rdsClient = RdsClient.builder()
                    .region(Region.of(region))
                    .credentialsProvider(credentialsProvider)
                    .build();
            S3Client s3Client = S3Client.builder()
                    .region(Region.of(region))
                    .credentialsProvider(credentialsProvider)
                    .build();

            LocalDate today = LocalDate.now();
            LocalDate yesterday = today.minusDays(1);

            checks.add(runCheck(
                    "cost_explorer_read",
                    () -> costExplorerClient.getCostAndUsage(
                            GetCostAndUsageRequest.builder()
                                    .granularity(Granularity.DAILY)
                                    .timePeriod(builder -> builder
                                            .start(yesterday.toString())
                                            .end(today.toString()))
                                    .metrics("UnblendedCost")
                                    .build()
                    ),
                    "Cost Explorer 조회 성공"
            ));
            checks.add(runCheck(
                    "ec2_read",
                    () -> ec2Client.describeRegions(DescribeRegionsRequest.builder().allRegions(false).build()),
                    "EC2 DescribeRegions 성공"
            ));
            checks.add(runCheck(
                    "rds_read",
                    () -> rdsClient.describeDBInstances(DescribeDbInstancesRequest.builder().maxRecords(20).build()),
                    "RDS DescribeDBInstances 성공"
            ));
            checks.add(runCheck(
                    "s3_read",
                    () -> s3Client.listBuckets(ListBucketsRequest.builder().build()),
                    "S3 ListBuckets 성공"
            ));
        } finally {
            if (credentialsProvider != null && hasSuccessfulAuth(checks)) {
                connectorRegistryService.saveAwsConnector(new ConnectorRegistryService.AwsConnectorConfig(
                        workspaceId,
                        authMode,
                        region,
                        trimToNull(request.getRoleArn()),
                        trimToNull(request.getExternalId()),
                        trimToNull(request.getAccessKeyId()),
                        trimToNull(request.getSecretAccessKey())
                ));
            }
        }

        long passedCount = checks.stream().filter(AwsValidationResponse.Check::passed).count();
        String status = passedCount == checks.size()
                ? "active"
                : passedCount >= 3
                ? "partial"
                : "failed";

        return new AwsValidationResponse("live", status, checks);
    }

    public AwsCredentialsProvider createCredentialsProvider(ConnectorRegistryService.AwsConnectorConfig config) {
        AwsValidationRequest request = new AwsValidationRequest();
        request.setWorkspaceId(config.workspaceId());
        request.setAuthMode(config.authMode());
        request.setRegion(config.region());
        request.setRoleArn(config.roleArn());
        request.setExternalId(config.externalId());
        request.setAccessKeyId(config.accessKeyId());
        request.setSecretAccessKey(config.secretAccessKey());

        return buildCredentialsProvider(
                normalizeAuthMode(config.authMode()),
                normalizeRegion(config.region()),
                request,
                new ArrayList<>()
        );
    }

    public AwsCredentialsProvider createCredentialsProvider(AwsValidationRequest request) {
        return buildCredentialsProvider(
                normalizeAuthMode(request.getAuthMode()),
                normalizeRegion(request.getRegion()),
                request,
                new ArrayList<>()
        );
    }

    private AwsCredentialsProvider buildCredentialsProvider(
            String authMode,
            String region,
            AwsValidationRequest request,
            List<AwsValidationResponse.Check> checks
    ) {
        if ("access_key".equals(authMode)) {
            String accessKeyId = requireValue(request.getAccessKeyId(), "accessKeyId는 필수입니다.");
            String secretAccessKey = requireValue(request.getSecretAccessKey(), "secretAccessKey는 필수입니다.");
            AwsCredentialsProvider provider = StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKeyId, secretAccessKey)
            );

            StsClient stsClient = StsClient.builder()
                    .region(Region.of(region))
                    .credentialsProvider(provider)
                    .build();
            stsClient.getCallerIdentity(GetCallerIdentityRequest.builder().build());
            checks.add(new AwsValidationResponse.Check("sts_identity", true, "GetCallerIdentity 성공"));
            return provider;
        }

        String roleArn = requireValue(request.getRoleArn(), "roleArn은 필수입니다.");
        StsClient stsClient = StsClient.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
        AssumeRoleResponse assumed = stsClient.assumeRole(
                AssumeRoleRequest.builder()
                        .roleArn(roleArn)
                        .externalId(trimToNull(request.getExternalId()))
                        .roleSessionName("jeolgamai-validation")
                        .durationSeconds(900)
                        .build()
        );

        if (assumed.credentials() == null) {
            throw new IllegalArgumentException("AssumeRole은 성공했지만 임시 자격증명을 받지 못했습니다.");
        }

        checks.add(new AwsValidationResponse.Check("sts_assume_role", true, "AssumeRole 성공"));
        return StaticCredentialsProvider.create(
                AwsSessionCredentials.create(
                        assumed.credentials().accessKeyId(),
                        assumed.credentials().secretAccessKey(),
                        assumed.credentials().sessionToken()
                )
        );
    }

    private AwsValidationResponse.Check runCheck(
            String key,
            Runnable action,
            String successMessage
    ) {
        try {
            action.run();
            return new AwsValidationResponse.Check(key, true, successMessage);
        } catch (Exception exception) {
            return new AwsValidationResponse.Check(key, false, safeErrorMessage(exception));
        }
    }

    private boolean hasSuccessfulAuth(List<AwsValidationResponse.Check> checks) {
        return checks.stream()
                .anyMatch(check -> ("sts_identity".equals(check.key()) || "sts_assume_role".equals(check.key()))
                        && check.passed());
    }

    private String normalizeWorkspaceId(String workspaceId) {
        String normalized = trimToNull(workspaceId);
        if (normalized == null) {
            throw new IllegalArgumentException("workspaceId는 필수입니다.");
        }
        return normalized;
    }

    private String normalizeAuthMode(String authMode) {
        String normalized = trimToNull(authMode);
        if (normalized == null) {
            throw new IllegalArgumentException("authMode는 필수입니다.");
        }

        String lowered = normalized.toLowerCase(Locale.ROOT);
        if (!"role".equals(lowered) && !"access_key".equals(lowered)) {
            throw new IllegalArgumentException("authMode는 role 또는 access_key만 허용합니다.");
        }
        return lowered;
    }

    private String normalizeRegion(String region) {
        String normalized = trimToNull(region);
        if (normalized == null) {
            throw new IllegalArgumentException("region은 필수입니다.");
        }

        if (!"ap-northeast-2".equals(normalized)) {
            throw new IllegalArgumentException("현재는 AWS 서울 리전(ap-northeast-2)만 허용합니다.");
        }
        return normalized;
    }

    private String requireValue(String value, String message) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            throw new IllegalArgumentException(message);
        }
        return normalized;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String safeErrorMessage(Exception exception) {
        return exception.getMessage() == null ? exception.getClass().getSimpleName() : exception.getMessage();
    }
}
