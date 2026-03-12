package com.jeolgamai.backend.domain.project.repository;

import com.jeolgamai.backend.domain.project.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<Project, Long> {
}
