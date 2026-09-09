package com.codearena.judge.model;

/**
 * Result of executing a single test case inside the Docker sandbox.
 */
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

    public ExecutionResult() {}

    public ExecutionResult(Verdict verdict, String stdout, String stderr, long executionTimeMs,
                           int memoryUsedMb, boolean timedOut, boolean memoryExceeded, int exitCode) {
        this.verdict = verdict;
        this.stdout = stdout;
        this.stderr = stderr;
        this.executionTimeMs = executionTimeMs;
        this.memoryUsedMb = memoryUsedMb;
        this.timedOut = timedOut;
        this.memoryExceeded = memoryExceeded;
        this.exitCode = exitCode;
    }

    public static ExecutionResultBuilder builder() {
        return new ExecutionResultBuilder();
    }

    public Verdict getVerdict() { return verdict; }
    public void setVerdict(Verdict verdict) { this.verdict = verdict; }

    public String getStdout() { return stdout; }
    public void setStdout(String stdout) { this.stdout = stdout; }

    public String getStderr() { return stderr; }
    public void setStderr(String stderr) { this.stderr = stderr; }

    public long getExecutionTimeMs() { return executionTimeMs; }
    public void setExecutionTimeMs(long executionTimeMs) { this.executionTimeMs = executionTimeMs; }

    public int getMemoryUsedMb() { return memoryUsedMb; }
    public void setMemoryUsedMb(int memoryUsedMb) { this.memoryUsedMb = memoryUsedMb; }

    public boolean isTimedOut() { return timedOut; }
    public void setTimedOut(boolean timedOut) { this.timedOut = timedOut; }

    public boolean isMemoryExceeded() { return memoryExceeded; }
    public void setMemoryExceeded(boolean memoryExceeded) { this.memoryExceeded = memoryExceeded; }

    public int getExitCode() { return exitCode; }
    public void setExitCode(int exitCode) { this.exitCode = exitCode; }

    public static class ExecutionResultBuilder {
        private Verdict verdict;
        private String stdout;
        private String stderr;
        private long executionTimeMs;
        private int memoryUsedMb;
        private boolean timedOut;
        private boolean memoryExceeded;
        private int exitCode;

        public ExecutionResultBuilder verdict(Verdict verdict) { this.verdict = verdict; return this; }
        public ExecutionResultBuilder stdout(String stdout) { this.stdout = stdout; return this; }
        public ExecutionResultBuilder stderr(String stderr) { this.stderr = stderr; return this; }
        public ExecutionResultBuilder executionTimeMs(long executionTimeMs) { this.executionTimeMs = executionTimeMs; return this; }
        public ExecutionResultBuilder memoryUsedMb(int memoryUsedMb) { this.memoryUsedMb = memoryUsedMb; return this; }
        public ExecutionResultBuilder timedOut(boolean timedOut) { this.timedOut = timedOut; return this; }
        public ExecutionResultBuilder memoryExceeded(boolean memoryExceeded) { this.memoryExceeded = memoryExceeded; return this; }
        public ExecutionResultBuilder exitCode(int exitCode) { this.exitCode = exitCode; return this; }

        public ExecutionResult build() {
            return new ExecutionResult(verdict, stdout, stderr, executionTimeMs, memoryUsedMb, timedOut, memoryExceeded, exitCode);
        }
    }
}
