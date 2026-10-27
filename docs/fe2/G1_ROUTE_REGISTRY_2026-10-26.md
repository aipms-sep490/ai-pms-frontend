# G1 — navigation agrees with role guards

26/10/2026 (Asia/Saigon). Branch `fix/fe-admin-progress-matrix-route` starts from updated `origin/develop` at `14d99810ce67d20345ac04ff0cbd1e3f8d8d3b4f` (PR #103 included). No unmerged G7/G9 changes were copied into this branch. Human checkpoint B review and PR merge remain separate actions.

## Problem and behavior

The registry advertised two destinations to identities the router rejected. Both fixes remove the unsupported menu identity; neither changes the route tree, role guards, department scope or backend permissions.

| Destination | Registry before | Registry after | Existing router boundary |
|---|---|---|---|
| `/department/projects/progress-matrix` | Department Staff + Admin | Department Staff | Department-only `RoleRoute`, then `DepartmentAcademicScopeRoute` |
| `/review/gate-assignments` | Lecturer + Department Staff | Lecturer | Lecturer-only `RoleRoute` |

The first follows DECISIONS Q3: Admin manages the platform and uses `/admin/portfolio` for its overview. The second was found by the requested general scan, has the same menu/guard mismatch, and needs only the same narrow metadata correction. Staff keep their department matrix; Lecturers keep their reviewer queue. Direct unauthorized URLs retain their existing guard behavior.

## Regression evidence

The plan's46-entry snapshot is stale. This baseline contains **47 registry entries**, of which **28 are always-visible**. The test derives cases from the registry and does not hardcode these counts.

`workspace-route-registry.test.ts` imports the actual `appRouter` and uses the existing `matchRoutes` / `RoleRoute` test pattern. Its fixture enables all11 conditional router flags, including COLD and academic knowledge, so disabled rollouts cannot hide the current conditional destinations from this check. For each enabled always-visible entry it:

- verifies an actual route resolves, rather than the wildcard not-found page;
- translates every identity role to its router role and checks it against **every** matched `RoleRoute`, preserving nested guard intersections;
- retains existing registry uniqueness and contextual-navigation checks, plus explicit Admin/Staff/Lecturer menu regressions for the two changed destinations.

Before changing the registry, the general scan failed on exactly the two rows above, and the two explicit navigation regressions also failed (**4 failed /32 passed**). After the two metadata corrections, the three targeted router suites passed **48 tests**. No further always-visible mismatch was found. This test checks route registration and identity boundaries; it does not replace real session, resource-scope, assignment or lifecycle authorization checks.

## Validation

| Check | Result |
|---|---|
| Before-fix regression proof | Expected4 failures identifying the two mismatches |
| Targeted router suites | 3 files /48 tests PASS |
| `pnpm typecheck` | PASS, exit0 |
| `pnpm lint` | PASS,0errors /209warnings; no diagnostics in modified files |
| `pnpm test --maxWorkers 4` | 266 files /1504 tests PASS, exit0; no reported failed tests or unhandled errors |
| `pnpm build` | PASS, exit0; existing >500kB bundle warning |
| `git diff --check` | PASS |
| Browser acceptance | PASS for the real-session menu/guard checks below;8 screenshots cover Admin/Staff at390/768/1280/1440px |

Tests use `VITE_API_BASE_URL=/api/v1`. They run against this branch's normal test mode, independently of the unmerged G9 acceptance profile. The passing full suite includes one jsdom informational `Not implemented: navigation to another Document` line. The Gate mock-default correction belongs to G7; it has not been cherry-picked here. Browser verification must explicitly use `VITE_USE_MOCK_REVIEW_GATES=false` and the real staging proxy, without treating unit-test mock fixtures as live evidence.

Root completed independent diff review and browser checks on this branch with real role sessions and `VITE_USE_MOCK_REVIEW_GATES=false`:

- All9 currently visible Admin sidebar items were clicked through the UI. Each reached its requested URL with the expected heading and no not-found page. The matrix menu was absent; entering its direct URL retained the existing redirect to `/admin/access`.
- Department Staff retained the matrix menu and opened `/department/projects/progress-matrix` through the UI with real200 responses; the unsupported reviewer queue menu was absent.
- Lecturer retained the reviewer queue menu and opened `/review/gate-assignments` through the UI. `/reviewers/me/gate-assignments?page=1&pageSize=20` returned200. No mock notice appeared.
- Eight PNGs capture Admin menu and Department matrix at real390/768/1280/1440px widths. This records the changed navigation surfaces; it does not assert that every pre-existing responsive interaction or resource mutation was exercised.

Technical logs and browser evidence belong to the separate local bundle `E:/DOANTOTNGHIEP/output/fe2-feedback-2026-10-26/g1/`, outside Git. [Before-fix proof](../../../output/fe2-feedback-2026-10-26/g1/registry-before-fix.log), [targeted tests](../../../output/fe2-feedback-2026-10-26/g1/router-targeted.log), [full tests](../../../output/fe2-feedback-2026-10-26/g1/tests.log), [typecheck](../../../output/fe2-feedback-2026-10-26/g1/typecheck.log), [lint](../../../output/fe2-feedback-2026-10-26/g1/lint.log), [build](../../../output/fe2-feedback-2026-10-26/g1/build.log). These links require the sibling local output directory; GitHub does not contain these artifacts.

[Admin menu clicks](../../../output/fe2-feedback-2026-10-26/g1/admin-menu-probes.json), [Admin access boundary](../../../output/fe2-feedback-2026-10-26/g1/access-probes.json), [Department menu/access](../../../output/fe2-feedback-2026-10-26/g1/department-menu-probes.json), [Lecturer queue](../../../output/fe2-feedback-2026-10-26/g1/lecturer-queue-probe.json), [screenshots](../../../output/fe2-feedback-2026-10-26/g1/screenshots).

Implementation agent did not commit, push, create/merge a PR or approve a checkpoint. Root completed final diff/browser review and owns commit/push/PR handoff. No router guard was widened.
