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
import org.springframework.data.domain.Range;
import org.springframework.data.redis.connection.stream.*;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/** Durable Streams consumer: messages are acknowledged only after results persist. */
@Component
public class QueueConsumer {
    private static final Logger log = LoggerFactory.getLogger(QueueConsumer.class);
    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final JudgeEngine judgeEngine;
    private final SubmissionStore submissionStore;

    @Value("${judge.submission-stream:codearena:submissions:stream}") private String submissionStream;
    @Value("${judge.run-stream:codearena:runs:stream}") private String runStream;
    @Value("${judge.stream-group:codearena-judges}") private String streamGroup;
    @Value("${judge.worker-id:}") private String configuredWorkerId;
    @Value("${judge.submission-worker-threads:4}") private int submissionThreads;
    @Value("${judge.run-worker-threads:2}") private int runThreads;
    @Value("${judge.run-result-prefix:codearena:run:result:}") private String runResultPrefix;
    @Value("${judge.run-result-ttl-seconds:900}") private long runResultTtlSeconds;
    @Value("${judge.reclaim-idle-seconds:60}") private long reclaimIdleSeconds;

    private final AtomicBoolean running = new AtomicBoolean(true);
    private ExecutorService submissionExecutor;
    private ExecutorService runExecutor;
    private String workerId;

    public QueueConsumer(StringRedisTemplate redis, ObjectMapper objectMapper, JudgeEngine judgeEngine, SubmissionStore submissionStore) {
        this.redis = redis;
        this.objectMapper = objectMapper;
        this.judgeEngine = judgeEngine;
        this.submissionStore = submissionStore;
    }

    @PostConstruct
    public void startWorkers() {
        workerId = configuredWorkerId == null || configuredWorkerId.isBlank() ? UUID.randomUUID().toString() : configuredWorkerId;
        createGroup(submissionStream);
        createGroup(runStream);
        submissionExecutor = startPool("submission", Math.max(1, submissionThreads), submissionStream, true);
        runExecutor = startPool("run", Math.max(1, runThreads), runStream, false);
    }

    private ExecutorService startPool(String name, int count, String stream, boolean submission) {
        ExecutorService executor = Executors.newFixedThreadPool(count);
        for (int i = 0; i < count; i++) {
            String consumer = workerId + "-" + name + "-" + i;
            executor.submit(() -> consumeLoop(stream, consumer, submission));
        }
        log.info("[Worker] Started {} {} consumers on {}", count, name, stream);
        return executor;
    }

    private void createGroup(String stream) {
        try {
            if (Boolean.FALSE.equals(redis.hasKey(stream))) {
                redis.opsForStream().add(StreamRecords.newRecord().ofMap(Map.of("_system", "init")).withStreamKey(stream));
            }
            redis.opsForStream().createGroup(stream, ReadOffset.latest(), streamGroup);
        } catch (Exception e) {
            if (!String.valueOf(e.getMessage()).contains("BUSYGROUP")) log.warn("Could not create group for {}: {}", stream, e.getMessage());
        }
    }

    private void consumeLoop(String stream, String consumer, boolean submission) {
        reclaimPending(stream, consumer, submission);
        long backoffMs = 0;
        final long MAX_BACKOFF_MS = 5000;
        while (running.get()) {
            try {
                if (backoffMs > 0) {
                    Thread.sleep(backoffMs);
                }
                List<MapRecord<String, Object, Object>> records = redis.opsForStream().read(
                        Consumer.from(streamGroup, consumer), StreamReadOptions.empty().count(1).block(Duration.ofSeconds(2)),
                        StreamOffset.create(stream, ReadOffset.lastConsumed()));
                backoffMs = 0; // Reset on success
                if (records == null) continue;
                for (MapRecord<String, Object, Object> record : records) process(record, stream, submission);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                if (running.get()) {
                    backoffMs = Math.min(backoffMs == 0 ? 500 : backoffMs * 2, MAX_BACKOFF_MS);
                    log.warn("Stream poll failed for {} (retry in {}ms): {}", stream, backoffMs, e.getMessage());
                    // Try to re-create the consumer group in case Redis was flushed
                    try { createGroup(stream); } catch (Exception ignored) {}
                }
            }
        }
    }

    private void reclaimPending(String stream, String consumer, boolean submission) {
        try {
            List<RecordId> ids = new ArrayList<>();
            for (PendingMessage pending : redis.opsForStream().pending(stream, streamGroup, Range.unbounded(), 100)) {
                if (pending.getElapsedTimeSinceLastDelivery().compareTo(Duration.ofSeconds(reclaimIdleSeconds)) >= 0) {
                    ids.add(pending.getId());
                }
            }
            if (!ids.isEmpty()) {
                for (MapRecord<String, Object, Object> record : redis.opsForStream().claim(
                        stream, streamGroup, consumer, Duration.ofSeconds(reclaimIdleSeconds), ids.toArray(RecordId[]::new))) {
                    process(record, stream, submission);
                }
                log.info("[Worker] Reclaimed {} pending messages from {}", ids.size(), stream);
            }
        } catch (Exception e) {
            log.warn("Could not reclaim pending messages from {}: {}", stream, e.getMessage());
        }
    }

    private void process(MapRecord<String, Object, Object> record, String stream, boolean submission) throws Exception {
        JudgeJob job = objectMapper.readValue(String.valueOf(record.getValue().get("payload")), JudgeJob.class);
        if (submission) processSubmission(job); else processRun(job);
        redis.opsForStream().acknowledge(stream, streamGroup, record.getId());
    }

    private void processSubmission(JudgeJob job) {
        try {
            JudgeEngine.JudgeResult result = judgeEngine.judge(job);
            if (job.getCompetitionId() != null && job.getUserId() != null) submissionStore.updateLeaderboard(job.getCompetitionId(), job.getUserId());
            log.info("[Worker] Completed submission={} status={}", job.getSubmissionId(), result.status());
        } catch (Exception e) {
            log.error("[Worker] Failed submission={}", job.getSubmissionId(), e);
            submissionStore.saveResult(job.getSubmissionId(), "SYSTEM_ERROR", 0, 0, 0, 0L, 0,
                    "Judge infrastructure error", List.of(), java.time.Instant.now());
        }
    }

    private void processRun(JudgeJob job) {
        try {
            Map<String, Object> response;
            if (Boolean.TRUE.equals(job.getRunSamples())) {
                List<Map<String, Object>> results = judgeEngine.runSamples(job);
                response = Map.of(
                    "runJobId", job.getRunJobId(),
                    "userId", job.getUserId(),
                    "type", "SAMPLES",
                    "results", results
                );
            } else {
                ExecutionResult result = judgeEngine.run(job);
                response = Map.of(
                    "runJobId", job.getRunJobId(),
                    "userId", job.getUserId(),
                    "type", "CUSTOM",
                    "status", result.getVerdict().name(),
                    "stdout", truncate(result.getStdout()),
                    "stderr", truncate(result.getStderr()),
                    "executionTimeMs", result.getExecutionTimeMs()
                );
            }
            redis.opsForValue().set(runResultPrefix + job.getRunJobId(), objectMapper.writeValueAsString(response), Duration.ofSeconds(runResultTtlSeconds));
        } catch (Exception e) {
            log.error("[Worker] Failed run={}", job.getRunJobId(), e);
            try {
                Map<String, Object> errorResp = Map.of(
                    "runJobId", job.getRunJobId(),
                    "status", "SYSTEM_ERROR",
                    "stderr", "Judge infrastructure error"
                );
                redis.opsForValue().set(runResultPrefix + job.getRunJobId(), objectMapper.writeValueAsString(errorResp), Duration.ofSeconds(runResultTtlSeconds));
            } catch (Exception ex) {
                // ignore
            }
        }
    }

    private String truncate(String value) {
        if (value == null) return "";
        return value.length() > 65536 ? value.substring(0, 65536) + "\n[output truncated]" : value;
    }

    @PreDestroy
    public void shutdown() {
        running.set(false);
        shutdown(submissionExecutor);
        shutdown(runExecutor);
    }

    private void shutdown(ExecutorService executor) {
        if (executor == null) return;
        executor.shutdownNow();
        try { executor.awaitTermination(5, TimeUnit.SECONDS); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}
