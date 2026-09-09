package com.codearena.controller;

import com.codearena.domain.User;
import com.codearena.dto.SubmissionDtos;
import com.codearena.service.SseService;
import com.codearena.service.SubmissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SubmissionController {

    private final SubmissionService submissionService;
    private final SseService sseService;

    // ─── Submit code ──────────────────────────────────────────────────────────

    @PostMapping("/problems/{problemId}/submit")
    public ResponseEntity<SubmissionDtos.SubmissionSummary> submit(
            @PathVariable Long problemId,
            @Valid @RequestBody SubmissionDtos.SubmitRequest req,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(submissionService.submit(problemId, req, user));
    }

    // ─── Run code (no score impact) ───────────────────────────────────────────

    @PostMapping("/problems/{problemId}/run")
    public ResponseEntity<Map<String, String>> run(
            @PathVariable Long problemId,
            @Valid @RequestBody SubmissionDtos.RunRequest req,
            @AuthenticationPrincipal User user) {
        String runJobId = submissionService.enqueueRun(problemId, req, user);
        return ResponseEntity.ok(Map.of("runJobId", runJobId));
    }

    // ─── SSE for run results ──────────────────────────────────────────────────

    @GetMapping(value = "/sse/run/{runJobId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeToRun(
            @PathVariable String runJobId,
            @AuthenticationPrincipal User user) {
        return sseService.subscribeToRun(runJobId);
    }

    // ─── SSE for submission updates ───────────────────────────────────────────

    @GetMapping(value = "/sse/submissions", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeToSubmissions(@AuthenticationPrincipal User user) {
        return sseService.subscribeToSubmissions(user.getId());
    }

    // ─── Read submissions ─────────────────────────────────────────────────────

    @GetMapping("/submissions")
    public ResponseEntity<List<SubmissionDtos.SubmissionSummary>> mySubmissions(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(submissionService.getMySubmissions(user));
    }

    @GetMapping("/submissions/{id}")
    public ResponseEntity<SubmissionDtos.SubmissionResponse> getSubmission(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(submissionService.getById(id, user));
    }
}
