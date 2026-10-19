# 12 — BACKEND ACCEPTANCE TEST SUITES & E2E SCENARIOS
**AI-PMS (Academic Information & Project Management System)**  
**Test Framework:** xUnit, FluentAssertions, Microsoft.AspNetCore.Mvc.Testing (`WebApplicationFactory`), Testcontainers for SQL Server  
**Traceability Reference:** `PLAN-QUAN-LY-TIEN-TRINH-REVIEW-2026-10-16.md` Scenarios 1 & 2  

---

## 1. Acceptance Testing Overview
To guarantee production readiness and flawless frontend integration, the backend developer must implement two comprehensive integration test suites verifying multi-role academic lifecycles from proposal registration to final grade publication.

---

## 2. Test Scenario 1: Single-Major Software Engineering Lifecycle (End-to-End)

### 2.1 Scenario Parameters
- **Project Title:** "AI-Powered Medical Diagnosis Support Platform"
- **Project Code:** `PRJ-2026-SE-001`
- **Department:** Software Engineering (`SE`)
- **Team Composition:** 4 SE Students (1 Leader: `student.se.lead@aipms.edu.vn`, 3 Members)
- **Supervisor:** `supervisor.se@aipms.edu.vn` (Dr. Nguyen)
- **Independent Reviewers:** `reviewer.se1@aipms.edu.vn`, `reviewer.se2@aipms.edu.vn`

### 2.2 Execution Steps & Assertions
```csharp
[Fact]
public async Task SingleMajor_SE_Lifecycle_Should_PassAllGates_And_PublishGrades()
{
    // Step 1: Team Formation & Proposal Submission
    var leaderClient = Factory.CreateAuthenticatedClient("student.se.lead@aipms.edu.vn", "Student");
    var createTeamRes = await leaderClient.PostAsJsonAsync("/api/v1/teams", new CreateTeamDto("Team MediAI", "SE"));
    createTeamRes.StatusCode.Should().Be(HttpStatusCode.Created);
    var teamId = (await createTeamRes.Content.ReadFromJsonAsync<ApiResponse<TeamDto>>())!.Data.Id;

    var proposalRes = await leaderClient.PostAsJsonAsync("/api/v1/projects/proposals", new CreateProposalDto(
        teamId, "AI Medical Diagnosis", "Hệ thống chẩn đoán y tế AI", "SE", SupervisorId
    ));
    proposalRes.StatusCode.Should().Be(HttpStatusCode.Created);
    var projectId = (await proposalRes.Content.ReadFromJsonAsync<ApiResponse<ProjectDto>>())!.Data.Id;

    // Step 2: Supervisor Endorsement
    var supervisorClient = Factory.CreateAuthenticatedClient("supervisor.se@aipms.edu.vn", "Supervisor");
    var endorseRes = await supervisorClient.PostAsJsonAsync($"/api/v1/projects/proposals/{projectId}/endorse", new { Comment = "Excellent scope" });
    endorseRes.StatusCode.Should().Be(HttpStatusCode.OK);

    // Step 3: Department Head Approval & Project Activation
    var deptClient = Factory.CreateAuthenticatedClient("depthead.se@aipms.edu.vn", "DepartmentHead");
    var approveRes = await deptClient.PostAsJsonAsync($"/api/v1/projects/proposals/{projectId}/approve", new { QuotaVerified = true });
    approveRes.StatusCode.Should().Be(HttpStatusCode.OK);

    // Assert: Review Gates 1 to 4 Automatically Seeded
    var gatesRes = await leaderClient.GetAsync($"/api/v1/projects/{projectId}/review-gates");
    var gatesSummary = (await gatesRes.Content.ReadFromJsonAsync<ApiResponse<ProjectReviewGatesSummaryDto>>())!.Data;
    gatesSummary.Gates.Should().HaveCount(4);
    gatesSummary.Gates[0].Status.Should().Be("OPEN_FOR_SUBMISSION");
    gatesSummary.Gates[1].Status.Should().Be("LOCKED");

    // Step 4: Gate 1 Evidence Submission & Clearance
    var gate1Id = gatesSummary.Gates[0].GateId;
    await leaderClient.PostAsJsonAsync($"/api/v1/projects/{projectId}/review-gates/{gate1Id}/evidence", new SubmitEvidenceDto(
        "GIT_REPOSITORY", "SRS & Architecture Tag", "https://github.com/medi-ai/core/releases/tag/v0.1", null, "{}"
    ));
    var submitGate1Res = await leaderClient.PostAsJsonAsync($"/api/v1/projects/{projectId}/review-gates/{gate1Id}/submit-for-review", new { });
    submitGate1Res.StatusCode.Should().Be(HttpStatusCode.OK);

    // Reviewer Evaluation Gate 1
    var reviewerClient = Factory.CreateAuthenticatedClient("reviewer.se1@aipms.edu.vn", "Reviewer");
    var evalGate1Res = await reviewerClient.PostAsJsonAsync($"/api/v1/review-gates/{gate1Id}/evaluations", new SubmitGateEvaluationDto(
        IsDraft: false, "Solid requirements.", new List<CriterionScoreDto> {
            new("crit-01", "Architecture", 0.5m, 8.5m, "Good"),
            new("crit-02", "Scope", 0.5m, 8.5m, "Clear")
        }
    ));
    evalGate1Res.StatusCode.Should().Be(HttpStatusCode.OK);

    // Assert: Gate 1 PASSED -> Gate 2 Unlocked to OPEN_FOR_SUBMISSION
    var refreshedGatesRes = await leaderClient.GetAsync($"/api/v1/projects/{projectId}/review-gates");
    var refreshed = (await refreshedGatesRes.Content.ReadFromJsonAsync<ApiResponse<ProjectReviewGatesSummaryDto>>())!.Data;
    refreshed.Gates[0].Status.Should().Be("PASSED");
    refreshed.Gates[1].Status.Should().Be("OPEN_FOR_SUBMISSION");

    // Step 5: Final Defense Rubric Scoring
    var chairClient = Factory.CreateAuthenticatedClient("council.chair@aipms.edu.vn", "CouncilMember");
    var finalScoreRes = await chairClient.PostAsJsonAsync("/api/v1/evaluations/finalize", new FinalizeEvaluationDto(
        projectId, CouncilId, TotalScore: 8.8m, Verdict: "PASSED_EXCELLENT"
    ));
    finalScoreRes.StatusCode.Should().Be(HttpStatusCode.OK);
}
```

---

## 3. Test Scenario 2: Interdisciplinary IT + Marketing + Design (Complex Edge Cases)

### 3.1 Scenario Parameters
- **Project Title:** "Interactive Metaverse E-Commerce Platform"
- **Project Code:** `PRJ-2026-INTER-002`
- **Departments Involved:**
  - Primary: Computer Science / Software Engineering (`SE`, 50% weight)
  - Secondary: Digital Marketing (`MKT`, 30% weight)
  - Supporting: Graphic & Multimedia Design (`GD`, 20% weight)
- **Team Composition:** 2 SE Students, 1 Marketing Student, 1 Design Student
- **Supervisors:** Dr. Tran (SE Lead Mentor), MSc. Pham (MKT Co-Supervisor)

### 3.2 Key Edge Cases Tested in Scenario 2

#### Edge Case A: Reviewer Conflict-of-Interest Rejection (`BR-GATE-028`)
```csharp
[Fact]
public async Task Interdisciplinary_Should_Reject_Supervisor_As_Independent_Reviewer()
{
    var deptHeadClient = Factory.CreateAuthenticatedClient("depthead.se@aipms.edu.vn", "DepartmentHead");

    // Attempting to assign Dr. Tran (Supervisor) as Reviewer for Gate 2
    var assignConflictRes = await deptHeadClient.PostAsJsonAsync("/api/v1/review-gates/assignments", new AssignReviewerDto(
        GateInstanceId: Gate2Id,
        ReviewerId: DrTranSupervisorId, // Conflict!
        DeadlineUtc: DateTime.UtcNow.AddDays(5)
    ));

    assignConflictRes.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    var err = await assignConflictRes.Content.ReadFromJsonAsync<ApiResponse<object>>();
    err!.ErrorCode.Should().Be("ERR_REVIEWER_CONFLICT_OF_INTEREST");
}
```

#### Edge Case B: Gate 2 Score Below Threshold -> 72h Remediation -> Clearance
```csharp
[Fact]
public async Task Interdisciplinary_Gate2_Should_TriggerRemediation_And_PassOnResubmission()
{
    var reviewerClient = Factory.CreateAuthenticatedClient("reviewer.mkt@aipms.edu.vn", "Reviewer");

    // Initial evaluation results in 5.8 (in [5.0, 6.4] window)
    await reviewerClient.PostAsJsonAsync($"/api/v1/review-gates/{Gate2Id}/evaluations", new SubmitGateEvaluationDto(
        IsDraft: false, "Marketing analysis lacks empirical survey data.", new List<CriterionScoreDto> {
            new("crit-tech", "Tech Implementation", 0.5m, 7.0m, "Good 3D models"),
            new("crit-mkt", "Market Viability", 0.5m, 4.6m, "Weak dataset")
        }
    ));

    // Assert: Status transitions to REVISION_REQUIRED
    var gateRes = await LeaderClient.GetAsync($"/api/v1/projects/{ProjectId}/review-gates/{Gate2Id}");
    var gateData = (await gateRes.Content.ReadFromJsonAsync<ApiResponse<ProjectGateDetailDto>>())!.Data;
    gateData.Status.Should().Be("REVISION_REQUIRED");
    gateData.RemediationDeadlineUtc.Should().BeCloseTo(DateTime.UtcNow.AddHours(72), TimeSpan.FromMinutes(5));

    // Student uploads remediated customer survey data
    await LeaderClient.PostAsJsonAsync($"/api/v1/projects/{ProjectId}/review-gates/{Gate2Id}/evidence", new SubmitEvidenceDto(
        "DOCUMENT_PDF", "Empirical Market Survey (N=500)", "https://storage.aipms.edu.vn/mkt-survey-v2.pdf", null, "{}"
    ));
    await LeaderClient.PostAsJsonAsync($"/api/v1/projects/{ProjectId}/review-gates/{Gate2Id}/submit-for-review", new { });

    // Reviewer re-scores to 7.2
    await reviewerClient.PostAsJsonAsync($"/api/v1/review-gates/{Gate2Id}/evaluations", new SubmitGateEvaluationDto(
        IsDraft: false, "Survey data addressed all concerns.", new List<CriterionScoreDto> {
            new("crit-tech", "Tech Implementation", 0.5m, 7.0m, "Good"),
            new("crit-mkt", "Market Viability", 0.5m, 7.4m, "Solid survey data")
        }
    ));

    // Assert: Gate 2 transitions to PASSED
    var gatePassedRes = await LeaderClient.GetAsync($"/api/v1/projects/{ProjectId}/review-gates/{Gate2Id}");
    var gatePassedData = (await gatePassedRes.Content.ReadFromJsonAsync<ApiResponse<ProjectGateDetailDto>>())!.Data;
    gatePassedData.Status.Should().Be("PASSED");
    gatePassedData.AverageScore.Should().Be(7.2m);
}
```

#### Edge Case C: Final Defense Grade Dispute & Department Head Resolution
```csharp
[Fact]
public async Task Interdisciplinary_Should_Allow_GradeAppeal_And_UpdateFinalScore()
{
    // Graphic Design student files appeal within 72 hours
    var gdStudentClient = Factory.CreateAuthenticatedClient("student.gd@aipms.edu.vn", "Student");
    var appealRes = await gdStudentClient.PostAsJsonAsync("/api/v1/appeals", new CreateAppealDto(
        ProjectId, AppealType: "COUNCIL_SCORE_DISPUTE", TargetCriterion: "UI/UX Design Fidelity",
        Reason: "Council member deducted points citing mobile unresponsiveness, but topic specification explicitly defined Desktop VR WebGL."
    ));
    appealRes.StatusCode.Should().Be(HttpStatusCode.Created);
    var appealId = (await appealRes.Content.ReadFromJsonAsync<ApiResponse<AppealDto>>())!.Data.Id;

    // Department Head reviews evidence with Council Chair and accepts appeal
    var deptHeadClient = Factory.CreateAuthenticatedClient("depthead.se@aipms.edu.vn", "DepartmentHead");
    var resolveRes = await deptHeadClient.PutAsJsonAsync($"/api/v1/appeals/{appealId}/resolve", new ResolveAppealDto(
        Decision: "ACCEPTED_GRADE_UPDATED", AdjustedScore: 8.5m, Justification: "Verified project scope agreement. Deduction was procedurally incorrect."
    ));
    resolveRes.StatusCode.Should().Be(HttpStatusCode.OK);

    // Verify Final Project Grade Updated
    var projectRes = await gdStudentClient.GetAsync($"/api/v1/projects/{ProjectId}");
    var projectData = (await projectRes.Content.ReadFromJsonAsync<ApiResponse<ProjectDto>>())!.Data;
    projectData.FinalScore.Should().Be(8.5m);
}
```
