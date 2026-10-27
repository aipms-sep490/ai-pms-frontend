# G8 — knowledge management audit follow-up

Branch `fix/fe-knowledge-admin-hardening`, from fresh `origin/develop` `4d2b90cdcafbf12995a3497bb9f37b53a9e0b253`. Completes B1–B5 of FE_DEV_2_REMAINING_2026-10-27.md; no BE/source/config/DB changes, no FE1 or shared primitive edits.

## Behavior

- Publish and retire use the existing action confirmation, identify the document and explain consequences. Cancellation sends no request. Success follows the server response; reads refresh afterward. A synchronous in-flight guard prevents replay/duplicate actions. Unknown/retired statuses offer history only.
- All knowledge HTTP operations move into `academic-knowledge-api.ts`; DTOs move to `types/backend/academic-knowledge.backend.types.ts`. Existing `getMyProfile`, governance semester/period functions and `readAllPages` are reused. No flat department reader existed: the new typed reader consumes the actual paged contract and all pages.
- Live testing found the page crashed with `departments.find is not a function`: the old view expected an array, while staging and DepartmentsController return PagedResult. The existing test's department fixture is corrected to that observed envelope; its original department/save/no-auto-publish assertions are retained.
- Module error mapping uses code/status/action only. `AI_KNOWLEDGE_DISABLED` has a specific Vietnamese explanation; 401/403/404/409/400/422 have safe instructions. No raw detail, field prose, or trace ID reaches the UI. Allowlisted validation fields get Vietnamese accessible errors. Network/5xx offers a read retry; it never replays a mutation. Uncoded409 stays a general prerequisite/state instruction, not an asserted exact cause.
- `toUtcDateTime` interprets inputs as Vietnam time. Both labels state this explicitly. `dateTimeLabel` renders publication history in Vietnam, including bare server UTC. There is no existing version-edit hydration path: new-version inputs intentionally start blank, so no server timestamp is parsed into an edit input. Invalid date ranges retain entered values and send nothing.
- Loading/denied reads remain distinct from an empty catalog. Failed configuration cannot enable writes; read retries preserve the draft form.

## Validation

23 targeted tests across two files pass separately under UTC, Asia/Ho_Chi_Minh and Asia/Tokyo. Coverage includes the original staff draft save, both publish/retire cancellation and confirmation paths, pending server response, versions, dates, reindex/history, initial permission denial, disabled-feature code, safe422 fields, network read retry and denied/retired/unknown states.

Full suite: 268 files / 1,501 tests pass (`VITE_API_BASE_URL=/api/v1`, `--maxWorkers=4`). Typecheck, lint, build and diff check pass; lint retains209 existing warnings. No dependencies added. Product/API/types/test concern stays in five files plus this handoff.

## Staging evidence and cleanup

Admin and Department Staff visited `/academic/knowledge` at actual innerWidth390/768/1280/1440, no horizontal overflow. Publish confirmation at all four widths: Escape cancels without a write and restores opener focus. Retire cancellation/focus checked at390 and1440. History has four viewport screenshots.

Only the new, clearly labeled IT DEMO document `10002` (`DST-G8-20261027 · Tài liệu DEMO để kiểm thử`) was mutated. DraftDST-1 was created through Staff UI, published after confirmation, reindexed, and superseded byDST-2 after a second confirmation; history confirmsDST-1 RETIRED andDST-2 PUBLISHED. DST-2 was entered at midnight Vietnam with browser timezoneUTC and read back as previous-day17:00 server UTC. A third draftDST-3 entered with browser timezoneAsia/Tokyo has captured request `effectiveFrom=2026-10-23T17:00:00.000Z`, `effectiveTo=2026-12-30T17:00:00.000Z` for inputs24Oct/31Dec midnight. Finally the document was retired through confirmed UI; only History remains. Draft/history are retained for audit, the document is excluded from assistant retrieval. No official/pre-existing document was published or retired.

Three distinct errors were reproduced before the error mapper: Staff foreign-document history403, missing-document history404 (supplemental authorized reads), and duplicate-version409 via UI on the owned DEMO. Publishing that DEMO without a draft later produced another409; the UI displays Vietnamese prerequisites with no retry. Responses have no stable business code. Raw JSON/probes/screenshots are in the external audit bundle `output/fe2-feedback-2026-10-26/g8/` and `audit-network.json`.

Limits: staging KnowledgeEnabled is currently on. `AI_KNOWLEDGE_DISABLED`, expired session, network5xx, field422 and inaccessible initial catalog are controlled tests where live reproduction was unavailable. No BE config was toggled. BE must agree stable codes for duplicate version, missing draft and retired document; FE does not parse detail. G10 remains dependent on merged FE PRs and deployed BE-15/16.
