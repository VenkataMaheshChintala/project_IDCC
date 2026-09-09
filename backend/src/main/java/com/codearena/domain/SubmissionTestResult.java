package com.codearena.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "submission_test_results")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class SubmissionTestResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id", nullable = false)
    private Submission submission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_case_id", nullable = false)
    private TestCase testCase;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Submission.Status status;

    @Column(name = "points_earned", nullable = false)
    private int pointsEarned;

    @Column(name = "execution_time_ms")
    private Long executionTimeMs;

    @Column(name = "memory_used_mb")
    private Integer memoryUsedMb;

    @Column(name = "actual_output", columnDefinition = "TEXT")
    private String actualOutput;   // NEVER returned to participants for hidden tests

    @Column(name = "order_index", nullable = false)
    private int orderIndex;
}
