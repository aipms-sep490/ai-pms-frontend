# Pre-Phase-4 Closure Matrix

**Audited:** 2026-10-02
**Frontend baseline:** `feat/student-execution-workspace-v3` at `7864c6128a11f93d511e55c2a197e2a08ac6a782`
**Frontend remote base:** `origin/develop` at `c9635cb7a3814a578a839d0295f0cf644b9da003`
**Backend audit branch:** `feat/pre-phase-4-execution-closure` at `c23eeef69fef242acfcbf3d76aea98efd4eb6298`
**Backend remote base:** `origin/develop` at `040361c4f7c0529bbcfcddf484e923fa826d4f85`

## Provenance and repository boundary

The frontend branch is a workspace-foundation branch rooted at `7864c612`; it
is not a descendant of the current frontend `origin/develop`. Its existing
modified and untracked files are preserved as in-progress Phase 0–3 work.

The backend execution branch points to the local `c23eeef` merge commit. Its
only committed divergence from `origin/develop` is `6016e83` (`.gitignore`),
and its merge-base is `040361c`. The execution-action controller, reader,
repository, and test changes are all uncommitted working-tree changes; they
are not a delivered backend contract and cannot be treated as deployable API
authority by the frontend.

This closure pass has a strict frontend-only implementation boundary. Backend
files, tests, configuration, database, schema, seeds, and documentation are
inspection-only. A missing or undelivered backend contract is recorded in
`docs/BE_HANDOFF_ACTOR_WORKSPACE_AUDIT.md`; privileged frontend actions fail
closed until the backend developer delivers and verifies it.

This matrix is an evidence register, not a client-side permission design. A
route, role or UI flag never substitutes for an endpoint's authorization.

## Current Stage-A classifications

| Area | Classification | Meaning |
| --- | --- | --- |
| Project/task/milestone execution adapters | `VERIFIED_FE` + `BE_HANDOFF_REQUIRED` | Centralized reader distinguishes `ALLOWED`, `DENIED`, `UNSUPPORTED_CONTRACT`, and `UNAVAILABLE`; every non-allowed state hides privileged CTA. The inspected Backend implementation is uncommitted and not a delivery. |
| Evidence Ledger read | `VERIFIED_FE` | Paginated/filterable read, failure isolation and safe deep links use the existing read endpoint. |
| Evidence write | `FE_COMPLETE_BE_BLOCKED` + `BE_HANDOFF_REQUIRED` | No source-scoped authoritative write capability has been delivered, therefore no create/delete UI exists. |
| Mentor entry and read-only workspace | `VERIFIED_FE` | Exact persisted active `DISCIPLINE_MENTOR` project/major assignment is required for every direct route. |
| Role browser acceptance | `BLOCKED_BY_CREDENTIAL` | No valid Department, Supervisor, or Mentor account is substituted with Admin. |
| Department governance | `VERIFIED_FE` + `BE_HANDOFF_REQUIRED` | Phase 4 foundation began only after checkpoint `e9ced4f`; missing aggregate/read contracts remain documented and no governance mutation is invented. |

| Phase | Actor | Capability | Business requirement | Current FE | Current BE | Authority source | Gap | Classification | Required action | Acceptance evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0–1 | All | Navigation and direct routes | Identity role is distinct from assignment; unknown capability fails closed | Route guards and action gates exist | Context/action endpoints exist | Persisted role, membership, assignment and endpoint guards | Re-audit only | `VERIFIED_FE` | Freeze unless a regression is found | Route/action tests |
| 2 | Student Leader | Structural task/milestone plan | Create/update/delete/assign/dependency/reorder only when server permits | Dedicated project/task/milestone capability adapters hide each write until allowed | Task/milestone mutation handlers exist; proposed capability reads are undelivered | Command guards + resource state | Complete action contract is handoff only | `VERIFIED_FE` + `BE_HANDOFF_REQUIRED` | Backend delivers authoritative execution reads; UI remains fail-closed | Leader/member/outsider consistency tests |
| 2 | Student Member | Assigned work/status/report contribution | Member must not receive leader plan authority; may act only where command supports it | Member workspace is read-focused; no identity fallback grants a write | Status and progress-report commands have member-scoped guards | Task assignee/team membership guard | Resource action reads are handoff only | `VERIFIED_FE` + `BE_HANDOFF_REQUIRED` | Add resource/project action reads; preserve server final decision | Member-reduced-capability tests |
| 2 | Student / scoped mentor | Task disciplines | Read classification; write only with server scope and token | Detail panel/API client exists | `GET/PUT /api/v1/tasks/{taskId}/disciplines` exists with `409` and interdisciplinary validation | `DisciplineService.RequireWriter` | Task action delivery remains required for write CTA | `VERIFIED_FE` + `BE_HANDOFF_REQUIRED` | Consume task-scoped authority; preserve intent on 409 | Discipline and token tests |
| 2 | Writer with concrete source | Evidence ledger | Reference existing source; preserve source/major scope and server verification state | Read ledger is implemented; creation is hidden | `GET/POST /api/v1/projects/{projectId}/evidence` exists with idempotency/source validation | `DisciplineService.AddEvidenceAsync` | No source-scoped action read | `VERIFIED_FE` read / `FE_COMPLETE_BE_BLOCKED` write + `BE_HANDOFF_REQUIRED` | Build only a source-gated creation UX after delivery | Cross-project, duplicate and source-state tests |
| 2 | Student Leader | Final submission | Leader only; backend readiness/blockers are canonical | Existing viewer/submission flow | Final checklist reports `CanSubmit` and blockers | Final submission workflow | Re-audit only | `VERIFIED_FE` | Preserve current implementation | Leader/member tests |
| 3A–C | Primary Supervisor | Supervision cockpit | Read scope; no blanket structural control | Scoped workspace/cockpit and ledger links exist | Assignment/resource reads and specialized feedback exist | Primary assignment + endpoint guard | Source/action write scope is handoff only | `VERIFIED_FE` + `BE_HANDOFF_REQUIRED` | Keep writes fail-closed until capability delivery | Partial-resource tests |
| 3D | Discipline Mentor | Major-scoped follow-up | Assignment type + major; never becomes primary supervisor | Exact assignment route and read-only shell exist | Persisted `DISCIPLINE_MENTOR` assignment and scoped discipline writer rules exist | Assignment type/major plus endpoint guard | Mentor resource context is handoff only | `VERIFIED_FE` + `BE_HANDOFF_REQUIRED` | Restrict to exact scope; add resource context only after delivery | Mentor-major and mentor-not-primary tests |
| 4 | Department Staff | Academic governance foundation | Department is separate from Admin; read composition and review actions remain server authority | Department-only workspace, local navigation and independent sections | Existing review, portfolio, directory and workflow-period reads are reused | Department policy/evaluation/final/supervisor governance aggregate is missing | `VERIFIED_FE` + `BE_HANDOFF_REQUIRED` | Keep non-delivered areas read-only/fail-closed | Route/partial failure/role tests |
| Future | Industry Expert / review frameworks | New governance product scope | No silent implementation claim | No Stage A work | No Stage A contract audit | Future design | Not part of approved Stage A | FUTURE_SCOPE | Document only | N/A |

## Stage A gate

Stage A is ready for its frontend checkpoint: every privileged UI path is
either `VERIFIED_FE` or fail-closed with `BE_HANDOFF_REQUIRED`. Role browser
acceptance remains `BLOCKED_BY_CREDENTIAL`; it does not authorize an Admin
substitute. Phase 4 may begin after the checkpoint because each missing
authority is recorded as a handoff rather than fabricated in the frontend.
