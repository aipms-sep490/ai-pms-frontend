# G7 — Review Gates uses the real API by default

Handoff: 25/10/2026 (Asia/Saigon). Branch `fix/fe-review-gates-real-api-default`, based on develop `b49b3acf05fe2db556963b83f4359f958975e067` (includes PR #100). Checkpoint A still requires human review.

## Behavior and scope

Development previously selected sample data unless `VITE_USE_MOCK_REVIEW_GATES=false` was explicitly set. It now selects real API transport unless the value is explicitly `true` (case/whitespace normalized). Production continues to ignore the mock flag and use real transport.

`.env.example` now sets `false` and explains the opt-in. A development-only `DỮ LIỆU MẪU · Review Gates` status appears before loading/error/content on the three Gate page components and as the first child of `CollaborationWorkspace`, covering the four routes below, `/project/workspace`, and the timeline/supervisor aliases. It uses existing warning tokens; no shared UI primitive, router guard, API contract, academic authority or mock-adapter data changed.

Four Gate page/scenario test fixtures explicitly opt in to sample data. `CollaborationWorkspace.test.tsx` opts in only for the separate Gate integration, retaining its five real HTTP resource and cancellation assertions. The workspace product change is limited to the notice import/render; `submitRevision`, capability decisions, and submission controls are unchanged.

Historical continuation audit/backlog documents describing an implicit mock default capture the old state. This handoff supersedes those statements for current code.

## Original technical verification — 25/10/2026

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

## Review follow-up — 26/10/2026

The first revision missed the embedded Gate submission surface in `/project/workspace`. The review identified that omission; the existing notice now renders immediately after the workspace root, before its header. It informs users of sample data without disabling submissions or changing `submitRevision`.

Coordination choice **(a)**: keep this two-line product change in G7, alongside its existing workspace test change. It touches an FE1 surface at the user's explicit review-feedback request. The PR handoff must call out `CollaborationWorkspace.tsx` and its test so FE1 can avoid an overlapping edit; this document does not claim a separate message has already been sent.

Two additional integration tests cover development mock-on (visible notice, sample Gate heading, no timeline HTTP request) and mock-off (no notice, authenticated GET `/projects/9/review-gates/timeline`, server Gate heading). They retain the existing five-resource/authentication/cancellation assertions. Component-level development/production visibility and actual production transport boundaries remain covered by the previous tests.

The missing `VITE_ENABLE_AI_ADVISORY` is now documented beside the other AI flags in `.env.example`, explicitly `false`. Deployment owners can opt in after verifying matching advisory endpoints; the template no longer silently omits the flag. This does not alter any running deployment.

Consumer audit: all four direct page consumers of `review-gates-api` now have the notice (three Gate pages plus the collaboration workspace). `EvidenceDownloadButton` is a nested consumer under the already-covered Gate pages, not another unmarked entry surface.

Follow-up validation on the final safe acceptance profile (`RBAC_WRITE=false`, `CHAT_ATTACHMENTS=false`):

| Check | Result |
|---|---|
| Targeted workspace/notice/env tests | 3 files / 26 tests PASS |
| `pnpm test --mode acceptance --maxWorkers 4` | 264 files / 1470 tests PASS, exit 0; no reported failures or unhandled errors |
| `pnpm typecheck` | PASS, exit 0 |
| `pnpm lint` | PASS, exit 0; 206 warnings, normalized warning set unchanged |
| `pnpm build --mode acceptance` | PASS, exit 0; existing bundle-size warning |
| Production notice marker / mock adapter | Marker absent from generated assets; adapter unchanged |
| Template coverage / diff check | All 25 `env.ts` VITE keys appear in `.env.example`; `git diff --check` PASS |

The earlier same-source full run also passed 264 files / 1470 tests, but used the prior profile. It is preserved separately as `tests-before-safe-profile.log`; `tests-acceptance.log` is the final safe-profile run. The passing suite still contains the previously recorded jsdom navigation informational line.

Follow-up technical logs and `profile-used.env` are recorded in `E:/DOANTOTNGHIEP/output/fe2-feedback-2026-10-26/g7/`. The profile was copied only to ignored `.env.acceptance.local`; it is not part of this PR.

Root also verified `/project/workspace` with a normal Leader session: development mock-on showed exactly one notice fitting at 390/768/1280/1440 CSS px, with the revision CTA still enabled. After restart with mock-off, the notice disappeared and GET `/projects/50004/review-gates/timeline` returned 200, preserving the real `NOT_CONFIGURED` result rather than showing sample Gate data. No Gate mutation was performed. [Workspace browser evidence](../../../output/fe2-feedback-2026-10-26/g7/workspace-browser.json) and [five screenshots](../../../output/fe2-feedback-2026-10-26/g7/screenshots) record this follow-up; the older four-route screenshots above remain historical.
