# Developer Self-Test — 2026-10-24

Browser self-test chạy trên FE local với BE staging thật, đối chiếu DOCX Report 3–4 cập nhật ngày 24/10/2026. Baseline: `develop` / `origin/develop` tại `a486f7f`.

## Phạm vi và kết quả

- 92 tình huống: **82 PASS, 9 FAIL, 1 BLOCKED**. PASS chỉ áp dụng cho tình huống mô tả, không chứng minh toàn bộ use case đạt.
- Đối soát trạng thái của đủ 134 UC; các nhánh chưa chạy, bị chặn hoặc chỉ có bằng chứng từng phần được giữ rõ trong báo cáo.
- 34 ghi nhận: **11 FIXED, 20 OPEN, 2 RESOLVED, 1 OBSERVED**. PR này chứa 11 chỉnh sửa UI đã kiểm tra lại; 20 vấn đề mở phía dưới vẫn cần xử lý.
- 272 ảnh được rà và chia 7 thư mục role, có PHOTO_INDEX.csv và ánh xạ ảnh → case → UC → mục Report 4.
- Bộ ảnh, HTML đầy đủ và log kiểm tra giữ ở `output/developer-self-test-2026-10-24` trong workspace cha; không đưa ảnh và fixture staging vào diff source của PR.

## 11 thay đổi UI trong PR

### FIX-01 — Hiển thị tên bộ môn và ngành trong chi tiết tài khoản

Trước: Bộ môn #20002; Ngành #20002.

Sau: Tên bộ môn/chuyên ngành và mã đọc được; dùng resolver sẵn có và dữ liệu hierarchy thật, không đổi scope.

Kiểm tra lại: AdminUserDetailPage.test.tsx: 2/2 PASS; xác minh trực tiếp DOM và ảnh.

### FIX-02 — Căn validation mật khẩu tạo tài khoản theo yêu cầu BE

Trước: Password 9 ký tự gửi tới BE và nhận lỗi 400 tổng quát.

Sau: Form chặn password dưới 10 ký tự và hiển thị gợi ý ngay trong trường.

Kiểm tra lại: Browser native tooShort=true cho 9 ký tự; POST account hợp lệ nhận 201.

### FIX-03 — Thông báo rõ khi nhật ký không có kết quả

Trước: Panel trống dưới bộ lọc.

Sau: Có status Không có hoạt động phù hợp với bộ lọc hiện tại.

Kiểm tra lại: Live filter0 kết quả + 11 test liên quan PASS.

### FIX-04 — Hiển thị đúng giờ audit và thời điểm khóa tài khoản

Trước: Thao tác lúc 06:37 nhưng hiển thị 23:37 hôm trước.

Sau: Dùng utcTimestamp sẵn có, giữ offset khi BE đã gửi; audit hiển thị đúng ngày/giờ tại Việt Nam.

Kiểm tra lại: Đối chiếu UI với đồng hồ Asia/Saigon; các test Admin liên quan nằm trong 96 test cuối đều đạt.

### FIX-05 — Phân biệt giới hạn đăng nhập với lỗi kết nối

Trước: Không thể kết nối dịch vụ xác thực.

Sau: Bạn đã gửi quá nhiều yêu cầu đăng nhập. Hãy chờ một lúc rồi thử lại.

Kiểm tra lại: 9 kiểm thử LoginPage có sẵn đạt. UI429 sau sửa kiểm tra bằng response mô phỏng; sau đó gỡ intercept và login thật thành công.

### FIX-06 — Căn hàng và định dạng thời gian Review Gate

Trước: Hàng tiêu đề chật; hạn trống; thời điểm nộp hiển thị ISO.

Sau: Cho phép xuống hàng, giữ cụm số lượng cùng hàng, ngắt mã dài và dùng dateTimeLabel có sẵn.

Kiểm tra lại: Kiểm tra lại tại 390 và 1440 px; các test Review Gates liên quan trong bộ 96 test cuối đều đạt.

### FIX-07 — Thống nhất giờ Việt Nam tại các lịch sử đã tái hiện lỗi UTC

Trước: Cùng sự kiện hiển thị 07:10 ở tóm tắt nhưng 00:10 ở lịch sử.

Sau: Dùng dateTimeLabel có sẵn cho các vị trí đã quan sát, cùng hiển thị 07:10.

Kiểm tra lại: Đối chiếu lịch sử trên UI; test hồi quy timestamp UTC thiếu offset và các test liên quan trong bộ 96 test cuối đều đạt.

### FIX-08 — Giữ đúng hạn nộp deliverable khi xem và chỉnh sửa

Trước: Nhập 18:00 nhưng xem/sửa thành 11:00.

Sau: Dùng utcTimestamp có sẵn; input sửa trở lại 18:00; giữ nguyên serialization +07:00 khi gửi.

Kiểm tra lại: UI sau tải lại giữ 18:00; test hồi quy sửa/lưu lại giữ đúng UTC gốc đã đạt. TypeScript và production build đạt.

### FIX-09 — Dùng nhãn đúng ngữ cảnh phiên bản bàn giao

Trước: v1 · Đã nhận hướng dẫn; gói khóa hiển thị ACCEPTED.

Sau: Phiên bản ACCEPTED hiển thị Đã chấp nhận ở lựa chọn và gói khóa.

Kiểm tra lại: Đã kiểm tra nhãn gói khóa trên desktop và 390 px.

### FIX-10 — Hiển thị mốc chỉ đọc trong chi tiết task Mentor

Trước: Tên mốc là link dẫn tới 404.

Sau: Mentor đọc tên mốc dạng văn bản; Student/Supervisor giữ link đến màn được hỗ trợ.

Kiểm tra lại: Đã bấm link tái hiện 404 trước sửa; sau reload Mentor không còn link, tên mốc vẫn đủ. 390 px không tràn ngang.

### FIX-11 — Gọi đúng tên và dẫn đúng không gian cho card Mentor

Trước: Đồng hướng dẫn; thông báo phân công kết thúc hoặc ngoài giai đoạn thực hiện; không có đường mở Mentor.

Sau: Hướng dẫn chuyên ngành; trạng thái đúng và link tới project/major được phân công.

Kiểm tra lại: Đã bấm link và mở đúng major 20002 trên project 50004; không thêm quyền hoặc route mới.

## 20 vấn đề còn mở

Đây là backlog quan sát trong đợt self-test, không phải danh sách lỗi đã sửa trong PR. Ưu tiên FUNC-08, FUNC-05, FUNC-09 và FUNC-07.

### ENV-02 · MEDIUM — Google login bị chặn origin localhost:5175

Thực tế: Trang login hiển thị Nguồn truy cập này chưa được phép đăng nhập bằng Google. Không đánh đồng lỗi này với luồng email/password.

### FUNC-01 · HIGH — Thời gian giai đoạn và chính sách không đồng nhất múi giờ

Tái hiện: Tạo period bắt đầu 00:00 24/10 từ input datetime-local; mở policy.

Mong đợi: Cùng mốc thời gian tại trang giai đoạn và policy; thời gian hiệu lực được giải thích rõ.

Thực tế: Trang giai đoạn hiển thị 00:00 24/10; policy phiên bản 1 hiển thị 07:00 24/10 và báo chưa có hiệu lực. Code giai đoạn gửi chuỗi local thiếu offset, policy chuẩn hóa UTC. Tạo bản kế tiếp disabled khi chưa có effective.

### UX-01 · MEDIUM — Form học vụ che lỗi trùng thời gian bằng lỗi đồng bộ tổng quát

Tái hiện: Tạo period trùng với period cùng loại chưa archive.

Mong đợi: Thông báo trùng thời gian và hướng sửa.

Thực tế: BE 409 detail overlap; UI chỉ báo Không thể đồng bộ cấu hình học vụ. Hãy thử lại.

### NAV-01 · MEDIUM — Menu Admin dẫn đến Ma trận Tiến độ Gates nhưng router trả về trang quản trị

Tái hiện: Admin bấm Ma trận Tiến độ Gates (/department/projects/progress-matrix).

Mong đợi: Đi đến màn đã được menu hứa hẹn hoặc có giải thích quyền truy cập.

Thực tế: Bị đưa về /admin/access. Registry có ADMIN nhưng route/guard không cho cùng scope.

### ENV-04 · HIGH — Dịch vụ email chưa sẵn sàng, chặn luồng quên mật khẩu

Tái hiện: Gửi yêu cầu reset với tài khoản DST.

Mong đợi: Tiếp nhận và gửi email/link được.

Thực tế: UI hiển thị dịch vụ email chưa sẵn sàng (503).

### FUNC-03 · HIGH — Member gia nhập nhóm thành công nhưng trang nhóm báo lỗi quyền

Tái hiện: Member chấp nhận lời mời; hoặc tải lại /team khi đã có nhóm.

Mong đợi: Xem roster/eligibility mà không có lỗi quyền.

Thực tế: GET /api/v1/teams/invitations trả403 vì frontend tải danh sách đã gửi dành cho Leader cả khi là Member. Cùng màn vừa báo Gia nhập thành công vừa báo không có quyền.

### UX-02 · MEDIUM — Người nhận lời mời chỉ thấy nhóm #ID, thiếu tên nhóm/người mời

Tái hiện: Member mở tab Lời mời đã nhận.

Mong đợi: Nhận biết nhóm và người mời trước khi quyết định.

Thực tế: Chỉ có Lời mời từ nhóm #50002 cùng thời gian; không có tên nhóm/người mời/lời nhắn.

### FUNC-04 · HIGH — Cập nhật chức danh trả 200 nhưng tải lại form mất giá trị

Tái hiện: Member p1.se2 → Hồ sơ → Chỉnh sửa → chức danh DST → Lưu → reload → Chỉnh sửa.

Mong đợi: Hiện chức danh đã lưu sau reload.

Thực tế: API cập nhật trả 200; trường Chức danh rỗng sau tải lại. Cần đối chiếu DTO đọc/ghi và dữ liệu phiên. Đã lưu trả giá trị cũ.

### UX-03 · LOW — Thông báo sự kiện lời mời còn tiêu đề/nội dung tiếng Anh

Thực tế: Các tiêu đề You received a team invitation và A team invitation was cancelled hiển thị nguyên văn trong giao diện tiếng Việt.

### SPEC-01 · MEDIUM — Thứ tự mời GVHD khác mô tả Report 3

Tái hiện: Đối chiếu UC-056/§3.8.3 và màn draft/readiness.

Mong đợi: Tài liệu và luồng demo thống nhất thứ tự trạng thái.

Thực tế: Report3 mô tả gửi yêu cầu trong SUPERVISOR_PENDING; FE hiện cho mời khi DRAFT và yêu cầu GVHD xác nhận trước nộp đề cương. Cần cập nhật hoặc chốt lại tài liệu, không tự đổi nghiệp vụ.

### UX-04 · MEDIUM — Chuyển task sang BLOCKED thiếu lý do chỉ báo lỗi chung

Mong đợi: Chỉ rõ cần nhập lý do vướng mắc tại trường ghi chú.

Thực tế: Không có lý do trả 400 và UI báo Thông tin chưa hợp lệ. Thêm lý do thì cập nhật thành công.

### SPEC-02 · MEDIUM — Member không tạo được báo cáo draft dù UC-075 cho phép

Mong đợi: Đối chiếu quyền tạo draft của Member trong bản report mới.

Thực tế: Danh sách ẩn Tạo báo cáo; URL trực tiếp bị capability chặn.

### FUNC-05 · HIGH — Không nộp được báo cáo do draft không gắn reporting cycle

Mong đợi: Có lịch báo cáo và bốn mục nội dung, Leader nộp được hoặc được hướng dẫn chọn kỳ.

Thực tế: Draft #40002 tạo qua UI, có lịch báo cáo thật và kỳ EXECUTION ACTIVE; submit trả 409: Progress report must be linked to a reporting cycle before submission. UI không có trường chọn cycle và báo lỗi trùng/dữ liệu cũ.

### UX-05 · MEDIUM — Lỗi thiếu kỳ thực hiện bị mô tả nhầm thành xung đột phiên bản

Mong đợi: Giải thích đúng cần kỳ EXECUTION hoặc hướng dẫn liên hệ học vụ.

Thực tế: Upload deliverable trả 409 thiếu execution window nhưng FE báo phiên bản không mới nhất. Sau tạo kỳ EXECUTION #30004, cùng file upload 201.

### FUNC-06 · MEDIUM — GVHD thiếu roster đầy đủ để phân công công việc

Mong đợi: Có thể giao việc cho mọi thành viên đang hoạt động theo UC-066.

Thực tế: Create task không có lựa chọn assignee; chi tiết chỉ suy ra người đã được giao task, không có Leader chưa từng nhận việc.

### FUNC-07 · HIGH — Công thức mô tả điểm bị cố định 50/50 dù scheme là 100% COMMON

Mong đợi: Phần giải thích phản ánh đúng phương án và công thức tính của máy chủ.

Thực tế: Scheme fixture chỉ có COMMON 100%; preview tổng 8.5. UI vẫn khẳng định Điểm đồ án = 50% điểm chung + 50% tổng hợp theo ngành, trong khi ngành chưa có điểm.

### UX-06 · MEDIUM — Không phân biệt được sinh viên trong dropdown preview kết quả

Mong đợi: Tên/MSSV hoặc ít nhất định danh khác nhau cho từng lựa chọn.

Thực tế: Hai option khác studentId đều mang nhãn Sinh viên (chưa tải được tên). Không thể chọn đúng người bằng thông tin nhìn thấy.

### FUNC-08 · HIGH — Nhóm liên ngành bị kẹt mời Mentor sau khi GVHD chính nhận lời

Mong đợi: Khi còn MENTOR_NOT_CONFIRMED, Leader vẫn xem và mời ứng viên Mentor theo ngành.

Thực tế: Project #50004 DRAFT đã có GVHD chính. submit_project bị chặn MENTOR_NOT_CONFIRMED:20002 và :20003; đồng thời view_supervisor_candidates và send_supervisor_request đều false vì SUPERVISOR_SELECTION_STATE_INVALID. UI bảo mời thêm Mentor nhưng không gọi API ứng viên, danh sách trống.

### FUNC-09 · HIGH — GVHD mất quyền đọc lịch sử/gói bàn giao qua UI khi project FINAL_SUBMISSION

Mong đợi: Phân công còn hiệu lực phải mở được gói khóa và dữ liệu lịch sử với quyền đọc.

Thực tế: SupervisorExecutionRoute chỉ nhận status ACTIVE. Sau nộp bản cuối, cả route final-submission và lịch sử meeting đều redirect workspace.

### FUNC-10 · MEDIUM — Thông báo nghiệp vụ nhóm/đề cương chưa có deep link

Mong đợi: UC-105 cho xem đích liên quan theo quyền.

Thực tế: Bấm tiêu đề không làm gì; không có link với các notification đã phát sinh trong lượt test.

## Validation và giới hạn

- 17 file test liên quan: **96/96 PASS**.
- `npm run typecheck`: PASS; `npm run build`: PASS (cảnh báo hai bundle lớn hơn 500 kB).
- `npm run lint`: 0 lỗi, 203 cảnh báo. Không khẳng định mọi cảnh báo đều có trước task.
- `git diff --check`: PASS.
- HTML được kiểm tra desktop/mobile; ảnh và liên kết nội bộ không thiếu.
- Hai lời mời Mentor trên dự án fixture được chuẩn bị qua API nghiệp vụ bằng phiên Leader thật do FUNC-08 chặn UI. Các bước nhận lời và sau đó chạy qua UI; gửi lời mời trên UI vẫn FAIL.
- Nhánh thông báo HTTP 429 sau sửa được xác minh bằng phản hồi mô phỏng có kiểm soát rồi gỡ intercept; các luồng chính dùng API staging thật, không bypass auth hoặc chỉnh DB.
- AI advisory/recommendation/history, RBAC write và các extension đang tắt chưa được nghiệm thu; video chỉ thử một người kết nối.
- Scheme đánh giá là DEMO; kiểm tra guard chặn công bố chính thức, không phát hành điểm thật.
- Mật khẩu tài khoản thử đã khôi phục, hierarchy CRUD inactive, file thử đã xóa, video room đã đóng. Dữ liệu DST khác giữ lại để tái hiện.

### Bộ test liên quan

Tái chạy bằng `npm run test --` và các đường dẫn sau:

- `src/features/auth/pages/LoginPage.test.tsx`
- `src/features/users/pages/AdminUserDetailPage.test.tsx`
- `src/features/users/pages/AdminWorkspacePhase6.test.tsx`
- `src/features/projects/utils/collaboration-workspace.test.ts`
- `src/features/review-gates/pages/ReviewGatesRealContract.test.tsx`
- `src/features/review-gates/pages/CrossRoleScenario.test.tsx`
- `src/features/teams/components/EligibilityHistoryPanel.test.tsx`
- `src/features/projects/pages/ProjectReviewPage.test.tsx`
- `src/features/projects/pages/ProjectReviewStatusPage.test.tsx`
- `src/features/projects/components/DepartmentDecisionHistory.test.tsx`
- `src/features/projects/components/ParticipatingDepartmentPanel.test.tsx`
- `src/features/projects/components/__tests__/RevisionAlert.test.tsx`
- `src/features/tasks/pages/TaskDetailPage.test.tsx`
- `src/features/meetings/video/MeetingVideoPresencePanel.test.tsx`
- `src/features/deliverables/DeliverablesPage.test.tsx`
- `src/features/final-submission/StudentFinalSubmissionPage.test.tsx`
- `src/features/supervisors/pages/LecturerWorkspacePage.test.tsx`
