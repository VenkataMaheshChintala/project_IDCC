package com.codearena.repository;

import com.codearena.domain.Problem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProblemRepository extends JpaRepository<Problem, Long> {
    List<Problem> findByCompetitionIdOrderBySlugAsc(Long competitionId);
    Optional<Problem> findByCompetitionIdAndSlug(Long competitionId, String slug);
    boolean existsByCompetitionIdAndSlug(Long competitionId, String slug);
}
