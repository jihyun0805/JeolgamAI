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
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserAccountRepository userAccountRepository;
    private final AwsIntegrationRepository awsIntegrationRepository;
    private final PrometheusIntegrationRepository prometheusIntegrationRepository;
    private final KubernetesIntegrationRepository kubernetesIntegrationRepository;

    public ProjectResponse create(ProjectCreateRequest request) {
        UserAccount user = userAccountRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        AwsIntegration awsIntegration = awsIntegrationRepository.findById(request.getAwsIntegrationId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "AWS integration not found"));
        PrometheusIntegration prometheusIntegration = prometheusIntegrationRepository.findById(request.getPrometheusIntegrationId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prometheus integration not found"));
        KubernetesIntegration kubernetesIntegration = kubernetesIntegrationRepository.findById(request.getKubernetesIntegrationId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kubernetes integration not found"));

        Project saved = projectRepository.save(
                new Project(
                        request.getProjectName().trim(),
                        user,
                        awsIntegration,
                        prometheusIntegration,
                        kubernetesIntegration
                )
        );

        return toResponse(saved);
    }

    public List<ProjectResponse> findAll() {
        return projectRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    private ProjectResponse toResponse(Project project) {
        return new ProjectResponse(
                project.getId(),
                project.getProjectName(),
                project.getUser().getId(),
                project.getAwsIntegration().getId(),
                project.getPrometheusIntegration().getId(),
                project.getKubernetesIntegration().getId(),
                project.getCreatedAt(),
                project.getUpdatedAt()
        );
    }
}
