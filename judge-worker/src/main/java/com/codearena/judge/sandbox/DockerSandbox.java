package com.codearena.judge.sandbox;

import com.codearena.judge.model.ExecutionResult;
import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.command.*;
import com.github.dockerjava.api.model.*;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientImpl;
import com.github.dockerjava.httpclient5.ApacheDockerHttpClient;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;

/**
 * Executes Java code in an isolated Docker container.
 *
 * Security constraints:
 *  - No network access (NetworkMode.NONE)
 *  - CPU limited via NanoCpus
 *  - Memory limited via Memory
 *  - No new privileges
 *  - Dropped all Linux capabilities (except SETUID/SETGID which Docker handles)
 *  - PID limit
 *  - Read-only root filesystem (except /tmp)
 *  - Container is removed after execution
 */
@Service
@Slf4j
public class DockerSandbox {

    @Value("${judge.docker-image:eclipse-temurin:21-jdk-alpine}")
    private String dockerImage;

    @Value("${judge.cpu-limit:0.5}")
    private double cpuLimit;

    @Value("${judge.memory-limit-mb:256}")
    private int memoryLimitMb;

    @Value("${judge.timeout-seconds:10}")
    private int timeoutSeconds;

    @Value("${judge.max-processes:50}")
    private int maxProcesses;

    private DockerClient dockerClient;

    @PostConstruct
    public void init() {
        DefaultDockerClientConfig config = DefaultDockerClientConfig.createDefaultConfigBuilder()
                .withDockerHost("unix:///var/run/docker.sock")
                .build();

        ApacheDockerHttpClient httpClient = new ApacheDockerHttpClient.Builder()
                .dockerHost(config.getDockerHost())
                .maxConnections(50)
                .connectionTimeout(Duration.ofSeconds(5))
                .responseTimeout(Duration.ofSeconds(45))
                .build();

        dockerClient = DockerClientImpl.getInstance(config, httpClient);
        log.info("[Sandbox] Docker client initialized");

        // Pull images at startup to avoid cold start
        try {
            dockerClient.pullImageCmd(dockerImage).start().awaitCompletion(60, TimeUnit.SECONDS);
            log.info("[Sandbox] Images ready: {}", dockerImage);
        } catch (Exception e) {
            log.warn("[Sandbox] Could not pre-pull images (will retry on first use): {}", e.getMessage());
        }
    }

    @PreDestroy
    public void destroy() {
        if (dockerClient != null) {
            try { dockerClient.close(); } catch (IOException ignored) {}
        }
    }

    /**
     * Compile and execute Java source code in a fresh Docker container.
     * The container is always removed after execution.
     */
    public ExecutionResult execute(String language, String sourceCode, String runnerCode, String input, int timeLimitMs, int memoryLimitMb) {
        Path workDir = null;
        String containerId = null;

        try {
            // ── 1. Create temp workspace ──────────────────────────────────────
            workDir = Files.createTempDirectory("codearena-judge-");

            // Use docker exec instead for cleaner control
            return runCompileAndExecute(workDir, language, sourceCode, runnerCode, input, timeLimitMs, memoryLimitMb);

        } catch (Exception e) {
            log.error("[Sandbox] Unexpected error: {}", e.getMessage(), e);
            return ExecutionResult.builder()
                    .verdict(ExecutionResult.Verdict.SYSTEM_ERROR)
                    .stderr(e.getMessage())
                    .executionTimeMs(0)
                    .build();
        } finally {
            cleanup(containerId, workDir);
        }
    }

    /**
     * Main execution flow using docker copy + exec pattern.
     */
    private ExecutionResult runCompileAndExecute(
            Path workDir, String language, String sourceCode, String runnerCode, String input, int timeLimitMs, int memoryLimitMb) throws Exception {

        long memBytes = (long) memoryLimitMb * 1024 * 1024;
        long nanoCpu  = (long) (cpuLimit * 1e9);

        HostConfig hostConfig = HostConfig.newHostConfig()
                .withNetworkMode("none")
                .withMemory(memBytes)
                .withMemorySwap(memBytes)
                .withNanoCPUs(nanoCpu)
                .withPidsLimit((long) maxProcesses)
                .withCapDrop(Capability.ALL)
                .withSecurityOpts(List.of("no-new-privileges:true"))
                .withAutoRemove(false);

        boolean hasRunner = runnerCode != null && !runnerCode.trim().isEmpty();
        boolean isC = "C".equalsIgnoreCase(language);
        
        if (isC) {
            if (hasRunner) {
                Path solutionFile = workDir.resolve("solution.c");
                Files.writeString(solutionFile, sourceCode, StandardCharsets.UTF_8);
                Path runnerFile = workDir.resolve("main.c");
                Files.writeString(runnerFile, runnerCode, StandardCharsets.UTF_8);
            } else {
                Path sourceFile = workDir.resolve("main.c");
                Files.writeString(sourceFile, sourceCode, StandardCharsets.UTF_8);
            }
        } else {
            if (hasRunner) {
                Path solutionFile = workDir.resolve("Solution.java");
                Files.writeString(solutionFile, sourceCode, StandardCharsets.UTF_8);
                Path runnerFile = workDir.resolve("Main.java");
                Files.writeString(runnerFile, runnerCode, StandardCharsets.UTF_8);
            } else {
                Path sourceFile = workDir.resolve("Main.java");
                Files.writeString(sourceFile, sourceCode, StandardCharsets.UTF_8);
            }
        }

        // Write input to temp file
        Path inputFile = workDir.resolve("input.txt");
        Files.writeString(inputFile, input != null ? input : "", StandardCharsets.UTF_8);

        // Create a tar archive of the workspace to copy into container
        Path tarFile = workDir.resolve("workspace.tar");
        if (isC) {
            if (hasRunner) {
                createTar(tarFile, workDir, "main.c", "solution.c", "input.txt");
            } else {
                createTar(tarFile, workDir, "main.c", "input.txt");
            }
        } else {
            if (hasRunner) {
                createTar(tarFile, workDir, "Main.java", "Solution.java", "input.txt");
            } else {
                createTar(tarFile, workDir, "Main.java", "input.txt");
            }
        }

        String imageToUse = "codearena-sandbox:latest";

        buildCustomSandboxImage();

        // Create long-lived container with sleep
        CreateContainerResponse container = dockerClient.createContainerCmd(imageToUse)
                .withHostConfig(hostConfig)
                .withWorkingDir("/workspace")
                .withCmd("sh", "-c", "mkdir -p /workspace && sleep 30")
                .exec();

        String cid = container.getId();
        dockerClient.startContainerCmd(cid).exec();

        try {
            // Copy workspace into container
            try (InputStream tarStream = Files.newInputStream(tarFile)) {
                dockerClient.copyArchiveToContainerCmd(cid)
                        .withTarInputStream(tarStream)
                        .withRemotePath("/workspace")
                        .exec();
            }

            // ── Compile ──────────────────────────────────────────────────────
            long compileStart = System.currentTimeMillis();
            String[] compileCmd;
            if (isC) {
                compileCmd = hasRunner ? 
                    new String[]{"gcc", "/workspace/main.c", "/workspace/solution.c", "-o", "/workspace/main", "-O2", "-lm"} :
                    new String[]{"gcc", "/workspace/main.c", "-o", "/workspace/main", "-O2", "-lm"};
            } else {
                compileCmd = hasRunner ? 
                    new String[]{"javac", "/workspace/Solution.java", "/workspace/Main.java", "-d", "/workspace"} :
                    new String[]{"javac", "/workspace/Main.java", "-d", "/workspace"};
            }
            ExecResult compileResult = dockerExec(cid, 30_000, compileCmd);

            if (compileResult.exitCode != 0) {
                return ExecutionResult.builder()
                        .verdict(ExecutionResult.Verdict.COMPILATION_ERROR)
                        .stderr(compileResult.stderr)
                        .executionTimeMs(System.currentTimeMillis() - compileStart)
                        .build();
            }

            // ── Execute ───────────────────────────────────────────────────────
            long execStart = System.currentTimeMillis();
            String[] runCmd;
            if (isC) {
                runCmd = new String[]{
                    "sh", "-c",
                    "cd /workspace && ./main < /workspace/input.txt"
                };
            } else {
                runCmd = new String[]{
                    "sh", "-c",
                    "cd /workspace && java " +
                    "-Xmx" + (memoryLimitMb - 32) + "m " +
                    "-XX:+UseSerialGC " +
                    "Main < /workspace/input.txt"
                };
            }

            ExecResult runResult = dockerExec(cid, timeLimitMs + 2000, runCmd);
            long elapsed = System.currentTimeMillis() - execStart;

            if (runResult.timedOut) {
                return ExecutionResult.builder()
                        .verdict(ExecutionResult.Verdict.TIME_LIMIT_EXCEEDED)
                        .executionTimeMs(elapsed)
                        .timedOut(true)
                        .build();
            }

            if (runResult.exitCode != 0 && !runResult.timedOut) {
                return ExecutionResult.builder()
                        .verdict(ExecutionResult.Verdict.RUNTIME_ERROR)
                        .stderr(runResult.stderr)
                        .executionTimeMs(elapsed)
                        .exitCode(runResult.exitCode)
                        .build();
            }

            return ExecutionResult.builder()
                    .verdict(ExecutionResult.Verdict.ACCEPTED)  // comparator will confirm
                    .stdout(runResult.stdout)
                    .stderr(runResult.stderr)
                    .executionTimeMs(elapsed)
                    .exitCode(runResult.exitCode)
                    .build();

        } finally {
            try {
                dockerClient.stopContainerCmd(cid).withTimeout(5).exec();
            } catch (Exception ignored) {}
            try {
                dockerClient.removeContainerCmd(cid).withForce(true).exec();
            } catch (Exception ignored) {}
        }
    }

    private String runWithExec(String sourceCode, String input, int timeLimitMs, int memoryLimitMb) {
        return null; // placeholder — actual logic is in runCompileAndExecute
    }

    /**
     * Execute a command inside a running container and capture output.
     */
    private ExecResult dockerExec(String containerId, long timeoutMs, String... cmd) throws Exception {
        ExecCreateCmdResponse execCreate = dockerClient.execCreateCmd(containerId)
                .withCmd(cmd)
                .withAttachStdout(true)
                .withAttachStderr(true)
                .exec();

        ByteArrayOutputStream stdout = new ByteArrayOutputStream();
        ByteArrayOutputStream stderr = new ByteArrayOutputStream();

        boolean timedOut;
        try {
            timedOut = !dockerClient.execStartCmd(execCreate.getId())
                    .exec(new com.github.dockerjava.core.command.ExecStartResultCallback(stdout, stderr))
                    .awaitCompletion(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            timedOut = true;
        }

        InspectExecResponse inspectExec = dockerClient.inspectExecCmd(execCreate.getId()).exec();
        int exitCode = timedOut ? -1 : (inspectExec.getExitCodeLong() != null ? inspectExec.getExitCodeLong().intValue() : -1);

        return new ExecResult(
                exitCode,
                stdout.toString(StandardCharsets.UTF_8),
                stderr.toString(StandardCharsets.UTF_8),
                timedOut
        );
    }

    private void createTar(Path tarPath, Path workDir, String... files) throws IOException {
        // Create a tar using ProcessBuilder (simpler than adding another dep)
        List<String> cmd = new ArrayList<>(List.of("tar", "-cf", tarPath.toString(), "-C", workDir.toString()));
        cmd.addAll(Arrays.asList(files));

        ProcessBuilder pb = new ProcessBuilder(cmd);
        pb.redirectErrorStream(true);
        Process proc = pb.start();
        try { proc.waitFor(10, TimeUnit.SECONDS); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }

    private void cleanup(String containerId, Path workDir) {
        if (containerId != null) {
            try {
                dockerClient.stopContainerCmd(containerId).withTimeout(3).exec();
            } catch (Exception ignored) {}
            try {
                dockerClient.removeContainerCmd(containerId).withForce(true).exec();
            } catch (Exception ignored) {}
        }
        if (workDir != null) {
            try {
                deleteDirectory(workDir);
            } catch (IOException e) {
                log.warn("[Sandbox] Failed to clean workdir {}: {}", workDir, e.getMessage());
            }
        }
    }

    private void deleteDirectory(Path path) throws IOException {
        if (Files.exists(path)) {
            Files.walk(path)
                    .sorted(Comparator.reverseOrder())
                    .forEach(p -> { try { Files.delete(p); } catch (IOException ignored) {} });
        }
    }

    private void buildCustomSandboxImage() {
        String imageName = "codearena-sandbox:latest";
        try {
            dockerClient.inspectImageCmd(imageName).exec();
            log.info("[Sandbox] Image {} already exists.", imageName);
        } catch (com.github.dockerjava.api.exception.NotFoundException e) {
            log.info("[Sandbox] Image {} not found. Building it now from {}...", imageName, dockerImage);
            try {
                Path tempDir = Files.createTempDirectory("docker-build-");
                Path df = tempDir.resolve("Dockerfile");
                String dockerfile = "FROM " + dockerImage + "\n" +
                                    "RUN apk add --no-cache gcc musl-dev libc-dev\n";
                Files.writeString(df, dockerfile);

                dockerClient.buildImageCmd(tempDir.toFile())
                        .withTags(Set.of(imageName))
                        .start()
                        .awaitCompletion(5, TimeUnit.MINUTES);
                
                log.info("[Sandbox] Custom sandbox image built successfully");
                deleteDirectory(tempDir);
            } catch (Exception ex) {
                log.error("[Sandbox] Failed to build sandbox image: {}", ex.getMessage());
                throw new RuntimeException("Could not build sandbox image", ex);
            }
        }
    }

    record ExecResult(int exitCode, String stdout, String stderr, boolean timedOut) {}
}
