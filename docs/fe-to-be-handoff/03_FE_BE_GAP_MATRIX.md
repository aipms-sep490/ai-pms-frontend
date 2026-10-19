# 03 — FRONTEND-BACKEND INTEGRATION GAP MATRIX
**AI-PMS (Academic Information & Project Management System)**  
**FE Branch:** `feat/uiux-master-redesign` (commit: `606773e`)  
**BE Branch:** `develop` (commit: `090f93d`)  

---

## 1. Executive Gap Summary
The audit of both codebases reveals a clear integration landscape:
- **80% of Core Academic Project Management is Fully Backed:** User authentication, project registration, supervisor assignment, sprint/task boards, milestone tracking, WebRTC video meetings, rubric scoring, and file deliverables are already backed by live ASP.NET Core controllers and covered by 80+ integration test suites.
- **The Critical Gap (P0): Review Gates & Department Progress Matrix:** The entire `Review Gates` subsystem (`src/features/review-gates/`)—including chronological gate timelines, gate KPI metric aggregation, evidence ledgers, independent reviewer gate scoring, gate override mechanics, and the Department Gate Matrix—was built frontend-first in Phase C and currently runs against `reviewGatesMockAdapter.ts`. Backend `develop` has **NO** `ReviewGatesController`, no corresponding domain entities, and no database tables for review gates.
- **Secondary Gaps (P1/P2):** Composite dashboards (Student Next Actions widget, Supervisor Triage Queue, Department Urgent Action Queue) currently require multiple redundant round-trips from FE instead of dedicated backend aggregator endpoints.

---

## 2. Detailed Gap Analysis Table

| Domain / Feature | FE Route & Component | Expected BE API Contract | Actual BE Status (`AIPMS.Api`) | Database Backing | Severity & Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Review Gates: Gate Instance & Timeline** | `/workspace/student/review-gates`<br>`ReviewGatesTimeline.tsx` | `GET /api/v1/projects/{projectId}/review-gates` | **MISSING** (No controller) | Needs `ProjectGateInstances`, `ReviewGateTemplates` | **P0 (Critical)** |
| **Review Gates: Evidence Submission** | `/workspace/student/review-gates/:gateId`<br>`EvidenceLedgerTable.tsx` | `POST /api/v1/projects/{projectId}/review-gates/{gateId}/evidence`<br>`GET /api/v1/.../evidence` | **MISSING** (No controller) | Needs `GateEvidenceLedgers` | **P0 (Critical)** |
| **Review Gates: Independent Reviewer Scoring** | `/workspace/reviewer/gates/:gateId/verify`<br>`ReviewerVerificationPanel.tsx` | `POST /api/v1/review-gates/{gateId}/evaluations`<br>`GET /api/v1/review-gates/{gateId}/evaluations` | **MISSING** (`EvaluationsController` only handles final defense rubrics) | Needs `GateEvaluations`, `GateEvaluationScores` | **P0 (Critical)** |
| **Review Gates: Department Gate Matrix** | `/workspace/department/gate-matrix`<br>`DepartmentGateMatrix.tsx` | `GET /api/v1/departments/{deptId}/review-gates/matrix` | **MISSING** (No endpoint for cross-project gate aggregation) | Query across `Projects`, `ProjectGateInstances`, `GateEvaluations` | **P0 (Critical)** |
| **Review Gates: Department Gate Override** | `/workspace/department/gate-matrix`<br>`DepartmentGateMatrix.tsx` | `POST /api/v1/review-gates/{gateId}/override` | **MISSING** (No override command) | Needs audit log column in `ProjectGateInstances` | **P0 (Critical)** |
| **Review Gates: Template & Policy Builder** | `/workspace/department/gate-templates`<br>`DepartmentTemplateBuilderPage.tsx` | `GET /api/v1/academic-periods/{id}/gate-templates`<br>`POST /api/v1/academic-periods/{id}/gate-templates` | **MISSING** | Needs `ReviewGateTemplates`, `GateCriteria` | **P1 (High)** |
| **Review Gates: Reviewer Assignment** | `/workspace/department/reviewer-assignments`<br>`DepartmentReviewerAssignmentPage.tsx` | `POST /api/v1/review-gates/assignments`<br>`GET /api/v1/review-gates/assignments` | **MISSING** (`ReviewerAssignmentsController` only exists for proposal reviews) | Needs `GateReviewerAssignments` | **P0 (Critical)** |
| **Student Journey: Next Actions Aggregator** | `/workspace/student/journey`<br>`StudentNextActionWidget.tsx` | `GET /api/v1/students/me/next-actions` | **PARTIAL** (FE executes 4 parallel requests to milestones, meetings, tasks, deliverables) | Computable from existing DB tables | **P1 (High UX)** |
| **Supervisor: Triage & Cohort Queue** | `/workspace/supervisor`<br>`SupervisorTriageQueue.tsx` | `GET /api/v1/supervisors/me/triage-queue` | **PARTIAL** (FE aggregates proposals, pending weekly reviews, and meeting sign-offs) | Computable from existing DB tables | **P1 (High UX)** |
| **Department: Urgent Action Queue** | `/workspace/department`<br>`DepartmentWorkspacePage.tsx` | `GET /api/v1/departments/{id}/urgent-actions` | **PARTIAL** (FE computes counts from proposals, appeals, and mentor quotas) | Computable from existing DB tables | **P1 (High UX)** |
| **Project Proposals & Registration** | `/workspace/student/proposal`<br>`StudentProposalPage.tsx` | `POST /api/v1/projects/proposals`<br>`GET /api/v1/projects/{id}` | **COMPLETE** (`ProjectsController.cs`, `ProposalReviewsController.cs`) | `Projects`, `ProposalReviews` (Live) | Pass |
| **Agile Tasks, Sprints & Backlog** | `/workspace/student/tasks`<br>`TaskBoardPage.tsx` | `GET /api/v1/projects/{id}/tasks`<br>`POST /api/v1/projects/{id}/tasks` | **COMPLETE** (`TasksController.cs`, `SprintsController.cs`) | `Tasks`, `Sprints` (Live) | Pass |
| **Milestones Management** | `/workspace/student/milestones`<br>`StudentMilestonesPage.tsx` | `GET /api/v1/projects/{id}/milestones`<br>`PUT /api/v1/projects/{id}/milestones/{id}` | **COMPLETE** (`MilestonesController.cs`) | `Milestones` (Live) | Pass |
| **Meetings & LiveKit Video Calls** | `/workspace/meetings/*`<br>`VideoRoomPage.tsx` | `POST /api/v1/meetings`<br>`POST /api/v1/livekit/token` | **COMPLETE** (`MeetingsController.cs`, `LiveKitController.cs`) | `Meetings`, `MeetingMinutes`, `MeetingAttendees` (Live) | Pass |
| **Deliverables & Final Submissions** | `/workspace/deliverables/*`<br>`FinalSubmissionPage.tsx` | `POST /api/v1/deliverables`<br>`POST /api/v1/final-submissions` | **COMPLETE** (`DeliverablesController.cs`, `FinalSubmissionsController.cs`) | `Deliverables`, `FinalSubmissions` (Live) | Pass |
| **Final Defense Rubrics & Scoring** | `/workspace/reviewer/defense-scoring`<br>`ReviewerCouncilScoringPage.tsx` | `POST /api/v1/evaluations/draft`<br>`POST /api/v1/evaluations/finalize` | **COMPLETE** (`EvaluationsController.cs`, `RubricsController.cs`) | `Evaluations`, `EvaluationScores`, `RubricItems` (Live) | Pass |
| **Appeals & Academic Committee** | `/workspace/appeals/*`<br>`StudentAppealsPage.tsx` | `POST /api/v1/appeals`<br>`PUT /api/v1/appeals/{id}/resolve` | **COMPLETE** (`AppealsController.cs`) | `Appeals`, `AppealReviews` (Live) | Pass |
| **Realtime Notifications** | Universal Bell Icon<br>`NotificationCenter.tsx` | `GET /api/v1/notifications`<br>SignalR: `/hubs/notifications` | **COMPLETE** (`NotificationsController.cs`, `NotificationHub.cs`) | `Notifications` (Live) | Pass |

---

## 3. Summary of Technical Debt & Architectural Risks
1. **Mock Leakage Risk:** If mock data in `reviewGatesMockAdapter.ts` is not cleanly redirected via an environment toggle (`VITE_USE_MOCK_REVIEW_GATES=false`), test assumptions could diverge from actual backend SQL queries.
2. **Missing Concurrency Safeguards:** Review gate status transitions and reviewer scoring currently have no optimistic locking on the backend. Multiple reviewers submitting scores simultaneously could cause race conditions unless `RowVersion` concurrency tokens are implemented.
3. **Multi-Major Gating Discrepancy:** The frontend allows interdisciplinary project teams (e.g., Computer Science + Marketing), but the backend database schema currently associates projects with a single `DepartmentId`.
