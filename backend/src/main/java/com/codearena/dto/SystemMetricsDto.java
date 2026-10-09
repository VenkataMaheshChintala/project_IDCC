package com.codearena.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SystemMetricsDto {
    private long totalSseConnections;
    private long submissionQueueDepth;
    private long runQueueDepth;
    private long jvmMemoryUsedMb;
    private long jvmMemoryMaxMb;
}
