package com.codearena.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Server-Sent Events service for real-time submission status and leaderboard updates.
 * Each user can have multiple SSE connections (tabs).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SseService {

    private final ObjectMapper objectMapper;

    // userId → emitter
    private final Map<Long, SseEmitter> submissionEmitters = new ConcurrentHashMap<>();
    // competitionId → list of emitters
    private final Map<Long, Map<Long, SseEmitter>> leaderboardEmitters = new ConcurrentHashMap<>();
    // runJobId → emitter
    private final Map<String, SseEmitter> runEmitters = new ConcurrentHashMap<>();

    public SseEmitter subscribeToSubmissions(Long userId) {
        SseEmitter emitter = new SseEmitter(5 * 60 * 1000L); // 5 min timeout
        submissionEmitters.put(userId, emitter);

        emitter.onCompletion(() -> submissionEmitters.remove(userId));
        emitter.onTimeout(() -> submissionEmitters.remove(userId));
        emitter.onError(e -> submissionEmitters.remove(userId));

        // Send ping immediately
        sendPing(emitter);
        return emitter;
    }

    public SseEmitter subscribeToLeaderboard(Long competitionId, Long userId) {
        SseEmitter emitter = new SseEmitter(10 * 60 * 1000L); // 10 min timeout
        leaderboardEmitters
                .computeIfAbsent(competitionId, k -> new ConcurrentHashMap<>())
                .put(userId, emitter);

        emitter.onCompletion(() -> removeLeaderboardEmitter(competitionId, userId));
        emitter.onTimeout(() -> removeLeaderboardEmitter(competitionId, userId));
        emitter.onError(e -> removeLeaderboardEmitter(competitionId, userId));

        sendPing(emitter);
        return emitter;
    }

    public SseEmitter subscribeToRun(String runJobId) {
        SseEmitter emitter = new SseEmitter(60 * 1000L); // 1 min timeout
        runEmitters.put(runJobId, emitter);
        emitter.onCompletion(() -> runEmitters.remove(runJobId));
        emitter.onTimeout(() -> runEmitters.remove(runJobId));
        emitter.onError(e -> runEmitters.remove(runJobId));
        return emitter;
    }

    public void sendSubmissionUpdate(Long userId, Object payload) {
        SseEmitter emitter = submissionEmitters.get(userId);
        if (emitter != null) {
            send(emitter, "submission-update", payload);
        }
    }

    public void sendLeaderboardUpdate(Long competitionId, Object payload) {
        Map<Long, SseEmitter> emitters = leaderboardEmitters.get(competitionId);
        if (emitters != null) {
            emitters.forEach((uid, emitter) -> send(emitter, "leaderboard-update", payload));
        }
    }

    public void sendRunResult(String runJobId, Object payload) {
        SseEmitter emitter = runEmitters.remove(runJobId);
        if (emitter != null) {
            send(emitter, "run-result", payload);
            try { emitter.complete(); } catch (Exception ignored) {}
        }
    }

    private void send(SseEmitter emitter, String eventName, Object payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            emitter.send(SseEmitter.event().name(eventName).data(json));
        } catch (IOException e) {
            log.debug("SSE send failed (client disconnected): {}", e.getMessage());
            emitter.completeWithError(e);
        } catch (Exception e) {
            log.error("SSE error: {}", e.getMessage());
        }
    }

    private void sendPing(SseEmitter emitter) {
        try {
            emitter.send(SseEmitter.event().name("ping").data("connected"));
        } catch (IOException ignored) {}
    }

    private void removeLeaderboardEmitter(Long competitionId, Long userId) {
        Map<Long, SseEmitter> emitters = leaderboardEmitters.get(competitionId);
        if (emitters != null) {
            emitters.remove(userId);
        }
    }
}
