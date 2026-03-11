package com.jeolgamai.backend.domain.kubernetesintegration.repository;

import com.jeolgamai.backend.domain.kubernetesintegration.entity.KubernetesIntegration;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KubernetesIntegrationRepository extends JpaRepository<KubernetesIntegration, Long> {

    boolean existsByIntegrationName(String integrationName);
}
