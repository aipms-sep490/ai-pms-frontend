# Lộ trình sau audit — kế hoạch, chưa được phép sửa production

**Nguyên tắc cổng:** Chỉ sửa lỗi sản phẩm khi có đường tái hiện và nguồn quyền/chính sách. `AUD-001/002` là lỗi tài liệu/metadata kiểm toán, `ENV-001` là cản trở môi trường; không gán P0 sản phẩm khi chưa có bằng chứng. FE và BE hiện là hai nhánh riêng, không merge/PR trong pha này.

| Wave | Việc cụ thể và nguồn | Phụ thuộc | Kiểm chứng xong |
| --- | --- | --- | --- |
| 0 — mở khóa bằng chứng | Xác nhận FE–BE test target, DB, flags, worker, tài khoản 10 vai trò/assignment và hai mode; khóa version chính sách. Sửa route inventory từ ancestry guard thay vì nhãn cũ (`AUD-002`). | Môi trường an toàn, không tạo dữ liệu thật tùy tiện | Browser log in, GET context, logout; route matrix phản ánh guard/flag; snapshot baseline bảo mật |
| 1 — lỗi chức năng P0/P1 *nếu được chứng minh* | Chạy 144-route inventory theo scope, click các control hiện ra; xác nhận route trắng, lỗi 403/409/422, lưu rồi refresh, deep link, unauthorized action. Sửa theo trace route → API → BE. | Wave 0 | Mỗi defect có ID, repro, network, screenshot, readback, test hồi quy; không dùng screenshot một mình |
| 2 — học vụ | Hai mode qua registration/approval/supervisor/mentor; task/evidence/reports; hai reviewer cố định Gate 1–3; final locked/Defense/COLD và result. Đối chiếu `07-*`, `13-*`. | Chính sách đang mở phải được duyệt trước khi đổi state/grade | Positive + negative role/scope tests, concurrent version, thông báo handoff và audit history |
| 3 — rule giao diện | Hợp nhất `WorkspacePage`, form, inline alert/toast/dialog, badge, loading, typography và token xanh hiện tại; đối soát rule FAMS cũ `AUD-001`. | Browser baseline thực tế để đo khác biệt | Component spec, visual regression, semantics; không thay business fields |
| 4 — sắp xếp workspace | Giữ deep links; đặt overview/tiến trình/task/evidence/Gate trong contextual tabs hoặc drawer phù hợp; so sánh số click đo thật. Chat dock và notification badge gọn, giữ attachment/readers/permission. | Wave 2–3 và số click ban đầu | Không mất action, Back/Forward/refresh, tab state, URL, keyboard, mobile |
| 5 — responsive/a11y | 7 viewport prompt yêu cầu, 200% zoom, touch target, modal/table/Gantt/chat, reduced motion | Có session các role | Không tràn document; WCAG 2.2 AA trên các luồng trọng yếu, lỗi đo có bằng chứng |
| 6 — regression | Full FE tests/build/lint, BE tests, API auth/DB readback, Playwright role/mode matrix, screenshot before/after | Mọi wave được phép triển khai | Evidence pack và quyết định nghiệm thu rõ giới hạn |

## Lựa chọn UX cần thử với người dùng thật

- **Đề xuất gộp trong cùng workspace:** danh sách + chi tiết + chỉnh sửa theo panel; progress/milestone/timeline theo tab; task board + detail drawer; Gate overview/evidence/history theo tab; assignment + chấm trên một luồng. Giữ URL cũ và scope từng vai trò. Chỉ gộp sau khi đo điều hướng và xác nhận không làm panel quá tải.
- **Thông báo:** badge lấy từ unread count server, hiển thị `9+`/`99+`, cập nhật sau mark-read và refresh; empty/error/loading riêng. Không báo thành công trước response.
- **Chat:** mục tiêu compact như mẫu người dùng, giữ sender/time, trả lời, reaction, sửa/thu hồi, tệp, người đã xem và lỗi gửi đang có trong `ChatThread.tsx`; không giả định call/video/forward được hỗ trợ.
- **Ngày:** định nghĩa schema validation theo từng nghiệp vụ (lịch tương lai, kỳ đã phê duyệt, báo cáo quá khứ, ngày sửa đặc cách), FE cho hướng dẫn; BE kiểm quyền/range. Tránh rule toàn cục “không chọn ngày quá khứ”.
- **Motion:** chuyển trạng thái 120–200 ms nếu giúp thấy kết quả; loading không che nội dung lâu; reduced-motion đưa về tức thì. Đây là đề xuất, cần kiểm tra token/chi phí rendering trước triển khai.

Ước lượng thời gian và P0/P1 sản phẩm chưa thể chốt đáng tin khi 140 route bảo vệ chưa được chạy.

## Runtime-based reprioritization (same audit, no implementation)

The later local authenticated sweep removed the no-login blocker but exposed three P1 integration failures: H-006 document templates, H-007 rubric scope columns, H-008 rubric criterion levels. It also exposed H-009: admin evaluator routes offer controls whose BE GET is 403; decide admin oversight versus academic assignment authority before changing permissions. **First dependency:** controlled UAT DB migration reconciliation with backup, rollback and read-only postcheck; never patch FE to simulate missing records. **Second:** repeat the six affected route patterns and evaluator readback, then complete scoped 403/404 adjudication. **Third:** continue the action, mutation/readback, mobile and accessibility matrices. The earlier Wave 0 wording is historical; the account/API setup is done, but schema readiness and complete fixtures are not.
