# Workspace actor, route and API matrix

**Audited:** 2026-10-01
**Frontend baseline:** `c9635cb7a3814a578a839d0295f0cf644b9da003` (`origin/develop`)
**Backend baseline:** `040361c4f7c0529bbcfcddf484e923fa826d4f85` (`origin/develop`)

## Authority boundary

Identity roles are only `ADMIN`, `DEPARTMENT_STAFF`, `LECTURER`, and `STUDENT`.
`TEAM_LEADER`, `TEAM_MEMBER`, `PRIMARY_SUPERVISOR`, `DISCIPLINE_MENTOR`,
`EVALUATOR`, and `INDUSTRY_EXPERT` are project-scoped memberships or assignments;
they are never navigation roles. The API remains the authorization boundary. Route
guards and this matrix describe frontend UX only.

| Actor | Workspace | Route | FE Status | Backend API | Resource Scope | Project/Team State | Workflow Action / Permission | Gap | Priority | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| System Administrator | Platform administration | `/admin/access`, `/profile` | Direct role guard; navigation was mixed with Department links | `GET /auth/me/context` | Backend-issued `ADMIN` identity and scope | N/A | `grantedPermissions`, context actions | Admin navigation needs separation from academic governance; no global academic-review claim | P0 | PARTIAL |
| Department Staff / Head | Academic governance | `/department/portfolio`, `/department/projects/review`, `/academic/*` | Direct role guard; hard-coded sidebar list | `GET /auth/me/context`, scoped academic/project APIs | Active department from context; individual project APIs recheck scope | API-defined project/period state | `grantedPermissions`, project actions where exposed | Context is available; canonical nav metadata missing | P0 | PARTIAL |
| Student Leader | Registration and project workspace | `/team`, `/project/*`, `/projects/lifecycle` | Student routes and journey provider exist | `GET /auth/me/context`, team/project reads, `GET /teams/{id}/actions`, `GET /projects/{id}/actions` | Current team membership with `isLeader` | Journey state and backend actions | `TEAM_LEADER` membership; team/project `WorkflowActionDto` | Navigation must not turn leader membership into a global role; action loading is currently nullable | P0 | PARTIAL |
| Student Member | Project participant workspace | `/project/workspace`, `/project/tasks`, `/project/result` | Student routes and ACTIVE guard exist | Same as Student Leader | Current team membership | `ACTIVE` route guard; result visibility is server scoped | `TEAM_MEMBER` membership; project action DTOs | No distinct canonical nav/state model; CTA authority must remain action-based | P0 | PARTIAL |
| Lecturer | Lecturer home | `/supervisor/workspace`, `/supervisor/dashboard`, `/supervisor/profile` | Lecturer guard exists; sidebar labels every lecturer as GVHD | `GET /auth/me/context`, `/supervisors/assignments` | Identity `LECTURER`; no assignment implied | N/A for home | Context permissions/actions | Navigation must state Lecturer, not Primary Supervisor, absent assignment | P0 | PARTIAL |
| Primary Supervisor | Scoped project execution | `/supervisor/projects/:projectId/*` | `SupervisorExecutionRoute` separately protects direct routes | `GET /projects/{id}/supervisor-assignments`; project/action APIs | Active persisted assignment with `isPrimary` and no `endedAt` | Backend execution/project state | `PRIMARY_SUPERVISOR` assignment; API rechecks every write | Sidebar's current pathname-derived links duplicate route knowledge | P0 | PARTIAL |
| Discipline Mentor | Future scoped academic/project work | No dedicated route | No FE workspace | Assignment type can be returned by supervisor-assignment DTO; no dedicated workspace/action contract audited | Project/major assignment only | API-defined | `DISCIPLINE_MENTOR` assignment, when persisted | No supported workspace contract or direct-route surface | P1 | OUT_OF_SCOPE_MVP |
| Evaluator | Assigned evaluation work | `/evaluator/evaluations`, `/evaluator/evaluations/:evaluationId` | Lecturer identity route contains evaluator pages; sidebar reads the persisted assignment list before showing it | `/evaluation-assignments/my`, scoped evaluation APIs | Active persisted evaluator assignment/component/scope | Evaluation window, assignment and package state | `EVALUATOR` assignment; server evaluates assignment scope | Assignment-list failure remains an explicit unavailable capability, never an allow | P0 | PARTIAL |
| Industry Expert | Future external review | No route | No FE workspace | No audited assignment/API contract | Future project scope | API-defined | `INDUSTRY_EXPERT` assignment | Contract and product decision absent | P2 | OUT_OF_SCOPE_MVP |

## Contract inventory used in Phase 1

| Contract | What the frontend may use | What it must not infer |
| --- | --- | --- |
| `GET /api/v1/auth/me/context` | Identity roles, issued permissions, department/major context, selected semester, global actions | Project assignment or project write authority |
| `GET /api/v1/teams/{teamId}/actions` | Team-scoped eligibility and action allow/deny reasons | A project action or global leadership role |
| `GET /api/v1/projects/{projectId}/actions` | Project state, concurrency token, scoped action allow/deny reasons | A permission not returned by the backend |
| `GET /api/v1/projects/{projectId}/supervisor-assignments` / `GET /api/v1/supervisors/assignments` | Persisted assignment type, primary flag and end state | An evaluator or industry-expert role |
| `GET /api/v1/evaluation-assignments/my` | Read-only evaluator capability discovery for the signed-in lecturer | A global `EVALUATOR` role or evaluation mutation authority |

## Phase 1 decision

The Phase 1 registry will centralize navigation metadata and visibility predicates,
but it will not replace `RoleRoute`, `ActiveStudentProjectRoute`, or
`SupervisorExecutionRoute`. Those remain direct-route UX guards. The workspace
access model must preserve `loading`, `unavailable`, and `unknown` rather than
converting missing context to an empty team, denied permission, or a synthetic
assignment.

## Phase 1 acceptance (2026-10-01)

The Phase 0–1 workspace foundation is **READY for Phase 1 review**. It does not
mark any Phase 2+ feature as complete.

- `pnpm test`: 113 test files / 491 tests passed, 0 failed, 0 skipped, exit
  code 0 (76.68 s). Vitest 4.1.10 runs through the configured jsdom setup with
  its default worker configuration. The former apparent Windows hang was not
  reproducible: the default reporter is silent during the full run and the
  suite terminates normally after its complete workload.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `git diff --check` passed.
- The production build retains the pre-existing non-blocking Vite warning for a
  JavaScript chunk larger than 500 kB after minification.
- Browser evidence is an authenticated Admin smoke to `/admin/access`. It
  confirms navigation and role separation only; it is not a complete multi-role
  workflow or persistence E2E claim.
