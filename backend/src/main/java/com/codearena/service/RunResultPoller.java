package com.codearena.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    private final SseService sseService;
    private final RunResultService runResultService;

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
            try {
                Map<String, Object> result = runResultService.get(runJobId);
                if (runResultService.isTerminal(result)) {
                    pendingRuns.remove(runJobId);
                    sseService.sendRunResult(runJobId, result);
                    log.debug("[RunPoller] Delivered run={}", runJobId);
                }
            } catch (com.codearena.exception.NotFoundException e) {
                // The TTL is intentionally longer than a browser wait. Drop only expired jobs.
                pendingRuns.remove(runJobId);
            } catch (Exception e) {
                log.error("[RunPoller] Error polling run={}: {}", runJobId, e.getMessage());
            }
        }
    }
}
