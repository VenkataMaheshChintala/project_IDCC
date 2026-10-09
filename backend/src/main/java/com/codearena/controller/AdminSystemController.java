package com.codearena.controller;

import com.codearena.dto.SystemMetricsDto;
import com.codearena.service.SseService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/system")
@RequiredArgsConstructor
public class AdminSystemController {

    private final SseService sseService;
    private final StringRedisTemplate redisTemplate;

    @Value("${app.judge.submission-stream}")
    private String submissionStream;

    @Value("${app.judge.run-stream}")
    private String runStream;

    @GetMapping("/health")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SystemMetricsDto> getSystemHealth() {
        long submissionQueueSize = getStreamSize(submissionStream);
        long runQueueSize = getStreamSize(runStream);
        
        long maxMemory = Runtime.getRuntime().maxMemory() / (1024 * 1024);
        long totalMemory = Runtime.getRuntime().totalMemory() / (1024 * 1024);
        long freeMemory = Runtime.getRuntime().freeMemory() / (1024 * 1024);
        long usedMemory = totalMemory - freeMemory;

        SystemMetricsDto metrics = SystemMetricsDto.builder()
                .totalSseConnections(sseService.getActiveConnectionCount())
                .submissionQueueDepth(submissionQueueSize)
                .runQueueDepth(runQueueSize)
                .jvmMemoryUsedMb(usedMemory)
                .jvmMemoryMaxMb(maxMemory)
                .build();

        return ResponseEntity.ok(metrics);
    }

    private long getStreamSize(String streamKey) {
        try {
            Long size = redisTemplate.opsForStream().size(streamKey);
            return size != null ? size : 0L;
        } catch (Exception e) {
            // Stream might not exist yet
            return 0L;
        }
    }
}
