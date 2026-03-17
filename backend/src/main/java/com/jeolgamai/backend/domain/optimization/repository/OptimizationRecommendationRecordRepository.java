package com.jeolgamai.backend.domain.optimization.repository;

import com.jeolgamai.backend.domain.optimization.entity.OptimizationRecommendationRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OptimizationRecommendationRecordRepository extends JpaRepository<OptimizationRecommendationRecord, String> {

    List<OptimizationRecommendationRecord> findByAnalysisId(String analysisId);

    Optional<OptimizationRecommendationRecord> findByIdAndWorkspaceId(String id, String workspaceId);
}
