# AI-PMS — YÊU CẦU PHỦ KÍN BỘ NHẬN DIỆN ACADEMIC COMMAND CENTER

**Ngày lập:** 31/10/2026
**Nhánh được rà soát:** `feat/uiux-academic-command-center` (toàn bộ thay đổi hiện đang **chưa commit**, base `c67f42e`)
**Căn cứ:** `design-system/ai-pms/MASTER.md`, `.claude/rules/ai-pms-ui-ux.md`, `.claude/rules/ai-pms-human-crafted-ui.md`, `docs/uiux/UIUX_CHANGE_PLAN.md`, `docs/uiux/UIUX_ROUTE_INVENTORY.md`
**Phạm vi đã kiểm chứng:** 53 file CSS, 46 file TSX chứa class màu ngoài palette, 10 UI primitive, `index.html`, 2 asset SVG mới, `src/test/design-tokens.test.ts`

> Trạng thái mỗi mục: `[VERIFIED-CODE]` = đã đọc trực tiếp trong source ở nhánh này.

---

## A. ĐÁNH GIÁ TỔNG QUAN

| Tiêu chí | Kết quả |
|---|---|
| `tsc -b` | PASS (0 lỗi) |
| `oxlint` | PASS (chỉ còn warning tồn tại từ trước, không nằm trong file đã sửa) |
| `vitest` (design-tokens, app/layouts, components/ui, cold-reports) | 66/66 PASS |
| Route / API / RBAC / state machine | Không thay đổi — đúng cam kết bất biến |
| Mức phủ bảng màu mới | **≈ 45%** (38/53 file CSS; 5/~250 file TSX) |

Nhánh đã làm đúng phần khó nhất: không chạm vào logic nghiệp vụ, không đổi route, không đổi contract. Vấn đề nằm ở **độ phủ** và ở **4 lỗi làm bộ màu mới không thực sự đến được người dùng**.

---

## B. BẮT BUỘC SỬA TRƯỚC KHI MERGE (BLOCKER)

### B1. Font `Inter` được khai báo nhưng không bao giờ được tải `[VERIFIED-CODE]`
- `src/index.css:5-6` đặt `"Inter"` ở đầu `--font-sans` và vị trí thứ hai của `--font-heading`.
- `index.html:16` chỉ tải `Geist`, `JetBrains Mono`, `Plus Jakarta Sans`. Không có `@font-face`, không có package font trong `package.json`, không có `public/fonts/`.
- **Hệ quả:** trên mọi máy không cài sẵn Inter (toàn bộ Linux, CI, container Playwright, phần lớn Windows) `font-sans` rơi về `Geist` — tức chữ không hề đổi. Nửa phần typography của nhánh không ship.
- **Yêu cầu:** hoặc thêm Inter vào `index.html` (kèm `preconnect`, `display=swap`) / self-host qua `@fontsource/inter`, hoặc bỏ Inter khỏi token và giữ Geist. Phải chọn một, không để treo.
- **Kiểm chứng:** mở app, `getComputedStyle(document.body).fontFamily` và `document.fonts.check('1rem Inter')`.

### B2. Chữ nút `danger` tụt xuống 3.48:1 — không đạt WCAG AA `[VERIFIED-CODE]`
- `src/components/ui/button-styles.ts:19-20` đổi `text-red-700` (#b91c1c, **6.5:1** trên trắng) → `text-danger` (`--color-danger: #E35D6A`, **3.48:1**).
- Đây là control phá hủy (xóa, hủy, thu hồi) — vi phạm trực tiếp `.claude/rules/ai-pms-ui-ux.md` (AA ≥ 4.5:1).
- **Yêu cầu:** thêm token foreground riêng (ví dụ `--color-danger-text: #B42318`, 5.9:1) và dùng nó cho chữ/icon; giữ `#E35D6A` chỉ cho viền, nền nhạt, dot — nơi chỉ cần 3:1.

### B3. Chữ trạng thái lỗi tụt xuống 3.18:1 trên toàn hệ thống `[VERIFIED-CODE]`
- `src/index.css:44` `--color-status-error-text: #E35D6A` trên `--color-status-error-bg: #FEF2F2` = **3.18:1** (trước là #dc2626 → 4.41:1, vốn đã sát ngưỡng).
- Consumer: `src/components/ui/Badge.tsx:28` (`variant="error"`) và `src/components/ui/status-badge-tone.ts:6` (`tone="danger"`) → **mọi** badge *Từ chối / Quá hạn / Thất bại / Thu hồi* ở tất cả route đều fail AA.
- **Yêu cầu:** đặt `--color-status-error-text` ≥ 4.5:1 trên nền `#FEF2F2` (gợi ý `#B42318`). Bổ sung assertion contrast vào `src/test/design-tokens.test.ts`.

### B4. Vùng chạm nút nhỏ hơn mức đã ghi trong design system `[VERIFIED-CODE]`
- `src/components/ui/button-styles.ts:5-7` đặt `sm: min-h-[36px]`, `md: min-h-[40px]`, `lg: min-h-[44px]`.
- `design-system/ai-pms/MASTER.md:54`: *"Primary and icon-only controls require at least 44px targets."* `md` là variant **mặc định**.
- Đồng thời `h-8` + `min-h-[36px]` trên cùng dòng xung đột: `min-height` thắng, nên `h-8`/`h-10` thành mã chết, gây nhầm lẫn khi đọc.
- **Yêu cầu:** `md` và `lg` ≥ 44px; `sm` chỉ dùng cho control phụ trong bảng và phải ghi rõ ngoại lệ 24×24 theo WCAG 2.2; bỏ `h-*` trùng lặp.

---

## C. CHỐT CHẶN CHẤT LƯỢNG ĐANG BỊ VÔ HIỆU

### C1. `design-tokens.test.ts` chỉ còn canh palette đã bỏ `[VERIFIED-CODE]`
- `src/test/design-tokens.test.ts:15` vẫn là `/#(0f5b4e|0a493f|edf3f0|14201d|3d4a46|596863|e5ece8|d7e0dc)/i` — toàn bộ là giá trị **cũ**. Sau nhánh này chúng gần như không còn, nên test PASS một cách rỗng và **không canh gì** cho palette mới.
- **Yêu cầu:** đổi regex sang palette mới (`087d77|06665f|ddf7f4|162033|0f2747|12b3a8|f6b94c|d9e1ec|cbd5e1|64748b|e35d6a`), cho phép ngoại lệ ở `src/index.css`, và bổ sung test contrast cho cặp `status-*-text` / `status-*-bg`.

### C2. `design-system/ai-pms/MASTER.md` vẫn ghi palette cũ `[VERIFIED-CODE]`
- `MASTER.md:21-24` vẫn ghi `primary #0F5B4E`, `primary-hover #0A493F`, `primary-subtle #EDF3F0`, `ink #14201D`. Chính file này được `design-tokens.test.ts` khai là hợp đồng mà nó bảo vệ.
- **Yêu cầu:** cập nhật bảng token, bổ sung mục Navy / Teal / Amber / Canvas, ghi rõ quy tắc "màu nào dùng cho chữ, màu nào chỉ dùng cho nền/viền" kèm tỉ lệ contrast đã đo.

### C3. Nới timeout assertion trong nhánh thuần giao diện `[VERIFIED-CODE]`
- `src/features/cold-reports/ColdChecklistPage.test.tsx:81` thêm `{ timeout: 3000 }` cho assertion `saveColdDraft(..., concurrencyToken)`.
- `UIUX_ROUTE_INVENTORY.md:6` cam kết *"không đổi logic nghiệp vụ"*. Không thay đổi CSS nào ảnh hưởng được tới timing của assertion trong jsdom.
- **Yêu cầu:** revert dòng này. Nếu test thật sự flaky thì mở issue riêng, không che trong nhánh UI.

---

## D. TOKEN CHẾT / HỆ TOKEN SONG SONG

### D1. Amber — một trong bốn trụ của bộ nhận diện — không có consumer nào `[VERIFIED-CODE]`
`--color-accent-amber` (`index.css:21`) và `--aipms-ui-accent-amber` (`index.css:73`, `:118`) được khai báo 3 lần, **sử dụng 0 lần** trong toàn bộ `src/`. Định vị ghi trong `UIUX_CHANGE_PLAN.md:4` là `Navy · Teal · Amber · Canvas`.
**Yêu cầu:** định nghĩa vai trò nghiệp vụ của Amber (gợi ý: *cần hành động của người dùng* — deadline sắp tới, chờ duyệt, chờ nộp minh chứng) và áp vào: `CalendarAttentionPage`, `NextActionBanner`, `TaskBoardPage` (thẻ trễ hạn), `ProgressReportsPage` (chu kỳ đang mở), `AssignedGateReviewPage` (hàng chờ thẩm định). Amber **không** được dùng cho chữ nhỏ trên nền trắng (#F6B94C ≈ 1.9:1).

### D2. Hai hệ token song song, không có quy tắc ưu tiên `[VERIFIED-CODE]`
- `index.css:69-110` thêm 24 token `--aipms-ui-*` trùng giá trị với `--color-*` (`--aipms-ui-border` = `--color-hairline` = `#D9E1EC`; `--aipms-ui-primary-button-bg` = `--color-primary` = `#087D77`; …).
- Toàn bộ 24 token này chỉ có **9 lượt tham chiếu trong 4 file** (`workspace-page.css` 1, `auth-pages.css` 3, `login-design.css` 4, `notifications.css` 1).
- `UIUX_CHANGE_PLAN.md:13` nói nhập từ `standards/aipms-ui-tokens.css` — **file này không tồn tại** trong repo; token đã bị gõ tay vào `index.css`.
- Vi phạm `.claude/rules/ai-pms-ui-ux.md`: *"Reuse a single token system"*.
- **Yêu cầu:** chọn một hệ. Khuyến nghị giữ `--color-*` (đã có ~250 file dùng, có Tailwind utility) và xóa `--aipms-ui-*`, trừ các token **không** trùng (`radius-*`, `space-*`, `shadow-*`, `motion-*`, `ease`) thì gộp vào `@theme` dưới tên nhất quán. Cập nhật `UIUX_CHANGE_PLAN.md` cho khớp sự thật.

### D3. Dark theme và khối reduced-motion là mã chết, và dark theme đang hỏng `[VERIFIED-CODE]`
- `index.css:114-132` định nghĩa `[data-aipms-ui-theme="dark"]`; `index.css:134-141` định nghĩa reduced-motion trong `[data-aipms-ui-root]`.
- `data-aipms-ui-theme` và `data-aipms-ui-root` **không được set ở bất kỳ đâu** — không có trong `index.html`, `main.tsx`, `AppLayout.tsx` hay bất kỳ TSX nào.
- Nguy hiểm hơn: khối dark chỉ override `--aipms-ui-*`, **không** override `--color-canvas` / `--color-card` / `--color-ink` / `--color-hairline` — tức nếu sau này bật dark mode sẽ ra UI nửa sáng nửa tối.
- Reduced-motion thật sự đang được xử lý ở `src/motion/motion.css:45`, nên khối mới không gây regression, chỉ là mã chết gây hiểu sai.
- **Yêu cầu:** hoặc xóa cả hai khối, hoặc gắn `data-aipms-ui-root` vào `#root`/`AppLayout` và hoàn thiện dark theme đủ cả `--color-*`. Không để nửa vời.

### D4. Token tag chuyên ngành không có consumer; hai component tự hardcode và lệch nhau `[VERIFIED-CODE]`
- `index.css:49-57` (`--color-tag-se/-uiux/-ai/-qa/-is` + `-bg`) có **0 consumer**. Nhánh đổi `--color-tag-qa` → `#087D77 / #DDF7F4` nhưng hoàn toàn **không có tác dụng hiển thị**.
- Thực tế tag chuyên ngành được hardcode ở hai nơi và **không khớp nhau**:
  - `src/components/ui/Badge.tsx:31-33` → QA = `bg-teal-50 text-teal-800`
  - `src/components/ui/MultidisciplinaryTag.tsx:15` → QA = `bg-teal-50 text-teal-700`
  - `MultidisciplinaryTag.tsx:16` → IS = `emerald-*`, tức **đem màu xanh brand cũ trở lại làm màu tag chuyên ngành**, đụng ngay với primary teal mới.
- **Yêu cầu:** cho `Badge` và `MultidisciplinaryTag` cùng đọc `--color-tag-*`; định lại màu IS sang họa neutral/slate; đo contrast cả 5 tag.

---

## E. LỖI PHỦ MÀU TRONG CHÍNH CÁC FILE ĐÃ SỬA

### E1. Gõ lại hairline cũ `#e2e8f0` trên những dòng vừa viết mới `[VERIFIED-CODE]`
6 lượt `#e2e8f0` (giá trị hairline **cũ**) được thêm vào bởi chính diff này, trong khi token đã chuyển sang `#D9E1EC`:

| File:line | Selector |
|---|---|
| `src/features/execution/execution.css:58` | `.ex-loading span` (skeleton) |
| `src/features/execution/execution.css:142` | `.ex-tabs` (dải tab) |
| `src/features/reports/reports.css:71` | `.report-loading div` (skeleton) |
| `src/features/projects/pages/collaboration-workspace.css:93` | `.cw-filters` |
| `src/features/projects/pages/collaboration-workspace.css:140` | `.cw-loading span` |
| `src/features/meetings/meetings.css:141` | `.mtg-loading > div` |
| `src/components/ui/document-preview-modal.css:81,188` | nền + chữ |

**Hệ quả:** skeleton và dải tab đứng trên neutral cũ, viền bên cạnh đã sang neutral mới — lệch rõ khi đặt cạnh nhau.
**Yêu cầu:** thay bằng `var(--color-hairline)`; nếu skeleton cần sắc riêng thì thêm token `--color-skeleton`.

### E2. Màu mới gõ cứng thay vì dùng token `[VERIFIED-CODE]`
Diff thêm **272** lượt hex 6 ký tự vào CSS. Trong đó:
- **132** lượt là fallback `var(--token, #hex)` — không sai cú pháp nhưng là nơi thứ hai chứa palette; token đã có trên `:root` nên fallback chỉ là nợ bảo trì.
- **~140** lượt là hex trần, trong đó trùng đúng giá trị token đã có: `#ddf7f4`×6, `#0f2747`×6, `#087d77`×6, `#64748b`×6, `#12b3a8`×5, `#d9e1ec`×4, `#f6f8fb`×3, `#162033`×3, `#0a766f`×3.
- Và **neutral mới ngoài palette**: `#fafbfc`×3, `#dbe3ec`×3, `#c7f0ec`×3, `#edf0f2`×2, `#f5f7f6`, `#f4f8f6` — tức sinh thêm 6 sắc xám/teal không nằm trong thang màu nào.
- `MASTER.md:48` ghi rõ: *"Do not repeat raw palette hex values in workspace components or page CSS."*

**Yêu cầu:** thay toàn bộ hex trần trùng token bằng `var(--color-*)`; hợp nhất 6 neutral mới vào thang `canvas / card / hairline / line / line-strong`; bỏ fallback hex trong `var()` (hoặc thống nhất giữ, nhưng phải ghi quy ước vào `MASTER.md`).

### E3. Asset thương hiệu dùng 3 màu không có trong bộ màu `[VERIFIED-CODE]`
`src/assets/ai-pms-app-icon.svg`, `src/assets/ai-pms-logo.svg`, `public/favicon.svg` đều dùng:

| Trong asset | Token tương ứng | Lệch |
|---|---|---|
| `#1A7773` (nền tile) | `--color-primary #087D77` / `--color-brand-teal #12B3A8` | teal **thứ ba** |
| `#E4F8F3` (nét chữ P) | `--color-primary-subtle #DDF7F4` | teal nhạt **thứ hai** |
| `#F1C27D` (đường mốc) | `--color-accent-amber #F6B94C` | amber **thứ hai** |
| — | `--color-brand-navy #0F2747` | **không xuất hiện trong logo** |

**Yêu cầu:** vẽ lại asset đúng 4 màu đã chốt; đưa Navy vào mark (nền hoặc chữ) để logo thực sự đại diện bộ nhận diện.

### E4. Sidebar: viền teal đôi + logo bị đọc trùng `[VERIFIED-CODE]`
`src/app/layouts/Sidebar.tsx:197-198`
- Khung `bg-primary` (#087D77) bọc một `<img>` mà bản thân SVG đã vẽ tile `#1A7773` thụt vào `8/256` → ở kích thước 32px hiện ra vành ~1px màu teal khác quanh logo.
- `alt="AI-PMS"` trong khi `<span>` ngay bên cạnh đã đọc "AI-PMS • FPTU" → screen reader đọc hai lần. `LoginPage.tsx:58` làm đúng (`alt="" aria-hidden="true"`).

**Yêu cầu:** bỏ `bg-primary` ở khung bọc (SVG đã tự có nền), đổi `alt=""` + `aria-hidden="true"` cho khớp LoginPage.

### E5. `ai-pms-logo.svg` không được import ở đâu; `TopHeader` chưa được chạm `[VERIFIED-CODE]`
`UIUX_CHANGE_PLAN.md:15,17` yêu cầu đưa logo vào **Header & Sidebar** và nâng cấp `TopHeader` (breadcrumbs, academic context, notification popover). Thực tế: chỉ `Sidebar.tsx` và `LoginPage.tsx` import `ai-pms-app-icon.svg`; `ai-pms-logo.svg` là asset chết; `src/app/layouts/TopHeader.tsx` không có trong diff.
**Yêu cầu:** đưa logo ngang vào `TopHeader` (hoặc xóa asset), và thực hiện phần `TopHeader` của Batch 1.

### E6. `index.html` còn gim canvas và ink cũ `[VERIFIED-CODE]`
`index.html:2` và `:24` vẫn là `bg-[#F8FAFC]` (canvas **cũ**, canvas mới là `#F6F8FB`) và `text-slate-900` (`#0f172a`, trong khi `--color-ink` là `#162033`).
Hiện tại chưa vỡ hình vì `src/index.css` không nằm trong `@layer` nên thắng `@layer utilities` của Tailwind — nhưng đây là bẫy: chỉ cần ai đó bọc CSS vào `@layer` là canvas toàn app quay về màu cũ. Màu chữ `body` thì đang thực sự lấy `#0f172a` chứ không phải `--color-ink`.
**Yêu cầu:** xóa `bg-[#F8FAFC]` và `text-slate-900` khỏi `index.html`, để `:root`/`body` trong `index.css` làm nguồn duy nhất.

---

## F. ĐỘ PHỦ CÒN THIẾU — DANH SÁCH THI CÔNG

### F1. UI Primitive: 9/10 mục của Batch 1 chưa được mở `[VERIFIED-CODE]`
`UIUX_CHANGE_PLAN.md:16` liệt kê `Button, Input, Select, Card, Badge, StatusBadge, Table, Modal, FilterChips, Pagination`. Thực tế chỉ `button-styles.ts` được sửa.

| Component | File | Trạng thái |
|---|---|---|
| Button | `src/components/ui/button-styles.ts` | đã sửa (còn lỗi B2, B4) |
| Badge | `src/components/ui/Badge.tsx` | **chưa chạm** — 12 class ngoài palette |
| StatusBadge | `src/components/ui/StatusBadge.tsx` + `status-badge-tone.ts` | **chưa chạm** |
| Card | `src/components/ui/Card.tsx` | **chưa chạm** |
| Table | `src/components/ui/Table.tsx` | **chưa chạm** |
| Modal | `src/components/ui/Modal.tsx` | **chưa chạm** (chỉ sửa `modal.css`) |
| FilterChips | `src/components/ui/FilterChips.tsx` | **chưa chạm** |
| Pagination | `src/components/ui/Pagination.tsx` | **chưa chạm** (chỉ sửa `pagination.css`) |
| Input / Select | không tồn tại component dùng chung | **cần tạo** — hiện mỗi trang tự viết `inputClass` |

**Yêu cầu:** làm xong primitive **trước** khi đi tiếp các page. Tạo `Input`/`Select` dùng chung để dẹp các `inputClass` lặp theo trang (ví dụ `ProjectFilesPage.tsx`).

### F2. 11 file CSS chưa được chạm, còn ~172 màu trần — gồm cả **xanh brand cũ** `[VERIFIED-CODE]`

| Màu trần | File | Route / Workspace ảnh hưởng | Ưu tiên |
|---|---|---|---|
| 59 | `src/features/users/pages/admin-workspace.css` | `/admin/access` — `#05603a`, `#166534`, `#e8f5e9`, `rgb(20 55 36 / 3%)`, `#dce5e1`, `#e7ede9` (họ xanh cũ) | **P0** |
| 21 | `src/features/supervisors/pages/lecturer-workspace.css` | `/supervisor/workspace` — `#105b50`×5, `#08473d`×2 (**chính là primary xanh cũ**, dòng 8-11) | **P0** |
| 22 | `src/features/projects/pages/project-lifecycle-page.css` | `/projects/lifecycle` — 3 hairline gần giống nhau `#dce4ed`/`#dbe3ec`/`#d7e0ea` | P1 |
| 19 | `src/components/ui/interaction-polish.css` | `.workspace-launchpad` / `.workspace-spotlight` dùng chung — `#0f5b4e70`, `rgb(15 91 78 / …)`×4, `#dce8df`, `#a2cbb5`, `#deefcf`, `#bce2cf` | **P0** (dùng chung nhiều workspace) |
| 9 | `src/features/evaluations/pages/evaluator-detail.css` | `/evaluator/assignments/:id` | **P0** |
| 7 | `src/components/ui/page-loading.css` | mọi route (skeleton toàn cục) | P1 |
| 4 | `src/features/onboarding/onboarding.css` | tour onboarding | P2 |
| 4 | `src/components/ui/segmented-control.css` | dùng chung | P1 |
| 3 | `src/components/ui/list-loading.css` | dùng chung | P1 |
| 1 | `src/features/student-collaboration/collaboration.css` | workspace sinh viên | P2 |
| 24 | `src/ui-review/effects-showcase.css` | nội bộ review, không ship | P3 |

> `lecturer-workspace.css` là lỗ hổng nhìn thấy rõ nhất: `/supervisor/workspace` là trang chủ của giảng viên (P0) và vẫn đang xanh `#105b50` trong khi cả hệ thống đã sang teal.

### F3. 46 file TSX còn 334 class ngoài palette (194 `emerald-*`, 116 `blue-*`, 17 `purple-*`, 7 `teal-*`) `[VERIFIED-CODE]`
Không file nào trong số này nằm trong diff. Đây là tầng **trạng thái ngữ nghĩa** nên ảnh hưởng trực tiếp tới cách người dùng đọc trạng thái học vụ.

**Lô 1 — Review Gates (P0, 94 class):**
`StudentReviewTimeline.tsx` 30 · `AssignedReviewQueue.tsx` 23 · `InterdisciplinaryGatePanel.tsx` 15 · `DefenseReadinessChecker.tsx` 12 · `ProjectProgressMatrix.tsx` 10 · `ReviewGateGovernancePage.tsx` 8 · `SupervisorGateFollowupPanel.tsx` 6 · `ReviewGateBuilder.tsx` 6 · `ReviewSubmissionModal.tsx` 3

**Lô 2 — Primitive & tag dùng chung (P0, 28 class):**
`MultidisciplinaryTag.tsx` 15 · `Badge.tsx` 12 · `TelemetryCard.tsx` 1

**Lô 3 — Tiến độ & Gantt (P0, 30 class):**
`GanttChart.tsx` 20 · `GanttHeader.tsx` 10

**Lô 4 — Dashboard & điều hướng hành động (P0, 48 class):**
`NextActionBanner.tsx` 16 · `DepartmentWorkspacePage.tsx` 14 · `StudentJourneyHero.tsx` 13 · `MilestoneTimeline.tsx` 13 · `AiPreview.tsx` 6 · `ContributionPreview.tsx` 5 · `SupervisorDashboardPage.tsx` 1 · `ActiveProjectWorkspacePage.tsx` 4 · `LecturerWorkspacePage.tsx` 4 · `MentorWorkspacePage.tsx` 6 · `EvaluatorWorkspacePage.tsx` 2

**Lô 5 — Nhóm, đề tài, đăng ký (P1, 44 class):**
`TeamEligibilitySummary.tsx` 8 · `EligibilityBanner.tsx` 8 · `TopicCatalogueDrawer.tsx` 8 · `ProjectDossierCard.tsx` 6 · `TeamInvitationsPanel.tsx` 5 · `TopicCataloguePage.tsx` 5 · `ApprovalTimelineCard.tsx` 4 · `TransferLeaderModal.tsx` 3 · `CreateTeamModal.tsx` 3 · `ProjectModeSelector.tsx` 3 · `ProjectReviewStatusPage.tsx` 1 · `ProjectRegistrationFormPage.tsx` 1 · `TeamManagementPage.tsx` 2

**Lô 6 — Nộp cuối, đánh giá, còn lại (P1, 20 class):**
`FinalSubmissionPage.tsx` 10 · `EvaluationSchemeManagementPage.tsx` 3 · `SupervisorProfilePage.tsx` 3 · `ProjectFilesPage.tsx` 3 · `TaskEvidenceAndComments.tsx` 1 · `NotFoundPage.tsx` 1 · `ProtectedRoute.tsx` 1 · `AcademicWorkflowGate.tsx` 1

**Yêu cầu chung cho F3:** không thay màu theo cảm tính. Lập **bảng ánh xạ trạng thái → token** một lần, rồi áp máy móc:

| Ý nghĩa nghiệp vụ | Token |
|---|---|
| Đã duyệt / Hoàn thành / Đạt | `status-success-*` |
| Cần hành động / Sắp hạn / Chờ duyệt | `status-warning-*` + Amber (D1) |
| Từ chối / Quá hạn / Thất bại | `status-error-*` (sau khi sửa B3) |
| Ngữ cảnh / Đang diễn ra / Đã đóng băng | `primary` / `primary-subtle` |
| PENDING / Chưa có dữ liệu / Read-only | `neutral` + `ink-muted` — **không** dùng màu thành công hay 0 |
| Tag chuyên ngành | `--color-tag-*` (sau khi sửa D4) |

Giữ nguyên quy tắc `.claude/rules/ai-pms-ui-ux.md`: trạng thái **không** được biểu đạt bằng màu đơn thuần — phải có nhãn chữ hoặc icon kèm.

---

## G. THỨ TỰ THI CÔNG ĐỀ XUẤT

| Bước | Nội dung | Điều kiện hoàn thành |
|---|---|---|
| 1 | B1–B4 (font Inter, 2 lỗi contrast, touch target) | Đo lại contrast bằng số; `document.fonts.check('1rem Inter')` = true hoặc Inter đã bị loại khỏi token |
| 2 | C1–C3 (siết lại `design-tokens.test.ts`, cập nhật `MASTER.md`, revert timeout) | Test mới **fail** trên nhánh hiện tại trước khi sửa E2 — chứng minh nó thật sự canh |
| 3 | D1–D4 (chốt một hệ token, gắn hoặc xóa dark/reduced-motion, định vai trò Amber, nối `--color-tag-*`) | `grep` ra 0 token không consumer |
| 4 | E1–E6 (hex trần, asset thương hiệu, Sidebar, `index.html`) | `design-tokens.test.ts` ở bước 2 PASS |
| 5 | F1 — hoàn thiện 9 primitive + tạo `Input`/`Select` | Test allowed/disabled/forbidden/loading/empty/error/read-only cho từng primitive |
| 6 | F2 — 11 file CSS, bắt đầu từ `lecturer-workspace.css`, `interaction-polish.css`, `admin-workspace.css`, `evaluator-detail.css` | 0 màu trần ngoài `index.css` |
| 7 | F3 lô 1→6 theo thứ tự P0 trước | Mỗi lô 1 PR; screenshot trước/sau ở 390 / 768 / 1280 / 1440 với **cùng dữ liệu** |
| 8 | Audit a11y cuối: contrast AA, keyboard-only, 200% zoom, `prefers-reduced-motion`, chuỗi tiếng Việt dài | Theo `docs/uiux/04-AUDIT-ACCEPTANCE.md` |

**Bất biến xuyên suốt:** không đổi route, API, DTO, validation, RBAC guard, state machine, lane Kanban, cách tính điểm Rubric, phân biệt scope `COMMON`/`OWN_MAJOR`/`INDIVIDUAL` và stage `ONGOING`/`COLD`/`DEFENSE`. `PENDING` không bao giờ hiển thị thành `0`.
