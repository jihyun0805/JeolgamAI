package com.jeolgamai.backend.domain.recommend.controller;

import com.jeolgamai.backend.domain.recommend.dto.RecommendRequest;
import com.jeolgamai.backend.domain.recommend.dto.RecommendResponse;
import com.jeolgamai.backend.domain.recommend.service.RecommendService;
import com.jeolgamai.backend.global.response.BaseResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendController {

    private final RecommendService recommendService;

    @PostMapping
    public ResponseEntity<BaseResponse<RecommendResponse>> create(
            @Valid @RequestBody RecommendRequest request
    ) {
        RecommendResponse response = recommendService.create(request);
        return ResponseEntity
                .status(201)
                .body(BaseResponse.onSuccess("추천 생성 성공", response));
    }

    @GetMapping
    public ResponseEntity<BaseResponse<List<RecommendResponse>>> findAll() {
        List<RecommendResponse> response = recommendService.findAll();
        return ResponseEntity.ok(
                BaseResponse.onSuccess(response)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<BaseResponse<RecommendResponse>> findById(
            @PathVariable Long id
    ) {
        RecommendResponse response = recommendService.findById(id);
        return ResponseEntity.ok(
                BaseResponse.onSuccess(response)
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<BaseResponse<RecommendResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody RecommendRequest request
    ) {
        RecommendResponse response = recommendService.update(id, request);
        return ResponseEntity.ok(
                BaseResponse.onSuccess("추천 수정 성공", response)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<BaseResponse<Void>> delete(
            @PathVariable Long id
    ) {
        recommendService.delete(id);
        return ResponseEntity.ok(
                BaseResponse.onSuccess("추천 삭제 성공", null)
        );
    }
}