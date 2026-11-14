# Room planner FE integration — 14/11/2026

## Source and dependency

This FE work stays on `feat/fe-fresearch-reference-20261113` and depends on BE `feat/be-access-audit-20261113` at `bd7e41e` or a descendant. BE owns roles, frozen lead-department scope, gate eligibility, official slot/holiday rules, conflicts and concurrency. The FE reads and acts on those contracts; the FAMS/F-Research references influence layout only. No geographic map, physical floor geometry, invented room area or LMS class workflow is introduced.

## Role and screen flow

| Actor | Screen | Actions and readback |
| --- | --- | --- |
| Admin / department staff | `/academic/project-periods/:periodId/room-planner` | Configure period working days and holidays, manage catalog rooms, preview and publish Gate 3/4, change future Gate 3 schedule, approve/reject Gate 4 change requests. Each write is checked against a fresh GET before success. BE enforces organization/lead-department scope. |
| Assigned Gate 4 chair/secretary | `/lecturer/defense-sessions/:sessionId` from a defense notification | Read current schedule, available catalog rooms and request history; submit a change using an official 75-minute slot, or withdraw an owned pending request. A non-officer gets a read-only schedule when BE permits session read. |
| Student | Existing `/project/defense` and `/project/timeline` | View their own official defense/Review Gate schedule; no planner or change controls. |

Gate 3 and changed defense notification types now resolve to existing role-safe destinations. The room card view groups by BE building/floor and shows real code, capacity and status; it does not claim a surveyed floor plan. Network/403/409 errors, empty states and retry actions are visible. If a write may have succeeded but readback fails, the FE blocks duplicate submission until refresh.

BE accepts a subset of valid preview allocations in one atomic apply. When the preview contains unscheduled groups, FE requires an explicit checkbox naming how many sessions will be published and how many groups remain without a schedule. The success message repeats the remaining count after official readback.

The period calendar editor uses the BE weekday bitmask and holiday records, with a concurrency token. The 2025–2030 Vietnamese holiday loader is explicitly presented as a baseline: academic staff must verify Tet and compensatory days against the official annual calendar before using it to schedule. The loader is disabled while unsaved edits exist.

## Configuration and verification

`.env.room-planner-local.example` contains all 29 `VITE_*` keys from `.env.example`, with local API proxy, planner flag on, and chat/video flags off to match the isolated BE profile. Vite does not load `.example` directly. The FE contract lock/vendors 48 JSON examples from the BE working branch; check with `AI_PMS_BACKEND_DIR` pointing to that BE worktree and `AI_PMS_BACKEND_REF=HEAD`. Current CI checks BE `develop`, so contract drift remains a dependency gate until the approved BE merge occurs; no CI rule is weakened.

Verified locally: full Vitest 2,157/2,157 (324 files), later floor-view adjustments passed 10/10 focused tests, production build, and controlled Playwright 2/2 (desktop calendar/publish/readback and 390px 403/retry). Full lint exits 0; existing warnings outside the changed files remain. Targeted lint for new/changed defense screens reports no warning. Playwright uses intercepted fixture responses, not authenticated staging data.

Remaining release gate: deploy/migrate BE in the approved environment before enabling `VITE_ENABLE_ROOM_PLANNER` there, then run the 12 role-based BE-16 UAT scenarios with real authorized accounts and academic data. No PR, merge to `develop`, shared DB migration or deployment was performed here.
