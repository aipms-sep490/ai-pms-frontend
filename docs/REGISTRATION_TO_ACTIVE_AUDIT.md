# Registration-to-ACTIVE A0 Audit

**Audit date:** 2026-09-14
**Scope:** `ai-pms-frontend` and `ai-pms-backend` on local `develop`
**A0 rule:** no feature implementation, no branch creation, no push or merge. This document is the baseline freeze for A1 onward.

## Git Baseline

### Frontend

| Item | Evidence |
|---|---|
| Repository | `F:\AI-PMS\ai-pms-frontend` |
| Current branch | `develop` |
| HEAD | `fa3873884ed5419d278d5e7b5ac06d3f981e5d35` |
| `origin/develop` | `fa3873884ed5419d278d5e7b5ac06d3f981e5d35` |
| Merge base | `fa3873884ed5419d278d5e7b5ac06d3f981e5d35` |
| Incoming from `origin/develop` | None |
| Local commits not on `origin/develop` | None |
| Working tree at audit start | Clean |
| Stash | `stash@{0}` on historical branch `feature/ai-pms-fe-business-workflow`; do not apply during this flow |
| Fetch observation | New remote branch `origin/feature/fe-contract-alignment` was discovered; it does not alter `develop` baseline |
| Conflict risk | LOW while remaining on current `develop`; reassess before A1 because router, providers, HTTP client, and student-flow files are shared hotspots |

### Backend

| Item | Evidence |
|---|---|
| Repository | `F:\AI-PMS\ai-pms-backend` |
| Current branch | `develop` |
| HEAD | `4236b0ce847bd12dbbd684505771d4e72a7ea3ce` |
| `origin/develop` | `4236b0ce847bd12dbbd684505771d4e72a7ea3ce` |
| Merge base | `4236b0ce847bd12dbbd684505771d4e72a7ea3ce` |
| Incoming from `origin/develop` | None |
| Local commits not on `origin/develop` | None |
| Working tree | Clean |
| Stash | None |
| Fetch observation | Succeeds when invoking the configured GitHub CLI credential helper outside the restricted shell credential context |
| Conflict risk | LOW for this baseline; MEDIUM for any change to Project/Team/WorkflowContext contracts because they are shared across roles |

### Recommended branch/base SHA

Do not create it during A0. If and only if A0 exit conditions are accepted, create:

```text
fix/registration-to-active-flow
```

from the latest approved `origin/develop` after a fresh fetch. Record both repository SHAs again at branch creation time; do not reuse these SHAs blindly if `develop` moves.

## Architecture Map

### Frontend

| Module | Owner / stewardship evidence | Purpose | Dependencies / shared files | Risk |
|---|---|---|---|---|
| `src/app/router` | Shared; latest change by `hoanganh306` | Browser routes for Student, Department and Admin workspaces | `router/index.tsx`, `routes.config.ts`, all page modules | HIGH: central route ownership and no central protected-route wrapper yet |
| `src/app/providers` | Shared; latest change by `hoanganh306` | Provider composition | `AppProviders.tsx`, `AuthSessionProvider`, `StudentJourneyProvider` | HIGH: session and journey state can diverge |
| `src/app/context` | Student-flow ownership inferred from commits `91fb7dc` / `461b33c` by `hoanganh306` | Current student journey: profile, semester, period, team, project, actions and assignments | `StudentJourneyProvider.tsx`, `services/service-gateway.ts`, backend DTOs | HIGH: orchestrates the registration-to-ACTIVE flow |
| `src/app/layouts` | Shared | Sidebar/TopHeader/AppLayout | Router metadata and StudentJourney context | MEDIUM: navigation is cross-role shared UI |
| `src/services/http` | Shared; latest merge alignment by `hoanganh306` | Single shared HTTP transport, base URL resolution, token fallback and error handling | `env.ts`, all API adapters | CRITICAL: all FE API calls depend on it |
| `src/services/api` + `service-gateway.ts` | Student-flow ownership inferred from `7917b93` / `461b33c` | Typed REST adapters for auth, workflow, academic, topics, teams, projects and supervisors | Shared HTTP client and `src/types/backend` | HIGH: primary new flow adapter layer |
| `src/features/auth` | Shared | Login, in-memory session context, profile, legacy auth adapter and presentation policy | HTTP client; localStorage token fallback | HIGH: current session does not restore itself after reload |
| `src/features/projects` | Split ownership: Student registration changes by `hoanganh306`; Department Review changes by `Curt1s167` | Student catalogue/registration/status plus Department review/lifecycle | StudentJourney, typed APIs, legacy review API, shared router | HIGH: two role flows and two API styles coexist |
| `src/features/teams` | Student-flow ownership inferred from `461b33c` | Team management, invitations, scope and eligibility components | StudentJourney and typed team API | HIGH: core registration dependency |
| `src/features/supervisors` | Split ownership: Student Selection by `hoanganh306`; Department Monitoring by `Curt1s167` | Candidates/requests for students and directory monitoring for departments | Typed and legacy APIs | HIGH: candidate directory is not equivalent to project candidate eligibility |
| `src/features/topics` | Department ownership inferred from `5796d54` by `Curt1s167` | Department Topic catalogue management | Legacy feature API | MEDIUM: must remain separate from Student Topic browsing |
| `src/features/academic`, `users` | Department/Admin ownership inferred from prior commits | Academic structure, governance, account/RBAC/audit | Legacy feature APIs | MEDIUM: shared authoritative IDs/context but outside Student-flow ownership |
| `src/components`, `src/hooks`, `src/types` | Shared | Reusable UI, utilities and FE/backend DTOs | Most feature modules | MEDIUM |

### Backend

| Module | Owner / stewardship evidence | Purpose | Dependencies / shared files | Risk |
|---|---|---|---|---|
| `AIPMS.Api/Controllers` | Core Backend: Khai (`khaine2k4` / Nguyen Quang Khai) from latest related commits | HTTP API and authorization boundary | Application commands/queries, shared DTOs | CRITICAL |
| `AIPMS.Application/Features/Auth` | Core Backend | Login, refresh, logout and current user | Identity, current-user security context | HIGH |
| `AIPMS.Application/Features/WorkflowContext` | `ccb6ab3` by `khaine2k4` | Current user/academic context and Team/Project allowed actions | Auth claims, academic/team/project repositories | CRITICAL |
| `AIPMS.Application/Features/Topics` | `59a384d` by `khaine2k4` | ProjectTopic catalogue lifecycle | Topic repository, policy, audit | HIGH |
| `AIPMS.Application/Features/Teams` | Core Backend / hybrid changes `9885771` | Team, invitations, roster, academic scope and eligibility | Team policy, verified profiles, workflow context | CRITICAL |
| `AIPMS.Application/Features/Projects` | Core Backend / hybrid changes `9885771` | Project draft, submissions, review and history | Team eligibility, project repository, academic scope | CRITICAL |
| `AIPMS.Application/Features/Supervisors` | `b71c5a0` by `khaine2k4` | Candidate, request and assignment workflows | Supervisor capacity, project state transitions, audit | CRITICAL |
| `AIPMS.Domain` | Shared | State machine and business rules | Application workflows | CRITICAL |
| `AIPMS.Infrastructure/Persistence` | Shared | EF models/repositories/database transactions | Generated models, migrations and all feature workflows | CRITICAL |
| `tests/AIPMS.UnitTests`, `tests/AIPMS.IntegrationTests` | Shared | Unit and Testcontainers SQL integration coverage | Docker/Testcontainers for integration suite | HIGH: environment dependency |

### Shared hotspots that require explicit coordination

1. `src/app/router/index.tsx` and `src/app/providers/AppProviders.tsx`.
2. `src/services/http/http-client.ts` and `src/app/config/env.ts`.
3. `src/features/auth/context/AuthSessionProvider.tsx` and localStorage token semantics.
4. `src/app/context/StudentJourneyProvider.tsx` and all typed API adapters.
5. Backend WorkflowContext DTOs, Team/Project DTOs, Project state machine and supervisor request workflow.
6. `ProjectsController` because Student registration and Department Review use the same aggregate.

## BE Contract Matrix

All URLs below are relative to `/api/v1`; all listed controller actions require authorization unless marked otherwise.

| Capability | Actual Backend contract | Current rule/evidence | A0 status |
|---|---|---|---|
| Login / session | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` | AuthController contains login, refresh, logout and current-user handlers | DONE_TO_CURRENT_BE_CONTRACT |
| Current context | `GET /auth/me/context?academicSemesterId=` | Returns persisted/effective roles, permissions, verified organization/department/major, selected semester, periods, current team/project and action reasons | DONE_TO_CURRENT_BE_CONTRACT |
| Team actions | `GET /teams/{teamId}/actions` | Returns eligibility issues, registration state, scope concurrency token and allowed actions | DONE_TO_CURRENT_BE_CONTRACT |
| Project actions | `GET /projects/{projectId}/actions` | Returns project status, concurrency token, submission snapshot and allowed actions | DONE_TO_CURRENT_BE_CONTRACT |
| Topic catalogue | `GET /topics`, `GET /topics/{id}`, create/update/publish/close mutations | `ProjectTopic` has its own lifecycle, academic scope, requirements and concurrency token | DONE_TO_CURRENT_BE_CONTRACT |
| Student Topic discovery | Same `GET /topics` with Backend authorization/filtering | Topic integration tests describe authorized catalogue and verified-major filtering | CONTRACT_CONNECTED_UNVERIFIED: integration suite cannot start without Docker |
| Topic → Team/Project relation | No `TopicId`/`ProjectTopicId` is present in current Project or Team generated models, Project DTO, or `CreateProjectDraftRequest` | `ProjectTopic` is a separate persistence aggregate; Project stores its own majors/tags/content | BLOCKED_BY_CONTRACT_MISMATCH for any requirement to persist a Student-selected Topic on Team/Project |
| Proposal semantics | `POST /projects` creates a Project Draft from title/content/required majors/tags | No separate Student Proposal resource was found | CONTRACT_CONNECTED_UNVERIFIED; product decision required before FE treats a draft as a proposal |
| Team formation | `GET /teams/current`, `GET /teams/{id}`, `POST /teams`, `PUT /teams/{id}`, `PUT /teams/{id}/academic-scope` | Backend uses registered user and verified academic profile; Team academic scope supports `SINGLE_MAJOR` and `INTERDISCIPLINARY` | DONE_TO_CURRENT_BE_CONTRACT |
| Invitations / roster | Candidate list, invite, list, accept/reject/cancel, remove, leave, transfer leader under `/teams` | Backend owns leader/member policy and roster lock | DONE_TO_CURRENT_BE_CONTRACT |
| Eligibility | `POST /teams/{id}/eligibility/refresh` plus Team Actions | Eligibility reasons and `CanRegister` come from Backend policy | DONE_TO_CURRENT_BE_CONTRACT |
| Project draft | `POST /projects`, `GET /projects/{id}`, `PUT /projects/{id}`, `PUT /projects/{id}/majors` | Requires active Team/registration eligibility and uses concurrency token for update/major mutation | DONE_TO_CURRENT_BE_CONTRACT |
| Submit / resubmit | `POST /projects/{id}/submit`, `/resubmit`, `/start-review` | State machine: `DRAFT -> SUBMITTED -> UNDER_REVIEW`; `REVISION_REQUIRED -> SUBMITTED` | DONE_TO_CURRENT_BE_CONTRACT |
| Department review | Queue, detail, history, revision/reject/approve under `/projects` | Backend scopes review and requires concurrency token | DONE_TO_CURRENT_BE_CONTRACT |
| Participating department decision | `POST /projects/{id}/department-decisions` | Lead department cannot final-approve a hybrid submission until every participating department approves | DONE_TO_CURRENT_BE_CONTRACT |
| Supervisor candidates | `GET /projects/{projectId}/supervisor-candidates` | Project-specific eligible candidates; do not replace with generic directory | DONE_TO_CURRENT_BE_CONTRACT |
| Supervisor request | Send/list/cancel request under project and supervisor request routes | Request workflow validates project status, candidate eligibility and capacity | DONE_TO_CURRENT_BE_CONTRACT |
| Assignment / ACTIVE | Supervisor accept creates assignment and transitions `APPROVED -> SUPERVISOR_PENDING -> ACTIVE` | Project state machine and request repository persist history and assignment atomically | DONE_TO_CURRENT_BE_CONTRACT |

### Backend data and state findings

- `ProjectTopic != Project`: this separation is implemented, not merely documented.
- `Project` currently belongs to `TeamId` and owns snapshot-like title/content, project majors and tags. It has no persisted Topic relation.
- `Team` has an `AcademicSemesterId`, members/invitations and optional Team academic scope in the related hybrid model; it has no selected Topic relation.
- Student Major authorization is read from the verified user academic profile in WorkflowContext/Team workflows, not from a free-text UI field.
- Project state transitions are: `DRAFT -> SUBMITTED -> UNDER_REVIEW -> {REVISION_REQUIRED | REJECTED | APPROVED}`, then `APPROVED -> SUPERVISOR_PENDING -> ACTIVE`.
- `409` is an expected concurrency/business-rule outcome for contract mutations and must require reload/human confirmation in FE.

## FE Capability Matrix

| Capability | Existing FE surface | Integration assessment | A0 status |
|---|---|---|---|
| Login | `features/auth/pages/LoginPage.tsx`, legacy auth API and session provider | Login stores access token in localStorage and reads `/auth/me` | CONTRACT_CONNECTED_UNVERIFIED |
| Session restore/refresh/logout | `AuthSessionProvider` has in-memory session and profile refresh only | Access token may remain in localStorage, but provider does not restore session or orchestrate refresh/logout; app/session state can diverge after reload | MISSING |
| Shared transport | `services/http/http-client.ts` | One HTTP client; normalizes `/v1`, attaches explicit token or localStorage token and handles `204` as null | DONE_TO_CURRENT_BE_CONTRACT |
| Typed service layer | `services/api/*.api.ts`, `service-gateway.ts`, `types/backend` | New Student flow uses typed adapters; older Department/Admin features still use feature-local adapters over the same HTTP client | CONTRACT_CONNECTED_UNVERIFIED |
| Global workflow context | `StudentJourneyProvider` calls `/auth/me/context`, team/project actions | Provider is global and drives state/navigation, but independently loads profile/semester/team/project and is not synchronized with AuthSession lifecycle | CONTRACT_CONNECTED_UNVERIFIED |
| Router/navigation | Student routes `/team`, `/topics`, `/project/register`, `/project/edit`, `/project/status`, `/project/supervisor` exist | AppLayout has no central protected-route guard; route access remains API-failure-driven | MISSING |
| Dashboard/shell | Sidebar and StudentJourneyHero consume StudentJourney context | Improved from hardcoded identity, but provider can fall back to mock mode and fixture components remain elsewhere | CONTRACT_CONNECTED_UNVERIFIED |
| Student Topic browse | `TopicCataloguePage` + typed topic API | Reads Topic catalogue; selection UI exists | BLOCKED_BY_CONTRACT_MISMATCH for persistent selection because Backend has no TopicId linkage on Team/Project |
| Student proposal | Project registration form | Creates Project Draft through `/projects`; no independent Proposal aggregate | CONTRACT_CONNECTED_UNVERIFIED pending product/contract decision |
| Team formation | `TeamManagementPage` and team components | Covers create, scope, invitations, roster and transfer UI through typed Team adapter | CONTRACT_CONNECTED_UNVERIFIED |
| Eligibility UX | `EligibilityBanner`, Team actions/context | Backend result is presented; mock implementation also contains local calculations, so production must be verified with `isMockMode=false` | CONTRACT_CONNECTED_UNVERIFIED |
| Project draft/submit/resubmit | `ProjectRegistrationFormPage`, `ProjectReviewStatusPage`, typed project API | Actual endpoints exist in adapter and state is driven from context | CONTRACT_CONNECTED_UNVERIFIED |
| Department review | `ProjectReviewPage`, legacy review hook/adapter | Single review actions are present; participating-department decision API is not called by this adapter | MISSING for hybrid participating-department FE decision |
| Supervisor candidates/request | `SupervisorSelectionPage`, typed supervisors API | Uses project candidate and send/cancel/list endpoints | CONTRACT_CONNECTED_UNVERIFIED |
| Supervisor inbox accept/reject | No Student-flow supervisor inbox implementation found in typed API; `simulateSupervisorResponse` is mock-only | Backend supports accept/reject, FE does not yet connect it for a Supervisor user | MISSING |
| Assignment/ACTIVE rendering | StudentJourney resolves active assignment to journey state | Contract-driven read path exists; no end-to-end evidence yet | CONTRACT_CONNECTED_UNVERIFIED |
| E2E harness | `package.json` offers Vitest only | No Playwright/Cypress script found | MISSING |

### Frontend architectural findings

1. The required Page -> Hook/State -> API Adapter -> Shared HTTP Client -> Backend shape is largely present for the new typed Student journey, but legacy feature-local adapters coexist for Department/Admin modules. Do not introduce a third API layer.
2. The shared client now handles `204 No Content`, resolving the prior generic response-parse risk; tests must verify actual 204 mutations through both typed and legacy callers where retained.
3. `StudentJourneyProvider` calls live services only when `env.isMockMode` is false, but the service adapters still contain in-memory mock stores. Mock mode must be explicitly off for any production/E2E claim.
4. AuthSession holds the token in localStorage during login while Session React state remains memory-only. A reload can leave API calls token-authenticated while `AuthSessionProvider` reports anonymous. P1 must resolve this before relying on route guards or context.
5. The student-flow additions were authored recently and touch shared router/provider/HTTP code. Preserve the current owner boundary; do not broad-refactor Department flows in P1-P8.

## Requirement Traceability

| Canonical requirement | BE | FE | Gap / next phase |
|---|---|---|---|
| Authenticated session | Implemented | Login only; no restore/refresh/logout orchestration | P1 |
| Current user + verified academic context | Implemented | Context provider exists but session integration is incomplete | P2 after P1 |
| Authorization/action reasons | Implemented | Provider reads actions; no central route guard | P1/P2 |
| State-aware dashboard | Context/action contract exists | StudentJourney dashboard wiring exists | Verify after P1/P2 with live API |
| Topic catalogue | Implemented | Browse surface exists | P3 contract gate for persistence linkage |
| Topic/Proposal linkage | No persisted Project/Team Topic relation found | UI selection cannot become canonical by itself | BLOCKED_BY_CONTRACT_MISMATCH |
| SINGLE_MAJOR scope | Implemented via TeamAcademicScope | UI exists | Verify against live API in P4/P5 |
| INTERDISCIPLINARY scope | Implemented via LeadDepartment + requirements | UI exists | Verify quotas and no local authority in P4/P5 |
| Team invite/accept/roster | Implemented | UI/typed adapter exists | E2E mini-gate P4 |
| Eligibility refresh/recovery | Implemented | UI/context exists | E2E mini-gate P5 |
| Project draft/submit/resubmit | Implemented | UI/typed adapter exists | E2E mini-gate P6 |
| Department review | Implemented | Existing review UI | P7 must add participant decision UI |
| Hybrid participating decisions | Implemented | No adapter/action found | P7 |
| Supervisor candidate/request | Implemented | Student UI/typed adapter exists | Verify live P8 |
| Supervisor inbox accept/reject | Implemented | Missing | P8 |
| Assignment -> ACTIVE | Implemented atomically | Read-state only | P8/P9 |

## Owner / Conflict Map

| Area | Primary stewardship inference | Files not to alter casually | Required coordination |
|---|---|---|---|
| Student registration journey | AnhPNH / `hoanganh306` commit history | StudentJourney provider, typed services, Student Topic/Team/Registration/Supervisor Selection pages | Coordinate before changing state model, routes or service gateway |
| Department business workflows | TinVV / `Curt1s167` commit history | Department Topic Management, Project Review, Supervisor Monitoring, academic/admin legacy feature adapters | P7 must extend hybrid decision contract minimally without rewrite |
| Backend workflow/contract | Khai / `khaine2k4` and Nguyen Quang Khai commit history | Controllers, WorkflowContext, Team/Project/Supervisor workflows, persistence entities | Any P3 Topic linkage change requires Backend owner decision and migration review |
| Shared FE platform | Shared | Router, AppProviders, HTTP client, env config, backend DTO types | Changes require focused diff review and all FE gates |

## Contract Gaps

### CG-01 — Topic selection persistence

**Status:** `BLOCKED_BY_CONTRACT_MISMATCH`

Evidence: Project and Team persistence/DTO models have no `TopicId`/`ProjectTopicId`; `CreateProjectDraftRequest` has content and required majors but no topic reference. `ProjectTopic` is a separate aggregate.

Decision required before P3/P4-P6:

1. Add a persisted canonical Topic reference/snapshot to Team or Project, including migration, DTO, authorization and immutable snapshot semantics; or
2. Explicitly declare that a Student Project Draft is an independent proposal and Topic browsing is informational only; or
3. Define another backend-owned selection resource.

React state/localStorage must not be used as the source of truth for this relation.

### CG-02 — Session lifecycle mismatch

**Status:** `MISSING`

The FE stores an access token but does not restore AuthSession state or use the Backend refresh contract after reload. The new StudentJourney provider can independently call typed APIs through the localStorage token.

P1 must define a single lifecycle for bootstrap, refresh, logout and `401` recovery.

### CG-03 — Hybrid review participant action

**Status:** `MISSING`

Backend exposes `/projects/{id}/department-decisions` and blocks lead final approval until participant decisions are complete. Existing Department Review adapter has only revision/reject/approve global actions.

P7 must add the minimal participant-decision adapter, UI, status display and tests.

### CG-04 — Supervisor accept/reject Frontend

**Status:** `MISSING`

Backend has supervisor inbox and accept/reject endpoints. Student selection only sends/cancels requests; mock-only `simulateSupervisorResponse` is not a production flow.

P8 must add Supervisor inbox actions using real endpoints.

### CG-05 — Baseline integration environment

**Status:** `BLOCKED_BY_ENVIRONMENT`

Backend integration tests use Testcontainers SQL Server. Docker is not running or configured on this machine, preventing test setup. This is not evidence of a source failure, but it blocks A0 from promoting Backend integration coverage to PASS.

## Baseline Test Results

### Frontend

| Command | Result |
|---|---|
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS: 33 files, 156 tests |
| `pnpm build` | PASS; Vite reports non-blocking chunk-size warning for a 576.80 kB JS asset |
| `git diff --check` | PASS |

### Backend

| Command | Result |
|---|---|
| `dotnet test` — unit suite | PASS: 633 passed, 0 failed |
| `dotnet test` — integration suite | BLOCKED_BY_ENVIRONMENT: 67 passed, 539 failed during Testcontainers SQL startup because Docker is not running/misconfigured |
| `git diff --check` | PASS |

The Backend integration result must not be reported as PASS until Docker/Testcontainers is operational and the suite is rerun to a final exit code.

## A0 Exit Assessment

| Exit condition | Status |
|---|---|
| Git baseline known | PASS |
| Architecture map documented | PASS |
| Owner/shared-file hotspots documented | PASS |
| Core backend contract audited from controller/DTO/persistence/state-machine code | PASS |
| FE capabilities and API layers audited | PASS |
| Topic/Proposal linkage decision clear | BLOCKED_BY_CONTRACT_MISMATCH |
| Backend integration baseline green | BLOCKED_BY_ENVIRONMENT |
| A1 safe branch permitted | NOT YET — resolve/approve CG-01 and obtain a runnable Backend integration baseline |

## Recommended Next Action

Do not start A1 or implement a Student screen yet.

1. Obtain a Backend owner/product decision for **CG-01 Topic selection persistence**; record whether it requires a new persisted relation, an independent proposal model, or a clarified informational-only catalogue.
2. Start/configure Docker, rerun `dotnet test`, and update the Backend baseline from `BLOCKED_BY_ENVIRONMENT` to a definitive result.

Only after both conditions are addressed should the team create `fix/registration-to-active-flow` from a newly fetched `origin/develop`.
