# Nâng cấp component và chuyển động

- Cài `motion` 14.0.0 bằng pnpm, cập nhật package và lockfile hiện có.
- `useEntranceMotion` dùng `motion/react-mini`: mở trang 280ms qua AppLayout cho các role; Modal dùng chung có hiệu ứng mở hộp thoại hoặc ngăn chi tiết. Giữ native dialog, focus và phím Escape.
- SpotlightLink thêm icon theo chức năng. Launchpad dùng từng surface riêng với gap16, icon44px, ánh sáng con trỏ, nâng3px khi hover. Phần tài liệu/hoạt động của giảng viên bỏ khung bao ngoài để tránh card lồng card.
- Button chính dùng chung có vệt sáng khi hover/focus. Nút disabled không chạy. Chế độ giảm chuyển động tắt entrance, nâng ô và vệt sáng.
- React Bits SpotlightCard là thành phần đã được chuyển thành liên kết; FadeContent được tham khảo cho cách xuất hiện nội dung, không sao chép mã GSAP. Uiverse là tham khảo cho cách phản hồi nút. Nguồn và giấy phép tại THIRD_PARTY_UI_NOTICES.md.

## Trang thử

`/ui-effects.html` dùng chính SpotlightLink, Button, Modal và hook Motion trong sản phẩm. Có thể thử mở hộp thoại/ngăn chi tiết, chạy lại entrance và chọn ô chức năng. Không lưu dữ liệu. `/ui-changes.html` có liên kết sang trang này; các demo cũ được giữ để đối chiếu.

## Kiểm chứng

- Toàn bộ 152 tệp / 679 kiểm thử đạt; TypeScript, lint và build đạt. Đã sửa cảnh báo dependency của hook và export của trang demo.
- Build sau tích hợp: JavaScript gzip301,17KB so với297,42KB trước lượt này, tăng3,75KB; CSS gzip tăng khoảng0,63KB. Đây là chênh lệch tổng build, không phải phép đo FPS hoặc chứng nhận mọi thiết bị không lag.
- Đăng nhập giảng viên và mở tổng quan đồ án thật: 8 ô chức năng mới, icon căn giữa bằng grid, không còn khung ngoài của nhóm ô. Chờ dữ liệu tải xong trước ảnh bằng chứng.
- Web thật ở390px: cột352px, document384px, không tràn ngang. Drawer demo ở390px có chiều rộng390px. Mở/đóng modal và drawer thành công.
- Ảnh tại `.downloads/ui-review/motion-workspace-desktop.jpg`, `motion-workspace-mobile.jpg`, `motion-components-preview.jpg` trong frontend.
- Hiệu ứng gắn theo component và AppLayout; không tuyên bố từng popup tự dựng của mọi role đã chuyển sang Modal chung.
