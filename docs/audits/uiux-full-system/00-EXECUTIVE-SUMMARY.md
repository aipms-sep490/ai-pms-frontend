# AI-PMS full-system audit — current checkpoint (15/11/2026)

## Verdict and denominator

This is an **in-progress, audit-only checkpoint**, not full-system acceptance. The FE router declares 144 actionable routes and `02-SCREEN-INVENTORY.csv` records all 144. Three public routes were opened in Chromium at mobile and desktop widths. A subsequent local FE–BE run against a configured UAT database logged in representative student, lecturer, department and admin accounts and made **148 authenticated route attempts across 116 distinct route patterns**. These are read-only render/network probes, not 116 completed screen/action or workflow tests. Controlled fixture tests do not change that distinction.

Three reproducible **schema integration failures** affect the department document list, rubric/Gate template reads, and evaluator assignment detail: the BE branch queries UAT tables/columns that are absent. A fourth FE–BE permission mismatch exposes admin evaluator management while BE returns 403; the correct admin academic authority needs a policy decision. See `04-INTERACTION-AND-FUNCTIONAL-DEFECTS.md` and append-only `11-FE-BE-DB-DEPENDENCY-HANDOFF.md`. Two audit-source inconsistencies also remain: outdated teal brand guidance and misleading older route/test metadata.

Current FE/BE code contains substantial implementation for one lifecycle, Review Gate 1–3 reviewer panel, COLD committee binding, Office preview, role workspaces and chat. These remain `IMPLEMENTED_NOT_E2E_VERIFIED` wherever this checkpoint lacks a role session, persisted data and readback.

## Immediate audit sequence

1. Reconcile the three missing schema areas on an approved UAT copy, with backup, migration verification and rollback. The audit made no DB mutation. Keep background email/realtime workers off during local probes.
2. Complete the route/action matrix role by role, recording 401/403/404/409/422, refresh/readback, screenshots, console and network evidence. Keep untested actions `NOT_TESTED` or `BLOCKED`.
3. Trace the highest-risk handoffs first: registration → approval → supervisor; Gate evidence → two assigned reviewers → revision; locked final/COLD → confirmed defense committee → scoped scoring → result publication.
4. Resolve source-of-truth questions in `13-OPEN-ACADEMIC-POLICY-DECISIONS.md` before any rule or score change. Use `10-PRIORITIZED-IMPROVEMENT-ROADMAP.md` for separately authorized implementation.

## Current measurable coverage

| Measure | Result |
| --- | ---: |
| Discovered routes | 144/144 declared routes |
| Public routes opened in Chromium | 3/3 public auth routes |
| Authenticated read-only route attempts | 148 across 116 distinct patterns; several flag-disabled/redirected |
| Authenticated action E2E with FE–BE persistence | 0; no write/readback test |
| Public viewports captured | 5 route/viewport captures |
| Verified runtime findings | 3 schema failures (P1), 1 FE–BE permission mismatch (P2) |
| Verified audit-source inconsistencies | 2 |
| BE/DB handoff | 3 schema deployment mismatches; 1 admin policy/permission decision |
| Targeted FE unit/component tests | 47 passed across 5 files; fixture evidence only |

The remaining categories are **unscored** until the schema and representative academic-policy fixtures permit full browser journeys.
