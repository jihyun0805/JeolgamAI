package com.jeolgamai.backend.domain.awsintegration.repository;

import com.jeolgamai.backend.domain.awsintegration.entity.AwsIntegration;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AwsIntegrationRepository extends JpaRepository<AwsIntegration, Long> {

    boolean existsByIntegrationName(String integrationName);
}
