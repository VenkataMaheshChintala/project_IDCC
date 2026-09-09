package com.codearena.repository;

import com.codearena.domain.CompetitionParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompetitionParticipantRepository extends JpaRepository<CompetitionParticipant, Long> {

    boolean existsByCompetitionIdAndUserId(Long competitionId, Long userId);

    Optional<CompetitionParticipant> findByCompetitionIdAndUserId(Long competitionId, Long userId);

    List<CompetitionParticipant> findByCompetitionId(Long competitionId);

    @Query("SELECT COUNT(cp) FROM CompetitionParticipant cp WHERE cp.competition.id = :competitionId")
    long countByCompetitionId(@Param("competitionId") Long competitionId);
}
