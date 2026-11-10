# 05 — Bằng chứng nghiệm thu chuẩn hoá UI/UX (Acceptance Evidence)

- **Kế hoạch thực hiện:** `docs/superpowers/plans/2026-11-06-ui-ux-standardisation.md`
- **Quy chuẩn đối chiếu:** `docs/uiux/08-PRESENTATION-PATTERN-RULES.md` (§16 Checklist nghiệm thu)
- **Nhánh:** `feat/fe-uiux-standardisation-20261106`
- **Ngày nghiệm thu:** 06/11/2026
- **Phạm vi:** 31 task thuộc 9 pha (Pha 0 đến Pha 8).

---

## 1. Tóm tắt kết quả nghiệm thu

| Pha | Nội dung | Số task | Tình trạng | Bằng chứng kiểm thử |
|---|---|---|---|---|
| **Pha 0** | Nền tảng token màu & Primitive dùng chung | Task 0 – 3 | **ĐẠT** | 100% unit tests của `components/ui` pass; token teal `#087D77` được bảo toàn |
| **Pha 1** | Màn hình cấu hình (ConfigModeFrame) | Task 4 – 8 | **ĐẠT** | View/Edit badge, sticky Save/Cancel, blast radius callout trên 5 màn cấu hình |
| **Pha 2** | Hàng đợi và danh sách công việc | Task 9 – 14 | **ĐẠT** | Toolbar 2 hàng, StatTileRow (≤4 ô, ≤1 ô tô đặc), Table band + URL query sync |
| **Pha 3** | Bảng điều khiển phân tích và giám sát | Task 15 – 17 | **ĐẠT** | Department & Supervisor dashboard; 1 tile đặc, ô trống có gạch ngang `—` |
| **Pha 4** | Phê duyệt đề tài, kháng nghị và hội đồng | Task 18 – 22 | **ĐẠT** | ActionVerdict + ChangeDiff + HistoryTimeline; lý do chặn nhìn thấy được |
| **Pha 5** | Kết quả, công bố và nộp lưu chiểu | Task 23 – 26 | **ĐẠT** | Ranh giới 2 bước; `PENDING` render `—`, điểm 0 render `0`; checklist blockers |
| **Pha 6** | Lịch bảo vệ đồ án | Task 27 | **ĐẠT** | Chuẩn hoá mã phòng (`A-201`), phát hiện trùng lịch nội bộ đồ án |
| **Pha 7** | AI, thông báo và nhật ký quản trị | Task 28 | **ĐẠT** | Citation chi tiết, advisory banner, nhóm thông báo Hôm nay/Trước đó, 8 bộ lọc audit |
| **Pha 8** | Nghiệm thu và bàn giao tài liệu | Task 29 – 30 | **ĐẠT** | Lập bằng chứng nghiệm thu §16 và đối chiếu Gap Matrix với BE `fcf470e` |

---

## 2. Đối chiếu chi tiết theo Checklist §16 của Rule 08

### 2.1. Cấu trúc bảng và danh sách dữ liệu (Data Presentation & Tables)
- [x] **Toolbar 2 hàng:** Hàng 1 chứa phạm vi & đúng 1 primary action; hàng 2 chứa bộ lọc, tìm kiếm và nút xuất dữ liệu (`DepartmentWorkspacePage`, `TaskBoardPage`, `EvaluatorWorkspacePage`).
- [x] **Header bảng:** Dùng nền `bg-slate-50/70` (`TableHead band`) với gạch chân hairline; không dùng nền màu đặc gây nặng nề thị giác.
- [x] **Ô danh tính 2 dòng:** Dòng trên hiển thị tên/mã chính (font-semibold, text-ink); dòng dưới hiển thị thông tin phụ/mã định danh (text-ink-muted, text-xs).
- [x] **Cột số và giá trị pending:** Mọi cột số dùng `tabular-nums` và đơn vị đo; các thành phần chưa có điểm (`PENDING`) hiển thị gạch ngang `—` thay vì nhầm thành `0`.
- [x] **Chân bảng:** Đếm số bản ghi bên trái, phân trang hoặc nút xuất file bên phải (`TableFooterRow`).

### 2.2. Dải định danh thực thể (EntityIdentityStrip)
- [x] **Áp dụng đồng bộ:** Mọi trang chi tiết (Project detail, Meeting detail, Gate assignment detail, Defense session, v.v.) đều mở đầu bằng `EntityIdentityStrip` có nút quay lại (back link) và 3–5 chip định danh.
- [x] **Thông tin định danh:** Mang đủ các thuộc tính cốt lõi: Khoa, Ngành, Đợt/Kỳ, Trạng thái, và Mốc hạn chót kế tiếp.

### 2.3. Khối chỉ số tổng quan (StatTileRow)
- [x] **Số lượng tile:** Tối đa 4 tile trong 1 hàng (`StatTileRow`).
- [x] **Quy tắc nổi bật:** Tối đa đúng 1 tile được tô nền đặc (primary accent) để nhấn mạnh công việc cấp bách nhất (ví dụ: "Cần xử lý gấp" hoặc "Đang chờ duyệt").
- [x] **Phân biệt không có dữ liệu:** Không hiển thị số `0` cho trạng thái chưa tính toán; hiển thị `—` rõ ràng.

### 2.4. Khung chế độ cấu hình (ConfigModeFrame)
- [x] **Mở mặc định ở View mode:** Chống sửa nhầm cấu hình học vụ quan trọng.
- [x] **Badge hiển thị chế độ:** Huy hiệu "Đang xem" (Xanh nhạt/Trung tính) và "Đang chỉnh sửa" (Vàng hổ phách).
- [x] **Cặp nút Lưu / Hủy dính trên:** Luôn nổi ở đầu khung chỉnh sửa để người dùng không phải cuộn tìm nút.
- [x] **Cảnh báo phạm vi ảnh hưởng (Blast Radius):** Nêu rõ số lượng sinh viên, đề tài hoặc đợt đồ án chịu ảnh hưởng nếu thay đổi chính sách.

### 2.5. Bảng phán quyết hành động (ActionVerdict) & So vết thay đổi (ChangeDiff)
- [x] **Khối phán quyết:** Render trạng thái xanh khi đủ điều kiện hoặc đỏ/vàng khi bị chặn. Nút hành động chính (Duyệt/Nộp) bị vô hiệu hóa kèm danh sách lý do trực quan (`blockers`). Nút "Từ chối" luôn sẵn sàng để phản hồi.
- [x] **So vết thay đổi (ChangeDiff):** Hiển thị rõ hai cột `HIỆN TẠI` (mờ) → `ĐỀ XUẤT` (tô điểm khác biệt) cho các lần chỉnh sửa đề tài hoặc yêu cầu đính chính điểm.
- [x] **Dòng thời gian lịch sử (HistoryTimeline):** Ghi nhận ai, lúc nào, hành động gì và lý do cụ thể.

### 2.6. Xử lý 5 trạng thái rỗng / khóa / lỗi (Empty & Guard States)
- [x] **Không có màn hình trống:** 100% các màn hình đều xử lý cụ thể 5 trạng thái thông qua `WorkspaceEmptyState` / `EmptyState`:
  1. *Rỗng thực tế* (Chưa có dữ liệu nào được tạo trong kỳ).
  2. *Rỗng do bộ lọc* (Không có kết quả nào khớp với tiêu chí tìm kiếm kèm nút "Đặt lại").
  3. *Chưa công bố / Khóa mốc* (Mốc thời gian hoặc điểm chưa đến hạn công bố).
  4. *Không đủ quyền truy cập* (Thiếu thẩm quyền kèm hướng dẫn liên hệ).
  5. *Lỗi tải dữ liệu* (Thông báo lỗi thân thiện kèm nút "Thử lại").

### 2.7. Trợ lý AI, Thông báo và Nhật ký bảo mật
- [x] **Nhãn tư vấn AI (Advisory notice):** Mọi panel trợ lý học vụ AI (`AcademicAssistantPanel`, `ProjectAiPage`, `DepartmentProjectRiskPage`) đều có nhãn rõ ràng: "Phản hồi chỉ có giá trị tham khảo/tư vấn, không thay thế quyết định học vụ".
- [x] **Trích dẫn minh chứng (Citations):** Hiển thị tiêu đề văn bản, phiên bản quy định và ngày có hiệu lực.
- [x] **Thông báo theo phong cách FAMS:** Phân nhóm trực quan thành hai khối *Hôm nay* và *Trước đó*, kèm huy hiệu loại thông báo có icon + nhãn tiếng Việt rõ ràng.
- [x] **Nhật ký bảo mật đầy đủ 8 bộ lọc:** Chuyển đổi danh sách `ul` sang bảng `Table` chuẩn hoá, gửi đầy đủ tham số bộ lọc (`action`, `entityType`, `outcome`, `fromUtc`, `toUtc`) đến API quản trị.

---

## 3. Khảo sát Responsive, Phím bấm & Khả năng tiếp cận (A11y)

| Tiêu chí | Viewport / Phương thức | Kết quả kiểm tra | Ghi chú |
|---|---|---|---|
| **Mobile** | 390px (iPhone 13/14) | **PASS** | Bảng hỗ trợ cuộn ngang (`overflow-x-auto`) hoặc xếp chồng (`ai-table--stack`); các nút action co giãn tối thiểu 44px tap target |
| **Tablet** | 768px (iPad Mini) | **PASS** | Toolbar 2 hàng tự động ngắt dòng tự nhiên, các card grid hiển thị dạng 2 cột |
| **Desktop chuẩn** | 1280px / 1440px | **PASS** | Tối ưu độ rộng trang (`max-w-7xl` / `max-w-5xl`), padding cân đối, dải chip hiển thị trọn vẹn |
| **Bàn phím (Keyboard-only)** | Phím Tab / Shift+Tab / Space / Enter | **PASS** | Vòng focus chuẩn (`focus-visible:outline-primary`), không có bẫy focus (keyboard trap) |
| **Độ tương phản (Contrast)** | Màu chữ / nền | **PASS** | Mọi nhãn chữ đạt tỷ lệ tương phản ≥ 4.5:1; trạng thái không chỉ dùng màu sắc mà luôn đi kèm icon và nhãn chữ |
| **Chuỗi tiếng Việt dài** | Tên đề tài, phản biện, lý do | **PASS** | Sử dụng `break-words`, `line-clamp` hợp lý, không làm vỡ khung chứa trên các màn hình hẹp |

---

## 4. Các màn hình có hạn chế khách quan (Không kiểm live trên Staging)

1. **Các module phụ thuộc Feature Flag (`VITE_FEATURE_COLD`, `VITE_FEATURE_PEER`, v.v.):**
   - Khi tắt cờ môi trường, router không dựng route. Khi bật cờ nhưng kỳ học chưa mở dữ liệu, màn hình hiển thị đúng `WorkspaceEmptyState` với thông báo "Module chưa được bật cho kỳ này" hoặc "Chưa có dữ liệu".
2. **Form xếp lịch bảo vệ toàn trường (Task 27):**
   - Chưa dựng lưới phòng × giờ toàn trường vì backend hiện chỉ có endpoint theo từng đồ án (`/projects/{projectId}/defense-sessions`) và thiếu danh mục `Rooms` (`BE-15-02`). Đã thực hiện đầy đủ phần FE có thể làm: chuẩn hóa mã phòng `A-201`, cảnh báo trùng lịch nội bộ đồ án, `EntityIdentityStrip` và `ActionVerdict`.
3. **Cổng Review Gate Override:**
   - Chưa tích hợp vì BE chưa có endpoint ghi đè gate; hiện trạng đã được ghi nhận trong Gap Matrix và chuyển tiếp sang ticket `BE-15-03`.

---

## 5. Kết quả nghiệm thu thực thi Plan v2 (Pha A đến Pha E)

Tiếp nối kế hoạch bổ sung `01_FE_PLAN_V2.md`, toàn bộ các Pha A đến Pha E đã được triển khai, kiểm thử và nghiệm thu đầy đủ:

| Pha | Mã Task | Hạng mục thực hiện | Trạng thái | Bằng chứng mã nguồn & kiểm thử |
|---|---|---|---|---|
| **Pha A** | `FE2-A0` | Sửa 5 lỗi đo được khi nghiệm thu lại (contrast `--color-ink-muted` -> `#626F82`, chân sidebar contrast, skip-link tới `#main-content`, token header bảng `--color-table-header-bg`, đo kiểm 1280px) | **ĐẠT** | Commit `7498db6`, `src/index.css`, `AppLayout.tsx`, `Table.tsx` |
| **Pha A** | `FE2-A1` | Hợp nhất `origin/develop` vào nhánh `feat/fe-uiux-standardisation-20261106` | **ĐẠT** | Commit `fe20336`, clean merge không xung đột |
| **Pha A** | `FE2-A3` | Tạo công cụ tự động quét và kiểm kê route toàn hệ thống (`scripts/route-inventory.mjs`) | **ĐẠT** | Commit `be121db`, sinh `docs/uiux/ROUTE_INVENTORY.generated.md` |
| **Pha A** | `FE2-A4` | Xây dựng hàng rào kiểm thử chống drift giao diện (`presentation-contract.test.tsx`) & PR template | **ĐẠT** | Commit `091e3ee`, chặn hardcode `<table>` tự chế và thiếu empty states |
| **Pha A** | `FE2-A5` | Chuẩn hoá bề mặt chat AI của PR #130 (nhãn advisory, fix lint warnings) | **ĐẠT** | Commit `5289c79`, `ChatThread.tsx`, `ChatThread.test.tsx` (13/13 tests pass) |
| **Pha B** | `FE2-B1` | Phân tích kiến trúc thông tin 10 tab chi tiết đồ án theo Job-To-Be-Done | **ĐẠT** | Artifact `06_PROJECT_DETAIL_IA_ANALYSIS.md` |
| **Pha B** | `FE2-B2` | Tái cấu trúc navigation: 5 tab chính + dropdown "Thao tác khác" (zero wrap ở 1280px / 1440px) | **ĐẠT** | Commit `4d5c2b5`, `DepartmentProjectLayout.tsx`, `DepartmentProjectLayout.test.tsx` |
| **Pha B** | `FE2-B3` | Dọn trùng lặp danh tính trên trang chi tiết đồ án & chuẩn hóa badge trạng thái | **ĐẠT** | Commit `4d5c2b5`, `ProjectReviewPage.tsx`, `TaskDetailPage.tsx` |
| **Pha C** | `FE2-C1` | Quyết định kiến trúc URL-backed modal cho chi tiết công việc | **ĐẠT** | Artifact `07_TASK_DETAIL_MODAL_ADR.md` |
| **Pha C** | `FE2-C2` | Dựng `TaskDetailModal.tsx` mở giữa viewport, giữ nguyên ngữ cảnh Kanban board phía sau | **ĐẠT** | Commit `85385db`, `TaskDetailModal.tsx`, `TaskDetailModal.test.tsx` (3/3 tests pass) |
| **Pha C** | `FE2-C3` | Chuẩn hóa số đếm cột Kanban thành `· {count} trên trang này` tránh ngộ nhận tổng dự án | **ĐẠT** | Commit `85385db`, `TaskBoardPage.tsx`, `TaskBoardPage.test.tsx` |
| **Pha D** | `FE2-D1` | Bảng kiểm kê và đánh giá biểu mẫu toàn hệ thống, xếp hạng 5 form ưu tiên | **ĐẠT** | Commit `8f7e12b`, artifact `08_FORM_AUDIT_AND_PRIORITY_SELECTION.md` |
| **Pha D** | `FE2-D2` | Chuẩn hóa biểu mẫu ưu tiên: label luôn hiện, phân nhóm logic, validation summary có anchor | **ĐẠT** | `ProjectRegistrationFormPage.tsx`, `WorkspaceTaskForm.tsx`, `TopicContentForm.tsx` |
| **Pha D** | `FE2-D3` | Đồng bộ hiển thị mốc thời gian rõ giờ Việt Nam (UTC+7) trên các biểu mẫu | **ĐẠT** | `WorkspaceTaskForm.tsx`, `MeetingScheduleForm.tsx`, `TaskDetailPage.tsx` |
| **Pha D** | `FE2-D4` | Combobox tìm kiếm tức thì cho danh sách dài (người chấm/evaluators khi > 5 người) | **ĐẠT** | Commit `625be24`, `EvaluatorAssignmentManagementPage.tsx`, unit test pass |
| **Pha E** | `FE2-E1` | Trích xuất primitive `DataSourceStatus.tsx` minh bạch nguồn dữ liệu và độ tươi | **ĐẠT** | Commit `8f7e12b`, `9da8497`, `DataSourceStatus.tsx`, `DataSourceStatus.test.tsx` |
| **Pha E** | `FE2-E2` | Chuẩn hóa Stat Tile tại Review Gate Governance: đưa trạng thái về header, đồng bộ nền tile | **ĐẠT** | Commit `8f7e12b`, `ReviewGateGovernancePage.tsx` |
| **Pha E** | `FE2-E3` | Tách toolbar thành 2 hàng chuẩn R2 (Hàng 1 Scope, Hàng 2 View/Filter) & toast tự đóng | **ĐẠT** | Commit `625be24`, `TaskBoardPage.tsx`, `TaskBoardPage.test.tsx` |
| **Pha F** | `FE2-F1..3`| Giữ nguyên ranh giới học thuật, bảo toàn `POLICY_PENDING` / `BLOCKED by BE-16-02` | **ĐẠT** | Không tự ý can thiệp logic bảo vệ offline hay thêm enum ngoài hợp đồng BE |

---

## 6. Kết luận nghiệm thu tổng thể

- **Tình trạng nhánh:** `feat/fe-uiux-standardisation-20261106` sạch sẽ, không có file untracked hay thay đổi chưa commit.
- **Tiến độ test suite:** **305 test files, 2072 test cases PASS 100%** (tăng 14 test files và 90 test cases so với gốc develop `83860c9`, tăng 3 files / 16 tests so với đầu ngày 07/11).
- **Kiểm định chất lượng mã nguồn:**
  - `pnpm run typecheck`: **0 errors** (tsc sạch 100%).
  - `pnpm run lint`: **0 errors**, 227 compiler warnings cố hữu của codebase.
  - `pnpm test src/test/design-tokens.test.ts`: **10/10 tests PASS** (tuân thủ tuyệt đối quy chuẩn màu teal `#087D77`, không du nhập màu cam FAMS, không text < 12px, không opacity modifier trên text token).
  - `pnpm run build`: **Bản build production Vite hoàn tất thành công 100% trong ~1 giây**.
