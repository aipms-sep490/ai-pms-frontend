# 144 route declarations — discovery complete, interaction audit incomplete

The machine-readable [screen inventory](02-SCREEN-INVENTORY.csv) has one row per actionable `src/app/router/index.tsx` declaration at FE `7e21521b`. Its `Module` is the **first URL segment**, a navigation grouping rather than a verified domain boundary. `NearestScopedGuard` is the nearest role/project guard recorded by the older census; `AuthAncestry` separately identifies the parent `ProtectedRoute`. This distinction corrects the older `Public / Authenticated` label for protected `/industry` and `/profile` paths. The conditional enrollment route has its own component guard and was not exercised.

| Discovery | Count | Runtime proof |
| --- | ---: | --- |
| Public auth routes | 3 | Rendered locally; end-to-end auth not proven |
| Conditional enrollment | 1 | Flag/guard not tested |
| Routes under `ProtectedRoute` | 140 | No authenticated browser session |
| Total declarations | 144 | All have route/component/source mapping |

`ProjectMode`, `ProjectState`, main goal/action, FE logic, API, SRS/SDD trace and problem IDs remain explicit `NOT_VERIFIED`/`NOT_AUDITED`/`NOT_TRACED` where not inspected route by route. This is **100% declaration discovery**, not 100% screen assessment. Dynamic `:id` routes require valid fixture IDs and wrong-ID tests; tabs, dialogs, drawers and feature flags also need a separate action matrix. An existing `docs/uiux/SCREEN_SOURCE_CUES.generated.csv` is a lexical cue, not behavioral proof.

## Per-screen completion record required in next browser pass

For each row fill role/mode/state, current structure, actions, expected and actual result, route/API/DTO/authorization/persistence trace, network/console, screenshot, UI/responsive/a11y/business issue, priority, regression test and acceptance. Public auth pages have only a render observation. All other action rows remain untested or blocked; no empty screen or broken button is inferred from absence of a session.

Source issue `AUD-002`: the previous `docs/uiux/ROUTE_TEST_MATRIX.md` assigns a generic 401/403/404/409 state set to every route; applicability must be derived from action and actual endpoint before execution. Route guard code itself is not adjudicated by this metadata finding.

## Authenticated read-only sweep added later

Local Chromium attempted 148 role/route combinations covering 116 distinct route patterns from this inventory at 1440×900. The sweep navigated, observed URL, main/heading, page exceptions, document overflow and API statuses; it did **not** exercise every control, authorized write, persistence or full academic transition. Six route patterns exposed reproducible 500 dependencies and are recorded as RUNTIME-001–003. Admin deep links exposed RUNTIME-004, a FE–BE permission mismatch. Several routes intentionally resolved to NotFound because their feature flag was off; other 403/404 outcomes require fixture/scope adjudication. No page exception or document horizontal overflow was observed in the attempted samples. The precise per-run counts and limits are in `15-AUTHENTICATED-RUNTIME-SWEEP.md`.

The CSV preserves the original per-screen *pre-runtime* classification and does not promote any route to `VERIFIED_WORKING` from navigation alone. It remains the 144-route discovery ledger; `16-ROUTE-RUNTIME-MATRIX.csv` is the per-screen runtime supplement with attempts/status/HTTP paths stripped of UAT IDs. Its 28 route patterns not reached by this sweep still need account/state/fixture-specific testing.
