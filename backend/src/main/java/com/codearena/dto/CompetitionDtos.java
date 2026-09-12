package com.codearena.dto;

import com.codearena.domain.Competition;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public class CompetitionDtos {

    public record CreateRequest(
            @NotBlank String name,
            String description,
            @NotBlank(message = "Rules cannot be left blank. Please specify the competition rules.") String rules,
            Integer timeLimitMinutes
    ) {}

    public record UpdateRequest(
            String name,
            String description,
            @NotBlank(message = "Rules cannot be left blank. Please specify the competition rules.") String rules,
            Integer timeLimitMinutes,
            Competition.Status status
    ) {}

    public record CompetitionResponse(
            Long id,
            String name,
            String description,
            String rules,
            String status,
            long participantCount,
            Instant createdAt,
            Instant updatedAt,
            // server time for client sync
            Instant serverTime,
            Integer timeLimitMinutes,
            boolean joined,
            boolean attemptCompleted,
            Instant attemptStartedAt
    ) {}

    public record CompetitionSummary(
            Long id,
            String name,
            String description,
            String status,
            Integer timeLimitMinutes,
            long participantCount,
            boolean joined,
            boolean attemptCompleted,
            Instant attemptStartedAt
    ) {}
}
