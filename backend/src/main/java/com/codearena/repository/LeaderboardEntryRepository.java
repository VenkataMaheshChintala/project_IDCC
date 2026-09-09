package com.codearena.repository;

import com.codearena.domain.LeaderboardEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LeaderboardEntryRepository extends JpaRepository<LeaderboardEntry, Long> {

    Optional<LeaderboardEntry> findByCompetitionIdAndUserId(Long competitionId, Long userId);

    @Query("""
        SELECT le FROM LeaderboardEntry le
        JOIN FETCH le.user
        WHERE le.competition.id = :competitionId
        ORDER BY le.totalScore DESC, le.lastAcceptedAt ASC NULLS LAST
    """)
    List<LeaderboardEntry> findByCompetitionIdOrdered(@Param("competitionId") Long competitionId);
}
