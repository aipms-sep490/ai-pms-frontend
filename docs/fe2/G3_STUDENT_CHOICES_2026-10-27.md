# G3 / UX-06 — distinct student and major choices

27/10/2026, Asia/Saigon. Branch `fix/fe-student-choice-labels`, baseline develop `4d2b90c`. G3 is split as the plan requests: this PR handles identity/loading/retry; the result-formula change is separate and depends on BE-15 for live formula metadata. No score formula or publication authority changes here.

## Root cause and behavior

`ResultPublicationPage.tsx:26-38` derives student names only from individual assignment metadata. Real project50003 has a published COMMON-only scheme: both roster students exist but there is no student-targeted assignment to populate that map. The old panel consequently rendered two identical unnamed options. The authorized academic-review endpoint already returns their names in the frozen registration evidence. Its current member DTO has only `userId`, `fullName`, `majorId`, `isLeader`; it does **not** expose a student code.

`EvaluatorAssignmentManagementPage.tsx:84` used that frozen source already, but fired it without loading/error/retry state and silently swallowed failures. It could also accept a late name response after the project changed.

Both surfaces now reuse one focused frozen-name loader. Choices always start with `Sinh viên #<id>`, followed by the available name, so duplicate names and missing names remain distinct even in a narrow select. The same exact identity is used in the student publication confirmation. Student codes are not invented or inferred from names; the #ID fallback is used because the current authorized DTO lacks codes.

While names load, individual selection and the corresponding submit/preview path are disabled with a visible status. A denied/failed lookup explains the reason in Vietnamese, retains distinct ID choices and offers a real label-only retry. A request generation tied to project/token/retry rejects stale responses; no request is made per student. Development StrictMode may run the mount read twice; no claim of request caching or deduplication is made.

Unnamed majors use `Ngành #<id>` in choices and coverage labels. The existing frozen-major filter remains intact: choosing an individual component for major101 cannot select a student from major102. Candidate lookup, assignment/revoke authority, roster source, preview token, confirmation and server publication blockers remain unchanged. No new dependency, shared UI primitive, FE1 source or API contract was modified.

## Checks

| Check | Result |
|---|---|
| Targeted panel/assignment | 2 files /14 tests PASS |
| Full suite | 267 files /1485 tests PASS |
| Typecheck / lint / build / diff | PASS; lint210 existing warnings, no new normalized diagnostics |

Tests retain preview-token confirmation, selected-student reset, capability denial, candidate validation and frozen assignment tokens. New cases cover delayed names, duplicate names, failed/denied reads with safe diagnostics and retry, late response after a project change, missing major names and retained major boundaries. Fixture mocks explicitly supply the name endpoint; a beforeEach fixture returns no cleanup function.

## Real browser evidence and limits

Normal Staff login, project50003: the two original indistinguishable options now show `Sinh viên #50003 · TEST P1 SE - Student 1` and `Sinh viên #50004 · TEST P1 SE - Student 2`. Academic-review GET returns200. Student preview GET returns200; `canPublish=false` and `DEMO_SCHEME_NOT_OFFICIAL` remain enforced. No publication was attempted.

The real assignment page permits the existing COMMON component to be selected and reads eligible evaluators. This fixture has **no published INDIVIDUAL component**, so delayed/error/duplicate/major-filter cases there are controlled tests, not a claimed live individual-assignment acceptance. No assignment was created or revoked to force a fixture. Admin can read the identity options but its result operation is explicitly denied; that is recorded as a denial, not an Admin result pass.

Staff result preview, Staff COMMON assignment and Admin label-with-denial states have390/768/1280/1440px screenshots and page-width measurements:12 probes without horizontal overflow. Native option lists and raw response metadata are recorded in JSON; no DOM was altered for a screenshot. The old50/50 wording still appears in this identity-only branch and is corrected by the separate G3 formula PR.

Evidence outside Git: `E:/DOANTOTNGHIEP/output/fe2-feedback-2026-10-26/g3-labels/`. The before capture uses the G2 checkout, whose result/evaluator files are identical to develop4d2b90c; the after captures use this branch. Browser probes use normal login and real staging, without auth bypass, response interception, DB changes or write requests.
