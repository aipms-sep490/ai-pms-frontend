# Kết quả FE Đợt 3 — 2026-10-22

Cập nhật kiểm chứng: 2026-10-23 (Asia/Saigon).

**Trạng thái: PARTIAL — FE đã triển khai; nghiệm thu staging đang chờ truy cập.**

Nguồn yêu cầu: `FE_QUY_TRINH_DOT3_2026-10-22.md`. Nhánh bàn giao: `feat/uiux-master-redesign`; baseline `e17e9c0`. BE chỉ đọc, đối chiếu DTO/controller tại `origin/develop` `837787a` (sau `acc6f04`). Không suy ra trạng thái deployment từ Git.

## Phạm vi và kết quả

| Việc | Thay đổi / kiểm chứng FE | Staging |
|---|---|---|
| R3-01 | `MILESTONE` có nhãn/icon đúng; bỏ attention từ dashboard; dashboard vẫn phục vụ fallback calendar và không làm sai badge. Regression xác nhận đúng một mốc. | Pending: 401 |
| R3-02 | Cả ba aggregator nhận `totalCount`/`hasMore`; nguồn bị cắt hiển thị N đã nhận trên tổng BE. NORMAL vẫn chỉ đếm trong dữ liệu đã tải. | Pending: 401 |
| R3-03 | Nguồn lỗi có alert/retry; thiếu phạm vi hiển thị message nguồn một lần trong attention, không retry. Badge có atomic contextual live status và giữ node qua refresh. | Pending: 401 |
| R3-04 | JSON POST `/projects/{projectId}/review-gates/{gateCode}/evidence` có `linkUrl`; chỉ EXTERNAL_LINK mở chế độ link. Validate HTTPS; giữ nháp; artifact và reviewer metadata phân biệt link/tệp, rút gọn URL, full URL trong title/aria-label, link ngoài an toàn; không download/0 byte/checksum. | Pending: 401 |
| R3-05 | POST `/feedback` chỉ `{ feedback }`; nhóm nhận xét theo gate; advisory; label/error/draft/double-submit. Guard response cũ khi đổi route; lỗi readback sau POST thành công không mất form/nháp và có tải lại riêng. | Pending: 401 |
| R3-06 | Nhãn ưu tiên `hybridScopeLabels`, sau đó legacy map, cuối `Ngành {key}`; giữ scope key số. Live governance chỉ đọc; kết quả nhánh không được trình bày như tự phê duyệt cổng. | Pending: 401 |
| R3-07 | `hasTasks === false`: “Chưa có công việc”, không 0%/bar; task thực có 0% vẫn giữ đúng. | Pending: 401 |
| R3-08 | Regression và browser xác nhận drawer hiện reasons theo khóa gate. Không sửa logic lấy/render reasons để tạo bằng chứng giả. | Pending: chưa có ảnh ma trận thật |

## Phân tầng bằng chứng

- Unit/component tests kiểm logic và controlled responses; không chứng minh persistence/RBAC thật.
- Playwright chạy trang/component thật qua harness riêng, `reviewGatesMockEnabled=false`, nhưng **mọi HTTP API đều bị intercept**. Ảnh có nhãn “Không phải dữ liệu staging”. Đây là controlled browser evidence.
- Đăng nhập UI tại `http://localhost:5175` và API thật `https://api-staging.khaidz.com/api/v1/auth/login`: sinh viên P1, giảng viên IT, staff IT đều trả **401**. Người dùng xác nhận đúng staging và cần leader kiểm tra reset mật khẩu. Không có phiên authenticated để nghiệm thu.
- Kiểm tra lại ngày 23/10 với sinh viên P1 nhận **HTTP 530**. Phân loại là upstream chưa phục vụ được yêu cầu; không kết luận mật khẩu đúng/sai hay đã reset từ phản hồi này. Bằng chứng: `staging-auth-recheck-20261023.json`.
- Không gọi mutation đồ án trên staging, không seed/migration, không tạo/publish template. Không lưu mật khẩu/token vào source, báo cáo hay ảnh; ảnh blocker đã để trống field mật khẩu.
- Sáu ảnh staging bắt buộc vẫn **Pending**: R3-01,03,04,05,06,08. Không thay bằng ảnh fixture rồi gắn nhãn staging.

## Kiểm tra và bằng chứng

| Kiểm tra cuối | Kết quả |
|---|---|
| Toàn bộ Vitest, ngày 23/10, 4 worker | **1452/1452 đạt, 261 file, 0 skip** |
| Playwright controlled HTTP | **14/14 đạt, 37 ảnh, 0 skip** |
| Typecheck | Exit 0 |
| Lint | Exit 0; **190 warnings tồn tại sẵn**, giảm từ 193; **0 warning mới** |
| Build production | Exit 0; vẫn có cảnh báo chunk lớn |
| Review độc lập | Đã xử lý cả 3 finding bắt buộc; không còn finding bắt buộc |
| Staging hiện tại | HTTP 530 ngày 23/10; trước đó 401; **chưa nghiệm thu** |

Kết quả cuối cùng được lưu tại `F:/AI-PMS/artifacts/round3-20261022/verification-summary.json` và `unit-results.json`; Playwright tại `playwright-controlled.json`, ảnh tại `browser/`. Các log RED/GREEN cho lỗi bất đồng bộ và metadata được giữ riêng.

- Typecheck, toàn bộ Vitest, lint và production build chạy bằng script repo. Xem summary cho exit code và số lượng chính xác của snapshot bàn giao.
- Lint baseline có **193 cảnh báo** trước thay đổi. Không nới rule/assertion hay suppress để đạt exit 0. So sánh diagnostic theo file/code/message được lưu cùng bằng chứng; không coi exit 0 là zero warnings.
- Playwright cuối: **14/14 đạt, 37 ảnh**, bao gồm reviewer metadata trên 390px. Mọi API bị intercept; không có request API ngoài fixture hoặc lỗi JavaScript bất ngờ.
- Responsive: 390/768/1280/1440; chuỗi tiếng Việt dài; keyboard Enter/Tab/Escape và focus return; CTA tối thiểu 44×44, khoảng cách hành động 8px; document không tràn ngang ở các view được đo.
- Zoom: viewport 720×450 tương đương layout của 1440×900 ở 200%, đồng thời CSS zoom 200% ở viewport 1440×900 đều đạt. Modal được clamp theo cả phần trăm viewport và dvh; có thể cuộn body để thấy đầy đủ CTA. **Chưa xác nhận native browser zoom bằng menu trình duyệt.** Không gộp ba loại thành một khẳng định.
- Review độc lập phát hiện ba lỗi cần sửa (late POST qua route, failed readback mất nháp, reviewer metadata link); có regression và đã sửa trước bàn giao. Không thêm dependency UI.
- Một lượt full-suite mặc định có **1451/1452 đạt**: test COLD “saves the note...” gửi giá trị ghi chú ban đầu. File COLD không thay đổi trong Đợt 3; chạy riêng cả baseline lẫn source mới đều **7/7 đạt**. Giữ `unit-default-workers-failure.json` và log; lượt chạy cuối giới hạn 4 worker, không đổi source/rule/assertion COLD. Đây là dấu hiệu không ổn định cần theo dõi, chưa xác định chắc nguyên nhân.
- Lượt 4 worker qua phiên kéo dài có hai test đồng bộ timeout (AcademicWorkflowGate và EligibilityBanner), đồng thời thiếu một test LiveKit trong report. Giữ nguyên `unit-four-workers-interrupted.json`; không dùng report này để tuyên bố toàn suite đạt. Ngày 23/10, kiểm tra riêng ba file từng thất bại đạt **13/13**, rồi chạy lại toàn bộ suite trong phiên mới.
- Lượt toàn bộ suite mới ngày 23/10 đã **1452/1452 đạt trong 136.70 giây**, không thay assertion, timeout hoặc source ngoài phạm vi để đạt kết quả này. Các failure trước vẫn được giữ để không che dấu điều kiện chạy không ổn định.

## Blocker và bước tiếp theo

1. **Leader/BE deployment:** kiểm reset demo trên đúng DB staging, rồi nghiệm thu thật trong ba project `40006`, `40007`, `40008`. Chỉ đánh dấu staging PASS sau authenticated browser/API readback và ảnh thật.
2. **BE đã biết theo tài liệu giao việc:** URL >255 ký tự gây 500; requirement Type chưa validate đầy đủ. FE không đặt giới hạn URL giả hay sửa BE; test dùng URL ngắn. Hai lỗi này chưa được tái kiểm live do 401.
3. **Chất lượng tồn tại sẵn:** lint chưa zero warnings; build có cảnh báo chunk lớn. Không mở rộng đợt này để sửa toàn bộ repo hay hạ ngưỡng. Native browser zoom còn chờ kiểm thực tế.
4. **Bàn giao Git:** người dùng đã duyệt commit và push ngày 23/10/2026 theo Bước 5. Thực hiện ba nhóm commit, push đúng nhánh và đối chiếu HEAD với `git ls-remote origin`; kết quả máy đọc nằm tại `git-delivery.json` trong thư mục bằng chứng. Không mở PR hoặc merge.

## Các nhóm commit đã chuẩn bị

1. `fix(calendar): remove duplicate milestone attention and use backend totals`
2. `feat(review-gates): submit external link evidence and supervisor feedback`
3. `fix(review-gates): use backend scope labels and task presence flag`

Tests tổng hợp, harness kiểm chứng và báo cáo đi cùng nhóm bàn giao cuối. Thân commit phải nêu rõ controlled evidence và staging 401; không mô tả nghiệm thu staging đã hoàn tất.
