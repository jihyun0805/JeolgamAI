package com.jeolgamai.backend.domain.project.controller;

import com.jeolgamai.backend.common.dto.BaseResponse;
import com.jeolgamai.backend.domain.project.dto.CreateProjectRequest;
import com.jeolgamai.backend.domain.project.dto.ProjectResponse;
import com.jeolgamai.backend.domain.project.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @GetMapping
    public ResponseEntity<BaseResponse<List<ProjectResponse>>> list(Authentication authentication) {
        Long userId = Long.parseLong(String.valueOf(authentication.getPrincipal()));
        List<ProjectResponse> response = projectService.listProjects(userId);
        return ResponseEntity.ok(BaseResponse.onSuccess("Project list success", response));
    }

    @PostMapping
    public ResponseEntity<BaseResponse<ProjectResponse>> create(
            Authentication authentication,
            @Valid @RequestBody CreateProjectRequest request
    ) {
        Long userId = Long.parseLong(String.valueOf(authentication.getPrincipal()));
        ProjectResponse response = projectService.createProject(userId, request);
        return ResponseEntity.status(201).body(BaseResponse.onCreate("Project create success", response));
    }
}
