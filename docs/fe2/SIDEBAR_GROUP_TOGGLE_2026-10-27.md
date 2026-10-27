# Sidebar group toggle — user-reported follow-up, 27/10/2026

Branch `fix/fe-sidebar-group-toggle` starts from fresh develop `4d2b90cdcafbf12995a3497bb9f37b53a9e0b253`. This is the directly requested fix for the student's sidebar arrows; it does not alter navigation permissions, registry entries, FE1 pages or BE.

## Cause and behavior

`Sidebar.tsx:84` on the baseline expanded the active group from an effect depending on both `collapsedGroups` and `studentGroups`. The click updated collapsed state, then the effect immediately reopened the same group. `navigationItems` is also rebuilt on each render, so removing only the collapsed dependency would still reopen it.

The active group is now a stable string matched using the same segment-prefix rules as its NavLinks. A small route-reveal marker opens that group once for each pathname, including when context arrives later. Manual toggles, ordinary rerenders and loading/ready refreshes on the same route preserve the user's choice. Changing route, including Back/Forward and nested task paths, reveals only the destination group. Unrelated groups retain their chosen state. Similar prefixes such as `/project/tasks-other` do not match `/project/tasks`.

## Verification

- The reported issue was reproduced through normal staging login on `/project/timeline`: clicking the arrow left `aria-expanded=true` and the active link visible. Screenshot and probe saved before product changes.
- Three original regression cases failed before the fix. An additional controlled refresh-cycle regression caught reopening during context reload; the final route marker fixes that path too.
- Eight sidebar regressions pass using the actual navigation registry and auth/workflow/journey contexts. Existing AppLayout tests are unchanged; combined focused coverage is19 tests. Covers repeated arrow clicks, rerenders, matching destination, nested paths, Back, similar-prefix rejection, delayed context, context reload and returning from an ungrouped route.
- Full suite:268 files /1,487 tests pass with `VITE_API_BASE_URL=/api/v1`, `--maxWorkers=4`. Typecheck, lint and build pass; lint209 existing warnings (baseline210), no new warnings. Diff check passes; no new dependencies.
- Real Student UI, actual innerWidth390/768/1280/1440: all five groups close and reopen, including the active group. Arrow clicks preserve URL. Enter opens and Space closes. Mobile Escape closes the drawer and returns focus to its trigger.
- Real menu navigation to Tasks, Back to Timeline, then Forward: destination group opens; other collapsed groups remain closed. Mobile item selection closes the drawer. The browser check waits for the actual destination heading, not only the URL changing during a router transition.

Nine screenshots and structured probes are in `output/fe2-feedback-2026-10-26/sidebar/`. Requests use real staging authentication; no response mocks, auth bypass, database writes or academic state changes. This verifies sidebar behavior, not completion of G10 or full Review Gates/Tasks use cases. The fix remains on its own PR until the leader merges it.
