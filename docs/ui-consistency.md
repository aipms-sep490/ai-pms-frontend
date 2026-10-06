# Quy ước giao diện không gian làm việc

- Dùng `WorkspacePage` cho tiêu đề, mô tả, ngữ cảnh, nút hành động và liên kết quay lại. `ExecutionPage` và `MeetingShell` kế thừa khung này.
- Chiều rộng nội dung tối đa 1200 px; khoảng đệm trong khu nội dung 24 px, trên điện thoại 16 px.
- Tiêu đề trang 26–32 px; nội dung 14 px; màu hành động chính xanh lá `#0f5b4e`, hover `#0a493f`.
- Dùng `workspace-surface` cho các khu nội dung cùng cấp. Dùng đường phân cách cho từng hàng bên trong, tránh thêm thẻ có viền và bóng trong thẻ.
- Nút thông thường cao 40 px. Trạng thái là nhãn, không được dùng kiểu nút hành động.
- Bộ lọc ưu tiên tên và trạng thái hoặc nguồn. Đặt trường ít dùng trong mục mở rộng để nội dung chính xuất hiện sớm.
- CSS reset của trang phải dùng `:where` để không ghi đè padding và margin của danh sách, biểu mẫu hoặc header.
- Trên điện thoại, phần chữ của header phải có `width: 100%` và `min-width: 0`. Kiểm tra chữ bị cắt bên trong cả khi trang không tràn ngang.
- Chờ dữ liệu quyền thao tác trước khi hiển thị thông báo bị từ chối. Giữ nguyên quyết định quyền của API.
- Chuông thông báo mở popover. Escape đóng và trả focus về chuông; chỉ liên kết “Xem tất cả” mở trang thông báo.
- Dùng tiếng Việt cho nhãn hệ thống; giữ nguyên nội dung do người dùng nhập. Không thay nội dung tùy chỉnh bằng thông báo mẫu.

Khi sửa bố cục, xem trực tiếp trong Chrome ở 390 px và màn hình máy tính. Kiểm tra header, mép danh sách, biểu mẫu, hover, focus và trạng thái tải. Kiểm thử tự động không thay thế việc xem giao diện.
