package com.codearena.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.*;

import java.time.Instant;
import java.util.List;

public class ProblemDtos {

    public record CreateRequest(
            @NotBlank String title,
            @NotBlank String slug,
            @NotBlank String description,
            String inputFormat,
            String outputFormat,
            String constraints,
            @PositiveOrZero int points,
            @Positive int timeLimitMs,
            @Positive int memoryLimitMb
    ) {}

    public record DraftRequest(
            @NotBlank String language,
            @NotBlank String sourceCode
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record UpdateRequest(
            String title,
            String description,
            String inputFormat,
            String outputFormat,
            String constraints,
            Integer points,
            Integer timeLimitMs,
            Integer memoryLimitMb
    ) {}

    public record ProblemResponse(
            Long id,
            Long competitionId,
            String title,
            String slug,
            String description,
            String inputFormat,
            String outputFormat,
            String constraints,
            String starterCode,
            String cStarterCode,
            int points,
            int timeLimitMs,
            int memoryLimitMb,
            List<TestCaseDtos.SampleTestCaseResponse> sampleTestCases,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record ProblemSummary(
            Long id,
            String title,
            String slug,
            int points,
            int timeLimitMs,
            int memoryLimitMb,
            String userStatus
    ) {}

    // Admin view — includes all test cases
    public record ProblemAdminResponse(
            Long id,
            Long competitionId,
            String title,
            String slug,
            String description,
            String inputFormat,
            String outputFormat,
            String constraints,
            String starterCode,
            String runnerCode,
            String cStarterCode,
            String cRunnerCode,
            int points,
            int timeLimitMs,
            int memoryLimitMb,
            List<TestCaseDtos.TestCaseAdminResponse> testCases,
            Instant createdAt,
            Instant updatedAt
    ) {}
}
