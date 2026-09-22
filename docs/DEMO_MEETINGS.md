# Demo lịch họp, biên bản và nhận xét GVHD

## Nhánh và phạm vi

- Nhánh: `feat/project-meetings`.
- Worktree: `E:\DOANTOTNGHIEP\project-meetings`.
- FE gốc: `origin/develop` tại `64d94f8` (đã merge báo cáo tiến độ qua PR #29).
- Đối chiếu BE: `98c5663`, controller/DTO/validator/command/repository của Meetings.
- Đã đối chiếu nhánh TinVV `feature/student-qualification-leader-governance-20260921` tại `c61f034` (Curt1s167). Không sửa qualifications, teams, supervisor inbox hay service gateway. File chung duy nhất với diff đó là router, chỉ thêm route Meetings. Cần giữ cả hai nhóm route khi merge.
- Không thay đổi checkout `ai-pms-frontend` đang ở `develop`, không thay đổi BE hoặc schema DB.

## Chạy ứng dụng

```powershell
Set-Location E:\DOANTOTNGHIEP\project-meetings
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1 --port 5176 --strictPort
```

BE cần chạy tại `http://localhost:5080`; Vite proxy `/api` tới BE. Mở `http://127.0.0.1:5176`. Không cần đổi `.env` hoặc thêm thư viện.

Sinh viên vào **Lịch họp & biên bản** trên menu, hoặc **Mở lịch họp** trong không gian đồ án. GVHD vào **Bàn làm việc → Mở Project ACTIVE → Mở lịch họp**.

## Kịch bản demo khoảng 5 phút

1. Đăng nhập trưởng nhóm của đồ án ACTIVE. Chọn **Lên lịch họp**, nhập tiêu đề, giờ bắt đầu/kết thúc, nội dung, địa điểm hoặc liên kết https. Chọn thành viên và GVHD. Người tạo tự động được thêm một lần.
2. Tạo lịch, kiểm tra chi tiết và giờ Việt Nam. Có thể sửa lịch, thêm hoặc bỏ người tham gia khi còn **Đã lên lịch**.
3. **Cập nhật biên bản**, ghi kết luận và chọn **Có mặt/Vắng mặt** cho từng người, rồi lưu.
4. **Hoàn tất cuộc họp → Xác nhận**. Lịch và danh sách mời được khóa; biên bản/điểm danh vẫn có thể bổ sung theo quy tắc BE.
5. Đăng nhập GVHD chính được phân công, mở đúng đồ án/cuộc họp, **Viết nhận xét → Gửi nhận xét**. Nhận xét xuất hiện trong lịch sử và không đổi trạng thái cuộc họp.
6. Sinh viên mở lại để đọc. Bộ lọc trạng thái/ngày và phân trang giúp tìm cuộc họp. Nếu cần demo hủy, dùng một lịch riêng: hủy giữ lịch sử và khóa mọi chỉnh sửa, không mở lại được.

Tài khoản mẫu đã xác minh đăng nhập: trưởng nhóm `khangnmde180901@fpt.edu.vn`, GVHD chính `lecturer.se01@fe.edu.vn`. Mật khẩu nằm trong dữ liệu mẫu BE, không sao chép vào tài liệu này. Đồ án mẫu hiện tại: project 2, team 2.

## Quyền và hợp đồng API

| Chức năng | Endpoint dưới `/api/v1` |
| --- | --- |
| Danh sách, tạo | GET/POST `/projects/{projectId}/meetings` |
| Xem, sửa lịch | GET/PUT `/meetings/{id}` |
| Hoàn tất, hủy | POST `/meetings/{id}/complete`, `/cancel` |
| Biên bản, điểm danh | PUT `/meetings/{id}/notes` |
| Thêm, bỏ người | POST `/meetings/{id}/participants`, DELETE `/meetings/{id}/participants/{userId}` |
| Nhận xét GVHD | POST `/meetings/{id}/feedback` |

Trưởng nhóm hoặc GVHD có thể tạo lịch. Người tạo, trưởng nhóm hiện tại và GVHD có thể quản lý; thành viên khác chỉ đọc. Route sử dụng guard ACTIVE và guard GVHD chính có sẵn. BE luôn quyết định quyền cuối cùng.

Danh sách mời lấy từ roster nhóm và các phân công GVHD chưa kết thúc, có phân trang và khử trùng user ID. Kiểm tra BE thật phát hiện `GET /teams/2` trả 403 cho GVHD dù các API đồ án/phân công trả 200. FE giải thích giới hạn, vẫn tải danh sách GVHD và cho lưu lịch; trưởng nhóm thêm sinh viên. Không lấy danh sách tài khoản toàn hệ thống hoặc dùng snapshot đăng ký cũ. Muốn GVHD tự chọn mọi sinh viên cần BE bổ sung endpoint roster theo quyền đồ án hoặc mở đúng quyền cho endpoint hiện tại.

## Thời gian, lỗi và giới hạn

- Nhập/hiển thị giờ Việt Nam UTC+7; gửi UTC ISO `Z`. Giá trị API không ghi múi giờ được hiểu là UTC vì SQL datetime2 mất DateTime.Kind. Ví dụ 09:00 Việt Nam gửi 02:00Z và đọc lại vẫn 09:00. BE chưa định nghĩa múi giờ cho dữ liệu seed cũ: nếu seed đã lưu giờ địa phương thì cần thống nhất/chuẩn hóa dữ liệu ở BE trước khi dùng các mốc cũ làm chuẩn demo.
- Form chặn giờ kết thúc trước giờ bắt đầu, tiêu đề rỗng, URL không an toàn; chỉ gửi attendance đã thay đổi.
- Lưu đang chạy không cho gửi lặp. Sau khi lưu thành công, GET chi tiết là nguồn trạng thái cuối cùng; GET thất bại chỉ cho tải lại, không lặp mutation.
- Lỗi 409, mất mạng hoặc kết quả không rõ khóa thao tác đến khi tải lại. Giữ nội dung đang soạn và xác nhận trước khi bỏ. Tạo mới có kết quả không rõ yêu cầu về danh sách kiểm tra trước khi tạo lại.
- BE chưa có concurrency token/idempotency key cho Meetings. FE giảm gửi lặp nhưng không bảo đảm loại bỏ mọi xung đột giữa nhiều người cùng sửa.
- GVHD phụ vẫn bị giới hạn bởi guard thực thi hiện có; không mở rộng guard chung trong nhánh này.

## Bằng chứng kiểm tra ngày 22/09/2026

- Vitest: 366 tests / 72 files đạt; 37 tests mới của Meetings. Kiểm tra vòng đời, vai trò, organizer sau chuyển trưởng nhóm, trạng thái hủy/hoàn tất, drafts, conflict, lỗi mạng, GET sau mutation, UTC, lọc/phân trang, URL, đúng HTTP contract và fallback quyền roster. Sau chỉnh nhãn nút bị khóa, chạy lại 32 tests giao diện/utils Meetings đều đạt.
- TypeScript, production build và oxlint đạt. Vite còn cảnh báo bundle chung trên 500 kB; không ảnh hưởng kết quả build.
- BE thật: đăng nhập sinh viên/GVHD; project, danh sách/chi tiết meetings, supervisor assignments trả 200. Sinh viên đọc roster 200; GVHD roster 403 được xử lý như trên. Lỗi thiếu `proposal_source`/`topic_id` của lần trước không còn khi kiểm tra lần này.
- Chrome: mở danh sách/chi tiết thật, đường vào từ workspace GVHD, form tạo và fallback quyền thật. Kiểm tra giao diện ở 390 px không tràn ngang.
- Kiểm thử ghi trên trình duyệt dùng fetch fixture trong bộ nhớ, có nhãn kiểm thử: tạo lịch, UTC, hoàn tất, biên bản/điểm danh sau hoàn tất và nhận xét GVHD. Không ghi cuộc họp thử vào DB chung; đây không phải xác nhận round-trip ghi DB thật. Fixture chỉ được tiêm vào tab kiểm thử, bị xóa khi reload, không có trong mã ứng dụng.

```powershell
pnpm test
pnpm build
pnpm lint
```
