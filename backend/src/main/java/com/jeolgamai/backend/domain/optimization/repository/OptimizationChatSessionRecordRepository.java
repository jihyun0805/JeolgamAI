package com.jeolgamai.backend.domain.optimization.repository;

import com.jeolgamai.backend.domain.optimization.entity.OptimizationChatSessionRecord;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OptimizationChatSessionRecordRepository extends JpaRepository<OptimizationChatSessionRecord, String> {
}
