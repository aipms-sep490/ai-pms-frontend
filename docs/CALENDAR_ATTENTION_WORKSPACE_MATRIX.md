# Phase 7 — Unified Calendar & Deterministic Attention Center Matrix

`/calendar` is an authenticated shared product-shell route. It introduces no
role grant, command, universal persisted Event entity, AI recommendation, risk
score, local permission engine, or notification transport. Every row is a
non-persisted projection from an API response. A deep link returns to an
already guarded domain route and never authorizes the linked resource.

| Capability | Actor | FE Route | Source Domain | Backend API | Authority Source | Projection Rule | Deep Link | Pagination Strategy | Classification | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Shared route/guard | Student, Lecturer, Department, Evaluator, Admin | `/calendar` | Auth shell | Existing `ProtectedRoute` | Session and server response | Existing authenticated parent only; no new `RoleRoute` | N/A | N/A | `VERIFIED_FE` | Registry/menu metadata is presentation-only. |
| Task deadline | Current-project Student | `/calendar` | Tasks | `GET /api/v1/dashboards/student` | Student dashboard scope | One dated row per `taskDeadlines`; attention only for returned `isOverdue` or `BLOCKED` | `/project/tasks/{id}` | Dashboard payload; no fetch-all | `VERIFIED_FE` | Detail/mutation still rechecks server scope. |
| Milestone deadline | Current-project Student | `/calendar` | Milestones | `GET /api/v1/dashboards/student` | Student dashboard scope | One DateOnly row per `milestoneDeadlines`; attention only for returned `isOverdue` | `/project/milestones/{id}` | Dashboard payload | `VERIFIED_FE` | DateOnly is not timezone-converted. |
| Meeting date | Current-project Student | `/calendar` | Meetings | `GET /api/v1/projects/{id}/meetings?page=1&pageSize=100` | Existing project read | One row per returned start/end time | `/project/meetings/{id}` | First bounded page; partial state on truncation | `VERIFIED_FE` | Failure is isolated. |
| Deliverable deadline | Current-project Student | `/calendar` | Deliverables | `GET /api/v1/projects/{id}/deliverables?page=1&pageSize=100` | Existing project read | Only a non-null `dueAt` becomes a row | `/project/deliverables` | First bounded page; partial state on truncation | `VERIFIED_FE` | No delivered detail route. |
| Final deadline | Current-project Student | `/calendar` | Final submission | `GET /api/v1/projects/{id}/final-submission/checklist` | Checklist read guard | Only a non-null `deadline` becomes a row | `/project/final-submission` | Single resource | `VERIFIED_FE` | No readiness/submit decision is made here. |
| Progress-report deadline | All | `/calendar` | Reports | Existing reports APIs | N/A | Omitted: `periodEnd` is not a submission deadline | Existing report route only if a future explicit due date exists | N/A | `BLOCKED_BY_BE` | No placeholder date. |
| Evaluation deadline | Evaluator | `/calendar` | Evaluation | `GET /api/v1/evaluation-assignments/my` | Active assignment query | Active assignment becomes Attention only; no calendar date | `/evaluator/assignments/{id}` | First page of 20; partial state on truncation | `BLOCKED_BY_BE` | `assignedAt` is not a deadline/window. |
| Supervisor attention | Server-scoped Supervisor | `/calendar` | Supervisor dashboard | `GET /api/v1/dashboards/supervisor?page=1&pageSize=20` | Dashboard scope/counts | Returned pending feedback, overdue and blocked facts link to the project | Existing supervisor project route | First bounded page | `VERIFIED_FE` | No structural mutation is exposed. |
| Mentor scope | Discipline Mentor | `/calendar` | Mentor assignment | No actor aggregate | N/A | Fail closed; no lecturer-role inference | N/A | N/A | `BLOCKED_BY_BE` | Existing `BE-AW-003` applies. |
| Department attention | Department Staff | `/calendar` | Portfolio | `GET /api/v1/dashboards/department?page=1&pageSize=20` | Department dashboard scope | Returned pending feedback count can link to portfolio; no resource date fabricated | `/department/portfolio` | First bounded page | `PARTIAL_ACCEPTABLE` | Needs range projection for dated rows. |
| Admin account attention | Admin | `/calendar` | Account security | Existing paged users API | Account security policy | Returned `INACTIVE`/`SUSPENDED` account becomes attention | `/admin/access/users/{id}` | First bounded page of 20 | `VERIFIED_FE` | No project/governance inference. |
| Cross-project range calendar | Supervisor, Mentor, Department, Evaluator, Admin | `/calendar` | Multiple domains | None | N/A | Fail closed; only independently scoped facts render | Existing guarded routes | Never fetch-all | `BLOCKED_BY_BE` | Defined in `BE-AW-011`. |

## Date and degraded-data behavior

- `YYYY-MM-DD` is DateOnly and remains that calendar date. Offsetless DateTime
  is interpreted as UTC before presentation in `Asia/Ho_Chi_Minh`.
- Completed/closed/cancelled entries can be opted into as historical Calendar
  facts, but never become ordinary Attention merely because they exist.
- A source explicitly reports `ready`, `empty`, `partial`, `unavailable`,
  `unsupported`, or `error`. A `403`, `404`, network error or truncated page
  is shown in the source-status region. Other fulfilled sources remain visible,
  and the page never claims “all caught up” while any source is
  partial/unavailable/unsupported/error.
- Attention uses presentation ordering only; it does not label “high risk”,
  decide project state, authorize action, or replace `/notifications`.
