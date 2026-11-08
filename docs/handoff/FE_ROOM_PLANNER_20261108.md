# Floor 2–4 room planner handoff

Date: 2026-11-08

- Branch: `feat/fe-room-floor-locks-20261108`, based on `origin/develop` `b97e4aa6f5ebd64b1bb610af3651a74cce0f5442`. This is separate from the unmerged UI/UX branch `feat/fe-uiux-standardisation-20261106`; merge/reconcile that branch when it is ready.
- FAMS visual references: `F:\AI-PMS\c\docs\uiux\reference-screens\image234.webp` (Alpha floor 2), `image94.webp` (Gamma floor 2), and `image170.webp` (room cards). The app redraws the floor layout with AI-PMS room records; it does not embed the FAMS screenshot or assert architectural coordinates for floors 3 and 4.
- Route: `/academic/project-periods/:periodId/room-planner`, linked from Academic Governance when `VITE_ENABLE_DEFENSE=true`. Admin and department staff may open the route; BE enforces their scope.
- Flow: choose the date range (up to 32 days); choose a building and floor 2, 3, or 4; lock a room for the range or one room/slot on the selected day; run preview; inspect allocations and conflicts; apply only when every eligible project is allocated. Changing any exclusion clears the preview. Exclusions are sent in both requests and are never persisted.
- BE dependency: `feat/be-period-rooms-defense-workflow-20261107` at or after `491fa1f`. `GET /api/v1/rooms`; `POST /api/v1/project-periods/{id}/defense-sessions/auto-schedule/preview` and `/apply` with optional `exclusions: [{roomId,date,slotNumber}]`. `date:null,slotNumber:null` blocks the room for the whole requested range; date plus slot blocks that cell. Admin receives period-wide candidates, staff receives only its lead department.
- Current limit: the page schedules Gate 4 defense. Gate 3 review auto allocation and the final Gate 3 eligibility check for Gate 4 are separate pending BE capabilities. This page must not be presented as completed Gate 3/4 UAT.
- Verification: RoomFloorPlan interaction tests, RoomPlannerPage API round-trip test, defense/academic/router focused tests, typecheck and production build pass. Authenticated browser E2E against a migrated application DB remains pending.
