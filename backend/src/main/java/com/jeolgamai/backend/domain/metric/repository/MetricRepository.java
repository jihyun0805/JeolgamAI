package com.jeolgamai.backend.domain.metric.repository;

import com.jeolgamai.backend.domain.metric.entity.Metric;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MetricRepository extends JpaRepository<Metric, Long> {
}
