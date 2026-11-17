# Đơn ngành và liên ngành — một lifecycle, khác scope

Nguồn: v5 D02/D04/D05/D06/D08, FE `CreateTeamModal.tsx`, `TeamEligibilitySummary.tsx`, `ProjectReviewPage.tsx`, `ProjectAcademicScopePanel.tsx`, `ActiveProjectWorkspacePage.tsx`; BE `ProjectPeriodGovernancePolicy`, `TeamEligibilityRepository.cs`, `WorkflowContextReader.Projects.cs`, `ProjectRepository.Hybrid.cs`. Đây là đối chiếu mã/thiết kế, **không** là kết quả chạy E2E.

| Chặng | SINGLE_MAJOR | INTERDISCIPLINARY | Nơi kiểm tra và rủi ro còn mở |
| --- | --- | --- | --- |
| Kỳ/nhóm | Một `primaryMajorId`, thành viên được xác nhận ngành | Ít nhất hai ngành và quota theo ngành, khoa chủ trì | FE có chọn mode/ngành trong `CreateTeamModal`; BE dùng `AllowedProjectModes` và eligibility. Thử sai ngành, thiếu quota, mode bị kỳ cấm và sửa scope sau đăng ký. |
| Đăng ký/xét duyệt | Khoa chủ trì quyết định | Khoa chủ trì + khoa tham gia quyết định trên cùng version | FE `ProjectReviewPage.tsx` chỉ hiện duyệt cuối khi `ALL_APPROVED`; cần thử API 409/version đổi giữa các quyết định và đọc lại lịch sử. |
| Hướng dẫn | Một supervisor chính | Một supervisor chính, mentor theo ngành nếu phân | Router mentor đi theo `majorId`; xác minh BE từ chối major khác và ngăn supervisor làm evaluator cùng dự án. |
| Thực hiện | Milestone, sprint/task, evidence của một dự án | Backlog chung + trách nhiệm/ngành, minh chứng COMMON/MAJOR/INDIVIDUAL | `ActiveProjectWorkspacePage` hiển thị mode; `ProjectAcademicScopePanel` hiển thị quota. Chưa xác minh mọi task/dependency/report giữ scope khi tạo, lọc, sửa hoặc chuyển trang. |
| Review Gate | Cùng vòng đời Gate | Cùng Gate, thêm scope minh chứng/đánh giá theo ngành | Không tách thành nhiều dự án. Test một minh chứng chung và một minh chứng theo ngành, reviewer chỉ thấy phần được phép. |
| Kết quả | Scheme được kỳ/ngành duyệt | Tổng hợp theo chính sách đã phê duyệt | V5 tỷ lệ 50/30/20 là lựa chọn thiết kế chờ duyệt; không dùng làm điểm chính thức nếu chưa có chính sách. |

## Các câu hỏi kiểm thử cụ thể

- Đổi thành viên/ngành sau khi đã có quyết định tham gia có làm mất hiệu lực quyết định đúng version không?
- Khi khoa tham gia yêu cầu sửa, nhóm thấy nguyên nhân, người quyết định và hành động tiếp theo ở cùng nơi không?
- Mentor chỉ xem/sửa việc và minh chứng ngành mình được phân, trong khi supervisor thấy dự án tích hợp như thế nào?
- Task chung có dependency sang ngành A/B, blocker và owner hiển thị rõ trên board/timeline không?
- Gate/package COLD/Defense có cùng project ID, scope và version khóa không?

Tất cả câu hỏi trên là `NOT_TESTED` ở runtime. Ưu tiên E2E bằng hai dự án mẫu riêng biệt trong một kỳ được cho phép; không nhập fixture học vụ giả vào cơ sở dữ liệu dùng chung.
