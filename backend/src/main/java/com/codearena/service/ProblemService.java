package com.codearena.service;

import com.codearena.domain.*;
import com.codearena.dto.ProblemDtos;
import com.codearena.dto.TestCaseDtos;
import com.codearena.exception.BadRequestException;
import com.codearena.exception.NotFoundException;
import com.codearena.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProblemService {

    private final ProblemRepository problemRepository;
    private final TestCaseRepository testCaseRepository;
    private final CompetitionService competitionService;
    private final SubmissionRepository submissionRepository;

    // ─── Problems ─────────────────────────────────────────────────────────────

    public List<ProblemDtos.ProblemSummary> listByCompetition(Long competitionId, User user) {
        competitionService.findOrThrow(competitionId);
        
        java.util.Map<Long, String> problemStatusMap = new java.util.HashMap<>();
        if (user != null) {
            List<Submission> userSubs = submissionRepository.findByCompetitionIdAndUserId(competitionId, user.getId());
            for (Submission s : userSubs) {
                Long pId = s.getProblem().getId();
                String currentStatus = problemStatusMap.getOrDefault(pId, "UNATTEMPTED");
                if (s.getStatus() == Submission.Status.ACCEPTED) {
                    problemStatusMap.put(pId, "SOLVED");
                } else if (!currentStatus.equals("SOLVED")) {
                    problemStatusMap.put(pId, "ATTEMPTED");
                }
            }
        }

        return problemRepository.findByCompetitionIdOrderBySlugAsc(competitionId)
                .stream()
                .map(p -> toSummary(p, problemStatusMap.getOrDefault(p.getId(), "UNATTEMPTED")))
                .toList();
    }

    public ProblemDtos.ProblemResponse getById(Long problemId) {
        Problem p = findOrThrow(problemId);
        List<TestCase> samples = testCaseRepository
                .findByProblemIdAndSampleTrueOrderByOrderIndexAsc(problemId);
        return toResponse(p, samples);
    }

    public ProblemDtos.ProblemAdminResponse getByIdAdmin(Long problemId) {
        Problem p = findOrThrow(problemId);
        List<TestCase> all = testCaseRepository
                .findByProblemIdOrderByOrderIndexAsc(problemId);
        return toAdminResponse(p, all);
    }

    @Transactional
    public ProblemDtos.ProblemResponse create(Long competitionId, ProblemDtos.CreateRequest req) {
        Competition competition = competitionService.findOrThrow(competitionId);

        if (problemRepository.existsByCompetitionIdAndSlug(competitionId, req.slug())) {
            throw new BadRequestException("Problem with slug '" + req.slug() + "' already exists");
        }

        Problem p = Problem.builder()
                .competition(competition)
                .title(req.title())
                .slug(req.slug().toUpperCase())
                .description(req.description())
                .inputFormat(req.inputFormat())
                .outputFormat(req.outputFormat())
                .constraints(req.constraints())
                .difficulty(req.difficulty() != null ? req.difficulty() : Problem.Difficulty.MEDIUM)
                .points(req.points())
                .timeLimitMs(req.timeLimitMs())
                .memoryLimitMb(req.memoryLimitMb())
                .build();

        p = problemRepository.save(p);
        return toResponse(p, List.of());
    }

    @Transactional
    public ProblemDtos.ProblemResponse update(Long problemId, ProblemDtos.UpdateRequest req) {
        Problem p = findOrThrow(problemId);

        if (req.title() != null) p.setTitle(req.title());
        if (req.description() != null) p.setDescription(req.description());
        if (req.inputFormat() != null) p.setInputFormat(req.inputFormat());
        if (req.outputFormat() != null) p.setOutputFormat(req.outputFormat());
        if (req.constraints() != null) p.setConstraints(req.constraints());
        if (req.difficulty() != null) p.setDifficulty(req.difficulty());
        if (req.points() != null) p.setPoints(req.points());
        if (req.timeLimitMs() != null) p.setTimeLimitMs(req.timeLimitMs());
        if (req.memoryLimitMb() != null) p.setMemoryLimitMb(req.memoryLimitMb());

        p = problemRepository.save(p);
        List<TestCase> samples = testCaseRepository
                .findByProblemIdAndSampleTrueOrderByOrderIndexAsc(problemId);
        return toResponse(p, samples);
    }

    @Transactional
    public void delete(Long problemId) {
        Problem p = findOrThrow(problemId);
        problemRepository.delete(p);
    }

    // ─── Test Cases ───────────────────────────────────────────────────────────

    @Transactional
    public TestCaseDtos.TestCaseAdminResponse addTestCase(Long problemId, TestCaseDtos.CreateRequest req) {
        Problem p = findOrThrow(problemId);

        TestCase tc = TestCase.builder()
                .problem(p)
                .input(req.input())
                .expectedOutput(req.expectedOutput())
                .sample(req.sample())
                .hidden(req.hidden())
                .points(req.points())
                .orderIndex(req.orderIndex())
                .build();

        tc = testCaseRepository.save(tc);
        return toAdminTestCase(tc);
    }

    @Transactional
    public void deleteTestCase(Long testCaseId) {
        TestCase tc = testCaseRepository.findById(testCaseId)
                .orElseThrow(() -> new NotFoundException("Test case not found: " + testCaseId));
        testCaseRepository.delete(tc);
    }

    public List<TestCase> getHiddenTestCases(Long problemId) {
        return testCaseRepository.findByProblemIdOrderByOrderIndexAsc(problemId)
                .stream()
                .filter(tc -> !tc.isSample() || tc.isHidden())
                .toList();
    }

    public List<TestCase> getAllTestCases(Long problemId) {
        return testCaseRepository.findByProblemIdOrderByOrderIndexAsc(problemId);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public Problem findOrThrow(Long id) {
        return problemRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Problem not found: " + id));
    }

    private ProblemDtos.ProblemSummary toSummary(Problem p, String userStatus) {
        return new ProblemDtos.ProblemSummary(
                p.getId(), p.getTitle(), p.getSlug(),
                p.getDifficulty().name(), p.getPoints(),
                p.getTimeLimitMs(), p.getMemoryLimitMb(), userStatus
        );
    }

    private ProblemDtos.ProblemResponse toResponse(Problem p, List<TestCase> samples) {
        return new ProblemDtos.ProblemResponse(
                p.getId(), p.getCompetition().getId(),
                p.getTitle(), p.getSlug(),
                p.getDescription(), p.getInputFormat(), p.getOutputFormat(), p.getConstraints(),
                p.getStarterCode(), p.getCStarterCode(), p.getDifficulty().name(), p.getPoints(), p.getTimeLimitMs(), p.getMemoryLimitMb(),
                samples.stream().map(tc -> new TestCaseDtos.SampleTestCaseResponse(
                        tc.getId(), tc.getInput(), tc.getExpectedOutput(), tc.getOrderIndex()
                )).toList(),
                p.getCreatedAt(), p.getUpdatedAt()
        );
    }

    private ProblemDtos.ProblemAdminResponse toAdminResponse(Problem p, List<TestCase> all) {
        return new ProblemDtos.ProblemAdminResponse(
                p.getId(), p.getCompetition().getId(),
                p.getTitle(), p.getSlug(),
                p.getDescription(), p.getInputFormat(), p.getOutputFormat(), p.getConstraints(),
                p.getStarterCode(), p.getRunnerCode(), p.getCStarterCode(), p.getCRunnerCode(), p.getDifficulty().name(), p.getPoints(), p.getTimeLimitMs(), p.getMemoryLimitMb(),
                all.stream().map(this::toAdminTestCase).toList(),
                p.getCreatedAt(), p.getUpdatedAt()
        );
    }

    private TestCaseDtos.TestCaseAdminResponse toAdminTestCase(TestCase tc) {
        return new TestCaseDtos.TestCaseAdminResponse(
                tc.getId(), tc.getInput(), tc.getExpectedOutput(),
                tc.isSample(), tc.isHidden(), tc.getPoints(), tc.getOrderIndex(), tc.getCreatedAt()
        );
    }
}
