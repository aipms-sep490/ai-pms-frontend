# 03 — FRONTEND-BACKEND INTEGRATION GAP MATRIX
**AI-PMS (Academic Information & Project Management System)**  
**FE Branch:** `feat/fe-uiux-standardisation-20261106`  
**BE Branch:** `develop` (commit: `fcf470e`, đối chiếu ngày 06/11/2026)  

---

## 1. Executive Gap Summary
The audit of both codebases against backend commit `fcf470e` confirms a significantly matured integration landscape:
- **95%+ of Core Academic Project Management is Fully Backed:** User authentication, academic hierarchy, project registration, supervisor assignment/recommendations, agile sprints/tasks, milestone tracking, WebRTC LiveKit meetings, rubric scoring, deliverable versions, cold reports, weekly assessments, and project results are backed by live ASP.NET Core controllers with comprehensive integration coverage.
- **Review Gates Subsystem Status:** 9 out of 10 endpoints for the Review Gates subsystem (`src/features/review-gates/`)—including chronological gate timelines, gate evidence ledgers, reviewer gate decisions/verifications, gate templates, reviewer assignments, and the Department Gate Matrix—have been **FULLY DELIVERED** on backend commit `fcf470e`. The FE has switched from the standalone mock adapter to direct integration with `src/features/review-gates/api/review-gates-api.ts`.
- **The Remaining Critical Gate Gap:** The sole missing gate operation is **Department Gate Override** (`POST /api/v1/review-gates/{gateId}/override` or escalation path). This item is formally tracked under ticket **`BE-15-03`** in `docs/fe-to-be-handoff/15_ROOM_HOLIDAY_AND_WORKFLOW_GAPS_BE_TASKS.md`.
- **Aggregator Dashboards:** Student Next Actions (`/api/v1/students/me/next-actions`), Supervisor Triage Queue (`/api/v1/dashboards/supervisor`), and Department Urgent Actions (`/api/v1/departments/{id}/urgent-actions`) are now live on the backend.

---

## 2. Detailed Gap Analysis Table

| Domain / Feature | FE Route & Component | Expected BE API Contract | Actual BE Status (`AIPMS.Api` @ `fcf470e`) | Database Backing | Severity & Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Review Gates: Gate Instance & Timeline** | `/workspace/student/review-gates`<br>`ReviewGatesTimeline.tsx` | `GET /api/v1/projects/{projectId}/review-gates`<br>`GET /api/v1/projects/{projectId}/review-gates/timeline` | **COMPLETE** (`ProjectsController.cs`, `ReviewGatesController.cs`) | `ProjectGateInstances`, `ReviewGateTemplates` (Live) | Pass |
| **Review Gates: Evidence Submission** | `/workspace/student/review-gates/:gateId`<br>`EvidenceLedgerTable.tsx` | `POST /api/v1/projects/{projectId}/review-gates/{gateCode}/evidence`<br>`POST .../evidence/file` | **COMPLETE** (`ProjectsController.cs`) | `GateEvidenceLedgers`, `ProjectFiles` (Live) | Pass |
| **Review Gates: Independent Reviewer Scoring** | `/workspace/reviewer/gates/:gateId/verify`<br>`ReviewerVerificationPanel.tsx` | `POST /api/v1/review-gates/assignments/{assignmentId}/decision`<br>`POST .../verify` | **COMPLETE** (`ReviewGatesController.cs`) | `GateEvaluations`, `GateEvaluationScores` (Live) | Pass |
| **Review Gates: Department Gate Matrix** | `/workspace/department/gate-matrix`<br>`DepartmentGateMatrix.tsx` | `GET /api/v1/departments/{departmentId}/review-gates/matrix` | **COMPLETE** (`DepartmentsController.cs`) | `Projects`, `ProjectGateInstances`, `GateEvaluations` (Live) | Pass |
| **Review Gates: Department Gate Override** | `/workspace/department/gate-matrix`<br>`DepartmentGateMatrix.tsx` | `POST /api/v1/review-gates/{gateId}/override` | **MISSING** (No override/force endpoint yet; tracked under `BE-15-03`) | Needs audit log column & state bypass in `ProjectGateInstances` | **P0 (Critical — Tracked BE-15-03)** |
| **Review Gates: Template & Policy Builder** | `/workspace/department/gate-templates`<br>`DepartmentTemplateBuilderPage.tsx` | `GET /api/v1/academic/gate-templates`<br>`POST /api/v1/academic/gate-templates/{id}/publish` | **COMPLETE** (`AcademicController.cs`) | `ReviewGateTemplates`, `GateCriteria` (Live) | Pass |
| **Review Gates: Reviewer Assignment** | `/workspace/department/reviewer-assignments`<br>`DepartmentReviewerAssignmentPage.tsx` | `POST /api/v1/review-gates/assignments`<br>`POST .../revoke` | **COMPLETE** (`ReviewGatesController.cs`) | `GateReviewerAssignments` (Live) | Pass |
| **Student Journey: Next Actions Aggregator** | `/workspace/student/journey`<br>`StudentNextActionWidget.tsx` | `GET /api/v1/students/me/next-actions` | **COMPLETE** (`StudentsController.cs`) | Aggregated from milestones, deliverables, meetings | Pass |
| **Supervisor: Triage & Cohort Queue** | `/workspace/supervisor`<br>`SupervisorTriageQueue.tsx` | `GET /api/v1/dashboards/supervisor` | **COMPLETE** (`DashboardsController.cs`) | Live triage aggregation | Pass |
| **Department: Urgent Action Queue** | `/workspace/department`<br>`DepartmentWorkspacePage.tsx` | `GET /api/v1/departments/{id}/urgent-actions` | **COMPLETE** (`DepartmentsController.cs`) | Live department queue aggregation | Pass |
| **Project Proposals & Registration** | `/workspace/student/proposal`<br>`StudentProposalPage.tsx` | `POST /api/v1/projects/proposals`<br>`GET /api/v1/projects/{id}` | **COMPLETE** (`ProjectsController.cs`, `ProposalReviewsController.cs`) | `Projects`, `ProposalReviews` (Live) | Pass |
| **Agile Tasks, Sprints & Backlog** | `/workspace/student/tasks`<br>`TaskBoardPage.tsx` | `GET /api/v1/projects/{id}/tasks`<br>`POST /api/v1/projects/{id}/tasks` | **COMPLETE** (`TasksController.cs`, `SprintsController.cs`) | `Tasks`, `Sprints` (Live) | Pass |
| **Milestones Management** | `/workspace/student/milestones`<br>`StudentMilestonesPage.tsx` | `GET /api/v1/projects/{id}/milestones`<br>`PUT /api/v1/projects/{id}/milestones/{id}` | **COMPLETE** (`MilestonesController.cs`) | `Milestones` (Live) | Pass |
| **Meetings & LiveKit Video Calls** | `/workspace/meetings/*`<br>`VideoRoomPage.tsx` | `POST /api/v1/meetings`<br>`POST /api/v1/livekit/token` | **COMPLETE** (`MeetingsController.cs`, `LiveKitController.cs`) | `Meetings`, `MeetingMinutes`, `MeetingAttendees` (Live) | Pass |
| **Deliverables & Final Submissions** | `/workspace/deliverables/*`<br>`FinalSubmissionPage.tsx` | `POST /api/v1/deliverables`<br>`POST /api/v1/projects/{projectId}/result` | **COMPLETE** (`DeliverablesController.cs`, `ProjectsController.cs`) | `Deliverables`, `FinalSubmissions` (Live) | Pass |
| **Final Defense Rubrics & Scoring** | `/workspace/reviewer/defense-scoring`<br>`ReviewerCouncilScoringPage.tsx` | `POST /api/v1/evaluations/draft`<br>`POST /api/v1/evaluations/finalize` | **COMPLETE** (`EvaluationsController.cs`, `RubricsController.cs`) | `Evaluations`, `EvaluationScores`, `RubricItems` (Live) | Pass |
| **Appeals & Academic Committee** | `/workspace/appeals/*`<br>`StudentAppealsPage.tsx` | `POST /api/v1/projects/{projectId}/result/appeal-windows`<br>`POST .../result/correction-requests` | **COMPLETE** (`ProjectsController.cs`) | `AppealWindows`, `CorrectionRequests` (Live) | Pass |
| **Realtime Notifications** | Universal Bell Icon<br>`NotificationCenter.tsx` | `GET /api/v1/notifications`<br>SignalR: `/hubs/notifications` | **COMPLETE** (`NotificationsController.cs`, `NotificationHub.cs`) | `Notifications` (Live) | Pass |

---

## 3. Summary of Technical Debt & Architectural Risks
1. **Gate Override Execution (BE-15-03):** Currently, department heads cannot force-pass or override a blocked review gate from the UI because the backend does not expose an escalation/override command. All gates must follow standard reviewer sign-off until `BE-15-03` is implemented.
2. **Defense Room Scheduling & Collision Guard (BE-15-02):** `DefenseSessionDto.room` is currently an unconstrained string, and session listing is scoped to single projects (`GET /api/v1/projects/{projectId}/defense-sessions`). Cross-project defense scheduling with room collision avoidance is deferred to `BE-15-02`. The frontend enforces in-project time overlap warnings and normalized room code formatting (`A-201`).
3. **Academic Holiday / Business-Day Calendaring (BE-15-01):** Calculation of appeal windows and remediation durations currently relies on calendar days rather than academic business days due to missing holiday entities on the backend. Tracked in `BE-15-01`.
