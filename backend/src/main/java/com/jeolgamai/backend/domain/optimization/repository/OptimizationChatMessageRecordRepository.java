package com.jeolgamai.backend.domain.optimization.repository;

import com.jeolgamai.backend.domain.optimization.entity.OptimizationChatMessageRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OptimizationChatMessageRecordRepository extends JpaRepository<OptimizationChatMessageRecord, String> {

    List<OptimizationChatMessageRecord> findBySessionIdOrderBySequenceNoAsc(String sessionId);

    long countBySessionId(String sessionId);
}
