package com.codearena.queue;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubmissionQueue {

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    @Value("${app.judge.submission-stream:codearena:submissions:stream}")
    private String submissionStream;

    @Value("${app.judge.run-stream:codearena:runs:stream}")
    private String runStream;

    public void enqueueSubmission(JudgeJob job) {
        enqueue(submissionStream, serialize(job));
        log.info("[Queue] Enqueued submission job submissionId={}", job.getSubmissionId());
    }

    public void enqueueRun(JudgeJob job) {
        enqueue(runStream, serialize(job));
        log.info("[Queue] Enqueued run job runJobId={}", job.getRunJobId());
    }

    public String serialize(JudgeJob job) {
        try {
            return objectMapper.writeValueAsString(job);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize judge job", e);
        }
    }

    public void enqueue(String stream, String payload) {
        try {
            redis.opsForStream().add(StreamRecords.newRecord().ofMap(java.util.Map.of("payload", payload))
                    .withStreamKey(stream));
        } catch (Exception e) {
            log.error("[Queue] Failed to enqueue to stream {}: {}", stream, e.getMessage());
            throw new IllegalStateException("Failed to enqueue judge job", e);
        }
    }
}
