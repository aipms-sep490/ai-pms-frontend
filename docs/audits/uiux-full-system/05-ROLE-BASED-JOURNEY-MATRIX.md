# Ma trận hành trình theo vai trò — kiểm toán mã nguồn, chưa nghiệm thu E2E

**Mốc mã:** FE `7e21521b`, BE `8aec4db3`. `src/app/router/index.tsx` là mẫu số route; `RoleRoute.tsx` đọc nhiều role trong phiên, `DepartmentAcademicScopeRoute.tsx` kiểm tra phạm vi khoa do server trả về. Các ô dưới đây mô tả đường đi *có trong mã*, không khẳng định đã hoàn thành giao dịch. Số click, lịch sử, thông báo và lưu bền đều **chưa đo** vì không có phiên FE–BE xác thực.

| Chủ thể | Route/đích hiện có | Hành động và chuyển giao cần xác minh | Quyền giới hạn phải kiểm tra ở BE | Trạng thái |
| --- | --- | --- | --- | --- |
| Admin | `/admin/access`, `/admin/access/rbac`, `/academic`, `/admin/portfolio` | Thiết lập tài khoản, role, cấu trúc, kỳ; bàn giao chính sách cho bộ môn | Tổ chức, role hiệu lực, version chính sách; admin không tự động là người chấm | `IMPLEMENTED_NOT_E2E_VERIFIED` |
| Bộ môn chủ trì | `/department/workspace`, `/department/projects/review/:id`, `/department/projects/:projectId/governance` | Duyệt đề tài/đồ án, xác định supervisor, tài liệu, Gate và phân công; phản hồi lại nhóm | Phạm vi khoa/ngành, trạng thái hồ sơ, phiên bản quyết định | `IMPLEMENTED_NOT_E2E_VERIFIED` |
| Bộ môn tham gia | Cùng trang review/governance với scope liên ngành | Cho ý kiến theo ngành; bộ môn chủ trì chỉ phê duyệt cuối khi đủ quyết định tham gia (`ProjectReviewPage.tsx`) | Chỉ ngành được phân, không ký thay khoa chủ trì | `IMPLEMENTED_NOT_E2E_VERIFIED` |
| Trưởng nhóm | `/team`, `/project/source`, `/project/register`, `/project/workspace`, `/project/review-gates` | Tạo nhóm → kiểm tra eligibility → đăng ký → lập việc/minh chứng → gửi Gate → sửa và nộp lại | Thành viên/leader thật, cửa sổ kỳ, khóa trạng thái, concurrency token | `IMPLEMENTED_NOT_E2E_VERIFIED` |
| Thành viên | `/project/tasks`, `/project/evidence`, `/project/reports`, `/project/meetings` | Thực hiện việc được giao, nộp minh chứng, theo dõi phản hồi | Quyền theo team/task; không làm hành động chỉ dành cho leader | `IMPLEMENTED_NOT_E2E_VERIFIED` |
| Supervisor chính | `/supervisor/workspace`, `/supervisor/projects/:projectId/workspace`, `/supervisor/projects/:projectId/progress` | Theo dõi toàn dự án, phản hồi báo cáo/Gate, nhận cảnh báo việc cần xử lý | Assignment hiện hành; không chấm evaluator cùng nhóm | `IMPLEMENTED_NOT_E2E_VERIFIED` |
| Mentor ngành | `/mentor/workspace`, `/mentor/projects/:projectId/majors/:majorId/*` | Hướng dẫn phần chuyên ngành và minh chứng của ngành | Assignment + major scope, không phê duyệt/chấm ngoài ngành | `IMPLEMENTED_NOT_E2E_VERIFIED` |
| Evaluator Gate | `/review/gate-assignments`, `/evaluator/workspace` | Hai người cố định cho Gate 1–3, xem bản minh chứng đúng version và đưa kết luận | BE `ReviewGateService.cs` kiểm tra panel và xung đột supervisor | `IMPLEMENTED_NOT_E2E_VERIFIED` |
| Thành viên hội đồng Defense/COLD | `/evaluator/assignments/:assignmentId`, `/evaluator/evaluations/:evaluationId` | Chấm đúng stage và scope, hoàn tất để bộ môn công bố kết quả | BE `DefenseCommitteeBinding.cs`, `ColdEvaluationBinding.cs`; role toàn cục không đủ | `IMPLEMENTED_NOT_E2E_VERIFIED` |
| Chuyên gia doanh nghiệp | `/industry/*` khi flag bật | Góp ý theo assignment; không quyết định điểm chính thức | V5 xác định advisory cho tới khi chính sách phê duyệt khác | `NOT_TESTED`; flag và auth chưa có runtime |

## Các handoff phải chạy bằng tài khoản thật

1. **Nhóm → bộ môn chủ trì/tham gia:** lưu nháp, nộp, yêu cầu sửa, nộp lại; so sánh hai mode và xác minh không phê duyệt khi thiếu ngành tham gia.
2. **Bộ môn → supervisor/mentor → nhóm:** assignment hợp lệ, scope ngành, thông báo đúng người, đọc lại sau refresh; thử xung đột supervisor/evaluator.
3. **Nhóm → hai reviewer Gate → nhóm:** khóa package/version, nhận phản hồi từng minh chứng, nộp sửa, giữ panel Gate 1–3; thử actor ngoài panel.
4. **Bộ môn → hội đồng Defense/COLD → công bố:** xác nhận hội đồng, assignment COLD đúng scope, thông báo, chấm nháp/gửi, kết quả chưa công bố/công bố; thử đổi hội đồng và người bị thu hồi quyền.

Mỗi lần chạy cần lưu actor ID đã ẩn danh, mode, project state, route, thao tác, HTTP status, bản ghi đọc lại, thông báo nhận, và audit history. Chưa có số đo click hoặc kết quả quyền ở runtime nên không chấm điểm trải nghiệm các vai trò này.
