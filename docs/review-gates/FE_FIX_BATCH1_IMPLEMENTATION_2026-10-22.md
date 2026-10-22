# Kết quả sửa review FE Batch 1 — 22/10/2026

**Trạng thái sửa FE: DONE. Nghiệm thu dữ liệu/lifecycle thật: FE_DONE_BE_PENDING.**

Nguồn yêu cầu: `FE_FIX_BATCH1_REVIEW_2026-10-22.md`. Nhánh sửa trực tiếp theo yêu cầu người dùng: `feat/uiux-master-redesign`, baseline `ffea00a4b5044a64f869f3331a1c04762f7c69ba`. Người dùng đã yêu cầu commit và push sau khi sửa; không cần xin duyệt lại theo dòng hạn chế trong tài liệu đầu vào.

## Kết quả FIX-01…FIX-07

| ID | Thay đổi | Bằng chứng |
|---|---|---|
| FIX-01 | Đọc dashboard sinh viên song song với calendar và aggregator. Chỉ mốc `isOverdue` được thêm vào attention với ưu tiên 15; không lấy task attention từ dashboard | Unit kiểm đúng một cảnh báo mốc và một task; controlled browser thấy cả hai |
| FIX-02 | Khi scoped calendar sinh viên lỗi, dùng task/milestone deadlines từ dashboard và đọc song song meetings/deliverables/final checklist. Tái sử dụng projection hiện có; lỗi nguồn độc lập, có partial khi bị phân trang; không tạo hạn từ null | Unit/controlled browser có sự kiện họp, hạng mục, bàn giao; nguồn calendar vẫn error. Calendar thành công không gọi ba API dự phòng |
| FIX-03 | Aggregator chỉ đưa item HIGH vào attention. Item còn lại được đếm và công bố ngoài danh sách ưu tiên. Số lượng chỉ phản ánh item đã nhận, panel nguồn ghi rõ chưa có tổng số/tín hiệu truncation | Unit cả ba actor; browser normal-only có số việc đang mở và panel ưu tiên rỗng |
| FIX-04 | Khôi phục dòng trạng thái cho dashboard và các nguồn dự phòng thực sự được đọc; giữ hai disclosure unsupported cho hạn báo cáo/hạn đánh giá | Unit kiểm cả hai gap; browser thấy disclosure ở sinh viên/giảng viên. Không tạo dòng supervisor/department dashboard khi không gọi các nguồn đó |
| FIX-05 | Truyền toàn bộ departmentIds từ phiên đăng nhập; loại id không hợp lệ/trùng; Promise.allSettled mỗi bộ môn một request; lỗi có source riêng; item trùng được gộp theo kind/project/id | Unit [1,2,3] có một lỗi vẫn giữ hai nguồn tốt; browser [1,2] kiểm cả trường hợp đủ dữ liệu và một bộ môn 403. [] vẫn unavailable |
| FIX-06 | Dịch NOT_CONFIGURED, INSUFFICIENT_DATA và FROZEN_GATE_WEIGHTS từ source BE; hỗ trợ WEIGHTED_GATES của fixture cũ; giá trị mới dùng câu trung tính | Unit có mã lạ và mã thật của BE; không in academicProgressSource thô |
| FIX-07 | Nhánh KPI có số giữ text-2xl; nhánh text dùng text-base/line-height 24px; caption nằm riêng, các card cùng hàng được kéo giãn đều | Playwright kiểm font 16px, chiều cao card cùng hàng, không overflow/cắt nội dung ở 390/768/1280/1440px; đã xem ảnh 390/1440px |

Giữ nguyên BigInt validation, safeInternalDeepLink, production mock guard và null-handling. Không sửa BE/DB hoặc thêm dependency. Không quay lại tổng hợp task attention ở client. Lịch giảng viên tiếp tục dùng scoped calendar; fallback tài nguyên sinh viên được phục hồi đúng phạm vi của bản trước.

## Kiểm chứng cục bộ

| Kiểm tra | Kết quả |
|---|---|
| TDD trước khi sửa | 20 test lỗi / 45 test trong nhóm tái hiện; lưu `red.json` |
| Unit toàn bộ, lượt đầu | 1.396 PASS; 0 fail/skipped; maxWorkers=4 |
| Unit toàn bộ, lượt cuối | **1.397 PASS; 0 fail/skipped**, maxWorkers=4; nhóm tập trung cuối cũng chạy lại sau chỉnh so sánh timestamp |
| Nhóm test tập trung cuối | 73 PASS; 0 fail/skipped; gồm enum BE bổ sung và so sánh snapshot UTC có độ chính xác phần giây khác nhau |
| Mutation review | Đảo điều kiện HIGH làm 6 test fail; source được khôi phục đúng byte; lưu `mutation-receipt.json` |
| Playwright controlled | 42/42 PASS; 0 skipped/flaky. Gồm 33 ca sẵn có và 9 ca review mới |
| Axe | 0 violation ở 6 màn/trạng thái controlled được kiểm tra lại |
| Typecheck | PASS |
| Production build | PASS với VITE_USE_MOCK_REVIEW_GATES=true; còn cảnh báo chunk >500kB hiện hữu |
| Lint | 0 error, 193 warning kế thừa. So sánh filename/rule/message/severity với baseline: không thêm warning, không thêm suppression. Chưa đạt zero-warning toàn repo |

## Kiểm chứng staging — giới hạn cụ thể

Chạy lại 4 ca đăng nhập/read-only với P1, P3, giảng viên IT1, staff IT; **4/4 PASS**, không có mutation nghiệp vụ.

| Đọc thật | Kết quả |
|---|---|
| Student next-actions P1/P3 | 200, items=[] |
| Supervisor triage queue | 200, items=[] |
| Department 20002 urgent actions, scope lấy từ phiên đăng nhập | 200, items=[] |
| Lịch giảng viên | 200, items=[], complete=true, hasMore=false |
| Timeline P1/P3 | 404 ActiveProject 50003/50011 |

Staging xác nhận kết nối, empty/error state và trang lịch đọc được. **Không dùng 4 smoke test này để khẳng định đã verify dữ liệu mốc quá hạn, fallback khi 500, HIGH/NORMAL có dữ liệu, staff nhiều bộ môn, hoặc KPI null trong một timeline staging trả 200.** Những trường hợp đó có bằng chứng unit và Playwright controlled. Không tạo dữ liệu trên staging để vượt blocker.

## Bàn giao BE và Git

- Đề nghị thêm kind MILESTONE, phối hợp bỏ nguồn attention trùng và giữ các disclosure BE-08/09: `BE_HANDOFF_FE_FIX_BATCH1_2026-10-22.md`.
- Trong lúc sửa, `BE_HANDOFF_2026-10-21.md` được cập nhật ngoài phần thay đổi này. Giữ nguyên file đang sửa đó; commit chỉ bao gồm mã/test và tài liệu của lượt sửa review, không trộn cập nhật của người khác.
- Không sửa .env/.env.example; không thay đổi develop hoặc tạo PR. Commit và push nhánh UI theo yêu cầu trực tiếp của người dùng. Receipt sau push ghi commit/local/remote tại thư mục bằng chứng ngoài repo.

## Vị trí bằng chứng và chạy lại

Thư mục: `F:/AI-PMS/artifacts/fe-fix-batch1-20261022`.

- Unit: `red.json`, `focused-final.json`, `unit.json`, `unit-final.json`, `mutation-receipt.json`.
- Browser: `playwright-controlled-final.json`, `playwright-staging.json`, `axe-*.json`, `staging-*.json`.
- Ảnh KPI: `fix07-kpi-null-390.png`, `fix07-kpi-null-768.png`, `fix07-kpi-null-1280.png`, `fix07-kpi-null-1440.png`.
- Ảnh fallback: `fix02-calendar-fallback.png`. Logs build/typecheck/lint cùng thư mục.

```powershell
npm run typecheck
npm run lint
npm run build
Get-Content .env.example | ForEach-Object {
  if ($_ -match '^(VITE_ENABLE_[A-Z_]+)=(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
  }
}
$env:VITE_ENABLE_AI_ADVISORY='true'
npx vitest run --maxWorkers=4
$env:BATCH1_EVIDENCE_DIR='F:/AI-PMS/artifacts/fe-fix-batch1-20261022'
$env:BATCH1_E2E_REPORT="$env:BATCH1_EVIDENCE_DIR/playwright-controlled.json"
$env:BATCH1_AXE_PATH='F:/AI-PMS/.local/fe-batch1-audit/node_modules/axe-core/axe.min.js'
npx playwright test --config playwright.batch1.config.ts controlled.spec.ts fix-review.spec.ts
# Chỉ chạy staging khi có BATCH1_DEMO_PASSWORD trong process; không lưu secret vào file.
npx playwright test --config playwright.batch1.config.ts staging-readonly.spec.ts
```
