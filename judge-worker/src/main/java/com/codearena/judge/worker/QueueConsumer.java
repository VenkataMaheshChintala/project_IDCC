package com.codearena.judge.worker;

import com.codearena.judge.engine.JudgeEngine;
import com.codearena.judge.model.ExecutionResult;
import com.codearena.judge.model.JudgeJob;
import com.codearena.judge.store.SubmissionStore;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Redis queue consumer. Polls the submission queue concurrently with worker threads
 * and dispatches jobs to the JudgeEngine.
 *
 * Uses BRPOP (blocking right-pop) across worker threads to avoid busy-waiting.
 */
@Component
public class QueueConsumer {

    private static final Logger log = LoggerFactory.getLogger(QueueConsumer.class);

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final JudgeEngine judgeEngine;
    private final SubmissionStore submissionStore;

    public QueueConsumer(StringRedisTemplate redis, ObjectMapper objectMapper,
                         JudgeEngine judgeEngine, SubmissionStore submissionStore) {
        this.redis = redis;
        this.objectMapper = objectMapper;
        this.judgeEngine = judgeEngine;
        this.submissionStore = submissionStore;
    }

    @Value("${judge.submission-queue-key}")
    private String submissionQueueKey;

    @Value("${judge.run-queue-key}")
    private String runQueueKey;

    @Value("${judge.run-result-prefix}")
    private String runResultPrefix;

    @Value("${judge.worker-threads:4}")
    private int workerThreads;

    private final AtomicBoolean running = new AtomicBoolean(true);
    private ExecutorService submissionExecutor;

    @PostConstruct
    public void startWorkers() {
        int threads = Math.max(1, workerThreads);
        submissionExecutor = Executors.newFixedThreadPool(threads);
        for (int i = 1; i <= threads; i++) {
            final int workerId = i;
            submissionExecutor.submit(() -> pollSubmissionsLoop(workerId));
        }
        log.info("[Worker] Started {} concurrent submission worker threads", threads);
    }

    @PreDestroy
    public void shutdown() {
        running.set(false);
        if (submissionExecutor != null) {
            submissionExecutor.shutdown();
            try {
                if (!submissionExecutor.awaitTermination(5, TimeUnit.SECONDS)) {
                    submissionExecutor.shutdownNow();
                }
            } catch (InterruptedException e) {
                submissionExecutor.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
        log.info("[Worker] Submission worker pool stopped");
    }

    /**
     * Long-polling loop executed by each worker thread.
     */
    private void pollSubmissionsLoop(int workerId) {
        log.info("[Worker-{}] Submission listener started", workerId);
        while (running.get()) {
            try {
                var item = redis.opsForList().rightPop(submissionQueueKey, Duration.ofSeconds(1));
                if (item == null) continue;

                JudgeJob job = objectMapper.readValue(item, JudgeJob.class);
                log.info("[Worker-{}] Processing submission={}", workerId, job.getSubmissionId());

                try {
                    JudgeEngine.JudgeResult result = judgeEngine.judge(job);

                    // Update leaderboard after judging
                    if (job.getCompetitionId() != null && job.getUserId() != null) {
                        submissionStore.updateLeaderboard(job.getCompetitionId(), job.getUserId());
                    }

                    log.info("[Worker-{}] Completed submission={} status={} score={}/{}",
                            workerId, job.getSubmissionId(), result.status(), result.score(), result.maxScore());

                } catch (Exception e) {
                    log.error("[Worker-{}] Failed to judge submission={}: {}", workerId, job.getSubmissionId(), e.getMessage(), e);
                    try {
                        submissionStore.saveResult(job.getSubmissionId(), "SYSTEM_ERROR",
                                0, 0, 0, 0L, 0, "Internal judge error: " + e.getMessage(),
                                java.util.List.of(), java.time.Instant.now());
                    } catch (Exception saveEx) {
                        log.error("[Worker-{}] Failed to save SYSTEM_ERROR for submission={}", workerId, job.getSubmissionId());
                    }
                }

            } catch (Exception e) {
                if (running.get()) {
                    log.debug("[Worker-{}] Queue poll error: {}", workerId, e.getMessage());
                    try {
                        Thread.sleep(500);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
        log.info("[Worker-{}] Submission listener stopped", workerId);
    }

    /**
     * Poll run queue (code execution without scoring).
     */
    @Scheduled(fixedDelay = 100)
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
