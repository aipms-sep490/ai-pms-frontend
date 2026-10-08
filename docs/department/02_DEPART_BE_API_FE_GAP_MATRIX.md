# Báo cáo 2 — Ma trận tài liệu, BE/API và FE DEPART

> Kết quả rà API/dữ liệu mới nhất và UI requirements/governance tại [06 — Current data/API review](06_DEPART_CURRENT_DATA_API_REVIEW.md). `ACADEMIC_SCOPE_UNKNOWN` của project hiện tại là blocker dữ liệu: không phải thiếu endpoint và không được mở quyền bằng FE.

> **Cập nhật 08/10/2026:** ma trận D01–D08 và kết luận hiện tại nằm trong [05 — Đồng bộ và kết quả hiện tại](05_DEPART_BE_SYNC_FE_INTEGRATION_20261008.md). D01–D07 đã có implementation/contract BE trong `3742760`; FE đã nối token/chứng chỉ/capability/candidates/readiness/export. Các dòng “bị chặn bởi BE” hoặc “chưa có contract” dựa trên baseline cũ dưới đây không còn là kết luận hiện tại cho các ticket này. D08 còn thiếu browser lifecycle mutation cách ly; D05/D06 giữ quyền ADMIN, không phải gap cần mở quyền DEPART.

Ngày: 2026-10-07. BE `deb0a54`; FE base `e415499`. Prefix API thực tế: `/api/v1`. Nguồn nghiệp vụ và quy tắc ưu tiên xem Báo cáo 1.

Phân loại: **đã đủ** = contract và FE đã có cho hành vi mô tả, không có nghĩa E2E runtime đã chứng minh; **cần hoàn thiện FE** = có contract, gap FE xử lý trong branch này; **bị chặn bởi BE** = thiếu quyền/contract cần thiết; **đề xuất chưa có contract** = chưa đủ căn cứ triển khai.

## 1. Ma trận chức năng theo vòng đời

| Chức năng / nguồn | API hiện có | BE authority / DTO | FE hiện có và quyết định | Phân loại sau triển khai |
| --- | --- | --- | --- | --- |
| Scope, workspace — UC-128, BR-03/150/151 | GET `/auth/me/context` | WorkflowContextController; UserWorkflowContextDto, active Department scope | DepartmentAcademicScopeRoute áp dụng cho các route DEPART; workspace đọc độc lập | Đã đủ cho guard/context; runtime cần E2E |
| Academic hierarchy — UC-018/020/021/022 | `/academic/departments`, `/academic/majors`, profile scope APIs | AcademicAccessService: own department; create department AdminOnly | AcademicStructurePage tái sử dụng; không cấp thêm quyền | Đã đủ theo quyền hiện hành |
| Semester/period structure — UC-025/026 | `/academic/semesters`, `/academic/project-periods` | SemestersController/ProjectPeriodsController: writes AdminOnly | useAcademicGovernance yêu cầu identity ADMIN và BE action; DEPART đọc | Bị chặn bởi BE đối với CRUD DEPART |
| Policy versions — UC-026/027, Governance §12 | GET `project-periods/{id}/policy-versions`, `effective-policy`; PUT `policy` | PeriodPolicyService.Authorize: period rubric thuộc department; version/token | PeriodPolicyManagementPage, typed adapter tái sử dụng; giữ riêng với structure CRUD | Đã đủ theo contract hiện hành |
| Hồ sơ học vụ — SDD học vụ | GET `/academic/profile-verifications`; POST `/users/{id}/academic-profile/verify`, `/reject` | AcademicProfilesController, AcademicProfileQueries/Commands, AcademicAccessService + reviewer department | ProfileVerificationsPage có queue/paging/verify/reject lý do; phân biệt với qualification, thêm điểm truy cập trong guide | Đã đủ phần FE/API; mutation live chưa kiểm chứng |
| Qualification policy | GET/PUT `/academic/project-periods/{id}/qualification-policy` | StudentQualificationWorkflow.SetPeriodPolicyAsync: ADMIN | DEPART không mở form writes | Bị chặn bởi BE cho DEPART writes |
| Qualification verification | GET `/student-qualifications/verification-queue`; POST `/{id}/verify`, `/{id}/reject` | StudentQualificationWorkflow.QueueAsync/DecideAsync; StudentQualificationDto | Hook mới: page/pageSize/search/status, conflict refresh; page có dates/reason/confirmation/training guard | Cần hoàn thiện FE → đã triển khai |
| Certificate content | DTO `certificateFileId`; `/files/{id}/download` là project file API | DeliverableWorkflow.ReadableFileAsync xác minh project parent; chưa có certificate-scoped read | Hiển thị metadata, không giả lập liên kết download | Bị chặn bởi BE |
| Topic management — SRS Topic, SDD §3.5 | GET/POST `/topics`, PUT `/{id}`, POST `/{id}/publish`, `/{id}/close` | TopicsController, TopicWorkflow: lead/period/major/state/policy validation | TopicManagementPage có full proposal form + catalog kỳ/ngành, editable requirements, confirm publish/close, conflict refresh; title-only và requirement hardcode đã sửa | Cần hoàn thiện FE → đã triển khai; mutation live chưa xác minh |
| Review queue — UC-048 | GET `/projects/review-queue` | GetProjectReviewQueueQuery: DepartmentStaff active scope; ReviewProjectSummary | ProjectReviewPage có search/paging; giữ lại | Đã đủ |
| Review dossier — UC-049 | GET `/projects/{id}`, `/academic-review`, `/history`, `/actions`, review snapshots | ProjectsController; ReviewDetail; ProjectWorkflowActionsDto | Proposal, academic scope, evidence, requirements, history/snapshots giữ nguyên; thêm navigation theo project | Đã đủ chức năng xem đã có |
| Revision/final decision — UC-050/051, BR-52–56 | POST `/projects/{id}/start-review`, `/revision`, `/approve`, `/reject` | Controller/handlers: current token, authorized scope/state | useProjectReview thêm mutation lock; giữ reason, refresh 409, không replay | Cần hoàn thiện FE → đã triển khai |
| Participating decision — BR-55/56 | POST `/projects/{id}/department-decisions` | BE derives department; snapshotId + concurrencyToken + decision + reason | Xác nhận cả APPROVED/REJECTED; không gửi client-selected Department | Cần hoàn thiện FE → đã triển khai |
| Supervisor directory — UC-052/053 | GET `/supervisors`, `/{id}`, `/projects/{id}/supervisor-candidates` | SupervisorAccessService/GetSupervisorsQuery; SupervisorProfileDto/candidate workload | SupervisorMonitoringPage/search/filter/paging giữ lại; directory không mặc định là tổng nhân lực riêng khoa | Đã đủ phần directory |
| Request/accept guidance — UC-057/058 | Supervision request APIs PRIMARY/DISCIPLINE_MENTOR | SupervisorRequestWorkflow.SendAsync/CancelAsync RequireLeader; lecturer accept rechecks capacity | Không thêm nút DEPART gửi/accept thay actor khác | Bị chặn bởi BE cho DEPART acting-as-leader |
| Assignment replacement — UC-059, BR-57/62 | GET `/supervisor-assignments/{id}`; POST `/{id}/replace`; GET project assignments | SupervisorReplacementService: ACTIVE, responsible department primary/major, capacity/expertise transaction | AssignmentManagementPanel confirm reason + fresh read; directory đề xuất qua GET /supervisors thay candidate API vốn từ chối ACTIVE; conflict reload; chỉ ACTIVE có replace | Đã triển khai cải thiện; mentor department action còn blocker |
| Assignment closure | POST `/supervisor-assignments/{id}/end` | SupervisorAssignmentWorkflow.EndAsync: COMPLETED/ARCHIVED | Chỉ mở closing operation ở COMPLETED và scope hợp lệ; ACTIVE hiển thị precondition | Cần hoàn thiện FE → đã triển khai |
| Governance aggregate | GET `/projects/{id}/governance` | ProjectGovernanceService; aggregate allowedActions và actorScope | Primary governance đối chiếu thêm ProjectDto academicScope lead; không dùng sorted ID làm authority | Bị chặn bởi BE cho canonical aggregate đầy đủ |
| Portfolio/attention — UC-128/130/131 | GET `/dashboards/department` | DashboardsController, PortfolioDashboard.summary + projects page | Metric dùng summary; attention đánh dấu page-local và chuyển trang; links điều phối/scheme/result | Cần hoàn thiện FE → đã triển khai |
| Reporting/action/evidence — BR-80/101 | `/projects/{id}/reporting-cycles`, `/action-items`, `/evidence` | ReportingCyclesController, ProjectActionItem/ProjectEvidence DTO; project scoped services | ProjectGovernancePage có phân trang dữ liệu điều phối; editor chỉ scope canonical + allowed action | Cần hoàn thiện FE → đã triển khai phân trang |
| Final requirements/package — UC-120–122 | Project final requirements/submission APIs | FinalSubmissionWorkflow/Rules: package snapshots, checklist, role/state | FinalRequirementsPage/FinalSubmissionViewerPage tái sử dụng qua project navigation | Đã đủ phần đã có; runtime chưa xác minh |
| Rubric/scheme — UC-123, BR-59/143/145 | `/rubrics`, `/evaluation-schemes`, `/{id}/publish`, `/{id}/versions` | RubricWorkflow; EvaluationSchemeService.Manage/Validate; EvaluationSchemeDto | Management pages đã có; kết quả dẫn vào scheme thay legacy policy form | Đã đủ phần contract đã tích hợp |
| Evaluator assignment — UC-123 | Project `/eligible-evaluators`, `/evaluation-assignments`; revoke endpoint | EvaluationSchemeService: component/scope/major/student + frozen inputs | EvaluatorAssignmentManagementPage giữ lại, navigation mở từ dossier/portfolio | Đã đủ phần đã có |
| Legacy result policy | GET/PUT `/projects/{id}/result-policy` | ProjectResultWorkflow.Configure luôn throws Conflict; read-only legacy | ResultPublicationPage bỏ ghi legacy; API adapter legacy giữ cho compatibility, không dùng ở page | Cần hoàn thiện FE → đã triển khai |
| Project result — UC-127, BR-145/160 | GET `/projects/{id}/result/preview`, `/result`; POST `/result` | EvaluationSchemeService.Results.Check/Confirm/PublishProjectAsync; ResultPreview/ProjectResult DTO | Read result trước preview; hiện 403/409; token, checkbox, dialog, mutation lock; không swallow lỗi | Cần hoàn thiện FE → đã triển khai |
| Student result — UC-127, BR-59 | GET/POST `/projects/{id}/students/{studentId}/result`; preview | Frozen scheme roster; staff department only; StudentResultDto | StudentResultPublicationPanel lọc department, invalidate student/project change, conflict fresh preview | Cần hoàn thiện FE → đã triển khai |
| Cross-department project publication | Cùng result API | Check: rubric của component project ngoài actor department → forbidden, cần ADMIN | Không làm FE bypass; project failure không che student panel độc lập | Bị chặn bởi BE đối với DEPART vượt scope |
| Archive/history — UC-133/134 | POST `/projects/{id}/archive`, GET project history/archive reads | ArchiveProjectCommand, workflow action/preconditions | Portfolio archive action/ArchivedProjectsPage giữ lại; thêm sidebar entry | Đã đủ phần hiện có |
| Export — UC-132 | GET `/dashboards/portfolio/export?format=csv` | Authorized export + audit | CSV sẵn có; không ghi nhãn PDF/Excel cho CSV | Bị chặn bởi BE đối với PDF/XLSX |
| Working Agreement/review gates/industry scoring | Governance PROPOSED, D1–D12 | Chưa xác minh được end-to-end contract đã freeze | Không thêm mandatory guard/weight ở FE | Đề xuất chưa có contract đầy đủ |

## 2. Những hợp đồng được bảo toàn

- API prefix/path/payload BE không thay đổi. Qualification queue gửi `page`, `pageSize`, `status`, `search`; quyết định không thêm departmentId hoặc token không có trong DTO.
- Review mutations giữ token/snapshot; participating decision không gửi authority do client chọn.
- Result publication chỉ gửi `{ confirmationToken }`; server là nguồn canPublish, scores, blockers và state transition.
- Reporting cycles/action items thêm tham số page ở FE adapter, gọi paging BE sẵn có. Evidence có page/pageSize; không thêm schema.
- Assignment APIs không có concurrencyToken input: giữ fresh-read và server transaction, không sáng tạo token FE.
- Nguồn lựa chọn/report/meeting/assignment/directory/semester/period/rubric được đọc đủ các trang; page parameter của BE được giữ nguyên.
- API/types FE mới gồm hook/section state, project navigation, directory discovery và closing predicate; không có BE API/DB thay đổi.

## 3. Backlog BE có thể bàn giao độc lập

| ID | Yêu cầu rõ ràng | Lý do / bằng chứng |
| --- | --- | --- |
| DEPART-BE-01 | Chốt quyền semester/period CRUD cho DEPART hay giữ ADMIN | SRS UC-025/026 khác AdminOnly trên controller |
| DEPART-BE-02 | Secure certificate metadata/download theo qualification + department authorization | QualificationDto có file ID nhưng generic Files access dựa project parent |
| DEPART-BE-03 | Canonical leadDepartment từ frozen academic scope trong governance aggregate | ProjectGovernanceService chọn khoa theo ID; replacement service dùng ProjectAcademicScopeReader |
| DEPART-BE-04 | Assignment capabilities theo PRIMARY/DISCIPLINE_MENTOR, scope, state, eligible replacement candidates | MANAGE_GOVERNANCE quá rộng; participating department mentor authority nằm ở replacement service |
| DEPART-BE-05 | Nếu nghiệp vụ cần staff gửi/cancel request: contract rõ thay RequireLeader | Không giả danh Student Leader ở FE |
| DEPART-BE-06 | PDF/XLSX export contract nếu cần đạt UC-132 đầy đủ | Endpoint hiện chỉ CSV |

Không dùng backlog này để dừng các cải thiện FE có contract. Không sửa controller/service/DB trong phiên này. Báo cáo 3 ghi kết quả kiểm chứng và các giới hạn runtime.


## 4. Gap FE phát hiện và sửa ở lần rà soát cách thao tác

- Topic publication không thể hoàn thiện với UI chỉ sửa tên: BE TopicRules.PublicationIssues yêu cầu problem/objectives/output/domain/technologies/keywords. Form mới sửa toàn bộ TopicContent, thêm/xóa nhiều requirements, quotas/responsibility; payload giữ DTO và token hiện hành. Chọn khoa từ workflow context, kỳ từ paged ProjectPeriods và ngành từ academic hierarchy. Mode/eligibility cuối vẫn do BE kiểm tra.
- Topic mutation error tách khỏi read error; 409 refresh dossier và không replay. Synchronous lock chặn request trùng, request version chặn read cũ. Confirm publish dùng bản đã lưu; close bắt buộc lý do qua dialog.
- Mobile project navigation đổi sang combobox giữ projectId, desktop giữ tabs; route/permissions không đổi. Back dùng router history.
- Workspace period `isOpen=false` không mặc định là CLOSED: hiển thị status UPCOMING đúng và ACTIVE ngoài window rõ ràng. Tên loại kỳ dùng displayLabel và thời gian Asia/Ho_Chi_Minh.
- Governance readonly notice phân biệt thiếu canonical scope, aggregate mismatch, actor khác lead và terminal state; không tạo capability mới.

## 5. Phân loại chính xác sau khi rà lại ba báo cáo

“Đã đủ” trong ma trận là **đủ phần FE/API đã xác minh**, không chứng nhận mutation E2E. Chức năng có code và contract nhưng không có fixture phải ghi riêng giới hạn runtime; không đổi thành thiếu endpoint. Những dòng “Cần hoàn thiện FE → đã triển khai” là gap cũ đã đóng về code FE, chưa mặc định đạt live lifecycle.

| Chức năng / nguồn bổ sung | Kết luận | Quyết định đã thực hiện |
| --- | --- | --- |
| Portfolio filter — DashboardValidators.cs | Đã đủ sau cải thiện FE | Bổ sung SUBMITTED, REVISION_REQUIRED, REJECTED, SUPERVISOR_PENDING vào bộ lọc; server pagination/totals giữ nguyên |
| Portfolio data flow — API dashboard hiện có | Đã đủ sau cải thiện FE | Request version loại response cũ; không hiện dataset cũ dưới filter mới; phân biệt session/forbidden/service error |
| Archive — ArchiveProjectCommand và current Project token | Đã đủ phần FE/API | Dialog định danh project, khóa pending, hủy không gửi, đổi filter vô hiệu xác nhận, 409 reload/no replay; mutation thật chưa kiểm chứng |
| Topic validation/publish — TopicContent/TopicRules | Đã đủ sau cải thiện FE | Lỗi từng trường + summary link/focus; publish khóa khi chưa lưu; contract payload không đổi |
| Governance scope/readiness — ProjectGovernanceService | Bị chặn bởi BE | Sorted lead và hardcoded readiness cần service dùng canonical scope/workflow, ticket BE-D01 |
| Qualification evidence token — DTO/repository/migration 20260921 | Đề xuất chưa có contract wire | Token DB có nhưng DTO/verify/reject chưa có expected token; BE-D04, FE chưa tự gửi field mới |

Tài liệu giao dev [04_DEPART_BE_DB_HANDOFF.md](04_DEPART_BE_DB_HANDOFF.md) thay thế mô tả ngắn backlog §3 để triển khai: D01/D02 correctness/evidence; D03/D04 capability/version; D05/D06 decisions phân quyền; D07 optional export; D08 fixture/acceptance. Các URL/DTO đề xuất trong file 04 chưa tồn tại trong FE service hiện hành. Không sửa DB chỉ vì UI cần một capability computed.
