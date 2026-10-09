# Rà soát hành trình theo vai trò — 07/10/2026

## Phạm vi và kết quả

Đợt này kiểm tra điểm vào chức năng, chuyển khu vực, quay lại danh sách, ngữ cảnh phân công và thứ tự lưu/chốt. Rà nguồn router, menu và các màn hình nghiệp vụ cho sinh viên, hướng dẫn chính, hướng dẫn chuyên ngành, người chấm, bộ môn và quản trị viên. Không coi kiểm tra giao diện là bằng chứng mọi nghiệp vụ trên máy chủ đã đúng.

| Vai trò | Điểm bất tiện tìm thấy | Thay đổi |
|---|---|---|
| Sinh viên | Đã có phân công nhưng trang vẫn yêu cầu “Chọn giảng viên”, hướng dẫn gửi lời mời không còn đúng tình huống | Tiêu đề và hướng dẫn chuyển sang xem phân công/lịch sử khi đã được phân công; giữ quyền gửi yêu cầu theo máy chủ |
| Hướng dẫn chính | Từ trang chi tiết phải quay về tổng quan để chuyển sang báo cáo, lịch họp, tài liệu | Thanh chuyển khu vực dùng cùng ID đồ án trên toàn bộ nhánh thực hiện, kể cả trang chi tiết; có đường về danh sách đồ án; phòng video giữ điều hướng riêng |
| Hướng dẫn chuyên ngành | Không có lối vào cố định trong menu; khi vào sâu thiếu chuyển khu vực theo đúng ngành | Thêm điểm vào “Hướng dẫn chuyên ngành”; thanh chuyển chỉ gồm tổng quan, việc, báo cáo, họp, minh chứng, giữ cả projectId và majorId; phân công thật vẫn được kiểm tra ở route |
| Người chấm | Sửa điểm/nhận xét nhưng vẫn có thể xác nhận chốt bản lưu cũ; đường quay lại dẫn sang danh sách khác với điểm vào chính | Thay đổi biểu mẫu hủy xác nhận, khóa chốt đến khi lưu thành công; phải xác nhận lại sau lưu; quay về /evaluator/workspace |
| Bộ môn | Trang tổng quan là trang đích sau đăng nhập nhưng không có điểm vào trong menu; trang thiếu phạm vi không có đường thoát | Bổ sung “Tổng quan bộ môn”; lỗi phạm vi có đường sang hồ sơ tài khoản và tải lại, giải thích liên kết bộ môn cần kiểm tra |
| Quản trị viên | Vào hồ sơ rồi quay lại mất bộ lọc/trang; tài khoản nhiều vai trò có menu quản trị và học vụ trộn lẫn | Mang đường danh sách kèm query qua trạng thái điều hướng, kiểm tra prefix khi quay về; nhóm menu quản trị/học vụ/tài khoản riêng |

Menu chung được sắp theo nhóm ổn định, không làm thay đổi quyền route hoặc quyền API.

## Bằng chứng kiểm tra

- Trình duyệt, giảng viên: lịch họp → báo cáo trong một lần bấm, giữ projectId=2, tab hiện hành đúng, không tràn ngang desktop.
- Trình duyệt, admin: tìm “Minh” → hồ sơ → quay về giữ search=Minh&page=1. Menu tách thành quản trị hệ thống, quản lý học vụ, tài khoản và lịch.
- Trình duyệt, tài khoản bộ môn: trang tổng quan tải thành công và menu có điểm vào trực tiếp; không tràn ngang desktop.
- Tài khoản admin có vai trò bộ môn nhưng backend chưa xác nhận phạm vi bộ môn: vẫn bị chặn đúng; không tự cấp phạm vi để vượt chặn.
- Kiểm thử hồi quy mới: không chốt khi sửa điểm chưa lưu; không giữ xác nhận cũ sau lưu; điều hướng chi tiết giữ đồ án/ngành; mentor không thấy khu vực riêng của hướng dẫn chính; phòng video không có thanh chuyển dư; mang bộ lọc quản trị sang hồ sơ.
- Toàn bộ suite: 669/670 kiểm thử đạt trong lần chạy đầy đủ. Một kiểm thử còn dùng nhãn breadcrumb cũ; đã đồng bộ kỳ vọng nhãn mới và chạy lại cả tệp, 8/8 đạt. Tệp kiểm tra phạm vi bộ môn 3/3 đạt. Build và lint đạt; build còn cảnh báo kích thước bundle vốn có.

## Giới hạn

Chưa có phân công mentor/người chấm trên tài khoản thử nghiệm để xác minh bằng dữ liệu thật; các hành trình này được kiểm tra bằng fixture và quyền route. Không chốt điểm, đổi phân công, duyệt đề cương hoặc sửa hồ sơ học vụ thật khi rà soát. Google OAuth vẫn nằm ngoài đợt này theo yêu cầu trước đó.

Ảnh kiểm tra: E:/DOANTOTNGHIEP/.downloads/ui-review/role-navigation-reports.jpg
