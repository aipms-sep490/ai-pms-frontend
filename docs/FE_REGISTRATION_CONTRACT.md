# Frontend Registration-to-ACTIVE Contract Freeze (F0)

**Branch/base:** `feature/fe-registration-to-active` from `fa3873884ed5419d278d5e7b5ac06d3f981e5d35`.

This is a frontend contract and architecture freeze. It records the current backend and
frontend evidence; `PROPOSED — NOT IMPLEMENTED` never denotes an existing API.

## Current-flow dependency map

```text
LoginPage -> AuthSessionProvider -> localStorage token + /auth/me
AppProviders -> AuthSessionProvider -> StudentJourneyProvider -> RouterProvider
StudentJourneyProvider -> service-gateway -> typed api/*.api.ts -> http-client -> Backend
AppLayout -> Sidebar / TopHeader -> StudentJourney context + route metadata
TopicCataloguePage -> /topics -> ?topicId query only -> ProjectRegistrationFormPage
TeamManagementPage -> teams API -> eligibility/actions from Backend
ProjectRegistration/Status -> projects API + workflow actions -> Backend
Department ProjectReviewPage -> feature-local adapter -> same http-client -> Backend
SupervisorSelectionPage -> project-specific candidates/requests -> Backend
```

There is one shared transport, `src/services/http/http-client.ts`; it supplies bearer tokens
and treats HTTP 204 as `null`. Typed Student Journey services are assembled in
`src/services/service-gateway.ts`. Department/Admin feature-local adapters also use that same
transport. F0 authorizes neither another client nor another global workflow provider.

## Ownership and change protection

| Area | Current files | Current responsibility | Primary owner/stewardship | Shared? | Expected F1-F9 impact | Conflict risk |
| --- | --- | --- | --- | --- | --- | --- |
| Auth/session | `features/auth/**`, `services/api/auth.api.ts` | Login, memory session, token storage | hoanganh306; shared auth | Yes | F1 | HIGH |
| Router/layout | `app/router/**`, `app/layouts/**` | Destinations, shell, navigation | Shared; current integration by hoanganh306 | Yes | F1-F2, F9 | HIGH |
| Providers/context | `app/providers/**`, `app/context/**` | Provider composition and student journey loading | hoanganh306 | Yes | F1-F2, F4-F9 | HIGH |
| HTTP/API gateway | `services/http/**`, `services/service-gateway.ts`, `services/api/**` | Shared transport and typed Student adapters | hoanganh306; shared | Yes | F1-F9 | CRITICAL |
| Student registration | `features/projects/pages/TopicCataloguePage.tsx`, `ProjectRegistrationFormPage.tsx`, `ProjectReviewStatusPage.tsx` | Browse, draft, status/revision presentation | AnhPNH / hoanganh306 | No | F3, F6-F7 | HIGH |
| Team/eligibility | `features/teams/**` | Team, scope, roster, invitations, eligibility presentation | AnhPNH / hoanganh306 | No | F4-F5 | HIGH |
| Student supervisor selection | `features/supervisors/pages/SupervisorSelectionPage.tsx` | Candidate/request/cancel presentation | AnhPNH / hoanganh306 | No | F8 | HIGH |
| Department review | `features/projects/pages/ProjectReviewPage.tsx`, `hooks/useProjectReview.ts`, `api/project-review-api.ts` | Scoped review decisions | TinVV / Curt1s167 | No | F7 only | HIGH |
| Department topics/supervisors | `features/topics/**`, department supervisor pages | Catalogue governance and monitoring | TinVV / Curt1s167 | No | None expected | MEDIUM |
| Shared DTOs | `types/backend/**`, `types/api.types.ts` | Backend-shaped contracts | Shared | Yes | F1-F9 additive only | HIGH |

## Contract conventions

All current API paths are relative to `/api/v1`, require a bearer token unless explicitly
public, and use backend authorization/resource scope as the authority. Shared error mapping is:
`400/422` validation/business input; `401` session/authentication; `403` permission/scope;
`404` absent/not visible; `409` stale state/concurrency; `5xx` system; network connection.
For any state decision, `409` means reload authoritative data, show the conflict, and wait for
an explicit human retry—never auto-retry.

### Authentication and context

| Capability | Status | Consumer / actor | Current FE / BE | Expected method and route | Request / response | Authorization, scope, precondition | Success / errors / concurrency | Mock allowed / production fallback | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Authentication login | BE_AVAILABLE | LoginPage / anonymous | `auth.api.login`; AuthController exists | `POST /auth/login` | email/password -> token/session | Valid active account | token; 400,401,403,5xx | Explicit mock only; show error | FE stores token and then reads current user. |
| Authentication refresh | BE_AVAILABLE | F1 session / authenticated | `AuthSessionProvider` and shared HTTP bridge now orchestrate it | `POST /auth/refresh` | refresh-token contract -> refreshed session | Valid refresh token | session; 401/403/5xx | No silent mock in production | Concurrent 401s share one refresh and retry once. |
| Authentication logout | BE_AVAILABLE | F1 session / authenticated | Provider calls BE then clears local state | `POST /auth/logout` | refresh token -> 204 | Authenticated session | 204 success; local cleanup even on failure | No silent mock in production | Protected route redirects after session clears. |
| Current user | BE_AVAILABLE | Auth/session / authenticated | `getMe`, profile loader | `GET /auth/me`; `GET /users/me/profile` | none -> user/profile | Current token | user; 401/403/5xx | Explicit mock only | Profile is loaded separately today. |
| Workflow context | BE_AVAILABLE | StudentJourneyProvider / authenticated | `workflow.api.getCurrentContext` | `GET /auth/me/context?academicSemesterId=` | optional semester -> user, academic, periods, team, actions | Backend-derived identity/scope | context; 401/403/404/5xx | Mock is disabled for this request in API mode | Current provider also makes separate calls; F2 reconciles without a parallel provider. |
| Team actions | BE_AVAILABLE | Team/project pages / authorized team actor | typed workflow API | `GET /teams/{teamId}/actions` | none -> eligibility/actions/token | Team visibility | actions; 401/403/404 | No fabricated action | `allowed` and reasons override UI assumptions. |
| Project actions | BE_AVAILABLE | Project/review pages / authorized actor | typed workflow API | `GET /projects/{projectId}/actions` | none -> state/actions/token | Project visibility | actions; 401/403/404/409 | No fabricated action | Use latest returned concurrency token. |

### Registration source and topic

| Capability | Status | Consumer / actor | Current FE / BE | Expected method and route | Request / response | Authorization, scope, precondition | Success / errors / concurrency | Mock allowed / production fallback | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Topic list | BE_AVAILABLE | Topic catalogue / Student | `topics.api.getTopicCatalogue`; TopicsController | `GET /topics` | filters -> paged `TopicDto` | Backend catalogue visibility | list; 401/403/5xx | Explicit mock adapter only | FE currently asks `PUBLISHED`, but also performs a presentation-only major filter. |
| Topic detail | BE_AVAILABLE | Catalogue/form prefill / Student | `getTopicById`; TopicsController | `GET /topics/{id}` | id -> `TopicDto` | Backend topic visibility | detail; 401/403/404 | Explicit mock adapter only | Detail does not select a source. |
| Registration Source read | BE_NEW_CONTRACT_REQUIRED | F3 / Student, Department review | No FE type/adapter; no BE aggregate | **PROPOSED — NOT IMPLEMENTED** `GET /teams/{teamId}/registration-source` | none -> `RegistrationSource` | Team member, period and organization scope | source; 401/403/404/409 | Explicit development mock only | Must follow ADR-REG-001. |
| Select Project Topic source | BE_NEW_CONTRACT_REQUIRED | F3 / Team leader | Current `?topicId=` is browser navigation only; no BE persistence | **PROPOSED — NOT IMPLEMENTED** `PUT /teams/{teamId}/registration-source` | source type/topic ID/token -> source | Leader; published/in-period/visible Topic; no locked source | source; 400/403/404/409/422 | Explicit development mock only | Never use React/query/localStorage as authority. |
| Create Student Proposal source | BE_NEW_CONTRACT_REQUIRED | F3 / Student | No separate proposal resource exists | **PROPOSED — NOT IMPLEMENTED** owner-approved route | validated proposal -> source | Product-defined proposer/period/scope | source; validation/403/409 | Explicit development mock only | Proposal approval lifecycle remains undecided. |
| Change source | BE_NEW_CONTRACT_REQUIRED | F3 / Team leader | No BE source/change state | **PROPOSED — NOT IMPLEMENTED** `PUT /teams/{teamId}/registration-source` | source + concurrency token -> source | Only before backend lock; recalculates eligibility | source; 409 stale/locked | Explicit development mock only | Changes invalidate eligibility. |
| Source status | BE_NEW_CONTRACT_REQUIRED | F3/F6 / authorized viewers | No source state/DTO | **PROPOSED — NOT IMPLEMENTED**, part of source read | none -> status/issues/lock | Backend scope | source status; 403/404 | Explicit development mock only | Do not invent approval states. |

### Team, roster, and eligibility

| Capability | Status | Consumer / actor | Current FE / BE | Expected method and route | Request / response | Authorization, scope, precondition | Success / errors / concurrency | Mock allowed / production fallback | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Team current/detail | BE_AVAILABLE | StudentJourney/Team / Student | typed team API; TeamsController | `GET /teams/current`, `GET /teams/{id}` | semester/id -> `TeamDto` | Backend team membership/visibility | team or 204/null; 401/403/404 | Explicit mock only | Current Team uses semester query. |
| Create/update Team | BE_AVAILABLE | Team page / Student leader | typed API | `POST /teams`, `PUT /teams/{id}` | team fields/scope -> Team | Verified profile, period/team rules | team; 400/403/409/422 | Explicit mock only | Source requirement is a later contract gate. |
| Team academic scope | BE_AVAILABLE | Scope panel / Team leader | `setAcademicScope` | `PUT /teams/{id}/academic-scope` | mode/major requirements/token -> Team | Backend leader/roster policy | team; 403/409/422 | Explicit mock only | Source must later dominate this scope. |
| Invitation candidates | BE_AVAILABLE | Team page / Team leader | typed API | `GET /teams/{id}/invitation-candidates` | search/paging -> candidates | Backend candidate scope | list; 403/404 | Explicit mock only | Verified profile is authoritative. |
| Invite/list invitations | BE_AVAILABLE | Team page / leader/member | typed API | `POST /teams/{id}/invitations`; `GET /teams/invitations` | invite body/filter -> invitation/page | Leader/member scope | invitation; 403/409/422 | Explicit mock only | No FE member eligibility authority. |
| Accept/reject/cancel | BE_AVAILABLE | Invitation panel / invited user or leader | typed API | `POST /teams/invitations/{id}/accept|reject|cancel` | none -> Team/204 | Invitation state/actor | Team/204; 403/404/409 | Explicit mock only | 204 is handled by shared client. |
| Remove/leave/transfer leader | BE_AVAILABLE | Team page / scoped actor | typed API | `DELETE /teams/{id}/members/{userId}`; `POST /leave`; `POST /leader` | ID/body -> 204/Team | Roster lock/leader rules | response; 403/404/409 | Explicit mock only | Refresh authoritative team/actions after mutation. |
| Eligibility refresh | BE_AVAILABLE | Eligibility banner / Team member | typed API | `POST /teams/{id}/eligibility/refresh` | none -> Team | Team visible; backend rules | Team/reasons; 403/409/422 | Explicit mock only | Current mock calculates locally; production must not. |
| Eligibility reasons | BE_AVAILABLE | Team/dashboard / Team member | `TeamEligibilityDto`, team actions | Team/current/actions routes | none -> `canRegister`, reasons | Backend team scope/roster | reasons; 403/404 | Explicit mock only | F5 represents, never decides, PASS/FAIL. |

### Project, review, and lifecycle

| Capability | Status | Consumer / actor | Current FE / BE | Expected method and route | Request / response | Authorization, scope, precondition | Success / errors / concurrency | Mock allowed / production fallback | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Project create/detail/update | BE_AVAILABLE | Registration form / Team leader | typed project API; ProjectsController | `POST /projects`; `GET/PUT /projects/{id}` | draft fields/token -> Project | Eligible active team, leader, window | Project; 400/403/404/409/422 | Explicit mock only | Current create has no source field. |
| Project majors/scope | BE_AVAILABLE | Registration form / leader | `setMajors`; Team scope separately | `PUT /projects/{id}/majors` | IDs/token -> Project | Backend project/team scope | Project; 403/409/422 | Explicit mock only | FE must not weaken source/team requirements. |
| Submit/resubmit | BE_AVAILABLE | Registration/status / leader | typed project API | `POST /projects/{id}/submit|resubmit` | concurrency token -> Project | Backend state/action/eligibility | Project; 403/409/422 | Explicit mock only | No automatic 409 retry. |
| Lifecycle/history | BE_AVAILABLE | Status/review / authorized viewer | typed API and review adapter | `GET /projects/lifecycle`, `GET /projects/{id}/history` | none -> states/history | Project visibility | data; 403/404 | Explicit mock only | Backend project state is canonical. |
| Review queue/academic review | BE_AVAILABLE | Department / Department staff | feature-local review adapter | `GET /projects/review-queue`, `GET /projects/{id}/academic-review` | search/id -> queue/detail | Backend department scope | data; 401/403/404 | No production mock | Preserve TinVV adapter until coordinated. |
| Start review/revision/reject/approve | BE_AVAILABLE | Department review / authorized staff | review adapter | `POST /projects/{id}/start-review|revision|reject|approve` | token/reason -> Project | Backend action and state | Project; 403/409/422 | No production mock | 409 reload then human re-confirms. |
| Participating Department decision | BE_AVAILABLE | F7 / participating Department | Backend route exists; current FE adapter absent | `POST /projects/{id}/department-decisions` | snapshot/token/decision -> academic review | Participating department scope | decision; 403/409/422 | No production mock | F7 is additive to TinVV review. |

### Supervisor and ACTIVE

| Capability | Status | Consumer / actor | Current FE / BE | Expected method and route | Request / response | Authorization, scope, precondition | Success / errors / concurrency | Mock allowed / production fallback | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Supervisor directory | BE_AVAILABLE | Department monitoring / Department | Department adapter; SupervisorsController | `GET /supervisors` | filters -> paged profiles | Backend scope | list; 401/403 | No production mock | Not a substitute for project candidates. |
| Project supervisor candidates | BE_AVAILABLE | Student leader / approved Project | typed supervisors API | `GET /projects/{id}/supervisor-candidates` | filters -> candidates | Backend project/state/capacity | list; 403/404/409 | Explicit mock only | Do not derive from directory. |
| Send/list/cancel request | BE_AVAILABLE | Student leader / approved Project | typed supervisors API | `POST/GET /projects/{id}/supervisor-requests`; `POST /supervisor-requests/{id}/cancel` | profile/message/filter -> request/page | Backend candidate/project request rules | request; 403/409/422 | Explicit mock only | Refresh project/actions/requests after mutation. |
| Supervisor inbox | BE_AVAILABLE | F8 Supervisor / Lecturer | BE route exists; typed FE adapter/page absent | `GET /supervisors/requests` | filters -> requests | Backend supervisor identity | page; 401/403 | No production mock | F8 must add adapter/UI. |
| Supervisor accept/reject | BE_AVAILABLE | F8 Supervisor / Lecturer | BE routes exist; mock-only FE simulation | `POST /supervisor-requests/{id}/accept|reject` | response/token if contract requires -> request | Pending request owned by supervisor | request; 403/404/409/422 | Explicit development mock only | Never simulate in production. |
| Assignments | BE_AVAILABLE | Student/Supervisor / scoped actor | typed project assignment read; BE also supervisor read | `GET /projects/{id}/supervisor-assignments`; `GET /supervisors/assignments` | filters -> page | Backend scope | page; 403/404 | Explicit mock only | Assignment is backend-persisted evidence. |
| Project ACTIVE state | BE_AVAILABLE | F9 / all authorized actors | Provider interprets Project status/assignment | Project/actions/assignment routes | none -> authoritative state | Backend accept transaction | ACTIVE; 403/404/409 | No fabricated success | Accept creates assignment and transitions project. |

## Domain type freeze

| Required conceptual type | Current mapping | Freeze decision |
| --- | --- | --- |
| `AuthenticatedSession` | `LoginSession`, `AuthUser`, `LoginResponseDto` | **EXISTING TYPE -> EXTEND** for restore/expiry/refresh semantics; do not duplicate tokens. |
| `WorkflowContext`, `AllowedAction`, `ActionReason` | `UserWorkflowContextDto`, `WorkflowActionDto` | **EXISTING TYPE -> REUSE**. |
| `AcademicScope`, `SingleMajorScope`, `InterdisciplinaryScope`, `MajorRequirement` | `TeamAcademicScopeDto`, `MajorRequirementDto`, `TopicMajorRequirementDto` | **EXISTING TYPE -> EXTEND** with discriminated presentation aliases only if needed. |
| `TeamSummary`, `TeamMember`, `TeamInvitation`, `EligibilityResult`, `EligibilityIssue` | `TeamDto`, `TeamMemberDto`, `TeamInvitationDto`, `TeamEligibilityDto` | **EXISTING TYPE -> REUSE**. |
| `ProjectSummary`, `ProjectDetail`, `ProjectActions`, `DepartmentDecision` | `ProjectSummaryDto`, `ProjectDto`, `ProjectWorkflowActionsDto`; review adapter types | **EXISTING TYPE -> EXTEND** DepartmentDecision only in a shared additive backend-shaped type. |
| `SupervisorCandidate`, `SupervisorRequest`, `SupervisorAssignment` | corresponding `*Dto` types | **EXISTING TYPE -> REUSE**. |
| Problem-details mapping | `HttpError`, `ApiProblem` | **EXISTING TYPE -> EXTEND** with a central classification helper in F1 only if required. |
| `RegistrationSourceType`, `RegistrationSource`, `ProjectTopicSource`, `StudentProposalSource` | None | **MISSING TYPE -> PROPOSE** only after accepted BE contract. Type values: `PROJECT_TOPIC`, `STUDENT_PROPOSAL`. |

Proposed Registration Source shape is conceptual only: stable ID, `type`, status/lock state,
selection validity/issues, selection time/version, `academicScope`, and a discriminated Topic
reference or validated proposal payload. It must expose governed data read-only after backend
lock. Do not add it to runtime types before the backend contract is accepted.

## Real versus mock boundary

The existing configuration is `VITE_DATA_MODE`; `env.isMockMode` is true only when its explicit
value is `mock`. This is the approved mechanism—no new environment system is needed.

```text
Page -> state/hook -> service interface -> real API adapter OR explicit mock adapter
```

Development with `VITE_DATA_MODE=mock` may use the existing in-memory fixtures solely as a
clearly labelled development adapter. API failures must never fall back to mock. Production
uses API mode; an unavailable required contract renders an explicit unavailable/error state and
does not fabricate source selection, approval, eligibility, review, supervisor acceptance, or
ACTIVE success.

## Source -> Team -> Eligibility dependency

```text
Registration Source (future backend aggregate)
  -> governed Academic Scope
  -> Team and roster
  -> Eligibility refresh/reasons
  -> Project draft and immutable provenance
```

Team and Project must never weaken source requirements. Roster or governed scope changes make
eligibility stale; FE displays that state and refetches. Backend enforcement is required before
source selection can be called complete.

## Role experience freeze

| Role | Visible information | Navigation/primary actions | Read-only and forbidden actions |
| --- | --- | --- | --- |
| Student Leader | Verified profile, context, source, scope, roster, eligibility, project, feedback, candidates/requests | Source/team/draft/submit/resubmit/request actions only when Backend allows | Cannot approve review, override eligibility, or accept supervisor requests. |
| Student Member | Invitation, roster, scope, project status | Invitation response/leave only when allowed | Cannot lead team, submit, or request supervisor unless Backend actions say otherwise. |
| Department Staff/Head | Scoped topics, review queue/evidence/history, department decisions | Review and participating decisions only in Backend scope | Cannot treat Admin authority as academic decision authority. |
| Supervisor/Lecturer | Profile, inbox, assigned projects | Accept/reject own pending requests; workspace only after assignment | Cannot use generic directory to self-assign. |
| System Admin | Academic structure, RBAC, governance, audit | Platform administration | No implicit authority to act for a Department or Supervisor. |

## Route plan

| Current route | F0 decision | Target purpose | Role | Journey state | Owner | Phase |
| --- | --- | --- | --- | --- | --- | --- |
| `/login` | KEEP, modify later | Login/session boundary | all | ANONYMOUS | Shared | F1 |
| `/project/workspace` | KEEP, modify later | State-aware dashboard/workspace | scoped user | context onward | Shared | F2/F9 |
| `/topics` | KEEP, modify later | Topic browse/source entry | Student | NO_REGISTRATION_SOURCE | AnhPNH | F3 |
| none | NEW REQUIRED later | Proposal source entry | Student | NO_REGISTRATION_SOURCE | AnhPNH | F3 |
| `/team`, `/team/create` | KEEP, modify later | Team/roster/scope | Student | NO_TEAM through eligibility | AnhPNH | F4-F5 |
| `/project/register`, `/project/edit` | KEEP, modify later | Draft/edit from governed source | Student Leader | ELIGIBILITY_PASSED/DRAFT | AnhPNH | F6 |
| `/project/status` | KEEP, modify later | State/history/revision feedback | Student | submitted through approved | AnhPNH | F6-F8 |
| `/department/projects/review/:id` | KEEP, modify later | Department review/detail | Department | submitted/review | TinVV | F7 |
| `/project/supervisor` | KEEP, modify later | Candidate/request tracking | Student Leader | PROJECT_APPROVED | AnhPNH | F8 |
| none | NEW REQUIRED later | Supervisor inbox | Supervisor | request pending | Shared with AnhPNH | F8 |
| `/supervisor/workspace` | MODIFY later | Assigned project workspace | Supervisor | PROJECT_ACTIVE | Shared | F9 |
| `/department/topics`, `/department/supervisors` | KEEP | Department workflows outside Student source selection | Department | independent | TinVV | none |

No working route is renamed or deprecated in F0.

## F1-F9 file-impact plan

| Phase | Expected modules | Classification | Risk |
| --- | --- | --- | --- |
| F1 Auth/session/protected routes | auth context/API/types, router, providers, HTTP error handling, auth tests | OWNED + SHARED | HIGH |
| F2 Workflow/navigation/dashboard | StudentJourney context, overview/sidebar/top header, workflow API/types | OWNED + SHARED | HIGH |
| F3 Registration Source | new source adapter/types/pages or existing topic form extension, ADR contract tests | OWNED; router/types SHARED | HIGH |
| F4 Team | teams pages/components/API tests | OWNED | MEDIUM |
| F5 Eligibility | eligibility banner, journey invalidation, team/workflow tests | OWNED + SHARED context | HIGH |
| F6 Project registration | registration form, projects API/types/tests | OWNED; types/context SHARED | HIGH |
| F7 Revision/hybrid review | Student status plus TinVV review adapter/page and new decision contract | OTHER_OWNER for Department review | HIGH |
| F8 Supervisor selection/inbox | typed supervisor adapter, Student selection, new Supervisor inbox route/page | OWNED + SHARED router/types | HIGH |
| F9 ACTIVE handoff | workflow resolver, workspace routing, role-aware shell | SHARED | HIGH |

No phase may broad-refactor Department Topic Management, Department Supervisor Monitoring, or
unrelated lifecycle modules merely to obtain reuse.
