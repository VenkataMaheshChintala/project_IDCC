package com.codearena.service;

import com.codearena.domain.*;
import com.codearena.dto.CompetitionDtos;
import com.codearena.exception.BadRequestException;
import com.codearena.exception.ConflictException;
import com.codearena.exception.NotFoundException;
import com.codearena.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

@Service
@RequiredArgsConstructor
public class CompetitionService {

    private final CompetitionRepository competitionRepository;
    private final CompetitionParticipantRepository participantRepository;
    private final LeaderboardEntryRepository leaderboardRepository;

    // ─── Read ─────────────────────────────────────────────────────────────────

    public List<CompetitionDtos.CompetitionSummary> listPublic(User user) {
        return competitionRepository
                .findByStatusNotOrderByCreatedAtDesc(Competition.Status.ARCHIVED)
                .stream()
                .filter(c -> c.getStatus() != Competition.Status.DRAFT)
                .map(c -> {
                    boolean joined = false;
                    boolean attemptCompleted = false;
                    Instant attemptStartedAt = null;
                    if (user != null) {
                        var cpOpt = participantRepository.findByCompetitionIdAndUserId(c.getId(), user.getId());
                        if (cpOpt.isPresent()) {
                            joined = true;
                            attemptStartedAt = cpOpt.get().getAttemptStartedAt();
                            attemptCompleted = cpOpt.get().getAttemptEndedAt() != null;
                            
                            if (!attemptCompleted && attemptStartedAt != null && c.getTimeLimitMinutes() != null) {
                                if (Instant.now().isAfter(attemptStartedAt.plusSeconds(c.getTimeLimitMinutes() * 60L))) {
                                    attemptCompleted = true;
                                }
                            }
                        }
                    }
                    return toSummary(c, participantRepository.countByCompetitionId(c.getId()), joined, attemptCompleted, attemptStartedAt);
                })
                .toList();
    }

    public List<CompetitionDtos.CompetitionSummary> listAll(User user) {
        return competitionRepository.findAll().stream()
                .map(c -> {
                    boolean joined = false;
                    boolean attemptCompleted = false;
                    Instant attemptStartedAt = null;
                    if (user != null) {
                        var cpOpt = participantRepository.findByCompetitionIdAndUserId(c.getId(), user.getId());
                        if (cpOpt.isPresent()) {
                            joined = true;
                            attemptStartedAt = cpOpt.get().getAttemptStartedAt();
                            attemptCompleted = cpOpt.get().getAttemptEndedAt() != null;
                            
                            if (!attemptCompleted && attemptStartedAt != null && c.getTimeLimitMinutes() != null) {
                                if (Instant.now().isAfter(attemptStartedAt.plusSeconds(c.getTimeLimitMinutes() * 60L))) {
                                    attemptCompleted = true;
                                }
                            }
                        }
                    }
                    return toSummary(c, participantRepository.countByCompetitionId(c.getId()), joined, attemptCompleted, attemptStartedAt);
                })
                .toList();
    }

    public CompetitionDtos.CompetitionResponse getById(Long id, User user) {
        Competition c = findOrThrow(id);
        boolean joined = false;
        boolean attemptCompleted = false;
        Instant attemptStartedAt = null;
        if (user != null) {
            var cpOpt = participantRepository.findByCompetitionIdAndUserId(id, user.getId());
            if (cpOpt.isPresent()) {
                joined = true;
                attemptStartedAt = cpOpt.get().getAttemptStartedAt();
                attemptCompleted = cpOpt.get().getAttemptEndedAt() != null;
                
                if (!attemptCompleted && attemptStartedAt != null && c.getTimeLimitMinutes() != null) {
                    if (Instant.now().isAfter(attemptStartedAt.plusSeconds(c.getTimeLimitMinutes() * 60L))) {
                        attemptCompleted = true;
                    }
                }
            }
        }
        return toResponse(c, participantRepository.countByCompetitionId(id), joined, attemptCompleted, attemptStartedAt);
    }

    // ─── Admin CRUD ──────────────────────────────────────────────────────────

    @Transactional
    public CompetitionDtos.CompetitionResponse create(CompetitionDtos.CreateRequest req, User admin) {
        Competition c = Competition.builder()
                .name(req.name())
                .description(req.description())
                .rules(req.rules())
                .timeLimitMinutes(req.timeLimitMinutes())
                .status(Competition.Status.DRAFT)
                .createdBy(admin)
                .build();
        c = competitionRepository.save(c);
        return toResponse(c, 0L, false, false, null);
    }

    @Transactional
    public CompetitionDtos.CompetitionResponse update(Long id, CompetitionDtos.UpdateRequest req) {
        Competition c = findOrThrow(id);

        if (req.name() != null) c.setName(req.name());
        if (req.description() != null) c.setDescription(req.description());
        if (req.rules() != null) c.setRules(req.rules());
        if (req.timeLimitMinutes() != null) c.setTimeLimitMinutes(req.timeLimitMinutes());
        if (req.status() != null) {
            validateStatusTransition(c.getStatus(), req.status());
            c.setStatus(req.status());
        }

        c = competitionRepository.save(c);
        return toResponse(c, participantRepository.countByCompetitionId(id), false, false, null);
    }

    @Transactional
    public void delete(Long id) {
        Competition c = findOrThrow(id);
        if (c.getStatus() == Competition.Status.LIVE) {
            throw new BadRequestException("Cannot delete a live competition");
        }
        competitionRepository.delete(c);
    }

    // ─── Participant Actions ──────────────────────────────────────────────────

    @Transactional
    public void join(Long competitionId, User user) {
        Competition c = findOrThrow(competitionId);

        if (c.getStatus() == Competition.Status.DRAFT) {
            throw new BadRequestException("Competition is not open for registration");
        }
        if (c.getStatus() == Competition.Status.ARCHIVED) {
            throw new BadRequestException("Competition has been archived");
        }
        if (participantRepository.existsByCompetitionIdAndUserId(competitionId, user.getId())) {
            throw new ConflictException("Already joined this competition");
        }

        CompetitionParticipant cp = CompetitionParticipant.builder()
                .competition(c)
                .user(user)
                .build();
        participantRepository.save(cp);

        // Initialize leaderboard entry
        LeaderboardEntry entry = LeaderboardEntry.builder()
                .competition(c)
                .user(user)
                .totalScore(0)
                .problemsSolved(0)
                .build();
        leaderboardRepository.save(entry);
    }

    @Transactional
    public void endAttempt(Long competitionId, User user) {
        CompetitionParticipant cp = participantRepository.findByCompetitionIdAndUserId(competitionId, user.getId())
                .orElseThrow(() -> new BadRequestException("You have not joined this competition"));
        
        if (cp.getAttemptEndedAt() != null) {
            throw new BadRequestException("Attempt already ended");
        }
        
        cp.setAttemptEndedAt(Instant.now());
        participantRepository.save(cp);
    }

    @Transactional
    public void startAttempt(Long competitionId, User user) {
        CompetitionParticipant cp = participantRepository.findByCompetitionIdAndUserId(competitionId, user.getId())
                .orElseThrow(() -> new BadRequestException("You have not joined this competition"));

        if (cp.getAttemptEndedAt() != null) {
            throw new BadRequestException("Attempt already ended");
        }
        
        if (cp.getAttemptStartedAt() == null) {
            cp.setAttemptStartedAt(Instant.now());
            participantRepository.save(cp);
        }
    }

    public boolean isParticipant(Long competitionId, Long userId) {
        return participantRepository.existsByCompetitionIdAndUserId(competitionId, userId);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    public Competition findOrThrow(Long id) {
        return competitionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Competition not found: " + id));
    }

    private void validateStatusTransition(Competition.Status from, Competition.Status to) {
        // Admin manually manages status, any transition is allowed
    }

    private CompetitionDtos.CompetitionResponse toResponse(Competition c, long participantCount, boolean joined, boolean attemptCompleted, Instant attemptStartedAt) {
        return new CompetitionDtos.CompetitionResponse(
                c.getId(), c.getName(), c.getDescription(), c.getRules(),
                c.getStatus().name(),
                participantCount, c.getCreatedAt(), c.getUpdatedAt(),
                Instant.now(), c.getTimeLimitMinutes(), joined, attemptCompleted, attemptStartedAt
        );
    }

    private CompetitionDtos.CompetitionSummary toSummary(Competition c, long participantCount, boolean joined, boolean attemptCompleted, Instant attemptStartedAt) {
        return new CompetitionDtos.CompetitionSummary(
                c.getId(), c.getName(), c.getDescription(),
                c.getStatus().name(),
                c.getTimeLimitMinutes(), participantCount, joined, attemptCompleted, attemptStartedAt
        );
    }
    // ─── Export ───────────────────────────────────────────────────────────────

    public ResponseEntity<Resource> exportParticipantsExcel(Long competitionId) {
        Competition competition = findOrThrow(competitionId);
        List<CompetitionParticipant> participants = participantRepository.findByCompetitionId(competitionId);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Participants");

            // Header
            Row headerRow = sheet.createRow(0);
            String[] columns = {"Status", "Team Name", "Student 1 Name", "Student 1 Roll No",
                    "Student 2 Name", "Student 2 Roll No", "Phone Number",
                    "Joined At", "Attempt Started At", "Attempt Ended At"};

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                    .withZone(ZoneId.systemDefault());

            int rowIdx = 1;
            for (CompetitionParticipant p : participants) {
                Row row = sheet.createRow(rowIdx++);
                User u = p.getUser();

                String status = "REGISTERED";
                if (p.getAttemptStartedAt() != null) {
                    status = p.getAttemptEndedAt() != null ? "COMPLETED" : "IN_PROGRESS";
                }

                row.createCell(0).setCellValue(status);
                row.createCell(1).setCellValue(u.getUsername());
                row.createCell(2).setCellValue(u.getStudent1Name() != null ? u.getStudent1Name() : "");
                row.createCell(3).setCellValue(u.getStudent1Rollno() != null ? u.getStudent1Rollno() : "");
                row.createCell(4).setCellValue(u.getStudent2Name() != null ? u.getStudent2Name() : "");
                row.createCell(5).setCellValue(u.getStudent2Rollno() != null ? u.getStudent2Rollno() : "");
                row.createCell(6).setCellValue(u.getPhoneNumber() != null ? u.getPhoneNumber() : "");
                
                row.createCell(7).setCellValue(p.getJoinedAt() != null ? formatter.format(p.getJoinedAt()) : "");
                row.createCell(8).setCellValue(p.getAttemptStartedAt() != null ? formatter.format(p.getAttemptStartedAt()) : "");
                row.createCell(9).setCellValue(p.getAttemptEndedAt() != null ? formatter.format(p.getAttemptEndedAt()) : "");
            }

            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            ByteArrayResource resource = new ByteArrayResource(out.toByteArray());

            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=competition_" + competitionId + "_participants.xlsx");

            return ResponseEntity.ok()
                    .headers(headers)
                    .contentLength(resource.contentLength())
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(resource);

        } catch (IOException e) {
            throw new RuntimeException("Failed to generate Excel file", e);
        }
    }
}
