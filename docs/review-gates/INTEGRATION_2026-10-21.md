# Review Gates FE–BE verification — 21/10/2026

## Kết luận

**PARTIAL_BE_BLOCKED**. FE đã nối contract thật và có lệnh chạy với staging. Lifecycle đơn ngành/liên ngành chạy được trên API + SQL riêng. Chưa đạt `INTEGRATED_READY`: mentor tải được minh chứng ngoài ngành và staging chưa có dữ liệu Review Gates phù hợp cho bộ tài khoản demo được cung cấp.

Bản này cập nhật kết luận ngày 20/10: nhận định cũ “staging chưa có Review Gates” đã hết hiệu lực. Ảnh bàn giao là đầu vào đối chiếu, không thay thế kiểm chứng runtime.

## Baseline và kết nối

- FE: `feat/uiux-master-redesign`, baseline `2f0501d494b9d2d1742bf4e7e1cc372244371319`.
- BE: `develop` được pull fast-forward tới `aee0dc06bc6fc709dd93665515372e9f1477cbbc`. Không sửa source BE.
- Staging: `https://api-staging.khaidz.com/api/v1`; Swagger trực tiếp có 377 paths. Có 16 paths chứa `review-gates`, 22 paths liên quan nếu tính template, queue và readiness. Paths khác HTTP operations.
- `/system`: 200. Queue và template chưa đăng nhập: 401. CORS `http://localhost:5175`: 204 + allow-origin đúng. `http://127.0.0.1:5197` không được allow trực tiếp; acceptance local dùng proxy.
- Chromium xác nhận FE ở API mode, `reviewGatesMockEnabled=false`, proxy `/api/v1` trả system 200 và anonymous queue 401.
- Không có quyền deployment host để tự xác nhận SHA image/container health. Swagger chứng minh contract đã có trên staging, không chứng minh exact SHA image hoặc schema shared DB.

Chạy trong repo FE, không sửa `.env`/`.env.example`:

```powershell
pnpm run dev:review-gates:staging
```

Mở `http://localhost:5175`, đăng nhập lại. Lệnh đặt process overrides cho API mode, tắt mock Review Gates và trỏ proxy tới staging. `pnpm dev` thông thường vẫn dùng cấu hình cục bộ/default; đừng lấy dữ liệu mock làm bằng chứng tích hợp.

## Thay đổi FE

- Nhận diện `409 REVIEW_QUEUE_BUSY` bằng business code; thông báo tiếng Việt, thử lại thủ công.
- Giữ queue/ghi chú khi tải lại lỗi; khóa verification, quyết định và phân trang tới khi refresh thành công. Không tự replay mutation.
- Thêm Playwright regression cho queue bận lúc đầu và khi phục hồi conflict.
- Mở rộng acceptance thật: 24 lượt đọc queue đồng thời mỗi mode; negative COI, reviewer ngoài ngành, target INDIVIDUAL ngoài team, tải INDIVIDUAL và mentor đọc chéo ngành.
- Sửa synchronization của test evaluation reconciliation có sẵn: chờ capability denied và conflict load hoàn tất trước khi kết thúc case. Không đổi production evaluation/authority, không bỏ assertion.

## Validation

| Kiểm tra | Kết quả | Giới hạn |
|---|---|---|
| FE unit | 1309/1309 PASS | Lần đầu 1308/1309; đã sửa test synchronization rồi chạy lại toàn bộ |
| FE build/typecheck | PASS | Có cảnh báo chunk size |
| FE lint | Exit 0 | Còn warnings có sẵn |
| E2E source typecheck | PASS | Bao gồm harness/spec ngoài production tsconfig |
| Playwright controlled HTTP | 9/9 PASS | Fixture, không phải staging lifecycle |
| Mutation check queue | Bắt được lỗi | Bỏ khóa khi refresh lỗi làm test FAIL; đã khôi phục source |
| BE build | PASS; 0 lỗi/0 warning | Source local `aee0dc0` |
| BE unit / OpenAPI | 1079/1079 và 4/4 PASS | `DepartOpenApiTests`; không thay thế API/DB evidence |
| Lifecycle thật cơ bản | 2/2 PASS | Upload bytes, revision/resubmit, PASS, next gate, exact-version download, revoke 403, anonymous 401 |
| Queue đồng thời | 48/48 trả 200 mỗi run | Hai nhóm 24; không phải capacity benchmark hay forced deadlock |
| Lifecycle mở rộng quyền | 1 PASS / 1 FAIL | Liên ngành FAIL tại mentor tải ngoài ngành; không skip/đổi expectation |
| Production dependency audit | 0 advisory | `pnpm audit --prod` tại thời điểm chạy |

Đã đọc lại gate/evidence/assignment trong catalog test riêng, dừng API riêng và drop catalog do runner tạo. Không chạy migration/seed hoặc mutation nghiệp vụ trên staging/shared DB. GET timeline của BE có thể lazy-initialize gate khi có template; không gọi đây là SELECT-only audit.

## Staging với tài khoản thật được người dùng cho phép

- Login thành công với sinh viên P1/P2/P3, admin, staff IT và lecturer IT test. Không lưu mật khẩu/token vào source, report hoặc trace.
- Ba sinh viên đầu nhóm nhận `404 ActiveProject` từ `/students/me/review-gates/timeline`. Danh sách `/projects?page=1&pageSize=20` cho từng sinh viên trả 200 nhưng rỗng.
- Admin đọc template: 200 với `[]`. Staff/lecturer đọc queue: 200 với `items=[]`, `totalCount=0`.
- Production login/router được chạy bằng Chromium. `/project/review-gates` hiển thị lỗi ActiveProject thật; không rơi về dữ liệu mock.
- Probe `/teams/current` thiếu `academicSemesterId` trả 400 do validation; không dùng probe này để kết luận không có team hoặc ghi nhận lỗi BE.
- Upload → submit → decision trên staging **BLOCKED bởi dữ liệu test chưa sẵn sàng**. Chưa tự tạo/publish template cấp kỳ học có thể ảnh hưởng project ngoài test.

Kết luận chỉ áp dụng tài khoản demo được cung cấp, không khẳng định staging không có project nào khác.

## BE GAP cần xử lý

### P1 — Mentor tải được file ngoài ngành

Tái hiện trên `aee0dc0`, DB riêng, project liên ngành SE + DS:

1. Leader nộp file cho requirement `MAJOR_SPECIFIC` thuộc SE ở R1.
2. Đăng nhập mentor chỉ được phân công DS, không có review assignment SE.
3. GET `/api/v1/projects/{projectId}/review-gates/R1/requirements/{seRequirementId}/evidence/1/download`.
4. Kỳ vọng **403**, thực tế **200** và trả file.

Kiểm tra `src/AIPMS.Infrastructure/Services/Projects/ReviewGateService.cs`, `DownloadEvidence`, khoảng dòng 257–273: `isSupervisor` chỉ kiểm tra có active supervisor assignment; download chưa đối chiếu ngành của evidence với phạm vi supervisor. `CanReadProjectScope` cho đọc project không đủ làm authority đọc từng evidence.

BE cần áp dụng policy đọc file theo COMMON/MAJOR_SPECIFIC/INDIVIDUAL và scope supervisor/reviewer thật. Regression phải gồm mentor ngoài ngành 403, own-major/common theo policy được duyệt, target INDIVIDUAL, reviewer active/revoked, admin. FE không thể sửa lỗi này bằng ẩn nút.

Case tái hiện đã có trong `e2e/review-gates/live.spec.ts`; chạy runner với BE mới và giữ assertion 403. COI, reviewer ngoài ngành, target cá nhân ngoài team và tải cá nhân đúng/sai quyền đã qua kiểm tra trong cùng run. Audit rollback và forced deadlock/retry exhaustion vẫn cần BE kiểm chứng riêng.

### Fixture staging cần bàn giao

1. Xác nhận DB/seed đang phục vụ các tài khoản demo; bàn giao project ID/code, leader/member, trạng thái cho phép nộp, frozen scope và period ID của P1/P2/P3.
2. Chuẩn bị template Review Gates được duyệt, gate instances và scoped reviewer assignments; giới hạn tác động vào project test theo cơ chế BE hỗ trợ.
3. Sửa lỗi scope, deploy bản mới và bàn giao SHA/image, schema/migration evidence, IDs để chạy authenticated upload → submit → revision/resubmit → PASS/next gate → download/revoke trên staging.

## Evidence

Local: `F:/AI-PMS/artifacts/reviews/review-gates-integration-20261021/`.

- `staging-status.json`, `staging-openapi.json`, `staging-browser-smoke.json`, `staging-auth-audit.json`, `staging-queue-auth.json`, `staging-student.png`.
- `fe-unit-final.json`, `fe-build.log`, `fe-lint.log`, `e2e-typecheck.log`, `playwright-contract-final.json`.
- `queue-red.json`, `queue-mutation.json`: run cố ý FAIL để kiểm tra regression; source đã khôi phục.
- `be-build.log`, `be-unit.trx`, `be-openapi.trx`, `dependency-audit.json`.
- `live/playwright-live.json`: hai lifecycle cơ bản pass; `live-authority/playwright-live.json`: run mở rộng có lỗi scope, kèm attachments `concurrent-queue-reads` và `negative-scope-evidence`.
- `live-authority/live-db-readback.json`, `live-authority/live-cleanup.json`: readback và dọn tài nguyên riêng.

Không commit toàn bộ artifacts local. Regression specs, runner và báo cáo này được version trên nhánh FE để BE chạy lại.
