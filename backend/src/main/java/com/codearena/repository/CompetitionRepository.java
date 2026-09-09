package com.codearena.repository;

import com.codearena.domain.Competition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CompetitionRepository extends JpaRepository<Competition, Long> {
    List<Competition> findByStatusIn(List<Competition.Status> statuses);
    List<Competition> findByStatusNotOrderByCreatedAtDesc(Competition.Status status);
}
