# FE — ĐỢT 1: VIỆC LÀM ĐƯỢC NGAY (KHÔNG CHỜ BE)

**Dự án:** AI-PMS · **Người nhận:** FE Developer (React + TypeScript)
**Ngày:** 2026-10-22 · **Nhánh:** `feat/uiux-master-redesign`
**Baseline BE:** `origin/develop` @ `cfed325` — **đã deploy lên staging** (`https://api-staging.khaidz.com`)

---

## LỜI NHẮN GỬI FE DEV

> Chào bạn, file này là **toàn bộ việc FE đợt 1** — 9 việc, tất cả đều **không phụ thuộc BE**, làm được ngay hôm nay. Những việc còn chờ BE đã **bị loại khỏi file này có chủ ý** (xem mục "KHÔNG LÀM TRONG ĐỢT NÀY" ở cuối) — đừng làm sớm rồi phải sửa lại.
>
> **Tin tốt:** mình đã kiểm tra staging — bản BE mới **đã deploy**, nên các field/endpoint mà đợt này cần (`weight`, `academicProgress`, `disciplineProgress`, 3 endpoint aggregator) **đã có thật trên staging**, test được ngay, không phải chờ.
>
> **Bắt đầu từ FE-08 rồi FE-01.** FE-08 (đồng bộ nhánh) làm trước để tránh xung đột về sau. FE-01 là nút thắt: BE đã tính xong tiến độ học vụ, nhưng vì FE **không gửi `weight`** nên giá trị đó **luôn `null`** — cả tính năng không ai thấy được.
>
> **4 nguyên tắc không được vi phạm:**
> 1. **Không sửa code BE.** Thiếu gì từ BE thì ghi lại và báo, không tự vá ở FE.
> 2. **Fail-closed, không bịa số.** `null` ≠ `0`. Thiếu dữ liệu thì hiện đúng là "chưa có dữ liệu".
> 3. **Không biến đề xuất thành quy chế.** Không hard-block nút nộp bài dựa trên điều kiện chưa được Hội đồng duyệt.
> 4. **Không tự đổi contract API/DTO.** Lệch thì báo, không suy diễn.
>
> ⚠️ **An toàn dữ liệu staging:** staging là **DB dùng chung**. **Không** tạo/publish template Review Gates ở cấp kỳ học, **không** chạy migration/seed, **không** thực hiện mutation nghiệp vụ lên dự án không phải của mình — có thể ảnh hưởng dự án thật của người khác. Chi tiết ở FE-01.
>
> Chỗ nào chưa rõ thì hỏi, **đừng tự quyết nghiệp vụ học vụ**. Cảm ơn bạn.

---

## BẢNG VIỆC ĐỢT 1

| ID | Việc | Mức | Verify được trên staging? |
|---|---|---|---|
| **FE-08** | Đồng bộ nhánh lên develop mới nhất | 🔴 P1 | — (git) |
| **FE-01** | Gửi `weight` khi lưu template | 🔴 P0 | Một phần (xem DoD) |
| **FE-02** | Hiển thị tiến độ học vụ, tách khỏi tiến độ task | 🔴 P1 | Một phần (nhánh `null` verify được ngay) |
| **FE-05** | Chặn mock rò rỉ production | 🔴 P1 | ✅ (test) |
| **FE-03** | Nối lịch cho giảng viên | 🔴 P1 | ✅ |
| **FE-04** | Adapter 3 endpoint aggregator | 🟡 P2 | ✅ |
| **FE-07** | Sửa 12 test stale | 🟡 P2 | ✅ (test) |
| **FE-06** | Dọn code chết + literal thời mock | 🟡 P2 | ✅ |
| **FE-14** | Responsive + a11y các màn hình làm được | 🟡 P2 | ✅ |

---

## FE-08 — Đồng bộ nhánh (làm đầu tiên)

`feat/uiux-master-redesign` đang 25 commit chưa merge, develop đã chạy tiếp. Rebase/merge develop mới nhất vào nhánh, giải xung đột, chạy lại full suite.

⚠️ **Bẫy đã từng xảy ra ở repo này:** `git fetch` rồi kiểm tra `git log origin/develop..develop --oneline` **trước khi** branch/merge. Repo này từng có commit local chưa push, làm bẩn diff của PR. **Đừng tin** `--ff-only` báo "already up to date" — nó vẫn báo vậy khi local develop có commit *thừa* chưa push.

**Xong khi:** nhánh chứa develop mới nhất, typecheck/lint/full test xanh.

---

## FE-01 — Gửi `weight` khi lưu template (P0 — đang chặn cả tính năng)

**Bối cảnh:** BE đã nhận `Weight` trên gate definition (xác nhận có trong schema staging: `ReviewGateDefinitionInput.weight`), đã freeze vào gate instance, đã tính `academicProgress = Σ(weight gate PASSED) / Σ(weight) × 100`. **Nhưng** `toTemplateRequest` của FE không gửi `weight` ⇒ BE lưu toàn bộ `null` ⇒ `academicProgress` **luôn `null`**, `academicProgressSource` luôn `"NOT_CONFIGURED"`.

**Việc cần làm:**
1. Thêm `weight?: number` vào interface `ReviewGate` — `src/features/review-gates/types/review-gates.types.ts` (~dòng 37–51).
2. Thêm ô nhập trọng số cho từng gate trong `src/features/review-gates/components/ReviewGateBuilder.tsx`.
3. Gửi `weight` trong `toTemplateRequest` — `src/features/review-gates/api/review-gates-contract.ts`.
4. **Validate phía FE khớp đúng luật BE** (`ReviewGateService.SaveTemplate`):
   > *Hoặc để trống trọng số của **tất cả** gate, hoặc nhập đủ cho **tất cả**; mỗi giá trị trong khoảng `0–100`; tổng phải **đúng 100**.*

   Nửa vời (một số gate có, số khác trống) → BE trả **`422`** với key `weights`, message: *"Either leave all gate weights unset, or provide non-negative weights totaling 100."*
5. Hiện lỗi `422` ngay tại form, kèm **tổng hiện tại** để người dùng biết còn thiếu/thừa bao nhiêu. **Không được mất dữ liệu đang nhập** khi lỗi.
6. Lưu ý thêm: BE chặn sửa template đã `PUBLISHED` (trả `409`, *"Published templates are immutable; create a new version."*). Form phải xử lý `409` này tử tế — hướng người dùng tạo version mới, không hiện lỗi kỹ thuật thô.

**Xong khi (chia 2 mức — nói rõ với leader khi báo cáo):**
- ✅ **Đợt này:** type + UI nhập + gửi đúng payload + validate khớp luật BE + xử lý `422`/`409`; unit test phủ: tất cả trống (hợp lệ), đủ & tổng 100 (hợp lệ), nửa vời (chặn), tổng ≠ 100 (chặn), giá trị âm/>100 (chặn).
- ⏳ **Chờ BE-06 (dữ liệu staging):** xác nhận end-to-end *"4 gate `20/20/35/25` → 1 gate PASS → timeline hiện đúng 20%"*. Hiện staging **chưa có** template/gate nào cho tài khoản demo (trả `404 ActiveProject`) nên **chưa chứng minh được ca này** — đây **không phải lỗi của bạn**, đừng cố tự tạo dữ liệu trên staging dùng chung (xem cảnh báo an toàn ở đầu file).

---

## FE-02 — Hiển thị tiến độ học vụ, tách khỏi tiến độ task (P1)

BE giờ trả thêm trên `StudentReviewTimelineDto` (**đã xác nhận có trên staging**): `academicProgress` (`number|null`), `academicProgressSource` (`string`), `isDefenseReady` (`bool|null`), `defenseReadinessStatus`, `disciplineProgress[]`, `taskProgress`, `supervisorFeedbacks[]`, và `weight` trên từng gate.

Type FE **đã có sẵn** các field này ở dạng optional — **trừ `weight` trên gate**.

**Việc cần làm:**
1. Thêm `weight?: number` vào interface **`StudentGateInstance`** (hiện **không có**; `weight` hiện chỉ tồn tại trên `DisciplineBranchProgress`).
2. Hiển thị `academicProgress` **tách biệt rõ ràng** với `taskProgress`. Hai số khác nhau về bản chất, **không được gộp hoặc nhầm nhãn**:
   - **Tiến độ học vụ** = cổng đã ĐẠT, do giảng viên/thẩm định viên chốt.
   - **Tiến độ công việc** = task board, nhóm tự quản.
3. Khi `academicProgress === null`: hiện nhãn theo `academicProgressSource`. Với `"NOT_CONFIGURED"` → *"Chưa áp dụng quy chế Cổng thẩm định"*. **Tuyệt đối không hiện `0%`.**
4. Dự án liên ngành: hiện `disciplineProgress[]` theo từng nhánh (COMMON + mỗi ngành) kèm `weight` của nhánh.
5. `isDefenseReady` là **thông tin tư vấn** — hiện cảnh báo và liệt kê điều kiện còn thiếu, **không khóa cứng** nút nộp cuối kỳ (quyết định OD-01 chưa được Hội đồng duyệt).

**Nghiệp vụ phải đúng — kiểm tra kỹ chỗ này:** gate ở trạng thái `IN_REVIEW` (đã nộp, đang chờ chấm) **KHÔNG** làm tăng tiến độ học vụ. Chỉ `PASSED` mới tăng. Đừng hiển thị kiểu "đã nộp = đã hoàn thành cổng".

**Trạng thái gate hợp lệ (đừng thêm giá trị nào khác):** `PLANNED` · `IN_REVIEW` · `PASSED` · `REVISION_REQUIRED` · `LOCKED`. FE dùng union type nên một giá trị lạ sẽ **làm vỡ render**.

**Xong khi:**
- ✅ Nhánh `academicProgress === null` → **verify được ngay trên staging hôm nay** (vì chưa có weight nên staging đang trả đúng `null` + `NOT_CONFIGURED`). Chụp ảnh làm bằng chứng.
- ⏳ Nhánh có số thật: chờ BE-06, cùng lúc với FE-01.

---

## FE-05 — Chặn mock rò rỉ production (P1)

`review-gates-api.ts` có nhánh `if (env.reviewGatesMockEnabled) return reviewGatesMockAdapter...` ở **mọi** hàm. BE đã có contract thật, nên rủi ro hiện tại là: một build production bật cờ sai sẽ phục vụ **dữ liệu giả cho người dùng thật** — đặc biệt nguy hiểm vì mock có cả điểm số và trạng thái cổng.

**Việc cần làm:** đảm bảo `reviewGatesMockEnabled` **không thể bật** trong production build — ví dụ ép `false` khi `import.meta.env.PROD`, hoặc cho build fail nếu cờ bật ở chế độ production. Thêm test cho ràng buộc này. Giữ mock hoạt động bình thường cho môi trường dev.

**Xong khi:** có test chứng minh ở chế độ production thì mock không bao giờ được dùng, dù cờ env được set.

---

## FE-03 — Nối lịch cho giảng viên (P1)

**Vấn đề:** `src/features/calendar/calendar-data.ts:102` đang push cứng nguồn `lecturer-calendar` ở trạng thái `unavailable` với thông báo *"Hệ thống chưa cung cấp projection theo actor và khoảng thời gian."* — **nhận định này đã lạc hậu.**

**Thực tế BE (đã verify):** `GET /api/v1/calendar?from&to&pageSize` **có sẵn và đã deploy**, scope theo actor; `CalendarService` **đã xử lý giảng viên** — PRIMARY thấy toàn dự án, `DISCIPLINE_MENTOR` giới hạn theo ngành được phân công.

**Việc cần làm:** gọi `getScopedCalendar` cho nhánh giảng viên giống cách nhánh sinh viên đang làm (`calendar-data.ts:44`), map qua `scopedCalendarProjection`, **bỏ dòng `unavailable` cứng**. Giữ nguyên xử lý trạng thái `partial` khi `hasMore` hoặc `!complete`.

> **Giữ nguyên nhánh admin** (`calendar-data.ts:121`, *"Lịch tổng hợp chưa hỗ trợ tài khoản quản trị"*) — `CalendarService` thật sự **không có** nhánh ADMIN. Đây là quyết định sản phẩm đang chờ, **không phải việc của bạn**, đừng "sửa" nó.

**Xong khi:** đăng nhập giảng viên → lịch hiện sự kiện thật từ API, không còn báo "unavailable".

---

## FE-04 — Adapter 3 endpoint aggregator (P2)

BE đã ship và **đã deploy lên staging**; FE chưa dùng, hiện vẫn tự gộp dữ liệu bằng nhiều request song song.

| Endpoint | Trả về |
|---|---|
| `GET /api/v1/students/me/next-actions` | `{ asOfUtc, projectId, items[] }` |
| `GET /api/v1/supervisors/me/triage-queue` | `{ asOfUtc, items[] }` |
| `GET /api/v1/departments/{departmentId}/urgent-actions` | `{ asOfUtc, departmentId, items[] }` |

`items[]` là `ActionAggregatorItem`:
```ts
{
  kind: string          // 8 giá trị, xem dưới
  id: number
  projectId: number | null
  title: string
  status: string
  severity: 'HIGH' | 'NORMAL'   // CHỈ 2 giá trị, đừng tự thêm mức khác
  dueAt: string | null
  deepLink: string | null
}
```
- `kind` có đúng **8 giá trị**: `TASK`, `REVIEW_GATE`, `PROGRESS_REPORT`, `PROGRESS_REVIEW`, `MEETING_SIGN_OFF`, `REVIEWER_ASSIGNMENT`, `SUPERVISOR_REQUEST`, `APPEAL`.
- **Không có phân trang/cursor** — trả thẳng một danh sách.

**Việc cần làm:**
1. Viết adapter + type cho 3 endpoint, theo đúng pattern của `review-gates-api.ts` (dùng `httpGet`).
2. Thay phần gộp dữ liệu client-side tương ứng trong `calendar-data.ts`.
3. Map `kind` → nhãn tiếng Việt + icon; `severity` → tone có sẵn trong `BadgeTone` (**không** thêm hệ màu mới). Gặp `kind` lạ: hiện nhãn trung tính, **không crash, không bỏ qua im lặng**.
4. **`deepLink` do server cấp — phải kiểm tra trước khi điều hướng:** chỉ nhận đường dẫn **tương đối nội bộ** (bắt đầu bằng `/`); **từ chối** URL tuyệt đối hoặc khác origin. Điều hướng vẫn phải đi qua kiểm tra quyền của route như bình thường.
5. Hiện `asOfUtc` làm mốc *"dữ liệu tính đến"*.
6. Xử lý danh sách rỗng là **empty state thật** ("không có việc cần làm"), không phải lỗi — staging có thể trả `items: []` khi tài khoản chưa có dữ liệu.

**Xong khi:** 3 widget lấy dữ liệu bằng **một request mỗi loại** thay vì nhiều round-trip; verify trên staging với tài khoản sinh viên và giảng viên.

---

## FE-07 — Sửa 12 test stale (P2)

Sau khi bật các cờ (`VITE_ENABLE_TASK_MAJOR_FILTER`, `VITE_ENABLE_AI_ADVISORY`…), 12 test fail ở `TaskBoardPage.test.tsx`, `routes.config.test.ts`, `AiAdvisoryComponents.test.tsx`.

Đã xác định đây là **fixture cũ, KHÔNG phải lỗi sản phẩm**: DTO thật từ BE **luôn** có `majors: ProjectMajorDto[]`, không bao giờ optional — fixture cũ mô phỏng sai.

**Việc cần làm:** sửa fixture cho khớp DTO thật. **Đừng nới assertion để test xanh.**

---

## FE-06 — Dọn code chết + literal thời mock (P2)

1. **`RequirementScope`** (`review-gates.types.ts:12–18`) còn literal thời mock: `'IT' | 'Marketing' | 'Design'`. BE chỉ nhận `COMMON | MAJOR_SPECIFIC | INDIVIDUAL`, và `toTemplateRequest` cũng đã chỉ cho phép 3 giá trị đó. **Bỏ 3 literal kia khỏi type** và sửa các chỗ dùng.
2. **`EvaluatorFoundationPage` + `LayeredEvaluationFoundation`** (`src/features/evaluations/`): không router nào import → **code chết**. Xóa; nếu bạn thấy còn cần thì đăng ký route và nêu rõ mục đích.
3. **`EvaluatorAssignmentsPage`** (`/evaluator/evaluations`): không có trong `workspace-route-registry.ts` → không tới được từ nav, nghi đã bị `/evaluator/workspace` thay thế. ⚠️ **Hỏi leader xác nhận trước khi xóa** — đây là quyết định về kiến trúc thông tin, không phải dọn dẹp kỹ thuật thuần.

---

## FE-14 — Responsive + a11y (P2, phạm vi đợt 1)

Phủ các màn hình **đã làm được trong đợt này** (template builder, timeline ở trạng thái `null`/empty, lịch giảng viên, 3 widget aggregator):
- Viewport **390 / 768 / 1280 / 1440px**, zoom **200%**.
- Keyboard-only, focus-visible, thứ tự focus hợp lý.
- Contrast **WCAG 2.2 AA** (text ≥ 4.5:1; chữ lớn ≥ 3:1; control ≥ 3:1).
- Chuỗi tiếng Việt dài, tên dài, không tràn ngang, không cắt CTA.
- Trạng thái: loading, empty, filtered-empty, `401`/`403`/`404`/`409`/`422`/`429`/`5xx`, read-only.

*Ghi chú kỹ thuật:* `resize_window` của Claude-in-Chrome **không** đổi được `innerWidth` thật — dùng browser pane có emulation hoặc tự resize cửa sổ Chrome.

---

## KHÔNG LÀM TRONG ĐỢT NÀY (đang chờ BE — loại bỏ có chủ ý)

Đừng làm những việc dưới đây. Code sẽ phải sửa lại khi BE chốt contract.

| Việc | Chờ BE | Vì sao chưa làm được |
|---|---|---|
| Bỏ chặn nộp minh chứng dạng **liên kết ngoài** | BE-02 | Staging **chưa có** `evidence/link`; chưa biết BE đặt tên field là gì |
| Gửi **nhận xét GVHD** tại Review Gate | BE-03 | Staging **chưa có** `supervisor-feedback` endpoint |
| Dùng **tên ngành** cho `hybridScopes` thay bảng cứng `scopeMeta` | BE-05 | Staging **chưa có** `hybridScopeLabels` |
| Verify **lý do chặn** ở ma trận bộ môn | BE-04 | BE đang trả dict rỗng; UI đã có sẵn, chỉ cần verify sau |
| Sửa type **`taskProgress`** (nullable vs cờ `HasTasks`) | BE-10 | Phương án **chưa chốt**; sửa sớm sẽ phải làm lại |
| **Live acceptance** 3 kịch bản P1/P2/P3 | BE-06 | Staging chưa có dữ liệu Review Gates cho tài khoản demo |

Nếu trong lúc làm bạn phát hiện thêm chỗ nào FE bị chặn vì BE thiếu: **ghi lại và báo**, đừng tự vá ở FE.

---

## ĐIỀU KIỆN HOÀN THÀNH ĐỢT 1

- [ ] `typecheck` + `lint` sạch; **toàn bộ** unit test xanh (không nới assertion để qua).
- [ ] Build production sạch.
- [ ] Mỗi màn hình đổi: phủ test các nhánh cho phép / bị chặn / không quyền / loading / empty / lỗi / read-only.
- [ ] Không thêm thư viện UI mới; dùng token + primitive có sẵn (`src/index.css`, `src/components/ui/`).
- [ ] Không có số bịa: `null` hiện đúng là "chưa có dữ liệu", **không bao giờ** thành `0`.
- [ ] Không thêm giá trị enum nào ngoài danh sách đã nêu (gate status, `severity`, `kind`).
- [ ] Nêu rõ trong báo cáo: việc nào **đã verify trên staging**, việc nào **chỉ có bằng chứng unit test** và đang chờ BE-06.
- [ ] Không commit/push khi leader chưa đồng ý.
