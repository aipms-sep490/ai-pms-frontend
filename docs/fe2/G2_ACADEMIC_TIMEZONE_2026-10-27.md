# G2 — Vietnam time for academic period and policy forms

27/10/2026, Asia/Saigon. Branch `fix/fe-academic-period-utc`, baseline develop `4d2b90cdcafbf12995a3497bb9f37b53a9e0b253`. The user authorized continuing G2 while the leader audits the earlier PRs. That authorization does not assert that every Checkpoint B criterion has passed or that the leader has approved those PRs.

## Behavior

Period creation/editing and policy draft/successor/publish-end inputs now use the existing `toUtcDateTime` helper: `2026-10-24T00:00` Vietnam time becomes `2026-10-23T17:00:00.000Z`. `localDateTime` reads instants back into controls, including UTC datetime2 responses without an offset. `dateTimeLabel` renders both screens in Vietnam time. The shared FE1 helpers are imported without modification.

Semester dates are DateOnly values, not instants. Their write/input values remain YYYY-MM-DD and their display is formatted directly as DD/MM/YYYY, without a host-timezone Date conversion. Labels for period and policy timestamps explicitly state “giờ Việt Nam”. Policy validation compares instants normalized from Vietnam input; server-effective policy selection, capabilities, version checks, concurrency tokens, confirmation and publication authority remain server-controlled.

There is no raw parsing of backend or datetime-local values with `new Date(value)`, no host `getTimezoneOffset`, and no local `toLocaleString` formatter left in the module. **The remaining two no-argument Date constructions serialize the current clock to UTC** for successor initialization and immediate publication; these are absolute current instants, not local-string parsing. Hiding those clock operations in another helper solely to make a grep empty would not change correctness.

Existing stored periods are not migrated or shifted. A legacy bare timestamp representing00:00UTC now correctly displays07:00 Vietnam time; this fix cannot infer that an old author may have intended00:00 Vietnam time.

## Verification

| Check | Result |
|---|---|
| Regression before product changes, UTC | 7 failing /2 passing cases demonstrate the old form/display behavior |
| Academic timezone/governance/policy tests | 3 files /19 tests PASS in each of UTC, Asia/Ho_Chi_Minh and Asia/Tokyo |
| Full suite | 268 files /1488 tests PASS |
| Typecheck / lint / build / diff | PASS; lint210 existing warnings; existing large-chunk and jsdom-navigation notices |

The nine new cases exercise real components and submitted payloads, UTC/bare/explicit-offset input, three successive governance and policy round trips, DateOnly preservation, server-effective successor availability and immediate-publication UTC serialization. Publishing is a controlled test, not a staging publication.

The normalized lint set matches the baseline: the one additional warning relative to the G4 branch is the pre-existing NotificationRow mixed-export warning that G4 removes. No G2 warning was added. No dependency or API contract was changed.

## Normal UI / real staging

Only new labeled fixtures were created through Admin forms in the test organization:

- Semester30003, code `DST-G2-261027`, remains DRAFT.
- Period30007, code `DST-G2-MIDNIGHT`, remains DRAFT; input24/10/2026 00:00 to30/11/2026 00:00 Vietnam time. POST201 persisted23/10 17:00UTC and29/11 17:00UTC.
- Effective policy version1 is initialized by the existing BE service. Both screens show00:00 24/10 and00:00 30/11, and the successor control was enabled before a draft existed.
- A separate successor policy20008/version2 was saved as DRAFT. No PUBLISH operation was performed. Its presence correctly disables creating another successor.

Three period updates and three policy-draft updates were performed via the normal UI with browser JavaScript timezone overrides Vietnam, UTC and Tokyo. Every response was200; every request retained the exact same UTC endpoints, every control retained the entered Vietnam midnight, and concurrency tokens came from fresh reads. CDP changes only the owned browser's timezone; Windows settings were not modified. Process-TZ test runs separately cover the three runtime zones.

Admin governance, period editor and policy editor are recorded at390/768/1280/1440px, with measured page widths. Department Staff has no structure-add/edit controls; attempting to read this fixture's policy returns403 with an explanatory UI. That is a denial probe, not successful policy access or a reason to relax scope. No DB/auth bypass, API-created fixture, intercepted response, live result publication or existing academic-record mutation was used.

The labeled DRAFT fixtures are retained for audit/replay. Evidence is outside Git at `E:/DOANTOTNGHIEP/output/fe2-feedback-2026-10-26/g2/`: creation request/responses, period/policy three-zone round trips, before snapshots, viewport JSON, screenshots and technical logs. The accompanying Phase C report distinguishes these actual writes from controlled tests. This branch does not copy unmerged G5 error handling; both tasks touch the two academic pages, so integration must preserve both concerns and the updated accessible field labels.
