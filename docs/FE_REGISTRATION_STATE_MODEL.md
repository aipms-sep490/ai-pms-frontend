# Registration-to-ACTIVE Frontend State Model (F0)

## Principles

These are frontend journey interpretations, not a second persistent Project state enum.
Backend Project status, workflow actions/reasons, team eligibility, resource scope, and
concurrency tokens override all frontend assumptions. `409` is a human-reconciliation state:
reload authoritative data, show conflict, and require an explicit next attempt.

F1 implements the session subset: startup begins at `restoring`; `/auth/me` validates stored
credentials; a 401 performs one shared refresh attempt; and protected routes render no app
shell until status is `authenticated`.

## State catalogue

| State | Backend evidence required | Visible information | Primary CTA | Secondary CTA | Forbidden actions | Next states | Error/recovery |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ANONYMOUS | No valid session | Login explanation | Sign in | Support/help | App workspace mutations | AUTHENTICATING | 401 stays here |
| AUTHENTICATING | Login pending | Submitted credentials/loading | None | Cancel/back | Duplicate submit | AUTHENTICATED, ANONYMOUS | 400/401/403 display auth result |
| SESSION_RESTORING | Stored credential being verified | Neutral loading; no authenticated shell | None | None | Protected UI/actions | AUTHENTICATED, ANONYMOUS | F1 must define refresh/expiry behavior |
| AUTHENTICATED | `/auth/me` and session accepted | Identity/session status | Continue to context | Sign out | Role-only privileged actions | NO_ACADEMIC_CONTEXT, ACADEMIC_CONTEXT_READY | 401 returns ANONYMOUS |
| NO_ACADEMIC_CONTEXT | Context lacks active valid academic scope | Context issues | Resolve/choose context when BE permits | Refresh | Team/project/source mutation | ACADEMIC_CONTEXT_READY | 403/validation/error shown faithfully |
| ACADEMIC_CONTEXT_READY | Workflow context has usable scoped semester/period/profile | Organization, department, major, period, actions | Next action resolver | Refresh context | Actions not allowed by context | NO_REGISTRATION_SOURCE or existing-team/project state | Reload on 409-context change |
| NO_REGISTRATION_SOURCE | Future source read says none; until contract exists explicit unavailable in production | Source requirement and contract-unavailable state | Choose Topic / Start Proposal when contract exists | Browse Topics | Team/project-source claims | SOURCE_SELECTED | Missing API is explicit unavailable, not mock fallback |
| SOURCE_SELECTED | Future backend source is valid/unlocked | Type, governed scope, validity/issues | Create/continue team | Change source if Backend allows | Edit locked governed fields | NO_TEAM, TEAM_FORMING | 409 reload source/team |
| NO_TEAM | Context/source has no current team | Team/invitation summary | Create team or review invitation | Refresh | Project creation | TEAM_FORMING | 403/409 visible |
| TEAM_FORMING | Team/roster exists but backend `canRegister` or Team actions says not registerable | Roster, verified major ID, scope, backend reason codes | Complete roster/scope | Explicit refresh when `refresh_eligibility` is allowed | Draft/submit | ELIGIBILITY_CHECKING, ELIGIBILITY_FAILED, ELIGIBILITY_PASSED | Team mutation refetches Team/actions; it does not run an extra eligibility command automatically. |
| ELIGIBILITY_CHECKING | `POST /teams/{id}/eligibility/refresh` pending | Loading while retaining the last backend Team read | None | None | Project creation/submit | ELIGIBILITY_FAILED, ELIGIBILITY_PASSED | 401/403/404/409/422/system feedback is classified; 409 reloads then waits for explicit recheck. |
| ELIGIBILITY_FAILED | Backend `canRegister=false` or issues | Server reason codes and recovery links | Resolve eligibility issues | Refresh | Draft/submit | TEAM_FORMING, ELIGIBILITY_CHECKING | Do not calculate replacement result locally |
| ELIGIBILITY_PASSED | Current backend Team read has `canRegister=true` and `create_project_draft` action is allowed | PASS evidence, policy/version and backend quota issue absence | Open Project registration UI | View team | Project creation when backend action is disallowed | NO_PROJECT, PROJECT_DRAFT | No backend `checkedAt`/`isStale` exists; frontend does not fabricate freshness comparison. |
| NO_PROJECT | Eligible team has no current Project | Source/team readiness | Create project draft | Review scope | Submit/review/supervisor request | PROJECT_DRAFT | 409 reload team/actions |
| PROJECT_DRAFT | Project status `DRAFT` | Draft fields and token | Continue/edit or submit when action allows | View history | Review/supervisor actions | PROJECT_SUBMITTED | 409 reload detail/actions then human reattempt |
| PROJECT_SUBMITTED | Status `SUBMITTED` | Submission time/history/read-only content | Track review | Refresh | Edit except backend allowed, supervisor request | PROJECT_UNDER_REVIEW, PROJECT_REVISION_REQUIRED, PROJECT_REJECTED, PROJECT_APPROVED | 403/409 displayed |
| PROJECT_UNDER_REVIEW | Status `UNDER_REVIEW` | Current review state/history | Refresh status | View submission | Student edit/approve/request | PROJECT_REVISION_REQUIRED, PROJECT_REJECTED, PROJECT_APPROVED | No fabricated reviewer outcome |
| PROJECT_REVISION_REQUIRED | Status `REVISION_REQUIRED` plus backend history | Feedback/reason and token | Edit/resubmit when action allows | View history | Supervisor request/final approval | PROJECT_DRAFT, PROJECT_SUBMITTED | 409 reload feedback/project |
| PROJECT_REJECTED | Status `REJECTED` | Rejection reason/history | View guidance | Refresh | Resubmit unless backend action allows another path | terminal or backend-defined path | No FE transition assumption |
| PROJECT_APPROVED | Status `APPROVED` and action evidence | Approval/history and supervisor next action | Select supervisor | Refresh | Department review/student draft mutation | SUPERVISOR_SELECTION, SUPERVISOR_REQUEST_PENDING, PROJECT_ACTIVE | 409 reload actions |
| SUPERVISOR_SELECTION | Approved project and candidate endpoint available | Project-specific candidates, expertise, request history | Send request | Filter/cancel pending request | Directory-as-candidate, accept/reject own request | SUPERVISOR_REQUEST_PENDING, PROJECT_ACTIVE | 403/409/422 shown |
| SUPERVISOR_REQUEST_PENDING | Project/request state says pending | Request status/cancel if allowed | Track or cancel per backend action | Refresh | Re-send duplicate/force accept | SUPERVISOR_SELECTION, PROJECT_ACTIVE | Rejection returns to selection only if backend permits |
| PROJECT_ACTIVE | Project status `ACTIVE` or persisted assignment/action evidence | Assignment and workspace entry | Open project workspace | View history | Registration/review state mutations | Project Workspace | Scope/errors remain backend controlled |

## Backend-derived versus journey-only states

**Backend-derived:** authenticated validity, academic context evidence, source once introduced,
team/roster data, eligibility, all Project statuses, workflow actions/reasons, requests,
assignments, and concurrency tokens.

**Frontend-only journey states:** `AUTHENTICATING`, `SESSION_RESTORING`,
`ELIGIBILITY_CHECKING`, the current loading/error rendering variants, and the next-action
interpretation. They must be recomputed from refetched backend data after mutation.

## Next-action resolver

| Authoritative condition | Next action | Guard |
| --- | --- | --- |
| ANONYMOUS | Login | no session |
| AUTHENTICATED without valid academic context | Resolve/refresh academic context | Backend issues/actions |
| NO_REGISTRATION_SOURCE | Choose Topic / Start Proposal | Only after source API is accepted; otherwise show unavailable |
| SOURCE_SELECTED + NO_TEAM | Create Team | Backend source/team actions |
| TEAM_FORMING | Complete roster/scope | Backend allowed team actions |
| ELIGIBILITY_FAILED | Resolve server eligibility issues | Backend reason codes, no local calculation |
| ELIGIBILITY_PASSED + NO_PROJECT | Create Project | `create_project_draft` allowed |
| PROJECT_DRAFT | Continue/edit/submit | Project/team action response |
| PROJECT_REVISION_REQUIRED | View feedback, edit, resubmit | `resubmit_project` allowed |
| PROJECT_APPROVED | Select supervisor | Project action/candidate route |
| SUPERVISOR_REQUEST_PENDING | Track/cancel | Backend request/action result |
| PROJECT_ACTIVE | Open Project Workspace | Persisted ACTIVE/assignment evidence |

If the backend reports an action as disallowed, the FE hides/disables that action and explains
the returned reason. Client role labels alone cannot override it.

## F6 project registration behavior

`useProjectRegistration` is feature-local state only. It keeps independent create, save,
submit, and resubmit pending flags, but does not store a client Project lifecycle. A successful
mutation is followed by `GET /projects/{id}`, global journey refresh, and history reload.

* New drafts require both current Team `canRegister=true` and the backend
  `create_project_draft` action. Saving a draft does not submit it.
* Existing drafts use `edit_project_draft`; first submission uses `submit_project`; a revision
  uses `resubmit_project`. Each transition uses the Project concurrency token returned by BE.
* `409` triggers a refresh and a visible conflict message. The student must review the current
  Project and explicitly try again; the client never retries a business transition.
* Status uses backend state/history for DRAFT, SUBMITTED, UNDER_REVIEW, REVISION_REQUIRED,
  REJECTED, and APPROVED. Department decisions and supervisor behavior are not F6 mutations.
* `PROJECT_SOURCE_PROVENANCE = BLOCKED_BY_BE_CONTRACT`. Query parameters, browser storage,
  Topic snapshots, and local form state are never used as persisted registration provenance.

## Error taxonomy and recovery

| Error | Display/behavior |
| --- | --- |
| 400 / 422 | Inline validation or business-rule message; retain non-sensitive input. |
| 401 | Session/authentication state; clear/restore according to F1 and return to login. |
| 403 | Permission or resource-scope explanation; do not expose alternative IDs/data. |
| 404 | Resource absent or not visible; route to a safe scoped destination. |
| 409 | Reload authoritative context/resource, show stale conflict, require human resubmission. |
| 5xx | System-error state with safe retry. |
| Network | Connection-failure state with safe retry and no mock fallback. |

## Source governance UX freeze

`PROJECT_TOPIC` must show backend-returned identity, title, mode, lead department,
PrimaryMajor when applicable, requirements, source status, validity, and backend issues.
`STUDENT_PROPOSAL` must show only contract-approved identity/content, academic scope,
validation, and status. Governed fields become read-only after backend lock. Proposal approval
ownership is `UNKNOWN_REQUIRES_DECISION`; F0 introduces no fake approval UI.
