package com.codearena.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Polls Redis for completed run results and delivers them via SSE.
 * The judge worker stores results at codearena:run:result:{runJobId}
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RunResultPoller {

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final SseService sseService;

    private static final String RUN_RESULT_PREFIX = "codearena:run:result:";

    // runJobId → subscribed (we track which ones to poll)
    private final Map<String, Long> pendingRuns = new ConcurrentHashMap<>();

    public void registerRun(String runJobId, Long userId) {
        pendingRuns.put(runJobId, userId);
    }

    @Scheduled(fixedDelay = 500)
    public void poll() {
        if (pendingRuns.isEmpty()) return;

        for (Map.Entry<String, Long> entry : pendingRuns.entrySet()) {
            String runJobId = entry.getKey();
            String key = RUN_RESULT_PREFIX + runJobId;

            try {
                String json = redis.opsForValue().get(key);
                if (json != null) {
                    pendingRuns.remove(runJobId);
                    redis.delete(key);

                    Object result = objectMapper.readValue(json, Object.class);
                    sseService.sendRunResult(runJobId, result);
                    log.debug("[RunPoller] Delivered run={}", runJobId);
                }
            } catch (Exception e) {
                log.error("[RunPoller] Error polling run={}: {}", runJobId, e.getMessage());
            }
        }
    }
}
