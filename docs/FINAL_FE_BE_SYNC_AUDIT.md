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
| BE-AW-001 | `GET /projects/{id}/execution-actions`, `GET /tasks/{id}/execution-actions`, `GET /milestones/{id}/execution-actions` | Exact `ExecutionCapabilityDto` wired. Task evidence gate corrected to published `add_task_evidence`; task/milestone mutations refresh after 403. | `VERIFIED_FE_BE` |
| BE-AW-002 | Existing `GET/POST /projects/{id}/evidence` | Backend mutation resolves source and state, but publishes no source/resource action read model. Governance evidence creation remains fail-closed/read-only rather than offering a broad CTA. | `PARTIAL_BACKEND_CONTRACT` |
| BE-AW-003 | Assignment reads plus task execution capability | Existing Mentor route proves an exact active `DISCIPLINE_MENTOR` assignment and exact major; task mutation authority is capability-driven. There is no delivered major-scoped resource projection, so generic project-resource reads are not promoted as mentor-wide access. | `PARTIAL_BACKEND_CONTRACT` |
| BE-AW-005 | `GET /projects/{id}/governance` | Not wired. The inspected service publishes `MANAGE_GOVERNANCE` for an Admin and returns an Admin platform scope, contrary to the handoff rule that Admin is not a Department academic actor. | `BACKEND_DEFECT` |
| BE-AW-006 | `GET /evaluation-assignments/{id}` | Evaluator direct route now requests the canonical assignment-detail projection. `canScore`, legacy read-only, and denial reason control mutation presentation. | `VERIFIED_FE_BE` |
| BE-AW-007 | `GET /evaluation-assignments/{id}/evidence` | Evaluator displays server-scoped final-package metadata only. The backend does not return evidence/file rows or URLs; FE does not fabricate or client-filter them. | `PARTIAL_BACKEND_CONTRACT` |
| BE-AW-009 | `PATCH /users/{id}/academic-profile` | Admin detail sends the backend concurrency token, preserves a draft on 409, uses the returned scope snapshot, and does not cascade changes client-side. | `VERIFIED_FE_BE` |
| BE-AW-010 | Security role DTOs | Role type consumes `isAssignableGlobalRole` and `assignmentKind`; account creation only offers server-classified global roles. | `VERIFIED_FE_BE` |
| BE-AW-011 | `GET /calendar` | Not wired. Mentor and evaluator calendar queries are expanded to all project resource events in the inspected backend implementation, not their major/assignment scope. | `BACKEND_DEFECT` |

## Backend defects and incomplete contracts

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

The existing FE calendar therefore retains its independently guarded,
partial-source projection and its truthful unavailable messages. It does not
issue the delivered calendar request in production API mode. Required backend
remediation: enforce major/evaluation scope before selecting resources, test
cross-major and foreign-assignment denial, and preserve `DateOnly` values
without timezone conversion.

### BE-AW-002, BE-AW-003, and BE-AW-007: remaining read/action granularity

Evidence creation is server-validated but has no published source/resource
capability that can safely drive a CTA. Mentor reads lack a dedicated
major-scoped projection. Evaluator evidence is safely scoped but is metadata
only. These are not replaced by frontend role, path, or client-side filters.

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
| `pnpm test` | Invoked normally and allowed to terminate. A complete JSON-reporter verification recorded 301 files, 620/620 tests passed, 0 failed; no Vitest process remained. This disproved the previously observed worker-startup hang in this isolated worktree. |
| `pnpm build` | Passed: TypeScript build and Vite production build completed. Vite reported the existing LiveKit chunk-size advisory only. |
| `git diff --check` | Passed |
| Browser/network audit | Chrome DevTools API-mode check passed for unauthenticated guard: `/project/workspace` redirected to `/login`; at 375px, `scrollWidth === innerWidth`. The login UI handled the real `POST /api/v1/auth/google/challenge` 502 by showing the Google-unavailable state. |

Role-specific browser acceptance (Student Leader/Member, Primary Supervisor,
Discipline Mentor, Department, Evaluator, and Admin) remains
`BLOCKED_BY_CREDENTIAL`. No Admin account was substituted for academic roles,
and no mock browser acceptance was claimed.

## Final synchronization status

`FINAL_SYNC_PARTIAL_ACCEPTABLE`.

The frontend-safe integration and verification work is complete, but the
overall synchronization remains `BLOCKED_BY_BACKEND` for governance and
calendar authorization scope. In addition, source-aware evidence, mentor
resource reads, and evaluator evidence rows need the noted backend contract
granularity before this can become `FINAL_SYNC_READY_FOR_REVIEW`.
