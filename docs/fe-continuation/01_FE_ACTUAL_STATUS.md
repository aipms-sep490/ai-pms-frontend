# 01 — FE ACTUAL IMPLEMENTATION STATUS & SOURCE AUDIT
**AI-PMS (Academic Information & Project Management System)**  
**Branch:** `feat/uiux-master-redesign` (commit: `606773e`)  
**Auditor:** Senior React/TypeScript Frontend Engineer & QA Lead  
**Audit Date:** 2026-10-18  

---

## 1. Executive Status Overview

A forensic audit of the actual local working tree on branch `feat/uiux-master-redesign` reveals a mature, highly functional React 18 / TypeScript frontend with 71 active routes.

However, there is a critical architectural divergence regarding Review Gates:
1. **Mock Hardcoding in Review Gates:** In `src/features/review-gates/api/review-gates-api.ts`, all exports (`getReviewGateTemplates`, `getStudentReviewTimeline`, `submitRevision`, `verifyEvidence`, `submitGateDecision`, etc.) **directly invoke methods on `reviewGatesMockAdapter`**.
2. **Missing Environment Toggle:** The variable `VITE_USE_MOCK_REVIEW_GATES` (referenced in earlier handoff documents) **does NOT exist** anywhere in `.env`, `.env.example`, `.env.local`, or any `.ts` file in `src/`. The review-gates feature is currently `MOCK_ONLY` by design.
3. **Core Modules are Live:** In contrast, Authentication, Projects, Teams, Tasks, Sprints, Meetings, Video Rooms (LiveKit), Deliverables, Final Submissions, and Defense Rubrics are wired to real backend HTTP endpoints via `apiClient` / `http-client.ts`.

---

## 2. Module-by-Module Source Status Matrix

*Classification Legend:*
- `REAL_API`: Directly connected to live ASP.NET Core endpoints with verified DTOs and network callers.
- `MOCK_ONLY`: Component UI is complete, but data and mutations run purely against in-memory mock adapters; no backend calls occur.
- `PARTIAL`: Some actions call real backend APIs, while secondary metrics/composite views are simulated or aggregated client-side.
- `MISSING`: Route or UI component is stubbed, unfinished, or absent.
- `NOT_TESTED`: Code exists but lacks automated unit or integration tests.

| Module / Screen | Physical Path | Primary Route(s) | Status | Evidence & Handler |
| :--- | :--- | :--- | :---: | :--- |
| **Authentication & Session** | `src/features/auth/` | `/login`, `/profile`, `/change-password` | **`REAL_API`** | `auth-api.ts` calls `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh-token`. Context managed by `AuthSessionContext.tsx`. |
| **Student Review Timeline** | `src/features/review-gates/components/StudentReviewTimeline.tsx` | `/project/review-gates` | **`MOCK_ONLY`** | `StudentReviewTimelinePage.tsx#L32` calls `getStudentReviewTimeline()` in `review-gates-api.ts#L60` $\rightarrow$ routes to `reviewGatesMockAdapter.getStudentReviewTimeline()`. |
| **Review Submission & Revisions** | `src/features/review-gates/components/ReviewSubmissionModal.tsx` | `/project/review-gates` | **`MOCK_ONLY`** | `StudentReviewTimelinePage.tsx#L52` calls `submitRevision()` in `review-gates-api.ts#L64` $\rightarrow$ routes to `reviewGatesMockAdapter.submitRevision()`. |
| **Assigned Reviewer Queue** | `src/features/review-gates/components/AssignedReviewQueue.tsx` | `/review/gate-assignments` | **`MOCK_ONLY`** | `AssignedGateReviewPage.tsx#L17` calls `getAssignedReviews()`, `verifyEvidence()`, `submitGateDecision()` in `review-gates-api.ts#L71-L81`. |
| **Department Gate Matrix** | `src/features/review-gates/components/ProjectProgressMatrix.tsx` | `/academic/review-gates` | **`MOCK_ONLY`** | `ReviewGateGovernancePage.tsx#L25` calls `getProjectReviewMatrix()`, `updateGateDecision()` in `review-gates-api.ts#L36-L46`. |
| **Gate Template Builder** | `src/features/review-gates/components/ReviewGateBuilder.tsx` | `/academic/review-gates` | **`MOCK_ONLY`** | `ReviewGateGovernancePage.tsx#L35` calls `saveReviewGateTemplate()`, `publishReviewGateTemplate()` in `review-gates-api.ts#L28-L34`. |
| **Defense Readiness Advisory**| `src/features/review-gates/components/DefenseReadinessChecker.tsx`| `/academic/review-gates` | **`MOCK_ONLY`** | `ReviewGateGovernancePage.tsx#L40` calls `getDefenseReadiness()` in `review-gates-api.ts#L56`. |
| **Interdisciplinary Scope Panel**| `src/features/review-gates/components/InterdisciplinaryGatePanel.tsx`| `/academic/review-gates` | **`MOCK_ONLY`** | `ReviewGateGovernancePage.tsx#L50` calls `updateHybridScopeDecision()` in `review-gates-api.ts#L48`. |
| **Legacy Project Checkpoints** | `src/features/gates/` | `/projects/:id/checkpoints` | **`REAL_API`** | `gates-api.ts#L5-L17` calls `GET /projects/{id}/checkpoints`, `POST /checkpoints/{id}/decisions` via `http-client.ts`. |
| **Student Journey Hub** | `src/features/student/` | `/workspace/student/journey` | **`PARTIAL`** | Calls real backend endpoints for tasks and project info, but aggregates "Next Actions" client-side. |
| **Topic Proposals & Registration**| `src/features/topics/` | `/topics`, `/workspace/student/proposal` | **`REAL_API`** | `topic-api.ts` calls `GET /topics`, `POST /projects/proposals`. Tests: `topic-api.test.ts`. |
| **Agile Kanban Board & Tasks** | `src/features/tasks/`, `services/api/tasks.api.ts` | `/workspace/projects/:id/tasks` | **`REAL_API`** | `tasks.api.ts` calls `GET /projects/{id}/tasks`, `POST /tasks`. Tests: `tasks.api.test.ts`. |
| **Sprints & Backlog** | `src/features/sprints/` | `/workspace/projects/:id/sprints` | **`REAL_API`** | `jira-sprint-api.ts` calls `GET /projects/{id}/sprints`, `POST /sprints`. |
| **Meetings & Attendance** | `src/services/api/meetings.api.ts` | `/workspace/meetings` | **`REAL_API`** | Calls `GET /meetings`, `POST /meetings`. Tests: `meetings.api.test.ts`. |
| **WebRTC Audio/Video (LiveKit)**| `src/features/meetings/video/` | `/workspace/meetings/:id/room` | **`REAL_API`** | `meeting-video-api.ts` calls `POST /api/v1/livekit/token`. UI renders LiveKit room with camera/mic controls. |
| **Deliverables & Final Submissions**| `src/services/api/deliverables.api.ts`, `final-submission-api.ts`| `/workspace/deliverables` | **`REAL_API`** | Calls `POST /deliverables`, `POST /final-submissions`. Tests: `deliverables.api.test.ts`. |
| **Defense Rubrics & Scoring** | `src/services/api/evaluations.api.ts` | `/workspace/evaluations` | **`REAL_API`** | Calls `POST /evaluations/draft`, `POST /evaluations/finalize`. Tests: `evaluations.api.test.ts`. |
| **Student Appeals & Disputes**| `src/features/results/result-correction-api.ts` | `/workspace/appeals` | **`REAL_API`** | Calls `POST /api/v1/appeals`, `GET /api/v1/appeals/{id}`. Tests: `result-correction-api.test.ts`. |
| **Realtime Notifications** | `src/features/notifications/` | Global Header Bell | **`REAL_API`** | `notifications-api.ts` calls `GET /api/v1/notifications`. Deep-links resolve via `NotificationRow.tsx`. |
| **Supervisor Cohort Monitoring**| `src/features/supervisors/` | `/workspace/supervisor` | **`PARTIAL`** | Calls `supervisor-api.ts` (`GET /supervisors/me/projects`), but triage priority ranking is computed on FE. |
| **Department Matrix & Policies**| `src/features/department/` | `/workspace/department` | **`PARTIAL`** | General department stats use real API; Review Gate Matrix runs on mock adapter. |

---

## 3. Review Gates Mock Adapter Forensic Breakdown

In `src/features/review-gates/api/review-gates-mock-adapter.ts`:
- Total lines: **1045 lines**.
- Stored mock state:
  - `initialTemplates`: Contains 3 templates (`tmpl-it-2026` single major IT with 4 gates R1–R4; `tmpl-mkt-2026` marketing with R1; `tmpl-hyb-2026` interdisciplinary IT+MKT+Design with 4 gates G1–G4).
  - `initialMatrix`: 4 sample projects (`IT-01`, `IT-02`, `MKT-01`, `HYB-01`) with gate statuses and blocking reasons.
  - `initialStudentTimeline`: Project `IT-01` in Gate R2 with requirements `req-r2-1` (ACCEPTED), `req-r2-2` (REJECTED with feedback), `req-r2-3` (ACCEPTED prototype).
  - `initialAssignedReviews`: Reviewer queue with assignments for `IT-01` (R2) and `IT-02` (R3).
- **Simulated Delays:** 60ms to 90ms via `setTimeout`.
- **Concurrency Simulation:** Generates `concurrencyToken: token-${Date.now()}` and rejects mismatches with `409: Dữ liệu đã thay đổi bởi phiên làm việc khác`.
- **Role Invariant Simulation:** `submitRevision` enforces `if (!isLeader) throw new Error('403: Không đủ thẩm quyền. Chỉ trưởng nhóm...')`.
- **Mandatory Completeness Simulation:** `submitGateDecision` rejects `PASSED` with 422 if any mandatory evidence is not `ACCEPTED`.

---

## 4. Test Suite Execution & Coverage

Running `npm test -- src/features/review-gates` executes Vitest across 4 test files:
```
✓ ReviewGateGovernancePage.test.tsx (7 tests)
✓ CrossRoleScenario.test.tsx (12 tests)
✓ AssignedGateReviewPage.test.tsx (4 tests)
✓ StudentReviewTimelinePage.test.tsx (3 tests)
Test Files: 4 passed (4)
Tests: 26 passed (26)
Duration: 4.26s
```
**Conclusion:** The Review Gates UI slice is **100% covered and internally consistent**, but it operates entirely in isolation from ASP.NET Core because the backend endpoints do not yet exist.
