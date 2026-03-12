package com.jeolgamai.backend.domain.project.controller;

import com.jeolgamai.backend.common.dto.BaseResponse;
import com.jeolgamai.backend.domain.project.dto.ProjectCreateRequest;
import com.jeolgamai.backend.domain.project.dto.ProjectResponse;
import com.jeolgamai.backend.domain.project.service.ProjectService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@Tag(name = "Project", description = "Project management API")
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    public ResponseEntity<BaseResponse<ProjectResponse>> create(
            @Valid @RequestBody ProjectCreateRequest request
    ) {
        ProjectResponse response = projectService.create(request);
        return ResponseEntity.status(201).body(BaseResponse.onCreate("Project created", response));
    }

    @GetMapping
    public ResponseEntity<BaseResponse<List<ProjectResponse>>> findAll() {
        List<ProjectResponse> response = projectService.findAll();
        return ResponseEntity.ok(BaseResponse.onSuccess("Projects fetched", response));
    }
}
