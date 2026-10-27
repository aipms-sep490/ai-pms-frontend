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
- Targeted notification/Gate scenario run:6 files/94 tests PASS. Standalone full suite:269 files/1551 tests PASS; typecheck, lint, build and diff checks PASS. Lint has209 existing warnings; the bundle-size warning and jsdom navigation informational line remain. Checks use process-only `VITE_API_BASE_URL=/api/v1`, without changing user environment files.

## Combined preview and real role checks

A local-only integration checkout at `fe2-checkpoint-b-preview`, commit `18039443738496c0d5d9f012f158014de1acce4c`, combines G7/G9 feedback and G1/G6/G5/G4 on develop4d2b90c. Its upstream is unset and it is not pushed. This is an explicit review preview, not a GitHub PR merge. G6 Vietnamese assertions and G4 router fixtures merge automatically after sharing the test render wrapper; neither assertion set is dropped.

The combined acceptance run passes **272 files /1671 tests**, typecheck, lint and build. Real UI checks use this combined source, normal sign-in and staging API, with Review Gates mock off and the committed safe acceptance flags. No DB changes, auth bypass or intercepted responses were used.

| Recipient | Actual inbox and clicks | Result / limit |
|---|---|---|
| Student `p1.se4` | Both existing rows: invitation70033 and proposal approval70037 | PATCH read204 precedes each SPA navigation; destinations `/team` and `/projects/lifecycle`. Subsequent GET confirms both read. Team renders the current roster and invitation list; an existing permission alert for an auxiliary team read remains, so this is not full team-workflow acceptance. |
| Lecturer `lecturer.it1` | All6 existing rows:4 supervisor requests,1 submitted deliverable,1 meeting | Own supervision workspace or calendar, with their actual headings and scoped data; no notification link interpolates request/version IDs as project IDs. |
| Department `staff.it` | Both existing rows: finalized evaluation and locked final submission | Own portfolio and `/department/projects/50003/final-submission`; the locked package is visible. No proposal-review event is present in this inbox. |
| Admin | Empty real inbox | Empty state only; no fabricated policy event. Admin policy destination is verified by the router/role regression suite. |

All10 available notification rows were clicked, covering7 actual event types. Inbox screenshots for all4 identities and the Student header popup record390/768/1280/1440px. Header activation via Enter opens the current proposal and closes the popup; an already-read item issues no additional read mutation. Header bounds stay within each viewport. The separate `authorization-negative.json` is a **direct destination probe**, not a generated notification: Student50006/current project50005 opening task20004 from project50004 receives403 with an explanatory UI, not a blank page.

Read/navigation ordering is in `student-live-links.json`; its first immediate invitation main-text sample still contains the outgoing lazy page and must not be used as the destination-heading proof. The separately settled `student-team-link-destination-1440.png` and destination follow-up metadata verify the team page. Mark-read failure, queued concurrent reads and every event/role combination are controlled tests, not claimed as reproduced staging failures. Fresh notification generation retains the G6 verification/locked-roster fixture gap; existing historical events are explicitly identified above.

The old Gate scenario now calls the validated resolver with explicit entity metadata; its Admin policy destination is corrected from the forbidden department matrix to academic policy. Existing Gate workflow assertions are retained. Translation and safe fallback tests in PR #108 are separate and must be integrated for final Vietnamese UI acceptance.

Local evidence: `E:/DOANTOTNGHIEP/output/fe2-feedback-2026-10-26/g4/` (outside Git). The bundle retains its26October directory name for stable links. No PR merge, fixture bypass or automatic Checkpoint B approval.
