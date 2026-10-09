# Rà soát giao diện chức năng chi tiết — 07/10/2026

## Thay đổi

- Cuộc họp: mở biểu mẫu kết luận và công việc sau họp khi cần, giữ nội dung khi thu gọn; điểm danh hai cột trên máy tính, một cột trên điện thoại; khoảng cách nút và biểu mẫu rõ ràng; nút quay lại về danh sách cuộc họp.
- Báo cáo: phần nhận xét nằm cùng vùng nội dung rộng, tránh soạn phản hồi trong cột bên hẹp.
- Công việc: phân loại chuyên ngành có nhãn tiếng Việt và trạng thái lỗi/thử lại, bỏ phản hồi cũ khi chuyển công việc; giữ enum trong API. Không cho chọn trùng ngành. Minh chứng dùng màu chủ đạo, trình chọn tệp tiếng Việt, liên kết công việc có khoảng cách giữa tên và mô tả.
- Bộ môn: dịch trạng thái hồ sơ và lịch sử, bỏ biểu mẫu phản hồi khi không có thao tác thẩm định, bỏ quy tắc CSS tạo thẻ cho mọi section lồng nhau. Nhãn và lỗi của yêu cầu nhân sự được viết lại bằng tiếng Việt.
- Giảng viên, hướng dẫn chuyên ngành, người chấm, quản lý chính sách và xác minh điều kiện: dùng tiêu đề và bố cục WorkspacePage chung. Người chấm có mô tả nghiệp vụ dễ hiểu; liên kết mở phân công không chứa nút tương tác lồng nhau.
- Quản trị: chọn bộ môn và ngành từ danh mục thật, đổi bộ môn sẽ xóa lựa chọn ngành cũ. Giữ nội dung khi tạo/import thất bại. Giữ quyền đã chọn khi lọc, thay đúng lựa chọn khi đổi vai trò. Đồng bộ font, biểu mẫu, bảng và bố cục điện thoại.

## Kiểm tra bằng Chrome DevTools MCP

Dữ liệu thật cục bộ:

- Giảng viên: cuộc họp 4, biểu mẫu biên bản và điểm danh; báo cáo 3; bàn làm việc.
- Sinh viên: công việc 9, liên kết công việc, minh chứng, bình luận và phân loại chuyên ngành.
- Bộ môn: thẩm định đồ án 2; chính sách giai đoạn 5; xác minh hồ sơ học vụ.
- Kiểm tra màn hình 1440 px và 390 px. Trang công việc và biểu mẫu cuộc họp được đo không tràn ngang ở 390 px. Thẩm định đồ án cũng không tràn ngang.

Dữ liệu mô phỏng chỉ đọc:

- Quản trị: tổng quan, mở biểu mẫu tạo tài khoản, danh sách quyền, đổi vai trò, hồ sơ tài khoản và chọn bộ môn/ngành.
- Người chấm: phân công 41, điểm và nhận xét từng tiêu chí, nhận xét tổng thể, thông tin bàn giao. Bản xem thử chặn toàn bộ yêu cầu ghi.
- Các tệp xem thử tạm được xóa sau kiểm tra, không tham gia sản phẩm.

## Giới hạn xác minh

- Tài khoản test.admin@aipms.test và admin01@fpt.edu.vn chưa đăng nhập được với mật khẩu thử nghiệm hiện có trên local và staging. Không xác nhận thao tác quản trị thành công trên dữ liệu thật.
- Tài khoản giảng viên đang dùng không có phân công người chấm đang hiệu lực. Không tạo phân công hoặc chốt điểm thật để kiểm tra bố cục.
- API chính sách giai đoạn 5 trả 403 cho cán bộ bộ môn; giao diện giữ trạng thái từ chối và không giả lập quyền.
- Không thay đổi nội dung do người dùng nhập, kể cả nội dung tiếng Anh trong dữ liệu mẫu.
- Đợt này không kiểm thử cuộc gọi LiveKit hai thiết bị.

## Kiểm thử hồi quy

Các trường hợp bổ sung kiểm tra lựa chọn quyền qua bộ lọc, đổi vai trò, giữ dữ liệu tài khoản khi tạo thất bại, quan hệ bộ môn/ngành, thử lại sau lỗi tải và bảo toàn enum chuyên ngành trong API.

Kết quả: 148 tệp kiểm thử, 649 trường hợp đều đạt. Lint không có cảnh báo. Build thành công; còn cảnh báo kích thước bundle đã có của ứng dụng.

Kiểm tra thêm bằng tài khoản bộ môn: /department/student-qualifications tải đầy đủ, không có lỗi và không tràn ngang ở 390 px.

## Bố cục phẳng và kiểm tra quản trị thật

- Áp dụng nguyên tắc phân cấp và khoảng trắng từ design-taste-frontend vào giao diện sản phẩm hiện có; giữ hệ thống React/Tailwind, màu xanh lá và bộ điều khiển hiện có. Không thêm thư viện.
- WorkspacePage dùng lớp workspace-flat. Phần nội dung chính của công việc, cuộc họp, báo cáo và hồ sơ đồ án dùng một mặt phẳng liền mạch; các mục con tách bằng khoảng cách và đường chia nhẹ, không có khung bo góc lồng nhau. Cột thông tin phụ có nền trong suốt.
- Quản trị, phối hợp nhóm, chính sách, xác minh điều kiện và màn hình giám sát dùng các vùng phẳng. Viền trường nhập, trạng thái cảnh báo và bề mặt video được giữ để nhận biết thao tác.
- Hồ sơ đồ án đặt thông tin chung và thành viên trước phần trách nhiệm chuyên ngành.
- Tài khoản quản trị mới người dùng cung cấp đã đăng nhập thành công vào local. Đã kiểm tra tổng quan quản trị, hồ sơ tài khoản 11 và danh sách quyền bằng dữ liệu thật; không thay đổi tài khoản hay quyền trên máy chủ.
- Hồ sơ đồ án và quản trị được đo không tràn ngang ở 390 px. Chi tiết báo cáo được kiểm tra ở 1440 px.
- 68 kiểm thử liên quan đạt; build thành công và lint sạch.

## Đồng bộ các vai trò và chẩn đoán Google — 07/10/2026

- Dùng chung khung trang cho 18 màn hình còn dùng mẫu riêng. Đồng bộ dải chỉ số, bộ lọc và các dòng biểu mẫu ở tổng quan giảng viên, danh mục đồ án bộ môn/quản trị và phân công đánh giá.
- Khung nội dung ngoài bo nhẹ; các phần bên trong dùng khoảng cách và đường chia, không thêm lớp thẻ. Áp dụng cho chi tiết công việc, cuộc họp, báo cáo, hồ sơ đồ án, bàn giao, cơ cấu điểm và hồ sơ chuyên môn.
- Bổ sung ButtonLink dùng chung kiểu nút với Button, loại bỏ nút lồng trong liên kết ở cơ cấu điểm và phân công người chấm. Hướng dẫn chuyên ngành có đường vào trực tiếp công việc, báo cáo và lịch họp trong đúng phạm vi được phân công.
- Sửa tiêu đề trang đề tài/hồ sơ giảng viên bị CSS riêng ghi đè; sửa breadcrumb “phương án đánh giá đánh giá”, tên menu và các mã trạng thái/chuyên môn đang hiển thị trực tiếp.
- Chrome: rà 48 địa chỉ ở sinh viên, giảng viên, bộ môn, quản trị. Kiểm tra thêm chi tiết công việc, báo cáo, cuộc họp, mốc đồ án và hồ sơ giảng viên. Các màn đã tải trong lượt rà không tràn ngang. Màn phân công đánh giá/hướng dẫn chuyên ngành của tài khoản hiện tại có thể là trạng thái rỗng; không tạo phân công để kiểm thử.
- Kiểm tra lại ở chiều rộng CSS thật 390 px sau khi nhận thấy mức zoom Chrome ảnh hưởng giả lập; các trang của bộ môn, quản trị và giảng viên được đo không tràn ngang. Các luồng sinh viên còn được kiểm tra ở chiều rộng hẹp hơn, 292 px. Không thay đổi dữ liệu học vụ khi rà giao diện.
- Google: API challenge trả 200 và đúng Client ID cấu hình. Google Identity Services báo origin chưa được phép. Người dùng yêu cầu tạm bỏ qua sửa cấu hình Google Cloud. Chưa xác minh đăng nhập Google thật thành công; cần thêm origin trong OAuth Web client và dùng tài khoản đã liên kết.
- Phía web Google đã sửa phiên hết hạn, lấy challenge mới khi thử lại, trạng thái xác thực, thời gian chờ tải script, thông báo liên kết tài khoản và nút theo chiều rộng khả dụng. Năm kiểm thử bổ sung dùng Google callback giả lập, không dùng token thật.
- Hồi quy đầy đủ: 149 tệp, 654 trường hợp đạt. Sau chỉnh nhãn menu/breadcrumb, 18 kiểm thử router/layout đạt thêm. Build thành công; lint sạch. Cảnh báo kích thước bundle lớn đã có vẫn còn.


## Bề mặt và liên kết sau phản hồi ngày 07/10/2026

- Tham khảo bố cục dự án của Linear (https://linear.app/docs/projects), trang sản phẩm Asana (https://asana.com/features/project-management) và quy trình quan sát/đối chiếu trong repo người dùng gửi (https://github.com/JCodesMore/ai-website-cloner-template). Giữ React/Vite hiện có; không đưa template Next.js hoặc thư viện mới vào ứng dụng.
- Khôi phục khối tổng quan đồ án với nền xanh nhạt, khung ngoài bo 14 px và khoảng đệm. Danh sách có bề mặt riêng; hàng và phần bên trong dùng đường phân cách, không thêm thẻ con.
- Áp dụng cùng cách nhóm cho chỉ số bộ môn, danh mục đồ án, người chấm, quản trị và giảng viên. Trang chi tiết công việc/cuộc họp/báo cáo có khung chính và khung phụ; các phần trong mỗi khung không có viền quanh hoặc bóng.
- Nhãn ngữ cảnh/mã đồ án dùng chữ sans, bỏ giãn chữ và kiểu monospace ở các nhãn được sửa. Loại giai đoạn bộ môn dùng nhãn tiếng Việt; ngày hiển thị đến phút.
- Liên kết điều hướng ở phối hợp nhóm, bộ môn, giảng viên, hướng dẫn chuyên ngành, hàng cuộc họp và hàng báo cáo dùng cùng kiểu hành động gọn. Mũi tên tách riêng, không gạch chân hoặc dịch chuyển khi hover.
- Sửa nút trên lộ trình sinh viên đang dùng ID mốc M3 cố định thành đường vào danh sách mốc thật; thêm một kiểm thử điều hướng chống tái phát.
- Chrome DevTools xác minh hover của Xem mốc đồ án: không gạch chân chữ/mũi tên, nền và chữ vẫn tương phản. Khi một số lệnh DevTools treo, chuyển sang trình duyệt trong ứng dụng để hoàn tất kiểm tra.
- Kiểm tra giao diện thật ở sinh viên, giảng viên, bộ môn, quản trị; kiểm tra thêm chi tiết cuộc họp ở 1440 px và 390 px. Các màn được đo không tràn ngang; bốn phần chính của chi tiết cuộc họp có border-left 0, radius 0, shadow none bên trong khung ngoài. Không thay đổi dữ liệu học vụ hoặc quyền tài khoản trong kiểm tra.
- 70 kiểm thử liên quan ở bảy tệp đạt, kiểm thử điều hướng mới đạt riêng. Lint sạch. Build thành công, còn cảnh báo bundle lớn đã có. Không chạy lại toàn bộ bộ kiểm thử ở lượt sửa giao diện này.
- Ảnh đối chiếu lưu tại E:/DOANTOTNGHIEP/.downloads/ui-review/.


## Chốt lượt tiếp tục 07/10/2026
Xem [ui-review-resume.md](ui-review-resume.md) và [ui-route-review-matrix.md](ui-route-review-matrix.md) cho các sửa mới, 665 kiểm thử đạt, ảnh đối chiếu và giới hạn kiểm tra trực tiếp.
