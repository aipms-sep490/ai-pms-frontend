# FE Batch 1 — Kết quả triển khai ngày 22/10/2026

**Trạng thái: `FE_DONE_BE_PENDING` — phần FE đã triển khai; chưa đạt toàn bộ điều kiện nghiệm thu đợt 1.**

Nguồn yêu cầu: `F:/AI-PMS/ai-pms-frontend/docs/review-gates/FE_BATCH1_LAM_TRUOC_2026-10-22.md`.

## Phạm vi và baseline

- Worktree chuẩn bị: `F:/AI-PMS/ai-pms-frontend-batch1`. Sau yêu cầu gộp của người dùng ngày 22/10, bản đã kiểm thử được chốt bằng commit cục bộ và đưa vào `feat/uiux-master-redesign` tại `F:/AI-PMS/ai-pms-frontend`.
- Nhánh: `feat/fe-batch1-20261022`, tạo từ `origin/develop` đã fetch tại `a6771ba88f2e7ccf024d5c1210576c518b49b61c`.
- Tích hợp nhánh UI `11b7d62ff014929febf9b0a32d4496e145b440e6` bằng merge không commit. Đã giải quyết 6 xung đột; không còn file unmerged. Giữ tên học thuật dễ đọc từ develop cùng bố cục/thao tác từ nhánh UI.
- **Đã cho phép gộp cục bộ theo yêu cầu trực tiếp của người dùng.** Commit tích hợp giữ cả ancestry develop và nhánh UI; nhánh `feat/uiux-master-redesign` được fast-forward tới bản tích hợp. Không thay đổi nhánh develop, không push hoặc tạo PR.
- Không reset/stash checkout gốc; 3 tài liệu untracked ở checkout gốc được giữ nguyên. Chỉ tạo commit và gộp cục bộ theo yêu cầu mới; không push hoặc tạo PR.
- Không sửa BE/DB, không tạo/publish template hoặc thực hiện mutation nghiệp vụ trên staging.
- `.env.example` khớp byte với nhánh UI gốc; không tạo/sửa `.env`. Không thêm dependency hoặc thư viện UI vào project.

## Repo / Skill / Toolkit đã dùng

| Vai trò | Lựa chọn | Mục đích và giới hạn |
|---|---|---|
| Primary | Frontend React/TypeScript hiện có | Tái sử dụng route, token, primitive và HTTP client; giữ BE làm authority |
| Supporting | Graphify, Git workflow, frontend UI engineering, UI/UX Pro Max | Khoanh vùng ảnh hưởng, tích hợp an toàn, kiểm tra form/focus/responsive |
| Supporting | Vitest, Playwright, Chrome DevTools | Unit/component, HTTP có kiểm soát, đọc staging, quan sát trình duyệt |
| Optional audit | axe-core 4.10.3 đặt ngoài repo tại `.local/fe-batch1-audit` | Kiểm tra WCAG tự động; không thay thế kiểm tra thủ công hoặc quyền BE |

## Kết quả theo yêu cầu

| ID | Thực hiện | Trạng thái / bằng chứng |
|---|---|---|
| FE-08 | Fetch; xác minh local develop không có commit thừa; tạo nhánh từ remote develop; tích hợp 25 commit UI và giải quyết 6 xung đột | Đã chốt commit tích hợp và gộp cục bộ vào `feat/uiux-master-redesign` theo yêu cầu người dùng |
| FE-01 | Thêm `weight` cho gate; nhập từng cổng; gửi `weight`/`null`; validate tất cả trống hoặc đủ 0–100 và tổng đúng 100; tính tổng thập phân chính xác; xử lý `422 weights` và `409`; giữ dữ liệu, focus lỗi, cho nhân bản phiên bản | FE hoàn tất; ca live 20/20/35/25 → PASS → 20% chờ BE-06 |
| FE-02 | Thêm weight instance; tiến độ học vụ/task tách biệt; `NOT_CONFIGURED` hiện nhãn yêu cầu; null không tạo thanh 0%; nhánh COMMON/ngành hiển thị weight và null đúng; readiness là tư vấn, không tham gia điều kiện submit | Unit/HTTP fixture hoàn tất; staging P1/P3 trả 404 nên chưa verify được nhánh null hoặc có số |
| FE-05 | Ép mock false khi `PROD`; test cả cờ true/false/unset và transport thật; giữ mock dev | Hoàn tất; production build chạy cả khi cờ mock bị đặt true; mutation review phát hiện được đảo guard |
| FE-03 | Giảng viên gọi scoped calendar; giữ `hasMore`/`!complete` → partial; link nội bộ qua router; giữ nhánh admin unsupported | Staging API 200, empty, complete=true; chưa có sự kiện demo để verify populated calendar |
| FE-04 | 3 typed adapter `httpGet`; thay tổng hợp client bằng 1 aggregator request mỗi actor/load; nhãn/icon 8 kind, kind lạ trung tính; severity dùng BadgeTone sẵn; kiểm tra link; hiển thị asOfUtc; phân biệt empty/error | Cả 3 endpoint staging 200, items=[]; fixture xác nhận một request/widget, link an toàn và lỗi độc lập với calendar |
| FE-07 | Sửa fixture TaskBoard/AI có `majors`; đồng bộ fixture catalog/name/auth context phát sinh từ develop; giữ assertion nghiệp vụ cụ thể | Full suite 1.376/1.376 PASS với các feature flag trong `.env.example` và AI advisory bật; routes.config hiện đã pass, không nới assertion |
| FE-06 | RequirementScope chỉ còn COMMON/MAJOR_SPECIFIC/INDIVIDUAL; sửa drawer/mock requirement; xóa 5 file foundation/hook/type/test chết, cập nhật README | Hoàn tất phần kỹ thuật; **giữ** EvaluatorAssignmentsPage và route `/evaluator/evaluations`, chờ quyết định của leader |
| FE-14 | Wrap nội dung dài; label/input liên kết; read-only fieldset; CTA/focus; phân biệt loading/empty/filtered-empty/error; sửa 3 lỗi contrast phát hiện bằng axe | 390/768/1280/1440px không tràn trang; CSS zoom 200% qua; 6 axe audits không có violation. **Native Chrome zoom 200% chưa xác nhận** |

Không thực hiện các phần loại khỏi đợt 1: evidence/link, supervisor-feedback thật, hybridScopeLabels, lý do chặn ma trận từ dict rỗng, thay type taskProgress, live P1/P2/P3 lifecycle.

## Kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| Typecheck | PASS |
| Production build, kể cả `VITE_USE_MOCK_REVIEW_GATES=true` | PASS; còn cảnh báo chunk >500 kB hiện hữu |
| Full unit/component với feature flags | **1.376 PASS; 0 fail; 0 skipped** |
| Playwright tổng hợp | **37/37 PASS**: 33 controlled HTTP + 4 staging read-only |
| Playwright bổ sung sau thay đổi cuối | 6/6 viewport 1440px và 4/4 kiểm tra builder sau sửa badge nhỏ PASS; lưu snapshot phục vụ kiểm tra zoom |
| Axe WCAG 2 A/AA, 2.1 AA, 2.2 AA | 0 violation trong 6 màn/trạng thái đã chạy |
| Keyboard | Tab/focus-visible; sửa weight và submit bằng Enter; lỗi 422/409 giữ giá trị và focus tới lỗi form |
| HTTP errors | Controlled sources: 401/403/404/409/422/429/500 không biến thành empty thành công; calendar vẫn giữ nguồn đọc được |
| Mutation review | Đảo guard production khiến test fail; đã khôi phục source |
| Lint | **0 error, 193 warning**. Nhánh UI gốc có 184; 9 cảnh báo còn lại thuộc phần develop mới tích hợp. Không thêm warning từ mã batch 1, không thêm suppression. **Chưa đạt điều kiện 0 warning nếu hiểu “lint sạch” theo nghĩa đó** |
| Git | diff --check PASS; 0 file unmerged; đã commit/gộp cục bộ; chưa push/PR |

## Staging thực tế — không suy diễn từ tài liệu đầu vào

Đăng nhập các tài khoản demo được cung cấp: sinh viên P1, sinh viên P3, giảng viên IT1 và nhân viên khoa IT. Không lưu mật khẩu/token vào source hoặc evidence; các POST Google challenge không liên quan được chặn trong lượt chạy cuối.

| Đọc thật | Kết quả |
|---|---|
| `/students/me/next-actions` — P1/P3 | 200, items=[]; UI hiện empty state và mốc dữ liệu |
| `/supervisors/me/triage-queue` | 200, items=[] |
| `/departments/20002/urgent-actions` | 200, items=[]; department lấy từ `/auth/me/context`, không nhập scope tùy ý |
| `/calendar` — lecturer IT1 | 200, items=[], hasMore=false, complete=true |
| `/students/me/review-gates/timeline` — P1 | 404 ActiveProject key 50003 |
| `/students/me/review-gates/timeline` — P3 | 404 ActiveProject key 50011 |

Swagger live xác nhận weight, academicProgress, disciplineProgress và cả 3 aggregator. `DisciplineBranchProgressDto.progress`/weight có thể null; FE hiển thị thiếu dữ liệu đúng. Không đổi type taskProgress khi quyết định BE-10 còn mở.

Tài liệu yêu cầu cho rằng nhánh timeline null có thể verify ngay. **Kết quả runtime hiện tại không hỗ trợ nhận định đó đối với P1/P3**: request trả 404 trước khi có DTO. Nhãn null đã được chứng minh bằng controlled HTTP; không gọi đó là bằng chứng staging. Không tạo dữ liệu cấp kỳ để vượt qua blocker.

## Điểm còn chờ

1. **BE-06 / chủ dữ liệu:** chuẩn bị project/snapshot/template/gate demo có quyền phù hợp; sau đó verify null timeline và weighted PASS → 20% trên dữ liệu thật.
2. **Chủ dữ liệu demo:** có calendar event/action item thật để verify danh sách có nội dung. Hiện chỉ chứng minh kết nối và empty state.
3. **Leader:** quyết định việc giữ/bỏ nav cũ EvaluatorAssignmentsPage. Route được giữ nguyên trong batch này.
4. **QA:** native browser zoom 200%. CSS zoom đã qua nhưng tổ hợp phím DevTools không thay đổi DPR/innerWidth, vì vậy không tính là bằng chứng zoom gốc.
5. **Repo quality:** xử lý 193 cảnh báo lint kế thừa nếu yêu cầu bàn giao là zero-warning. Batch này không mở rộng sang dọn toàn repo.
6. **Git:** người dùng đã yêu cầu gộp vào nhánh UI; commit/merge cục bộ đã được cho phép. Vẫn cần yêu cầu riêng nếu muốn push hoặc mở PR; develop giữ nguyên.

## Vị trí bằng chứng và chạy lại

- Tổng hợp: `F:/AI-PMS/artifacts/fe-batch1-20261022/validation-summary.json`.
- Unit: `unit-full-flags.json`; browser: `playwright-final.json`; lint: `lint.json`, `lint-original-ui.json`; build/typecheck: log cùng thư mục.
- Staging: `staging-*.json`, ảnh `staging-*-calendar.png`, `staging-*-timeline.png`.
- Controlled: `controlled-*.png`, `axe-*.json`; native zoom attempt được ghi riêng, không dùng để khẳng định 200% native.
- Patch review so với nhánh UI gốc, bao gồm file mới: `implementation-vs-ui-branch.patch`.

```powershell
# Sau khi gộp: chạy trong F:/AI-PMS/ai-pms-frontend
npm run typecheck
npm run lint
npm run build

# Không sửa .env: nạp đúng các cờ rollout từ template vào process hiện tại.
Get-Content .env.example | ForEach-Object {
  if ($_ -match '^(VITE_ENABLE_[A-Z_]+)=(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
  }
}
$env:VITE_ENABLE_AI_ADVISORY='true'
npm test

$env:BATCH1_AXE_PATH='F:/AI-PMS/.local/fe-batch1-audit/node_modules/axe-core/axe.min.js'
# Cấp BATCH1_DEMO_PASSWORD qua môi trường process nếu chạy kiểm tra staging.
npx playwright test --config playwright.batch1.config.ts
```

Để xem ứng dụng nối staging: `npm run dev:review-gates:staging` trong `F:/AI-PMS/ai-pms-frontend`. Các harness dưới `e2e/` là entry kiểm thử tách biệt, không được import vào production.
