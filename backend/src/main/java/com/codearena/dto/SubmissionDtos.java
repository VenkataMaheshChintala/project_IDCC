package com.codearena.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;

public class SubmissionDtos {

    public record SubmitRequest(
            @NotBlank String language,
            @NotBlank String sourceCode
    ) {}

    public record RunRequest(
            @NotBlank String language,
            @NotBlank String sourceCode,
            @NotNull String input   // custom input for run
    ) {}

    public record SubmissionResponse(
            Long id,
            Long userId,
            String username,
            Long competitionId,
            Long problemId,
            String problemTitle,
            String language,
            String sourceCode,
            String status,
            int score,
            int maxScore,
            int passedTestCases,
            int totalTestCases,
            Long executionTimeMs,
            Integer memoryUsedMb,
            String errorMessage,
            List<TestResultSummary> testResults,
            Instant createdAt,
            Instant completedAt
    ) {}

    public record SubmissionSummary(
            Long id,
            Long problemId,
            String problemTitle,
            String problemSlug,
            Long userId,
            String username,
            String status,
            int score,
            int maxScore,
            int passedTestCases,
            int totalTestCases,
            Long executionTimeMs,
            Instant createdAt
    ) {}

    // Per-test result shown to participant
    public record TestResultSummary(
            int index,
            String status,
            int pointsEarned,
            int pointsAvailable,
            Long executionTimeMs,
            boolean hidden,  // if true, no details shown
            String input,
            String expectedOutput,
            String actualOutput
    ) {}

    public record RunResponse(
            String status,
            String stdout,
            String stderr,
            Long executionTimeMs,
            String verdict   // PASSED / WRONG_ANSWER / ERROR
    ) {}

    public record SubmissionStatusUpdate(
            Long submissionId,
            String status,
            Integer score,
            Integer maxScore,
            Integer passedTestCases,
            Integer totalTestCases
    ) {}
}
