package com.codearena.dto;

import java.time.Instant;

public class LeaderboardDtos {

    public record LeaderboardResponse(
            Long competitionId,
            String competitionName,
            java.util.List<RankEntry> entries,
            Instant generatedAt
    ) {}

    public record RankEntry(
            int rank,
            Long userId,
            String username,
            int totalScore,
            int problemsSolved,
            Instant lastAcceptedAt
    ) {}
}
