# Demo báo cáo tiến độ — 22/09/2026

Nhánh FE: `feat/demo-progress-reports`, tạo từ `origin/develop` tại `f191c17`.
Checkout riêng: `E:\DOANTOTNGHIEP\demo-progress-reports`.
Không dùng thư mục `ai-pms-frontend` đang có phiên merge khác để chạy bản này.

## Trạng thái kiểm chứng

- FE đã nối đủ sáu endpoint báo cáo: danh sách, chi tiết, tạo, sửa, nộp, nhận xét.
- Kết quả cuối phiên: **69 file kiểm thử / 329 test đều qua**, production build thành công, lint sạch; kiểm tra desktop 1440px và mobile 390px, không tràn ngang hoặc lỗi console ở lượt kiểm tra cuối.
- Kiểm thử tự động bao phủ hợp đồng HTTP, quyền UI, thiếu nội dung, xác nhận nộp, gửi trùng, giữ nội dung khi lỗi, điều hướng khi chưa lưu, báo cáo khác đồ án, lọc/phân trang và phản hồi đến sai thứ tự.
- Đã kiểm tra luồng sinh viên → GVHD trên trình duyệt bằng fixture riêng, không ghi dữ liệu kiểm thử lên database. Fixture nằm trong `test-results/`, không thuộc bản build hoặc Git.
- Backend thật khởi động được bằng launch profile Development; tài khoản sinh viên mẫu đăng nhập được.
- Đọc thật `GET /api/v1/projects/2/progress-reports` trả 200 và 3 báo cáo; đọc phân công GVHD trả 200.
- **Chưa xác nhận end-to-end ghi dữ liệu thật:** `GET /api/v1/projects?teamId=2` trả 500 vì database thiếu `projects.proposal_source` và `projects.topic_id`. Route bảo vệ FE phụ thuộc API này. Không bỏ qua guard hoặc thay bằng dữ liệu giả.
- Database cấu hình hiện tại nằm trên máy chủ ngoài local. Chưa tự chạy migration trên database dùng chung; cần chủ database xác nhận.

## Việc cần xử lý trước demo thật

Backend có sẵn `db/changes/20260914_add_project_topic_selection.sql`. Script có transaction, kiểm tra tồn tại trước khi tạo, thêm `topic_id`, `proposal_source`, check constraint, foreign key khi có bảng đề tài, và index; không xóa dữ liệu. Người quản lý database cần duyệt/chạy trên đúng database `AI_PMS` trước khi demo.

Sau cập nhật, kiểm tra lại `GET /api/v1/projects?teamId=2&page=1&pageSize=10` trả 200, mở workspace sinh viên và workspace GVHD, rồi chạy kịch bản dưới đây. Có thể còn phát sinh lỗi tích hợp khác mà các bước ghi dữ liệu thật chưa kiểm chứng; không coi fixture là bằng chứng cho backend/database.

## Khởi động

Terminal backend:

```powershell
Set-Location E:\DOANTOTNGHIEP\ai-pms-backend
dotnet run --project src/AIPMS.Api
```

Dùng launch profile mặc định để nạp cấu hình Development/User Secrets. Chạy `--no-launch-profile` mà không đặt môi trường Development có thể thiếu JWT issuer, audience và signing key.

Terminal frontend:

```powershell
Set-Location E:\DOANTOTNGHIEP\demo-progress-reports
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1 --port 5175 --strictPort
```

Mở `http://127.0.0.1:5175`. Vite proxy `/api` đến backend `http://localhost:5080`. Không cần thêm dependency hoặc chế độ mock vào ứng dụng.

## Tài khoản và điều kiện

Dữ liệu mẫu hiện có: sinh viên trưởng nhóm Nguyễn Minh Khang (`khangnmde180901@fpt.edu.vn`), nhóm `SEP490_G01`, project ID `2`, trạng thái `ACTIVE`; GVHD chính Nguyễn Hoàng Minh (`lecturer.se01@fe.edu.vn`). Mật khẩu mẫu được mô tả trong `ai-pms-backend/db/sample_data.sql`; không dùng mật khẩu mẫu cho hệ thống production.

Mở hai hồ sơ trình duyệt riêng để đăng nhập hai vai trò. Không dùng hai tab chung localStorage vì phiên đăng nhập được chia sẻ. Route GVHD dùng guard thực thi hiện có, yêu cầu phân công chính còn hiệu lực.

## Kịch bản 5–7 phút

1. Đăng nhập sinh viên, mở **Báo cáo tiến độ** từ menu hoặc workspace.
2. Giới thiệu lịch sử theo kỳ, lọc trạng thái và loại báo cáo. Dữ liệu được đọc từ API, không phải số liệu tự sinh.
3. Chọn **Tạo báo cáo**. Dùng một kỳ chưa có cùng loại báo cáo. Nhập tóm tắt rồi **Lưu bản nháp**. Bản nháp được mở theo ID backend cấp.
4. Chỉ ra rằng chưa thể nộp khi thiếu công việc hoàn thành, kế hoạch hoặc khó khăn/rủi ro. Bổ sung cả ba mục, ghi “Không có” nếu không có rủi ro; **Lưu thay đổi**.
5. Bấm **Nộp cho GVHD**, kiểm tra lời xác nhận rồi **Xác nhận nộp**. Trạng thái chuyển sang **Đã nộp**, các ô sửa biến mất. Thành viên thường được soạn nháp nhưng không có nút nộp.
6. Trong hồ sơ GVHD: vào bàn làm việc, mở project tương ứng, chọn **Mở báo cáo tiến độ**, mở báo cáo vừa nộp. Viết nhận xét và **Gửi nhận xét**.
7. Quay lại sinh viên, bấm **Tải lại trạng thái**: thấy **Đã nhận xét**, tên GVHD, ngày và nội dung phản hồi. Tải lại trang để minh họa dữ liệu được lưu trên server.

Nội dung gợi ý để trình bày, chỉ nhập vào kỳ demo được nhóm đồng ý sử dụng:

- Tóm tắt: “Hoàn thành kết nối API báo cáo tiến độ và quy trình phản hồi của GVHD.”
- Đã hoàn thành: “Lưu nháp, kiểm tra quyền nộp, hiển thị lịch sử và khóa sửa sau khi nộp.”
- Kế hoạch: “Hoàn thiện lịch họp và liên kết phản hồi với kế hoạch kỳ tiếp theo.”
- Khó khăn: “Cần thống nhất kỳ báo cáo và lịch nhận xét với giảng viên.”
- GVHD: “Kết quả đúng kế hoạch. Bổ sung minh chứng kiểm thử phân quyền và thống nhất mốc nghiệm thu.”

## Quy tắc từ backend

| Thao tác | Quy tắc đã đối chiếu |
| --- | --- |
| Tạo | Project ACTIVE, thành viên nhóm đang hoạt động; WEEKLY/MONTHLY; kỳ hợp lệ; tóm tắt bắt buộc; không trùng loại + ngày bắt đầu + ngày kết thúc |
| Sửa | Thành viên nhóm đang hoạt động; chỉ DRAFT; chỉ sửa 4 mục nội dung, không sửa loại/kỳ |
| Nộp | Trưởng nhóm (backend cũng hỗ trợ admin); chỉ DRAFT; cả 4 mục có nội dung; chuyển SUBMITTED |
| Nhận xét | GVHD được phân công còn hiệu lực; không nhận xét DRAFT; backend chuyển REVIEWED |
| Đọc | Backend kiểm tra quyền truy cập project; FE kiểm tra chi tiết thuộc đúng project đang mở |

Nguồn: `ProgressReportsController.cs`, các command/validator/DTO trong `Features/ProgressReports`, và `ProgressReportRepository.cs` của backend tại `4236b0c`.

## Các luồng BE khác đã tìm thấy

Đây là bản kiểm kê controller/use case, không phải tuyên bố tất cả đã được kiểm chứng end-to-end trong phiên này.

| Nhóm luồng | BE hiện có | Phạm vi phiên này |
| --- | --- | --- |
| Xác thực, hồ sơ, học kỳ, nhóm | Auth, workflow context, academic hierarchy, teams/invitations | Dùng nền FE có sẵn; kiểm chứng đăng nhập và context thật |
| Đề tài, duyệt, GVHD | Topics, Projects submit/review/revision/approve/reject, supervisor requests/assignments | Giữ nền FE hiện tại; xác định blocker schema ở Projects |
| Thực thi | Milestones, Tasks, dependencies, status/history, timeline/progress summary | FE đã có nền từ develop |
| Báo cáo tiến độ | Draft/update/submit/feedback và list/detail | Hoàn thiện FE trong nhánh này |
| Lịch họp | Create/update/cancel/complete, participants, notes, feedback | Chưa triển khai FE trong nhánh này |
| Bàn giao và kết quả | Deliverables, files, final submission drafts, evaluation drafts, rubrics, results | Chưa triển khai FE trong nhánh này |
| Tổng hợp | Dashboards, contributions, notifications, AI insights | Chưa kiểm chứng end-to-end trong nhánh này |

## Chạy kiểm tra FE

```powershell
pnpm test
pnpm build
pnpm lint
```

Build có cảnh báo kích thước chunk chính lớn hơn 500 kB; build vẫn thành công. Chưa thay đổi cách chia bundle của toàn ứng dụng trong phạm vi luồng báo cáo.
