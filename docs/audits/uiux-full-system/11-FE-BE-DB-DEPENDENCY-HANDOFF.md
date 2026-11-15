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
