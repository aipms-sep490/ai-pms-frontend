# DEPART — Kiểm tra BE, dữ liệu thực tế và hoàn thiện FE

Ngày 08/10/2026. BE `3742760`, FE base `a6f804b`, nhánh `feat/depart-completion-20261007`. Phạm vi chỉ FE; không sửa BE/DB hoặc commit/push/merge. Kế thừa nghiệp vụ Report 3/4/Governance Baseline và ma trận 01–05, không tự đưa `[PROPOSED]` thành API hoặc quyền mới.

## 1. Snapshot dữ liệu có quyền hiện tại

Đọc qua API thật bằng phiên DEPARTMENT_STAFF, không SELECT toàn DB bằng tài khoản quản trị. Đây là snapshot theo actor/scope, không phải thống kê toàn hệ thống.

| API/nguồn | Kết quả thực tế | Ý nghĩa |
| --- | --- | --- |
| `GET /api/v1/auth/me/context` | 200; DEPARTMENT_STAFF, khoa #1, scope active | Actor DEPART hợp lệ; không có role ADMIN |
| `GET /api/v1/dashboards/department` | 200; totalProjects=1, project #1 ACTIVE | Danh mục hiện tại chỉ có một project có quyền |
| `GET /api/v1/student-qualifications/verification-queue` | 200; totalCount=0 | Empty đúng dữ liệu; không phải lỗi tải hoặc endpoint thiếu |
| `GET /api/v1/projects/1/governance` | 200; provenance UNKNOWN, lead=null, blocker ACADEMIC_SCOPE_UNKNOWN, READ_GOVERNANCE | Project legacy chưa có scope xác minh; không tự dùng đội hình/ngành hiện tại để gán lead hoặc cấp quyền |
| Governance readiness | canSubmitFinal/canEvaluate/canPublishResult=false, hasPrimarySupervisor=true; result NOT_PUBLISHED | Có hướng dẫn không đồng nghĩa hồ sơ đủ điều kiện bàn giao/chấm/công bố |
| `GET /api/v1/projects/1/supervisor-assignments` | 200; 2 assignments, REPLACE/END=false, ACADEMIC_SCOPE_UNKNOWN | FE phải giữ chỉ đọc; nút khóa không phải lỗi FE cần mở |

Không ghi thông tin cá nhân, credential/token vào báo cáo hoặc trace live. Cần BE/người phụ trách dữ liệu xác minh hồ sơ đăng ký/snapshot của project legacy để scope trở nên hợp lệ; FE không tự suy đoán hoặc backfill.

## 2. API DEPART và điểm sử dụng FE

“Đầy đủ API” được hiểu là dùng các contract phù hợp actor/use case; không gọi endpoint sinh viên/ADMIN hoặc mutation chỉ để tăng độ phủ.

| Nhóm | Điểm sử dụng và kết luận hiện tại |
| --- | --- |
| Context, kỳ học vụ và policy | Workspace/context và học vụ chỉ đọc. D05 AdminOnly được giữ; không tự mở editor cho DEPART |
| Qualification queue/verify/reject/certificate | Typed queue, token phiên bản, protected metadata/stream, lý do quyết định, 409 reload/no replay. Queue thật hiện rỗng; mutation/chứng chỉ thật cần fixture |
| Đề tài, snapshot/eligibility và thẩm định | Form/hook/payload typed hiện có, revision/approve/reject và participating decisions theo action BE; không tự cấp quyền từ trạng thái project |
| Requirements và review history | Đọc requirements/snapshots/history; sửa requirements phải tuân thủ lock BR DRAFT hoặc REVISION_REQUIRED. Lần này đã sửa UI vẫn hiện editor ở ACTIVE |
| Governance | Đọc DTO đầy đủ gồm departments, actorScope, readiness, blockers, final/result statuses. Lần này bổ sung dashboard ngữ cảnh và liên kết theo project |
| Giảng viên, assignment/candidates | Directory/workload hiện có và candidate endpoint theo assignment. allowedActions quyết định thao tác; search/page/capacity/expertise từ BE |
| Theo dõi báo cáo/công việc/evidence | Governance dùng reporting-cycles/action-items/evidence với tổng/phân trang server; không biến dữ liệu một trang thành toàn khoa |
| Scheme/rubric/evaluator/bàn giao | Navigation theo project đến màn hình hiện có; readiness chỉ hiển thị kết luận, không thay quyền màn hình đích |
| Preview/kết quả sinh viên/công bố/archive | Typed contracts/confirmation token hiện có; chuyển ADMIN với publication xuyên khoa; lifecycle thật còn cần fixture cách ly |
| Portfolio/export | Scope/filter server; CSV/XLSX/PDF thật đã tải qua UI; có audit download theo BE. Không tự tổng hợp từ trang đầu |

Nguồn authoritative mới: `ProjectGovernanceDto` trong Application/Features/Projects/DTOs; `Infrastructure/Services/Projects/ProjectGovernanceService.cs`; `ProjectRequirementsService.ReplaceAsync`; controller/DTO assignment và qualification; ma trận D01–D08 ở báo cáo 05.

## 3. FE hoàn thiện trong lần này

### Dashboard điều phối

`DepartmentGovernanceOverview` kế thừa workspace-surface, Badge, semantic tokens và typography của MASTER. Thứ tự thông tin: scope → điều kiện cần xử lý → bàn giao/đánh giá/kết quả → navigation hồ sơ.

- Hiển thị khoa chủ trì/tham gia, scope actor, nguồn frozen/current/unknown và hướng dẫn chính.
- Hiển thị blockers có nguồn BE, dịch các mã xác minh được; mã chưa biết giữ nguyên, không bịa thông báo.
- Ba thẻ trạng thái dùng readiness thật, phân biệt thiếu kết luận với false; final/result statuses có nhãn nghiệp vụ.
- Link đến bàn giao, scheme, kết quả, thẩm định và evaluator giữ project ID; không render mutation từ readiness.
- `canEvaluate` từ service là điều kiện của actor có evaluator assignment + published scheme + valid scope + FINAL_SUBMISSION. FE không biến nó thành quyền đánh giá của mọi DEPART.
- Heading hierarchy và responsive grid, focus rõ, vùng bấm tối thiểu 44px theo MASTER; không thêm dependency hoặc animation không cần thiết.

### Requirements chỉ đọc

BE `ProjectRequirementsService.ReplaceAsync` khóa mọi trạng thái ngoài DRAFT/REVISION_REQUIRED và còn kiểm team status, actor scope, token/policy. FE ẩn nút/form requirements ở các trạng thái đã khóa, hiện lý do và chặn submit khi readOnly. Giữ nguyên endpoint/token và các kiểm tra quyền BE cuối cùng; việc UI cho mở form không chứng nhận mutation được phép.

## 4. Acceptance và kiểm chứng

- Focused **2 files / 11 tests PASS** (`.cache/depart-current-data-focused.json`): UNKNOWN scope, participating actor, missing readiness, giữ blockers lạ, không cấp mutation từ ready, requirement ACTIVE readonly.
- **44 mock browser checks PASS**, không pageerrors/unknown endpoints; thêm frozen participating scope, ADMIN publication blocker, project links và responsive overview 375/768/1024/1440. Ảnh overview đã xem; không overflow. Fixture overview dùng FINAL_SUBMISSION + evaluator assignment ACTIVE để phù hợp nguồn canEvaluate; không chứng minh authorization BE bằng fixture.
- **51 live browser checks PASS**, domainMutations=0, zero pageerrors/blocked writes; thêm dashboard overview và links với dữ liệu BE thật. GET export có thể ghi audit theo contract; không tuyên bố server tuyệt đối không ghi dữ liệu auth/audit.
- Typecheck, lint và build đạt; cảnh báo Fast Refresh từ chat và chunk ứng dụng/LiveKit lớn giữ nguyên.
- Full suite **158 files / 717 tests PASS**; reporter `.cache/depart-data-api-full-vitest.json` nonempty (262564 bytes), assertions=passed=717, failed=0, pending=0, badFiles=0, success=true, exit 0. `git diff --check` đạt; BE checkout clean.

Unit/mock/live GET được tách rõ. Không có browser mutation lifecycle vào shared AI_PMS. D08 BE isolated acceptance không thay thế E2E FE nhiều actor. Toàn DEPART **PARTIAL**; phần FE mới **DONE theo acceptance hiện tại**. Cần fixture cách ly valid scope, qualification có chứng chỉ, cả hai khoa, đơn ngành/liên ngành để đóng verify/revision/assignment/evaluate/publish/archive thật.
