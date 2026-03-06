package com.jeolgamai.backend.domain.resource.repository;

import com.jeolgamai.backend.domain.resource.entity.Resource;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResourceRepository extends JpaRepository<Resource, Long> {
}
