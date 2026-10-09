# Rà soát chi tiết giao diện — 07/10/2026

## Các sửa đổi trong lượt này

- Đường dẫn chấm điểm cũ được chuyển tới màn hình chấm theo phân công đã lưu, tránh hai giao diện với quy tắc lưu khác nhau. ID không hợp lệ, không có phân công hoặc bị từ chối đều có thông báo và đường quay lại.
- Danh sách phân công phân biệt trạng thái không tải được với chưa chấm; số tổng hợp chỉ phản ánh các trạng thái tải thành công.
- Hộp thoại dài cuộn phần nội dung, giữ tiêu đề và nút đóng. Nút bị vô hiệu hóa không đổi màu hoặc chuyển động khi rê chuột.
- Trên màn hình dưới 600px, điều hướng trong đồ án dùng bộ chọn khu vực thay cho nhiều hàng tab; giữ nguyên đồ án và phạm vi vai trò.
- Khi tải bộ lọc thông báo thất bại, bỏ danh sách của bộ lọc trước. Lỗi đánh dấu đã đọc vẫn giữ lại thông báo để thử lại.

## Kiểm tra trực tiếp

- Tài khoản giảng viên, màn hình 390×844: mở bản nộp và phản hồi đã tải đầy đủ; hộp thoại không tràn ngang, nút đóng hiển thị.
- Chuyển từ hạng mục cần nộp sang lịch họp bằng bộ chọn khu vực đúng đồ án.
- Bảng thông báo nằm trong màn hình; Escape đóng bảng và trả focus về chuông; trang không tràn ngang.
- Khôi phục kích thước trình duyệt sau kiểm tra.
- Ảnh kiểm chứng: `.downloads/ui-review/mobile-version-review-polish.jpg` tại workspace gốc.

## Phạm vi và giới hạn

Kiểm thử hồi quy: 152 tệp, 677 bài kiểm thử đạt. Lint đạt; build production đạt (còn cảnh báo kích thước bundle).

Các thay đổi hộp thoại, thông báo và điều hướng áp dụng qua thành phần dùng chung. Kiểm thử phân quyền và luồng chấm điểm sử dụng fixture; tài khoản đang có không có phân công chấm thực để kiểm tra trên staging. Không ghi điểm, gửi phản hồi hoặc thay đổi phân công chỉ để kiểm thử giao diện. Không thể kết luận mọi lỗi trên dữ liệu và môi trường triển khai khác đều đã hết.
