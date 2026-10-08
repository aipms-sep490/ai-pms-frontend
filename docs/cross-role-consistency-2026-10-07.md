# Đồng bộ giao diện giữa các vai trò

## Lớp dùng chung

`AppLayout` tải `workspace-consistency.css` cho toàn bộ khu vực đăng nhập của sinh viên, giảng viên, hướng dẫn chuyên ngành, người đánh giá, bộ môn và quản trị. Không phụ thuộc route hoặc kiểm tra tên role trong stylesheet.

- Khoảng cách bố cục: 24px desktop, 16px điện thoại.
- Padding nội dung panel: 24px desktop, 18px điện thoại cho các component nội dung đã xác định. Phần trong surface ghép vẫn dùng quy tắc riêng để không tạo card lồng card.
- Khoảng cách control/form và focus ring thống nhất.
- Nút dùng chung và nút của công việc, cuộc họp, báo cáo có cùng thời gian phản hồi 180ms; nút disabled không nhận hover.
- Giảm chuyển động áp dụng cho mọi nút/link trong khu vực đăng nhập, gồm cả component dùng CSS riêng.

## Nhóm danh sách / chi tiết

Bộ tiêu chí, phương án đánh giá, phiên bản chính sách kỳ đồ án và phân quyền quản trị dùng `workspace-master-detail`: danh sách tối thiểu 250px, cột nội dung linh hoạt; dưới 1024px dùng một cột; danh sách sticky và cuộn trong viewport trên desktop. Các surface, quyền thao tác và nội dung từng trang được giữ lại.

## Kiểm tra

- Toàn bộ frontend: 152 tệp, 677 bài kiểm thử đạt; lint và build đạt. Sau chỉnh cấu hình watcher, TypeScript đạt.
- Kiểm tra trực tiếp giảng viên, quản trị/phân quyền và bộ tiêu chí đã công bố; đọc stylesheet thực trong DOM xác nhận gap24px desktop, gap16px ở390px, cột chuyển sang một và không tràn ngang.
- Kiểm tra khu vực phân quyền không thực hiện lưu, đổi quyền hoặc gán vai trò.
- Vite từng cache module rỗng trong lúc file được ghi lại trên Windows, gây trắng trang. Khởi động lại phiên chạy và thêm `awaitWriteFinish` 200ms đã khôi phục trang; không phải lỗi build production.
- Ảnh `.downloads/ui-review/admin-shared-layout.jpg`, `rubric-shared-layout.jpg` ở workspace gốc.

## Phạm vi xác nhận

Các quy tắc chung áp dụng xuyên suốt AppLayout và các nhóm component nêu trên. Đây không phải bằng chứng rằng từng route, popup và trạng thái dữ liệu của mọi vai trò đều đã được kiểm tra trực tiếp trong lượt này. Hiệu ứng spotlight dành cho ô truy cập chức năng; biểu mẫu và bảng dữ liệu không bị gắn hiệu ứng trang trí giống ô truy cập.
