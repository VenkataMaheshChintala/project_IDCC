package com.codearena.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

import java.time.Instant;

public class TestCaseDtos {

    public record CreateRequest(
            @NotBlank String input,
            @NotBlank String expectedOutput,
            boolean sample,
            boolean hidden,
            @PositiveOrZero int points,
            int orderIndex
    ) {}

    public record UpdateRequest(
            String input,
            String expectedOutput,
            Boolean sample,
            Boolean hidden,
            Integer points,
            Integer orderIndex
    ) {}

    // Safe for participants — no hidden input/output
    public record SampleTestCaseResponse(
            Long id,
            String input,
            String expectedOutput,
            int orderIndex
    ) {}

    // Full details — admin only
    public record TestCaseAdminResponse(
            Long id,
            String input,
            String expectedOutput,
            boolean sample,
            boolean hidden,
            int points,
            int orderIndex,
            Instant createdAt
    ) {}
}
