package com.codearena.controller;

import com.codearena.domain.Submission;
import com.codearena.dto.SubmissionDtos;
import com.codearena.service.CompetitionService;
import com.codearena.service.LeaderboardService;
import com.codearena.service.SubmissionService;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.data.domain.Page;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.codearena.dto.LeaderboardDtos;
import com.codearena.dto.CompetitionDtos;

import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.io.IOException;
import java.io.StringWriter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final SubmissionService submissionService;
    private final LeaderboardService leaderboardService;
    private final CompetitionService competitionService;
    private final com.codearena.repository.SubmissionRepository submissionRepository;
    private final StringRedisTemplate stringRedisTemplate;

    @PersistenceContext
    private EntityManager entityManager;

    @GetMapping("/submissions")
    public ResponseEntity<Page<SubmissionDtos.SubmissionSummary>> listSubmissions(
            @RequestParam(required = false) Long competitionId,
            @RequestParam(required = false) Long problemId,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page) {

        Submission.Status statusEnum = null;
        if (status != null && !status.isBlank()) {
            try {
                statusEnum = Submission.Status.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }

        return ResponseEntity.ok(
                submissionService.adminList(competitionId, problemId, userId, statusEnum, page));
    }

    @GetMapping("/competitions/{id}/participants")
    public ResponseEntity<List<CompetitionDtos.ParticipantResponse>> listParticipants(@PathVariable Long id) {
        return ResponseEntity.ok(competitionService.getParticipants(id));
    }

    @PostMapping("/competitions/{id}/participants/{userId}/resume")
    public ResponseEntity<Void> resumeParticipant(@PathVariable Long id, @PathVariable Long userId) {
        competitionService.resumeAttempt(id, userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/competitions/{id}/participants/{userId}/details")
    public ResponseEntity<CompetitionDtos.ParticipantDetailsResponse> getParticipantDetails(@PathVariable Long id, @PathVariable Long userId) {
        return ResponseEntity.ok(leaderboardService.getParticipantDetails(id, userId));
    }

    @GetMapping("/competitions/{competitionId}/leaderboard/export")
    @Transactional(readOnly = true)
    public ResponseEntity<String> exportLeaderboard(@PathVariable Long competitionId) throws IOException {
        LeaderboardDtos.LeaderboardResponse lb = leaderboardService.getLeaderboard(competitionId);

        StringWriter sw = new StringWriter();
        CSVFormat format = CSVFormat.DEFAULT.builder()
                .setHeader("Rank", "Username", "Score", "Problems Solved", "Last Accepted")
                .build();

        try (CSVPrinter printer = new CSVPrinter(sw, format)) {
            if (lb != null && lb.entries() != null) {
                for (LeaderboardDtos.RankEntry entry : lb.entries()) {
                    printer.printRecord(
                            entry.rank(),
                            entry.username() != null ? entry.username() : "",
                            entry.totalScore(),
                            entry.problemsSolved(),
                            entry.lastAcceptedAt() != null ? entry.lastAcceptedAt().toString() : ""
                    );
                }
            }
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"leaderboard-" + competitionId + ".csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(sw.toString());
    }

    @GetMapping("/competitions/{competitionId}/submissions/export")
    @Transactional(readOnly = true)
    public ResponseEntity<String> exportSubmissions(@PathVariable Long competitionId) throws IOException {
        List<Submission> submissions = submissionRepository.findByCompetitionIdWithUserAndProblemOrderByCreatedAtDesc(competitionId);

        StringWriter sw = new StringWriter();
        CSVFormat format = CSVFormat.DEFAULT.builder()
                .setHeader("ID", "Username", "Problem", "Status", "Score", "Language", "Time (ms)", "Submitted At", "Code")
                .build();

        try (CSVPrinter printer = new CSVPrinter(sw, format)) {
            for (Submission s : submissions) {
                printer.printRecord(
                        s.getId(),
                        s.getUser() != null ? s.getUser().getUsername() : "Unknown",
                        s.getProblem() != null ? s.getProblem().getTitle() : "Unknown",
                        s.getStatus() != null ? s.getStatus().name() : "",
                        s.getScore(),
                        s.getLanguage() != null ? s.getLanguage() : "",
                        s.getExecutionTimeMs(),
                        s.getCreatedAt() != null ? s.getCreatedAt().toString() : "",
                        s.getSourceCode() != null ? s.getSourceCode() : ""
                );
            }
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"submissions-" + competitionId + ".csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(sw.toString());
    }

    @PostMapping("/reset-participant-data")
    @Transactional
    public ResponseEntity<Map<String, Object>> resetParticipantData() {
        // Count before deleting for the response summary
        Long submissionCount = (Long) entityManager
                .createNativeQuery("SELECT COUNT(*) FROM submissions").getSingleResult();
        Long participantCount = (Long) entityManager
                .createNativeQuery("SELECT COUNT(*) FROM competition_participants").getSingleResult();
        Long leaderboardCount = (Long) entityManager
                .createNativeQuery("SELECT COUNT(*) FROM leaderboard_entries").getSingleResult();
        Long userCount = (Long) entityManager
                .createNativeQuery("SELECT COUNT(*) FROM users WHERE role != 'ADMIN'").getSingleResult();

        // Truncate in foreign-key-safe order
        entityManager.createNativeQuery("TRUNCATE submission_test_results CASCADE").executeUpdate();
        entityManager.createNativeQuery("TRUNCATE submissions CASCADE").executeUpdate();
        entityManager.createNativeQuery("TRUNCATE leaderboard_entries CASCADE").executeUpdate();
        entityManager.createNativeQuery("TRUNCATE competition_participants CASCADE").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM users WHERE role != 'ADMIN'").executeUpdate();

        // Clear active session keys only (don't flush streams used by judge-worker)
        try {
            var keys = stringRedisTemplate.keys("session:*");
            if (keys != null && !keys.isEmpty()) {
                stringRedisTemplate.delete(keys);
            }
        } catch (Exception ignored) {
            // Redis cleanup is best-effort
        }

        return ResponseEntity.ok(Map.of(
                "message", "All participant data has been reset",
                "deletedSubmissions", submissionCount,
                "deletedParticipants", participantCount,
                "deletedLeaderboardEntries", leaderboardCount,
                "deletedUsers", userCount
        ));
    }
}
