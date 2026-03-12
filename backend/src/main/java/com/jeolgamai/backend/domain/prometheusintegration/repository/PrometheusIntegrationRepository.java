package com.jeolgamai.backend.domain.prometheusintegration.repository;

import com.jeolgamai.backend.domain.prometheusintegration.entity.PrometheusIntegration;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PrometheusIntegrationRepository extends JpaRepository<PrometheusIntegration, Long> {

    boolean existsByIntegrationName(String integrationName);
}
