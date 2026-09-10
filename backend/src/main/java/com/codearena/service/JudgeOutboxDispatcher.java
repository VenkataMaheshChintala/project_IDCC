package com.codearena.service;

import com.codearena.domain.JudgeOutbox;
import com.codearena.queue.SubmissionQueue;
import com.codearena.repository.JudgeOutboxRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
@Slf4j
public class JudgeOutboxDispatcher {
    private final JudgeOutboxRepository outboxRepository;
    private final SubmissionQueue queue;

    @Scheduled(fixedDelayString = "${app.judge.outbox-poll-ms:250}")
    @Transactional
    public void dispatch() {
        for (JudgeOutbox event : outboxRepository.findByStatusOrderByCreatedAtAsc("PENDING", PageRequest.of(0, 100))) {
            try {
                queue.enqueue(event.getStreamName(), event.getPayload());
                event.setStatus("PUBLISHED");
                event.setPublishedAt(Instant.now());
            } catch (Exception e) {
                log.warn("Judge outbox {} will be retried: {}", event.getId(), e.getMessage());
                break;
            }
        }
    }
}
