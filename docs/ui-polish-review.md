# Rà soát giao diện — 06/10/2026

## Những thay đổi đã thực hiện

- Thống nhất cỡ, độ đậm và khoảng cách tiêu đề trong vùng nội dung; giữ hệ màu xanh lá của dự án. Biểu mẫu dùng cùng font, trạng thái tập trung và màu lựa chọn.
- Các trang cấu trúc đào tạo, học kỳ, bộ tiêu chí và phân công đánh giá dùng khung WorkspacePage. Cây đào tạo và tiêu chí con dùng đường phân cách thay cho nhiều lớp thẻ.
- Thu gọn biểu mẫu tạo đề tài vào mục mở rộng để ưu tiên danh sách hiện có.
- Rà nhãn, hướng dẫn, lỗi và trạng thái trên các nhóm trang; thay thuật ngữ triển khai bằng tiếng Việt dễ hiểu. Mã gửi tới API và nội dung người dùng nhập được giữ nguyên.
- Bỏ thông tin hình thức đồ án bị lặp; sửa radio chọn hình thức để một lần bấm chỉ gọi xử lý một lần.
- Bổ sung khung xem trước camera khi chưa mở thiết bị, làm rõ trạng thái trước khi tham gia. Không tự yêu cầu quyền camera/micrô.

## Kiểm tra trực tiếp bằng Chrome DevTools

Các trang đã kiểm tra với phiên đăng nhập thật và dữ liệu hiện có:

- Sinh viên: lộ trình, tổng quan, không gian đồ án, công việc, mốc, lịch thực hiện, báo cáo, hạng mục cần nộp, kho tệp, lịch họp, tạo lịch họp, nhóm, đóng góp, bàn giao, kết quả, lịch tổng hợp, hồ sơ và thông báo.
- Bộ môn: cấu trúc đào tạo, học kỳ/giai đoạn, bộ tiêu chí, đề tài, phương án đánh giá, phân công người chấm và giám sát giảng viên.
- Giảng viên: tổng quan hướng dẫn, bàn làm việc, hồ sơ giảng viên, bàn làm việc đánh giá, lịch và hồ sơ tài khoản.

Đã kiểm tra ở desktop và nhiều trang ở 390 × 844. Các trang được đo ở kích thước di động không tràn ngang toàn trang. Biểu đồ thời gian vẫn có vùng cuộn ngang riêng. Đã xem ảnh chụp của trang tổng quan, lịch họp, kho tệp, hạng mục, cấu trúc đào tạo, phân công, bộ tiêu chí, thông báo và bảng thả xuống thông báo.

Biểu mẫu tạo bộ tiêu chí mở đúng trên mobile, không có input/select vượt mép màn hình. Chuông thông báo mở bảng tại chỗ, có vùng cuộn riêng. Giao diện video trước khi tham gia được kiểm tra bằng dữ liệu mô phỏng khả năng tham gia ở riêng một tab; đã gỡ mô phỏng sau kiểm tra. Phòng thật hiện báo người tổ chức chưa mở phòng.

## Kết quả tự động

- Vitest: 146 tệp, 642 kiểm thử đạt.
- ESLint: đạt.
- TypeScript và Vite production build: đạt. Vite vẫn cảnh báo một số gói lớn hơn 500 kB.

## Phạm vi xác nhận

Chưa xác nhận cuộc gọi LiveKit với hai người dùng và thiết bị thật. Không phải mọi trạng thái dữ liệu, mọi quyền quản trị hoặc mọi trình duyệt đều được kiểm tra trực quan trong lượt này. Nội dung đề tài/tài liệu bằng tiếng Anh do người dùng hoặc dữ liệu mẫu cung cấp vẫn giữ nguyên.
