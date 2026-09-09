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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Executes C and Java code in an isolated Docker container sandbox.
 */
@Service
public class DockerSandbox {

    private static final Logger log = LoggerFactory.getLogger(DockerSandbox.class);

    @Value("${judge.docker-image:eclipse-temurin:21-jdk-alpine}")
    private String dockerImage;

    @Value("${judge.cpu-limit:1.5}")
    private double cpuLimit;

    @Value("${judge.memory-limit-mb:256}")
    private int memoryLimitMb;

    @Value("${judge.timeout-seconds:10}")
    private int timeoutSeconds;

    @Value("${judge.max-processes:50}")
    private int maxProcesses;

    private DockerClient dockerClient;
    private final AtomicBoolean imageReady = new AtomicBoolean(false);

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

        // Pull base image at startup
        try {
            dockerClient.pullImageCmd(dockerImage).start().awaitCompletion(60, TimeUnit.SECONDS);
            log.info("[Sandbox] Base image ready: {}", dockerImage);
        } catch (Exception e) {
            log.warn("[Sandbox] Could not pre-pull base image: {}", e.getMessage());
        }

        // Build/verify custom sandbox image once at startup
        try {
            ensureCustomSandboxImage();
        } catch (Exception e) {
            log.warn("[Sandbox] Could not pre-build custom sandbox image at startup: {}", e.getMessage());
        }
    }

    @PreDestroy
    public void destroy() {
        if (dockerClient != null) {
            try { dockerClient.close(); } catch (IOException ignored) {}
        }
    }

    /**
     * Session that encapsulates a running Docker container for a single submission.
     * All test case inputs and source files are pre-loaded in the container.
     */
    public class SubmissionSession implements AutoCloseable {
        private final String containerId;
        private final Path workDir;
        private final String language;
        private final boolean isC;
        private final boolean hasRunner;
        private final int memoryLimitMb;
        private boolean closed = false;

        public SubmissionSession(String containerId, Path workDir, String language, boolean hasRunner, int memoryLimitMb) {
            this.containerId = containerId;
            this.workDir = workDir;
            this.language = language;
            this.isC = "C".equalsIgnoreCase(language);
            this.hasRunner = hasRunner;
            this.memoryLimitMb = memoryLimitMb;
        }

        /**
         * Compile the submission code once inside the container.
         */
        public ExecutionResult compile() {
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

            try {
                ExecResult compileResult = dockerExec(containerId, 30_000, compileCmd);
                long elapsed = System.currentTimeMillis() - compileStart;

                if (compileResult.exitCode != 0) {
                    return ExecutionResult.builder()
                            .verdict(ExecutionResult.Verdict.COMPILATION_ERROR)
                            .stderr(compileResult.stderr)
                            .executionTimeMs(elapsed)
                            .exitCode(compileResult.exitCode)
                            .build();
                }

                return ExecutionResult.builder()
                        .verdict(ExecutionResult.Verdict.ACCEPTED)
                        .executionTimeMs(elapsed)
                        .build();
            } catch (Exception e) {
                log.error("[Sandbox] Compilation error: {}", e.getMessage(), e);
                return ExecutionResult.builder()
                        .verdict(ExecutionResult.Verdict.SYSTEM_ERROR)
                        .stderr("Compilation error: " + e.getMessage())
                        .executionTimeMs(System.currentTimeMillis() - compileStart)
                        .build();
            }
        }

        /**
         * Execute a test case against the pre-compiled binary using file input redirection.
         * File redirection (< /workspace/input_X.txt) guarantees immediate native EOF without pipe hangs.
         */
        public ExecutionResult executeTestCase(int testCaseIndex, int timeLimitMs) {
            long execStart = System.currentTimeMillis();
            String inputFile = "/workspace/input_" + testCaseIndex + ".txt";
            String[] runCmd;
            if (isC) {
                runCmd = new String[]{
                        "sh", "-c",
                        "cd /workspace && ./main < " + inputFile
                };
            } else {
                runCmd = new String[]{
                        "sh", "-c",
                        "cd /workspace && java " +
                                "-Xmx" + Math.max(32, memoryLimitMb - 32) + "m " +
                                "-XX:+UseSerialGC " +
                                "-XX:TieredStopAtLevel=1 " +
                                "Main < " + inputFile
                };
            }

            try {
                ExecResult runResult = dockerExec(containerId, timeLimitMs + 2000, runCmd);
                long elapsed = System.currentTimeMillis() - execStart;

                if (runResult.timedOut) {
                    // Terminate runaway process inside container
                    try {
                        dockerExec(containerId, 2000, "sh", "-c", "pkill -9 -f main || pkill -9 -f Main");
                    } catch (Exception ignored) {}

                    return ExecutionResult.builder()
                            .verdict(ExecutionResult.Verdict.TIME_LIMIT_EXCEEDED)
                            .executionTimeMs(elapsed)
                            .timedOut(true)
                            .build();
                }

                if (runResult.exitCode != 0) {
                    boolean isOom = runResult.exitCode == 137 || (runResult.stderr != null && runResult.stderr.contains("OutOfMemoryError"));
                    return ExecutionResult.builder()
                            .verdict(isOom ? ExecutionResult.Verdict.MEMORY_LIMIT_EXCEEDED : ExecutionResult.Verdict.RUNTIME_ERROR)
                            .stderr(runResult.stderr)
                            .executionTimeMs(elapsed)
                            .exitCode(runResult.exitCode)
                            .build();
                }

                return ExecutionResult.builder()
                        .verdict(ExecutionResult.Verdict.ACCEPTED)
                        .stdout(runResult.stdout)
                        .stderr(runResult.stderr)
                        .executionTimeMs(elapsed)
                        .exitCode(runResult.exitCode)
                        .build();
            } catch (Exception e) {
                log.error("[Sandbox] Test case execution error: {}", e.getMessage(), e);
                return ExecutionResult.builder()
                        .verdict(ExecutionResult.Verdict.SYSTEM_ERROR)
                        .stderr("Execution error: " + e.getMessage())
                        .executionTimeMs(System.currentTimeMillis() - execStart)
                        .build();
            }
        }

        @Override
        public void close() {
            if (closed) return;
            closed = true;
            cleanup(containerId, workDir);
        }
    }

    /**
     * Create a submission session with an isolated running Docker container,
     * pre-populating source files and all test case inputs into /workspace.
     */
    public SubmissionSession createSession(String language, String sourceCode, String runnerCode,
                                           List<String> inputs, int memoryLimitMb) throws Exception {
        ensureCustomSandboxImage();

        Path workDir = Files.createTempDirectory("codearena-judge-");
        String containerId = null;

        try {
            boolean hasRunner = runnerCode != null && !runnerCode.trim().isEmpty();
            boolean isC = "C".equalsIgnoreCase(language);

            List<String> filesToTar = new ArrayList<>();
            if (isC) {
                if (hasRunner) {
                    Files.writeString(workDir.resolve("solution.c"), sourceCode, StandardCharsets.UTF_8);
                    Files.writeString(workDir.resolve("main.c"), runnerCode, StandardCharsets.UTF_8);
                    filesToTar.add("main.c");
                    filesToTar.add("solution.c");
                } else {
                    Files.writeString(workDir.resolve("main.c"), sourceCode, StandardCharsets.UTF_8);
                    filesToTar.add("main.c");
                }
            } else {
                if (hasRunner) {
                    Files.writeString(workDir.resolve("Solution.java"), sourceCode, StandardCharsets.UTF_8);
                    Files.writeString(workDir.resolve("Main.java"), runnerCode, StandardCharsets.UTF_8);
                    filesToTar.add("Main.java");
                    filesToTar.add("Solution.java");
                } else {
                    Files.writeString(workDir.resolve("Main.java"), sourceCode, StandardCharsets.UTF_8);
                    filesToTar.add("Main.java");
                }
            }

            // Write all test case inputs into workDir so they are copied once in the tar
            if (inputs != null) {
                for (int i = 0; i < inputs.size(); i++) {
                    String fileName = "input_" + i + ".txt";
                    Files.writeString(workDir.resolve(fileName), inputs.get(i) != null ? inputs.get(i) : "", StandardCharsets.UTF_8);
                    filesToTar.add(fileName);
                }
            }

            Path tarFile = workDir.resolve("workspace.tar");
            createTar(tarFile, workDir, filesToTar.toArray(new String[0]));

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

            String imageToUse = "codearena-sandbox:latest";

            CreateContainerResponse container = dockerClient.createContainerCmd(imageToUse)
                    .withHostConfig(hostConfig)
                    .withWorkingDir("/workspace")
                    .withCmd("sh", "-c", "mkdir -p /workspace && sleep 300")
                    .exec();

            containerId = container.getId();
            dockerClient.startContainerCmd(containerId).exec();

            // Copy workspace files (source + all test case inputs) into container in one shot
            try (InputStream tarStream = Files.newInputStream(tarFile)) {
                dockerClient.copyArchiveToContainerCmd(containerId)
                        .withTarInputStream(tarStream)
                        .withRemotePath("/workspace")
                        .exec();
            }

            try { Files.deleteIfExists(tarFile); } catch (Exception ignored) {}

            return new SubmissionSession(containerId, workDir, language, hasRunner, memoryLimitMb);
        } catch (Exception e) {
            cleanup(containerId, workDir);
            throw e;
        }
    }

    /**
     * Backward-compatible execute method for single-run execution (e.g. "Run Code").
     */
    public ExecutionResult execute(String language, String sourceCode, String runnerCode, String input, int timeLimitMs, int memoryLimitMb) {
        List<String> inputs = List.of(input != null ? input : "");
        try (SubmissionSession session = createSession(language, sourceCode, runnerCode, inputs, memoryLimitMb)) {
            ExecutionResult compileResult = session.compile();
            if (compileResult.getVerdict() != ExecutionResult.Verdict.ACCEPTED) {
                return compileResult;
            }
            return session.executeTestCase(0, timeLimitMs);
        } catch (Exception e) {
            log.error("[Sandbox] Unexpected error in execute: {}", e.getMessage(), e);
            return ExecutionResult.builder()
                    .verdict(ExecutionResult.Verdict.SYSTEM_ERROR)
                    .stderr(e.getMessage())
                    .executionTimeMs(0)
                    .build();
        }
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

    private synchronized void ensureCustomSandboxImage() {
        if (imageReady.get()) return;

        String imageName = "codearena-sandbox:latest";
        try {
            dockerClient.inspectImageCmd(imageName).exec();
            log.info("[Sandbox] Image {} already exists.", imageName);
            imageReady.set(true);
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
                imageReady.set(true);
            } catch (Exception ex) {
                log.error("[Sandbox] Failed to build sandbox image: {}", ex.getMessage());
                throw new RuntimeException("Could not build sandbox image", ex);
            }
        }
    }

    record ExecResult(int exitCode, String stdout, String stderr, boolean timedOut) {}
}
