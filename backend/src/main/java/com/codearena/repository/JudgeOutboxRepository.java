package com.codearena.repository;

import com.codearena.domain.JudgeOutbox;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface JudgeOutboxRepository extends JpaRepository<JudgeOutbox, UUID> {
    List<JudgeOutbox> findByStatusOrderByCreatedAtAsc(String status, Pageable pageable);
}
