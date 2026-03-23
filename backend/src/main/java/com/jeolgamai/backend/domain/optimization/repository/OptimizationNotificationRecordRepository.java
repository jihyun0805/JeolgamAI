package com.jeolgamai.backend.domain.optimization.repository;

import com.jeolgamai.backend.domain.optimization.entity.OptimizationNotificationRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OptimizationNotificationRecordRepository extends JpaRepository<OptimizationNotificationRecord, String> {

    List<OptimizationNotificationRecord> findTop20ByWorkspaceIdAndReadFalseOrderByCreatedAtDesc(String workspaceId);

    List<OptimizationNotificationRecord> findByWorkspaceIdAndReadFalseOrderByCreatedAtDesc(String workspaceId);

    List<OptimizationNotificationRecord> findByWorkspaceIdAndIdIn(String workspaceId, List<String> ids);

    long countByWorkspaceIdAndReadFalse(String workspaceId);
}
