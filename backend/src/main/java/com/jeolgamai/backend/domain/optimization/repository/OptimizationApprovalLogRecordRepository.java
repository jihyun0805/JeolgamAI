package com.jeolgamai.backend.domain.optimization.repository;

import com.jeolgamai.backend.domain.optimization.entity.OptimizationApprovalLogRecord;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OptimizationApprovalLogRecordRepository extends JpaRepository<OptimizationApprovalLogRecord, String> {
}
