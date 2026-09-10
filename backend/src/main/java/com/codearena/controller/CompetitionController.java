package com.codearena.controller;

import com.codearena.domain.User;
import com.codearena.dto.CompetitionDtos;
import com.codearena.service.CompetitionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.core.io.Resource;

import java.util.List;

@RestController
@RequestMapping("/api/competitions")
@RequiredArgsConstructor
public class CompetitionController {

    private final CompetitionService competitionService;

    // ─── Public ───────────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<CompetitionDtos.CompetitionSummary>> list(
            @AuthenticationPrincipal User user) {
        // Admins see all including drafts; participants see published only
        if (user != null && user.getRole() == User.Role.ADMIN) {
            return ResponseEntity.ok(competitionService.listAll(user));
        }
        return ResponseEntity.ok(competitionService.listPublic(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CompetitionDtos.CompetitionResponse> get(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(competitionService.getById(id, user));
    }

    // ─── Admin CRUD ───────────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CompetitionDtos.CompetitionResponse> create(
            @Valid @RequestBody CompetitionDtos.CreateRequest req,
            @AuthenticationPrincipal User admin) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(competitionService.create(req, admin));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CompetitionDtos.CompetitionResponse> update(
            @PathVariable Long id,
            @RequestBody CompetitionDtos.UpdateRequest req) {
        return ResponseEntity.ok(competitionService.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        competitionService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/participants/export")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Resource> exportParticipants(@PathVariable Long id) {
        return competitionService.exportParticipantsExcel(id);
    }

    // ─── Participant actions ──────────────────────────────────────────────────

    @PostMapping("/{id}/join")
    public ResponseEntity<Void> join(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        competitionService.join(id, user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/end-attempt")
    public ResponseEntity<Void> endAttempt(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        competitionService.endAttempt(id, user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/start-attempt")
    public ResponseEntity<Void> startAttempt(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        competitionService.startAttempt(id, user);
        return ResponseEntity.ok().build();
    }
}
