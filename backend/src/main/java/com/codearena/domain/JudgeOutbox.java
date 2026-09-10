package com.codearena.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/** A durable hand-off from the submission transaction to the judge stream. */
@Entity
@Table(name = "judge_outbox")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class JudgeOutbox {
    @Id
    private UUID id;

    @Column(name = "stream_name", nullable = false, length = 100)
    private String streamName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "published_at")
    private Instant publishedAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (status == null) status = "PENDING";
        if (createdAt == null) createdAt = Instant.now();
    }
}
