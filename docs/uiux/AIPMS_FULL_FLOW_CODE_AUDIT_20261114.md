# AI-PMS — kiểm kê mã và điều kiện nghiệm thu luồng tiến trình → Cold → Defense

Ngày rà soát 2026-11-14. BE `feat/be-access-audit-20261113` (`f756221`); FE `feat/fe-fresearch-reference-20261113` (`bacca95`, cộng sửa ngày họp của đợt rà soát này). Tài liệu `AIPMS_INTERDISCIPLINARY_COLD_DEFENSE_COMPREHENSIVE_GUIDE.md` là mô tả tham khảo, không phải bằng chứng tính năng. `CODE` = thấy đường mã; `TEST` = test chạy thành công trong lần này; `PARTIAL` = chỉ một phần yêu cầu; `GAP` = thiếu mắt xích; `RUNTIME` = cần DB/browser có xác thực. Không suy `CODE` thành hoàn tất nghiệp vụ.

## 1. Ma trận theo chuỗi nghiệp vụ

| Năng lực / điều kiện | Kết luận | Bằng chứng mã | Việc còn cần làm để đạt yêu cầu |
|---|---|---|---|
| Tổ chức, kỳ, Project Period, nhóm đơn/liên ngành | CODE, RUNTIME chưa chứng minh | `ReviewGateService.cs` dùng `ProjectAcademicScope`; `AcademicGovernancePage.tsx`; route 37–46 | UAT hai project đơn/liên ngành với quyền bộ môn chủ trì/tham gia và trạng thái thực. |
| Đề cương liên ngành, trách nhiệm ngành, quyết định bộ môn | PARTIAL | `ProjectReviewPage.tsx`, `ParticipatingDepartmentPanel.tsx`, `MajorRequirementEditor.tsx` | Đối chiếu snapshot trách nhiệm sau duyệt và thử sửa/duyệt song song ở DB cô lập. Không coi sơ đồ tài liệu là đã thử E2E. |
| Sprint/task/milestone/Gantt, báo cáo, họp, minh chứng | CODE, PARTIAL | route 16–30 và 56–86; `ReviewGateService.MatrixRow` đếm task | Gắn task/mốc với `GateRequirementId` có nguồn BE; hiển thị thiếu minh chứng, owner, deadline và blocker cho leader. |
| Gate requirement và timeline cho sinh viên | CODE | `ReviewGateService.cs` Save/Publish/Timeline/SubmitEvidence; route 31, 49–50 | Cung cấp bản tóm tắt tiêu chí có hiệu lực trước khi leader lập Sprint; kiểm tra scope theo ngành và version runtime. |
| Hai reviewer cố định Gate 1–3, chặn supervisor | CODE; integration chưa chạy | `ReviewGateService.cs` 489, 531–540, 645–649; commit BE `f756221` | Chạy test DB cho cùng hai người trên ba Gate, cả hai quyết định, thay người, override có audit, 409. |
| Final Package và file hash | CODE, PARTIAL | `FinalSubmissionWorkflow.cs` kiểm manifest/file, `FinalSubmissionRules.cs` kiểm leader, trạng thái/kỳ | `FinalSubmissionRules` chưa kiểm Gate 3 đã PASS; mã nhận bản deliverable `SUBMITTED` hoặc `ACCEPTED`, khác khẳng định “toàn bộ ACCEPTED” trong guide. Chốt policy rồi áp vào BE + test. |
| Mẫu Cold theo ngành, phiên bản và ví dụ IT | CODE, PARTIAL | `ColdSubmissionService.cs`; `ColdTemplateExamples.ItReports` | 7 mục IT là **ví dụ trả qua API**, không phải bộ mẫu được tự động áp/publish cho mọi kỳ/ngành. |
| Checklist Cold COMMON + MAJOR_SPECIFIC + INDIVIDUAL | GAP | `ColdSubmissionService.cs` 129–158 tạo template COMMON, 197–202 Apply từ chối COMMON; `ColdChecklistItem.MajorId` non-null | Database First: sửa schema/contract/access/binding/FE; test đơn và liên ngành. Không dùng MajorId=0 giả. |
| Nộp/khóa gói Cold theo phạm vi và file version/hash | PARTIAL | `ColdSubmissionService.Versions.cs` ghi version/khóa/hash; 144 chỉ staff chủ trì khóa | Quyền leader khóa như guide chưa có; chốt chính sách xác nhận staff sau leader, kiểm đủ cả scope và audit. |
| Hội đồng Defense hợp lệ, chặn supervisor/mentor | CODE, PARTIAL | `AcademicTrackingService.Defense.cs` 18–42 chặn mọi assignment supervisor đang hiệu lực | Mã cho 1–20 người, guide nói ≥3; phải cấu hình hoặc chốt quy chế theo kỳ. Chưa có `CONFIRMED`/active committee duy nhất. |
| Chỉ hội đồng được chấm Cold trước Defense | GAP nghiêm trọng | `EvaluationSchemeService.CandidatesAsync` 28–60 chọn giảng viên theo bộ môn, không join committee; `ResolveAssignmentAsync` 297–326 tương tự; `EvaluationDraftWorkflow` dựa assignment | Thêm committee active/version và kiểm ở candidate, assign, evidence read, draft/save/finalize; mọi người chấm Defense phải có Cold assignment đúng scope, notify từng người. |
| Thông báo cho người chấm Cold | PARTIAL | `EvaluationDraftWorkflow` phát `EvaluatorAssigned`; `WorkflowNotificationWriter` gửi cho evaluator | Thông báo hiện chung cho evaluation; cần stage Cold, deadline, project/major và deep link đúng assignment sau khi committee confirmed. |
| Cold readiness trước khi xếp lịch | GAP nghiêm trọng | `ColdSubmissionService.Progress.cs` có blocker/score; `OfflineGateEligibility.cs`, `AutoScheduleService.cs`, `AcademicTrackingService.Defense.cs` chưa dùng nó | Một quyết định readiness BE dùng chung cho preview, apply tự động, lịch thủ công và CTA; kiểm lại trong transaction để tránh race. |
| Phòng/lịch, xung đột người/phòng | CODE, RUNTIME chưa chứng minh | `AcademicTrackingService.Defense.cs` và `AutoScheduleService.cs` có kiểm overlap/khóa | UAT phòng, người chấm, Gate 4 window, đổi lịch và dữ liệu DB cô lập; không xem có endpoint là xong. |
| Chấm rubric, bản nháp, finalize, công bố điểm | CODE, PARTIAL | `EvaluationDraftWorkflow`, `EvaluationFinalizationWorkflow`, `EvaluationSchemeService.Results.cs`; `EvaluatorAssignmentDetailPage.tsx` | Chốt committee scope Cold/Defense và readiness; kiểm snapshot đúng file, version, quyền từng sinh viên, công bố/phúc khảo E2E. |

## 2. Quản lý học vụ, file và giao diện

| Năng lực | Kết luận | Bằng chứng / điều kiện còn thiếu |
|---|---|---|
| Tài khoản nhiều role | CODE | `User.UserRoleUsers` là collection; `UsersController` có gán/gỡ role. Supervisor, evaluator, mentor, leader là quan hệ theo project, không cần tạo global role mới. Cần test một lecturer đồng thời supervisor nhóm A/evaluator nhóm B và chặn chấm nhóm A. |
| Rubric có nháp/phê duyệt/publish và trọng số | CODE, PARTIAL | `RubricsController` có CRUD/submit/approve/publish; `RubricManagementPage.tsx` có cây tiêu chí. Trọng số ví dụ trong guide không phải policy mặc định. |
| Excel tải mẫu → nhập → diff → commit → sửa web → tải lại | GAP | Không có endpoint Rubric import/export workbook trong `RubricsController`; `RubricSheetPreview` chỉ xem trước UI. Cần workbook BE versioned, validate 2 bước và re-export từ bản nháp DB. |
| Bộ môn upload file mẫu DOCX/PDF/XLSX cho ngành | GAP | `AcademicKnowledgeManagementPage.tsx:80` gửi text và `sourceFileName:null`; đây là kho AI knowledge, không phải kho tệp mẫu được publish cho sinh viên. |
| Preview PDF/ảnh | CODE, TEST thành phần | `DocumentPreviewModal.tsx` render iframe/ảnh; unit test chạy. Cần browser có quyền thật cho tệp Cold/Final/template. |
| Preview DOCX/XLSX | GAP | `DocumentPreviewModal.tsx:353` fallback tải về cho Office. Cần converter DOCX cô lập và grid XLSX readonly từ BE, kiểm MIME/quyền/version/quota; local chưa có LibreOffice. |
| Sinh viên thấy Cold/Defense sau Final Submission | CODE, TEST | FE route registry `802d0f8`, route test chạy. Chưa chứng minh authenticated browser với project thực. |
| Số thông báo/chat và dock gọn | CODE, TEST | FE `3620688`; Vitest và Playwright chat fixture qua. Fixture không chứng minh realtime/notification DB thật. |
| Alert/form chung, 409 bảo toàn draft, loading/empty/denied | PARTIAL | `02-INTERACTION-RULES.md` đã quy định; các trang còn nhiều cách hiển thị riêng. Cần kiểm 140 route theo ma trận và áp component chung theo nhóm. |
| Ngày/giờ theo nghiệp vụ | PARTIAL | Defense BE kiểm lịch tương lai; nhiều input FE chưa có min/max. Sửa form tạo họp FE chặn ngày cũ, giữ sửa lịch cũ; BE meeting validator vẫn cho `EndAt == StartAt` và chưa chặn tạo lịch quá khứ. Không áp min=today cho bộ lọc/lịch sử. |
| Gom màn hình theo vai trò | PROPOSED | `AIPMS_SCREEN_CONSOLIDATION_MATRIX_20261114.md` bao phủ chỉ số 1–140. Chưa di chuyển route hoặc nghiệm thu deep link. |

## 3. Mức chứng minh và thứ tự đóng các khoảng trống

- Phiên rà soát này: `dotnet build AIPMS.sln --no-restore -p:MSBuildEnableWorkloadResolver=false` qua 0 warning/error; 60 Vitest trọng tâm qua, thêm 13 test form họp qua. Playwright chat fixture của lần trước qua. Đây là source/fixture evidence, **không phải full lifecycle UAT**.
- Docker SQL Server không chạy (`dockerDesktopLinuxEngine` không tồn tại); test integration BE và DB migration chưa thể chạy. Không tạo dữ liệu học vụ giả trên shared DB. Chưa có authenticated runtime proof cho các vai trò/giai đoạn.
- Thứ tự bắt buộc: (1) chốt policy và schema hội đồng/COMMON, (2) DB additive + contract + BE guard Cold, (3) readiness lịch và Final, (4) kho file mẫu + Excel + Office preview, (5) FE role journeys/alerts/dates, (6) UAT đơn/liên ngành, 4 role và toàn bộ 140 route. Chi tiết acceptance ở `AIPMS_PROGRESS_COLD_DEFENSE_INTEGRATED_PLAN_20261114.md`.
- **Kết luận:** Không thể báo “đã hoàn thiện toàn bộ”. Các mục GAP trong bảng là điều kiện bắt buộc trước khi đạt đúng luồng người dùng mô tả.
