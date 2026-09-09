package com.codearena.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "competition_participants",
       uniqueConstraints = @UniqueConstraint(columnNames = {"competition_id", "user_id"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class CompetitionParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "competition_id", nullable = false)
    private Competition competition;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt;

    @Column(name = "attempt_started_at")
    private Instant attemptStartedAt;

    @Column(name = "attempt_ended_at")
    private Instant attemptEndedAt;

    @PrePersist
    void prePersist() { joinedAt = Instant.now(); }
}
