package com.codearena.queue;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

/**
 * Job pushed to Redis for the judge worker to consume.
 * Contains everything the judge needs — avoids extra DB lookups from the worker.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class JudgeJob {
    private Long submissionId;
    private Long problemId;
    private Long competitionId;
    private Long userId;
    private String language;
    private String sourceCode;
    private String runnerCode;
    private int timeLimitMs;
    private int memoryLimitMb;
    private String jobType;   // "SUBMIT" or "RUN"
    private String runInput;  // only for RUN jobs
    private String runJobId;  // correlation id for SSE response on RUN
}
