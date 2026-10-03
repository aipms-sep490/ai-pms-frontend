# Supervisor Workspace Matrix — Phase 3A

This matrix records the frontend audit for the assigned-supervisor workspace. It does not infer any permission from `lecturer` role. Current primary assignment and `ACTIVE` project status are verified by `SupervisorExecutionRoute`; resource endpoints remain the final authorization authority.

| Feature | API | Supervisor access | Read/Mutation | Existing FE | Implemented in Phase 3A | Backend gap | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Assigned projects | `GET /supervisors/assignments`, `GET /projects/{id}` | Scoped to current supervisor by assignments endpoint; route only admits current primary assignment on ACTIVE project | Read | `useSupervisorInbox` | Yes — cards, identity, status, team, entry link; every assignment page is collected before scope is resolved | No aggregate assigned-project read model | Project lookup failures do not prevent other cards from rendering. |
| Progress | `GET /tasks/project/{id}/progress-summary`, `GET /tasks/project/{id}/overdue-blocked`, `GET /tasks/project/{id}/timeline` | Endpoint response is authoritative after route scope | Read | Gantt and student workspace | Yes — card signals and Progress area | No consolidated supervisor progress endpoint | No project-health score is calculated in client. Each card resource fails independently. |
| Tasks / milestones | `GET /projects/{id}/tasks`, `GET /projects/{id}/milestones`, related task/milestone detail endpoints | Route scope then endpoint authority | Read | Shared task/milestone pages | Yes — read navigation; structural controls fail closed for Supervisor routes | Supervisor action-capability coverage is not exposed in this FE baseline | Phase 3A introduces no task/milestone mutation. |
| Progress reports / review | `GET /projects/{id}/progress-reports`, `GET /progress-reports/{id}`, `POST /progress-reports/{id}/feedback` | Route scope then read endpoint; feedback POST is final authority and may return `403`/`409` | Read + specialized feedback only | Shared reports detail | Yes — Phase 3B progress-review hub, scoped detail links, existing feedback form | No update/replace/delete feedback endpoint; no explicit project action capability for feedback | “Đã nộp” and “Đã nhận xét” are backend report statuses, not approval decisions. POST success reloads detail; 409 refreshes authoritative data without reposting. |
| Meetings | `GET /projects/{id}/meetings`, `GET /meetings/{id}` | Route scope then endpoint authority | Read; meeting mutation endpoints exist but are not newly exposed here | Shared meeting pages | Yes — upcoming-schedule signal and read navigation; all scheduled-meeting pages are considered before selecting the nearest date | No explicit supervisor meeting action contract consumed by the foundation | The landing uses scheduled meetings returned by the API; it does not invent availability. |
| Deliverables / evidence | `GET /projects/{id}/deliverables`, deliverable versions/feedback, `GET /projects/{id}/files` | Route scope then endpoint authority | Read; mutation endpoints exist but are not newly exposed here | Shared deliverables/files pages | Yes — read navigation | No project-level capability contract is wired for supervisor mutation affordances | Evidence is a read surface in Phase 3A, not a grading workflow. |
| Contributions | `GET /projects/{id}/contributions`, `GET /projects/{id}/contributions/{userId}/evidence` | Endpoint authority | Read | `ProjectContributionsPage` | Yes — read navigation | No supervisor-specific aggregate contract | Activity data is explicitly not a grade/result. |
| Notifications / dashboard | Existing notifications and supervisor dashboard routes | Role route/endpoints govern access | Read | Existing pages | No new surface | Need a backend-scoped supervision attention feed before a unified queue can be shown | Phase 3A keeps the workspace focused on assigned project evidence. |

## Mutation audit outcome

The frontend contains task, milestone, report, meeting, deliverable, file, and contribution mutation clients. This Phase does **not** add a Supervisor mutation control because the current frontend baseline does not consume a complete project-level Supervisor capability contract for structural controls. `SupervisorExecutionRoute` therefore now fails closed for those controls instead of treating a primary assignment as blanket edit authority. Existing server endpoints remain authoritative and may return `403` or `409`; no local `role === lecturer` permission engine is introduced.

The Phase 3A workspace adds only links to established resource routes. It deliberately excludes academic approval, grading/rubrics, final results, department governance, role administration, and AI decision workflows.

## Phase 3B progress-review mapping

| Progress feature | API | Read/mutation | Backend authority | FE behavior | Gap |
| --- | --- | --- | --- | --- | --- |
| Overall progress | `GET /tasks/project/{id}/progress-summary` | Read | Response supplies counts and percentage | Displays returned values only; independent failure state | No combined supervisor progress endpoint |
| Task attention | `GET /tasks/project/{id}/overdue-blocked` | Read | Response supplies overdue/blocked task collections | Presentation-only count; never controls authorization | No backend attention queue |
| Period report list | `GET /projects/{id}/progress-reports` | Read | Endpoint and route scope | Responsive cards show the first response page; status breakdown is explicitly labelled as current-page data, while total is API `totalCount` | No report-to-task/milestone/evidence references in current DTO |
| Report detail / existing feedback | `GET /progress-reports/{id}` | Read | Detail must belong to scoped project | Renders content and prior feedback; 403/404/409 messages use shared authoritative error handling | No full report review queue contract |
| Send feedback | `POST /progress-reports/{id}/feedback` | Mutation | Backend confirms or denies; current UI restricts form to `SUBMITTED`/`REVIEWED` report states and never treats it as approval | No optimistic success; clears text only after POST success and reloads detail; retains text on 403/409 | No update/replace/delete feedback API |

## Phase 3C operational-workspace mapping

Phase 3C was audited against the frontend route/API clients and Backend
`develop` at `c23eeef69fef242acfcbf3d76aea98efd4eb6298`. The workspace is
assignment-scoped by `SupervisorExecutionRoute` (ACTIVE project, current
primary assignment, no `endedAt`); it does not treat the Lecturer role itself
as a command grant.

| Feature | API | Supervisor access | Read/Mutation | Existing FE | Implemented in Phase 3C | Backend gap | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Operational overview | Project response plus independently settled resources below | Assignment route, then each endpoint | Read | Supervisor workspace | Yes — project/team/status, current milestone, deliverable count and isolated loading/error states | No consolidated supervision cockpit response | A failed resource never hides project context or the other ready resources. |
| Attention: reports / tasks | `GET /projects/{id}/progress-reports?status=SUBMITTED`, `GET /tasks/project/{id}/overdue-blocked` | Route scope then endpoint authority | Read | Phase 3B progress hook | Yes — links to submitted reports and derived overdue/blocked counts | No server-side cross-resource attention queue | Counts are presentation only; they do not authorize a command or create a health state. |
| Attention: meetings | `GET /projects/{id}/meetings?status=SCHEDULED` | Route scope then endpoint authority | Read | Meeting list/detail | Yes — nearest scheduled meeting deep-link after all pages are read | No cross-meeting recent-feedback/action-item aggregate | The overview links users to individual meeting detail rather than inventing a queue. |
| Meeting detail governance | Meeting detail, notes, participants, feedback, decisions and action-item endpoint families | Active assigned supervisor is rechecked by server command guards | Read + verified specialized mutation | `MeetingDetailPage`, `MeetingGovernancePanel` | Yes — assignment-scoped supervisor can reach established notes/feedback/decisions/action-items controls | No project-level action feed for this resource family | Sole Phase 3C mutation exception; server rechecks scope, state and token. |
| Deliverables / files / evidence | `GET /projects/{id}/deliverables`, versions/feedback, `GET /projects/{id}/files` | Route scope then endpoint authority | Read | Shared resource routes | Yes — workspace entry plus deliverable count | No verified complete Supervisor lifecycle capability matrix | No new create/update/delete/review CTA. |
| Contributions | `GET /projects/{id}/contributions`, evidence endpoint | Route scope then endpoint authority | Read | Shared contributions page | Yes — entry point retained | No aggregate supervision insight model | No grade, ranking or snapshot mutation. |
| Final submission | `GET /projects/{id}/final-submission/checklist`, locked package/read endpoints | Route scope and endpoint authority | Read | `FinalSubmissionViewerPage` | Yes — guarded Supervisor route and checklist/blocker signal | No Supervisor final-submission command contract is consumed | Facts/blockers only; no readiness decision or submit control. |
| Risk / AI | Existing project progress-analysis endpoint, only with `VITE_AI_ADVISORY_ENABLED` | Endpoint authority | Advisory read | `ProjectProgressAnalysisPanel` | Yes — compact advisory panel behind existing flag | No action/capability may derive from AI | AI does not decide risk, approval, state or permission. |
| Evaluation | `GET /evaluation-assignments/my` | Exact returned assignment for this project | Read entry only | Evaluator assignment page | Yes — entry appears only after matching active assignment response | No supervisor-wide evaluation command contract | Assignment is not treated as grading authority in cockpit. |

### Phase 3C mutation boundary

The established meeting-governance flows are preserved because their Backend
commands explicitly support an active assigned Supervisor and recheck project
and resource state. Phase 3C does **not** expose task/milestone structural
mutation, deliverable/file lifecycle mutation, contribution snapshot,
final-submission, evaluation, academic approval, grading, or AI-decision
controls. Those remain fail-closed until a matching server contract is audited
and consumed.

## Pre-Phase-4 closure update — evidence and discipline

`/supervisor/projects/:projectId/evidence` now reuses the ledger's real
paginated read endpoint, with source, major ID, and verification-status
filters plus safe source deep links. It has no local create/delete operation.
Task discipline remains visible through the shared Task detail and becomes
editable only if a task-specific backend action permits it. A Primary
Supervisor assignment continues to grant route entry only, never blanket
structural or evidence authority.

| Feature | Current FE result | Backend handoff state |
| --- | --- | --- |
| Evidence ledger read | `VERIFIED_FE` for loading/error/empty/403, filters, pagination and deep links | Existing read endpoint; browser role acceptance remains `BLOCKED_BY_CREDENTIAL` |
| Evidence create/delete | Hidden/fail-closed | `FE_COMPLETE_BE_BLOCKED` + `BE_HANDOFF_REQUIRED`: source-aware action contract required |
| Task discipline write | Hidden unless task action explicitly allows | `VERIFIED_FE` fail-closed + `BE_HANDOFF_REQUIRED`: delivered task action contract required |
