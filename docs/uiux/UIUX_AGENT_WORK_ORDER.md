# WORK ORDER — PHỦ KÍN BỘ NHẬN DIỆN ACADEMIC COMMAND CENTER

> **Cách dùng:** đưa nguyên file này cho AI agent làm prompt. File tự chứa đủ ngữ cảnh, agent không cần đọc hội thoại trước.
> **Lập ngày:** 31/10/2026 · **Nguồn:** rà soát `feat/uiux-academic-command-center` (15 finding) · **Chi tiết nền:** `docs/uiux/UIUX_COVERAGE_REQUIREMENTS.md`

---

## 0. BRIEF CHO AGENT

Bạn làm việc trong repo frontend AI-PMS tại `F:\AI-PMS\ai-pms-frontend` (React 19 + Vite + Tailwind **v4** + vitest). Nhánh hiện tại là `feat/uiux-academic-command-center`, base `c67f42e`.

**Tình trạng khi bạn nhận việc:** nhánh đã đổi bảng màu từ xanh lá `#0F5B4E` sang Academic Command Center (Navy `#0F2747` · Teal `#087D77` · Amber `#F6B94C` · Canvas `#F6F8FB`) trong 47 file, **toàn bộ chưa commit**. Việc đổi màu đúng hướng nhưng mới phủ ~45% và có 4 lỗi khiến bộ màu không thực sự đến người dùng.

**Nhiệm vụ của bạn:** sửa các lỗi ở Phần 3, rồi phủ kín phần còn thiếu ở Phần 4, theo đúng thứ tự, không làm tắt.

**Việc đầu tiên bạn phải làm:** commit nguyên trạng working tree hiện tại thành một commit mốc để có điểm quay về:

```bash
cd /f/AI-PMS/ai-pms-frontend && git add -A && git commit -m "chore(uiux): snapshot palette migration before remediation"
```

---

## 1. BẤT BIẾN — TUYỆT ĐỐI KHÔNG ĐƯỢC CHẠM

Đây là hệ thống quản trị đồ án học thuật, không phải task manager. Vi phạm bất kỳ dòng nào dưới đây là fail cả work order:

1. **Không đổi route.** Không thêm/xóa/rename path trong `src/app/routes/*`.
2. **Không đổi API, DTO, endpoint, query param, header, request payload.**
3. **Không chạm guard:** `RoleRoute`, `ProtectedRoute`, `SupervisorExecutionRoute`, `MentorExecutionRoute`, `EvaluatorAssignmentRoute`, `DepartmentAcademicScopeRoute`, `ActiveStudentProjectRoute`, `AcademicWorkflowGate`.
4. **Không đổi logic nghiệp vụ:** form validation, state machine, lane Kanban (`TODO`/`IN_PROGRESS`/`BLOCKED`/`IN_REVIEW`/`DONE`), rollback drag-drop khi API lỗi, cách tính điểm Rubric, phân biệt scope `COMMON`/`OWN_MAJOR`/`INDIVIDUAL`, stage `ONGOING`/`COLD`/`DEFENSE`, phân biệt Milestone ≠ Review Gate ≠ Project State.
5. **Không đổi chuỗi tiếng Việt.** Giữ nguyên 100% thuật ngữ: "Phối hợp nhóm", "Công việc", "Hạng mục cần nộp", "Báo cáo tiến độ", "Thẩm định đề cương", "Review Gates", "Chấm nguội", "Đánh giá đồ án".
6. **`PENDING` không bao giờ được hiển thị thành `0`.** Phân biệt "không có dữ liệu" ≠ "bằng 0" ≠ "không được xem".
7. **Không thêm UI library thứ ba.** Không đổi framework. Không migrate CSS sang CSS-in-JS.
8. **Không nới lỏng test.** Không thêm `timeout`, không `skip`, không `it.only`, không sửa assertion để test xanh.
9. **Không sửa backend, không sửa file trong `ai-pms-backend*`.**

Nếu một yêu cầu trong file này có vẻ xung đột với bất biến trên: **dừng, báo lại, không tự quyết.**

---

## 2. DEFINITION OF DONE — LỆNH PHẢI CHẠY

Sau **mỗi** task, chạy đủ bộ:

```bash
cd /f/AI-PMS/ai-pms-frontend && npm run typecheck && npm run lint && npm test
```

Yêu cầu: typecheck 0 lỗi, lint không phát sinh warning mới (so với base `c67f42e`), **tất cả** test pass. Không báo "xong" khi chưa chạy. Nếu một lệnh không chạy được, nói rõ lệnh nào và vì sao — không im lặng bỏ qua.

**Không được dùng `npm run dev` để tự kiểm tra bằng mắt rồi kết luận.** Dev server của repo này proxy về `localhost:5080` và không có backend nào đang chạy, nên mọi trang có fetch sẽ ra trạng thái lỗi — đó không phải bug bạn vừa tạo.

---

## 3. GIAI ĐOẠN A — SỬA LỖI (bắt buộc xong hết trước khi sang Phần 4)

### T1 — Font `Inter` được khai báo nhưng không bao giờ được tải ⛔ BLOCKER

**Chứng cứ:** `src/index.css:5-6` đặt `"Inter"` đầu `--font-sans` và thứ hai trong `--font-heading`. `index.html:16` chỉ tải `Geist`, `JetBrains Mono`, `Plus Jakarta Sans`. Không có `@font-face`, không có font package trong `package.json`, không có `public/fonts/`.
**Hệ quả:** trên mọi máy không cài sẵn Inter (toàn bộ Linux, CI, container Playwright, phần lớn Windows) `font-sans` rơi về Geist — chữ không hề đổi.

**Làm:** trong `index.html:16`, **thay** `Geist` bằng `Inter` trong URL Google Fonts (không thêm vào thành 5 họ — Inter đã ưu tiên hơn Geist nên tải cả hai là lãng phí payload). Weight cần: `400;500;600;700`.

Giữ `"Geist"` trong stack fallback của `--font-sans` — nó chỉ còn là tên fallback cho máy có cài sẵn, không tốn request.

> Nếu dự án có yêu cầu chạy air-gapped / không gọi CDN, thay bằng `npm i @fontsource/inter` + `import '@fontsource/inter/400.css'` (…500/600/700) trong `src/main.tsx` và **nói rõ** bạn đã chọn hướng này.

**Acceptance:**
- Mở app, `document.fonts.check('1rem Inter')` trả `true`.
- `getComputedStyle(document.body).fontFamily` bắt đầu bằng `Inter`.
- Nếu chọn bỏ Inter thay vì tải: `grep -n Inter src/index.css` trả về rỗng.

---

### T2 — Chữ nút `danger` tụt xuống 3.48:1, fail WCAG AA ⛔ BLOCKER

**Chứng cứ:** `src/components/ui/button-styles.ts:20` đổi `text-red-700` (`#b91c1c`, **6.47:1** trên trắng) → `text-danger` (`--color-danger: #E35D6A`, **3.48:1** trên trắng). Đây là control phá hủy (xóa / hủy / thu hồi). `.claude/rules/ai-pms-ui-ux.md` yêu cầu AA ≥ 4.5:1.

**Làm:**
1. Trong `@theme` của `src/index.css`, thêm token foreground riêng:
   `--color-danger-text: #B42318;` — đã đo: **6.57:1** trên `#FFFFFF`, **6.01:1** trên `#FEF2F2`.
2. `button-styles.ts:20`: `text-danger` → `text-danger-text`.
3. Giữ `--color-danger: #E35D6A` **chỉ** cho viền, nền nhạt, dot trạng thái — nơi chỉ cần 3:1 cho non-text.

**Acceptance:** không còn chỗ nào dùng `--color-danger` / `text-danger` cho chữ hoặc icon mang nghĩa. Nút `danger` đạt ≥ 4.5:1.

---

### T3 — Chữ trạng thái lỗi 3.18:1 trên toàn hệ thống ⛔ BLOCKER

**Chứng cứ:** `src/index.css:44` `--color-status-error-text: #E35D6A` trên `--color-status-error-bg: #FEF2F2` = **3.18:1** (trước là `#dc2626` → 4.41:1, vốn đã sát ngưỡng). Consumer: `src/components/ui/Badge.tsx:28` (`variant="error"`) và `src/components/ui/status-badge-tone.ts:6` (`tone="danger"`).
**Hệ quả nghiệp vụ:** mọi badge *Từ chối / Quá hạn / Thất bại / Thu hồi* ở tất cả route đều fail AA — tức tín hiệu quyết định nhất của Review Gate và công bố kết quả lại là tín hiệu khó đọc nhất.

**Làm:** `src/index.css:44` → `--color-status-error-text: #B42318;` (6.01:1 trên `#FEF2F2`). Giữ nguyên `--color-status-error-bg` và `--color-status-error-border`.

**Acceptance:** `#FEF2F2` + `#B42318` đạt ≥ 4.5:1. `Badge variant="error"` và `StatusBadge tone="danger"` đổi theo mà không cần sửa hai file đó.

---

### T4 — Vùng chạm nút nhỏ hơn mức đã ghi trong design system ⛔ BLOCKER

**Chứng cứ:** `src/components/ui/button-styles.ts:5-7` đặt `sm: min-h-[36px]`, `md: min-h-[40px]`, `lg: min-h-[44px]`. `design-system/ai-pms/MASTER.md:54`: *"Primary and icon-only controls require at least 44px targets."* `md` là variant **mặc định**. Thêm nữa `h-8` + `min-h-[36px]` trên cùng dòng xung đột — `min-height` thắng nên `h-8`/`h-10`/`h-11` thành mã chết gây đọc sai.

**Làm:**
1. Bỏ `h-8`/`h-10`/`h-11`, chỉ giữ `min-h-*` (nguồn duy nhất quyết định chiều cao).
2. `md` → `min-h-[44px]`, `lg` → `min-h-[48px]`.
3. `sm` giữ `min-h-[36px]` nhưng **chỉ** dùng cho control phụ trong hàng bảng; thêm comment một dòng ngay trên nó ghi rõ đây là ngoại lệ spacing của WCAG 2.2 và không dùng cho primary/icon-only.

**Acceptance:** `md` và `lg` ≥ 44px. Chạy `npm test src/components/ui` — nếu có snapshot/assertion về chiều cao thì cập nhật assertion cho đúng giá trị mới (đây là sửa kỳ vọng theo yêu cầu mới, **không** phải nới lỏng test).

---

### T5 — Siết lại chốt chặn chống hardcode màu (làm **trước** T6, T7)

**Chứng cứ:** `src/test/design-tokens.test.ts:15` vẫn là
`/#(0f5b4e|0a493f|edf3f0|14201d|3d4a46|596863|e5ece8|d7e0dc)(?![0-9a-f])/i`
— toàn bộ là giá trị **đã bỏ**. Sau nhánh này chúng gần như không còn, nên test PASS một cách rỗng và không canh gì cho palette mới. Chính vì vậy ~140 hex trần mới đã lọt vào mà không ai biết.

**Làm:**
1. Đổi `tokenHex` sang palette **mới**:
   `/#(087d77|06665f|ddf7f4|0f2747|12b3a8|f6b94c|e35d6a|b42318|162033|64748b|d9e1ec|cbd5e1|f6f8fb|0a766f|b45309)(?![0-9a-f])/i`
   Glob của test đã loại `../index.css`, nên không cần ngoại lệ thêm.
2. Giữ nguyên test cũ về `0f5b4e|…` dưới tên khác (`retiredPaletteHex`) để palette cũ không bò về.
3. Thêm test contrast mới. Tự viết helper relative-luminance theo WCAG trong file test (không thêm dependency):

```ts
function luminance(hex: string) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}
```

Assert ≥ 4.5 cho các cặp text/bg: `status-success-text`/`status-success-bg` (đã đo 4.87), `status-warning-text`/`status-warning-bg` (4.84), `status-error-text`/`status-error-bg` (3.18 → 6.01 sau T3), `primary`/`#FFFFFF` (4.99), `danger-text`/`#FFFFFF` (6.57 sau T2), `ink`/`canvas` (15.32), `ink-muted`/`card` (4.76), và cả 5 cặp `tag-*`/`tag-*-bg`.

Đọc giá trị bằng cách parse `src/index.css` dạng raw, **không** hardcode lại hex trong test — mục đích là test đi theo token, không đi theo niềm tin.

> Lường trước: `tag-qa` hiện là **4.44** nên assertion này sẽ fail cho đến khi bạn làm T13. Đó là đúng — đừng hạ ngưỡng xuống 4.4 để test xanh, hãy sửa token.

Token `--color-accent-amber: #F6B94C` chỉ **1.76:1** trên trắng — tức **không đạt cả ngưỡng 3:1 của non-text**. Vì vậy:
- **Không** assert amber trong test contrast (nó sẽ fail ở mọi ngưỡng; hạ ngưỡng cho riêng nó là tự vô hiệu hóa test).
- Thay vào đó, amber chỉ được dùng làm **nhấn thị giác đi kèm**, không bao giờ là vật mang nghĩa duy nhất và không bao giờ là đường biên duy nhất của một control tương tác (xem T12).
- Mọi chỗ dùng amber phải có nhãn chữ hoặc icon dùng `--color-status-warning-text: #B45309` (4.84:1) bên cạnh. Ghi rule này vào `MASTER.md` ở T17.

**Acceptance — đây là điểm then chốt của cả work order:**
Sau khi sửa test nhưng **trước** khi làm T6/T7, chạy `npm test src/test/design-tokens.test.ts` và nó phải **FAIL**, liệt kê ra các file còn hex trần. Nếu nó pass ngay thì regex của bạn sai — sửa lại. Dán output fail đó vào báo cáo làm bằng chứng test thật sự có canh.

---

### T6 — Bỏ hex trần và fallback trùng token

**Chứng cứ:** diff thêm **272** lượt hex 6 ký tự vào CSS. Trong đó **132** lượt là fallback `var(--token, #hex)` và **~140** lượt là hex trần, gồm `#ddf7f4`×6, `#0f2747`×6, `#087d77`×6, `#64748b`×6, `#12b3a8`×5, `#d9e1ec`×4, `#f6f8fb`×3, `#162033`×3, `#0a766f`×3. `design-system/ai-pms/MASTER.md:48` ghi rõ: *"Do not repeat raw palette hex values in workspace components or page CSS."*

**Làm:**
1. Thay mọi hex trần trùng giá trị token bằng `var(--color-*)` tương ứng.
2. **Bỏ luôn phần fallback** trong `var(--color-x, #hex)` → `var(--color-x)`. Lý do: mọi token này đều được định nghĩa trên `:root` trong `index.css` nên fallback là mã chết, và nó là nơi thứ hai chứa palette — đổi token mà quên fallback là cách bug quay lại.
3. Hợp nhất 6 neutral mới phát sinh ngoài thang màu — `#fafbfc`×3, `#dbe3ec`×3, `#c7f0ec`×3, `#edf0f2`×2, `#f5f7f6`, `#f4f8f6` — vào thang có sẵn `canvas` / `card` / `hairline` / `line` / `line-strong`. Nếu thật sự cần một sắc mới, thêm **một** token có tên nghĩa rõ ràng vào `@theme` và ghi vào `MASTER.md`, đừng rải hex.

**Acceptance:** `npm test src/test/design-tokens.test.ts` chuyển từ FAIL (ở T5) sang PASS. Không file nào ngoài `src/index.css` còn hex của palette mới.

---

### T7 — Hairline cũ `#e2e8f0` bị gõ lại trên những dòng vừa viết mới

**Chứng cứ:** diff tự thêm 6 lượt `#e2e8f0` (giá trị hairline **cũ**, mới là `#D9E1EC`):

| File:line | Selector |
|---|---|
| `src/features/execution/execution.css:58` | `.ex-loading span` (skeleton) |
| `src/features/execution/execution.css:142` | `.ex-tabs` (dải tab) |
| `src/features/reports/reports.css:71` | `.report-loading div` (skeleton) |
| `src/features/projects/pages/collaboration-workspace.css:93` | `.cw-filters` |
| `src/features/projects/pages/collaboration-workspace.css:140` | `.cw-loading span` |
| `src/features/meetings/meetings.css:141` | `.mtg-loading > div` |
| `src/components/ui/document-preview-modal.css:81,188` | nền + chữ |

**Hệ quả:** mở `/project/workspace` hoặc `/project/reports` lúc đang tải, skeleton và dải tab đứng trên neutral cũ còn mọi viền cạnh nó đã sang neutral mới — lệch rõ trên cùng một mặt phẳng.

**Làm:** thay bằng `var(--color-hairline)`. Nếu skeleton cần sắc riêng đậm hơn hairline, thêm **một** token `--color-skeleton` vào `@theme` và dùng nó cho cả 4 skeleton (`.ex-loading`, `.report-loading`, `.cw-loading`, `.mtg-loading`) để chúng đồng bộ.

---

### T8 — Revert nới timeout trong nhánh thuần giao diện

**Chứng cứ:** `src/features/cold-reports/ColdChecklistPage.test.tsx:81` thêm `{ timeout: 3000 }` vào `waitFor` assert `saveColdDraft` được gọi kèm `concurrencyToken`. Không có thay đổi CSS nào ảnh hưởng được timing của `waitFor` trong jsdom, và không có giải thích kèm theo.
**Hệ quả:** một regression thật làm chậm hoặc làm mất concurrency token khi lưu nháp COLD giờ được bỏ qua trong 3 giây thay vì cửa sổ mặc định.

**Làm:** revert về đúng dòng gốc, bỏ `{ timeout: 3000 }`. Chạy `npm test src/features/cold-reports` 5 lần liên tiếp. Nếu nó flaky thật thì **báo lại kèm log**, mở issue riêng — không che trong nhánh UI, không tự sửa logic.

---

### T9 — `index.html` còn gim canvas và ink cũ

**Chứng cứ:** `index.html:2` `<html class="h-full bg-[#F8FAFC]">` và `index.html:24` `<body class="h-full text-slate-900 … bg-[#F8FAFC]">`. Canvas mới là `#F6F8FB`, ink mới là `#162033`.
Hiện chưa vỡ hình vì `src/index.css` không nằm trong `@layer` nên thắng `@layer utilities` của Tailwind v4 — nhưng chữ `body` thì **đang thực sự** lấy `#0f172a` chứ không phải `--color-ink`. Và chỉ cần ai bọc CSS vào `@layer base` (một bước dọn Tailwind v4 rất thường gặp) là canvas toàn app quay về màu cũ.

**Làm:** xóa `bg-[#F8FAFC]` khỏi cả `<html>` và `<body>`, xóa `text-slate-900` khỏi `<body>`. Giữ `h-full`, `antialiased`, `font-sans`. Để `:root` và `body` trong `src/index.css` làm nguồn duy nhất.

**Acceptance:** `getComputedStyle(document.body).backgroundColor` = `rgb(246, 248, 251)`; `color` = `rgb(22, 32, 51)`.

---

### T10 — Chốt một hệ token, bỏ hệ song song

**Chứng cứ:** `src/index.css:69-110` thêm 24 token `--aipms-ui-*` trùng giá trị với `--color-*` (`--aipms-ui-border` = `--color-hairline` = `#D9E1EC`; `--aipms-ui-primary-button-bg` = `--color-primary` = `#087D77`; `--aipms-ui-text-primary` = `--color-ink` = `#162033`; …), không có quy tắc ưu tiên. Toàn bộ 24 token chỉ có **9 lượt tham chiếu trong 4 file**: `workspace-page.css` (1), `auth-pages.css` (3), `login-design.css` (4), `notifications.css` (1). `docs/uiux/UIUX_CHANGE_PLAN.md:13` nói nhập từ `standards/aipms-ui-tokens.css` — **file này không tồn tại trong repo**; token đã bị gõ tay.
**Hệ quả:** đổi `--color-primary` thì 4 file kia giữ giá trị cũ → trang đăng nhập và mặt thông báo lệch khỏi phần còn lại.

**Làm:**
1. Chuyển 9 tham chiếu `--aipms-ui-*` màu sang `--color-*` tương ứng, rồi **xóa** các token `--aipms-ui-*` màu.
2. Các token **không** trùng — `--aipms-ui-radius-*`, `--aipms-ui-space-*`, `--aipms-ui-shadow-*`, `--aipms-ui-motion-*`, `--aipms-ui-ease` — thì **giữ giá trị nhưng đổi tên** vào `@theme` theo quy ước hiện có: `--radius-card`, `--shadow-card`, `--shadow-overlay`, `--motion-fast`, `--motion-normal`, `--motion-overlay`, `--ease-standard`. Cập nhật nơi dùng.
3. Sửa `docs/uiux/UIUX_CHANGE_PLAN.md:13` cho khớp sự thật (token khai báo trực tiếp trong `src/index.css`, không có file `standards/`).

**Acceptance:** `grep -rn "aipms-ui-" src/` chỉ còn khớp (nếu còn) ở T11. Mỗi giá trị màu tồn tại đúng một chỗ.

---

### T11 — Dark theme và khối reduced-motion là mã chết, và dark theme đang hỏng

**Chứng cứ:** `src/index.css:114` định nghĩa `[data-aipms-ui-theme="dark"]`; `src/index.css:134` định nghĩa reduced-motion trong `[data-aipms-ui-root]`. Cả hai attribute **không được set ở bất kỳ đâu** — không có trong `index.html`, `src/main.tsx`, `src/app/layouts/AppLayout.tsx` hay bất kỳ TSX nào. Nguy hiểm hơn: khối dark chỉ override `--aipms-ui-*`, **không** override `--color-canvas` / `--color-card` / `--color-ink` / `--color-hairline` — bật lên sẽ ra UI nửa sáng nửa tối. Reduced-motion thật sự đang được xử lý ở `src/motion/motion.css:45`, nên khối mới không gây regression, chỉ là mã chết gây hiểu sai.

**Làm — chọn hướng A (khuyến nghị):** xóa cả khối `[data-aipms-ui-theme="dark"]` và khối `@media (prefers-reduced-motion)` keyed theo `[data-aipms-ui-root]`. Dự án chưa có yêu cầu dark mode trong SRS; reduced-motion đã có nơi xử lý. Xóa mã chết rẻ hơn bảo trì mã chết.

**Hướng B (chỉ làm nếu dark mode là yêu cầu đã được duyệt):** gắn `data-aipms-ui-root` và `data-aipms-ui-theme` vào `#root` trong `AppLayout.tsx`, và bổ sung khối dark **đủ cả** `--color-*` (`canvas`, `card`, `hairline`, `ink`, `ink-soft`, `ink-muted`, `line`, `line-strong`, `primary`, `primary-hover`, `primary-subtle`, toàn bộ `status-*`, toàn bộ `tag-*`), kèm đo contrast AA cho từng cặp ở chế độ tối.

**Không được để nguyên trạng nửa vời.** Nếu chọn B, phải hỏi trước vì đó là scope mới.

---

### T12 — Amber: một trong bốn trụ của bộ nhận diện, không có consumer nào

**Chứng cứ:** `--color-accent-amber` (`src/index.css:21`) và `--aipms-ui-accent-amber` (`:73`, `:118`) khai báo 3 lần, **0 lượt sử dụng** trong toàn bộ `src/`. Định vị tại `docs/uiux/UIUX_CHANGE_PLAN.md:4` là `Navy · Teal · Amber · Canvas`.

**Làm:** định nghĩa vai trò nghiệp vụ của Amber là **"cần người dùng hành động"** — khác với *success* (đã xong) và *error* (đã sai). Áp vào đúng các điểm sau, dùng accent viền/nền/dot, **không** dùng `#F6B94C` cho chữ (≈1.9:1 trên trắng — dùng `--color-status-warning-text: #B45309`, đã đo 4.84:1 trên `#FFFBEB`):

| Surface | File | Ý nghĩa cần nhấn |
|---|---|---|
| `CalendarAttentionPage` | `src/features/calendar/calendar-attention.css` | việc cần chú ý khẩn |
| `NextActionBanner` | `src/features/projects/components/NextActionBanner.tsx` | bước kế tiếp phải làm |
| `TaskBoardPage` | `src/features/tasks/pages/task-board.css` | thẻ sắp/đã trễ hạn |
| `ProgressReportsPage` | `src/features/reports/reports.css` | chu kỳ báo cáo đang mở |
| `AssignedGateReviewPage` | `src/features/review-gates/components/AssignedReviewQueue.tsx` | hàng chờ thẩm định |

Trạng thái **không** được biểu đạt bằng màu đơn thuần — mỗi chỗ phải có nhãn chữ hoặc icon kèm (`.claude/rules/ai-pms-ui-ux.md`).

---

### T13 — Token tag chuyên ngành không có consumer; hai component hardcode và lệch nhau

**Chứng cứ:**
- `src/index.css:49-57` (`--color-tag-se/-uiux/-ai/-qa/-is` + `-bg`) có **0 consumer**. Nhánh đổi `--color-tag-qa` → `#087D77/#DDF7F4` nhưng **không có tác dụng hiển thị nào**.
- Tag chuyên ngành thực tế được hardcode ở hai nơi và **không khớp**:
  - `src/components/ui/Badge.tsx:31-33` → QA = `bg-teal-50 text-teal-800`
  - `src/components/ui/MultidisciplinaryTag.tsx:15` → QA = `bg-teal-50 text-teal-700`
  - `src/components/ui/MultidisciplinaryTag.tsx:16` → IS = `emerald-*`, tức **đem xanh brand cũ trở lại làm màu tag**, đụng thẳng primary teal mới.

**Làm:**
1. Cho **cả hai** component đọc `--color-tag-*` qua utility Tailwind v4 (`bg-tag-qa-bg text-tag-qa border-tag-qa/30`), bỏ hết `teal-*`/`emerald-*`/`blue-*`/`purple-*`/`amber-*` hardcode.
2. Đổi `IS` sang họ neutral/slate để không đụng primary: dùng `--color-tag-is` hiện có (`#475569` / `#F1F5F9`).
3. Đo contrast cả 5 tag bằng helper ở T5, assert ≥ 4.5:1. Số đã đo sẵn:

| Tag | fg / bg | Tỉ lệ | Việc cần làm |
|---|---|---|---|
| SE | `#1D4ED8` / `#EFF6FF` | 6.16 | đạt, giữ nguyên |
| UI/UX | `#7E22CE` / `#FAF5FF` | 6.51 | đạt, giữ nguyên |
| AI | `#B45309` / `#FFFBEB` | 4.84 | đạt, giữ nguyên |
| **QA** | `#087D77` / `#DDF7F4` | **4.44** | **không đạt** → đổi `--color-tag-qa` thành `#0A766F` (4.87), giữ nguyên nền |
| IS | `#475569` / `#F1F5F9` | 6.92 | đạt — dùng cặp này cho IS thay `emerald-*` |

Làm đậm foreground, **không** đổi nền.

**Acceptance:** `[QA]` render qua `Badge` và qua `MultidisciplinaryTag` ra **cùng** một màu. `grep -n "emerald" src/components/ui/MultidisciplinaryTag.tsx` rỗng.

---

### T14 — Asset thương hiệu dùng 3 màu ngoài bộ màu

**Chứng cứ:** `src/assets/ai-pms-app-icon.svg`, `src/assets/ai-pms-logo.svg`, `public/favicon.svg` đều dùng:

| Trong asset | Token tương ứng | Lệch |
|---|---|---|
| `#1A7773` (nền tile) | `--color-primary #087D77` / `--color-brand-teal #12B3A8` | teal **thứ ba** |
| `#E4F8F3` (nét chữ P) | `--color-primary-subtle #DDF7F4` | teal nhạt **thứ hai** |
| `#F1C27D` (đường mốc) | `--color-accent-amber #F6B94C` | amber **thứ hai** |
| — | `--color-brand-navy #0F2747` | **không xuất hiện trong logo** |

**Làm:** sửa cả 3 file SVG về đúng 4 màu đã chốt: tile `#0F2747` (Navy — để Navy thực sự có mặt trong mark), nét chữ P `#DDF7F4`, đường mốc + 2 điểm nút `#F6B94C`. Giữ nguyên hình học, `viewBox`, `role`, `aria-label`, `<title>`/`<desc>`.

---

### T15 — Sidebar: vành teal đôi quanh logo + logo bị đọc trùng

**Chứng cứ:** `src/app/layouts/Sidebar.tsx:197-198`. Khung `bg-primary` (`#087D77`) bọc một `<img>` mà bản thân SVG đã vẽ tile `#1A7773` thụt vào `8/256` viewBox → ở `w-8 h-8` với `object-contain` hiện ra vành ~1px màu teal khác quanh mark. Và `alt="AI-PMS"` trong khi `<span>` ngay bên cạnh đã đọc "AI-PMS • FPTU" → screen reader đọc hai lần. `src/features/auth/pages/LoginPage.tsx:58` làm **đúng** (`alt="" aria-hidden="true"`).

**Làm:** bỏ `bg-primary` khỏi div bọc (SVG đã tự có nền sau T14); đổi `alt="AI-PMS"` → `alt="" aria-hidden="true"` cho khớp LoginPage. Giữ `w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-xs`.

---

### T16 — `ai-pms-logo.svg` là asset chết; `TopHeader` chưa được chạm

**Chứng cứ:** `docs/uiux/UIUX_CHANGE_PLAN.md:15,17` yêu cầu đưa logo vào **Header & Sidebar** và nâng cấp `TopHeader` (breadcrumbs, academic context, notification popover). Thực tế: chỉ `Sidebar.tsx` và `LoginPage.tsx` import `ai-pms-app-icon.svg`; `ai-pms-logo.svg` **không được import ở đâu**; `src/app/layouts/TopHeader.tsx` không có trong diff.

**Làm (phần phủ màu, trong phạm vi work order này):** đưa `ai-pms-logo.svg` (logo ngang) vào `TopHeader.tsx` ở vị trí brand, hoặc xóa asset nếu không dùng. Rà `TopHeader.tsx` cho đúng token mới (xem T18).

**Ngoài phạm vi:** phần *tính năng* của `TopHeader` (breadcrumbs mới, academic context, notification popover) là thay đổi IA, **không** thuộc work order phủ màu này. Báo lại, đừng tự làm.

---

### T17 — `design-system/ai-pms/MASTER.md` vẫn ghi palette cũ

**Chứng cứ:** `design-system/ai-pms/MASTER.md:21-24` vẫn ghi `primary #0F5B4E`, `primary-hover #0A493F`, `primary-subtle #EDF3F0`, `ink #14201D`. Chính file này được `src/test/design-tokens.test.ts` khai là hợp đồng mà nó bảo vệ.

**Làm:** cập nhật bảng token sang palette mới; thêm mục Navy / Teal / Amber / Canvas kèm vai trò từng màu; ghi rõ quy tắc *"màu nào được dùng cho chữ, màu nào chỉ dùng cho nền/viền/dot"* kèm **tỉ lệ contrast đã đo** cho từng cặp; ghi quy ước mới ở T6 (không dùng fallback hex trong `var()`).

---

## 4. GIAI ĐOẠN B — PHỦ KÍN (chỉ bắt đầu khi T1–T17 đã PASS)

### Nguyên tắc chung cho cả giai đoạn B

Không đổi màu theo cảm tính. Dùng đúng bảng ánh xạ này cho mọi file:

| Ý nghĩa nghiệp vụ | Token |
|---|---|
| Đã duyệt / Hoàn thành / Đạt | `status-success-*` |
| Cần hành động / Sắp hạn / Chờ duyệt | `status-warning-*` + Amber (T12) |
| Từ chối / Quá hạn / Thất bại | `status-error-*` (sau T3) |
| Ngữ cảnh / Đang diễn ra / Đã đóng băng | `primary` / `primary-subtle` |
| `PENDING` / Chưa có dữ liệu / Read-only | `neutral` + `ink-muted` — **không** dùng màu success, **không** hiển thị thành `0` |
| Tag chuyên ngành | `--color-tag-*` (sau T13) |

**Mỗi lô = một commit riêng.** Sau mỗi lô chạy đủ bộ lệnh ở Phần 2.

---

### T18 — 11 file CSS chưa được chạm, còn ~172 màu trần

> Lưu ý quan trọng: `Card.tsx`, `Table.tsx`, `Modal.tsx`, `FilterChips.tsx`, `Pagination.tsx` **đã** dùng token semantic (`bg-card`, `border-hairline`, `border-line`, `text-ink-muted`) nên đã tự thừa hưởng palette mới — **không cần sửa**, chỉ cần xác nhận lại. Việc còn thiếu nằm ở các file CSS dưới đây và ở `Badge.tsx`/`MultidisciplinaryTag.tsx` (đã xử lý ở T13).

| Màu trần | File | Route / Workspace | Ưu tiên |
|---|---|---|---|
| 21 | `src/features/supervisors/pages/lecturer-workspace.css` | `/supervisor/workspace` — `#105b50`×5 (dòng 8, 10), `#08473d`×2 (dòng 9, 11): **chính là primary xanh cũ** | **P0 — làm đầu tiên** |
| 19 | `src/components/ui/interaction-polish.css` | `.workspace-launchpad`/`.workspace-spotlight` **dùng chung nhiều workspace** — `#0f5b4e70` (dòng 6), `rgb(15 91 78 / …)` dòng 13/17/19/28, `#dce8df`, `#a2cbb5`, `#deefcf`, `#bce2cf` | **P0** |
| 59 | `src/features/users/pages/admin-workspace.css` | `/admin/access` — `#05603a`, `#166534`, `#e8f5e9`, `rgb(20 55 36 / 3%)`, `#dce5e1`, `#e7ede9` (họ xanh cũ) + `#d8dee8`/`#e4e8ef` (gần nhưng không bằng `--color-hairline`) | **P0** |
| 9 | `src/features/evaluations/pages/evaluator-detail.css` | `/evaluator/assignments/:assignmentId` | **P0** |
| 22 | `src/features/projects/pages/project-lifecycle-page.css` | `/projects/lifecycle` — 3 hairline gần giống nhau `#dce4ed`/`#dbe3ec`/`#d7e0ea` → gộp về `--color-hairline` | P1 |
| 7 | `src/components/ui/page-loading.css` | mọi route (skeleton toàn cục) | P1 |
| 4 | `src/components/ui/segmented-control.css` | dùng chung | P1 |
| 3 | `src/components/ui/list-loading.css` | dùng chung | P1 |
| 4 | `src/features/onboarding/onboarding.css` | tour onboarding | P2 |
| 1 | `src/features/student-collaboration/collaboration.css` | workspace sinh viên | P2 |
| 24 | `src/ui-review/effects-showcase.css` | nội bộ review, **không ship** | P3 — làm cuối hoặc bỏ qua, nói rõ lựa chọn |

`lecturer-workspace.css` là lỗ hổng nhìn thấy rõ nhất: `/supervisor/workspace` là trang chủ của giảng viên (P0) và vẫn đang xanh `#105b50` trong khi sidebar, header và mọi mặt khác đã sang teal.

**Acceptance:** `npm test src/test/design-tokens.test.ts` PASS với regex T5. 0 màu trần ngoài `src/index.css`.

---

### T19 — 46 file TSX còn 334 class ngoài palette

**Chứng cứ:** 194 `emerald-*`, 116 `blue-*`, 17 `purple-*`, 7 `teal-*`. Không file nào trong số này nằm trong diff. Đây là tầng **trạng thái ngữ nghĩa** nên ảnh hưởng trực tiếp tới cách người dùng đọc trạng thái học vụ.

**Lô 1 — Review Gates (P0, 94 class):**
`review-gates/components/StudentReviewTimeline.tsx` 30 · `AssignedReviewQueue.tsx` 23 · `InterdisciplinaryGatePanel.tsx` 15 · `DefenseReadinessChecker.tsx` 12 · `ProjectProgressMatrix.tsx` 10 · `pages/ReviewGateGovernancePage.tsx` 8 · `SupervisorGateFollowupPanel.tsx` 6 · `ReviewGateBuilder.tsx` 6 · `ReviewSubmissionModal.tsx` 3
→ Phải giữ phân biệt **Câu hỏi (Questions)** vs **Yêu cầu chỉnh sửa (Corrective Actions)** — không gộp màu.

**Lô 2 — Tiến độ & Gantt (P0, 30 class):**
`progress/components/GanttChart.tsx` 20 · `GanttHeader.tsx` 10

**Lô 3 — Dashboard & điều hướng hành động (P0, 48 class):**
`projects/components/NextActionBanner.tsx` 16 · `department/pages/DepartmentWorkspacePage.tsx` 14 · `dashboard/components/StudentJourneyHero.tsx` 13 · `MilestoneTimeline.tsx` 13 · `AiPreview.tsx` 6 · `ContributionPreview.tsx` 5 · `mentors/pages/MentorWorkspacePage.tsx` 6 · `projects/pages/ActiveProjectWorkspacePage.tsx` 4 · `supervisors/pages/LecturerWorkspacePage.tsx` 4 · `evaluations/pages/EvaluatorWorkspacePage.tsx` 2 · `dashboard/pages/SupervisorDashboardPage.tsx` 1
→ `AiPreview.tsx`: khuyến nghị AI phải **phân biệt rõ** với quyết định chính thức của giảng viên. Không dùng màu success cho output AI.

**Lô 4 — Nhóm, đề tài, đăng ký (P1, 44 class):**
`teams/components/TeamEligibilitySummary.tsx` 8 · `EligibilityBanner.tsx` 8 · `TeamInvitationsPanel.tsx` 5 · `TransferLeaderModal.tsx` 3 · `CreateTeamModal.tsx` 3 · `projects/components/TopicCatalogueDrawer.tsx` 8 · `ProjectDossierCard.tsx` 6 · `ApprovalTimelineCard.tsx` 4 · `ProjectModeSelector.tsx` 3 · `projects/pages/TopicCataloguePage.tsx` 5 · `ProjectReviewStatusPage.tsx` 1 · `ProjectRegistrationFormPage.tsx` 1 · `teams/pages/TeamManagementPage.tsx` 2

**Lô 5 — Nộp cuối, đánh giá, còn lại (P1, 20 class):**
`final-submission/FinalSubmissionPage.tsx` 10 · `evaluations/EvaluationSchemeManagementPage.tsx` 3 · `supervisors/pages/SupervisorProfilePage.tsx` 3 · `files/ProjectFilesPage.tsx` 3 · `tasks/components/TaskEvidenceAndComments.tsx` 1 · `app/pages/NotFoundPage.tsx` 1 · `auth/components/ProtectedRoute.tsx` 1 · `app/context/AcademicWorkflowGate.tsx` 1
→ `EvaluationSchemeManagementPage.tsx`: giữ nguyên phân biệt `DRAFT` / `PROPOSED` / `FROZEN` / `PUBLISHED`. `PROPOSED` phải tiếp tục là *warning*, không được nhìn giống `PUBLISHED` (xem comment trong `src/components/ui/status-badge-tone.ts`).

**Acceptance cho mỗi lô:**
```bash
grep -rnoE '\b(bg|text|border|ring|from|to|via)-(emerald|green|teal|cyan|lime|purple|violet|indigo|blue|sky|pink)-[0-9]{2,3}\b' <các file của lô>
```
trả về rỗng, và đủ bộ lệnh Phần 2 pass.

---

### T20 — Audit chốt

1. **Contrast:** chạy test ở T5. Thêm cặp nào còn thiếu.
2. **Responsive:** 390 / 768 / 1280 / 1440px. Không clip CTA, không overflow ngang, không ô bảng mất action trên mobile.
3. **Keyboard-only:** Tab / Shift+Tab / Esc. Focus trap trong modal, trả focus khi đóng, `focus-visible` thấy rõ trên mọi control đã sửa.
4. **Zoom 200%** và **chuỗi tiếng Việt dài** (tên đề tài liên ngành, tên giảng viên đầy đủ).
5. **`prefers-reduced-motion`:** xác nhận `src/motion/motion.css:45` vẫn còn tác dụng sau T11.
6. Theo thêm `docs/uiux/04-AUDIT-ACCEPTANCE.md`.

---

## 5. COMMIT & BÁO CÁO

**Commit:** một commit cho mỗi task T1–T17, một commit cho mỗi lô của T18/T19. Message dạng `fix(uiux): …` / `refactor(uiux): …`, mô tả **tác động**, không mô tả màu. Không squash. Không push, không mở PR khi chưa được yêu cầu.

**Báo cáo lại cho tôi** theo đúng khung sau, không thêm lời khen, không "xong hết rồi":

1. Task nào DONE, task nào SKIPPED (kèm lý do), task nào BLOCKED (kèm câu hỏi cụ thể).
2. **Output thật** của `npm run typecheck`, `npm run lint`, `npm test` ở lần chạy cuối — dán số, không viết "pass".
3. Output FAIL của `design-tokens.test.ts` ở bước T5 (bằng chứng test thật sự có canh) và output PASS sau T6.
4. Số đo contrast trước/sau cho T2, T3, T13.
5. Quyết định bạn tự chọn ở T1 (CDN vs @fontsource) và T11 (hướng A vs B), kèm lý do.
6. Bất cứ chỗ nào bạn **nghi** mình đã chạm vào bất biến ở Phần 1 — nói ra, kể cả khi không chắc.

Phân loại mọi kết luận: `VERIFIED` (đã đọc source / đã chạy) · `INFERRED` (suy ra) · `UNVERIFIED` (chưa kiểm). **Không** được viết "đã kiểm tra trên app" nếu chưa thực sự mở app — xem lại cảnh báo về dev server ở Phần 2.
