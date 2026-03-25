package com.jeolgamai.backend.domain.integration.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jeolgamai.backend.domain.integration.entity.ConnectorType;
import com.jeolgamai.backend.domain.integration.entity.IntegrationConnector;
import com.jeolgamai.backend.domain.integration.repository.IntegrationConnectorRepository;
import com.jeolgamai.backend.domain.project.entity.ProjectRecord;
import com.jeolgamai.backend.domain.project.repository.ProjectRecordRepository;
import com.jeolgamai.backend.domain.user.entity.UserAccount;
import com.jeolgamai.backend.domain.user.repository.UserAccountRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.attribute.PosixFilePermission;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class ConnectorRegistryService {

    private static final Logger log = LoggerFactory.getLogger(ConnectorRegistryService.class);
    private static final String LEGACY_TEST_WORKSPACE_ID = "ws-jeolgam-default";
    private static final String TEST_USER_LOGIN_ID = "testuser";
    private static final String DEFAULT_TEST_PROJECT_SUFFIX = " 서울 비용 프로젝트";

    private final ConcurrentMap<String, AwsConnectorConfig> awsConnectors = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, K8sConnectorConfig> k8sConnectors = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, PrometheusConnectorConfig> prometheusConnectors = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;
    private final IntegrationConnectorRepository integrationConnectorRepository;
    private final ConnectorCryptoService connectorCryptoService;
    private final ProjectRecordRepository projectRecordRepository;
    private final UserAccountRepository userAccountRepository;
    private final Path legacyPersistencePath;

    public ConnectorRegistryService(
            ObjectMapper objectMapper,
            IntegrationConnectorRepository integrationConnectorRepository,
            ConnectorCryptoService connectorCryptoService,
            ProjectRecordRepository projectRecordRepository,
            UserAccountRepository userAccountRepository
    ) {
        this.objectMapper = objectMapper;
        this.integrationConnectorRepository = integrationConnectorRepository;
        this.connectorCryptoService = connectorCryptoService;
        this.projectRecordRepository = projectRecordRepository;
        this.userAccountRepository = userAccountRepository;
        this.legacyPersistencePath = Paths.get(System.getProperty("user.dir"), ".jeolgamai", "connectors.json");
    }

    @PostConstruct
    void loadPersistedConnectors() {
        importLegacySnapshotIfPresent();
        awsConnectors.clear();
        k8sConnectors.clear();
        prometheusConnectors.clear();

        integrationConnectorRepository.findAll().forEach(this::restoreConnectorSafely);
    }

    public void saveAwsConnector(AwsConnectorConfig config) {
        awsConnectors.put(config.workspaceId(), config);
        persistConnector(config.workspaceId(), ConnectorType.AWS, config);
    }

    public Optional<AwsConnectorConfig> getAwsConnector(String workspaceId) {
        AwsConnectorConfig cached = awsConnectors.get(workspaceId);
        if (cached != null) {
            return Optional.of(cached);
        }
        return loadConnector(workspaceId, ConnectorType.AWS, AwsConnectorConfig.class)
                .map(config -> {
                    awsConnectors.put(workspaceId, config);
                    return config;
                });
    }

    public boolean hasAwsConnector(String workspaceId) {
        return getAwsConnector(requireWorkspaceId(workspaceId)).isPresent();
    }

    public void saveK8sConnector(K8sConnectorConfig config) {
        k8sConnectors.put(config.workspaceId(), config);
        persistConnector(config.workspaceId(), ConnectorType.K8S, config);
    }

    public Optional<K8sConnectorConfig> getK8sConnector(String workspaceId) {
        K8sConnectorConfig cached = k8sConnectors.get(workspaceId);
        if (cached != null) {
            return Optional.of(cached);
        }
        return loadConnector(workspaceId, ConnectorType.K8S, K8sConnectorConfig.class)
                .map(config -> {
                    k8sConnectors.put(workspaceId, config);
                    return config;
                });
    }

    public boolean hasK8sConnector(String workspaceId) {
        return getK8sConnector(requireWorkspaceId(workspaceId)).isPresent();
    }

    public void savePrometheusConnector(PrometheusConnectorConfig config) {
        prometheusConnectors.put(config.workspaceId(), config);
        persistConnector(config.workspaceId(), ConnectorType.PROMETHEUS, config);
    }

    public Optional<PrometheusConnectorConfig> getPrometheusConnector(String workspaceId) {
        PrometheusConnectorConfig cached = prometheusConnectors.get(workspaceId);
        if (cached != null) {
            return Optional.of(cached);
        }
        return loadConnector(workspaceId, ConnectorType.PROMETHEUS, PrometheusConnectorConfig.class)
                .map(config -> {
                    prometheusConnectors.put(workspaceId, config);
                    return config;
                });
    }

    public boolean hasPrometheusConnector(String workspaceId) {
        return getPrometheusConnector(requireWorkspaceId(workspaceId)).isPresent();
    }

    private void persistConnector(String workspaceId, ConnectorType connectorType, Object config) {
        try {
            String serialized = objectMapper.writeValueAsString(config);
            String encryptedPayload = connectorCryptoService.encrypt(serialized);
            IntegrationConnector connector = integrationConnectorRepository
                    .findByWorkspaceIdAndConnectorType(workspaceId, connectorType)
                    .orElseGet(IntegrationConnector::new);
            connector.setWorkspaceId(workspaceId);
            connector.setConnectorType(connectorType);
            connector.setEncryptedPayload(encryptedPayload);
            integrationConnectorRepository.save(connector);
        } catch (Exception exception) {
            throw new IllegalStateException("connector 정보를 저장하지 못했습니다.", exception);
        }
    }

    private <T> Optional<T> loadConnector(String workspaceId, ConnectorType connectorType, Class<T> configType) {
        try {
            Optional<T> direct = loadConnectorDirect(workspaceId, connectorType, configType);
            if (direct.isPresent()) {
                return direct;
            }

            Optional<String> legacyWorkspaceId = resolveLegacyWorkspaceId(workspaceId, connectorType);
            if (legacyWorkspaceId.isEmpty()) {
                return Optional.empty();
            }

            return loadConnectorDirect(legacyWorkspaceId.get(), connectorType, configType)
                    .map(config -> migrateLegacyConnector(workspaceId, connectorType, config));
        } catch (Exception exception) {
            log.warn("connector DB load 실패 (workspaceId={}, type={}): {}", workspaceId, connectorType, exception.getMessage());
            return Optional.empty();
        }
    }

    private <T> Optional<T> loadConnectorDirect(String workspaceId, ConnectorType connectorType, Class<T> configType) {
        return integrationConnectorRepository.findByWorkspaceIdAndConnectorType(workspaceId, connectorType)
                .map(connector -> deserializeConnector(connector, configType));
    }

    private <T> T deserializeConnector(IntegrationConnector connector, Class<T> configType) {
        try {
            String decryptedPayload = connectorCryptoService.decrypt(connector.getEncryptedPayload());
            return objectMapper.readValue(decryptedPayload, configType);
        } catch (Exception exception) {
            throw new IllegalStateException("connector 정보를 읽지 못했습니다.", exception);
        }
    }

    private void restoreConnectorSafely(IntegrationConnector connector) {
        try {
            switch (connector.getConnectorType()) {
                case AWS -> {
                    AwsConnectorConfig config = deserializeConnector(connector, AwsConnectorConfig.class);
                    awsConnectors.put(config.workspaceId(), config);
                }
                case K8S -> {
                    K8sConnectorConfig config = deserializeConnector(connector, K8sConnectorConfig.class);
                    k8sConnectors.put(config.workspaceId(), config);
                }
                case PROMETHEUS -> {
                    PrometheusConnectorConfig config = deserializeConnector(connector, PrometheusConnectorConfig.class);
                    prometheusConnectors.put(config.workspaceId(), config);
                }
            }
        } catch (Exception exception) {
            log.warn(
                    "connector restore 실패 (workspaceId={}, type={}): {}",
                    connector.getWorkspaceId(),
                    connector.getConnectorType(),
                    exception.getMessage()
            );
        }
    }

    private Optional<String> resolveLegacyWorkspaceId(String workspaceId, ConnectorType connectorType) {
        String normalizedWorkspaceId = requireWorkspaceId(workspaceId);
        if (LEGACY_TEST_WORKSPACE_ID.equals(normalizedWorkspaceId)) {
            return Optional.empty();
        }

        ProjectRecord project = projectRecordRepository.findById(normalizedWorkspaceId).orElse(null);
        if (project == null) {
            return Optional.empty();
        }

        UserAccount owner = userAccountRepository.findById(project.getOwnerUserId()).orElse(null);
        if (owner == null || !TEST_USER_LOGIN_ID.equalsIgnoreCase(owner.getLoginId())) {
            return Optional.empty();
        }

        String expectedDefaultProjectName = owner.getName() + DEFAULT_TEST_PROJECT_SUFFIX;
        if (!expectedDefaultProjectName.equals(project.getName())) {
            return Optional.empty();
        }

        boolean hasLegacyConnector = integrationConnectorRepository
                .findByWorkspaceIdAndConnectorType(LEGACY_TEST_WORKSPACE_ID, connectorType)
                .isPresent();
        return hasLegacyConnector ? Optional.of(LEGACY_TEST_WORKSPACE_ID) : Optional.empty();
    }

    @SuppressWarnings("unchecked")
    private <T> T migrateLegacyConnector(String targetWorkspaceId, ConnectorType connectorType, T config) {
        T migratedConfig = (T) switch (connectorType) {
            case AWS -> remapAwsConnector((AwsConnectorConfig) config, targetWorkspaceId);
            case K8S -> remapK8sConnector((K8sConnectorConfig) config, targetWorkspaceId);
            case PROMETHEUS -> remapPrometheusConnector((PrometheusConnectorConfig) config, targetWorkspaceId);
        };

        persistConnector(targetWorkspaceId, connectorType, migratedConfig);
        log.info(
                "legacy connector migrated for workspaceId={}, type={}, sourceWorkspaceId={}",
                targetWorkspaceId,
                connectorType,
                LEGACY_TEST_WORKSPACE_ID
        );
        return migratedConfig;
    }

    private AwsConnectorConfig remapAwsConnector(AwsConnectorConfig config, String workspaceId) {
        return new AwsConnectorConfig(
                workspaceId,
                config.integrationName(),
                config.authMode(),
                config.region(),
                config.roleArn(),
                config.externalId(),
                config.accessKeyId(),
                config.secretAccessKey(),
                config.accountId(),
                config.callerArn(),
                config.status(),
                config.validatedAt()
        );
    }

    private K8sConnectorConfig remapK8sConnector(K8sConnectorConfig config, String workspaceId) {
        return new K8sConnectorConfig(
                workspaceId,
                config.apiServerUrl(),
                config.token(),
                config.clusterName(),
                config.caCertPem()
        );
    }

    private PrometheusConnectorConfig remapPrometheusConnector(PrometheusConnectorConfig config, String workspaceId) {
        return new PrometheusConnectorConfig(
                workspaceId,
                config.baseUrl(),
                config.authMode(),
                config.username(),
                config.password(),
                config.token()
        );
    }

    private void importLegacySnapshotIfPresent() {
        if (!Files.exists(legacyPersistencePath)) {
            return;
        }

        try {
            ConnectorSnapshot snapshot = objectMapper.readValue(
                    Files.readString(legacyPersistencePath, StandardCharsets.UTF_8),
                    ConnectorSnapshot.class
            );
            snapshot.awsConnectors().values().forEach(config -> persistConnector(config.workspaceId(), ConnectorType.AWS, config));
            snapshot.k8sConnectors().values().forEach(config -> persistConnector(config.workspaceId(), ConnectorType.K8S, config));
            snapshot.prometheusConnectors().values().forEach(config -> persistConnector(config.workspaceId(), ConnectorType.PROMETHEUS, config));
            deleteLegacySnapshot();
        } catch (IOException exception) {
            log.warn("legacy connector snapshot import 실패: {}", exception.getMessage());
        }
    }

    private void deleteLegacySnapshot() {
        try {
            applyBestEffortPermissions();
            Files.deleteIfExists(legacyPersistencePath);
        } catch (IOException exception) {
            log.warn("legacy connector snapshot 삭제 실패: {}", exception.getMessage());
        }
    }

    private String requireWorkspaceId(String workspaceId) {
        if (workspaceId == null || workspaceId.trim().isEmpty()) {
            throw new IllegalArgumentException("workspaceId는 필수입니다.");
        }
        return workspaceId.trim();
    }

    private void applyBestEffortPermissions() {
        try {
            Files.setPosixFilePermissions(
                    legacyPersistencePath,
                    Set.of(
                            PosixFilePermission.OWNER_READ,
                            PosixFilePermission.OWNER_WRITE
                    )
            );
        } catch (UnsupportedOperationException | IOException ignored) {
            // Best effort only.
        }
    }

    public record AwsConnectorConfig(
            String workspaceId,
            String integrationName,
            String authMode,
            String region,
            String roleArn,
            String externalId,
            String accessKeyId,
            String secretAccessKey,
            String accountId,
            String callerArn,
            String status,
            String validatedAt
    ) {
        public AwsConnectorConfig(
                String workspaceId,
                String authMode,
                String region,
                String roleArn,
                String externalId,
                String accessKeyId,
                String secretAccessKey
        ) {
            this(
                    workspaceId,
                    null,
                    authMode,
                    region,
                    roleArn,
                    externalId,
                    accessKeyId,
                    secretAccessKey,
                    null,
                    null,
                    "active",
                    null
            );
        }
    }

    public record K8sConnectorConfig(
            String workspaceId,
            String apiServerUrl,
            String token,
            String clusterName,
            String caCertPem
    ) {
    }

    public record PrometheusConnectorConfig(
            String workspaceId,
            String baseUrl,
            String authMode,
            String username,
            String password,
            String token
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ConnectorSnapshot(
            ConcurrentMap<String, AwsConnectorConfig> awsConnectors,
            ConcurrentMap<String, K8sConnectorConfig> k8sConnectors,
            ConcurrentMap<String, PrometheusConnectorConfig> prometheusConnectors
    ) {
        private ConnectorSnapshot {
            awsConnectors = awsConnectors == null ? new ConcurrentHashMap<>() : awsConnectors;
            k8sConnectors = k8sConnectors == null ? new ConcurrentHashMap<>() : k8sConnectors;
            prometheusConnectors = prometheusConnectors == null ? new ConcurrentHashMap<>() : prometheusConnectors;
        }
    }
}
