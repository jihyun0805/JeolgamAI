package com.jeolgamai.backend.domain.awsintegration.controller;

import com.jeolgamai.backend.common.dto.BaseResponse;
import com.jeolgamai.backend.domain.awsintegration.dto.AwsIntegrationCreateRequest;
import com.jeolgamai.backend.domain.awsintegration.dto.AwsIntegrationResponse;
import com.jeolgamai.backend.domain.awsintegration.service.AwsIntegrationService;
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
@RequestMapping("/api/integrations/aws")
@RequiredArgsConstructor
@Tag(name = "AWS Integration", description = "AWS account integration API")
public class AwsIntegrationController {

    private final AwsIntegrationService awsIntegrationService;

    @PostMapping
    public ResponseEntity<BaseResponse<AwsIntegrationResponse>> create(
            @Valid @RequestBody AwsIntegrationCreateRequest request
    ) {
        AwsIntegrationResponse response = awsIntegrationService.create(request);
        return ResponseEntity.status(201).body(BaseResponse.onCreate("AWS integration created", response));
    }

    @GetMapping
    public ResponseEntity<BaseResponse<List<AwsIntegrationResponse>>> findAll() {
        List<AwsIntegrationResponse> response = awsIntegrationService.findAll();
        return ResponseEntity.ok(BaseResponse.onSuccess("AWS integrations fetched", response));
    }
}
