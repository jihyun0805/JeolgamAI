package com.jeolgamai.backend.domain.recommend.service;

import org.springframework.stereotype.Component;

@Component
public class SavingsCalculator {

    public double calculateEstimatedSavings(double monthlyCost, double cpuAvg) {
        double ratio = getSavingsRatio(cpuAvg);
        return roundToTwoDecimals(monthlyCost * ratio);
    }

    private double getSavingsRatio(double cpuAvg) {
        if (cpuAvg < 20) {
            return 0.40;
        }
        if (cpuAvg <= 40) {
            return 0.20;
        }
        return 0.05;
    }

    private double roundToTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
