# Rà soát màn hình và tương tác AIPMS — 15/11/2026

## Phạm vi và mức chứng cứ

- Nguồn: `src/app/router/index.tsx`, `workspace-route-registry.ts`, các thành phần dùng chung, mã chat/defense và ảnh người dùng cung cấp. `ROUTE_CENSUS.csv` được tạo lại bằng `pnpm run route-inventory` và liệt kê **144 route**. Hai route có trong mã nhưng thiếu ở bản kiểm kê cũ là `/project/weekly-assessments` và `/lecturer/defense-sessions/:sessionId`.
- Đây là **kiểm kê mã nguồn và kiểm tra một lát cắt UI**, không phải kết quả đăng nhập chạy thực tế cho 144 route. Test chat dùng fixture mạng được kiểm soát; không chứng minh SignalR hoặc dữ liệu staging.
- `SCREEN_SOURCE_CUES.generated.csv` nối từng route với file màn hình và quét dấu hiệu **trực tiếp trong chính file đó**: WorkspacePage, loading, empty, feedback, form, ngày, preview. Tạo lại bằng `pnpm run screen-ui-audit`. `NO` nghĩa là bộ quét không tìm thấy từ khóa trong file trực tiếp; màn hình vẫn có thể dùng thành phần con hoặc cách viết khác. Không dùng cột này như kết quả pass/fail.
- Quét 144 route/89 file màn hình khác nhau: 72 route có `WorkspacePage` trực tiếp, 133 có dấu loading, 11 có `EmptyState` được nhận diện, 120 có dấu feedback, 66 có form, 27 có ô ngày, 8 có dấu preview. Các số **đếm route trùng file** và là dấu mã nguồn, không phải số màn đã đạt quy chuẩn.
- Thứ tự thẩm quyền: nghiệp vụ, DB/BE, hợp đồng FE, rồi ảnh tham khảo. Ảnh Messenger gợi ý mật độ, phân cấp và tương tác; không sao chép chức năng gọi video, chuyển tiếp, ghim, báo cáo khi BE chưa cấp hợp đồng và quyền.

## Bản đồ màn hình theo vai trò

| Phạm vi route | Số route | Điều cần kiểm tra trong lượt runtime theo role |
| --- | ---: | --- |
| Sinh viên | 40 | Ngữ cảnh kỳ/nhóm/đồ án, đăng ký, tiến trình, Gate, nộp và kết quả; mọi thao tác phải dựa quyền BE và giữ draft khi lỗi. |
| Giảng viên | 42 | Phân biệt hướng dẫn, đánh giá và tham gia hội đồng theo assignment; không gộp quyền từ danh xưng role. |
| Bộ môn | 26 | Scope khoa/ngành, cấu hình tài liệu/tiêu chí, lịch, phân công và công bố; kiểm tra readback và xung đột phiên. |
| Bộ môn + quản trị | 9 | Cùng màn nhưng dữ liệu và nút thao tác theo scope BE riêng cho từng tài khoản. |
| Bộ môn + giảng viên | 1 | Kiểm tra quyền kết hợp theo assignment thực, không cấp rộng theo route. |
| Quản trị | 11 | Tài khoản/role, portfolio, chính sách và truy vết; không biến chỉ số thành quyền thao tác. |
| Công khai / đã đăng nhập | 15 | Đăng nhập, hồ sơ, thông báo, lịch, chat và route dự phòng; kiểm tra session/flag riêng. |

`ROUTE_TEST_MATRIX.md` mô tả các trạng thái cần thử, **không phải** chứng cứ đã thử. Mỗi route cần Loading, Empty, Filtered Empty, 401/403/404, 409, lỗi mạng/5xx, Retry, Read only, Success theo mức áp dụng của nghiệp vụ.

## Kết quả và việc tiếp theo

| Ưu tiên | Nguồn → vấn đề | Xử lý trong nhánh này / bước còn lại | Giới hạn kiểm chứng |
| --- | --- | --- | --- |
| P0 | `ChatThread`, `ChatDock`, ảnh Messenger → cửa sổ chat chật, thao tác tin nhắn dàn trải, toast không thao tác bàn phím; người đọc chỉ có nhãn chung. | Đã làm bubble/avatar, composer gọn, menu chỉ có hành động BE cho phép, danh sách đã xem từ `lastReadSequence`, toast là button, mobile header không tràn. | Đã test component và Playwright fixture desktop/mobile; cần thử session thật, pagination thành viên, realtime và quyền chéo. |
| P0 | `Sidebar` → số tin chưa đọc có thể co mất khi tiêu đề điều hướng dài; nhãn đọc màn hình không nêu số. | Badge không co, nhãn có số thật từ `ChatProvider`; notification header đã có số và giữ số cuối khi mất mạng. | Cần đối chiếu tài khoản có tin chưa đọc thật và ngưỡng `99+`. |
| P0 | `Gate3ScheduleChangePanel`, `DefenseSessionChangePage` → date picker vẫn nhận ngày/ca đã qua. | Đã thêm kiểm tra ngày Việt Nam và thời điểm bắt đầu ca tương lai; BE vẫn quyết định cửa sổ học vụ, phòng và xung đột. | Unit test giờ Việt Nam; cần kiểm tra lịch thật theo period/assignment. |
| P1 | `InlineAlert` và các màn có thông báo tùy biến → ngữ nghĩa alert/status không đồng đều. | Đã mở rộng tone error/info và dùng ở hai luồng đổi lịch, giữ lỗi là `role=alert` và thành công là `role=status`. | Cần chuyển đổi có chọn lọc các form còn lại, không thay hàng loạt 485 vị trí `role=alert/status` mà chưa xem ngữ cảnh. |
| P1 | 53 ô date/datetime trong features → `min=today` chung có thể sai cho lọc lịch sử, kỳ cũ, hiệu lực chính sách. | Kiểm từng nghiệp vụ: ngày đặt lịch mới phải tương lai; ô lọc/lịch sử được chọn quá khứ; phạm vi kỳ và thứ tự start/end từ BE hoặc rule đã xác nhận. | Chưa chứng minh toàn bộ 53 ô; không áp blanket min. |
| P1 | `DocumentPreviewModal` → có phân loại PDF, ảnh, DOCX, XLSX và gọi Office preview. | Giữ dùng thành phần chung; rà quyền file, lỗi chuyển đổi, download và màn xem trước của từng role. | Chưa xác nhận renderer Office trên môi trường thật. |
| P2 | `DefenseCoordinatorView`/`RescheduleRequestModal` → còn code mô phỏng xung đột bằng ngày cố định và `setTimeout`, chỉ được export, không được route sử dụng. | Không coi đây là chức năng production. Khi tích hợp phải thay bằng dữ liệu/lệnh BE, hoặc loại khỏi public export sau kiểm tra phụ thuộc. | Mã nguồn chứng minh hiện không có route gọi; chưa xóa để tránh đổi public interface không cần thiết. |
| P2 | 144 route và nhiều layout → khả năng dày đặc card/action, thông báo lặp, nhảy điều hướng. | Rà theo role và hành trình, ưu tiên gộp phần nhìn/chỉ dẫn khi cùng ngữ cảnh; giữ route và nghiệp vụ gốc cho đến khi có phân tích redirect, bookmark và phân quyền. | Cần khảo sát runtime từng role/viewport, không tuyên bố hoàn tất giao diện toàn hệ thống từ kiểm kê tĩnh. |

## Quy tắc áp dụng thống nhất cho lượt tiếp theo

1. Header màn: tiêu đề hành động rõ, ngữ cảnh kỳ/đồ án/assignment và trạng thái có nguồn BE; một hành động chính trong vùng nhìn đầu.
2. Biểu mẫu: nhãn thật, trường bắt buộc, giới hạn/ngày theo nghiệp vụ, lỗi tại trường và thông báo tổng; giữ dữ liệu nhập khi lỗi, khóa lệnh khi kết quả trước chưa xác minh.
3. Danh sách: tìm/lọc, số lượng, loading/empty/filter empty khác nhau, phân trang và hành động đúng scope; badge thông báo luôn có số khi BE xác nhận, lỗi mạng giữ số cuối kèm dấu stale.
4. Chat: hỗ trợ bàn phím, 44px mục tiêu bấm, giảm chuyển động, responsive; chỉ hiển thị thao tác/đã xem có dữ liệu và quyền thật.
5. Mỗi thay đổi màn: ghi Source → vấn đề → giải pháp → test → giới hạn; kiểm build, unit liên quan, Playwright đúng role, rồi readback nếu có mutation.

## Thứ tự hoàn thiện toàn màn hình

| Lượt | Phạm vi | Đầu ra và điều kiện chấp nhận |
| --- | --- | --- |
| 1 — shell dùng chung | Header, sidebar, chat, thông báo, modal, alert, loading, preview | Desktop/mobile không tràn; keyboard/focus và giảm chuyển động hoạt động; số badge có nguồn BE; toast và lỗi có ngữ nghĩa đúng. **Lát cắt chat, badge và alert đã sửa; chưa xác nhận runtime mọi role.** |
| 2 — hành trình sinh viên | 40 route, từ kỳ → nhóm → đề tài → công việc/Gate → nộp/kết quả | Một nguồn ngữ cảnh, điều kiện Gate và deadline rõ; không cấp quyền từ FE; file xem trước theo quyền; màn lỗi giữ draft và có Retry. |
| 3 — giảng viên | 42 route hướng dẫn, evaluator, Gate, cold/defense | Phân biệt nhiệm vụ theo assignment; hai evaluator Gate 1–3 và hội đồng defense theo BE; không lộ nút chấm khi supervisor xung đột; readback sau chấm. |
| 4 — bộ môn/quản trị | 47 route riêng hoặc giao nhau | Kiểm scope khoa/tổ chức, cấu hình tiêu chí và tài liệu, lịch/phòng, role nhiều vai; thống nhất form/alert và kiểm thử 403/409; không gộp route làm mất bookmark hay quyền. |
| 5 — công khai/tài khoản | 15 route và các màn dùng chung | Session, reset, profile, thông báo và chat theo flag; hoàn thành ma trận trạng thái trên mỗi viewport và quyền. |

Mỗi lượt chỉ được đánh dấu hoàn thành sau khi bổ sung chứng cứ browser thật cho role, kết quả API/BE phù hợp và test regression. Không dùng fixture tĩnh làm bằng chứng kết thúc nghiệp vụ.
