package com.jeolgamai.backend.domain.optimization.repository;

import com.jeolgamai.backend.domain.optimization.entity.OptimizationReportRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OptimizationReportRecordRepository extends JpaRepository<OptimizationReportRecord, String> {

    List<OptimizationReportRecord> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    List<OptimizationReportRecord> findByWorkspaceIdAndAnalysisIdOrderByCreatedAtDesc(String workspaceId, String analysisId);

    Optional<OptimizationReportRecord> findByIdAndWorkspaceId(String id, String workspaceId);

    Optional<OptimizationReportRecord> findTopByWorkspaceIdAndAnalysisIdOrderByCreatedAtDesc(String workspaceId, String analysisId);
}
