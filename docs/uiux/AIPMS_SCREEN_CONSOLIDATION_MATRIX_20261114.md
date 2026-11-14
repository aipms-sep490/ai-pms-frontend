# AI-PMS — ma trận sắp xếp màn hình theo vai trò

Nguồn: `ROUTE_CENSUS.csv` (140 route, chỉ số 1–140). Đây là **đề xuất điều hướng**, chưa phải xác nhận đã đổi các màn hình. Giữ URL và quyền BE; hợp nhất khung/trang tổng hợp trước, chuyển URL cũ sang tab tương ứng chỉ sau khi kiểm chứng deep link, breadcrumb, quyền và lịch sử trình duyệt. `:projectId`, `:majorId`, `:taskId` và query hiện có phải được giữ nguyên.

| Chỉ số route | Màn hình hiện có | Nhóm hiển thị đích | Quyết định và lý do |
|---|---|---|---|
| 1–3, 8 | Đăng nhập, khôi phục, trang gốc | Xác thực | Giữ tách vì trạng thái và bảo mật khác nhau; chuẩn hóa form/error. |
| 4–7 | Cổng chuyên gia doanh nghiệp | Chuyên gia | Giữ feature flag và quyền riêng; workspace + assignment detail chung shell. |
| 9–13 | Hồ sơ, bảo mật, thông báo, lịch, tin nhắn | Tiện ích toàn hệ thống | Header/dock dẫn tới trang đầy đủ; hồ sơ và bảo mật có tab nhưng không gộp quyền ghi. |
| 14–15 | Tổng quan, workspace sinh viên | Tiến trình của tôi / Tổng quan | Một context strip, trạng thái và CTA; trang riêng chỉ khi thông tin không thể xếp tab. |
| 16–19 | Milestone, task, detail, Gantt | Tiến trình / Kế hoạch | Tab Mốc, Sprint/công việc, Gantt; task detail là deep link. Hiển thị Gate requirement được gắn, blocker và owner. |
| 20–26 | Báo cáo, họp, tạo, chi tiết, video | Tiến trình / Hoạt động | Tab Báo cáo và Họp; video và form/chi tiết giữ route chuyên biệt. |
| 27–30 | Deliverable, file, evidence, đóng góp | Tiến trình / Minh chứng | Một bề mặt đọc theo phiên bản, nguồn và ngành; upload/quyền vẫn theo endpoint riêng. |
| 31–34, 47–50 | Gate, Defense, Cold, peer, Final, result, timeline, Review Gates | Tiến trình / Cột mốc học vụ | Một timeline Gate 1–3 → Final → Cold → Defense → kết quả; subview riêng cho nộp/chấm, không gộp assignment. Cold/Defense vẫn đọc được sau FINAL_SUBMISSION. |
| 35–36, 51 | AI, thỏa thuận, assistant | Công cụ nhóm | Giữ tính năng theo flag/quyền; không lẫn câu trả lời AI với quyết định học vụ. |
| 37–46 | Lifecycle, team, periods, topic, source, register/edit/status, supervisor | Khởi tạo đồ án | Bước có điều kiện và tiến độ; trang tạo/chỉnh sửa/detail giữ deep link, không làm lộ nút trước đủ điều kiện. |
| 52–55 | Supervisor/mentor workspace, profile, dashboard | Giảng viên / Hàng đợi | Một điểm vào theo quan hệ thực tế; supervisor và mentor hiển thị rõ phạm vi khác nhau. |
| 56–77 | Supervisor project workspace, progress, mốc/task/Gantt, report/meeting/video, file/evidence, weekly, Gate, Final, Defense | Hồ sơ đồ án phụ trách | Một project header + tab Tiến độ, Hoạt động, Minh chứng, Đánh giá tuần, Gate/Final/Defense; detail/form/video giữ deep link. |
| 78–86 | Mentor major workspace và chi tiết | Hồ sơ ngành được cố vấn | Dùng shell tương tự supervisor nhưng luôn khóa `majorId` và chỉ hiện dữ liệu ngành được giao. Không lấy quyền supervisor. |
| 87–92 | Evaluations, assignment detail, Final evidence, Gate queue | Hàng đợi chấm được phân | Tách tab Gate, Cold, Defense theo assignment; detail giữ ID; committee membership là quyền BE, role LECTURER không đủ. |
| 93–94, 105–106 | Bộ môn workspace, progress matrix, portfolio, archived | Điều hành bộ môn | Dashboard tiến trình, nguy cơ, portfolio; archive là bộ lọc/chế độ đọc với URL ổn định. |
| 95–103 | Học vụ, governance, period policy, Gate, room planner, rubric, knowledge | Cấu hình học vụ | Context Project Period ở đầu; tab Chính sách, Gate, tiêu chí, tài liệu mẫu, phòng/lịch. Rubric và scheme có form riêng. |
| 104, 107–121 | Review/correction, đánh giá, evaluator, scheme, governance, Defense, Final, files, contributions, risk, archive | Bộ môn / Chi tiết đồ án | Một project header và blocker summary; tab thẩm định, phân công, hồ sơ, Cold/Defense, kết quả, rủi ro. Correction workflow và archive vẫn có guard riêng. |
| 122–127 | Supervisor, qualification, topic, Cold template | Danh mục bộ môn | Card/list kết hợp tab; chi tiết giảng viên/đề tài giữ URL; Cold template gắn ngành và kỳ. |
| 128–138 | Admin access, portfolio/project, milestone templates, RBAC, user, industry | Quản trị hệ thống | Shell tài khoản/quyền, portfolio hệ thống, cấu hình kỹ thuật; admin không tự nhận quyền quyết định học vụ. |
| 139–140 | Workflow preview, fallback | Công cụ kiểm chứng/404 | Preview chỉ theo flag/môi trường; 404 có đường trở lại đúng workspace. |

## Quy tắc chung cho từng screen

1. Đối chiếu quyền `read/write/assign/publish` theo role toàn cục **và** quan hệ project/ngành/assignment do BE cấp; 403/404 không giả làm màn rỗng.
2. Context strip luôn cho biết tổ chức, kỳ, Project Period, đồ án/nhóm, ngành, trạng thái, phiên bản và người chịu trách nhiệm bước kế tiếp; chỉ hiện trường đã biết chắc từ BE.
3. Một thao tác chính mỗi màn; thao tác phụ vào menu; toast/alert có mã lỗi và cách sửa. Form giữ dữ liệu sau lỗi và chỉ báo thành công sau readback.
4. Tại desktop, tab và bảng linh hoạt; tablet/mobile ưu tiên tóm tắt và bộ lọc gọn, không giấu số thông báo. Bàn phím, focus và reduced motion được kiểm chứng.
5. Kiểm tra từng nhóm route ở 375/768/1440px cùng các trạng thái loading, rỗng, lỗi, stale, bị khóa, xung đột 409 và version cũ trước khi chuyển hướng hoặc xóa menu cũ.
