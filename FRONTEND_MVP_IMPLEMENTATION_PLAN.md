# AI-PMS Frontend — Kế hoạch dựng toàn bộ màn hình MVP

## 1. Mục tiêu

Dựng đủ bộ màn hình web AI-PMS theo hướng desktop-first để nhóm có thể review toàn bộ luồng sản phẩm sớm, sau đó mới tích hợp API và hoàn thiện nghiệp vụ theo từng feature.

Kết quả của giai đoạn này là **MVP giao diện có điều hướng, responsive và dữ liệu minh họa rõ ràng**. Đây chưa phải bản production và không được giả lập rằng các chức năng chưa có backend đã hoạt động thật.

## 2. Nguyên tắc bắt buộc

- Giữ phong cách **Linear Academic** và tái sử dụng design token/component đã có.
- Không viết lại `AppLayout`, `Sidebar`, `TopHeader`, `Button`, card, badge hoặc trạng thái chung cho từng page.
- Code theo cấu trúc feature hiện tại trong `src/features/<feature>`.
- Mỗi CTA phải thuộc một trong ba trạng thái:
  1. Hoạt động thật và có handler.
  2. Điều hướng tới route đã tồn tại.
  3. Disabled, ghi rõ `Sắp có` hoặc `Mô phỏng`.
- Mọi dữ liệu giả phải nằm trong fixture riêng và hiển thị nhãn **Dữ liệu minh họa / Mô phỏng**.
- Không gọi API giả, không đoán contract backend, không thêm dependency nếu chưa thật sự cần.
- Không dùng thông tin cá nhân thật trong fixture hoặc ảnh review.
- Không push, tạo PR hoặc merge nếu người dùng chưa yêu cầu rõ.

## 3. Điều kiện trước khi nhân rộng layout

Hoàn thiện FE-01 hiện tại trước:

- [x] Bỏ role switch giả hoặc làm nó thực sự đổi navigation/page preview.
- [x] Disable hoặc triển khai chuông thông báo; bỏ phím `⌘K` nếu chưa có handler.
- [x] Thay các màu hex lặp lại bằng semantic token hiện có.
- [x] Bổ sung test tối thiểu cho navigation, disabled placeholder và nhãn mock.
- [x] Chạy `pnpm lint`, `pnpm test`, `pnpm typecheck`, `pnpm build`, `git diff --check`.

Mobile app và trải nghiệm viewport nhỏ sẽ được triển khai sau trong repository riêng. Không dùng lỗi dưới 1024px để chặn việc dựng các page web desktop tiếp theo.

## 4. Route và màn hình MVP

| Mã | Route đề xuất | Màn hình | Feature sở hữu |
| --- | --- | --- | --- |
| Screen 6 | `/login` | Đăng nhập và mô tả phân quyền | `auth` |
| Screen 1 | `/project/workspace` | Bàn làm việc tổng quan | `dashboard` |
| Screen 2 | `/projects/lifecycle` | Nhóm và hồ sơ đăng ký đề tài | `projects`, `teams` |
| Screen 3 | `/project/milestones/:milestoneId` | Chi tiết cột mốc và Kanban | `milestones`, `tasks` |
| Screen 7 | `/project/gantt` | Gantt và đường găng | `progress` |
| Screen 5 | `/project/deliverables` | Báo cáo và sản phẩm bàn giao | `deliverables` |
| Screen 10 | `/project/meetings` | Lịch họp, biên bản và đánh giá chéo | `progress`, `evaluations` |
| Screen 4 | `/project/ai` | Phân tích AI và Copilot | `ai` |
| Screen 8 | `/supervisor/workspace` | Bàn làm việc GVHD | `supervisors` |
| Screen 9 | `/department/workspace` | Quản lý Bộ môn và phê duyệt | `academic`, `projects` |

Giữ `/` redirect về `/project/workspace` trong chế độ preview. Không tạo link dẫn tới route chưa đăng ký.

## 5. Phạm vi MVP của từng màn hình

### Screen 6 — Login

- Bố cục đăng nhập, nhận diện FPTU và mô tả các vai trò.
- SSO, 2FA và đăng nhập thật để disabled nếu chưa có backend/session hoàn chỉnh.
- Không lưu token giả và không làm form mật khẩu giả.

### Screen 1 — Dashboard

- Giữ implementation hiện tại sau khi xử lý checklist FE-01.
- Đây là chuẩn tham chiếu về shell, spacing, màu, typography và responsive.

### Screen 2 — Team & Project Lifecycle

- Trạng thái nhóm, thành viên, cơ cấu đa ngành và hồ sơ đề tài.
- Timeline trạng thái đăng ký/phê duyệt.
- Form chỉnh sửa và gửi duyệt chỉ hoạt động khi có handler thật; còn lại disabled.

### Screen 3 — Milestone & Kanban

- Thông tin mốc, deadline, tiến độ và bốn cột Kanban.
- Filter theo trạng thái/ngành phải hoạt động trên fixture.
- Drag/drop, tạo task và sửa task để disabled nếu chưa triển khai đầy đủ.

### Screen 7 — Gantt & Critical Path

- Cây WBS và trục 15 tuần, có đường găng minh họa rõ nhãn.
- Desktop có thể cuộn ngang trong vùng biểu đồ; toàn bộ page không được tràn ngang.
- Không dùng class Tailwind không tồn tại như `grid-cols-15`.

### Screen 5 — Deliverables

- Danh sách sản phẩm cần nộp, phiên bản, trạng thái, deadline và rubric minh họa.
- Upload/dropzone, nộp bản cuối và ký số phải disabled khi chưa có API.
- Không cho người dùng chọn file nếu file sẽ không được xử lý.

### Screen 10 — Meetings & Peer Review

- Lịch họp, biên bản, action items và ma trận đánh giá chéo.
- Dữ liệu điểm, chữ ký và AI insight phải ghi rõ mô phỏng.
- Các thao tác đặt lịch, ký và gửi đánh giá để disabled nếu chưa có handler.

### Screen 4 — AI Analytics

- KPI, cảnh báo rủi ro, giải thích lý do và đề xuất hành động.
- Nội dung AI phải ghi rõ mô phỏng và không khẳng định là kết quả mô hình thật.
- Chat input và nút tạo báo cáo để disabled nếu chưa có backend AI.

### Screen 8 — Supervisor Workspace

- Danh sách nhóm, trạng thái rủi ro, lịch cần xử lý và hàng đợi review.
- Cho phép chuyển giữa nhóm bằng fixture để review UI.
- Không mô phỏng thao tác duyệt thành công nếu chưa có persistence.

### Screen 9 — Department Workspace

- KPI học kỳ, bảng đề tài, trạng thái phê duyệt, tải GVHD và AI matching minh họa.
- Bảng có vùng scroll riêng trên màn hình nhỏ và header/cột quan trọng dễ đọc.
- Phê duyệt, phân công và xuất biên bản để disabled nếu chưa có handler thật.

## 6. Thứ tự triển khai

### Batch 0 — Ổn định nền tảng

- Sửa checklist FE-01.
- Chuẩn hóa semantic tokens và shared UI primitives cần cho các màn hình tiếp theo.
- Tạo route metadata tập trung gồm label, icon, role và trạng thái preview.
- Thêm test setup UI tối thiểu nếu repository chưa có.

### Batch 1 — Luồng sinh viên cốt lõi

- Screen 2: Team & Project Lifecycle.
- Screen 3: Milestone & Kanban.
- Screen 7: Gantt & Critical Path.
- Cập nhật sidebar để các route đã hoàn thành trở thành link thật.

### Batch 2 — Báo cáo và phối hợp

- Screen 5: Deliverables.
- Screen 10: Meetings & Peer Review.
- Screen 4: AI Analytics.

### Batch 3 — Không gian theo vai trò

- Screen 6: Login preview.
- Screen 8: Supervisor Workspace.
- Screen 9: Department Workspace.
- Navigation phải thay đổi theo role preview thực tế hoặc bỏ hoàn toàn bộ đổi role.

### Batch 4 — Audit toàn hệ thống

- Đồng nhất header, breadcrumb, spacing, typography và trạng thái.
- Kiểm tra toàn bộ link, back/forward, reload và 404.
- Kiểm tra responsive và accessibility.
- Chạy toàn bộ quality gate và review diff.

## 7. Cách chia Git/GitHub

- FE-01 hiện tại phải được sửa và hoàn tất riêng.
- Tạo một parent issue cho **Frontend MVP Screen Suite** và child issue cho từng batch.
- Mỗi batch dùng branch/PR riêng từ `origin/develop`; không dồn toàn bộ 9 màn hình còn lại vào branch FE-01.
- Chỉ tạo issue, push branch hoặc mở PR sau khi người dùng duyệt nội dung tương ứng.

Tên đề xuất:

- `[FE-02] Build student core MVP screens`
- `[FE-03] Build reporting, meeting and AI preview screens`
- `[FE-04] Build role-based preview workspaces`
- `[FE-05] Audit responsive and accessibility across MVP screens`

## 8. Tiêu chí nghiệm thu cho mỗi page

- [ ] Route mở được trực tiếp, reload không lỗi và breadcrumb đúng.
- [ ] Sidebar chỉ đánh dấu đúng một mục active.
- [ ] Không có nút giả trông như đang hoạt động.
- [ ] Có nhãn rõ cho fixture, AI, điểm số và trạng thái mô phỏng.
- [ ] Có trạng thái loading, empty, error và forbidden nếu page đã gọi API.
- [ ] Keyboard focus nhìn thấy; icon button có accessible name.
- [ ] Không có horizontal overflow ở viewport web từ 1024px trở lên.
- [ ] Nội dung dùng được tại 1024, 1280, 1440 và 1920px.
- [ ] Test logic tương tác chính và route/navigation liên quan.
- [ ] `pnpm lint`, `pnpm test`, `pnpm typecheck`, `pnpm build` đều pass.

## 9. Definition of Done toàn giai đoạn

- Đủ 10 route/màn hình trong bảng kế hoạch.
- Toàn bộ navigation không còn link 404 ngoài route 404 chủ động.
- Giao diện đồng nhất với Dashboard Linear Academic.
- Không còn dữ liệu minh họa bị trình bày như dữ liệu thật.
- Không còn chức năng giả có thể click nhưng không tạo phản hồi.
- Desktop responsive và accessibility checklist đạt ở toàn bộ luồng web.
- Mỗi batch có bằng chứng kiểm tra, ảnh desktop và diff sạch.
- Phần chưa có backend được liệt kê rõ để tách thành issue tích hợp API sau.

## 10. Chỉ dẫn bắt đầu cho Antigravity

1. Đọc `.agents/rules/new-task-workflow.md`, `README.md`, `CODEX_DESIGN_HANDOFF.md` và file này.
2. Kiểm tra Git và diff hiện tại; không làm mất thay đổi của người dùng.
3. Hoàn tất các blocker web desktop còn lại của **Batch 0**, sau đó chuyển sang Batch 1; không để lỗi viewport mobile chặn tiến độ.
4. Trước mỗi batch, trình implementation plan và danh sách file dự kiến sửa.
5. Sau mỗi batch, chạy quality gate, chụp các viewport desktop và báo rõ phần mock/deferred.
6. Dừng trước thao tác GitHub nếu người dùng chưa cho phép tạo issue, push hoặc mở PR.
