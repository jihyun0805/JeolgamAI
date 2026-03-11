package com.jeolgamai.backend.domain.cost.repository;

import com.jeolgamai.backend.domain.cost.entity.Cost;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CostRepository extends JpaRepository<Cost, Long> {
    // resourceId에 해당하는 Cost 중 가장 최근(큰 id) 1건 조회
    Optional<Cost> findFirstByResourceIdOrderByIdDesc(Long resourceId);
}
