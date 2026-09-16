package com.codearena.service;

import com.codearena.domain.*;
import com.codearena.dto.LeaderboardDtos;
import com.codearena.dto.CompetitionDtos;
import com.codearena.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeaderboardService {

    private final LeaderboardEntryRepository leaderboardRepository;
    private final SubmissionRepository submissionRepository;
    private final CompetitionService competitionService;
    private final SubmissionService submissionService;

    @Transactional(readOnly = true)
    public LeaderboardDtos.LeaderboardResponse getLeaderboard(Long competitionId) {
        Competition competition = competitionService.findOrThrow(competitionId);
        List<LeaderboardEntry> entries = leaderboardRepository.findByCompetitionIdOrdered(competitionId);

        List<LeaderboardDtos.RankEntry> ranked = new ArrayList<>();
        int rank = 1;
        for (LeaderboardEntry e : entries) {
            ranked.add(new LeaderboardDtos.RankEntry(
                    rank++,
                    e.getUser().getId(),
                    e.getUser().getUsername(),
                    e.getTotalScore(),
                    e.getProblemsSolved(),
                    e.getLastAcceptedAt()
            ));
        }

        return new LeaderboardDtos.LeaderboardResponse(
                competitionId, competition.getName(), ranked, Instant.now()
        );
    }

    /**
     * Called after a submission is judged. Updates or creates leaderboard entry
     * using the participant's best score per problem.
     */
    @Transactional
    public void recalculate(Long competitionId, Long userId) {
        Competition competition = competitionService.findOrThrow(competitionId);

        // Get all problems in competition
        List<Problem> problems = competition.getProblems();

        int totalScore = 0;
        int solved = 0;
        Instant lastAccepted = null;

        for (Problem problem : problems) {
            // Find highest-scoring submission for this problem (including partial scores)
            org.springframework.data.domain.Page<Submission> highest = submissionRepository.findHighestScoringSubmission(
                    competitionId, userId, problem.getId(), org.springframework.data.domain.PageRequest.of(0, 1));

            if (highest.hasContent()) {
                Submission best = highest.getContent().get(0);
                totalScore += best.getScore();
                if (best.getScore() > 0) {
                    Instant compTime = best.getCompletedAt() != null ? best.getCompletedAt() : best.getCreatedAt();
                    if (compTime != null && (lastAccepted == null || compTime.isAfter(lastAccepted))) {
                        lastAccepted = compTime;
                    }
                }
            }

            // A problem is considered solved only if fully ACCEPTED
            List<Submission> accepted = submissionRepository.findBestAccepted(
                    competitionId, userId, problem.getId());
            if (!accepted.isEmpty()) {
                solved++;
            }
        }

        LeaderboardEntry entry = leaderboardRepository
                .findByCompetitionIdAndUserId(competitionId, userId)
                .orElseGet(() -> {
                    // Create new entry if participant joined during live competition
                    User user = new User();
                    user.setId(userId);
                    LeaderboardEntry ne = new LeaderboardEntry();
                    ne.setCompetition(competition);
                    ne.setUser(user);
                    return ne;
                });

        entry.setTotalScore(totalScore);
        entry.setProblemsSolved(solved);
        entry.setLastAcceptedAt(lastAccepted);
        leaderboardRepository.save(entry);

        log.info("[Leaderboard] competition={} user={} score={} solved={}",
                competitionId, userId, totalScore, solved);
    }

    @Transactional
    public void recalculateCompetition(Long competitionId) {
        List<LeaderboardEntry> entries = leaderboardRepository.findByCompetitionIdOrdered(competitionId);
        for (LeaderboardEntry entry : entries) {
            recalculate(competitionId, entry.getUser().getId());
        }
    }

    @Transactional(readOnly = true)
    public CompetitionDtos.ParticipantDetailsResponse getParticipantDetails(Long competitionId, Long userId) {
        Competition competition = competitionService.findOrThrow(competitionId);
        
        LeaderboardEntry entry = leaderboardRepository
                .findByCompetitionIdAndUserId(competitionId, userId)
                .orElse(null);

        int totalScore = entry != null ? entry.getTotalScore() : 0;
        int solved = entry != null ? entry.getProblemsSolved() : 0;
        String username = entry != null ? entry.getUser().getUsername() : "Unknown";

        if (entry == null) {
            // fallback to finding user if they haven't submitted anything but joined
            var participant = competitionService.getParticipants(competitionId).stream()
                .filter(p -> p.userId().equals(userId))
                .findFirst();
            if (participant.isPresent()) {
                username = participant.get().username();
            }
        }

        List<CompetitionDtos.ProblemAttemptDetails> attempts = new ArrayList<>();

        for (Problem problem : competition.getProblems()) {
            org.springframework.data.domain.Page<Submission> bestSubmissions = submissionRepository.findHighestScoringSubmission(
                    competitionId, userId, problem.getId(), org.springframework.data.domain.PageRequest.of(0, 1));
            
            if (bestSubmissions.hasContent()) {
                Submission best = bestSubmissions.getContent().get(0);
                attempts.add(new CompetitionDtos.ProblemAttemptDetails(
                        problem.getId(),
                        problem.getTitle(),
                        problem.getPoints(),
                        submissionService.toResponse(best, true)
                ));
            } else {
                attempts.add(new CompetitionDtos.ProblemAttemptDetails(
                        problem.getId(),
                        problem.getTitle(),
                        problem.getPoints(),
                        null
                ));
            }
        }

        return new CompetitionDtos.ParticipantDetailsResponse(
                userId,
                username,
                totalScore,
                solved,
                attempts
        );
    }
}
