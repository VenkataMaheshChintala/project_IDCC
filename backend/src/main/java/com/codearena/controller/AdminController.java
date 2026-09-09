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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.codearena.dto.LeaderboardDtos;

import java.io.IOException;
import java.io.StringWriter;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final SubmissionService submissionService;
    private final LeaderboardService leaderboardService;
    private final CompetitionService competitionService;
    private final com.codearena.repository.SubmissionRepository submissionRepository;

    @GetMapping("/submissions")
    public ResponseEntity<Page<SubmissionDtos.SubmissionSummary>> listSubmissions(
            @RequestParam(required = false) Long competitionId,
            @RequestParam(required = false) Long problemId,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page) {

        Submission.Status statusEnum = null;
        if (status != null && !status.isBlank()) {
            statusEnum = Submission.Status.valueOf(status.toUpperCase());
        }

        return ResponseEntity.ok(
                submissionService.adminList(competitionId, problemId, userId, statusEnum, page));
    }

    @GetMapping("/competitions/{competitionId}/leaderboard/export")
    public ResponseEntity<String> exportLeaderboard(@PathVariable Long competitionId) throws IOException {
        LeaderboardDtos.LeaderboardResponse lb = leaderboardService.getLeaderboard(competitionId);

        StringWriter sw = new StringWriter();
        CSVFormat format = CSVFormat.DEFAULT.builder()
                .setHeader("Rank", "Username", "Score", "Problems Solved", "Last Accepted")
                .build();

        try (CSVPrinter printer = new CSVPrinter(sw, format)) {
            for (LeaderboardDtos.RankEntry entry : lb.entries()) {
                printer.printRecord(
                        entry.rank(),
                        entry.username(),
                        entry.totalScore(),
                        entry.problemsSolved(),
                        entry.lastAcceptedAt() != null ? entry.lastAcceptedAt().toString() : ""
                );
            }
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"leaderboard-" + competitionId + ".csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(sw.toString());
    }

    @GetMapping("/competitions/{competitionId}/submissions/export")
    public ResponseEntity<String> exportSubmissions(@PathVariable Long competitionId) throws IOException {
        var submissions = submissionRepository.findByCompetitionIdOrderByCreatedAtDesc(competitionId, org.springframework.data.domain.Pageable.unpaged());

        StringWriter sw = new StringWriter();
        CSVFormat format = CSVFormat.DEFAULT.builder()
                .setHeader("ID", "Username", "Problem", "Status", "Score", "Language", "Time (ms)", "Submitted At", "Code")
                .build();

        try (CSVPrinter printer = new CSVPrinter(sw, format)) {
            for (var s : submissions.getContent()) {
                printer.printRecord(
                        s.getId(),
                        s.getUser().getUsername(),
                        s.getProblem().getTitle(),
                        s.getStatus().name(),
                        s.getScore(),
                        s.getLanguage(),
                        s.getExecutionTimeMs(),
                        s.getCreatedAt().toString(),
                        s.getSourceCode()
                );
            }
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"submissions-" + competitionId + ".csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(sw.toString());
    }
}
