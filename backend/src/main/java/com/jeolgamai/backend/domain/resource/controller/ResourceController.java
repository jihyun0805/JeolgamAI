package com.jeolgamai.backend.domain.resource.controller;

import com.jeolgamai.backend.domain.resource.dto.ResourceRequest;
import com.jeolgamai.backend.domain.resource.dto.ResourceResponse;
import com.jeolgamai.backend.domain.resource.service.ResourceService;
import com.jeolgamai.backend.common.dto.BaseResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/resources")
@RequiredArgsConstructor
public class ResourceController {

    private final ResourceService resourceService;

    @PostMapping
    public ResponseEntity<BaseResponse<ResourceResponse>> create(
            @Valid @RequestBody ResourceRequest request
    ) {
        ResourceResponse response = resourceService.create(request);
        return ResponseEntity
                .status(201)
                .body(BaseResponse.onSuccess("리소스 생성 성공", response));
    }

    @GetMapping
    public ResponseEntity<BaseResponse<List<ResourceResponse>>> findAll() {
        List<ResourceResponse> response = resourceService.findAll();
        return ResponseEntity.ok(
                BaseResponse.onSuccess(
                        "추후 수정될 메시지입니다.",
                        response
                )
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<BaseResponse<ResourceResponse>> findById(
            @PathVariable Long id
    ) {
        ResourceResponse response = resourceService.findById(id);
        return ResponseEntity.ok(
                BaseResponse.onSuccess(
                        "추후 수정될 메시지입니다.",
                        response
                )
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<BaseResponse<ResourceResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody ResourceRequest request
    ) {
        ResourceResponse response = resourceService.update(id, request);
        return ResponseEntity.ok(
                BaseResponse.onSuccess("리소스 수정 성공", response)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<BaseResponse<Void>> delete(
            @PathVariable Long id
    ) {
        resourceService.delete(id);
        return ResponseEntity.ok(
                BaseResponse.onSuccess("리소스 삭제 성공", null)
        );
    }
}