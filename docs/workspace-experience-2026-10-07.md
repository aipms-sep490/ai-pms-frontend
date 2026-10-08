# Đồng bộ trải nghiệm các role ngoài bộ môn — 07/10/2026

## Phạm vi

Áp dụng ở layout của các trang đã đăng nhập. Lớp mới được bật theo role và đường dẫn, không dựa vào một trang demo. Đối chiếu ma trận 102 route hiện có: 75 route đã đăng nhập thuộc phạm vi lớp trình bày mới; 3 trang xác thực giữ thiết kế đã nâng cấp ở lượt trước; 24 route bộ môn/học vụ được để lại cho lượt sau. Đây là phạm vi mã nguồn, không phải số trang đã kiểm tra trực tiếp trên dữ liệu thật.

| Role / nhóm | Các nhóm trang được áp dụng |
|---|---|
| Sinh viên | Tổng quan, phối hợp nhóm, hồ sơ đồ án, nhóm, đăng ký đề tài, công việc và chi tiết, mốc, lịch thực hiện, báo cáo và biểu mẫu, họp và chi tiết/phòng họp, hạng mục, tệp, minh chứng, đóng góp, bàn giao, kết quả; AI khi cấu hình cho phép |
| Giảng viên | Tổng quan hướng dẫn, danh sách đồ án/yêu cầu, hồ sơ chuyên môn và các trang bên trong đồ án đang hướng dẫn |
| Hướng dẫn chuyên ngành | Danh sách phân công, không gian theo ngành, công việc/chi tiết, báo cáo/chi tiết, cuộc họp/chi tiết, minh chứng |
| Người chấm | Phân công, tổng quan đánh giá, chi tiết phân công, biểu mẫu chấm, xem bàn giao |
| Quản trị | Tài khoản/chi tiết, phân quyền, danh mục đồ án, mẫu mốc, cấu trúc đào tạo, xác minh hồ sơ |
| Dùng chung | Hồ sơ, bảo mật, thông báo, lịch tổng hợp |

Bộ môn: không bật lớp thiết kế mới khi role chính là bộ môn, khi đường dẫn bắt đầu `/department/`, hoặc tại `/academic/governance`, `/academic/rubrics`, `/academic/project-periods/...`. Component dùng chung vẫn có thể nhận sửa trạng thái tải/lỗi; lượt này không thiết kế lại luồng bộ môn.

## Những thay đổi cụ thể

- Tiêu đề 26–32px, mô tả 14–15px; vùng đọc giới hạn độ dài dòng. Ô nhập tối thiểu 44px; nhãn 13px, bỏ chữ hoa và giãn chữ quá mức trong biểu mẫu.
- Vùng nội dung thống nhất với thanh chuyển khu vực đồ án. Bỏ việc container con 1.200px thụt thêm vào trong layout 1.400px. Hồ sơ chuyên môn vẫn giữ độ rộng phù hợp cho biểu mẫu.
- Bộ lọc có nền nhẹ, khoảng cách 16px, padding 24px/18px; các dòng danh sách dùng cùng nhịp, vùng bấm và cột hành động. Quy trình họp/báo cáo là một surface riêng, có đường phân chia bên trong.
- Bảng có nhãn cột, khoảng cách dòng và phản hồi hover nhất quán. Chi tiết và biểu mẫu giữ cấu trúc chức năng sẵn có; không xóa mọi card hoặc thêm hiệu ứng vào vùng đọc.
- `ListLoading` thay các dòng chữ chờ tải ở báo cáo, họp, phần thực hiện, kho tệp, phân công mentor/evaluator, danh sách tài khoản/nhật ký. Không có nút hoặc dữ liệu giả trong khung tải.
- `Ctrl K` / `Cmd K`: tìm không dấu, phím lên/xuống, Enter mở, Escape đóng và trả focus. Menu lấy từ điều hướng của tài khoản, thêm thông báo/bảo mật và phân quyền cho quản trị. Giảng viên đang mở đồ án có lối đi thẳng tới chức năng trong đồ án; mentor giữ đúng project/major hiện tại. Các route guard vẫn kiểm tra quyền độc lập.
- Không tạo thêm yêu cầu API cho menu tìm nhanh: dùng dữ liệu quyền đã có tại header. Không cài thư viện mới trong lượt này.
- Đồng bộ nút mở lịch họp/báo cáo của workspace với `ButtonLink`; đường quay lại quản trị dùng icon chuẩn. Bỏ cụm “scope hiện tại” khỏi thông báo lỗi hồ sơ giảng viên.

## Sửa trạng thái dữ liệu và điều hướng

- Tổng quan giảng viên: khi tải lỗi, xóa dữ liệu cũ; phản hồi cũ không ghi đè kết quả mới sau đổi bộ lọc.
- Phân công mentor: tải lỗi không hiện lại danh sách của lần tải trước.
- Kho tệp: tải lỗi không giữ lại các tệp của lần tải trước.
- Quản trị: chỉ hiện bảng/phân trang sau khi dữ liệu sẵn sàng; không hiện số 0 hoặc số cũ khi còn tải. Phản hồi từ bộ lọc cũ bị bỏ qua khi yêu cầu mới đã bắt đầu.
- Trang tài khoản giữ URL bộ lọc khi vào chi tiết rồi quay lại; các ô lọc được đồng bộ lại khi URL thay đổi.

## Kiểm tra

- Toàn bộ: `pnpm test --run` — **153 tệp / 685 kiểm thử đạt** tại lượt chạy đầy đủ.
- Sau sửa cuối: shell, quản trị và workspace — **6 tệp / 27 kiểm thử đạt**, gồm kiểm thử mới cho phản hồi tài khoản đến sai thứ tự.
- `pnpm lint` và `pnpm build` đạt. Bundle chính khoảng 303KB gzip; cảnh báo chunk lớn hơn 500KB vẫn còn. Lượt này không xử lý chia bundle.
- Trình duyệt giảng viên: mở báo cáo từ danh sách đồ án; Ctrl K tìm `lich hop`, Enter mở đúng lịch họp; xác nhận focus ở ô tìm kiếm, Escape trả về nút mở. Lịch họp desktop/390px không tràn ngang.
- Trình duyệt quản trị: đăng nhập bằng tài khoản được cung cấp, lọc tài khoản, vào chi tiết và quay về URL bộ lọc; chi tiết desktop/390px không tràn ngang.
- Trình duyệt sinh viên: mở công việc sau khi cuộn danh sách, kiểm tra trang chi tiết, mở biểu mẫu chỉnh sửa rồi hủy; desktop/390px không tràn ngang. Ô nhập thực tế 44px, chữ 14px, tiêu đề 32px/26px.
- Các trạng thái có ghi dữ liệu được xác nhận bằng kiểm thử; không gửi nhận xét/chốt điểm hoặc thay đổi quyền thật để làm demo.

Ảnh và báo cáo dễ xem: `/ui-changes.html#experience`. Ma trận route chi tiết vẫn ở `ui-route-review-matrix.md`. Mentor/evaluator thiếu phân công thật trong tài khoản thử nghiệm, nên không khẳng định toàn bộ trang sâu của hai phạm vi này đã kiểm tra trực tiếp. Google OAuth được bỏ qua theo chỉ đạo trước đó.
