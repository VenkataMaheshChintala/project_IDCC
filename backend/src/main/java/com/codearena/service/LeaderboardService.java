package com.codearena.service;

import com.codearena.domain.*;
import com.codearena.dto.LeaderboardDtos;
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
            // Find best accepted submission for this problem
            List<Submission> accepted = submissionRepository.findBestAccepted(
                    competitionId, userId, problem.getId());

            if (!accepted.isEmpty()) {
                Submission best = accepted.get(0);
                totalScore += best.getScore();
                solved++;
                if (lastAccepted == null || best.getCompletedAt().isAfter(lastAccepted)) {
                    lastAccepted = best.getCompletedAt();
                }
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
}
