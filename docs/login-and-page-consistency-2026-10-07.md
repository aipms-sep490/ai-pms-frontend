# Thiết kế đăng nhập và tiếp tục đồng bộ từng chức năng

## Đăng nhập

Tham khảo bố cục chia đôi của Harnish Design: https://dribbble.com/shots/6668415-Split-Screen-Login-Page. Thiết kế riêng cho AI-PMS, không sao chép hình hoặc mã nguồn bên ngoài.

- Desktop: giới thiệu quy trình đồ án bên trái, form bên phải; điện thoại chỉ giữ phần đăng nhập và nhận diện.
- Form có hiện/ẩn mật khẩu, liên kết khôi phục cạnh nhãn, thông báo lỗi có liên kết truy cập hỗ trợ, trạng thái đang xác thực khóa các control nhập liệu.
- Giữ nguyên xác thực và điều hướng theo vai trò. Đăng nhập sinh viên được xác nhận trực tiếp.
- Google OAuth localhost vẫn bị từ chối bởi cấu hình origin; không coi đây là chức năng đã sửa xong. Thông báo dự phòng được thu gọn, không lồng thêm hộp cảnh báo.

## Những trang chỉnh riêng trong lượt này

| Vai trò | Chức năng | Thay đổi |
|---|---|---|
| Sinh viên | Cách đăng ký đề tài | WorkspacePage thống nhất tiêu đề, khoảng cách, đường quay lại; hai lựa chọn có trạng thái được chọn và focus rõ; nút hành động dùng Button chung; thông tin cách đăng ký không còn một card lớn bao quanh. Trạng thái tải/lỗi giữ được khung trang. |
| Giảng viên | Tổng quan hướng dẫn | Header và nút tải lại dùng component chung; bộ lọc có surface và padding đầy đủ, không để các control nằm trần trên nền. |
| Người chấm | Đánh giá được phân công | Header, surface, nút và đường quay lại chung; “Rubric” thành “Bộ tiêu chí”; thời gian Việt Nam; khóa các lượt mở khác khi đang tạo bản nháp. Lỗi tải không hiện thêm trạng thái rỗng hoặc danh sách cũ. |
| Bộ môn | Xác minh điều kiện sinh viên | Bảng dùng cùng surface với bộ lọc và các trang quản lý. |
| Bộ môn | Phân tích rủi ro đồ án | Header và đường quay lại dùng WorkspacePage thay cho tiêu đề/đường dẫn tự dựng. |

Các thay đổi này tiếp nối lớp chung và nhóm danh sách/chi tiết trong `cross-role-consistency-2026-10-07.md`, cùng ma trận route trong `ui-route-review-matrix.md`. Không giới hạn đồng bộ ở trang đăng nhập.

## Kiểm tra

- Toàn bộ frontend: 152 tệp, 679 kiểm thử đạt sau thay đổi đăng nhập, đăng ký, phân công chấm và bảng xác minh.
- Lint và build đạt. Có cảnh báo dung lượng bundle hiện hữu.
- Kiểm tra trình duyệt đăng nhập desktop/390px, đăng nhập sinh viên, trang lựa chọn đăng ký desktop/390px và đổi lựa chọn; không ghi dữ liệu đồ án. Chiều rộng nội dung đúng 390px, không tràn ngang.
- Không tuyên bố mọi popup/trạng thái dữ liệu của 102 route đã được kiểm tra trực tiếp. Phân công mentor/evaluator thiếu trên tài khoản thử nghiệm vẫn là giới hạn kiểm tra bằng dữ liệu thật.

Ảnh tại `ai-pms-frontend/.downloads/ui-review/login-redesign-desktop.jpg`, `login-redesign-mobile.jpg`, `registration-shared-layout.jpg`, `registration-mobile.jpg`.
