package com.codearena.repository;

import com.codearena.domain.Submission;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Long> {

    Page<Submission> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Page<Submission> findByCompetitionIdOrderByCreatedAtDesc(Long competitionId, Pageable pageable);

    List<Submission> findByUserIdAndProblemIdAndCompetitionIdOrderByCreatedAtDesc(
            Long userId, Long problemId, Long competitionId);

    List<Submission> findByCompetitionIdAndUserId(Long competitionId, Long userId);

    @Query("""
        SELECT s FROM Submission s
        WHERE s.competition.id = :compId
        AND s.user.id = :userId
        AND s.problem.id = :problemId
        AND s.status = 'ACCEPTED'
        ORDER BY s.score DESC
    """)
    List<Submission> findBestAccepted(
            @Param("compId") Long competitionId,
            @Param("userId") Long userId,
            @Param("problemId") Long problemId);

    @Query("""
        SELECT COUNT(s) FROM Submission s
        WHERE s.user.id = :userId
        AND s.competition.id = :compId
        AND s.createdAt > :since
    """)
    long countRecentSubmissions(
            @Param("userId") Long userId,
            @Param("compId") Long competitionId,
            @Param("since") java.time.Instant since);

    Optional<Submission> findByIdAndUserId(Long id, Long userId);

    @Query("""
        SELECT s FROM Submission s
        WHERE (:competitionId IS NULL OR s.competition.id = :competitionId)
        AND (:problemId IS NULL OR s.problem.id = :problemId)
        AND (:userId IS NULL OR s.user.id = :userId)
        AND (:status IS NULL OR s.status = :status)
        ORDER BY s.createdAt DESC
    """)
    Page<Submission> findByFilters(
            @Param("competitionId") Long competitionId,
            @Param("problemId") Long problemId,
            @Param("userId") Long userId,
            @Param("status") Submission.Status status,
            Pageable pageable);
}
