package com.codearena.judge.store;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

/**
 * Direct JDBC access for the judge worker.
 * Avoids full JPA stack in the worker for simplicity and performance.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SubmissionStore {

    private final JdbcTemplate jdbc;

    public void updateStatus(Long submissionId, String status) {
        jdbc.update(
                "UPDATE submissions SET status = ? WHERE id = ? AND status NOT IN ('ACCEPTED','WRONG_ANSWER','COMPILATION_ERROR','RUNTIME_ERROR','TIME_LIMIT_EXCEEDED','MEMORY_LIMIT_EXCEEDED','SYSTEM_ERROR')",
                status, submissionId
        );
    }

    @Transactional
    public void saveResult(Long submissionId, String status, int score, int maxScore,
                           int passedTestCases,
                           long executionTimeMs, int memoryUsedMb, String errorMessage,
                           List<TestCaseResultRecord> testResults, Instant completedAt) {
        // Check for idempotency — if already terminal, skip
        List<Integer> existing = jdbc.query(
                "SELECT 1 FROM submissions WHERE id = ? AND status NOT IN ('QUEUED','RUNNING')",
                (rs, rowNum) -> 1,
                submissionId);
        if (!existing.isEmpty()) {
            log.warn("[Store] Submission {} already in terminal state — skipping", submissionId);
            return;
        }

        jdbc.update("""
            UPDATE submissions
            SET status = ?, score = ?, max_score = ?,
                passed_test_cases = ?,
                execution_time_ms = ?, memory_used_mb = ?,
                error_message = ?, completed_at = ?
            WHERE id = ?
            """,
                status, score, maxScore, passedTestCases,
                executionTimeMs, memoryUsedMb,
                errorMessage, Timestamp.from(completedAt),
                submissionId
        );

        // Insert test results
        for (TestCaseResultRecord tr : testResults) {
            jdbc.update("""
                INSERT INTO submission_test_results
                    (submission_id, test_case_id, status, points_earned, execution_time_ms, memory_used_mb, actual_output, order_index)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    submissionId, tr.testCaseId(), tr.status(), tr.pointsEarned(),
                    tr.executionTimeMs(), tr.memoryUsedMb(),
                    tr.actualOutput() != null ? tr.actualOutput().substring(0, Math.min(tr.actualOutput().length(), 10_000)) : null,
                    tr.orderIndex()
            );
        }
    }

    public List<TestCaseRecord> getTestCases(Long problemId) {
        return jdbc.query("""
            SELECT id, input, expected_output, is_hidden, points, order_index
            FROM test_cases
            WHERE problem_id = ?
            ORDER BY order_index ASC
            """,
                (rs, row) -> new TestCaseRecord(
                        rs.getLong("id"),
                        rs.getString("input"),
                        rs.getString("expected_output"),
                        rs.getBoolean("is_hidden"),
                        rs.getInt("points"),
                        rs.getInt("order_index")
                ),
                problemId
        );
    }

    public Long getCompetitionIdForSubmission(Long submissionId) {
        try {
            return jdbc.queryForObject(
                    "SELECT competition_id FROM submissions WHERE id = ?",
                    Long.class, submissionId);
        } catch (Exception e) {
            return null;
        }
    }

    public Long getUserIdForSubmission(Long submissionId) {
        try {
            return jdbc.queryForObject(
                    "SELECT user_id FROM submissions WHERE id = ?",
                    Long.class, submissionId);
        } catch (Exception e) {
            return null;
        }
    }

    public void updateLeaderboard(Long competitionId, Long userId) {
        // Recalculate total score from best accepted per problem
        jdbc.update("""
            INSERT INTO leaderboard_entries (competition_id, user_id, total_score, problems_solved, last_accepted_at, updated_at)
            SELECT
                comp.id,
                u.id,
                COALESCE(SUM(best.best_score), 0),
                COUNT(DISTINCT CASE WHEN best.best_score > 0 THEN best.problem_id END),
                MAX(best.completed_at),
                NOW()
            FROM competitions comp
            JOIN (SELECT id FROM users WHERE id = ?) u ON true
            LEFT JOIN LATERAL (
                SELECT s.problem_id, MAX(s.score) as best_score, MAX(s.completed_at) as completed_at
                FROM submissions s
                WHERE s.competition_id = comp.id
                  AND s.user_id = u.id
                  AND s.status = 'ACCEPTED'
                GROUP BY s.problem_id
            ) best ON true
            WHERE comp.id = ?
            GROUP BY comp.id, u.id
            ON CONFLICT (competition_id, user_id) DO UPDATE
              SET total_score = EXCLUDED.total_score,
                  problems_solved = EXCLUDED.problems_solved,
                  last_accepted_at = EXCLUDED.last_accepted_at,
                  updated_at = NOW()
            """,
                userId, competitionId
        );
    }
}
