# Backend handoff — Actor Workspace audit

**Prepared:** 2026-10-02
**Frontend boundary:** no client role, URL, `isLeader`, or assignment flag grants a
mutation. Missing action is denied in the UI and the mutation endpoint remains
the final authority.

## Handoff A — Delivered execution-action contract is required

**ID:** `BE-AW-001`
**Priority:** `BLOCKING_CONTRACT`
**Status:** `BE_HANDOFF_REQUIRED`

| Field | Required backend delivery |
| --- | --- |
| Affected actor | Student Leader, Student Member, and Primary Supervisor where the existing command permits the operation. Discipline Mentor must not inherit Primary authority. |
| Affected FE route/component | `project/tasks`, `project/milestones`, `project/reports`, `project/meetings`, `project/tasks/:taskId`, and their supervisor-scoped equivalents. |
| Existing Backend behavior | Task, milestone, report, and meeting mutations already enforce project/resource state and persisted scope. An execution-actions implementation exists only as uncommitted backend working-tree material, so it is not a delivered contract. |
| Missing contract | Commit, test, publish, and deploy `GET /api/v1/projects/{projectId}/execution-actions`, `GET /api/v1/tasks/{taskId}/execution-actions`, and `GET /api/v1/milestones/{milestoneId}/execution-actions`. |
| Proposed DTO | `{ asOfUtc, projectId, resourceId?, status, concurrencyToken?, actions: [{ code, allowed, reasons }] }`. Unknown action must be absent or `{ allowed: false }`. |
| Authoritative scope/state rules | Reuse command/repository predicates exactly. Project codes: `create_task`, `create_milestone`, `reorder_milestones`, `create_progress_report`, `schedule_meeting`. Task codes: `update_task`, `delete_task`, `assign_task`, `change_task_status`, `manage_task_dependencies`, `manage_task_disciplines`. Milestone codes: `update_milestone`, `delete_milestone`. No aggregate `manage` code. Project/resource inactive, foreign scope, ended assignment, and non-primary supervisor rules must deny deterministically. |
| Concurrency requirements | An action read changes no data, reserves no capacity, and never promises a later mutation. Every write retains its current token/`409` behavior. |
| Expected errors | `401` unauthenticated; `403` out of project or actor scope; `404` missing project/resource; `409` only at the mutation when state/token/race changes. Action reasons should be stable machine codes such as the command's actual state/scope failure, not role prose. |
| FE before delivery | Calls are attempted only through the dedicated action endpoints. Any error, missing code, or `allowed:false` hides the relevant CTA. Existing mutation endpoints are not called speculatively. |
| FE after delivery | UI renders only the exact returned codes, refreshes action state after writes, and still displays mutation `403`/`409` as final authority. |
| Acceptance scenarios | Leader permitted only where task/milestone guard permits; Member can transition only an assigned task when command permits but cannot manage plan; Primary Supervisor gets only existing scoped operations; Discipline Mentor cannot perform Primary structural operations; foreign project and archived state deny; a stale token returns `409` only from the write. |

## Handoff B — source-aware evidence write capability

**ID:** `BE-AW-002`
**Priority:** `BLOCKING_CONTRACT`
**Status:** `BE_HANDOFF_REQUIRED`

| Field | Required backend delivery |
| --- | --- |
| Affected actor | Any writer with a persisted scope for a concrete `TASK`, `DELIVERABLE`, `MEETING`, `PROGRESS_REPORT`, or `FILE` source. |
| Affected FE route/component | `ProjectEvidenceLedger`, task detail evidence panel, student project evidence route, supervisor project evidence route. |
| Existing Backend behavior | `GET /api/v1/projects/{projectId}/evidence` supports page, `sourceType`, `majorId`, and `verificationStatus`. `POST /api/v1/projects/{projectId}/evidence` validates project/source/major/scope server-side and is final authority. |
| Missing contract | A source-level action read, for example `GET /api/v1/projects/{projectId}/evidence-sources/{sourceType}/{sourceId}/actions`, returning `add_evidence` for that specific source. A task action may include `add_evidence` only if it uses exactly the same source and discipline scope guard as the POST. No project-level `add_evidence`. |
| Proposed DTO | `{ projectId, sourceType, sourceId, sourceStatus, actions: [{ code: "add_evidence", allowed, reasons }] }`. It should be valid only for a source that belongs to the requested project. |
| Authoritative scope/state rules | Source existence, source-project relationship, source state, project state, actor membership/assignment, and major scope must reuse the evidence service predicates. Mentor access must be limited to the assigned major/task discipline and must not be inferred from lecturer role. |
| Concurrency requirements | Identical submission remains backend-idempotent (`200` existing/created evidence). A different-notes duplicate remains conflict; the UI must preserve the draft and refresh the ledger. |
| Expected errors | `403` scope denied; `404` missing/foreign source without source disclosure; `409` conflicting duplicate or source/project state change; `400` invalid source/major pair. |
| FE before delivery | Ledger is fully read-only; all create/delete affordances are hidden. A source from another project is never offered as selectable evidence. |
| FE after delivery | The create form appears only after a current source action says `add_evidence: allowed`. On `200`, refresh list; on `409`, preserve draft and show conflict; on `403`/`404`, keep form data but do not retry automatically. |
| Acceptance scenarios | Task source allowed only for its actual writer; a delivery/meeting/report/file source cannot inherit task permission; cross-project source denied; same payload idempotent; changed notes conflict; `PENDING` is shown exactly as returned and never upgraded by FE. |

## Handoff C — Mentor workspace resource scope

**ID:** `BE-AW-003`
**Priority:** `BLOCKING_CONTRACT`
**Status:** `BE_HANDOFF_REQUIRED`

| Field | Required backend delivery |
| --- | --- |
| Affected actor | Lecturer with an active `DISCIPLINE_MENTOR` assignment and a non-null assigned `majorId`. |
| Affected FE route/component | Proposed `mentor/workspace` and `mentor/projects/:projectId/majors/:majorId` route guard and workspace. |
| Existing Backend behavior | Own supervisor assignments return `assignmentType`, `majorId`, and `endedAt`; assignment records distinguish `PRIMARY` and `DISCIPLINE_MENTOR`. Read authorization for each project resource is not exposed as one mentor-scoped workspace contract. |
| Missing contract | A read-only mentor context/capability endpoint, e.g. `GET /api/v1/mentor/projects/{projectId}/majors/{majorId}/workspace-context`, or equivalent source-scoped actions on the existing resource endpoints. |
| Proposed DTO | `{ projectId, majorId, assignment: { id, assignmentType, active }, readableResources: [{ code, allowed, reasons }] }`, including only task discipline, scoped evidence, progress, meetings, and follow-up resources whose existing guards permit reading. |
| Authoritative scope/state rules | Current authenticated lecturer must own an unended `DISCIPLINE_MENTOR` assignment for the exact project and major. `PRIMARY`, evaluator, ended/revoked, or foreign assignment must not satisfy this contract. Do not grant structural plan, project transition, supervisor replacement, evaluation, grading, or result publication. |
| Concurrency requirements | Assignment revocation must make the next context/resource read deny. URLs never confer access. |
| Expected errors | `401` unauthenticated; `403` actor/assignment/major mismatch; `404` missing project/major; `409` only for a resource mutation that already uses concurrency. |
| FE before delivery | The frontend may use the existing own-assignment response only to guard a read-only mentor entry by exact type/project/major. Each resource is then read from its current endpoint and fails independently; no write control appears. |
| FE after delivery | Guard fetches the persisted context for every direct route entry and refreshes it after navigation/resume; each resource failure remains isolated and the context removes unsupported resource links earlier. |
| Acceptance scenarios | Active mentor sees only assigned project/major; ended mentor is redirected; mentor is not accepted as Primary; evaluator assignment alone is denied; foreign project direct URL is denied; structural/evaluation controls never appear without a separate action. |
