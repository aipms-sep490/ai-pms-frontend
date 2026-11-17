# Responsive và accessibility — chỉ phần đã đo

Chromium local, FE `7e21521b`, không đăng nhập. Đã mở `/login` ở 360×800, 390×844 và 1440×900; `/forgot-password` và `/reset-password` ở 390×844. Ở các lượt này không thấy horizontal **document** overflow hoặc page JavaScript exception. `/reset-password` thiếu token hiển thị trạng thái link không hợp lệ. Không gửi form, không xác nhận tương phản WCAG hoặc keyboard flow toàn trang.

| Nhóm | Đã quan sát | Chưa đo; test tiếp |
| --- | --- | --- |
| Public auth | 3 route render, h1 có, mobile không tràn document | Focus order, label/error announcement, 200% zoom, contrast, Google callback với API thật |
| Desktop workspace | Chưa có session | 1366×768, 1440×900, 1920×1080: sidebar/header, bảng, trạng thái, action visibility |
| Mobile/tablet workspace | Chưa có session | 360/390/768/1024: drawer, bảng cuộn, lịch, Gantt, task board, chat/notification, modal scroll |
| Keyboard/screen reader | Chưa đo | Tab/Shift+Tab, Escape, focus return, name/role/value, field errors, live region, reduced motion |

**Tiêu chí thiết kế đề xuất** (chưa phải lỗi được đo): `WCAG 2.2 AA`; focus luôn nhìn thấy, icon button có tên, badge có text cho assistive tech, dialog khóa focus và trả focus, lỗi form gắn field, trạng thái màu đi với chữ, animation tôn trọng `prefers-reduced-motion`. Nội dung bảng/Gantt có thể cuộn ngang trong container được báo rõ, nhưng toàn trang không được tràn.

Ảnh thật và metadata nằm trong [gallery](SCREENSHOT-INDEX.md). Mỗi ảnh chỉ xác nhận đúng route/viewport ghi kèm; không được dùng để đánh giá trang có đăng nhập.

## Authenticated desktop supplement

The later 1440×900 Chromium read-only sweep attempted 148 role/route combinations. No document-level horizontal overflow or uncaught page exception was observed in those samples. This does not establish component-level scroll usability, dialog accessibility, stable loading completion, network success, or mobile/tablet layout. Some routes were flag-disabled or returned API 403/404/500. The earlier table's “no session” cells describe the first checkpoint only; mobile/tablet authenticated and keyboard/screen-reader checks remain `NOT_TESTED`.
