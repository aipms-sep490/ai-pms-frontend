# G7 — Review Gates uses the real API by default

Handoff: 25/10/2026 (Asia/Saigon). Branch `fix/fe-review-gates-real-api-default`, based on develop `b49b3acf05fe2db556963b83f4359f958975e067` (includes PR #100). Checkpoint A still requires human review.

## Behavior and scope

Development previously selected sample data unless `VITE_USE_MOCK_REVIEW_GATES=false` was explicitly set. It now selects real API transport unless the value is explicitly `true` (case/whitespace normalized). Production continues to ignore the mock flag and use real transport.

`.env.example` now sets `false` and explains the opt-in. A development-only `DỮ LIỆU MẪU · Review Gates` status appears before loading/error/content on the three page components, covering the four routes below and their timeline/supervisor aliases. It uses existing warning tokens; no shared UI primitive, router guard, API contract, academic authority or mock-adapter data changed.

Four Gate page/scenario test fixtures explicitly opt in to sample data. `CollaborationWorkspace.test.tsx` opts in only for the separate Gate integration, retaining its five real HTTP resource and cancellation assertions. The change fixes fixture dependence on an implicit default; product workspace code is untouched.

Historical continuation audit/backlog documents describing an implicit mock default capture the old state. This handoff supersedes those statements for current code.

## Technical verification

| Check | Result |
|---|---|
| `pnpm test --mode acceptance --maxWorkers 4` | 264 files / 1468 tests PASS, no failed tests or reported unhandled errors |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS, 0 errors / 206 warnings; normalized warning set identical to the b49 baseline |
| `pnpm build --mode acceptance` | PASS; existing bundle-size warning remains |
| `git diff --check` | PASS |
| Production marker | Marker text absent from generated production assets; unit checks cover production flag rejection and notice absence |

The passing suite contains one jsdom informational `Not implemented: navigation to another Document` line. No Vitest error is reported. Tests cover missing/empty/false/invalid flags, normalized explicit true, real default transport, and development/production notice boundaries.

The public G9 profile was copied to ignored `.env.acceptance.local` in this worktree for validation; it is not included in this PR. The mock adapter remains unchanged.

## Browser verification against staging

Used normal UI logins with separate role contexts, the real staging proxy, and the same origin `http://localhost:5176`. Restarted Vite after explicitly switching `true` to `false`. No request interception, session injection, DB setup or Gate mutation was used.

| Role / route | Explicit true | Explicit false |
|---|---|---|
| Admin `/academic/review-gates` | Sample templates; one notice; no Gate API request | Notice absent; `/academic/gate-templates` and `/departments/review-gates/matrix` GET 200 |
| Department `/department/projects/progress-matrix` | Sample templates; one notice; no Gate API request | Notice absent; templates/matrix GET 200 |
| Lecturer `/review/gate-assignments` | Two sample assignments; one notice; no Gate API request | Notice absent; `/reviewers/me/gate-assignments?page=1&pageSize=20` GET 200, one staging assignment |
| Student `/project/review-gates` | Campus Support sample timeline; one notice; no Gate API request | Notice absent; `/students/me/review-gates/timeline` GET 200 for project 50004; readiness GET 200 `NOT_CONFIGURED` |

Real API success does not establish every Gate workflow or role policy. In particular, `NOT_CONFIGURED` stays an advisory server state; it is not converted to readiness. The department matrix router/registry mismatch remains G1 scope.

The notice fits at 390, 768, 1280 and 1440 CSS px on all four routes. Narrow viewport measurements check banner bounds and internal overflow; screenshots document each width. This verifies the new notice, not every existing table or all responsive interactions. Production behavior is covered by the build/unit boundary checks above, not a claimed production browser session.

## Evidence and checkpoint

The portable bundle is outside Git: `E:/DOANTOTNGHIEP/output/fe2-plandev2-2026-10-24/`. These relative links require the local sibling `output` directory; GitHub does not host the screenshots/logs.

- [Review HTML](../../../output/fe2-plandev2-2026-10-24/index.html)
- [Eight browser probes](../../../output/fe2-plandev2-2026-10-24/g7/browser-probes.json), [real response log](../../../output/fe2-plandev2-2026-10-24/g7/network.json), [narrow viewport measurements](../../../output/fe2-plandev2-2026-10-24/g7/viewport-probes.json)
- [Screenshots](../../../output/fe2-plandev2-2026-10-24/g7/screenshots), [test summary](../../../output/fe2-plandev2-2026-10-24/g7/tests-acceptance.log), [implementation/check notes](../../../output/fe2-plandev2-2026-10-24/g7/agent-implementation-notes.md)

Four `.claude/rules/ai-pms-*.md` files named by the plan were absent from the workspace/user roots and Git history; no claim is made that they were read. Plan/AGENTS ownership, fail-closed authority and per-task PR rules were followed.

No PR merge or automatic checkpoint approval. `plandev2/PLAN (1).md:205` says “Checkpoint cần người review xác nhận, không tự tick”; `FE_DEV_2_TASKS.md:349` requires review before the next code tasks.
