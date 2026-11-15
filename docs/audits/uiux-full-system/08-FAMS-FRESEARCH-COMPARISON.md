# Đối chiếu mẫu trình bày — áp dụng có chọn lọc

FAMS: `F:/AI-PMS/c/docs/uiux/reference-screens` và `10-FAMS-SCREEN-CATALOG.md`; đã xem trực tiếp `image171.webp` (lịch), `image246.webp` (quyền), `image116.webp` (yêu cầu lịch). Fresearch: trang công khai `https://fresearch.vn/` chuyển tới login; ảnh người dùng cung cấp về danh sách lớp, form nhập mật khẩu, tài liệu và PDF chỉ chứng minh **hình thức hiển thị**. Không thao tác trên hệ thống của họ. Đối chiếu dưới đây là đề xuất, không là xác nhận chức năng FAMS/Fresearch.

| AI-PMS hiện có | Mẫu tham khảo và giới hạn | Quyết định / tác động |
| --- | --- | --- |
| Project Period catalog, team eligibility, registration | Fresearch ảnh thẻ lớp có tìm kiếm, lọc, CTA rõ; “lớp” của AI-PMS là Project Period hiện hữu theo quyết định người dùng | `ADAPT`: hiển thị kỳ, ngành, điều kiện tham gia và bước tiếp rõ hơn trên route hiện có. Không tạo thực thể lớp hoặc password mới. `FE_COMPONENT`, giữ BE eligibility. |
| Defense/room planner | FAMS `image171.webp` dùng dải lọc thời gian và lưới lịch | `ADAPT`: lịch phòng/ca ở AI-PMS có bộ lọc kỳ, phòng, trạng thái, chi tiết slot; giữ xung đột và quyền từ BE. `FE_COMPONENT`; runtime chưa test. |
| Admin RBAC | FAMS `image246.webp` cho nhìn nhanh nhóm quyền | `ADAPT`: tóm tắt quyền hiệu lực và phạm vi trước khi sửa; tránh checkbox gợi ý sai rằng role toàn cục đủ để chấm. `FE_COMPONENT`; BE assignment là authority. |
| Yêu cầu đổi lịch | FAMS `image116.webp` có form tập trung | `ADAPT`: hiện ca cũ, ca đề nghị, lý do, người duyệt, xung đột và kết quả; không bỏ kiểm tra phòng/hội đồng. `FE_COMPONENT`, có thể cần API hiện có. |
| Tài liệu bộ môn, minh chứng và preview | Fresearch ảnh danh sách tài liệu + modal PDF | `ADAPT`: metadata người tải, format, xem trước và tải về trên AI-PMS; giữ phân quyền tài liệu theo ngành, phiên bản và hợp đồng Office preview hiện có. `.pdf/.docx/.xlsx` cần test thật từng loại. |
| Chat và thông báo | Ảnh Messenger của người dùng: khung chat gọn, bubble, dấu đã xem, thao tác theo tin; Fresearch có số thông báo dễ thấy | `ADAPT`: tăng mật độ thông tin, badge không bị cắt, timestamp có nghĩa; giữ khả năng AI-PMS hiện có (reply/edit/recall/reaction/attachment/readers). Không thêm gọi/video hay “đã giao” nếu BE chưa hỗ trợ. |
| Review Gate/Defense/COLD | Không mẫu ngoài nào chứng minh học vụ AI-PMS | `KEEP` domain AI-PMS: hai evaluator cố định Gate 1–3, committee Defense/COLD, policy version, scope, audit. Chỉ làm rõ presentation và bước kế tiếp. |

Nền tảng thiết kế là token xanh lam hiện tại ở `src/index.css`; màu cam/xanh của mẫu ngoài chỉ dùng phụ trợ theo ngữ nghĩa. Quy tắc FAMS cũ ghi primary teal cần đối soát tài liệu, không được coi là lệnh đổi màu sản phẩm.
