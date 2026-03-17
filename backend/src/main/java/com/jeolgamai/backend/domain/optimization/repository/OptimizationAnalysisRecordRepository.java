package com.jeolgamai.backend.domain.optimization.repository;

import com.jeolgamai.backend.domain.optimization.entity.OptimizationAnalysisRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OptimizationAnalysisRecordRepository extends JpaRepository<OptimizationAnalysisRecord, String> {

    Optional<OptimizationAnalysisRecord> findTopByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    Optional<OptimizationAnalysisRecord> findByIdAndWorkspaceId(String id, String workspaceId);

    boolean existsByIdAndWorkspaceId(String id, String workspaceId);
}
