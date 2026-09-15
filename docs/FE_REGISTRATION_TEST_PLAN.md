# Registration-to-ACTIVE Frontend Test Plan (F0)

## Current tooling and approach

The repository currently uses Vitest, React Testing Library, TypeScript, and Vite. No
Playwright or Cypress script/dependency is present. F0 does not install E2E tooling. Before
F9, select an E2E runner through team agreement; Playwright is the recommended candidate for
its browser, multi-user storage-state, network interception, and CI support, but it is not
approved or installed by this document.

All production-contract tests run with API mode. Mock tests must explicitly set
`VITE_DATA_MODE=mock` or mock the adapter boundary; no test may prove authorization,
eligibility, review, source governance, or supervisor acceptance solely through fixtures.

## Phase test matrix

| Phase | Focused unit/component/API tests | Integration/contract tests | Completion evidence |
| --- | --- | --- | --- |
| F1 | Login validation/error classification, session restore loading, refresh success/failure, logout, protected route/intended destination, 204 | Auth adapter sends credential; stale token 401 has no retry loop | Anonymous shell never exposes protected UI before restore finishes. |
| F2 | Context loading/no context, allowed action resolver, navigation visibility, dashboard state | `/auth/me/context`, team/project actions shape/error mapping | Navigation reflects backend actions/reasons, not role-only gates. |
| F3 | Topic list/detail loading/errors, explicit unavailable source state, discriminated source rendering | Accepted source read/select/proposal API; 403/409/source-lock | Selection is backend persisted; no query/localStorage authority. |
| F4 | Team create/update, invitation list/candidate filters, invite/accept/reject/cancel/remove/leave/leader transfer | 204 handling and post-mutation context refresh | Two-user invite/accept produces backend roster. |
| F5 | Eligibility loading, FAIL reasons, PASS, stale invalidation after roster/scope change, recovery CTA | Refresh returns backend reasons/actions | No locally computed authoritative PASS/FAIL. |
| F6 | Draft create/edit, fields, majors, submit/resubmit, read-only states, 409 conflict UI | Current token on mutation; leader/member 403 | Draft -> Submitted and Revision -> Edit -> Resubmit. |
| F7 | Queue search/paging, detail snapshot/scope/roster/history, workflow-action visibility, start/revision/reject/approve and participating decision validation | Exact review/action routes and bodies; 401/403/404/system UI; 409 refresh without automatic retry | Hybrid lead approval is enabled only by Backend `approve_project`; participant decisions use the current snapshot/token. |
| F8 | Project-specific candidates, leader-only send/cancel, request/assignment rendering, Backend-scoped inbox, accept/reject, conflict refresh | Exact candidate/request/inbox/assignment routes and response body; no generic directory selection; 409 has no retry | Request -> Backend accept -> assignment and ACTIVE are refetched, never client transitioned. |
| F9 | Resolver state matrix, dashboard CTA, guarded workspace reload, supervisor assignment handoff | Assignment + Project state consistency; no browser Registration Source provenance | Only persisted `ACTIVE` enables workspace; a non-ACTIVE URL returns to its safe action. |

## Required eventual E2E scenarios

| Scenario | Evidence required |
| --- | --- |
| SINGLE_MAJOR | Login -> context -> accepted source -> team -> invite/accept -> eligibility PASS -> draft -> submit -> review approve -> supervisor accept -> ACTIVE. |
| INTERDISCIPLINARY | Accepted source scope has lead department and major requirements; roster meets quota; participating decisions precede lead approval; supervisor accept reaches ACTIVE. |
| Eligibility fail/recovery | Missing or invalid roster/scope -> server reasons -> user changes permitted input -> refresh -> PASS. |
| Revision | Submitted -> revision reason -> edit -> resubmit -> review again. |
| Security | Anonymous denied; member cannot submit; resource scope/cross-department denial; no role-only mutation enablement. |
| Concurrency | Stale project/review/source mutation gets 409 -> data reload -> human explicitly retries with new token. |
| Supervisor reject/re-request/accept | Rejection is visible; replacement request only under backend action; accept persists assignment and ACTIVE. |

## Contract test rules

- Assert exact method, path, query serialization, request body, and bearer-token behavior for
  every adapter mutation/read introduced by a phase.
- Assert `204 No Content` resolves safely through the shared client.
- Assert 400/422, 401, 403, 404, 409, 5xx, and network failures are classified, never silently
  changed to mock data.
- Assert workflow actions/reasons control CTA visibility; do not test a client-side role as an
  authorization substitute.
- Use actual backend DTO fixtures derived from contracts, not presentation-only demo data.

## Quality gates per phase

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Record test-file count, test count, passed/failed/skipped, process exit code, and any E2E
environment dependency. A green build or unit suite alone is not Registration-to-ACTIVE proof.

## F0 verification scope

F0 adds documentation only. Its gate verifies the existing source still passes lint, typecheck,
Vitest, build, and diff-check after the documentation commit. Browser E2E, Docker/Testcontainers,
and missing Registration Source contracts remain outside F0 runtime verification.

## F9 verification record

Focused F9 tests cover the resolver's real routes and `DRAFT` refinement, Dashboard ACTIVE CTA,
ACTIVE workspace rendering after a provider reload, direct route guard behavior, and Supervisor
Inbox assignment handoff. The existing inbox-hook test verifies that accept triggers a fresh
Backend assignment read; it never transitions the student project in browser state. Full
multi-user runtime E2E remains an environment/runtime verification item, not a unit-test claim.
