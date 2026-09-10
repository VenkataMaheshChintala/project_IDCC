package com.codearena.service;

import com.codearena.domain.*;
import com.codearena.dto.SubmissionDtos;
import com.codearena.exception.BadRequestException;
import com.codearena.exception.ForbiddenException;
import com.codearena.exception.NotFoundException;
import com.codearena.queue.JudgeJob;
import com.codearena.queue.SubmissionQueue;
import com.codearena.repository.JudgeOutboxRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.codearena.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubmissionService {

    private static final Set<String> SUPPORTED_LANGUAGES = Set.of("JAVA", "C");

    private final SubmissionRepository submissionRepository;
    private final ProblemService problemService;
    private final CompetitionService competitionService;
    private final CompetitionParticipantRepository participantRepository;
    private final SubmissionQueue queue;
    private final RunResultPoller runResultPoller;
    private final RunResultService runResultService;
    private final JudgeOutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.rate-limit.submissions-per-minute}")
    private int submissionsPerMinute;

    @Value("${app.judge.max-source-bytes:65536}")
    private int maxSourceBytes;

    @Value("${app.judge.max-input-bytes:65536}")
    private int maxInputBytes;

    @Value("${app.judge.submission-stream:codearena:submissions:stream}")
    private String submissionStream;

    // ─── Submit ───────────────────────────────────────────────────────────────

    @Transactional
    public SubmissionDtos.SubmissionSummary submit(Long problemId, SubmissionDtos.SubmitRequest req, User user) {
        Problem problem = problemService.findOrThrow(problemId);
        Competition competition = problem.getCompetition();

        // Server-side validation
        validateLanguage(req.language());
        validateSourceSize(req.sourceCode());
        validateCompetitionAcceptsSubmissions(competition);
        validateIsParticipant(competition, user);
        checkRateLimit(user.getId(), competition.getId());

        // Create submission
        Submission submission = Submission.builder()
                .user(user)
                .competition(competition)
                .problem(problem)
                .language(req.language().toUpperCase())
                .sourceCode(req.sourceCode())
                .status(Submission.Status.QUEUED)
                .score(0)
                .maxScore(problem.getPoints())
                .passedTestCases(0)
                .totalTestCases(problem.getTestCases() != null ? problem.getTestCases().size() : 0)
                .build();

        submission = submissionRepository.save(submission);
        log.info("[Submission] Created submissionId={} userId={} problemId={}",
                submission.getId(), user.getId(), problemId);

        String runnerCode = req.language().equalsIgnoreCase("C") ? problem.getCRunnerCode() : problem.getRunnerCode();

        // Push to judge queue
        JudgeJob job = JudgeJob.builder()
                .submissionId(submission.getId())
                .problemId(problemId)
                .competitionId(competition.getId())
                .userId(user.getId())
                .language(req.language().toUpperCase())
                .sourceCode(req.sourceCode())
                .runnerCode(runnerCode)
                .timeLimitMs(problem.getTimeLimitMs())
                .memoryLimitMb(problem.getMemoryLimitMb())
                .jobType("SUBMIT")
                .build();

        outboxRepository.save(JudgeOutbox.builder()
                .streamName(submissionStream)
                .payload(serialize(job))
                .build());

        return toSummary(submission, problem);
    }

    // ─── Run (no score impact) ────────────────────────────────────────────────

    public String enqueueRun(Long problemId, SubmissionDtos.RunRequest req, User user) {
        Problem problem = problemService.findOrThrow(problemId);
        validateLanguage(req.language());
        validateSourceSize(req.sourceCode());
        validateInputSize(req.input());
        validateCompetitionAcceptsSubmissions(problem.getCompetition());
        validateIsParticipant(problem.getCompetition(), user);

        String runnerCode = req.language().equalsIgnoreCase("C") ? problem.getCRunnerCode() : problem.getRunnerCode();

        String runJobId = UUID.randomUUID().toString();

        JudgeJob job = JudgeJob.builder()
                .problemId(problemId)
                .userId(user.getId())
                .language(req.language().toUpperCase())
                .sourceCode(req.sourceCode())
                .runnerCode(runnerCode)
                .timeLimitMs(problem.getTimeLimitMs())
                .memoryLimitMb(problem.getMemoryLimitMb())
                .jobType("RUN")
                .runInput(req.input())
                .runJobId(runJobId)
                .build();

        // Persist the visible QUEUED state before publishing, so SSE and polling cannot miss a fast result.
        runResultService.create(runJobId, user.getId());
        queue.enqueueRun(job);
        runResultPoller.registerRun(runJobId, user.getId());
        return runJobId;
    }

    // ─── Read ─────────────────────────────────────────────────────────────────

    public SubmissionDtos.SubmissionResponse getById(Long submissionId, User requestor) {
        Submission s = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new NotFoundException("Submission not found"));

        boolean isAdmin = requestor.getRole() == User.Role.ADMIN;

        // Participants can only view their own submissions
        if (!isAdmin && !s.getUser().getId().equals(requestor.getId())) {
            throw new ForbiddenException("Access denied");
        }

        return toResponse(s, isAdmin);
    }

    public List<SubmissionDtos.SubmissionSummary> getMySubmissions(User user) {
        return submissionRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(0, 50))
                .getContent()
                .stream()
                .map(s -> toSummary(s, s.getProblem()))
                .toList();
    }

    public Page<SubmissionDtos.SubmissionSummary> adminList(
            Long competitionId, Long problemId, Long userId, Submission.Status status, int page) {
        return submissionRepository.findByFilters(competitionId, problemId, userId, status,
                PageRequest.of(page, 50))
                .map(s -> toSummary(s, s.getProblem()));
    }

    // ─── Validation Helpers ───────────────────────────────────────────────────

    private void validateLanguage(String lang) {
        if (!SUPPORTED_LANGUAGES.contains(lang.toUpperCase())) {
            throw new BadRequestException("Unsupported language: " + lang + ". Supported: " + SUPPORTED_LANGUAGES);
        }
    }

    private void validateSourceSize(String sourceCode) {
        if (sourceCode.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > maxSourceBytes) {
            throw new BadRequestException("Source code exceeds the allowed size");
        }
    }

    private void validateInputSize(String input) {
        if (input.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > maxInputBytes) {
            throw new BadRequestException("Custom input exceeds the allowed size");
        }
    }

    private String serialize(JudgeJob job) {
        try {
            return objectMapper.writeValueAsString(job);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to create judge job", e);
        }
    }

    private void validateCompetitionAcceptsSubmissions(Competition competition) {
        if (!competition.isLive()) {
            throw new BadRequestException(
                    "Competition is not currently accepting submissions. Status: " + competition.getStatus());
        }
    }

    private void validateIsParticipant(Competition competition, User user) {
        var cpOpt = participantRepository.findByCompetitionIdAndUserId(competition.getId(), user.getId());
        if (cpOpt.isEmpty()) {
            throw new BadRequestException("You must join the competition before submitting");
        }
        var cp = cpOpt.get();
        if (cp.getAttemptEndedAt() != null) {
            throw new BadRequestException("You have already completed your attempt for this competition");
        }
        if (cp.getAttemptStartedAt() == null) {
            throw new BadRequestException("You must start your attempt before submitting");
        }
        if (competition.getTimeLimitMinutes() != null && 
            Instant.now().isAfter(cp.getAttemptStartedAt().plusSeconds(competition.getTimeLimitMinutes() * 60L))) {
            throw new BadRequestException("Your time limit for this competition has expired");
        }
    }

    private void checkRateLimit(Long userId, Long competitionId) {
        Instant oneMinuteAgo = Instant.now().minusSeconds(60);
        long recent = submissionRepository.countRecentSubmissions(userId, competitionId, oneMinuteAgo);
        if (recent >= submissionsPerMinute) {
            throw new BadRequestException(
                    "Rate limit exceeded. Maximum " + submissionsPerMinute + " submissions per minute.");
        }
    }

    // ─── Mappers ──────────────────────────────────────────────────────────────

    private SubmissionDtos.SubmissionResponse toResponse(Submission s, boolean isAdmin) {
        return new SubmissionDtos.SubmissionResponse(
                s.getId(),
                s.getUser().getId(),
                s.getUser().getUsername(),
                s.getCompetition().getId(),
                s.getProblem().getId(),
                s.getProblem().getTitle(),
                s.getLanguage(),
                s.getSourceCode(),
                s.getStatus().name(),
                s.getScore(),
                s.getMaxScore(),
                s.getPassedTestCases(),
                s.getTotalTestCases(),
                s.getExecutionTimeMs(),
                s.getMemoryUsedMb(),
                s.getErrorMessage(),
                s.getTestResults().stream().map(tr -> {
                    boolean hidden = tr.getTestCase().isHidden();
                    // If not admin and testcase is hidden, hide the details
                    boolean hideDetails = hidden && !isAdmin;
                    return new SubmissionDtos.TestResultSummary(
                            tr.getOrderIndex(),
                            tr.getStatus().name(),
                            tr.getPointsEarned(),
                            tr.getTestCase().getPoints(),
                            tr.getExecutionTimeMs(),
                            hidden,
                            hideDetails ? null : tr.getTestCase().getInput(),
                            hideDetails ? null : tr.getTestCase().getExpectedOutput(),
                            hideDetails ? null : tr.getActualOutput()
                    );
                }).toList(),
                s.getCreatedAt(),
                s.getCompletedAt()
        );
    }

    private SubmissionDtos.SubmissionSummary toSummary(Submission s, Problem p) {
        return new SubmissionDtos.SubmissionSummary(
                s.getId(), p.getId(), p.getTitle(), p.getSlug(),
                s.getUser() != null ? s.getUser().getId() : null,
                s.getUser() != null ? s.getUser().getUsername() : null,
                s.getStatus().name(), s.getScore(), s.getMaxScore(),
                s.getPassedTestCases(), s.getTotalTestCases(),
                s.getExecutionTimeMs(), s.getCreatedAt()
        );
    }
}
