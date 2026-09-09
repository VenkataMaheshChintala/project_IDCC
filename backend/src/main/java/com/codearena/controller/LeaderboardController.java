package com.codearena.controller;

import com.codearena.dto.LeaderboardDtos;
import com.codearena.service.LeaderboardService;
import com.codearena.service.SseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.codearena.domain.User;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/competitions/{competitionId}/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {

    private final LeaderboardService leaderboardService;
    private final SseService sseService;

    @GetMapping
    public ResponseEntity<LeaderboardDtos.LeaderboardResponse> getLeaderboard(
            @PathVariable Long competitionId) {
        return ResponseEntity.ok(leaderboardService.getLeaderboard(competitionId));
    }

    @GetMapping(value = "/live", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeToLeaderboard(
            @PathVariable Long competitionId,
            @AuthenticationPrincipal User user) {
        return sseService.subscribeToLeaderboard(competitionId, user.getId());
    }
}
