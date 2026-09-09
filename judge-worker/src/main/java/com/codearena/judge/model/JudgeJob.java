package com.codearena.judge.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

/**
 * Redis queue job — mirrors the backend JudgeJob DTO.
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
    private String runInput;
    private String runJobId;
}
