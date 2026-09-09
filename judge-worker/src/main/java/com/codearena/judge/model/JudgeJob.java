package com.codearena.judge.model;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Redis queue job — mirrors the backend JudgeJob DTO.
 */
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

    public JudgeJob() {}

    public JudgeJob(Long submissionId, Long problemId, Long competitionId, Long userId,
                    String language, String sourceCode, String runnerCode, int timeLimitMs,
                    int memoryLimitMb, String jobType, String runInput, String runJobId) {
        this.submissionId = submissionId;
        this.problemId = problemId;
        this.competitionId = competitionId;
        this.userId = userId;
        this.language = language;
        this.sourceCode = sourceCode;
        this.runnerCode = runnerCode;
        this.timeLimitMs = timeLimitMs;
        this.memoryLimitMb = memoryLimitMb;
        this.jobType = jobType;
        this.runInput = runInput;
        this.runJobId = runJobId;
    }

    public static JudgeJobBuilder builder() {
        return new JudgeJobBuilder();
    }

    public Long getSubmissionId() { return submissionId; }
    public void setSubmissionId(Long submissionId) { this.submissionId = submissionId; }

    public Long getProblemId() { return problemId; }
    public void setProblemId(Long problemId) { this.problemId = problemId; }

    public Long getCompetitionId() { return competitionId; }
    public void setCompetitionId(Long competitionId) { this.competitionId = competitionId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public String getSourceCode() { return sourceCode; }
    public void setSourceCode(String sourceCode) { this.sourceCode = sourceCode; }

    public String getRunnerCode() { return runnerCode; }
    public void setRunnerCode(String runnerCode) { this.runnerCode = runnerCode; }

    public int getTimeLimitMs() { return timeLimitMs; }
    public void setTimeLimitMs(int timeLimitMs) { this.timeLimitMs = timeLimitMs; }

    public int getMemoryLimitMb() { return memoryLimitMb; }
    public void setMemoryLimitMb(int memoryLimitMb) { this.memoryLimitMb = memoryLimitMb; }

    public String getJobType() { return jobType; }
    public void setJobType(String jobType) { this.jobType = jobType; }

    public String getRunInput() { return runInput; }
    public void setRunInput(String runInput) { this.runInput = runInput; }

    public String getRunJobId() { return runJobId; }
    public void setRunJobId(String runJobId) { this.runJobId = runJobId; }

    public static class JudgeJobBuilder {
        private Long submissionId;
        private Long problemId;
        private Long competitionId;
        private Long userId;
        private String language;
        private String sourceCode;
        private String runnerCode;
        private int timeLimitMs;
        private int memoryLimitMb;
        private String jobType;
        private String runInput;
        private String runJobId;

        public JudgeJobBuilder submissionId(Long submissionId) { this.submissionId = submissionId; return this; }
        public JudgeJobBuilder problemId(Long problemId) { this.problemId = problemId; return this; }
        public JudgeJobBuilder competitionId(Long competitionId) { this.competitionId = competitionId; return this; }
        public JudgeJobBuilder userId(Long userId) { this.userId = userId; return this; }
        public JudgeJobBuilder language(String language) { this.language = language; return this; }
        public JudgeJobBuilder sourceCode(String sourceCode) { this.sourceCode = sourceCode; return this; }
        public JudgeJobBuilder runnerCode(String runnerCode) { this.runnerCode = runnerCode; return this; }
        public JudgeJobBuilder timeLimitMs(int timeLimitMs) { this.timeLimitMs = timeLimitMs; return this; }
        public JudgeJobBuilder memoryLimitMb(int memoryLimitMb) { this.memoryLimitMb = memoryLimitMb; return this; }
        public JudgeJobBuilder jobType(String jobType) { this.jobType = jobType; return this; }
        public JudgeJobBuilder runInput(String runInput) { this.runInput = runInput; return this; }
        public JudgeJobBuilder runJobId(String runJobId) { this.runJobId = runJobId; return this; }

        public JudgeJob build() {
            return new JudgeJob(submissionId, problemId, competitionId, userId, language, sourceCode,
                    runnerCode, timeLimitMs, memoryLimitMb, jobType, runInput, runJobId);
        }
    }
}
