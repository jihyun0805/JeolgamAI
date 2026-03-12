package com.jeolgamai.backend.domain.cost.service;

import com.jeolgamai.backend.domain.cost.dto.MonthlyCostSummaryRequest;
import com.jeolgamai.backend.domain.cost.dto.MonthlyCostSummaryResponse;
import com.jeolgamai.backend.domain.cost.repository.CostRepository;
import com.jeolgamai.backend.domain.resource.repository.ResourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CostServiceTest {

    @Mock
    private CostRepository costRepository;

    @Mock
    private ResourceRepository resourceRepository;

    private CostService costService;

    @BeforeEach
    void setUp() {
        costService = new CostService(costRepository, resourceRepository);
    }

    @Test
    void getMonthlyTotalSumsNormalizedIntegrations() {
        MonthlyCostSummaryRequest request = new MonthlyCostSummaryRequest(
                "project-a",
                List.of("AWS", "k8s", "prometheus")
        );
        when(costRepository.sumMonthlyCostByProjectAndServices(
                eq("project-a"),
                eq(List.of("aws", "kubernetes", "prometheus"))
        )).thenReturn(123.45);

        MonthlyCostSummaryResponse response = costService.getMonthlyTotal(request);

        assertEquals("project-a", response.getProject());
        assertEquals(List.of("aws", "kubernetes", "prometheus"), response.getIntegrations());
        assertEquals(123.45, response.getTotalMonthlyCost());
        verify(costRepository).sumMonthlyCostByProjectAndServices("project-a", List.of("aws", "kubernetes", "prometheus"));
    }

    @Test
    void getMonthlyTotalThrowsOnUnsupportedIntegration() {
        MonthlyCostSummaryRequest request = new MonthlyCostSummaryRequest(
                "project-a",
                List.of("aws", "gcp")
        );

        try {
            costService.getMonthlyTotal(request);
            fail("Expected ResponseStatusException");
        } catch (ResponseStatusException e) {
            assertEquals(HttpStatus.BAD_REQUEST, e.getStatusCode());
            assertTrue(e.getReason().contains("Unsupported integration"));
        }
    }

    @Test
    void getMonthlyTotalThrowsWhenIntegrationListIsEmpty() {
        MonthlyCostSummaryRequest request = new MonthlyCostSummaryRequest(
                "project-a",
                List.of()
        );

        try {
            costService.getMonthlyTotal(request);
            fail("Expected ResponseStatusException");
        } catch (ResponseStatusException e) {
            assertEquals(HttpStatus.BAD_REQUEST, e.getStatusCode());
            assertEquals("Integrations must be between 1 and 3 unique values", e.getReason());
        }
    }
}
