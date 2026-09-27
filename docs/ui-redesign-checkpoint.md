# Mốc bàn giao frontend — 26/09/2026

## Checkout và chạy thử

- Nhánh: `feat/ui-c-workspace`.
- Worktree: `E:\DOANTOTNGHIEP\ui-c-workspace`.
- Frontend đang chạy: `http://127.0.0.1:5174`.
- Backend đang dùng: `http://localhost:5080`; Vite proxy `/api` sang backend.
- Các thay đổi chưa commit/merge. Checkout gốc `E:\DOANTOTNGHIEP\ai-pms-frontend` không được sửa trong đợt này.

Đây là một cụm chức năng hoàn chỉnh để review và commit/merge; không phải thông báo đã thiết kế lại toàn bộ dự án.

## Phạm vi hoàn thành

| Màn hình | Kết quả |
| --- | --- |
| `/project/workspace` | Phối hợp nhóm với công việc cần chú ý, tiến độ từng thành viên theo hàng, mốc, lịch họp, hạng mục nộp và nhận xét từ báo cáo thật; tạo công việc khi có quyền. |
| `/project/tasks` | Danh sách phân trang BE; tìm kiếm; lọc trạng thái, người phụ trách, ưu tiên, mốc, quá hạn; việc của tôi; hiển thị theo trạng thái; tạo công việc. |
| `/project/tasks/:taskId` | Nội dung, ngày, người phụ trách, công việc liên quan, lịch sử; chỉnh sửa, phân công, cập nhật trạng thái và liên kết theo quyền. Quay lại giữ bộ lọc danh sách. |
| `/project/milestones` | Danh sách phẳng với tiến độ thật; tạo và sắp xếp thứ tự khi có quyền. |
| `/project/milestones/:milestoneId` | Chi tiết mốc, sửa, chuyển tới công việc hoặc lịch; chỉ đề xuất xóa khi BE cho phép về mặt dữ liệu. |
| `/project/gantt` | Lịch theo mốc và công việc, tuần/tháng, lọc mốc, mở/thu gọn; hiển thị đúng ngày và dữ liệu tiến độ. |
| `/projects/lifecycle` | Hồ sơ thực tế, trạng thái bằng tiếng Việt, thành viên và lịch sử; bỏ bảng giải thích state machine/endpoint khỏi giao diện. |
| `/team` (nhóm đã chốt) | Bỏ khối điều kiện đăng ký sai giai đoạn, dùng tên ngành thật, ẩn lời mời khi không có dữ liệu và làm gọn thông tin lời mời. |

Cụm Công việc–Mốc–Lịch dùng chung cho tuyến giảng viên `/supervisor/projects/:projectId/...` qua ExecutionAccessContext. Đã kiểm tra quyền trong unit tests; chưa có phiên giảng viên để xác nhận trực tiếp trên Chrome.

## Quy tắc cần giữ

Tài liệu đồng bộ giao diện cho các member: [frontend-ui-guide.md](frontend-ui-guide.md), gồm component dùng chung, ví dụ ghép trang và checklist bàn giao.

Theo [design-c.md](design-c.md): không gradient, glassmorphism, card lồng card hoặc bóng đổ trang trí; bo góc 6px, spacing nền 4px có điều chỉnh; nút rõ nhưng không quá đậm; chữ và icon thẳng hàng. Giao diện dùng tiếng Việt theo ngữ cảnh. Tên, mô tả và nhận xét do người dùng nhập được giữ nguyên.

Không thêm trang xem trước hoặc mock runtime. Dùng client xác thực hiện có và gọi BE trực tiếp. Unit tests có giả lập transport để kiểm tra lỗi, quyền và payload mà không thay đổi dữ liệu thật.

- Các phần dữ liệu tải và báo lỗi độc lập; lỗi không biến thành trạng thái trống hoặc số 0.
- Datetime SQL không có offset được xử lý là UTC, hiển thị UTC+7. DateOnly giữ nguyên ngày.
- Tiến độ thành viên theo DONE/tổng công việc được giao, cùng định nghĩa BE; công việc nhiều người được tính cho từng người.
- Biểu đồ không tự suy ra đường găng, thời lượng thiếu hoặc phần trăm của công việc đang làm.
- Quyền và điều kiện xóa cuối cùng vẫn do BE quyết định. Lỗi thao tác giữ nội dung biểu mẫu.

## Thành phần để tiếp tục

- `src/features/execution/execution-ui.tsx`: khung trang, biểu tượng, trạng thái tải/lỗi/trống, tiến độ, phân trang, xác nhận thao tác.
- `src/features/execution/execution.css`: nút, bộ lọc, biểu mẫu, danh sách, trang chi tiết và lịch thực hiện.
- `src/features/execution/execution-utils.ts`: nhãn tiếng Việt, luồng trạng thái, xử lý lỗi và thời gian.
- `src/features/execution/useExecutionMutation.ts`: trạng thái thao tác, ngăn gửi trùng và giữ thông báo lỗi.
- `src/features/projects/components/WorkspaceTaskForm.tsx`: tạo công việc với mốc và thành viên thật.
- `src/features/progress/utils/schedule.ts`: xử lý ngày, khoảng thời gian và trục lịch.
- `src/components/ui/PageLoading.tsx`: skeleton trung tính cho xác thực, ngữ cảnh và trang; không suy diễn nhóm/học kỳ trong khi tải.
- `src/components/ui/Modal.tsx` và `useActionConfirmation.tsx`: hộp thoại trong ứng dụng, Escape, focus, trạng thái chờ và lý do bắt buộc.
- `src/app/router/RouteFrame.tsx`: tên tab theo nhãn trang; đường dẫn không hợp lệ không bị đưa vào tiêu đề.

Ưu tiên dùng các thành phần này khi phù hợp với luồng tiếp theo. Không áp CSS ghi đè hàng loạt lên trang cũ để giả tạo sự đồng bộ.

## Kiểm chứng

- Toàn bộ suite sau đợt dọn giao diện: **90 file, 427 tests đạt**.
- Sau sửa cuối để cập nhật title HTML sẵn có (không tạo hai thẻ title), 16 tests liên quan RouteFrame/routes/AppLayout đạt; build, lint và diff check cũng đạt lại. Chrome tải mới xác nhận đúng một thẻ title.
- `pnpm build`, `pnpm lint` và `git diff --check` đạt.
- Chrome DevTools MCP: kiểm tra dữ liệu thật của tài khoản trưởng nhóm sinh viên trên desktop 1440px và mobile 390px. Nhóm thật có 5 thành viên, 11 công việc và 4 mốc.
- Đã kiểm tra bộ lọc gửi BE và trả đúng công việc; quay lại giữ lọc; mở/hủy biểu mẫu; căn chữ/icon; tên dài; menu mobile/Escape/focus; trục tháng không chồng nhãn; cuộn ngang chỉ nằm trong biểu đồ.
- Lighthouse trên trang đã tải dữ liệu: Accessibility và Best Practices đạt 100 cho Phối hợp nhóm, danh sách/chi tiết Công việc, danh sách Mốc và Lịch thực hiện. Đây không phải điểm của mọi hạng mục Lighthouse hoặc mọi route dự án.
- Console cuối audit không có lỗi/cảnh báo trên trang Công việc. Các lượt đọc BE chính được xác nhận trả 200.
- Kiểm tra trình duyệt không tạo, sửa hoặc xóa dữ liệu người dùng. Payload ghi, lỗi BE và quyền được kiểm tra bằng unit tests; chưa thử ghi thật với từng vai trò trên Chrome.

## Audit khung tải, tiêu đề và popup

- Khung chung dùng cùng sidebar/header mới ở mọi tuyến đã xác thực. Khi dữ liệu nhóm chưa rõ, menu dùng skeleton; không nháy menu đăng ký cũ, “Chưa có nhóm”, “Đang kiện toàn” hoặc nút “Sắp có”. Bỏ nút tìm kiếm/thông báo chưa có chức năng.
- Loading của xác thực/ngữ cảnh/đồ án dùng skeleton chung. Không đưa câu “Đang xác minh trạng thái Project từ Backend” hoặc lỗi kỹ thuật trực tiếp ra các màn hình chặn tải này.
- Chrome DevTools MCP với Fast 4G và CPU chậm 4 lần: 13 mẫu DOM trong lượt tải Phối hợp nhóm, 3 mẫu có loading, 0 mẫu có menu cũ. Sau tải hiển thị dữ liệu thật 54,6%.
- Tên tab và breadcrumb được kiểm tra trực tiếp ở Phối hợp nhóm, Thành viên nhóm, Hồ sơ đồ án, Danh mục đề tài và route 404. Tiêu đề route 404 không chứa URL; liên kết về trang chính dùng đúng vai trò, không lồng button trong link.
- Không còn lời gọi toàn cục `alert`, `confirm`, `prompt` trong source sản phẩm. Xác nhận thẩm định, tiếp nhận hướng dẫn, đổi trưởng nhóm và xác minh tư cách dùng hộp thoại ứng dụng. Hàm `confirm` trong MeetingDetailPage là hàm nội bộ cho UI xác nhận hiện có.
- Popup tạo/sửa nhóm, chuyển trưởng nhóm, rời nhóm và chi tiết đề tài dùng Modal chung. Chrome kiểm tra drawer đề tài trên desktop/mobile 390px: không shadow/blur, không tràn ngang, không có tiêu đề mục rỗng; Escape đóng và trả focus về “Xem chi tiết”. Với nhóm đã chốt, các thao tác đổi danh sách bị BE khóa nên không kiểm tra ghi trực tiếp các popup nhóm bằng tài khoản này.
- Trang Thành viên với nhóm thật đã chốt không còn “FAIL” đăng ký hoặc mã ngành/User ID kỹ thuật. Lời mời đã hủy/hết hạn có nhãn riêng, không bị gọi nhầm là từ chối. Tên người dùng được hiển thị khi dữ liệu hiện có cung cấp; API lời mời chưa có tên cho người ngoài nhóm nên dùng nhãn trung tính khi thiếu.
- Console cuối audit không có error/warn trên Danh mục đề tài. Tất cả thao tác Chrome trong đợt này chỉ đọc, mở và hủy.

Hai luồng báo cáo/biên bản vẫn giữ `beforeunload` **chỉ khi có nội dung chưa lưu**. Cảnh báo đóng tab/tải lại do trình duyệt kiểm soát và không thể thay bằng popup tùy biến; xác nhận chuyển trang bên trong app dùng UI riêng. Không bỏ bảo vệ nội dung đang viết.

Build vẫn có cảnh báo bundle lớn hơn 500kB từ Vite; build thành công. Chưa thực hiện chia bundle vì đợt này tập trung giao diện và luồng sử dụng.

## Phần tiếp theo còn phải làm

1. **Báo cáo tiến độ – Hạng mục cần nộp – Lịch họp/biên bản**: audit chức năng và contract BE trước, rồi đồng bộ danh sách, tạo, chi tiết, nhận xét và tệp đính kèm theo quyền. Đây là cụm tiếp theo ưu tiên.
2. **Luồng lập nhóm/đăng ký**: audit với tài khoản còn ở giai đoạn đăng ký để xác nhận điều kiện, mời thành viên, cấu hình ngành và ghi thật theo quyền. Hồ sơ và nhóm đã chốt đã được dọn trong đợt này.
3. Rà toàn bộ các luồng còn lại: đăng ký đề tài/đồ án, các vai trò giảng viên/khoa/quản trị, học kỳ, tài khoản và xác thực. Hộp thoại toàn cục đã được thay; bố cục và phần nội dung kỹ thuật/Anh–Việt của một số trang theo vai trò vẫn còn cần audit. Không coi việc đổi menu hoặc header là đã thiết kế lại nội dung những trang này.

Trước khi mở rộng mỗi cụm, audit lại các màn hình đã hoàn thành bằng Chrome DevTools MCP, sửa hồi quy rồi mới tiếp tục. Cần tài khoản phù hợp để kiểm tra thực tế những vai trò chưa được đăng nhập. Dừng ở cụm đã kiểm thử nếu cần chia đợt commit/merge; ghi rõ phần hoàn thành và phần còn lại.
