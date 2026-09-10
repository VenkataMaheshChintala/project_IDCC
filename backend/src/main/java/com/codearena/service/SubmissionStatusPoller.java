package com.codearena.service;

import com.codearena.domain.Submission;
import com.codearena.dto.SubmissionDtos;
import com.codearena.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Bridges durable submission rows to connected SSE clients. */
@Service
@RequiredArgsConstructor
public class SubmissionStatusPoller {
    private final SubmissionRepository submissions;
    private final SseService sseService;
    private final Map<Long, String> lastSent = new ConcurrentHashMap<>();

    @Scheduled(fixedDelayString = "${app.judge.submission-status-poll-ms:1000}")
    public void publishChanges() {
        for (Long userId : sseService.subscribedSubmissionUsers()) {
            for (Submission submission : submissions.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 50))) {
                String signature = submission.getStatus().name() + ":" + submission.getScore() + ":" + submission.getPassedTestCases();
                if (!signature.equals(lastSent.put(submission.getId(), signature))) {
                    sseService.sendSubmissionUpdate(userId, new SubmissionDtos.SubmissionStatusUpdate(
                            submission.getId(), submission.getStatus().name(), submission.getScore(), submission.getMaxScore(),
                            submission.getPassedTestCases(), submission.getTotalTestCases()));
                }
            }
        }
    }
}
