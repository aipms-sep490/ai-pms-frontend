# Phối hợp nhóm — hướng thiết kế C

Hướng dẫn triển khai để gửi cho member làm các chức năng khác: [frontend-ui-guide.md](frontend-ui-guide.md).

Trang đầu tiên áp dụng: `/project/workspace`, dành cho sinh viên có đồ án đang thực hiện. Thiết kế dựa trên hướng cộng tác nhóm đã chọn, với công việc và vướng mắc là trọng tâm.

## Quy tắc hình ảnh

- Không gradient, glassmorphism, card lồng card, hoặc bóng đổ trang trí.
- Bo góc mặc định 6px. Phân cấp bằng chữ, đường phân cách và khoảng cách.
- Spacing theo nền 4px: 4, 8, 12, 16, 20, 24, 32; điều chỉnh theo nội dung.
- Nền sáng trung tính, chữ tối, xanh trầm cho hành động và trạng thái được chọn. Vàng/đỏ chỉ biểu thị vấn đề thực tế.
- Giữ font và bộ biểu tượng sẵn có. Không thêm thư viện để trang trí.
- Thành viên là danh sách từng hàng, không phải lưới card. Số thành viên lẻ không để lại ô trống.
- Desktop có cột chính và cột hỗ trợ; điện thoại dùng một cột. Nội dung dài được xuống dòng hoặc rút gọn có chủ đích.
- Nút mặc định có nền trắng, viền nhẹ, chữ vừa phải; chỉ hành động chính dùng xanh trầm. Chữ và biểu tượng dùng inline-flex, căn giữa và có khoảng cách rõ ràng.
- Bộ lọc nâng cao và biểu mẫu chỉ mở khi cần. Không biến mọi thao tác thành một khối riêng trên màn hình.

## Tiếng Việt theo ngữ cảnh

Viết như một sinh viên hoặc giảng viên dùng phần mềm quản lý đồ án. Ưu tiên câu ngắn nêu hành động, đối tượng và kết quả. Không đưa enum, tên endpoint, contract hoặc thuật ngữ triển khai vào lời hướng dẫn cho người dùng.

| Ý nghĩa | Nhãn dùng trong trang |
| --- | --- |
| Workspace | Phối hợp nhóm |
| Task | Công việc |
| Assignee | Người phụ trách |
| Milestone | Mốc đồ án |
| Deliverable | Hạng mục cần nộp |
| BLOCKED | Đang vướng mắc |
| IN_REVIEW | Chờ kiểm tra |
| Empty assignment | Chưa được giao công việc |
| Loading error | Chưa tải được [thông tin]. Hãy thử lại. |
| Permission error | Bạn chưa có quyền [hành động]. |

Tên đồ án, tên công việc và nhận xét do người dùng nhập là nội dung gốc. Không tự dịch, viết lại hoặc sửa dữ liệu này. Nhãn UI cần thống nhất giữa trang tổng quan, bộ lọc và trang đích.

## Dữ liệu và thao tác

- Dùng HTTP client xác thực hiện có, gọi trực tiếp API BE. Không dữ liệu mẫu hoặc chế độ xem trước trong runtime.
- Timeline toàn dự án cung cấp công việc và người phụ trách. Tiến độ chung dùng progress-summary của BE.
- Tiến độ từng thành viên = DONE / tổng công việc được giao, cùng định nghĩa BE (bao gồm CANCELLED). Công việc nhiều người tính cho từng người. Không có việc thì hiện trạng thái chưa được giao, không suy diễn năng suất.
- Nhận xét lấy từ ba kỳ báo cáo đã được nhận xét gần đây; không gọi đây là toàn bộ lịch sử nhận xét của dự án.
- Đọc đủ trang hạng mục nộp và lịch họp trước khi chọn nội dung gần nhất. BE sắp xếp cuộc họp theo ngày giảm dần.
- Trưởng nhóm tạo công việc bằng POST `/tasks`, chọn mốc và người phụ trách thật. BE quyết định quyền cuối cùng.
- Mỗi phần có loading, empty và error riêng. Lỗi API không được biến thành số 0 hoặc thông báo chưa có dữ liệu.
- Ngày lịch giữ nguyên ngày; datetime UTC hiển thị theo giờ Việt Nam. Bộ lọc thành viên được chuyển sang trang công việc và gửi lên BE.

## Kiểm tra khi mở rộng

Kiểm tra dữ liệu thật, nhóm có 5 thành viên, tên dài, nhiều trang dữ liệu, mất quyền truy cập, lỗi một phần, giữ nội dung biểu mẫu sau lỗi, giờ UTC+7, menu và tràn ngang trên điện thoại. Các trang khác có thể tiếp tục áp dụng hướng thiết kế này theo từng luồng sử dụng.

## Mốc đã hoàn thành ngày 26/09/2026

Đã audit lại trang Phối hợp nhóm và đồng bộ cụm Công việc, Mốc đồ án, Lịch thực hiện, bao gồm trang chi tiết công việc và chi tiết mốc. Các màn hình này dùng thành phần và kiểu dùng chung trong `src/features/execution/`; trang Phối hợp nhóm giữ bố cục cộng tác riêng nhưng cùng quy tắc hình ảnh.

- Công việc dùng danh sách có phân trang từ BE, chuyển được sang nhóm theo trạng thái. Tìm kiếm và bộ lọc được áp dụng khi bấm nút; URL giữ bộ lọc để quay lại từ trang chi tiết.
- Trang chi tiết dùng tên thành viên và tên công việc để phân công hoặc liên kết. Các trạng thái tiếp theo theo đúng luồng BE, lịch sử mới nhất ở trên. Không đưa ID vào biểu mẫu người dùng.
- Mốc đồ án dùng danh sách phẳng, tiến độ từ BE, biểu mẫu mở theo yêu cầu và thao tác sắp xếp có bước lưu. Thiếu dữ liệu tiến độ phải hiện chưa tải được, không thay bằng 0.
- Lịch thực hiện mặc định chỉ hiển thị các mốc. Có thể mở công việc từng mốc hoặc toàn bộ, đổi đơn vị tuần/tháng và cuộn ngang trong biểu đồ. Không tự tạo phần trăm, thời gian hay đường găng mà BE chưa cung cấp.
- Menu mobile khi đóng được ẩn khỏi luồng bàn phím; Escape đóng menu và trả focus về nút mở. Hủy biểu mẫu tạo công việc cũng trả focus về nút tạo.
- Khung chung và trạng thái tải dùng cùng hệ thiết kế; khi ngữ cảnh chưa tải xong chỉ hiện skeleton, không đặt trạng thái giả cho nhóm. Không đưa nút chưa có chức năng lên menu.
- Tên tab và breadcrumb lấy nhãn trang đã định nghĩa; không dùng pathname làm tiêu đề dự phòng.
- Popup dùng hộp thoại ứng dụng với nền phẳng, tên rõ ràng, hỗ trợ Escape/focus và chống gửi trùng; không dùng `alert/confirm/prompt` cho thao tác. Cảnh báo đóng/tải lại tab có nội dung chưa lưu giữ cơ chế `beforeunload` của trình duyệt.
- Hồ sơ đồ án chỉ trình bày nội dung và lịch sử thật; thông tin state machine/endpoint không thuộc giao diện người dùng. Nhóm đã chốt không hiện khối điều kiện đăng ký của giai đoạn lập nhóm.

Phạm vi kiểm thử, giới hạn và các trang tiếp theo được ghi trong [mốc bàn giao](ui-redesign-checkpoint.md). Chưa đồng bộ toàn bộ frontend.
