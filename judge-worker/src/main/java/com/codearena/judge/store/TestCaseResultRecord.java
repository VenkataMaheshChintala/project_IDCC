package com.codearena.judge.store;

public record TestCaseResultRecord(
        Long testCaseId,
        String status,
        int pointsEarned,
        long executionTimeMs,
        int memoryUsedMb,
        String actualOutput,
        int orderIndex
) {}
