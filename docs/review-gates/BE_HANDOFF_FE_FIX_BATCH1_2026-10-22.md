# Bàn giao BE từ lượt sửa review FE Batch 1 — 22/10/2026

Nguồn: `FE_FIX_BATCH1_REVIEW_2026-10-22.md`, FIX-01…FIX-07. Đây là bổ sung cho BE_HANDOFF hiện có; không thay thế các quyết định nghiệp vụ đang chờ.

## BE-12 — Đề nghị thêm kind MILESTONE vào aggregator sinh viên

- **BE GAP / owner BE:** `StudentNextActions` hiện chưa trả cảnh báo mốc đồ án. FE tạm đọc `getStudentDashboard` song song với scoped calendar và aggregator, chỉ dùng mốc `isOverdue` cho attention. Task attention vẫn chỉ lấy từ aggregator.
- **Đề nghị:** bổ sung kind `MILESTONE` với id, projectId, title, status, severity, dueAt và deepLink theo contract aggregator hiện hữu. BE xác định trạng thái/quá hạn và quyền đọc.
- **Acceptance đề nghị:** sinh viên được phép đọc mốc quá hạn nhận đúng một item `MILESTONE` ưu tiên cao; mốc trong project ngoài scope không xuất hiện; có test ca dương và ca âm phân quyền.
- **Phối hợp FE khi ship:** bỏ nguồn attention milestone từ dashboard trong cùng đợt nối contract mới, kiểm tra không nhân đôi mốc. Không bỏ dashboard trước khi BE có dữ liệu thay thế và FE đã kiểm chứng.
- **Giới hạn của thay đổi:** dashboard vẫn có thể cần cho lịch dự phòng khi scoped calendar lỗi. Việc bỏ nguồn attention không đồng nghĩa bỏ fallback calendar.

## Các gap được giữ hiển thị

- **BE-08:** kỳ báo cáo không phải hạn nộp báo cáo. FE giữ disclosure `progress-report-deadline: unsupported`, không dựng deadline từ PeriodStart/PeriodEnd.
- **BE-09:** phân công đánh giá chưa có DueAt. FE giữ disclosure `evaluation-assignments: unsupported` cho giảng viên, không dựng deadline từ AssignedAt/RevokedAt.
- **Giới hạn danh sách aggregator:** API có thể cắt danh sách; DTO FE đang dùng không có tổng số hoặc tín hiệu truncation. Số việc thông thường FE công bố chỉ đếm các item đã nhận, không phải tổng toàn hệ thống. Panel nguồn nói rõ giới hạn này. Đề nghị BE bổ sung tổng số/tín hiệu cắt dữ liệu; FE không tự truy vấn lại task/dashboard để bù attention hoặc tự suy ra HasMore.

## Contract đối chiếu

Đọc source BE tại `origin/develop` commit `cfed325`: `ReviewGateService.cs` dùng `FROZEN_GATE_WEIGHTS` khi đã cấu hình và `NOT_CONFIGURED` khi chưa cấu hình. FE đã dịch hai giá trị này, hỗ trợ `INSUFFICIENT_DATA`, giữ nhánh trung tính cho mã mới. Đây là kiểm chứng source, không phải xác nhận staging có dữ liệu trọng số.

## Ranh giới nghiệm thu

Test unit và Playwright controlled chứng minh milestone, fallback, lọc HIGH, nhiều bộ môn và disclosure. Không dùng fixture để kết luận BE-12/08/09 đã triển khai hoặc một lifecycle staging đã hoàn tất. Xem `FE_FIX_BATCH1_IMPLEMENTATION_2026-10-22.md` để đối chiếu bằng chứng chạy thật.
