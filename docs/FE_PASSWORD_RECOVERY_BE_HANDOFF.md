# Bàn giao BE: Quên mật khẩu và đổi mật khẩu

Trạng thái: **FE_DONE_BE_PENDING**. FE ở nhánh `feature/auth-password-recovery-fe`, tách từ `develop` tại commit `0c750f4`. FE giữ nguyên đường dẫn và cấu trúc request của API hiện có. Chưa có bằng chứng luồng khôi phục qua email thật và SQL hoạt động hoàn chỉnh.

## Hợp đồng FE đang sử dụng

| Chức năng | API / request | Hành vi FE |
| --- | --- | --- |
| Yêu cầu khôi phục | `POST /api/v1/auth/forgot-password` với `{ email }` | `202` chỉ có nghĩa yêu cầu được tiếp nhận. FE hiển thị cùng một thông báo cho mọi email, không khẳng định thư đã tới hộp thư. Phân biệt lỗi `429`, `503` và lỗi kết nối. |
| Đặt lại bằng liên kết | `POST /api/v1/auth/reset-password` với `{ token, newPassword }` | Lấy `token` từ `/reset-password?token=...`; thiếu token thì hướng dẫn xin liên kết mới. `204` dẫn tới đăng nhập; `401`/`409` cho phép xin liên kết mới. |
| Đổi khi đã đăng nhập | `POST /api/v1/auth/change-password` với `{ currentPassword, newPassword }` và bearer token | Sau `204`, xóa phiên FE và chuyển về đăng nhập; hiển thị lỗi phù hợp cho `401` và `409`. |

FE kiểm tra mật khẩu dài 10–128 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt theo validator BE hiện tại. BE vẫn là nơi kiểm tra có thẩm quyền.

## Việc dev BE và vận hành cần hoàn thành

1. **Cấu hình gửi email.** Cung cấp `Email:Host`, `Email:Port`, `Email:EnableSsl`, `Email:SenderAddress`, `Email:SenderName`, `Email:Username`, `Email:Password` và `Email:PasswordResetUrl` của từng môi trường bằng User Secrets hoặc secret của môi trường chạy. URL phải trỏ tới trang FE tương ứng; dùng HTTPS ở môi trường triển khai. Xác minh tài khoản gửi, tên miền và kết nối SMTP với nhà cung cấp email. Không commit thông tin đăng nhập. Google Client ID dùng để đăng nhập Google, không dùng để gửi email đặt lại mật khẩu.
2. **Bảo đảm ý nghĩa của `202 Accepted`.** `SmtpPasswordResetNotifier` hiện bỏ qua việc gửi khi thiếu cấu hình SMTP và bắt lỗi gửi thư; `ForgotPasswordCommandHandler` vẫn trả về xác nhận chung. BE cần định nghĩa `202` là yêu cầu đã được đưa vào hàng đợi đáng tin cậy hoặc được hệ thống gửi thư tiếp nhận, không phải bảo đảm thư đã đến hộp thư. Khi dịch vụ gửi không sẵn sàng, trả lỗi `503` đã lược bỏ dữ liệu nhạy cảm và ghi lỗi cho vận hành. Phản hồi cho email không tồn tại hoặc tài khoản không hoạt động phải không tiết lộ trạng thái tài khoản; không ghi raw token vào log.
3. **Kiểm chứng token và phiên đăng nhập.** Đối chiếu schema SQL thật của `password_reset_tokens`: chỉ lưu hash của token, gắn với một tài khoản, hết hạn theo cấu hình hiện tại (30 phút), vô hiệu token cũ, chỉ cho sử dụng một lần bằng thao tác nguyên tử. Sau đặt lại hoặc đổi mật khẩu, vô hiệu access token và refresh session cũ. Kiểm tra các request dùng token đồng thời và việc ghi audit khi thất bại.
4. **Kiểm thử và cung cấp bằng chứng chạy thật.** Bổ sung test BE cho tài khoản hợp lệ/không tồn tại/ngừng hoạt động, thiếu SMTP, lỗi gửi tạm thời, token hết hạn/đã dùng, mật khẩu sai quy tắc, dùng token đồng thời, thu hồi phiên và audit. Với tài khoản thử nghiệm được phép sử dụng, chạy luồng: yêu cầu → nhận email thật → mở liên kết → đặt lại → đăng nhập bằng mật khẩu mới → mật khẩu cũ bị từ chối → liên kết không dùng lại được. Xác nhận trạng thái SQL tương ứng.

## Điều kiện hoàn thành

FE đã sẵn sàng với hợp đồng API trên. Chỉ chuyển từ **FE_DONE_BE_PENDING** sang **DONE** khi BE chứng minh được gửi email thật và toàn bộ luồng qua mailbox, API, browser và SQL. Nếu BE thay đổi status code hoặc payload, cập nhật mapping lỗi FE và tài liệu này trước khi xác nhận hoàn thành.
