# Test execution and evidence boundary — 15/11/2026

FE `7e21521bfc8a0ae1b12abf54fe0ad029ea442bd2`; BE `8aec4db3112d56b06f4509e49291f4d530b5e7ef`. No product source or academic data was changed for this audit.

| Evidence layer | Executed result | What it does not prove |
| --- | --- | --- |
| Route discovery | 144/144 router declarations mapped into `02-SCREEN-INVENTORY.csv` | Reachability, role scope, controls or workflow completion |
| Public browser | Login at 360/390/1440; forgot/reset at 390; 3 unique routes, 5 captures | Password recovery write, Google callback, full a11y |
| Local FE–BE password login | Representative single-major student, interdisciplinary student, lecturer, department, admin entered expected landing routes | All 27 fixture accounts, every role assignment and academic state |
| Authenticated Chromium read-only sweep | 148 navigation attempts, 116 distinct route patterns, 1440×900; no uncaught page error or document horizontal overflow in sampled views | Every visible control, all data loads, persisted mutation, keyboard/mobile, 28 unvisited route patterns |
| Network + SQL metadata | Three repeatable 500/schema mismatch areas H-006–008. UAT metadata SELECT with `ApplicationIntent=ReadOnly` confirmed missing tables/columns. Admin evaluator route also yielded a source-confirmed permission mismatch H-009. | Migration safety/application, data correctness after migration, remaining 403/404 semantics |
| Targeted FE component tests | 5 files, 47/47 pass: chat dock/thread, notifications, project review, student Gate timeline | Authenticated BE, DB, realtime or full lifecycle |
| BE integration suite and academic writes | Not run; local API background email/realtime workers disabled | Gate/COLD/committee persistence, notification delivery, write validation |

The `runtime-*.json` raw sweep files were retained only in a **local, uncommitted evidence archive** because route IDs come from UAT. They are not product fixtures or full E2E test results. The committed summary `15-AUTHENTICATED-RUNTIME-SWEEP.md` removes those IDs.

## Remaining completion gates

1. Controlled UAT schema reconciliation by BE/DB owner, then repeat affected GETs with permitted and denied actors. No migration was applied here.
2. Reconcile project scope provenance for 403s; distinguish expected denial from FE misrepresentation.
3. Test all unvisited route patterns, dialogs/drawers/tabs, and every visible action with each relevant role, project mode and state; record 401/403/404/409/422, refresh/readback and browser Back/Forward.
4. Run 360/390/768/1024/1366/1440/1920 widths, zoom, keyboard, screen reader and reduced motion on authenticated paths.
5. Test academic writes only on explicitly isolated fixtures after policy approval. Never call a read-only route sweep `VERIFIED_WORKING` for a full workflow.
