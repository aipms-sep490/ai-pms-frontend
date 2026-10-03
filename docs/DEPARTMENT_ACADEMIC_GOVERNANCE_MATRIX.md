# Phase 4 — Department Academic Governance Workspace matrix

**Phase status:** `PARTIAL_ACCEPTABLE`; Department foundation is `VERIFIED_FE`,
remaining authority reads are `BE_HANDOFF_REQUIRED`, and authenticated browser
acceptance is `BLOCKED_BY_CREDENTIAL`. Backend remains read-only in this task.

| Feature | API | Supervisor/Department access | Read/Mutation | Existing FE | Implemented in Phase 4 | Backend gap | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Department route | Auth session + current workflow context | Exact `DEPARTMENT_STAFF` and Backend-confirmed active Department scope; Admin redirects to Admin home | Route guard | `RoleRoute`, `DepartmentAcademicScopeRoute` | Yes | None | Loading, unavailable and inactive scope stay distinct; role alone does not grant a project action. |
| Review queue & project review | `GET /projects/review-queue`, project review/detail/history/snapshots/actions and existing review writes | Backend determines department/project scope; detail actions come from `GET /projects/{id}/actions` | Read + existing action-gated mutation | `ProjectReviewPage` | Reused | None for current review flow | Lead/participating behavior is controlled by returned `start_review`, `request_revision`, `approve_project`, `reject_project`, `approve_department`, `reject_department`; snapshot/token and 403/409 remain intact. |
| Needs Attention | `GET /dashboards/department` | Backend scopes portfolio | Read | `PortfolioDashboardPage` | Presentation-only derived list | `BE-AW-004` optimization | Pending report, blocked and overdue values are only displayed; they never create a health state or decision. |
| Portfolio | `GET /dashboards/department` | Backend scope | Read | `PortfolioDashboardPage` | Reused via local navigation | None for list | Workspace reads its first page independently; full filter/export remains on portfolio page. |
| Project period / policy | Current workflow context periods | Backend context scope | Read | Academic context | Current period facts only | `BE-AW-005` | Policy version, allowed modes/sources, team and supervisor policy are not invented in FE. |
| Supervisor governance | Supervisor directory | Endpoint is final authority | Read | `SupervisorMonitoringPage` | Reused via local navigation | `BE-AW-005` | Availability/expertise are shown; workload, primary/mentor history and replacement rules are not inferred. |
| Evaluation governance | Project-scoped scheme/assignment APIs | Existing project/resource guard | Read only in this foundation | Existing evaluation pages | No new mutation | `BE-AW-005` | `COMMON`, `MAJOR_SPECIFIC`, `INDIVIDUAL` remain Backend concepts; no aggregate/eligible evaluator calculation. |
| Final submission / result | Project-scoped final/result APIs | Existing project/resource guard | Read only in this foundation | Existing result/final pages | No new publish CTA | `BE-AW-005` | Final readiness, result visibility and archive status require a scoped read model. |
| Archive / AI | Existing project archive and optional AI APIs | Endpoint/action authority | Read-only / advisory | Existing pages | No new mutation | `BE-AW-005` for archive aggregate | Archived project has no mutation CTA in the workspace; AI never decides governance. |

## Failure behavior

Review queue, portfolio and supervisor directory load independently and render
`loading`, `empty`, `forbidden`, `unsupported`, `unavailable`, `error`, or
`success` without crashing the remaining sections. Backend `404`/`405`/`501`
is explicitly an unsupported contract; `500`/network is unavailable and is
not translated into denied permission.
