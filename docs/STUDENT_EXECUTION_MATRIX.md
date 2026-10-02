# Phase 2 — Student Leader & Student Member execution matrix

## Scope and evidence boundary

This is a frontend-only Phase 2 inventory for an `ACTIVE` student project. It reuses the existing authenticated client and project-scoped APIs; it creates no endpoint, database field, local persistence, role claim, universal calendar event, grade, or readiness score.

The current user and leader flag come from the persisted team-membership payload. That flag may personalize a read model or suppress a structural CTA, but it is **not** permission authority: each mutation is decided again by the corresponding backend endpoint and the project's execution state.

`VERIFIED_FE` means current source and tests prove the frontend behavior.
`FE_COMPLETE_BE_BLOCKED` means the UI is safely complete but must stay
read-only/fail-closed until Backend delivers authority. `BE_HANDOFF_REQUIRED`
marks an undelivered contract; `FUTURE_SCOPE` is deliberately outside Phase 2.

## Capability matrix

| Capability | Actor | Route | Existing FE / API evidence | Mutation authority | ACTIVE / concurrency | Status | Gap / Phase 2 treatment |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Role-specific overview | Leader, Member | `/project/workspace` | `CollaborationWorkspace`, timeline, progress summary, deliverables, reports, meetings | Read-only | Wrapped by `ActiveStudentProjectRoute` | READY | Leader sees group health/attention/team; Member sees only assigned open work, own alerts, evidence links. |
| Project context and health | Leader, Member | `/project/workspace` | project, team, supervisor, task summary API | Read-only | ACTIVE route; independent resource errors | READY | No client-owned health grade is introduced. |
| Team workload / filter | Leader | `/project/workspace`, `/project/team` | persisted `team.members`, task timeline | Read-only | ACTIVE route | READY | Presentation only; task assignment remains backend-authorized. |
| My work / due soon / blocked | Member | `/project/workspace`, `/project/tasks` | task timeline filtered by persisted current user id | Read-only | ACTIVE route | READY | `IN_REVIEW` remains visible through the existing task board/detail; no new task state. |
| Task board and detail | Leader, Member | `/project/tasks`, `/project/tasks/:taskId` | existing board/detail, timeline/history APIs | Server validates create/edit/status/assignment/dependency | ACTIVE; token sent on existing update/delete/status paths, 409 requires reload/no replay | READY | Fine-grained CTA availability is still endpoint-enforced. |
| Create structural task | Student with backend capability | `/project/workspace`, `/project/tasks` | existing `WorkspaceTaskForm` / `POST /api/v1/tasks`; proposed project execution action reader | Existing endpoint is authoritative; action DTO is an advisory fail-closed pre-gate | ACTIVE; response errors preserved; no automatic replay | VERIFIED_FE + BE_HANDOFF_REQUIRED | CTA is absent unless the explicit action is returned `allowed`; a 403/409 from the mutation remains final authority. |
| Milestone list/detail/reorder | Leader, Member | `/project/milestones/:milestoneId?` | existing milestone pages / project milestone APIs | Server validates every write | ACTIVE; body/query tokens; reorder token per item; stale state is 409 | READY | Leader-specific pre-gating cannot be made authoritative without an execution-action contract. |
| Timeline / Gantt | Leader, Member | `/project/gantt` | existing task timeline data and Gantt view | Read-only | ACTIVE route | READY | No invented dependency/critical-path data. |
| Upcoming / calendar read model | Leader, Member | `/project/workspace`, `/project/tasks`, `/project/meetings`, `/project/milestones` | existing due dates and meeting data | Read-only | Existing resources load independently | VERIFIED_FE | A normalized FE read model is safe only from these resources; no universal event API or persisted calendar entity exists. |
| Meetings / minutes / action items | Leader, Member | `/project/meetings`, `/project/meetings/:meetingId` | existing meetings pages and real meeting endpoints | Server validates organizer/participant/execution rules | ACTIVE; existing meeting tokens and 409 no-replay behavior | READY | No new meeting workflow is added in Phase 2. |
| Reports and supervisor feedback | Leader, Member | `/project/reports` | existing report pages, reviewed-report feedback read | Server validates create/update/submit/feedback | ACTIVE; existing tokens and 409 no-replay behavior | READY | Partial feedback load is visibly reported; no fabricated supervisor data. |
| Deliverables / versions | Leader, Member | `/project/deliverables` | existing deliverables pages and API | Server validates submission/version writes | ACTIVE and API errors shown by existing surfaces | READY | Overview shows API-backed deliverables only. |
| Files and evidence | Leader, Member | `/project/files` | existing files page; Member overview deep link | Server validates upload/file actions | Existing project execution guard | READY | Overview does not fabricate file counts or personal ownership. |
| Contributions | Leader, Member | `/project/contributions` | existing contributions page; Member overview deep link | Server validates contribution records | Existing project execution guard | READY | No client score, rating, or final-readiness computation. |
| Final submission / readiness | Leader, Member | `/project/final-submission` | existing final submission surface/API | Server decides allowed submit/readiness state | Existing error and conflict handling | VERIFIED_FE | The API-backed page is reused; Phase 2 does not calculate an independent readiness result. |
| Create milestone | Student with backend capability | `/project/milestones` | existing milestone creation form; proposed project execution action reader | Existing milestone endpoint remains authoritative | ACTIVE; mutation error and 409 behavior stay unchanged | VERIFIED_FE + BE_HANDOFF_REQUIRED | Capability response is required before CTA is exposed. |
| Create progress report | Student with backend capability | `/project/reports/new` | existing report creation form; proposed project execution action reader | Existing report endpoint remains authoritative | ACTIVE; mutation error and 409 behavior stay unchanged | VERIFIED_FE + BE_HANDOFF_REQUIRED | Capability response is required before CTA is exposed. |
| Schedule meeting | Student with backend capability | `/project/meetings/new` | existing schedule form; proposed project execution action reader | Existing meeting endpoint remains authoritative | ACTIVE; mutation error and 409 behavior stay unchanged | VERIFIED_FE + BE_HANDOFF_REQUIRED | Capability response is required before CTA is exposed. |
| Structural update, delete, assignment, dependency, reorder, evidence lifecycle | Existing student detail routes | task/milestone/detail/file routes | Dedicated action adapters and server guards | Server is final authority | Existing tokens/error paths | VERIFIED_FE + BE_HANDOFF_REQUIRED | Every non-allowed or undelivered action hides the CTA. No persisted team-leader/ownership fallback is permission authority. |
| Reporting cycles / policy / evaluator decision | N/A | N/A | No Phase 2 Student workspace requirement | Backend authority | N/A | FUTURE_SCOPE | Reserved for a separately authorized phase. |

## Backend contract audit

The inspected execution controllers for tasks, milestones, progress reports, meetings, deliverables, contributions, final submissions, files, and workflow context all require authorization. The execution-governance baseline states that stale or malformed concurrency tokens return `409`; the client must reload authoritative data and must not replay a stale command.

The dedicated project/task/milestone execution action feeds are proposed backend
contracts, not a delivered API: the inspected implementation is uncommitted.
Their absence or transport failure is fail-closed for every privileged CTA. No
route, leader flag, or legacy client-side condition is used as a permission
fallback. Complete structural mutation coverage remains a documented
`BE_HANDOFF_REQUIRED` gap rather than a frontend permission decision.

## Implementation notes

- `CollaborationWorkspace` uses five independently loaded existing resources. A failure in one resource remains visible while the other sections continue to render.
- The Leader mode retains the team workload panel and existing task-creation entry point. The Member mode suppresses team-wide coordination controls, scopes open work and attention to the current persisted member, and links to existing contribution/evidence routes.
- Existing detail pages retain the current token passing and `409` messaging. This Phase neither retries a stale mutation nor creates a local optimistic persistence layer.
- The application navigation remains governed by the Phase 1 workspace route registry and the existing `ACTIVE` route guard. No route, role, or global design-system contract was replaced.

## Explicit non-goals

- No backend/database/schema/controller/service change.
- No Supervisor, Department, Evaluation, Admin, reporting-cycle, or policy workspace work.
- No push, PR, merge, migration, seed, deployment, or browser mutation against shared data.

## Pre-Phase-4 closure update — 2026-10-02

The prior references to `GET /projects/{projectId}/actions` are superseded for
execution writes. The frontend now calls the dedicated project/task/milestone
execution-action routes and fails closed on a missing code, transport error, or
undelivered endpoint. The inspected backend implementation of those endpoints
is uncommitted working-tree material, so it is **not** a delivered contract.

| Capability area | FE result | Contract result | Current classification |
| --- | --- | --- | --- |
| Project create/reorder | Dedicated action client and no role fallback | Endpoint requires backend delivery/verification | `VERIFIED_FE` fail-closed + `BE_HANDOFF_REQUIRED` activation |
| Task update/delete/assignment/status/dependency | Task-specific action client gates CTA; missing action hides it | Endpoint requires backend delivery/verification | `VERIFIED_FE` fail-closed + `BE_HANDOFF_REQUIRED` activation |
| Task discipline | Read always remains server-authorized; edit requires `manage_task_disciplines`; 409 preserves draft/reloads data | Existing discipline endpoint is read/inspected; capability delivery is pending | `VERIFIED_FE` fail-closed + `BE_HANDOFF_REQUIRED` action contract |
| Evidence ledger | Read list/filter/pagination/deep links use the existing ledger endpoint; no creation or delete CTA exists without a source action | No source-aware write action is delivered | `VERIFIED_FE` read-only / `FE_COMPLETE_BE_BLOCKED` write + `BE_HANDOFF_REQUIRED` |
