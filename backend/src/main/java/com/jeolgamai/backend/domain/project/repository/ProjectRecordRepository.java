package com.jeolgamai.backend.domain.project.repository;

import com.jeolgamai.backend.domain.project.entity.ProjectRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectRecordRepository extends JpaRepository<ProjectRecord, String> {

    List<ProjectRecord> findByOwnerUserIdOrderByCreatedAtDesc(Long ownerUserId);

    Optional<ProjectRecord> findByIdAndOwnerUserId(String id, Long ownerUserId);
}
