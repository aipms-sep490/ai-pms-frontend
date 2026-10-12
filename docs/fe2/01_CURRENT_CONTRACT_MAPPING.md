# FE2-01A — Current contract / authority / route mapping

Ngày 09/10/2026. Roadmap đã được người dùng duyệt và yêu cầu bắt đầu. Nhánh task: `docs/fe2-01a-contract-mapping-20261009`, tạo từ develop `3426d70e5f7f0320ee5c057ade39aca267cb0434` sau fetch. BE source: `3742760582a23e72c878fb61f1dadf225dfbca01`.

**SOURCE_MAPPING_COMPLETE / BE_FREEZE_PENDING**. Không gọi API live, không đọc DB, không thay code FE/BE. Source mapping không phải signed OpenAPI release hoặc academic approval. Các path dưới có prefix `/api/v1`.

## 1. Scheme contracts và trạng thái

| Method/path | Input / output | Authority / trạng thái |
| --- | --- | --- |
| GET /evaluation-schemes?projectId={p}; GET /evaluation-schemes/{id} | EvaluationScheme[] / EvaluationScheme | Manage: Admin hoặc staff có active project department scope |
| POST /evaluation-schemes | projectId, projectPeriodId, name, passThreshold, components[]; trả scheme, 201 | Manage + ComponentAuthority; FINAL_SUBMISSION/locked package, open period đúng semester, frozen roster/scope |
| PUT /evaluation-schemes/{id} | Fields như create + concurrencyToken trong body | DRAFT, token hiện tại; component rubric thuộc scope/semester và published; scope xuyên khoa chỉ Admin |
| DELETE /evaluation-schemes/{id}?concurrencyToken=... | Token query, encodeURIComponent; 204 | DRAFT, token hiện tại, component authority |
| POST /evaluation-schemes/{id}/publish | {concurrencyToken}; trả scheme | DRAFT; BE validate/freeze policyVersionId/registration/students; published predecessor có thể RETIRED, không thay scoring history đã dùng |
| POST /evaluation-schemes/{id}/versions | {concurrencyToken}; trả new DRAFT | Nguồn không DRAFT; không sửa payload version cũ; new token/rootId/version |

EvaluationScheme: id/rootId/version/projectId/projectPeriodId/name/status/passThreshold/concurrencyToken/policyVersionId/components/students/calculationRule. Components: name/scope/majorId/rubricId/projectWeightPercent/studentWeightPercent/requiredEvaluators. Scope COMMON, MAJOR_SPECIFIC, INDIVIDUAL; INDIVIDUAL projectWeight=0. Scheme states DRAFT/PUBLISHED/RETIRED; unknown không được mở editable bằng FE.

`EvaluationSchemeManagementPage` đang khởi tạo draft threshold=5 và component weights=100; chưa phải academic approved defaults. FE validation phụ trợ; BE Validate là authority. Audit lại xác nhận 409 chỉ gọi load cập nhật items, chưa reconcile selected/form/token: delta FE2-03A còn tồn tại ở baseline này.

## 2. Assignment / scoring contracts

| Method/path | Input / output | Quy tắc sử dụng FE |
| --- | --- | --- |
| GET /projects/{p}/eligible-evaluators | periodId/componentId/scope/majorId/studentId/page/pageSize; PagedResult | Matching PUBLISHED component/frozen student target, ComponentAuthority, open period/locked package; candidate theo rubric department và eligible source. **Không có search parameter** trong controller hiện hành |
| GET /projects/{p}/evaluation-assignments | status optional/page/pageSize; PagedResult | FE client hiện cố định page1/100, cần FE2-04 |
| GET /evaluation-assignments/my | page/pageSize; PagedResult ACTIVE | Existing getAllMyEvaluationAssignments đọc toàn collection cho direct-route guard |
| POST /projects/{p}/evaluation-assignments | evaluatorId/projectPeriodId/evaluationType + componentId/scope/majorId/studentId; 201 | Target/coverage/eligibility do BE kiểm; source SUPERVISOR/LECTURER không phải global roles mới |
| POST /evaluation-assignments/{id}/revoke | {concurrencyToken, reason} | Revoke không phải delete scoring history |
| GET /evaluation-assignments/{id} | {assignment, canScore, legacyReadOnly, denialReason} | Active owning lecturer đúng department/source mới có canScore; Admin/scoped manager có quyền đọc không mặc định được chấm |
| GET /evaluation-assignments/{id}/evidence | AssignmentEvidence | Assignment-scoped metadata: package/time/itemCount/readOnly; chưa có file projection BE-04 |
| POST /evaluation-assignments/{id}/evaluation | No body; draft, 201 | Guard theo assignment BE; không tạo draft nếu denied/legacy |
| GET /evaluations/{id}; GET /projects/{p}/evaluations | Draft / PagedResult (page/pageSize) | Project evaluations FE đang cố định page1/100 |
| PUT /evaluations/{id}/draft | {concurrencyToken, comments, scores:[{rubricCriterionId,score,comments}]} | Missing khác zero; range/rubric target/tokens theo BE |
| POST /evaluations/{id}/finalize | {concurrencyToken}; draft FINALIZED | Confirmation + one mutation; finalized read-only; stale không replay |

Assignment status ACTIVE/REVOKED; legacy scope UNKNOWN trả LEGACY_SCOPE_UNKNOWN/read-only. Draft fields gồm rubric version, scoreScale/calculationRule, missingCriterionIds/missingRequiredCriterionIds, concurrencyToken và finalization evidence. CanScore chỉ là quyền mutation theo assignment; không bỏ validation period/project/version khi finalize.

Paging: server controller defaults page=1/pageSize=20; FE candidate default100. Không tự thêm query search mà server bỏ qua. FE2-04 cung cấp paging trước; nếu cần search toàn bộ kết quả thì BE bàn giao query hoặc FE lọc một collection đã đọc đầy đủ và ghi rõ phạm vi/chi phí.

## 3. Results / policy contracts

| Method/path | Token / output | Authority / readiness |
| --- | --- | --- |
| GET/PUT /projects/{p}/result-policy | PUT passThreshold/assignments[{assignmentId,weightPercent}]/concurrencyToken | Existing result-policy client; không dùng nó thay scheme hay tự đổi math của published scheme |
| GET /projects/{p}/result/preview | ResultPreview: canPublish/blockers/totalScore/confirmationToken và inputs | Read scope BE; cross-dept staff có thể bị 403 hoặc preview blocker ADMIN_REQUIRED_FOR_CROSS_DEPARTMENT_PUBLICATION tùy rubric read scope |
| POST /projects/{p}/result; GET cùng path | POST {confirmationToken}; ProjectResult | Cross-department project publication cần Admin hiện hành; FINAL_SUBMISSION/locked inputs và complete finalized coverage; token BE revalidate |
| GET /projects/{p}/students/{s}/result/preview | ResultPreview | Admin hoặc authorized own-department manager; khác own-result read |
| POST /projects/{p}/students/{s}/result | {confirmationToken}; StudentResult | Scoped staff hoặc Admin; student publish có thể ở COMPLETED; không tự chặn outcome FAILED nếu BE canPublish |
| GET /projects/{p}/students/{s}/result | StudentResult | Own student hoặc scoped manager; own student snapshotJson hiện `{}`, không parse privileged snapshot để dựng breakdown |
| GET /project-periods/{id}/policy-versions; GET /effective-policy | Policy[] / Policy; BE effective có optional asOf | Admin hoặc staff theo rubric department của period và organization; không nhầm với period CRUD AdminOnly |
| PUT /project-periods/{id}/policy | expectedVersion, operation SUCCESSOR/UPDATE_DRAFT/PUBLISH, policy fields/effectiveFrom/effectiveTo/concurrencyToken | SUCCESSOR khi latest không DRAFT; UPDATE_DRAFT/PUBLISH cần latest DRAFT và token; closed/archived denied; published/referenced immutable |

FE getProjectResult/getStudentResult chuyển 404 thành null ở readback; đây không chứng minh user có quyền publication. FE không cộng INDIVIDUAL vào ProjectResult; StudentResult lấy scope của chính student. Current BE math/golden values và v4 extensions cần BE-03, không tính lại ở FE.

## 4. Route / ownership / UX error boundaries

| FE entry | Current guard / owner | Delta |
| --- | --- | --- |
| department/projects/:projectId/evaluation-schemes | department RoleRoute → DepartmentAcademicScopeRoute → DepartmentProjectLayout; FE2 | Admin-only user chưa có entry/context phù hợp |
| department/projects/:projectId/evaluations và result publication | Cùng department context; FE2 | Contextual links còn /department/...; chỉ bổ sung Admin entries theo verified permission matrix |
| Lecturer evaluator assignment workspace | lecturer RoleRoute + assignment access guards; FE2 | Direct assignment canScore/read-only từ BE, không mở score theo nhãn lecturer đơn thuần |
| Period policy/rubric | Existing department/academic routes; FE2 | Current source permission không đồng nghĩa academic policy sign-off |
| StudentProjectResultPage | Student journey; FE1 | Chỉ bàn giao DTO/semantics; không sửa page ngoài handoff |

Giữ department scope guard hiện hành. Không thêm Admin vào toàn department group để đi vào academic review. Loading/UNKNOWN/unavailable khác forbidden/empty; 403/404 không chứa protected data.

Errors: middleware trả ProblemDetails + traceId, optional `code` cho typed exceptions và `errors` cho validation, **không dùng errorCode minh họa v4**. HTTP giữ nguyên contract thật. WorkflowErrorCodes source có STALE_CONCURRENCY_TOKEN, FINALIZED_ASSIGNMENT, FINAL_PACKAGE_REQUIRED, EVALUATION_WINDOW_CLOSED...; không phải mọi 409 đều có code và không suy ra bằng English detail. Scheme Token hiện là 409 generic; cần giữ draft/reconcile, không replay save/publish/delete/version. 400 validation; 401 session; 403 scope; 404 missing/protected resource; các 422/429/5xx xử lý theo actual endpoint, không khẳng định scheme trả 422.

## 5. Source pointers đã kiểm

- FE: `src/services/api/evaluations.api.ts`, `project-results.api.ts`; `src/features/academic/api/period-policy-api.ts`; `src/features/evaluations/evaluation-types.ts`; `src/app/router/index.tsx`; `RoleRoute`, `DepartmentAcademicScopeRoute`; `EvaluationSchemeManagementPage`.
- BE: `PolicyEvaluationController`, `EvaluationDraftsController`, `ProjectResultsController`; `EvaluationSchemeDtos`; `EvaluationSchemeService` (Manage/ComponentAuthority/Validate/Save/Token/publish/version), `.Results` (Check/GetStudent), `PeriodPolicyService.Authorize/PutAsync`, `EvaluationAssignmentAccessService`, `ExceptionHandlingMiddleware`, `WorkflowErrorCodes`.
- Roadmap/handoff và readiness review: `../ai-pms-docs/specs/markdown/` trong workspace. Không dùng link F:/ của máy khác làm nguồn runtime.

## 6. Pending freeze / hành động tiếp theo

BE-01 cần cung cấp versioned OpenAPI/examples, deployment commit/version, role/resource/state/action/error matrix, paging limits, token placement và academic authority delta/Change Request nếu thay quyền. BE-02 cần isolated fixture/accounts/reset/readback; BE-03 golden math; BE-04 scoped evidence projection. Chưa nhận các artifact này, chưa đánh dấu contract frozen hoặc real acceptance DONE.

FE2-03A có thể sửa bug reconcile đã có source evidence, không đổi math/authority hoặc cần code từ nhánh mapping này. FE2-01B giữ WAITING_BE_PERMISSION_CONFIRMATION. Mapping nhánh này chưa merge develop: task sau tạo nhánh mới từ develop, không cherry-pick hoặc coi mapping là đã tích hợp.
