# G4 — recipient notification destinations and read-before-navigation

27/10/2026, Asia/Saigon. Branch `fix/fe-notification-deeplink`, baseline4d2b90c (PR #107 included). This change resolves destinations; Vietnamese copy is the separate **G6 PR #108 dependency**. No unmerged copy, router, execution guard or permission code is copied into this branch.

## Destination contract

`notification-link-resolver.ts` validates a positive safe integer ID, checks the actual related entity type, uses the same primary-role precedence as RoleRoute, and returns a destination or null. Unknown events/entities and missing/invalid IDs have no link. The inventory is43 merged producer names plus13 retained legacy names; current DTO has no `projectId` parameter or enrollment token.

The table is the complete grouped mapping. S=Student, L=Lecturer, D=Department Staff, A=Admin. An omitted identity has no destination. Every numeric placeholder uses that named entity's ID, never an assumed project ID. Generic list/workspace labels deliberately do not promise to open an exact historical project.

| Types | Entity | Destinations |
|---|---|---|
| `TEAM_INVITATION_SENT/ACCEPTED/REJECTED/CANCELLED` | TEAM_INVITATION or TEAM | S `/team` |
| `TEAM_LEADER_CHANGE_REQUESTED/APPROVED/REJECTED` | TEAM_LEADER_CHANGE_REQUEST or TEAM | S `/team`; L `/supervisor/workspace` |
| `SUPERVISOR_REQUEST_SENT/ACCEPTED/REJECTED/CANCELLED`, `SUPERVISOR_REPLACED` | SUPERVISOR_REQUEST / SUPERVISOR_ASSIGNMENT | S `/project/supervisor`; L own workspace |
| `PROJECT_APPROVED/REJECTED/REVISION_REQUESTED`, legacy `PROJECT_UPDATED` | PROJECT | S `/projects/lifecycle`; L own workspace; D `/department/projects/review/:projectId` |
| `SUPERVISOR_FEEDBACK_ADDED` | Actual inbox parent: PROGRESS_REPORT / MEETING / DELIVERABLE_VERSION; legacy TASK / PROJECT / DELIVERABLE | S report or meeting detail by that parent ID, current deliverables list, task detail, or own overview; L own workspace/calendar as appropriate |
| `PROGRESS_REPORT_SUBMITTED` | PROGRESS_REPORT | S `/project/reports/:reportId`; L own workspace |
| `TASK_DEADLINE_REMINDER`, `TASK_OVERDUE` | TASK | S `/project/tasks/:taskId`; L own workspace |
| `DELIVERABLE_DEADLINE_REMINDER`, `DELIVERABLE_OVERDUE`, `DELIVERABLE_SUBMITTED`, legacy `DELIVERABLE_FEEDBACK_ADDED` | DELIVERABLE / DELIVERABLE_VERSION | S current `/project/deliverables`; L own workspace |
| `MEETING_SCHEDULED`, `MEETING_START_REMINDER` | MEETING | S `/project/meetings/:meetingId`; L `/calendar` |
| `MEETING_ACTION_ASSIGNED` | MEETING_ACTION_ITEM | S current `/project/meetings`; L calendar |
| `FINAL_SUBMISSION_LOCKED/DEADLINE_REMINDER/OVERDUE` | PROJECT | S current `/project/final-submission`; L own workspace; D `/department/projects/:projectId/final-submission` |
| `PROJECT_RESULT_PUBLISHED`, `STUDENT_RESULT_PUBLISHED` | PROJECT / STUDENT_RESULT | S current `/project/result` |
| `PROJECT_RISK_MEDIUM/HIGH/CRITICAL` | PROJECT | S own overview; L own workspace; D `/department/portfolio` |
| `DEFENSE_SCHEDULED/CANCELLED` | DEFENSE_SESSION | S current `/project/defense`; L calendar; both require DEFENSE rollout |
| `EVALUATOR_ASSIGNED` | EVALUATION_ASSIGNMENT | L `/evaluator/assignments/:assignmentId` |
| `EVALUATION_FINALIZED` | EVALUATION | D own portfolio |
| `APPEAL_REQUESTED/REVIEWER_ASSIGNED/REVIEWED/DECIDED` | PROJECT | S own result; L/D `/review/projects/:projectId/corrections`; require RESULT_CORRECTION rollout |
| `REVIEW_GATE_UPDATED`; legacy `REVIEW_DEADLINE_APPROACHING`, `GATE_REVISION_REQUIRED`, `EVIDENCE_VERIFIED`, `GATE_DECISION_RECORDED`, `DISCIPLINE_REVIEW_PENDING/DECISION_RECORDED`, `DEFENSE_READINESS_CHANGED` | PROJECT_GATE / PROJECT / REVIEW_GATE / GATE_REVIEW / EVIDENCE | S current `/project/timeline`; L own workspace; D department matrix |
| Legacy `GATE_REVIEW_ASSIGNED/SUBMITTED`, `GATE_REVISION_SUBMITTED` | Same Gate entities | S current timeline; L `/review/gate-assignments`; D matrix |
| Legacy `REVIEW_POLICY_PUBLISHED` | PROJECT_PERIOD / REVIEW_POLICY / PROJECT / PROJECT_GATE | S current timeline; L own workspace; D matrix; A `/academic/review-gates` |
| `INDUSTRY_INVITATION` | USER | No academic-role link: the required enrollment token is absent |

Core Review Gates is not controlled by the legacy `VITE_ENABLE_GATES` checkpoint flag. Admin never receives a department-matrix link. Closed rollout routes are not offered. The resolver uses exact known names rather than treating every future `GATE_*`/`APPEAL_*` name as supported.

## Reading and authorization

Ordinary link activation awaits the recipient mark-read operation, then navigates. Failure logs only a fixed diagnostic and still navigates; already-read items skip the write. A duplicate activation while pending is ignored. The separate mark-read button remains; modified browser clicks retain native behavior with best-effort read marking. A link clicked during another inbox/header read is queued rather than silently dropping its own mark. Header preview closes on ordinary navigation.

Both inbox and TopHeader now return the real mutation promise. Mark-all errors remain handled in place; individual read failures propagate to the row's soft-failure handling. Unknown/no-destination titles remain plain headings.

Destination authorization is retained: identity guards plus existing task/report/meeting project checks and assignment/department guards still run. Student singleton screens resolve the **current journey**; the notification DTO cannot locate an exact old project for every event. Own-list labels make this limit explicit. No FE1 journey/permission guard was changed to turn stale access into success.

## Checks and runtime evidence

- Independent grouped fixtures cover all56 names ×4 identities, plus invalid IDs/entities, inherited/unknown keys, feature holds, feedback parent IDs and primary-role precedence. Every produced URL is matched against the actual appRouter and every RoleRoute on that match; registry-only checks cannot cover every detail route.
- Row tests cover awaiting read before navigation, duplicate prevention, read failure without private diagnostics, already-read behavior and the separate read action. Inbox integration checks a link activation queued behind a bulk read.
- Targeted notification/Gate scenario run:6 files/94 tests PASS. Full technical and browser results are recorded in the final local handoff; no claim is made that all56 event types were generated on staging.

The old Gate scenario now calls the validated resolver with explicit entity metadata; its Admin policy destination is corrected from the forbidden department matrix to academic policy. Existing Gate workflow assertions are retained. Translation and safe fallback tests in PR #108 are separate and must be integrated for final Vietnamese UI acceptance.

Local evidence: `E:/DOANTOTNGHIEP/output/fe2-feedback-2026-10-26/g4/` (outside Git). The bundle retains its26October directory name for stable links. No PR merge, fixture bypass or automatic Checkpoint B approval.
