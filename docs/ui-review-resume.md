# Tiến trình rà giao diện — cập nhật 07/10/2026

## Yêu cầu còn hiệu lực
Rà từng vai trò, từng trang, từng chức năng và các biểu mẫu/chi tiết bên trong. Không coi đo tràn ngang hay đọc tiêu đề là đã kiểm tra toàn bộ giao diện. Giữ các thay đổi đang có; không reset checkout.

## Đã sửa trong lượt này
- Học kỳ/giai đoạn: bố cục thẻ ngoài có khoảng đệm, thời gian và điều kiện rõ ràng; trạng thái tách khỏi hành động. Đổi trạng thái dùng select và hộp xác nhận chung; đã thử và hủy, không ghi dữ liệu thật.
- Biểu mẫu học kỳ/giai đoạn dùng Modal chung; lỗi và kiểm tra thời gian/sĩ số hiển thị trong biểu mẫu, có trạng thái đang lưu.
- Bộ tiêu chí: mở sẵn bản công bố, chọn mục có dấu hiệu rõ, tách tải danh sách/tải chi tiết, bỏ phản hồi tải cũ khi chọn nhanh. Bản chỉ đọc hiển thị nội dung và trọng số, không dùng hàng loạt ô bị khóa. Biểu mẫu nháp giữ chỉnh sửa; xóa tiêu chí con cuối cùng khôi phục điểm tối đa. Kiểm tra tên tiêu chí đệ quy. Hủy tạo mới và xác nhận thao tác có giao diện chung; mã phiên bản dùng ô một dòng.
- Phương án đánh giá: ô chọn trong thành phần chuyển từ 4 sang 2 cột, trạng thái rỗng có nội dung rõ, thêm hủy tạo mới, thay confirm trình duyệt và chỉnh nhãn công bố.
- Đóng góp: Việt hóa SUFFICIENT, USER, CREDIT và xác nhận lưu bản tổng hợp bằng Modal chung.
- Xác minh điều kiện: bỏ nút tải lại bị lặp, bổ sung nhãn cho ô tìm/lọc, cho bảng cuộn cục bộ.
- Hồ sơ học vụ: 404 là chưa có hồ sơ, không báo lỗi tải giả. Nhật ký quản trị và tên vai trò tự nhiên hơn. Lịch bỏ lời giải thích kỹ thuật calendar projection.
- Tạo cuộc họp: quay lại danh sách, mô tả dùng chung phù hợp các vai trò. Đã kiểm tra chọn từ xa và cảnh báo bỏ thay đổi; hủy nội dung thử nghiệm.
- Công việc: bổ sung kiểu ô nhập cho .ex-field (trạng thái/ghi chú), sửa padding cộng hai lần, bổ sung .ex-full và .ex-form-footer (span, khoảng cách nút), nút hành động tiêu đề không xuống dòng tùy tiện.
- Không còn window.confirm/window.prompt trong các feature sau thay đổi chính sách và lưu trữ danh mục.

## Kiểm tra đã thực hiện
- Typecheck đạt trước những chỉnh nhãn/CSS cuối; lần cuối session 49411 đã đạt. Lint đạt sau sửa công việc.
- 8 kiểm thử trong AcademicGovernancePage và RubricManagementPage đạt; kiểm tra mở bản công bố, hủy tạo phiên bản, khôi phục điểm tối đa khi bỏ con cuối, bỏ phản hồi tải cũ.
- Toàn bộ test suite session 22790 đã được khởi chạy; xem kết quả trong output cuối trước khi tiếp tục. Chưa chạy build sau những sửa cuối.
- Trình duyệt thực: đăng nhập được bộ môn, quản trị, giảng viên, sinh viên. Rà nhiều route chính/chi tiết; một số snapshot còn bắt lúc tài nguyên con đang tải nên chưa được tính là xác minh đủ dữ liệu.
- Trực tiếp xem ảnh học kỳ/giai đoạn và bộ tiêu chí desktop/mobile 390px; biểu mẫu học kỳ; tạo phiên bản/hủy; thêm và bỏ tiêu chí con.
- Trực tiếp xem ảnh phương án đánh giá tạo nháp; tạo cuộc họp từ xa; chi tiết công việc desktop/mobile và mở chỉnh sửa, phân công, thêm liên kết rồi hủy.
- Mentor và evaluator của tài khoản giảng viên hiện không có phân công, chỉ xác minh trạng thái rỗng. Không tạo phân công/điểm/dữ liệu học vụ để kiểm tra.
- Ảnh mới: E:/DOANTOTNGHIEP/.downloads/ui-review/governance-desktop.jpg và rubric-read-desktop.jpg. Ảnh khác trong thư mục có thể thuộc lượt trước.

## Lỗi vừa tìm thấy, CHƯA sửa vì người dùng yêu cầu dừng
1. /project/status: trạng thái ACTIVE và lịch sử DRAFT/SUBMITTED/UNDER_REVIEW/APPROVED vẫn hiển thị enum thô, lời giải thích chung không hợp trạng thái thực hiện. Kiểm tra ProjectReviewStatusPage và component trạng thái/lịch sử.
2. /project/supervisor: thời gian phân công/yêu cầu còn nguyên ISO (2026-09-12T09:00:00); tên người gửi hiển thị ID hồ sơ giảng viên. Dùng formatter và tên nếu contract cung cấp.
3. Các trang /project/register, /project/edit ở dữ liệu hiện tại chỉ xem; /team/create chuyển về nhóm đã có. Chưa kiểm tra trực tiếp biểu mẫu đăng ký/tạo nhóm bằng tài khoản ở giai đoạn tương ứng.
4. Cần kiểm tra sâu thêm mẫu mốc, chính sách, kết quả/phân công có dữ liệu, phiên bản hạng mục, lọc tệp mở rộng, minh chứng từng thành viên, thông báo dropdown/list và phòng video. Có route đã đọc nhưng chưa mở mọi thao tác con.
5. Cần lập ma trận route/role/subfunction chính thức, tách trực tiếp/nguồn/test/thiếu dữ liệu. Không tuyên bố toàn bộ page hoàn thiện.
6. Xem lại điều kiện học kỳ startDate >= endDate mới thêm; bản cũ cho phép cùng ngày. Đối chiếu backend trước khi giữ hoặc đổi về > để tránh siết quy tắc ngoài yêu cầu.
7. Rubric các thao tác chuyển mục/tạo nháp có thể bỏ nội dung chưa lưu; cân nhắc guard có xác nhận chung. Kiểm tra recursive weights/maxScore bằng rule thật, không tự thay đổi nghiệp vụ.
8. Test cũ cho lưu trữ/chính sách/phương án có thể dùng window.confirm; nếu suite báo lỗi, cập nhật theo thao tác Modal và kiểm tra API chỉ được gọi khi xác nhận.

## Môi trường tiếp tục
FE E:/DOANTOTNGHIEP/ai-pms-frontend, localhost:5173; BE localhost:5080. Browser CUA iab id2, reviewTab tab2 đang ở /project/supervisor, sinh viên. Credentials đã được người dùng cung cấp trong lịch sử; không đưa vào tài liệu hay output. Google OAuth tạm bỏ qua theo chỉ đạo. Chrome DevTools MCP có lúc treo; CUA là fallback. Khi tiếp tục browser từ summary, gọi cua.rewriteDocumentation rồi lấy state mới.

Bản lưu tạm dừng đã được tiếp tục theo yêu cầu người dùng. Xem cập nhật cuối bên dưới.

## Kết quả test đầy đủ khi dừng
151 tệp: 150 đạt, 1 lỗi. 659 trường hợp: 658 đạt, 1 lỗi. Lỗi duy nhất PortfolioDashboardPage.test.tsx:38 còn mock window.confirm và chưa bấm xác nhận trong Modal mới nên archiveProject chưa được gọi. Chưa sửa theo yêu cầu dừng; lần tiếp tục cần cập nhật test theo UI mới và kiểm tra hủy không gửi API. Build chưa chạy lại.

## Kết quả sau khi tiếp tục — 07/10/2026
- Sửa kiểm thử lưu trữ theo Modal; xác nhận hủy không gọi API.
- Trạng thái đề cương/lịch sử Việt hóa theo ngữ cảnh đồ án; thời gian dùng UTC+7. Lỗi tải lịch sử được xóa khi thử lại thành công, không trình bày lỗi tải thành trạng thái chưa có dữ liệu.
- Phân công giảng viên: ngày giờ định dạng; tên từ assignments/candidates khi contract có dữ liệu; nhóm nội dung/hành động của ứng viên đúng cột; bỏ tìm kiếm không còn cần thiết khi đã phân công.
- Bộ tiêu chí: giữ thay đổi khi hủy chuyển mục/tạo mới; xác nhận bỏ thay đổi; yêu cầu lưu trước khi công bố nội dung đang sửa. Điểm tối đa khớp giới hạn backend.
- Học kỳ cho phép ngày bắt đầu/kết thúc trùng nhau theo SemesterValidators.cs, tránh siết quy tắc ngoài hợp đồng.
- RoleRoute xét các vai trò được cấp thay vì chỉ vai trò ưu tiên. Tài khoản ADMIN + DEPARTMENT_STAFF mở đúng các menu bộ môn; tài khoản chỉ ADMIN vẫn bị chặn. Có kiểm thử hồi quy.
- Phiên bản hạng mục và phản hồi mở trong drawer chung, sửa badge bị giãn cao, ô quyết định/nhận xét có khung rõ, bỏ dữ liệu tải cũ sau khi đóng/chuyển hạng mục. Giảng viên và sinh viên cùng dùng giao diện này; quyền đánh giá vẫn theo actor.
- Minh chứng thành viên mở drawer, lọc nguồn, tiêu đề không bị cắt trên điện thoại, Việt hóa nhãn báo cáo tuần/tháng, thời gian thống nhất.
- Kho tệp: PDF/Word/ZIP thay chuỗi MIME dài (MIME vẫn giữ trong title), người tải theo tên thành viên nếu có; Modal xác nhận xóa có focus/cancel. Lọc nâng cao và đổi nguồn đính kèm đã thử.
- Cuộc họp video hiển thị hình thức trực tuyến đúng dữ liệu, nhãn “Mở phòng họp” tự nhiên hơn. Đã xem dữ liệu kết nối và trạng thái phòng chưa mở; không mở phòng hoặc cấp quyền camera/micrô.
- Ma trận mới: [ui-route-review-matrix.md](ui-route-review-matrix.md), 102 route khai báo, 73 snapshot lượt trước, 13 mục kiểm tra sâu gần nhất; phân biệt nguồn/fixture/live.

### Kiểm chứng cuối
- 151 tệp kiểm thử / 665 trường hợp đều đạt (vitest --maxWorkers=4).
- Lint đạt. Typecheck/build đạt; còn cảnh báo bundle lớn đã có.
- Desktop và 390px: notification dropdown/list, policy successor form, deliverable drawer/feedback/review, member evidence, advanced file filters. Không gửi đánh giá/xóa/lưu dữ liệu học vụ.
- Ảnh đối chiếu mới: E:/DOANTOTNGHIEP/.downloads/ui-review/deliverable-review-final.jpg.

### Giới hạn còn lại
- Backend cục bộ không nối được SQL Server trong lần khởi động này; dùng staging đã cấu hình để kiểm tra browser.
- Mentor/evaluator thiếu phân công; đăng ký/tạo nhóm của sinh viên hiện có đồ án đang thực hiện. Các trạng thái đó có source/fixture tests nhưng chưa xác minh toàn bộ bằng tài khoản live tương ứng.
- Phòng video đang chưa mở: kiểm tra từ chối truy cập có lý do; không kiểm tra kết nối media thật trong lần rà UI này.
- Google OAuth bỏ qua theo chỉ đạo trước đó. Chưa deploy/commit.
- Không tuyên bố mọi route và mutation đều đã chạy thật hay giao diện “hoàn hảo”; ma trận ghi rõ phạm vi.
