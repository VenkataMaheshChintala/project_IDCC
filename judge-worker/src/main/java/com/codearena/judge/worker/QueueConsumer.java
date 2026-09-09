package com.codearena.judge.worker;

import com.codearena.judge.engine.JudgeEngine;
import com.codearena.judge.model.ExecutionResult;
import com.codearena.judge.model.JudgeJob;
import com.codearena.judge.store.SubmissionStore;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Redis queue consumer. Polls the submission queue and dispatches jobs
 * to the JudgeEngine.
 *
 * Uses BRPOP (blocking right-pop) to avoid busy-waiting.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class QueueConsumer {

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final JudgeEngine judgeEngine;
    private final SubmissionStore submissionStore;

    @Value("${judge.submission-queue-key}")
    private String submissionQueueKey;

    @Value("${judge.run-queue-key}")
    private String runQueueKey;

    @Value("${judge.run-result-prefix}")
    private String runResultPrefix;

    @Value("${judge.worker-threads:4}")
    private int workerThreads;

    private final AtomicBoolean running = new AtomicBoolean(true);

    /**
     * Poll submission queue every 100ms. Spring @Scheduled with
     * fixedDelay ensures sequential processing per thread.
     */
    @Scheduled(fixedDelay = 100)
    public void processSubmissions() {
        try {
            // BRPOP with 1s timeout
            var item = redis.opsForList().rightPop(submissionQueueKey, Duration.ofSeconds(1));
            if (item == null) return;

            JudgeJob job = objectMapper.readValue(item, JudgeJob.class);
            log.info("[Worker] Processing submission={}", job.getSubmissionId());

            try {
                JudgeEngine.JudgeResult result = judgeEngine.judge(job);

                // Update leaderboard after judging
                if (job.getCompetitionId() != null && job.getUserId() != null) {
                    submissionStore.updateLeaderboard(job.getCompetitionId(), job.getUserId());
                }

                log.info("[Worker] Completed submission={} status={} score={}/{}",
                        job.getSubmissionId(), result.status(), result.score(), result.maxScore());

            } catch (Exception e) {
                log.error("[Worker] Failed to judge submission={}: {}", job.getSubmissionId(), e.getMessage(), e);
                try {
                    submissionStore.saveResult(job.getSubmissionId(), "SYSTEM_ERROR",
                            0, 0, 0, 0L, 0, "Internal judge error: " + e.getMessage(),
                            java.util.List.of(), java.time.Instant.now());
                } catch (Exception saveEx) {
                    log.error("[Worker] Failed to save SYSTEM_ERROR for submission={}", job.getSubmissionId());
                }
            }

        } catch (Exception e) {
            log.debug("[Worker] Queue poll error: {}", e.getMessage());
        }
    }

    /**
     * Poll run queue (code execution without scoring).
     */
    @Scheduled(fixedDelay = 150)
    public void processRuns() {
        try {
            var item = redis.opsForList().rightPop(runQueueKey, Duration.ofMillis(500));
            if (item == null) return;

            JudgeJob job = objectMapper.readValue(item, JudgeJob.class);
            log.info("[Worker] Processing run={}", job.getRunJobId());

            ExecutionResult result = judgeEngine.run(job);

            Map<String, Object> response = Map.of(
                    "runJobId", job.getRunJobId(),
                    "status", result.getVerdict().name(),
                    "stdout", result.getStdout() != null ? result.getStdout() : "",
                    "stderr", result.getStderr() != null ? result.getStderr() : "",
                    "executionTimeMs", result.getExecutionTimeMs()
            );

            // Store result in Redis for SSE pickup (TTL 60s)
            String json = objectMapper.writeValueAsString(response);
            redis.opsForValue().set(runResultPrefix + job.getRunJobId(), json, Duration.ofSeconds(60));

            log.info("[Worker] Run={} completed status={}", job.getRunJobId(), result.getVerdict());

        } catch (Exception e) {
            log.debug("[Worker] Run queue poll error: {}", e.getMessage());
        }
    }
}
