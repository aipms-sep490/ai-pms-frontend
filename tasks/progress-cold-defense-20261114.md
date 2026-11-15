# Integrated progress / Cold / Defense delivery checklist

Source plan: `docs/uiux/AIPMS_PROGRESS_COLD_DEFENSE_INTEGRATED_PLAN_20261114.md`. This checklist tracks implementation evidence; an unchecked item is not DONE.

- [x] Source-level audit of the reference guide, BE/FE authority, route census, preview, chat and notifications.
- [x] Consolidated state/role/screen/Excel/preview implementation plan.
- [x] Updated interaction rules for progress, committee-scoped Cold, notification/chat, document preview, and business-specific dates.
- [x] Source-level audit report with evidence and maturity per capability: `docs/uiux/AIPMS_FULL_FLOW_CODE_AUDIT_20261114.md`.
- [ ] T0: Reconcile effective academic policy, current DB schema and isolated role fixtures.
- [ ] T1: Close the Gate 1–3 direct-PASS path and align Final Package prerequisites.
  - [x] BE regular Gate 1–3 PASS bypass closed; integration test added and compiled (commit `f756221`).
  - [x] Ran Gate/Cold/Defense integration cases against a uniquely named, automatically removed local SQL Server test database; not a shared UAT database.
- [x] T2: COMMON Cold target and leader lock authority through DB migration, BE contract, FE and isolated SQL tests (`20b864e`).
- [x] T3: Only confirmed Defense committee members receive Cold assignment/score authority and assignment notification; supervisor/mentor conflict and pinned committee checks (`20b864e`).
- [ ] T4: Common Cold-inclusive readiness in manual/auto scheduling and Defense scoring (`20b864e`); isolated SQL now verifies manual pre-Cold denial and auto-apply rejection after committee supersession, but full authenticated browser lifecycle acceptance remains open.
- [x] T5: Department document upload/publish/retire/download version flow and Gate/rubric workbook roundtrip (`71ae672`, `23b98c4`); document flow verified with isolated SQL, component tests and a controlled mobile browser fixture.
- [ ] T6: Authorized existing download paths plus bounded DOCX text/XLSX grid preview and safe fallback; browser acceptance and full DOCX layout conversion remain open.
- [ ] T7: Review the 140 baseline routes plus two document routes and consolidate role journeys while preserving deep links.
  - [x] Route-to-hub navigation proposal covers census indices 1–142; no route migration claimed.
  - [x] Keep student Cold and Defense navigation visible after `FINAL_SUBMISSION` (route tests and production build).
- [ ] T8: Standardize alerts, forms, dates, unread counts and compact chat dock.
  - [x] FE notification count retains last known value on transient error and refreshes on retry/visibility/poll.
  - [x] FE chat retains count on transient inbox error, clears on 403, and uses a smaller desktop dock without perpetual bounce.
  - [x] FE create-meeting form rejects past starts and equal end/start; existing-meeting edits remain available (13 focused tests).
  - [x] FE Defense manual form converts Vietnam time explicitly, rejects past/non-increasing times; room planner blocks past ranges before preview. BE independently rechecks schedule time and readiness.
  - [ ] Unified alert/form patterns and business-specific date rules across role screens.
- [ ] T9: Isolated DB and authenticated browser lifecycle acceptance for single and interdisciplinary projects.
- [ ] Final branch verification: BE/FE builds, focused tests, contract parity, status, and push both designated branches only.

## Evidence and limits, 2026-11-15

- Local SQL Server 2022 Express with unique `AI_PMS_TEST_<guid>` databases replaces the previously unavailable Docker daemon for isolated integration tests. The test fixture creates and drops its database. No shared academic database was changed.
- After the document migration: BE build and 1,329 unit tests passed; two department-document/Office integration tests passed on a unique local SQL database, including another department's denial. FE production build passed. Full FE suite reached 2,183/2,184; the sole presentation-contract failure caused by a raw XLSX table was fixed by using the shared `Table`, then the affected seven tests and build passed. One controlled mobile Playwright test passed.
- Office preview extracts DOCX paragraphs and XLSX cells as read-only content; it does not claim Word/Excel layout fidelity. It has a 5 MiB preview ceiling, bounded ZIP expansion and XML parsing, and truncates display after 200 paragraphs or three sheets × 100 rows × 20 columns. Larger or unsupported files keep the authorized download path.
- Full authenticated FE browser journey, 140-route consolidation and all role-specific date/form states remain unverified. Source changes and controlled fixtures do not establish production or shared-UAT acceptance.
