# DEPART — Đặc tả bàn giao BE/DB và tiêu chí hoàn tất

> **Cập nhật 08/10/2026:** giữ đặc tả giao việc gốc bên dưới. BE mới `3742760` đã triển khai D01–D08 theo handoff implementation; FE đã nối D01–D07. Không giao lại các đề xuất endpoint dưới đây như contract chưa tồn tại. Xem [05 — Đồng bộ và acceptance còn lại](05_DEPART_BE_SYNC_FE_INTEGRATION_20261008.md). BE xác nhận NO_DB_CHANGE; còn cần browser lifecycle trên fixture cách ly, không sửa DB shared.

Ngày: 2026-10-07. Người nhận: dev BE, DBA, QA và người chốt nghiệp vụ. Trạng thái: **READY_FOR_BE_REVIEW**, chưa triển khai BE/DB. Đây là tài liệu giao việc, không phải contract đã phát hành hoặc SQL đã chạy.

BE đã đối chiếu tại `deb0a54d2e235b13c794dbaab19925a1dcf2319c`; FE worktree `ai-pms-frontend-depart-completion`, baseline `e415499d060873e2764771bdc931fe3939a9f929`. Không sửa BE/DB, không thêm dependency sản phẩm, không commit/push/PR/merge. Dev BE phải kiểm tra lại diff nếu baseline thay đổi.

## 1. Đánh giá ba báo cáo và phạm vi giao việc

| Báo cáo | Kết luận về nội dung | Điều đã chỉnh rõ / giới hạn |
| --- | --- | --- |
| [01 — Nghiệp vụ](01_DEPART_BUSINESS_ANALYSIS.md) | Đúng phân biệt role, chủ trì/tham gia, đơn ngành/liên ngành, snapshot và actor kế tiếp; §9 có 14 nhóm thao tác | Có màn hình không đồng nghĩa mutation E2E đạt. Quyền ADMIN và thao tác leader/evaluator là ranh giới hiện hành, không tự coi là lỗi BE |
| [02 — Ma trận](02_DEPART_BE_API_FE_GAP_MATRIX.md) | Nối được chức năng với API và service; các gap FE đã sửa có nguồn | Cần phân loại backlog thành bug bắt buộc, quyết định nghiệp vụ và mở rộng. Thêm gap version hồ sơ qualification và aggregate readiness; endpoints đề xuất dưới đây chưa được FE gọi |
| [03 — Thiết kế/kiểm chứng](03_DEPART_FE_DESIGN_VALIDATION.md) | Có unit/fixture/live read-only, guard, race, 409, responsive và evidence | Các số liệu §7–§11 là lịch sử. Kết quả lần bàn giao mới ở §12; không dùng kết quả mock để tuyên bố authorization/lifecycle thật |

FE đã nối học vụ, hồ sơ học vụ, điều kiện sinh viên, đề tài đầy đủ, thẩm định/snapshot/ý kiến khoa, directory/assignment, portfolio/reporting/evidence, bàn giao, scheme/evaluator, preview/project & student publication, archive và CSV. Lần rà soát này bổ sung đủ filter trạng thái BE, dialog archive có định danh đồ án/khóa gửi trùng/409 không replay, bảo vệ response portfolio cũ và validation tại trường của form đề tài. API và payload hiện hành được giữ.

Các loại tồn đọng:

- **BUG / REQUIRED:** canonical governance lead, readiness không phản ánh dữ liệu thật, certificate đọc an toàn, capability từng assignment, version hồ sơ được staff xem trước quyết định.
- **BUSINESS_DECISION:** DEPART có được CRUD kỳ/chính sách qualification hay không; công bố kết quả đồ án xuyên khoa giữ ADMIN hay ủy quyền chủ trì. Không mở quyền trước khi chốt.
- **OPTIONAL / PROPOSED:** staff gửi request thay leader, PDF/XLSX, Working Agreement/review gates/industry weighting. Chưa phải điều kiện hoàn tất baseline hiện hành.
- **QA_DATA:** fixture actor nhiều khoa và dữ liệu lifecycle cách ly; thiếu dữ liệu không đồng nghĩa thiếu màn hình/API.

## 2. Business Rules và nguồn có thẩm quyền

Các mã `HBR-*` chỉ là ID traceability của tài liệu này, **không phải mã BR/MSG chính thức trong SRS hoặc error code BE**.

| ID | Quy tắc cần bảo toàn | Nguồn |
| --- | --- | --- |
| HBR-01 | DEPARTMENT_STAFF phải active, cùng organization và đúng department resource; FE visibility không cấp quyền | AcademicAccessService, StudentQualificationWorkflow, SRS scope BR-02/03 |
| HBR-02 | Lead/participating phải từ frozen registration evidence; không lấy khoa có ID nhỏ nhất; legacy mơ hồ phải explicit unknown | ProjectAcademicScopeReader; SRS BR-52–56; Governance §6–9 |
| HBR-03 | Quyết định review gắn snapshot/token hiện hành; khoa tham gia không tự chuyển trạng thái toàn đồ án; revision do leader sửa/resubmit | Project review handlers/actions; SRS UC-048–051, BR-52–56 |
| HBR-04 | Một PRIMARY active; mentor theo major/responsible department; ACTIVE replacement phải kiểm tra capacity/expertise và transaction | SupervisorReplacementService; UC-052–059, BR-57, BR-60–63 |
| HBR-05 | Staff quyết định qualification pending của khoa mình, training completed; quyết định phải đúng evidence version đã xem; certificate không lộ qua ID/URL | StudentQualificationWorkflow/Repository; yêu cầu stale evidence là hardening đề xuất, chưa có input token |
| HBR-06 | Preview và publication dùng published scheme, frozen roster/locked package, điểm server và confirmation token; staff chỉ phạm vi hiện được BE cấp | EvaluationSchemeService.Results; UC-123–127, BR-59, BR-143–145, BR-160 |
| HBR-07 | Archive theo server action/state/token; COMPLETED mới chuyển ARCHIVED; không tự archive ACTIVE hoặc tự mở lại | ArchiveProjectCommand/ProjectStateMachine; UC-134, BR-160–161 |
| HBR-08 | Cấu trúc semester/period hiện AdminOnly; policy phiên bản và qualification policy có authorization riêng | SemestersController, ProjectPeriodsController, PeriodPolicyService, StudentQualificationWorkflow.SetPeriodPolicyAsync |
| HBR-09 | Readiness/metrics phải lấy dữ liệu có nguồn, totals server; không suy ra toàn khoa từ trang đầu | ProjectGovernanceService, Dashboard queries; UC-128–132 |
| HBR-10 | 401/403/404/409/422/5xx khác nhau; conflict không tự replay; mutate và audit cùng transaction theo contract | BE exception mapping, FE typed hooks; SRS MSG dùng làm traceability, không bịa mã trả về |

Nguồn tài liệu: `F:/AI-PMS/docs/context_md/03_srs_requirements.md`, `04_sdd_design.md`, `governance_baseline.md`. Nội dung `[PROPOSED]` và D1–D12 cần quyết định riêng, không áp thành mandatory rule.

## 3. Danh sách công việc và thứ tự

| Ticket | Ưu tiên / loại | Người thực hiện | DB migration? | Trạng thái FE |
| --- | --- | --- | --- | --- |
| BE-D01 / DEPART-BE-03 | P0 BUG: canonical scope + governance aggregate truth | BE Projects | Không mặc định; dùng snapshot/config hiện có | FE_DONE_BE_PENDING: guard đối chiếu ProjectDto |
| BE-D02 / DEPART-BE-02 | P0 REQUIRED: certificate đọc/upload đúng qualification scope | BE Academic/File + QA | Thường không cần cho single certificate; xem §5 | FE_DONE_BE_PENDING: metadata, chưa có nút tải |
| BE-D03 / DEPART-BE-04 | P1 REQUIRED: assignment capabilities + replacement candidates | BE Supervisor | Không cần thêm capability columns | FE_DONE_BE_PENDING: primary discovery, participating mentor bị giới hạn |
| BE-D04 | P1 HARDENING: quyết định qualification theo evidence token đã xem | BE Academic | Không thêm token mới vì column đã tồn tại | FE_DONE_BE_PENDING: 409 refresh; chưa gửi token không có trong DTO |
| BE-D05 / DEPART-BE-01 | P1 BUSINESS_DECISION: quyền kỳ và qualification policy | PO/BA → BE Academic | Chỉ nếu cần scope/grant mới | FE giữ AdminOnly và policy permission riêng |
| BE-D06 | P1 BUSINESS_DECISION: authority công bố xuyên khoa + disposition legacy | PO/BA → BE Evaluation | Không mặc định thêm student/project result tables | FE dùng scheme/preview và own-department roster |
| BE-D07 / DEPART-BE-06 | P2 OPTIONAL: PDF/XLSX authorized export | BE Dashboard | Không cần bảng mới cho export đồng bộ | CSV hiện có, chưa giả lập Excel/PDF |
| BE-D08 | P0 QA_DATA: isolated lifecycle acceptance fixtures | BE/QA/DBA | Replay existing migrations trong DB E2E; seed riêng | Live read-only đã có; mutation lifecycle còn thiếu |

Thực hiện D01/D02 trước; D03/D04 cùng hardening; chốt D05/D06 trước khi thay quyền. D08 chạy song song công việc BE nhưng chỉ chứng nhận sau khi journey hoàn tất. D07 không chặn baseline nếu PO xác nhận CSV đủ phạm vi phát hành.

## 4. Đặc tả từng ticket

### BE-D01 — Lead canonical, scope và aggregate readiness

**Bằng chứng:** `src/AIPMS.Infrastructure/Services/Projects/ProjectGovernanceService.cs` group khoa, order ID rồi gán `i == 0`; `Readiness.CanPublishResult` luôn false, trạng thái kết quả phụ thuộc final package thay vì actual published result. `ProjectAcademicScopeReader.cs` đã đọc frozen snapshot và fallback config, đủ để tái sử dụng thay thuật toán ID.

**API cần sửa:** GET `/api/v1/projects/{projectId}/governance`, DTO `ProjectGovernanceDtos.cs`; đối chiếu GET project và `/actions`. Giữ shape tương thích hiện tại; thêm trường provenance/unknown hoặc action details chỉ sau khi freeze contract. Không rename/xóa field FE đang dùng. READ_GOVERNANCE/management/readiness phải phản ánh authorization và terminal state, không lấy generic MANAGE_GOVERNANCE làm quyền cho tất cả resource.

**DB:** dùng `project_registration_snapshots.snapshot_json`, `team_academic_configurations`, `project_major_requirements`, assignments/final/result hiện có. Không thêm lead column trùng. Legacy missing evidence → unknown + readonly; không sửa immutable snapshot bằng quota/team hiện tại. Backfill chỉ khi có nguồn lịch sử đáng tin, qua corrective script/audit và danh sách unresolved.

**Acceptance Criteria:** AC-D01-1 frozen lead ID lớn hơn participating ID vẫn là lead; AC-D01-2 thay team scope hiện tại không làm đổi frozen execution scope; AC-D01-3 missing/invalid scope không cấp manage; AC-D01-4 final/readiness/result status lấy workflow thực tế, không đánh dấu published chỉ vì có package; AC-D01-5 COMPLETED/ARCHIVED không cho write thông thường.

**Tests:** TC-D01-A SINGLE_MAJOR; B INTERDISCIPLINARY lead=8/participant=2; C missing snapshot + multi-department legacy; D inactive/outside staff 403; E published result đối chiếu result endpoint; F package có nhưng thiếu scores → publication blocked. **DoD riêng:** integration response khớp ProjectDto và workflows; regression không cấp nhầm quyền; contract/example + FE adapter được cập nhật khi BE phát hành.

### BE-D02 — Certificate evidence truy cập an toàn

**Bằng chứng:** `StudentQualificationDto.CertificateFileId` có; migration `20260921_add_student_qualifications.sql` đã FK tới files. Repository submit kiểm tra file thuộc current student. `DeliverableWorkflow.ReadableFileAsync` kiểm tra project parent: generic download không thay được qualification authorization. Đây là thiếu đường đọc/chứng cứ, không phải thiếu mọi validation ownership.

**API đề xuất, chưa triển khai:** GET `/api/v1/student-qualifications/{id}/certificate` trả safe metadata; GET `.../{id}/certificate/download` stream authenticated hoặc signed URL ngắn hạn sau kiểm tra scope. Chốt stream là phương án ưu tiên, reuse storage/download validation. Student upload qualification evidence cần contract riêng nếu chưa có đường upload independent of project; đề xuất POST `/api/v1/student-qualifications/me/certificate` trả file reference, sau đó dùng `me/evidence` hiện hành. Không cho FE upload tệp vào project giả để lấy file ID. Dev BE phải xác minh API upload khác trước khi thêm endpoint trùng.

**BR:** HBR-01/05; owner student hoặc reviewer đúng khoa; ADMIN chỉ nếu policy chốt; file gắn đúng qualification, size/MIME và storage path được kiểm soát; metadata không trả internal path, permanent public URL hoặc data người khác. Audit access phù hợp policy; attachment replace/re-submit đổi token.

**DB:** single-file sử dụng `student_qualifications.certificate_file_id` + existing files/uploaded_by là đủ nếu lifecycle/ownership được bảo đảm. Không cần migration chỉ để thêm GET. Nếu mở nhiều evidence/history/quarantine, thiết kế relation riêng theo §5, không triển khai dưới danh nghĩa current single-certificate contract.

**AC:** AC-D02-1 staff khoa mình tải đúng file; 2 staff khoa khác/inactive không tải; 3 no-file trả empty/not-found có nghĩa, không biến thành “endpoint chưa tồn tại”; 4 không thay file ID để đọc project file của người khác; 5 upload không yêu cầu sinh viên đã có project; 6 download expired/replaced không dùng link cũ vượt quyền. **Tests:** TC-D02-A owner upload→submit→reviewer download checksum; B IDOR foreign qualification/file; C lost scope/token expired; D no-file/storage unavailable; E over-limit/invalid MIME; F evidence replacement + old reference. **DoD:** endpoint docs, authorization tests, storage cleanup/orphan handling, audit và FE download integration sau contract freeze.

### BE-D03 — Capability assignment và nguồn replacement đúng ngữ cảnh

**Bằng chứng:** `SupervisorReplacementService.cs` đã có responsible department, locks, capacity/expertise, duplicate replacement và audit; governance supervisor DTO chưa có action per assignment. `/projects/{id}/supervisor-candidates` phục vụ initial selection, không phải discovery cho ACTIVE replacement.

**API cần mở rộng:** response GET assignment hoặc project assignment list thêm actor-scoped `allowedActions`/reasons cho replace/end. **API đề xuất:** GET `/api/v1/supervisor-assignments/{id}/replacement-candidates?page=&pageSize=&search=`; chốt DTO/endpoint với FE, không coi là endpoint hiện có. Trả deterministic eligibility/capacity context của assignment/major và totalCount; backend transaction phải revalidate khi POST replace, kể cả vừa trả candidate eligible. Giữ POST `/{id}/replace` payload hiện có cho tới version contract mới.

**DB:** reuse supervisor_assignments assignment_type/major_id/replaces_assignment_id, capacity policy và unique active mentor/replacement indexes từ `20260925_add_supervisor_assignment_types.sql`. Capability là computed response, không persist canReplace boolean. Chỉ bổ sung concurrency version nếu chốt cần token; hiện duplicate idempotency được service xử lý, không kết luận DB thiếu lock.

**AC:** AC-D03-1 chủ trì quản PRIMARY, participating chỉ mentor major của khoa mình; 2 replace chỉ ACTIVE/live assignment, người khác old supervisor; 3 scope/expertise/capacity đúng; 4 closing end dùng state BE cho phép, archived FE readonly; 5 simultaneous replacements không tạo hai assignment; 6 token/capacity race trả conflict, no partial writes. **Tests:** TC-D03-A lead vs participant vs outsider; B mentor wrong major; C candidate full capacity after preview; D double request same/different replacement; E ACTIVE/COMPLETED/ARCHIVED; F rollback audit/history/capacity. **DoD:** candidate và capability dùng cùng authority với mutation; contract tests và FE participating mentor integration đạt, không mở bằng generic governance action.

### BE-D04 — Evidence version trên qualification decision

**Bằng chứng:** DB đã `concurrency_token`; repository dùng EF conflict handling và thay Guid khi cập nhật. Nhưng DTO không trả token, verify không có body, reject chỉ reason. Server fetch mới không chứng minh staff đã xem chính evidence version mới, đặc biệt khi student re-submit vẫn PENDING_VERIFICATION.

**API đề xuất:** expose token trong qualification DTO và yêu cầu expected token ở verify/reject, với rollout/versioning rõ ràng; không dùng updatedAt làm token. Compare-and-write trong transaction, kiểm tra training/scope/status lại. 409 khi hồ sơ đã resubmit hoặc được người khác xử lý. FE hiện chưa gửi field này vì contract chưa có; sau BE freeze mới cập nhật typed service/hook.

**DB:** không thêm column token trùng; kiểm tra mapping concurrency, update conditions và token refresh của every evidence mutation trên target. Migration chỉ nếu actual target thiếu column/default/mapping cần scaffold; không sửa schema để che contract gap.

**AC:** AC-D04-1 decision đúng token success; 2 token cũ sau resubmit pending →409 không verify evidence mới; 3 hai reviewer chỉ một commit; 4 reject reason required; 5 staff ngoài khoa403; 6 missing token policy được mô tả khi rollout. **Tests:** TC-D04-A GET→student re-submit→old verify; B verify-vs-reject concurrent; C retries/409 no replay; D complete/incomplete training; E revoked scope. **DoD:** evidence/token race integration test, migration readiness readback, OpenAPI + coordinated FE rollout, audit phản ánh đúng phiên bản.

### BE-D05 — Chốt authority học vụ và policy

**Bằng chứng:** SemestersController/ProjectPeriodsController writes AdminOnly, qualification-policy setter ADMIN, period policy version service authorization khác. Không sửa chung bằng thay AdminOnly thành DepartmentStaff trên toàn controller.

**Quyết định cần PO/BA ký:** A giữ ADMIN quản cấu trúc/global policy, DEPART đọc và sửa policy scoped hiện được cấp; B ủy quyền giới hạn kỳ/khoa đã định nghĩa. Với B, xác định organization-vs-department ownership, resource phạm vi nhiều khoa, effective window và ảnh hưởng version đang được project sử dụng. Generic context action không đủ.

**API:** khi chọn B, chỉnh authorization của từng mutation `/academic/semesters`, `/academic/project-periods`, qualification-policy và context/actions; preserve validation/token/version contracts. Khi chọn A, sửa SRS/ma trận trách nhiệm và không giao dev “mở nút” ở FE.

**DB:** A không DDL. B có thể dùng existing authorization nếu đủ; nếu cần delegation persist thì thiết kế grants/scope/effective dates unique constraints, FK và audit trước migration. Không tự thêm department_id vào semester organization-wide vì có thể phá kỳ dùng chung.

**AC/tests:** AC-D05-1 approved authority matrix nhất quán context/controller/service; 2 outsiders/inactive denied; 3 used policy immutable/versioned; 4 period organization scope và overlap validation; TC-D05-A DEPART own/foreign/shared period, B active policy usage, C concurrent edit, D ADMIN regression. **DoD:** signed decision + docs/contract/auth tests; DDL chỉ với schema design chốt.

### BE-D06 — Kết quả xuyên khoa và legacy

**Bằng chứng:** `EvaluationSchemeService.Results.Check` từ chối staff publish project khi rubric của component ngoài actor department; student result dùng frozen roster khoa. Legacy `ProjectResultWorkflow.Configure` từ chối writes và FE đã bỏ form này. Đây là authority hiện hành, không mặc định bug.

**Quyết định:** mặc định giữ ADMIN cho cross-department project publication. Nếu nghiệp vụ muốn lead publish, chốt sign-off đầy đủ các khoa, snapshot/token và quyền global completion trước khi đổi. Không hạ điều kiện bằng chỉ kiểm tra leadDepartmentId. Chốt legacy project không có frozen scope/scheme: read-only hoặc remediation có nguồn, không invent scheme/grades.

**API:** giữ `/projects/{id}/result/preview`, `/result`, student preview/result. Nếu đổi quyền thì canPublish/blockers/reasons/confirmation token và mutation phải dùng cùng service, recheck package/scheme/grade versions. Endpoint legacy được đánh dấu read-only/deprecated rõ ràng.

**DB:** reuse evaluation_schemes/components, frozen students JSON, student_results/project_results và evaluation finalizations. Không cần DDL để sửa authorize. Multi-department sign-off nếu được chốt là proposal riêng cần relation theo scheme/snapshot và unique department decision; không mượn registration decisions cho grading approval.

**AC/tests:** AC-D06-1 keep ADMIN behavior đúng nếu chưa chốt; 2 own-department student publish độc lập project permission; 3 published score ổn định/đúng calculation rule; 4 stale preview sau đổi score/package/scheme409; 5 publication đúng transition COMPLETED/audit, duplicates không hai result; TC-D06-A inter-project ADMIN/lead/participant, B wrong student department, C missing evaluator/final package, D stale token, E transactional rollback, F legacy reads. **DoD:** frozen authority + integration determinism/token/state tests, không có FE arithmetic hoặc bypass.

### BE-D07 — PDF/XLSX nếu UC-132 cần đạt đầy đủ

**API đề xuất:** mở rộng authorized portfolio export hiện có `format=csv` với pdf/xlsx sau khi chốt limits/output. Same scope/filter/search/state/major; CSV vẫn tương thích. Trả content-type/filename thực, audit và tổng export đúng; không rename CSV extension. Chống spreadsheet formula injection cho trường text CSV/XLSX; dữ liệu ngày/locale consistent. Không export token/credentials/private internal file paths.

**DB:** synchronous export không cần schema. Async jobs chỉ thiết kế khi số liệu/hiệu năng chứng minh cần, với owner/scope/expiry/cleanup nếu chốt. **AC/tests:** AC-D07-1 filters và totals khớp; 2 denied scope không leak; 3 limit/empty/large dataset; 4 file đọc được bằng parser thực; TC-D07-A Vietnamese/Unicode/date/formula cells, B major/status/search parity across formats, C audit/error; **DoD:** PO xác nhận scope, contract freeze, artifact parse/render evidence + FE download integration. OPTIONAL, không phát minh API trong FE hiện tại.

### BE-D08 — Fixture và chuỗi acceptance thật

**Nguồn:** `docs/remediation-e2e.md`, `scripts/new-e2e-database.ps1`, `test-schema-readiness.ps1`, `db/e2e/migrations.json`, `db/e2e/seed.sql`, `verify.sql`. Repo yêu cầu: “Never point mutation tests at the shared `AI_PMS` database.” Không dùng project `[TEST] Video Meeting Integration` làm fixture DEPART khác mục đích.

**Giao QA/BE:** bootstrap DB cách ly với marker/aliases; active staff lead/participant/outsider, leader/member eligible, supervisor/mentor/evaluator, ADMIN và inactive actors. Seed DRAFT thực, qualification pending/certificate fixture và windows/clock từng giai đoạn; không seed trực tiếp approved/ACTIVE/grade/published để giả journey API.

**AC:** AC-D08-1 SINGLE_MAJOR journey đủ từ profile/qualification→topic/project→review/revision/resubmit→guidance→ACTIVE→execution→final lock→scheme/evaluators/scoring→preview→publish→COMPLETED→archive; 2 INTERDISCIPLINARY cùng chuỗi với lead/participating/frozen major; 3 negative rights/token/duplicate/rollback; 4 evidence nonempty kiểm đủ suites, no failures; 5 secret-free artifacts, không gọi real email/provider nếu fixture không cấu hình.

**Tests:** TC-D08-A single happy+revision; B multi-department approval and rejected opinion; C outsider direct resource API403; D stale snapshot/preview/qualification409; E parallel replacement/publish/archive; F readonly archived; G API totals>one page. **DoD:** machine-readable API journey và Playwright trace/screenshot fixture được đọc kiểm tra, auth/data matrix và known limitations; không ghi “DONE E2E” từ page headings hoặc seed SQL.

## 5. DB migration — cần gì và không cần gì

### 5.1 Kết luận theo source đã kiểm tra

**Chưa có bằng chứng bắt buộc thêm bảng/cột mới để hỗ trợ các sửa FE vừa làm.** Portfolio filters/dialog/race và topic inline validation không thay persistence. Governance lead, capability và result authority là service/DTO work. Qualification token đã có column nhưng thiếu wire contract. Single certificate FK đã có.

Đây là kết luận theo source và schema scripts tại baseline, không chứng nhận mọi target DB đã apply đủ migrations. Dev BE/DBA chạy SELECT-only readiness và lưu report target trước khi quyết định SQL. Không tái dùng số lượng bảng trong báo cáo lịch sử làm bằng chứng schema hiện hành.

### 5.2 Manifest và kế hoạch triển khai Database First

| Migration / schema hiện có | Dùng cho | Việc DBA cần kiểm tra |
| --- | --- | --- |
| `20260912_add_interdisciplinary_projects.sql` | team academic config/requirements, registration snapshots, department decisions | FK/JSON constraint/index/latest evidence, lead không bị suy diễn từ sorted IDs |
| `20260921_add_student_qualifications.sql` | evidence, certificate_file_id, concurrency_token, period qualification policy | FK ownership checks in service, token/default/concurrency mapping, queue index |
| `20260925_add_supervisor_assignment_types.sql` | PRIMARY/mentor/end/replacement chain | filtered unique mentor/replacement indexes, no duplicate active assignments |
| `20260929_add_project_major_requirements.sql` | min/max/responsibility persisted | bounds + uniqueness, không backfill immutable snapshots bằng data hiện tại |
| `20260930_add_policy_evaluation_schemes.sql` và final/result scripts trong manifest | frozen scheme/student result/package | indexes/constraints/version/token/roster, không tạo tables lần hai |

Quy trình migration khi target thực sự cần sửa:

1. Snapshot schema/readiness, backup và xác định target; đối chiếu manifest đang dùng, không chạy unordered toàn bộ folder.
2. Tạo **SQL additive/rerunnable mới** trong `db/changes/` với tên được dev BE chốt; không sửa checksum script đã apply, không EF Code First migrations, không chỉnh generated models bằng tay.
3. Validate FK/CHECK/index trusted và dữ liệu vi phạm trước DDL. Chỉ backfill có nguồn/audit; lưu unresolved, không biến unknown thành lead/approved.
4. Apply trong DB E2E sạch → rerun → verify.sql/readiness → `scripts/scaffold-database.ps1 -Force` theo repo → review generated diff và custom mappings → integration tests.
5. Triển khai target có backup; readback schema và API contract; rollback bằng forward corrective change khi đã có dữ liệu. Không drop workflow tables tự động.

### 5.3 Migration tương lai chỉ khi BA chốt mở rộng

- **PROPOSED multiple certificate evidence/history:** bảng relation owner qualification/file/version/status, FK và unique reference; migration và attachment lifecycle design trước endpoint upload. Không bắt buộc cho hiện tại một certificate.
- **PROPOSED delegated academic administration:** grants/resource/organization/department/effective window với uniqueness/FK/audit; chỉ nếu existing role/permission model không diễn tả được quyết định D05.
- **PROPOSED result sign-off đa khoa:** scheme/snapshot/department decision và token version; chỉ sau authority D06. Không reuse registration opinion làm sign-off điểm.
- **PROPOSED async exports/Working Agreement/review gates/industry weights:** task riêng sau freeze; chưa tạo table/migration trong scope này.

## 6. Hợp đồng FE–BE khi bàn giao

Mỗi ticket API mới phải có OpenAPI/DTO sample, nullability, enum, paging, reasons/action code, authority matrix, error mapping, token format/expiry/replay, examples single/interdisciplinary và compatibility note. Mọi route đề xuất trong §4 chỉ được FE gọi sau BE phát hành và tests contract đạt. Không trả JSON success cho operation bị cấm; không đổi 403 thành empty/404 “API unsupported”.

Không phá các payload đang dùng: review snapshot+token, participating opinion do BE derive department, result `{ confirmationToken }`, assignment replace input hiện tại, archive fresh Project token và reason null, qualification decision hiện chưa có expected token. Breaking change D04 cần rollout coordinated hoặc versioned endpoint; không âm thầm làm FE cũ gửi thiếu token.

## 7. Definition of Done chung và tiêu chí đóng DEPART

- [ ] PO/BA chốt D05/D06 và danh sách OPTIONAL ngoài release; mapping BR/UC/actor có nguồn, không biến PROPOSED thành quyền.
- [ ] D01–D04 implement controller→service→repository authorization/state/version; audit, transactions, deterministic scoring/eligibility được bảo toàn.
- [ ] DB readiness target PASS; migrations cần thiết additive/rerunnable được verify + scaffold, không schema drift/constraint untrusted; tickets không cần DDL ghi “NO_DB_CHANGE” cùng bằng chứng.
- [ ] Contract freeze, compatible typed FE integration; nút và locked reason từ quyền thật, lỗi/409 reload no replay, loading/empty/retry/keyboard/focus đúng.
- [ ] BE integration + contract tests có testcase IDs §4, real provider DB cách ly; scope/lead/participant/outsider/direct URL/stale token/duplicate/rollback đều có bằng chứng.
- [ ] Full FE suite báo cáo nonempty, đủ file/assertions, zero failures/pending; typecheck/lint/build/diff-check đạt; responsive 375/768/1024/1440 không tràn ngang.
- [ ] D08 single/inter lifecycle API+browser thực sự chạy mutation trong fixture cách ly, mọi trạng thái từ API có audit/history. Mock/read-only được ghi đúng mode.
- [ ] Ba báo cáo cập nhật lại theo kết quả. Chỉ kết luận DEPART DONE khi acceptance scope đã chốt đạt hết; mục chưa có BE dùng FE_DONE_BE_PENDING/BLOCKED rõ ràng, không đóng bằng “đã có UI”.

## 8. Checklist giao dev BE

Dev BE nhận file này và 3 báo cáo, tạo issues D01–D08 theo priority/type, ghi owner/dependency/decision và baseline. Trước khi code đọc service/DTO/schema được dẫn nguồn. Trả lại contract diff + migration/no-DB-change decision + schema report + integration evidence + fixtures/how-to-run. FE owner tích hợp contract mới và rerun kiểm chứng; chưa được coi phần BE/DB đã hoàn thành trong phiên FE này.
