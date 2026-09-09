package com.codearena.controller;

import com.codearena.domain.User;
import com.codearena.dto.ProblemDtos;
import com.codearena.dto.TestCaseDtos;
import com.codearena.service.ProblemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ProblemController {

    private final ProblemService problemService;

    // ─── Problems in a competition ─────────────────────────────────────────────

    @GetMapping("/api/competitions/{competitionId}/problems")
    public ResponseEntity<List<ProblemDtos.ProblemSummary>> listProblems(
            @PathVariable Long competitionId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(problemService.listByCompetition(competitionId, user));
    }

    @PostMapping("/api/competitions/{competitionId}/problems")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProblemDtos.ProblemResponse> createProblem(
            @PathVariable Long competitionId,
            @Valid @RequestBody ProblemDtos.CreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(problemService.create(competitionId, req));
    }

    // ─── Individual problem ────────────────────────────────────────────────────

    @GetMapping("/api/problems/{id}")
    public ResponseEntity<?> getProblem(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        if (user != null && user.getRole() == User.Role.ADMIN) {
            return ResponseEntity.ok(problemService.getByIdAdmin(id));
        }
        return ResponseEntity.ok(problemService.getById(id));
    }

    @PutMapping("/api/problems/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProblemDtos.ProblemResponse> updateProblem(
            @PathVariable Long id,
            @RequestBody ProblemDtos.UpdateRequest req) {
        return ResponseEntity.ok(problemService.update(id, req));
    }

    @DeleteMapping("/api/problems/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteProblem(@PathVariable Long id) {
        problemService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Test Cases ────────────────────────────────────────────────────────────

    @PostMapping("/api/problems/{problemId}/test-cases")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TestCaseDtos.TestCaseAdminResponse> addTestCase(
            @PathVariable Long problemId,
            @Valid @RequestBody TestCaseDtos.CreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(problemService.addTestCase(problemId, req));
    }

    @DeleteMapping("/api/test-cases/{testCaseId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteTestCase(@PathVariable Long testCaseId) {
        problemService.deleteTestCase(testCaseId);
        return ResponseEntity.noContent().build();
    }
}
