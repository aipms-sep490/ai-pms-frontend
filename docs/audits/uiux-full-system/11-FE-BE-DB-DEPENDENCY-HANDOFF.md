# FE–BE–DB handoff duy nhất (append-only)

Quy ước: Mỗi phát hiện cần BE/DB mới phải thêm bản ghi bên dưới, giữ lịch sử, nêu HTTP/DTO/actor/scope/state/persistence/test. Không xóa hay sửa quyết định cũ; ghi supersedes nếu có thay đổi. FE không tự suy quyền hay sửa điểm/state.

## 2026-11-15 — baseline audit

**Handoff cần hợp đồng BE/DB mới đã xác minh: 0.** Chưa có FE–BE authenticated runtime và DB readback. Các mục dưới đây là **kiểm tra hợp đồng đang có**, không phải yêu cầu endpoint mới:

| ID | FE → BE hiện có | Cần xác minh | Quyết định hiện tại |
| --- | --- | --- | --- |
| H-001 | `StudentReviewTimelinePage.tsx` → `review-gates-api.ts` → BE `ReviewGateService.cs` | Hai reviewer Gate 1–3, version minh chứng, revision/resubmit, 403/409/422, notification/readback | `VERIFY`; không thêm trạng thái Gate |
| H-002 | `EvaluatorAssignmentDetailPage.tsx` → assignment/COLD/Defense API → `DefenseCommitteeBinding.cs`, `ColdEvaluationBinding.cs` | Cùng committee confirmed, active assignment, scope, conflict supervisor, locked package | `VERIFY`; no global-role shortcut |
| H-003 | `ProjectReviewPage.tsx` → project review API → `ProjectRepository.Hybrid.cs` | Quyết định khoa tham gia, version, chỉ lead approval cuối khi đủ điều kiện | `VERIFY`; không bypass ở FE |
| H-004 | `GateSessionScriptModal.tsx` và API functions → `GateSessionScriptsController.cs` | DTO mapping hiện tại, verdict script vs Gate final; xác nhận UI nào đang gọi API | `VERIFY`; component mẫu `ReviewGateModeConfigPanel.tsx` chưa nối route |
| H-005 | Notifications/chat UI → API hiện có | Unread count server, event/readback, assignment-scoped recipients; gửi/đọc đa phiên | `VERIFY`; không tuyên bố realtime từ unit fixture |

Nếu sau khi chạy E2E phát hiện thiếu contract, thêm mục `H-006+` với repro, endpoint, DTO trước/sau, authorization, transactional boundary, migration và acceptance. Không mở BE/DB task từ suy đoán giao diện.

## 2026-11-15 — authenticated local FE–BE/UAT append

The baseline above describes the earlier no-API checkpoint. Password authentication subsequently succeeded through local FE and BE. The following are **existing migration deployment gaps**, not requests to invent an endpoint or change an academic rule. UAT metadata was queried with `ApplicationIntent=ReadOnly`; no migration or data write ran.

| ID | Reproduction and affected actor | Contract and root cause | Controlled handoff and acceptance |
| --- | --- | --- | --- |
| H-006 / RUNTIME-001 | Student `/project/templates` and department staff `/department/documents`: GET `/api/v1/academic/department-documents` → 500. | BE entity expects `dbo.department_document_templates`, absent in current UAT (`OBJECT_ID=0`). The route/DTO already exist; `db/changes/20261115_department_document_templates.sql` is present on BE branch. | DBA/BE owner: backup and review migration dependencies/permissions, apply to approved UAT target, verify table/index/FK and list 200. Then test actor scope, upload/publish/download, persistence and unauthorized denial. No FE mock fallback. |
| H-007 / RUNTIME-002 | Department staff `/academic/rubrics`, `/department/projects/progress-matrix`: GET `/api/v1/rubrics` or `/api/v1/academic/gate-templates` → 500. | Current UAT `dbo.rubrics` lacks `project_mode`, `approval_reference` and other scope columns (read-only metadata), while `AipmsDbContext.Rubrics.cs` selects them. Migration `db/changes/20261030_add_rubric_scope_fields.sql` exists. | Reconcile the complete migration in a controlled UAT release, not one ad hoc column at a time. Verify GET 200 for scoped staff and expected 403 outside scope; then version, validation, approval and readback. |
| H-008 / RUNTIME-003 | Assigned lecturer `/evaluator/assignments/:assignmentId`: GET `/api/v1/evaluation-assignments/{id}` → 500. | BE loads `dbo.rubric_criterion_levels`, absent in UAT (`OBJECT_ID=0`); migration `db/changes/20261030_add_rubric_criterion_levels.sql` exists. | Reconcile migration with rubric criterion FK and indices, then repeat assignment detail/evidence/scoring read-only checks and only later authorized write/readback UAT. |

Observed 403s on project-scoped evaluation/defense pages are **not** authority to broaden roles. `AcademicAuthority.HasScope` checks active, frozen registration scope and department membership. H-009 remains `VERIFY`: inspect the persisted UAT project scope provenance, intended actor and 403 payload before proposing a rule/contract change.

## 2026-11-15 — later admin route append

**H-009 / RUNTIME-004:** The actual admin route `/admin/projects/:projectId/evaluators` mounts `EvaluatorAssignmentManagementPage` and requests GET `/api/v1/projects/{id}/evaluation-assignments`. An authenticated admin fixture receives 403 on that GET; BE `EvaluationDraftWorkflow.Assignments` → `AcademicAuthority.HasScope` currently requires a department staff actor with active frozen registration scope. This is a verified **FE route versus BE permission mismatch**, while the proper admin academic authority remains a **policy decision**. Do not expand admin grading rights solely to make the route load. If admin oversight is intended, present scoped read-only project information and suppress the evaluator management affordance; if admin may manage assignments, define a BE permission and audit trail for that scope, then test allowed and denied actors. The earlier H-009 scope check remains open for department/supervisor 403s.

## 2026-11-15 — implementation append (supersedes admin-read part of H-009)

The user authorized code after the audit. On `feat/be-access-audit-20261113`, `AcademicAuthority.CanReadAssignments` permits active `ADMIN` to read a specified project's assignment list; the assignment repository already limits this read to that project. `Assign` and `Revoke` still require frozen department scope, and `manage_evaluators` remains false for the admin-only account. On `feat/fe-fresearch-reference-20261113`, the admin route presents a capability-driven oversight label and hides mutation controls when BE denies management. A dual-role admin + department staff retains management if BE grants it. This does not change grade, committee or academic decision authority.

Local BE against the configured UAT DB returned 200 for the admin fixture's project assignment GET and `manage_evaluators=false`; five admin project routes rendered in headless Chromium with no redirects or page exceptions. The result route's result GET returned 404 for this fixture, so result publication is **not** verified. The three schema gaps H-006–H-008 remain open for controlled deployment; a read-only BE preflight script reports all 11 absent required objects/columns. Department and supervisor scoped 403s remain unadjudicated as described above.

FE document and rubric screens now distinguish failed list reads from genuine empty lists. Department upload and status changes report success only after matching server readback; a pending upload is blocked from duplicate submission until its server ID appears. These are component-test and source-level improvements, **not** evidence that UAT document/rubric write flows work before schema reconciliation.

## 2026-11-16 — isolated BE integration follow-up

The BE branch's ordered migrations bootstrapped and replayed on an owned local SQL Server database. A baseline-upgrade test exposed a batch-compilation failure in the already published `20261114_confirm_defense_committees.sql`; BE now adds `20261113_prepare_defense_committee_columns.sql` ahead of it while preserving the original file checksum. The schema-parity upgrade test passes. The BE academic preflight checks 34 tables/columns/indexes/foreign keys/check constraints: `READY 34/34` on the isolated DB and `NOT_READY 34/34` on the configured UAT target. A deliberately disabled constraint on the owned DB produced `NOT_READY 1/34`, then returned to `READY` after restoration.

Scoped BE integration tests passed for 124 evaluation/rubric/document/Gate cases and 63 COLD/committee/Gate workflow cases after the legacy generic-scoring test fixture was explicitly marked `ON_GOING`; no production scoring or defense authority changed. FE code needs no mock or new endpoint for these findings. The remaining FE acceptance gate is still a controlled UAT schema release followed by authenticated readback, mutation and role/scope journey tests. Do not treat local fixture success as UAT completion.
