package com.codearena.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "competitions")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Competition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String rules;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(name = "time_limit_minutes")
    private Integer timeLimitMinutes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "competition", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Problem> problems = new ArrayList<>();

    @PrePersist
    void prePersist() {
        createdAt = updatedAt = Instant.now();
        if (status == null) status = Status.DRAFT;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public boolean isLive() {
        return status == Status.LIVE;
    }

    public boolean hasEnded() {
        return status == Status.ENDED;
    }

    public enum Status { DRAFT, UPCOMING, LIVE, ENDED, ARCHIVED }
}
