package com.jeolgamai.backend.domain.cost.repository;

import com.jeolgamai.backend.domain.cost.entity.Cost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CostRepository extends JpaRepository<Cost, Long> {

    @Query("""
            SELECT COALESCE(SUM(c.monthlyCost), 0)
            FROM Cost c
            WHERE c.resource.team = :project
              AND LOWER(c.resource.service) IN :services
            """)
    Double sumMonthlyCostByProjectAndServices(
            @Param("project") String project,
            @Param("services") List<String> services
    );
}
