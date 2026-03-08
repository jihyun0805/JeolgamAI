package com.jeolgamai.backend.domain.cost.repository;

import com.jeolgamai.backend.domain.cost.entity.Cost;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CostRepository extends JpaRepository<Cost, Long> {
    Optional<Cost> findFirstByResourceIdOrderByIdDesc(Long resourceId);
}
