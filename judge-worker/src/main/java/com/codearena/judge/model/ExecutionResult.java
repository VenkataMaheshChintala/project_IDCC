package com.codearena.judge.model;

import lombok.*;

/**
 * Result of executing a single test case inside the Docker sandbox.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExecutionResult {

    public enum Verdict {
        ACCEPTED,
        WRONG_ANSWER,
        COMPILATION_ERROR,
        RUNTIME_ERROR,
        TIME_LIMIT_EXCEEDED,
        MEMORY_LIMIT_EXCEEDED,
        SYSTEM_ERROR
    }

    private Verdict verdict;
    private String stdout;
    private String stderr;
    private long executionTimeMs;
    private int memoryUsedMb;
    private boolean timedOut;
    private boolean memoryExceeded;
    private int exitCode;
}
