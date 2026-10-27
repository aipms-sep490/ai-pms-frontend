# A1 — notification targets for every recipient role

Review follow-up to PR #110, based on `175e359592a4691d4f650a96ef783183eac4cb44`. No router, role assignment or BE changes.

The previous resolver collapsed all identities through `getWorkspaceRole` before looking up a destination. An Admin/Lecturer lost the gate assignment link, and a Staff/Lecturer opened the department matrix instead of their reviewer queue. The router and menu already authorize any matching identity.

The resolver now checks every owned identity against the event's destinations. Default priority is student, lecturer, department, admin; policy publication explicitly prefers admin, department, lecturer, student. Admin alone still receives no academic proposal destination. The original single-role producer/legacy matrix and actual-router guard assertions remain intact.

Validation: 5 new cases failed before the implementation; all 75 resolver cases pass afterward, including eight multi-role/order/case variants. Full suite: 269 files / 1,559 tests pass with `VITE_API_BASE_URL=/api/v1`, `--maxWorkers=2`; typecheck, lint, build and diff check pass. The first simultaneous unbounded suite run hit unrelated UI timeouts; its log is retained, no assertions or timeouts were relaxed. The former primary-role test encoded the reviewed bug and was replaced with explicit multi-role expectations.

Runtime availability: staging Admin listed all 33 accounts; none has multiple roles. Multi-role proof is controlled unit/router coverage, not a staging UI PASS. Single-role live recheck and screenshots are recorded in the external audit bundle `output/fe2-feedback-2026-10-26/a1-a2/`.
