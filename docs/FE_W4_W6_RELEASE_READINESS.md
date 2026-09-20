# FE W4-W6 release readiness

## Audited refs

- Frontend `origin/develop`: `60120702ac67837336a7354871c660f1ee3a3229`.
- Backend `origin/develop`: `98c56631a90fcaa90c471d6e6a8a4e5896c0468b`.
- Feature head at this readiness audit: `7345c7800304d91141ef4d82498301f52f82e57c`.

The Frontend feature branch was compared with its current `origin/develop` before this
stabilization work. Backend contracts were rechecked without changing Backend or either
`develop` branch.

## Business-flow coverage

| Area | Readiness | Evidence |
| --- | --- | --- |
| Academic Governance | READY | Backend workflow actions drive the existing governance UI. |
| Team Formation and Eligibility | READY | Backend Team eligibility/actions are displayed; Frontend does not calculate eligibility. |
| Registration Source | READY | Canonical `ProjectDto.proposalSource` is the sole persisted provenance source. |
| Published Topic | READY | `PUT /projects/{projectId}/topic` uses the current concurrency token; `409` reloads without replay. |
| Student Proposal | READY | Backend `STUDENT_PROPOSAL` provenance is displayed without a client-side proposal lifecycle. |
| Project Registration | READY | Draft, submit, resubmit, history, and Backend workflow actions are covered. |
| Department Review | READY | Backend actions, review tokens, required reasons, scope, and no-replay conflict refresh are covered. |
| Supervisor Selection | READY | Project-scoped candidates, explicitly applied filters, leader/action gating, and no-replay request/cancel handling are covered. |
| ACTIVE Workspace | READY | Student and supervisor routes require refreshed Backend Project `ACTIVE`; supervisor access also requires a current primary assignment. |
| Milestones | READY | Real Backend reads/mutations with role/action UX gates; zero milestones is valid. |
| Tasks | READY | Real Backend task/status/dependency/assignee APIs with structural and assignee controls separated. |
| Timeline and Progress | READY | Backend timeline/progress projections are rendered without canonical client calculations. |
| Evidence | BLOCKED | No verified TaskEvidence API; no local persistence or substitute UI is introduced. |
| Comments | BLOCKED | No verified TaskComment API; no local persistence or substitute UI is introduced. |

## Contract and authority notes

Backend remains the authority for RBAC, workflow actions, Team and Project state, topic
selection, review decisions, supervisor eligibility/capacity/assignment, execution permissions,
and task transitions. The verified Backend contract continues to expose Project provenance
(`proposalSource`, `topicId`, `selectedTopic`), topic selection, review actions/department
decisions, supervisor request/accept/reject, and milestone/task/progress APIs.

There is no verified standalone ProjectPeriodWindow contract beyond the current ProjectPeriod
model. This is a known non-blocking limitation: the Frontend does not invent a second window
model. Evidence and comments are the only release-blocked W4-W6 surfaces listed above.

## Stabilization cleanup

- Removed the proven-unused `allMilestonesPreview` sample records; static Kanban column metadata
  remains presentation-only.
- Replaced stale registration provenance documentation with the canonical Project contract.
- Removed the superseded F0 registration state model, whose future-source assertions contradicted
  the current Project provenance contract.
- No business rule, production state transition, or Backend contract was invented.

## Quality gates

| Command | Result |
| --- | --- |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS with zero warnings |
| `pnpm test -- --shard=1/2` | PASS |
| `pnpm test -- --shard=2/2` | PASS |
| `pnpm build` | PASS; Vite reports its existing non-blocking chunk-size advisory |
| `git diff --check` | PASS |

The two non-overlapping Vitest shards are the aggregate full-suite run. This readiness pass also
adds a sequential mocked Backend journey regression covering no team through `ACTIVE`, while
existing focused tests cover topic provenance, review/supervisor conflicts, route guards, and
execution API behavior.
