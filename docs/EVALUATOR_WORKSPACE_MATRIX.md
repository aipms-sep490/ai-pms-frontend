# Phase 5 — Evaluator Workspace matrix

**Phase status:** `PARTIAL_ACCEPTABLE`. Assignment landing, direct route guard,
draft workflow and finalized read-only state are `VERIFIED_FE` against delivered
APIs. Authenticated browser acceptance is `BLOCKED_BY_CREDENTIAL`.

| Capability | Actor | FE Route | FE Status | Backend API | Assignment Scope | Evaluation State | Target | Authority Source | Concurrency | Gap | Classification | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Assignment landing | Lecturer with active evaluator assignment | `/evaluator/workspace` | Implemented | `GET /evaluation-assignments/my`; `GET /projects/{id}/evaluations` | Returned assignment only | `ACTIVE` assignment | Project/component IDs returned by API | Persisted `EvaluationAssignment` | Read refresh | No names/deadline aggregate | `VERIFIED_FE` | Counts derive only from returned assignments/drafts. Lecturer, supervisor and mentor alone have no evaluator authority. |
| Direct assignment entry | Active assigned evaluator | `/evaluator/assignments/:assignmentId` | Fail-closed | Paged `GET /evaluation-assignments/my` | `COMMON`, `MAJOR_SPECIFIC`, `INDIVIDUAL` exactly | Current active assignment | Assignment ID | Persisted active assignment collection | Refresh removes access | No canonical assignment-detail / revoked-vs-not-found response | `BE_HANDOFF_REQUIRED` | URL never grants authority. |
| COMMON evaluation | Assigned evaluator | Assignment detail | Implemented | Draft/evaluation endpoints | `COMMON`; no target selector | Returned draft/finalized state | Project component | Assignment + mutation guard | Draft token | Scoped package/evidence is a separate `BE-AW-007` surface | `VERIFIED_FE` | No client filter is represented as security. |
| MAJOR_SPECIFIC evaluation | Assigned evaluator | Assignment detail | Implemented | Exact draft/evaluation endpoints | Exact returned `majorId` | Returned draft/finalized state | Returned major ID | Assignment + mutation guard | Draft token | Scoped package/evidence is a separate `BE-AW-007` surface | `VERIFIED_FE` | No major switching control exists. |
| INDIVIDUAL evaluation | Assigned evaluator | Assignment detail | Implemented | Exact draft/evaluation endpoints | Exact returned `studentId` | Returned draft/finalized state | Returned student ID | Assignment + mutation guard | Draft token | Scoped package/evidence is a separate `BE-AW-007` surface | `VERIFIED_FE` | No student switching control exists. |
| Draft create/read | Assigned evaluator | Assignment detail | Implemented | `POST /evaluation-assignments/{id}/evaluation`; `GET /projects/{id}/evaluations` | Backend guard | `DRAFT` | Guarded assignment | `EvaluationDraftWorkflow.Eligible` | Server-issued token | Lookup is indirect | `VERIFIED_FE` | 403/409 safely reload; no optimistic draft. |
| Leaf scoring/save | Assigned evaluator | Assignment detail | Implemented | `PUT /evaluations/{id}/draft` | Backend assignment/rubric scope | `DRAFT` | Backend returned leaf criterion | Backend validation | `concurrencyToken` | Full hierarchy absent | `VERIFIED_FE` | Input is retained on failed/stale save; parent/group inputs are never created. |
| Finalize | Assigned evaluator | Assignment detail | Implemented | `POST /evaluations/{id}/finalize` | Backend assignment/rubric scope | Backend decides finalizability | Current draft | Finalization workflow | `concurrencyToken` | No `canFinalize` read field | `VERIFIED_FE` | CTA requests server validation; it is not enabled from client completeness. |
| Finalized state | Assigned evaluator | Assignment detail | Implemented | `GET /projects/{id}/evaluations` | Returned assignment | `FINALIZED` | Finalization snapshot | Backend finalization snapshot | N/A | Reopen unsupported | `VERIFIED_FE` | Inputs read-only; no edit/reopen CTA. |
| Final package / evidence | Assigned evaluator | Assignment detail | Fail-closed | Existing `GET /projects/{id}/final-submission` is project reader scoped | Not proven per assignment | N/A | Common/major/student unknown | Backend contract insufficient | N/A | `BE-AW-007` | `BE_HANDOFF_REQUIRED` | New workspace shows no package files/evidence. |
| Rubric hierarchy | Assigned evaluator | Assignment detail | Leaf-only | Evaluation draft returns leaf scores + version | Assignment rubric | Draft/finalized | Returned leaf criteria | Draft DTO | Draft token | `BE-AW-008` | `FE_COMPLETE_BE_BLOCKED` | No hierarchy is reconstructed client-side. |
| Project/Student result | Department governance / authorized readers | No Evaluator CTA | Not implemented by design | Project/student result APIs | N/A | Published result only | Project/student | Result endpoint | Publication token | Evaluator read authority not delivered | `OUT_OF_SCOPE` | Evaluator cannot publish or locally determine results. |

## Error and authority behavior

- `401` is a session boundary; `403` or a missing active assignment denies the direct view.
- `409` preserves local score/comment values, reloads the latest authoritative draft and never replays save/finalize.
- Assignment, draft and landing draft summaries settle independently. A failed read is never rendered as an empty list.
- No global `EVALUATOR` identity role was added. Navigation is contextual and only follows a persisted active-assignment read.
