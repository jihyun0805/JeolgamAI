package com.jeolgamai.backend.domain.cost.repository;

import com.jeolgamai.backend.domain.cost.entity.Cost;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CostRepository extends JpaRepository<Cost, Long> {
}
