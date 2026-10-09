# Người chấm và email nhắc họp — 07/10/2026

## Email trước cuộc họp 15 phút

Đã có trong backend, không cần viết lại hoặc thêm endpoint gửi thủ công:

- `MeetingReminderSettings`: mặc định 15 phút, quét mỗi 30 giây, tính năng mặc định tắt.
- Worker đã được đăng ký trong DependencyInjection.
- Chỉ gửi cho người được mời còn quyền tham gia, cuộc họp SCHEDULED thuộc đồ án ACTIVE, chưa bắt đầu và nằm trong cửa sổ 15 phút.
- Có chống tạo hàng đợi trùng, kiểm tra lại khi gửi, bỏ email của lịch đã hủy/đổi giờ hoặc người mất quyền; SMTP thất bại có thử lại.
- Chỉ có thể nói gửi xấp xỉ trước 15 phút, vì còn thời gian quét, tải hệ thống và SMTP.

Cấu hình cục bộ được kiểm tra: chưa có khóa bật MeetingReminders và chưa có SMTP host trong appsettings/User Secrets; không có biến môi trường MeetingReminders trong phiên shell. Không thể suy ra cấu hình máy staging từ kết quả này. Chưa xác nhận thư vào hộp thư thật.

Để vận hành cần SMTP trong cấu hình riêng, `MeetingReminders__Enabled=true`, `MeetingReminders__MinutesBefore=15`, API chạy liên tục và schema hàng đợi hiện có. Không bật gửi email thật trong đợt rà này.

Kiểm thử đã chạy: MeetingReminderWorkerTests **2/2 đạt**, bao gồm quét theo lô, cô lập lỗi, bỏ bản nhắc lỗi thời, retry và từ chối khởi động khi bật tính năng mà thiếu SMTP. Các kiểm thử SQL đầy đủ chưa chạy: không có AIPMS_TEST_SQL_CONNECTION được cung cấp; không dùng cơ sở dữ liệu staging cho kiểm thử tạo/xóa dữ liệu.

## Người chấm đồ án (Evaluator)

Đã hoàn thiện các phần hiện có:

1. Danh sách phân công có bộ lọc tất cả/chưa chốt/đã chốt và nút tải lại.
2. Nút vào phân công thể hiện bước tiếp theo: bắt đầu chấm, tiếp tục chấm hoặc xem đánh giá đã chốt.
3. Gói bàn giao và đường mở tài liệu nằm trước phần nhập điểm; quay về đúng phân công vừa mở tài liệu. Mở trực tiếp gói bàn giao thì đường về mặc định là không gian người chấm.
4. Biểu mẫu tiêu chí chung một bề mặt, chia hàng bằng đường phân cách; có tổng điểm đã lưu, số tiêu chí còn thiếu và tình trạng thay đổi chưa lưu.
5. Không thể chốt nếu điểm/nhận xét chưa lưu, tiêu chí chưa đủ hoặc tổng điểm chưa được backend xác nhận. Giữ backend là nguồn tính điểm và kiểm tra quyền/thời hạn.
6. Khi rời trang có thay đổi hoặc đang gửi dữ liệu, hiển thị cảnh báo; chọn ở lại giữ nguyên điểm đang nhập. Có cảnh báo trước khi đóng/tải lại tab.
7. Bản đã chốt và phân công chỉ đọc tiếp tục không có quyền sửa/chốt.
8. Ngày giờ dùng định dạng UTC+7 chung; icon quay lại được ẩn khỏi tên truy cập để trình đọc màn hình không đọc “arrow_back”.

## Xác minh

- Nhóm kiểm thử evaluations/final-submission: 35 kiểm thử, toàn bộ đạt sau sửa tên truy cập của link quay lại; kiểm tra mới gồm bộ lọc, chặn chốt điểm chưa lưu, giữ bản nháp khi ở lại, thiếu tiêu chí, đường bàn giao và quay về đúng phân công.
- Build và lint đạt. Build còn cảnh báo kích thước bundle hiện có.
- Trình duyệt với giảng viên thử nghiệm: trang người chấm tải xong, hiển thị chưa có phân công, không tràn ngang desktop. Màn hình chấm sâu được kiểm tra bằng fixture do tài khoản này chưa có phân công chấm thật; không tự phân công hoặc chốt điểm thật để tạo dữ liệu QA.

Tham khảo backend: `E:/DOANTOTNGHIEP/ai-pms-backend/docs/meeting-email-reminders.md`.
