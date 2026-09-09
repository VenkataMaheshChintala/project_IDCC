package com.codearena.queue;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubmissionQueue {

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    @Value("${app.judge.submission-queue-key}")
    private String submissionQueueKey;

    @Value("${app.judge.run-queue-key}")
    private String runQueueKey;

    public void enqueueSubmission(JudgeJob job) {
        try {
            String json = objectMapper.writeValueAsString(job);
            redis.opsForList().leftPush(submissionQueueKey, json);
            log.info("[Queue] Enqueued submission job submissionId={}", job.getSubmissionId());
        } catch (Exception e) {
            log.error("[Queue] Failed to enqueue submission {}: {}", job.getSubmissionId(), e.getMessage());
            throw new RuntimeException("Failed to enqueue submission", e);
        }
    }

    public void enqueueRun(JudgeJob job) {
        try {
            String json = objectMapper.writeValueAsString(job);
            redis.opsForList().leftPush(runQueueKey, json);
            log.info("[Queue] Enqueued run job runJobId={}", job.getRunJobId());
        } catch (Exception e) {
            log.error("[Queue] Failed to enqueue run {}: {}", job.getRunJobId(), e.getMessage());
            throw new RuntimeException("Failed to enqueue run job", e);
        }
    }
}
