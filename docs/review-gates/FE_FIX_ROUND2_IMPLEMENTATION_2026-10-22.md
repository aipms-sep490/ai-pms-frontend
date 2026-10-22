# Kết quả sửa Round 2 — 22/10/2026

Nguồn: `FE_FIX_ROUND2_2026-10-22.md`. Nhánh: `feat/uiux-master-redesign`, baseline `0e46c53fa201f22bb794aabcf3bbc79e337524ce`. Người dùng yêu cầu sửa trực tiếp rồi commit/push; đây là quyền xuất bản cho lượt sửa này.

**FIX-08 / FIX-09: hoàn tất phần FE. Các điều kiện dữ liệu staging còn giới hạn như mô tả bên dưới.**

## FIX-08 — Số lượng chỉ được xác định khi mọi nguồn attention thành công

- Lọc đúng các nguồn đóng góp: next-actions, student-dashboard, triage-queue, accounts và urgent-actions theo từng bộ môn.
- Chỉ hiện số khi có ít nhất một nguồn và tất cả đều ready/empty. Error/partial/unavailable/unsupported hoặc không có nguồn đã biết đều hiện `—`, aria-label báo chưa xác định số việc.
- Luôn giữ các item đã đọc được. Thêm cảnh báo ngay trong panel: “Một số nguồn chưa tải được; danh sách có thể chưa đầy đủ.” cùng nút “Tải lại danh sách”. Khi retry thành công, cảnh báo biến mất và badge cập nhật đúng số.
- Unit và browser controlled phủ aggregator lỗi/dashboard tốt, dashboard lỗi/aggregator tốt, cả hai tốt có item, cả hai tốt rỗng, một bộ môn lỗi và một bộ môn tốt; không ẩn mốc hoặc task HIGH đã có.

## FIX-09 — Tên bộ môn từ academic context

- WorkspaceAccess expose departments chỉ để hiển thị tên. Tái sử dụng trực tiếp mảng tham chiếu từ AcademicContextSnapshot; giữ useMemo và thêm dependency tương ứng. Mảng fallback rỗng nằm ngoài hook, không tạo mảng mới mỗi render.
- CalendarLoaderInput nhận cả departmentIds và departments. Chỉ departmentIds đã cấp quyền được dùng để gọi API; tên tham chiếu không mở rộng scope. Source.id giữ nguyên urgent-actions-{id}.
- Nhãn dùng tên bộ môn, gồm cả dòng nguồn lỗi. Khi thiếu tên, fallback “Bộ môn {id}” theo yêu cầu.
- Test hook thật xác nhận array identity ổn định và metadata đổi được cập nhật. Test page/hook/browser đếm đúng một lần tải ban đầu; đổi view/render lại không gọi thêm; đổi context tên bộ môn chỉ gọi thêm một lần.

## Kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| TDD trước khi sửa | 15 fail / 46 test trong nhóm tái hiện, lưu red.json |
| Nhóm tập trung, gồm context thật và router | 81 PASS; 0 fail/skipped |
| Toàn bộ unit/component | **1.412 PASS; 0 fail/skipped**, maxWorkers=4, dùng các cờ rollout từ .env.example và AI advisory |
| Playwright controlled cuối | **54/54 PASS**, 0 skipped/flaky; gồm 42 ca trước và 12 ca Round 2 |
| Lượt browser ban đầu | 53/54 PASS; Builder 1440px timeout khi chờ nút. Không tái hiện trong 3 lượt riêng có trace và lượt full cuối; không đổi source/assertion/timeout để vượt ca này. Giữ nguyên báo cáo lỗi ban đầu |
| Mutation review | Đổi every thành some làm 3 test fail; khôi phục source đúng byte |
| Typecheck / production build | PASS; build cả khi cờ mock=true. Cảnh báo chunk >500kB hiện hữu vẫn còn |
| Lint | 0 error, 193 warning kế thừa; so sánh filename/rule/message/severity không có diagnostic mới; không thêm suppression. Chưa đạt zero-warning toàn repo |
| Axe | 0 violation trong 6 màn/trạng thái controlled đã chạy lại |
| Ảnh / responsive | Round 2 ở 390/1440px không tràn trang; đã xem ảnh aggregator lỗi 390px và bộ môn lỗi 1440px. Các ca sẵn có tiếp tục phủ 390/768/1280/1440px |
| Staging read-only | **4/4 PASS**, 0 mutation nghiệp vụ; nhãn nguồn staff khớp tên bộ môn thật từ auth context |

Không sửa lại logic milestone/fallback/HIGH/dedupe hoặc giao diện KPI của FIX-01…FIX-07. Không sửa BE, DB, env, dependency hay suppression. Test fixture router chỉ bổ sung field departments để khớp interface.

## Phân biệt bằng chứng staging và controlled

- **Controlled/unit:** chủ động gây lỗi từng nguồn, xác nhận badge không khẳng định tổng, giữ item, retry phục hồi; hai bộ môn với một nguồn 403; thiếu tên; không tải lặp khi context ổn định.
- **Staging đã verify:** login/GET theo scope P1/P3/giảng viên IT1/staff IT; nhãn nguồn staff đúng `[TEST] Khoa Công nghệ thông tin` từ auth context, không thay bằng `Bộ môn 20002`.
- Cả ba loại aggregator hiện trả 200/items=[]; calendar giảng viên 200/empty/complete=true. Timeline P1/P3 vẫn 404 ActiveProject 50003/50011. Lỗi từng nguồn và nhiều bộ môn chưa được chủ động kiểm trên dữ liệu staging thật; bằng chứng cho các trường hợp đó là unit/controlled browser. Không gọi fixture là nghiệm thu lifecycle thật, không tạo dữ liệu hoặc gây lỗi backend trên staging để vượt giới hạn này.

## Git và bằng chứng

- Giữ nguyên cập nhật cục bộ có sẵn của `BE_HANDOFF_2026-10-21.md`; không đưa phần sửa riêng đó vào commit Round 2.
- Tài liệu yêu cầu gốc được đưa vào Git nguyên nội dung. Commit chỉ gồm FIX-08/09, test và báo cáo liên quan; develop không đổi.
- Evidence ngoài repo: `F:/AI-PMS/artifacts/fe-fix-round2-20261022`.
- Các file chính: red.json, focused.json, unit.json, playwright-controlled.json (lượt đầu), playwright-builder-diagnostic.json, playwright-controlled-final.json, playwright-staging.json, mutation-receipt.json, lint.json, build.log, typecheck.log, round2-*.png, staging-*.json. Receipt sau push xác minh commit remote và các file cục bộ được giữ nguyên.

Lệnh kiểm tra: `npm run typecheck`, `npm run lint`, `npm run build`; nạp feature flags từ .env.example vào process rồi chạy `npx vitest run --maxWorkers=4`. Chạy browser bằng `npx playwright test --config playwright.batch1.config.ts controlled.spec.ts fix-review.spec.ts round2.spec.ts`, đặt BATCH1_EVIDENCE_DIR/BATCH1_E2E_REPORT để tách bằng chứng. Staging dùng `staging-readonly.spec.ts` và password chỉ qua process environment.
