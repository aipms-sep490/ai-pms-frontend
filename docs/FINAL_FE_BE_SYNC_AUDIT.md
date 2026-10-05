# Final FE-BE synchronization audit

**Audit date:** 2026-10-05
**Frontend baseline:** `origin/develop` `500f3c1eb601e9cd1080b6566e7cbee3cb72e545`
**Frontend checkpoint:** `c18923583bfaea269bab8540490b9c4301c5481d`
**Backend inspected read-only:** `develop` / `origin/develop` `dde3cebf544af509d2a187b275901f50060d9f8f`
**Frontend continuation branch:** `feat/final-fe-be-sync-v3-r1` in an isolated linked worktree.

This is a post-freeze integration audit. It does not alter the historical
`AI-PMS_Frontend_Full_Implementation_Audit_v1.0.md`.

## Authority rule retained

The frontend treats a backend response as observational, not as a permission
lock. A protected mutation is still revalidated by the backend. Unknown,
loading, unavailable, or unsupported data is never converted into permission.
On a 403 after a displayed execution CTA, the frontend reloads the resource and
its capability observation and does not replay the mutation. On a 409, draft
input is retained where there is an editable form and the authoritative snapshot
is refreshed.

## Contract matrix

| Handoff | Backend endpoint inspected | FE result | Status |
|---|---|---|---|
| BE-AW-001 | `GET /projects/{id}/execution-actions`, `GET /tasks/{id}/execution-actions`, `GET /milestones/{id}/execution-actions` | Contract is wired, but structural manager actions inherit a backend predicate that accepts any active supervisor. FE only exposes structural CTAs to a Student Leader or proven active PRIMARY Supervisor. | `BLOCKED_BY_BACKEND` |
| BE-AW-002 | Existing `GET/POST /projects/{id}/evidence` | `POST` resolves canonical source/project/major/actor/state server-side. FE offers only `TASK + taskId` evidence after `add_task_evidence` plus a safe actor scope; it sends no verification/submitter field. | `VERIFIED_USABLE` |
| BE-AW-003 | Assignment reads plus task execution capability | Exact active Mentor assignment/major and authoritative task-discipline intersection are required. Structural task UI remains closed; unknown/error discipline scope is denied. | `PARTIAL_BACKEND_DEFECT` |
| BE-AW-005 | `GET /projects/{id}/governance` | Governance read remains visible where existing route access permits; all cycle/action-item mutations are fail-closed. Admin and a merely participating Department scope are unsafe under the current predicate. | `BLOCKED_BY_BACKEND` |
| BE-AW-006 | `GET /evaluation-assignments/{id}` | Evaluator direct route now requests the canonical assignment-detail projection. `canScore`, legacy read-only, and denial reason control mutation presentation. | `VERIFIED_FE_BE` |
| BE-AW-007 | `GET /evaluation-assignments/{id}/evidence` | Evaluator displays final-submission metadata and item count only. The backend does not return a complete assignment-scoped evidence/file projection. | `PARTIAL_BACKEND_DEFECT` |
| BE-AW-009 | `PATCH /users/{id}/academic-profile` | Admin detail sends the backend concurrency token, preserves a draft on 409, uses the returned scope snapshot, and does not cascade changes client-side. | `VERIFIED_FE_BE` |
| BE-AW-010 | Security role DTOs | Role type consumes `isAssignableGlobalRole` and `assignmentKind`; account creation only offers server-classified global roles. | `VERIFIED_FE_BE` |
| BE-AW-011 | `GET /calendar` | Student route uses bounded `from`/`to`/`pageSize` projection only; Mentor/Evaluator/Lecturer broad calendar stays unavailable because their backend project expansion is too broad. | `BLOCKED_BY_BACKEND` |

## Backend defects and incomplete contracts

### BE-AW-001 and BE-AW-003: execution manager broadening

The structural manager predicate used by task/project execution treats any
active supervisor assignment as a manager. It does not distinguish a PRIMARY
Supervisor from a discipline mentor. This is a backend authorization defect,
not a frontend permission rule. The frontend applies a negative compatibility
gate only: `backend Allowed` plus Student Leader or active PRIMARY Supervisor
for structural actions. Mentor structural controls remain hidden; supported
task status/evidence candidates also require exact active mentor route scope.

### BE-AW-005: governance scope broadening

`GET /api/v1/projects/{projectId}/governance` is a read model with
`ProjectGovernanceDto`. Its service calculates `MANAGE_GOVERNANCE` when the
actor is an Admin or belongs to the project department. The Admin branch is not
compatible with the frozen authority model: platform administration does not
make an account a Department academic actor. The frontend deliberately does not
call this endpoint or expose governance readiness/actions from it.

Required backend remediation: scope the projection and `AllowedActions` to the
persisted Department/project relationship, return 403 for an Admin without such
a relationship, and cover Admin, lead department, participating department, and
foreign department tests. No frontend workaround is safe.

### BE-AW-011: calendar scope broadening

`GET /api/v1/calendar` accepts `from`, `to`, `cursor`, `pageSize`, and an
optional source type. Its response shape includes items, continuation metadata,
and deep links. The inspected query expands a Mentor or Evaluator assignment to
all project IDs and then emits task, milestone, meeting, deliverable, and final
submission facts for every selected project. This is broader than a discipline
major or evaluator assignment scope.

The frontend uses this endpoint only for the Student's bounded team-project
scope, with `from`, `to`, and `pageSize`; local routes are constructed from
the returned source type rather than trusting backend deep links. Lecturer,
Mentor, Evaluator, Department, and Admin do not adopt its broad projection.
Required backend remediation: enforce major/evaluation scope before selecting
resources, test cross-major and foreign-assignment denial, and preserve
`DateOnly` values without timezone conversion.

### BE-AW-002, BE-AW-003, and BE-AW-007: remaining read/action granularity

Task evidence creation is server-validated and usable only with a canonical
Task source plus the delivered task capability. Generic governance evidence
creation stays fail-closed. Mentor reads still lack a dedicated major-scoped
projection; evaluator evidence is metadata-only. These are not replaced by
frontend role, path, or client-side filters.

## Frontend changes made

- Execution capability DTOs now match the delivered resource/project/status
  shape and use the exact `add_task_evidence` action code.
- Task and milestone execution mutations refresh their resource/capability
  observation after a server 403, without retrying a mutation.
- The direct Evaluator assignment route uses the canonical detail endpoint;
  its evidence panel displays only the delivered metadata.
- The governance evidence form was removed because no source-aware CTA contract
  is published; existing ledger reads remain available.
- Admin academic profile editing uses the delivered PATCH endpoint and
  concurrency token; global role selection uses server metadata rather than a
  frontend role-name allowlist.

## Runtime mock audit

`VITE_DATA_MODE` defaults to `api`; only an explicit value of `mock` enables the
in-memory project/team/qualification stores. API mode propagates HTTP failures
instead of returning mock success. Project and qualification mocks remain
**explicit dev mocks** because their consumers branch on `env.isMockMode`.
Project and team seed stores are not initialized in API mode. The qualification
fixture is dynamically imported only inside mock-mode branches, so API-mode
service code has no runtime dependency on its seed data. Tests exercise the
API-mode no-fallback path. No production-runtime fallback was found in these
paths.

## Verification record

Focused checks cover execution capability fail-closed behavior, 403 refresh,
Mentor assignment guard, evaluator direct-detail/evidence/read-only behavior,
admin profile 409 preservation, role metadata, and explicit API mock mode.

| Check | Result |
|---|---|
| Focused Final Sync Vitest | 10 files, 51 tests passed (9.22 s) |
| Focused Video Meeting regression | 8 files, 34 tests passed (6.60 s) |
| `pnpm typecheck` | Passed |
| `pnpm lint` | Passed |
| Full Vitest evidence | Official Vitest 4-way sequential blob sharding completed naturally: shards 1/4, 2/4, 3/4, and 4/4 each exited 0 and wrote a non-empty blob (181,711; 171,490; 199,694; and 152,719 bytes). The merged JSON report at `artifacts/vitest/vitest-full.json` recorded 140 test files, 305/305 suites and 624/624 tests passed, with 0 failed/pending/todo suites and tests. This replaces the prior `FULL_VITEST_EVIDENCE_MISSING` reporter-finalization blocker. |
| `pnpm build` | Passed: TypeScript build and Vite production build completed. Vite reported the existing LiveKit chunk-size advisory only. |
| `git diff --check` | Passed |
| Browser/network audit | Chrome DevTools API-mode check passed for unauthenticated guard: `/project/workspace` redirected to `/login`; at 375px, `scrollWidth === innerWidth`. The login UI handled the real `POST /api/v1/auth/google/challenge` 502 by showing the Google-unavailable state. |

Role-specific browser acceptance (Student Leader/Member, Primary Supervisor,
Discipline Mentor, Department, Evaluator, and Admin) remains
`BLOCKED_BY_CREDENTIAL`. No Admin account was substituted for academic roles,
and no mock browser acceptance was claimed.

## Final synchronization status

**Frontend implementation:** `MERGE_READY_FOR_VALID_BACKEND_CONTRACTS`.

**Overall system:** `PARTIAL_BACKEND_BLOCKED`.

The frontend-safe integration is complete for contracts with a proven scope.
The overall synchronization remains blocked by BE-AW-001 (and its BE-AW-003
Mentor boundary impact), BE-AW-005 governance scope, BE-AW-007 evidence
projection completeness, and BE-AW-011 multi-actor calendar scope. BE-AW-002
is intentionally not a blocker: task-source evidence is now consumed through
its canonical server-validated path.
