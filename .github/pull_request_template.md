## Mô tả thay đổi
<!-- Tóm tắt ngắn gọn các thay đổi và mục tiêu nghiệp vụ của PR -->

## Checklist chuẩn hoá UI/UX (Rule 08 §16)
- [ ] **Màu sắc & Token:** Không thêm họ accent thứ 2, giữ chuẩn teal `#087D77`, không hardcode mã màu ngoài `@theme`.
- [ ] **Bảng & Danh sách:** Dùng component `Table` / `TableHead` có `band`, không tự viết thẻ `<table>` thô.
- [ ] **Chỉ số & Thẻ trạng thái:** `StatTileRow` có ≤4 ô, tối đa 1 ô hero tô đặc; `PENDING` render `—`, điểm 0 render `0`.
- [ ] **Dải danh tính:** Mọi trang chi tiết/detail mở đầu bằng `EntityIdentityStrip` (back-link + 3-5 chip định danh).
- [ ] **Phê duyệt & Quyết định:** Dùng `ActionVerdict`, nút Duyệt/Nộp disable có lý do nhìn thấy (`blockers`), Từ chối luôn bật.
- [ ] **Khung cấu hình:** Trang cấu hình mở ở View mode mặc định, dùng `ConfigModeFrame` có cặp Lưu/Hủy dính trên.
- [ ] **Trạng thái giao diện:** Xử lý cụ thể 5 trạng thái (rỗng thật, rỗng lọc, chưa công bố/khóa, thiếu quyền, lỗi tải) qua `WorkspaceState` / `WorkspaceEmptyState`.
- [ ] **Trợ lý AI & Thông báo:** Mọi panel AI đều có nhãn tư vấn ("advisory notice", không thay thế quyết định học vụ); thông báo chia nhóm Hôm nay / Trước đó.
- [ ] **Kiểm thử & Tiêu chuẩn:** Đạt typecheck (`tsc`), lint (`oxlint`), test (`vitest`) và build (`vite build`) 100%.
