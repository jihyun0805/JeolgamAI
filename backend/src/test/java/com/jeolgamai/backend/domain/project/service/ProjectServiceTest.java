package com.jeolgamai.backend.domain.project.service;

import com.jeolgamai.backend.domain.awsintegration.entity.AwsIntegration;
import com.jeolgamai.backend.domain.awsintegration.repository.AwsIntegrationRepository;
import com.jeolgamai.backend.domain.kubernetesintegration.entity.KubernetesIntegration;
import com.jeolgamai.backend.domain.kubernetesintegration.repository.KubernetesIntegrationRepository;
import com.jeolgamai.backend.domain.project.dto.ProjectCreateRequest;
import com.jeolgamai.backend.domain.project.dto.ProjectResponse;
import com.jeolgamai.backend.domain.project.entity.Project;
import com.jeolgamai.backend.domain.project.repository.ProjectRepository;
import com.jeolgamai.backend.domain.prometheusintegration.entity.PrometheusIntegration;
import com.jeolgamai.backend.domain.prometheusintegration.repository.PrometheusIntegrationRepository;
import com.jeolgamai.backend.domain.user.entity.UserAccount;
import com.jeolgamai.backend.domain.user.repository.UserAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.fail;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private UserAccountRepository userAccountRepository;

    @Mock
    private AwsIntegrationRepository awsIntegrationRepository;

    @Mock
    private PrometheusIntegrationRepository prometheusIntegrationRepository;

    @Mock
    private KubernetesIntegrationRepository kubernetesIntegrationRepository;

    private ProjectService projectService;

    @BeforeEach
    void setUp() {
        projectService = new ProjectService(
                projectRepository,
                userAccountRepository,
                awsIntegrationRepository,
                prometheusIntegrationRepository,
                kubernetesIntegrationRepository
        );
    }

    @Test
    void createSavesProject() {
        ProjectCreateRequest request = new ProjectCreateRequest(
                "cost-ops",
                1L,
                10L,
                20L,
                30L
        );

        UserAccount user = new UserAccount("user@example.com", "encoded-password", "tester");
        user.setId(1L);

        AwsIntegration awsIntegration = new AwsIntegration(
                "prod-aws",
                "ap-northeast-2",
                "Cross-account IAM Role",
                "arn:aws:iam::123456789012:role/CostReader",
                "external-id-001",
                null,
                null
        );
        awsIntegration.setId(10L);

        PrometheusIntegration prometheusIntegration = new PrometheusIntegration(
                "prod-prometheus",
                "https://prometheus.example.com",
                "prom-token",
                true
        );
        prometheusIntegration.setId(20L);

        KubernetesIntegration kubernetesIntegration = new KubernetesIntegration(
                "prod-eks",
                "prod-cluster",
                "https://k8s.example.com",
                "read-only-token"
        );
        kubernetesIntegration.setId(30L);

        Project saved = new Project(
                "cost-ops",
                user,
                awsIntegration,
                prometheusIntegration,
                kubernetesIntegration
        );
        saved.setId(100L);

        when(userAccountRepository.findById(1L)).thenReturn(Optional.of(user));
        when(awsIntegrationRepository.findById(10L)).thenReturn(Optional.of(awsIntegration));
        when(prometheusIntegrationRepository.findById(20L)).thenReturn(Optional.of(prometheusIntegration));
        when(kubernetesIntegrationRepository.findById(30L)).thenReturn(Optional.of(kubernetesIntegration));
        when(projectRepository.save(any(Project.class))).thenReturn(saved);

        ProjectResponse response = projectService.create(request);

        assertEquals(100L, response.getId());
        assertEquals("cost-ops", response.getProjectName());
        assertEquals(1L, response.getUserId());
        assertEquals(10L, response.getAwsIntegrationId());
        assertEquals(20L, response.getPrometheusIntegrationId());
        assertEquals(30L, response.getKubernetesIntegrationId());
        verify(projectRepository).save(any(Project.class));
    }

    @Test
    void createThrowsWhenUserDoesNotExist() {
        ProjectCreateRequest request = new ProjectCreateRequest(
                "cost-ops",
                1L,
                10L,
                20L,
                30L
        );
        when(userAccountRepository.findById(1L)).thenReturn(Optional.empty());

        try {
            projectService.create(request);
            fail("Expected ResponseStatusException");
        } catch (ResponseStatusException e) {
            assertEquals(HttpStatus.NOT_FOUND, e.getStatusCode());
            assertEquals("User not found", e.getReason());
        }
    }
}
