# Cân bằng bố cục và tương tác — 07/10/2026

## Bố cục

- Chi tiết cuộc họp: nội dung và biên bản đối diện người tham gia; trạng thái, video, kết luận, công việc sau họp và nhận xét nằm trong luồng toàn chiều rộng bên dưới. Tránh cột trái kéo dài qua nhiều phần trong khi cột phải đã hết nội dung. Bản họp mẫu trên staging: hai cột 411px và 420px.
- Báo cáo đã nộp: trạng thái ở đầu, nội dung đọc theo một cột, phản hồi ở dưới. Báo cáo đang soạn giữ cột thao tác cạnh trình soạn thảo; phản hồi không kéo dài riêng cột trái.
- Bộ tiêu chí: danh sách lựa chọn giữ trong tầm nhìn khi cuộn, có giới hạn chiều cao theo viewport. Điện thoại trở về bố cục một cột.
- Lịch tổng hợp: các điểm cần chú ý giữ trong tầm nhìn trên desktop, danh sách dài cuộn trong vùng riêng.
- Phối hợp nhóm: cột hướng dẫn và lịch giữ trong tầm nhìn trên desktop.
- Tổng quan sinh viên: danh sách hạn dài giới hạn chiều cao trên desktop; bảng ít dữ liệu giữ chiều cao tự nhiên, không kéo giãn tạo khoảng trắng. Điện thoại hiển thị danh sách đầy đủ.
- Các ô chức năng hướng dẫn đồ án/chuyên ngành dùng hai cột; trường hợp số lẻ, ô cuối chiếm cả hàng. Nút bên trong căn về đáy ô.

## Hiệu ứng

- React Bits SpotlightCard được chuyển thành SpotlightLink: dùng tọa độ chuột cho điểm sáng xanh nhẹ; áp dụng ở các ô chức năng của giảng viên, hướng dẫn chuyên ngành và bộ môn.
- Uiverse arrow button là tham khảo cho chuyển động mũi tên của `workspace-action-link` dùng chung. Viết theo component và icon hiện có.
- Không thêm dependency. Không dùng overlay chặn click. Keyboard focus có điểm sáng và viền rõ; `prefers-reduced-motion` tắt điểm sáng và chuyển động mũi tên. Touch không có hiệu ứng hover giả.
- Nguồn và giấy phép của mã React Bits đã lưu trong `THIRD_PARTY_UI_NOTICES.md`.

## Kiểm chứng

- 16 tệp / 97 bài kiểm thử của các phần thay đổi đạt. Sau tinh chỉnh chế độ đọc báo cáo, 20 bài kiểm thử báo cáo, lint và build cuối đều đạt. Build còn cảnh báo kích thước bundle có sẵn.
- Kiểm tra trực tiếp bằng tài khoản giảng viên: cuộc họp, ô chức năng (focus/overlay không chặn click), đọc báo cáo desktop và 390px. Không tràn ngang.
- Ảnh nằm ở workspace gốc `.downloads/ui-review/meeting-balanced-columns.jpg` và `workspace-balanced-actions.jpg`.
- Các thành phần dùng chung áp dụng theo các vai trò sử dụng chúng; không có tuyên bố rằng tất cả trang đã được kiểm tra trực tiếp với mọi dữ liệu thực.
