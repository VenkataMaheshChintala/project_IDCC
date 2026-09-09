package com.codearena.judge.engine;

import com.codearena.judge.comparator.OutputComparator;
import com.codearena.judge.model.ExecutionResult;
import com.codearena.judge.model.JudgeJob;
import com.codearena.judge.sandbox.DockerSandbox;
import com.codearena.judge.store.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Core judge engine. Runs a submission against all test cases
 * and calculates the score.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class JudgeEngine {

    private final DockerSandbox sandbox;
    private final OutputComparator comparator;
    private final SubmissionStore submissionStore;

    /**
     * Judge a submission job. Updates the database directly.
     */
    public JudgeResult judge(JudgeJob job) {
        log.info("[Judge] Starting submission={} problem={}", job.getSubmissionId(), job.getProblemId());

        // Mark as RUNNING
        submissionStore.updateStatus(job.getSubmissionId(), "RUNNING");

        List<TestCaseRecord> testCases = submissionStore.getTestCases(job.getProblemId());

        if (testCases.isEmpty()) {
            log.warn("[Judge] No test cases for problem={}", job.getProblemId());
            submissionStore.saveResult(job.getSubmissionId(), "ACCEPTED", 0, 0, 0, 0L, 0, null,
                    List.of(), Instant.now());
            return JudgeResult.accepted(0, 0, 0);
        }

        // ── Run against each test case ──────────────────────────────────────
        List<TestCaseResultRecord> results = new ArrayList<>();
        int totalScore = 0;
        int maxScore = 0;
        long maxTime = 0;
        String finalStatus = "ACCEPTED";
        String compilationError = null;

        int passedTestCases = 0;

        for (TestCaseRecord tc : testCases) {
            maxScore += tc.points();

            ExecutionResult execResult = sandbox.execute(
                    job.getLanguage(), job.getSourceCode(), job.getRunnerCode(), tc.input(), job.getTimeLimitMs(), job.getMemoryLimitMb());

            String tcStatus;
            int pointsEarned = 0;

            switch (execResult.getVerdict()) {
                case ACCEPTED -> {
                    boolean correct = comparator.matches(tc.expectedOutput(), execResult.getStdout());
                    if (correct) {
                        tcStatus = "ACCEPTED";
                        pointsEarned = tc.points();
                        totalScore += pointsEarned;
                        passedTestCases++;
                    } else {
                        tcStatus = "WRONG_ANSWER";
                        if (finalStatus.equals("ACCEPTED")) finalStatus = "WRONG_ANSWER";
                    }
                }
                case COMPILATION_ERROR -> {
                    tcStatus = "COMPILATION_ERROR";
                    finalStatus = "COMPILATION_ERROR";
                    compilationError = truncate(execResult.getStderr(), 2000);
                }
                case TIME_LIMIT_EXCEEDED -> {
                    tcStatus = "TIME_LIMIT_EXCEEDED";
                    if (!finalStatus.equals("COMPILATION_ERROR")) finalStatus = "TIME_LIMIT_EXCEEDED";
                }
                case RUNTIME_ERROR -> {
                    tcStatus = "RUNTIME_ERROR";
                    if (!finalStatus.equals("COMPILATION_ERROR") && !finalStatus.equals("TIME_LIMIT_EXCEEDED"))
                        finalStatus = "RUNTIME_ERROR";
                }
                case MEMORY_LIMIT_EXCEEDED -> {
                    tcStatus = "MEMORY_LIMIT_EXCEEDED";
                    if (finalStatus.equals("ACCEPTED")) finalStatus = "MEMORY_LIMIT_EXCEEDED";
                }
                default -> {
                    tcStatus = "SYSTEM_ERROR";
                    if (finalStatus.equals("ACCEPTED")) finalStatus = "SYSTEM_ERROR";
                }
            }

            if (execResult.getExecutionTimeMs() > maxTime) {
                maxTime = execResult.getExecutionTimeMs();
            }

            results.add(new TestCaseResultRecord(
                    tc.id(), tcStatus, pointsEarned, execResult.getExecutionTimeMs(),
                    execResult.getMemoryUsedMb(), execResult.getStdout(), tc.orderIndex()
            ));

            // Stop after compilation error — all remaining tests would fail the same way
            if ("COMPILATION_ERROR".equals(tcStatus)) break;
        }

        // If partial score but all passed, ACCEPTED; else use worst verdict
        if (totalScore == maxScore) finalStatus = "ACCEPTED";

        log.info("[Judge] submission={} status={} score={}/{} passed={}/{} time={}ms",
                job.getSubmissionId(), finalStatus, totalScore, maxScore, passedTestCases, testCases.size(), maxTime);

        submissionStore.saveResult(job.getSubmissionId(), finalStatus,
                totalScore, maxScore, passedTestCases, maxTime, 0, compilationError, results, Instant.now());

        return new JudgeResult(finalStatus, totalScore, maxScore, maxTime);
    }

    /**
     * Execute a RUN job — no DB update, just return output.
     */
    public ExecutionResult run(JudgeJob job) {
        log.info("[Judge] Run job={} problem={}", job.getRunJobId(), job.getProblemId());
        return sandbox.execute(job.getLanguage(), job.getSourceCode(), job.getRunnerCode(), job.getRunInput(),
                job.getTimeLimitMs(), job.getMemoryLimitMb());
    }

    private String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() > max ? s.substring(0, max) + "\n[truncated]" : s;
    }

    public record JudgeResult(String status, int score, int maxScore, long executionTimeMs) {
        public static JudgeResult accepted(int score, int maxScore, long time) {
            return new JudgeResult("ACCEPTED", score, maxScore, time);
        }
    }
}
