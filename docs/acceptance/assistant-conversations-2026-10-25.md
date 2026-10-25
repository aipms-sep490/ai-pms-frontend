# Trợ lý AI: hội thoại, nguồn và bản nháp

Nhánh `feat/assistant-conversations`, gốc `origin/develop` tại `b49b3ac`, tích hợp tường minh dependency `feat/assistant-floating-dock` đến `5137326`. Chưa tự push/merge develop.

## Luồng dùng thử

1. Đăng nhập tại http://localhost:5175, mở icon AI trên icon tin nhắn.
2. Gửi “Tên dự án tưởng tượng của tôi là Sao Mai”, sau đó “Tên tôi vừa nói là gì?”. Bot dùng các lượt trước trong cùng hội thoại.
3. Thu nhỏ/mở lại hoặc chuyển trang cùng phạm vi: giữ hội thoại. Đổi tài khoản/đồ án: tách phiên.
4. Tải lại trang, mở AI → **Lịch sử hội thoại** → chọn cuộc trò chuyện để đọc và hỏi tiếp. Có tải thêm hội thoại/tin nhắn cũ và xóa với xác nhận.
5. Khi đang trả lời, xem nội dung xuất hiện từng đoạn; bấm **Dừng trả lời** để hủy. Nếu dừng sát lúc lưu xong, mở lịch sử để xác nhận kết quả.
6. Hỏi theo tài liệu DEMO, bấm tên tài liệu để mở trích đoạn đúng phiên bản. Các minh chứng task/mốc/họp/báo cáo có đường dẫn nội bộ tới trang chi tiết khi đang ở phạm vi sinh viên/GVHD.
7. Mở AI từ trang đồ án → chọn **Soạn công việc** → nhập yêu cầu → sửa bản nháp → **Dùng bản nháp · mở biểu mẫu**. Chọn mốc/ngành/người phụ trách rồi tự bấm tạo. AI chưa tạo task khi trả lời.
8. Chọn **Soạn lịch họp** tương tự. Form nhận tiêu đề/nội dung; bạn chọn ngày giờ, địa điểm, người tham gia và bấm lưu. Không tự gửi lời mời.
9. Tải TXT/Markdown và gửi ảnh/tệp vẫn dùng được.

## Ngữ cảnh và quyền

- Trang hiện tại gửi nhãn như Công việc/Cuộc họp, không gửi toàn bộ DOM, query string hoặc thông tin ẩn.
- Backend tự kiểm tra project và scope; thông tin trang chỉ là gợi ý.
- Lịch sử lưu theo tài khoản/phạm vi đồ án. Model dùng tối đa 8 lượt gần nhất/16.000 ký tự. Cần gửi lại file/ảnh nếu muốn đọc lại nội dung gốc.
- Bản tạm streaming chưa xác minh nguồn; chỉ response hoàn tất được xem là kết quả đã lưu.
- Trích dẫn mở bản snapshot tại thời điểm hỏi, không tải toàn bộ tệp nguồn.
- Khi xóa hội thoại, lịch sử hỏi bị xóa; nhật ký kiểm toán câu trả lời vẫn được hệ thống giữ lại.

## Kiểm thử

- 133 test FE đạt (20 file): AI/dock, history, cancellation, source, draft handoff, form validation, HTTP stream UTF-8/auth refresh, router/layout/chat và regression meeting/task.
- Typecheck và production build đạt; còn cảnh báo bundle lớn và một số lint effect/purity đã ghi nhận.
- Browser thật trên staging: nhớ câu trước, mở lại sau reload, 2 dạng draft, dừng, desktop/mobile. `checks.json` ghi run 110005-110008; DB readback và audit được đối chiếu.
- Browser source viewer: run 110012, phiên bản DEMO-2026.1, không tràn mobile.
- Evidence: `../outputs/assistant-conversations-20261025/`.
- Script chính: `scripts/assistant-conversations-smoke.mjs`. Các script cũ chuyển sang đọc final từ lịch sử vì CDP có thể không giữ response body của streaming.

BE staging đã được deploy và migration đã áp sau backup. FE local đang chạy cổng 5175. Việc tạo task/lịch họp thật từ bản nháp trên dự án của bạn vẫn cần bạn chọn dữ liệu và xác nhận ở form; test này không tạo task/lịch thật trên dữ liệu dùng chung.

Tạo ảnh, web search, thông tin thời tiết trực tiếp chưa nằm trong đợt này. Google login có thể vẫn báo challenge 403 do cấu hình proxy/origin của môi trường; luồng nghiệm thu dùng tài khoản test đăng nhập mật khẩu.
