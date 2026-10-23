# FE — YÊU CẦU SỬA SAU CODE REVIEW BATCH 1

**Dự án:** AI-PMS · **Người nhận:** FE Developer
**Ngày:** 2026-10-22
**Commit được review:** `f6a8fb9` *feat(review-gates): integrate batch 1 with UI redesign and develop*
**Nhánh:** `feat/uiux-master-redesign` · **BE đối chiếu:** `origin/develop` @ `cfed325`
**Tài liệu gốc:** `docs/review-gates/FE_BATCH1_LAM_TRUOC_2026-10-22.md`

---

## LỜI NHẮN GỬI FE DEV

> Chào bạn, mình đã review commit `f6a8fb9`. **Kết luận chung: chất lượng code tốt**, có vài chỗ bạn làm vượt yêu cầu. Danh sách dưới đây là **7 việc sửa**, trong đó 4 việc là cùng một nguyên nhân: FE-04 bị làm **rộng hơn phạm vi**.
>
> **Phần bạn làm tốt — ĐỪNG sửa lại, đừng "tối giản" thêm:**
> - **Validate trọng số bằng BigInt** (`review-gates-contract.ts`) — rất đúng. Nếu cộng bằng float thì ca `33.3 + 33.3 + 33.4` sẽ ra `100.00000000000001` và **lệch với `decimal` của BE** → form báo lỗi sai trong khi BE chấp nhận. Giữ nguyên cách này.
> - **`safeInternalDeepLink`** — vượt yêu cầu mình đặt ra: bạn chặn cả `//host`, backslash, ký tự control, whitespace và kiểm `origin`, không chỉ `startsWith('/')`. Giữ nguyên.
> - **Guard production mock** (`env.ts`) + test chứng minh production gọi transport thật dù cờ bật. Đúng yêu cầu.
> - **Null-handling của FE-02**: không có chỗ nào biến `null` thành `0%`. Đúng nguyên tắc nghiệp vụ.
> - Mình cũng đã verify các fix cũ **không bị merge làm mất**: `REVIEW_QUEUE_BUSY` còn, evidence-scope test còn.
>
> **Nguyên nhân gốc của FIX-01…FIX-04:** yêu cầu FE-04 là *"thay phần gộp dữ liệu client-side"* để bỏ waterfall. Nhưng commit đã **xoá luôn** các nguồn calendar (meetings/deliverables/final-submission), các dòng trạng thái nguồn, và phần fallback. Aggregator của BE **không trả những thứ đó** nên chúng mất hẳn, không có gì thay thế.
>
> **Nguyên tắc sửa:** `attention` dùng aggregator của BE (giữ nguyên, đúng rồi), nhưng `sources` và `calendar` **phục hồi lại**. Ba thứ này độc lập nhau — **không cần revert FE-04**.
>
> Cảm ơn bạn, phần nền làm chắc nên sửa sẽ nhanh.

---

## BẢNG VIỆC SỬA

| ID | Việc | Mức | File |
|---|---|---|---|
| **FIX-01** | Phục hồi cảnh báo **mốc đồ án quá hạn** | 🔴 P1 | `calendar-data.ts` |
| **FIX-02** | Phục hồi **fallback calendar** khi scoped calendar lỗi | 🔴 P1 | `calendar-data.ts` |
| **FIX-03** | Lọc lại danh sách "cần chú ý" | 🔴 P1 | `calendar-data.ts` / `action-aggregators.ts` |
| **FIX-04** | Phục hồi **dòng trạng thái nguồn** + 2 disclosure gap | 🔴 P1 | `calendar-data.ts` |
| **FIX-05** | Xử lý staff thuộc **nhiều bộ môn** | 🟡 P2 | `CalendarAttentionPage.tsx` |
| **FIX-06** | Không in enum thô cho người dùng | 🟡 P2 | `StudentReviewTimeline.tsx` |
| **FIX-07** | Cỡ chữ ô KPI khi chưa cấu hình trọng số | 🟡 P2 | `StudentReviewTimeline.tsx` |

---

## FIX-01 — Phục hồi cảnh báo mốc đồ án quá hạn (P1)

**Chỗ sửa:** `src/features/calendar/calendar-data.ts:45`

**Vấn đề:** helper `studentAttention()` bị xoá, trong đó có mục `MILESTONE_OVERDUE` (`presentationPriority: 15`) dựng từ `dashboard.milestoneDeadlines`. Aggregator thay thế **không có kind `MILESTONE`** — `ActionAggregatorService.StudentNextActions` chỉ phát `TASK`, `PROGRESS_REPORT`, `REVIEW_GATE`. Mình đã đọc source BE để xác nhận, không suy đoán.

**Hậu quả:** sinh viên có mốc đồ án quá hạn 2 tuần, trước đây thấy cảnh báo ưu tiên cao *"Mốc đồ án đã quá hạn"*; giờ **không thấy gì về mốc**.

**Cách sửa:** gọi lại `getStudentDashboard` **song song** với aggregator, nhưng **chỉ lấy phần mốc**:
```ts
// chỉ milestoneDeadlines — KHÔNG lấy lại taskDeadlines,
// vì aggregator của BE đã trả kind TASK, lấy nữa sẽ trùng.
...dashboard.milestoneDeadlines
  .filter(m => m.isOverdue)
  .map(m => ({ code: 'MILESTONE_OVERDUE', source: 'MILESTONE' as const, sourceId: m.id,
    title: m.title, description: 'Mốc đồ án đã quá hạn theo dữ liệu dashboard.',
    dueAt: m.dueDate, status: m.status, presentationPriority: 15,
    deepLink: `/project/milestones/${m.id}` }))
```
⚠️ **Đừng lấy lại `taskDeadlines`** — sẽ trùng với kind `TASK` của aggregator, sinh ra 2 dòng cho cùng một task.

**Xong khi:** sinh viên có mốc quá hạn thấy đúng 1 cảnh báo mốc; task quá hạn vẫn chỉ hiện 1 dòng (không nhân đôi). Có test cho cả hai điều kiện.

**Ghi lại cho BE:** nếu muốn bỏ hẳn phụ thuộc dashboard, BE cần thêm kind `MILESTONE` vào aggregator. Ghi vào `BE_HANDOFF` làm việc mới, **đừng tự chờ**.

---

## FIX-02 — Phục hồi fallback calendar (P1)

**Chỗ sửa:** `src/features/calendar/calendar-data.ts:43`

**Vấn đề:** trước đây khi `getScopedCalendar` lỗi, loader dựng lại `result.calendar` từ `taskDeadlines`/`milestoneDeadlines` + `getMeetings` + `getDeliverables` + `getFinalChecklist` (mỗi nhánh đều có guard `if (scopedCalendar.status !== 'fulfilled')`). Các call đó đã bị xoá; khối `catch` hiện **chỉ push `errorStatus(...)`**.

**Hậu quả:** `GET /api/v1/calendar` trả 500 hoặc timeout → lịch **trống hoàn toàn**, dù meetings/deliverables/final-submission vẫn gọi được bình thường. Một endpoint chết làm mất sạch nội dung lịch.

**Cách sửa:** phục hồi nhánh fallback: khi scoped calendar **thất bại**, gọi `getMeetings` / `getDeliverables` / `getFinalChecklist` và map qua `meetingProjection` / `deliverableProjection` / `finalSubmissionProjection` (các hàm này **vẫn còn** trong `calendar-projections.ts`, chưa bị xoá). Giữ guard để **không gọi khi scoped calendar thành công** — tránh waterfall mà FE-04 muốn loại bỏ.

**Xong khi:** có test mô phỏng `getScopedCalendar` reject → lịch vẫn hiện sự kiện họp/hạng mục/bàn giao, và nguồn `*-calendar` ở trạng thái `error`.

---

## FIX-03 — Lọc lại danh sách "cần chú ý" (P1)

**Chỗ sửa:** `src/features/calendar/calendar-data.ts:23` (`loadActions`)

**Vấn đề:** `studentAttention()` cũ **lọc** chỉ `isOverdue || status === 'BLOCKED'`. Aggregator BE trả **tối đa 20 task bất kỳ** chưa `DONE`/`CANCELLED` + **mọi gate** chưa `PASSED`, và `loadActions` đẩy **toàn bộ** `data.items.map(aggregatorAttention)` vào `attention`. `severity` chỉ ảnh hưởng tone và `presentationPriority` (10 vs 20), **không ảnh hưởng việc có hiện hay không**.

**Hậu quả:** sinh viên có 20 task đang mở đúng tiến độ + 4 gate chưa đạt → **~24 dòng** trong "việc cần chú ý", trong khi trước đây danh sách **trống**. Việc quá hạn thật bị chôn giữa đống việc bình thường.

**Cách sửa — tận dụng đúng thứ BE đã tính sẵn:** BE gán `severity` theo công thức:
- `TASK`: `t.DueAt < now ? "HIGH" : "NORMAL"` → **HIGH = quá hạn**
- `REVIEW_GATE`: `g.Status == "BLOCKED" ? "HIGH" : "NORMAL"` → **HIGH = bị chặn**

Tức `severity === 'HIGH'` **tái lập gần đúng bộ lọc cũ** (quá hạn + bị chặn). Vậy:
1. `attention` chỉ nhận item `severity === 'HIGH'`.
2. Item `NORMAL` **không bỏ đi** — hiện ở khu vực riêng ("Việc đang mở", có thể thu gọn), hoặc không đưa vào panel "cần chú ý".

⚠️ **Không được lọc bằng cách bỏ im lặng.** Nếu đã lọc thì phải cho người dùng biết còn bao nhiêu mục khác (ví dụ *"còn 12 việc đang mở"*) — đúng nguyên tắc phân biệt "không có" với "bị ẩn".

**Xong khi:** tài khoản có task đúng tiến độ → panel "cần chú ý" không hiện chúng; task quá hạn/gate BLOCKED → hiện. Có test cho cả hai.

---

## FIX-04 — Phục hồi dòng trạng thái nguồn + 2 disclosure gap (P1)

**Chỗ sửa:** `src/features/calendar/calendar-data.ts:31` trở xuống

**Vấn đề:** 8 dòng `sources` đã bị xoá: `student-dashboard`, `meetings`, `deliverables`, `final-submission`, `progress-report-deadline`, `supervisor-dashboard`, `evaluation-assignments`, `department-dashboard`.

**Hai dòng trong đó là disclosure về gap của BE, và gap đó VẪN CHƯA ĐƯỢC SỬA:**
- `progress-report-deadline` → `state: 'unsupported'`, *"API hiện trả kỳ báo cáo, không trả hạn nộp báo cáo."*
- `evaluation-assignments` → `state: 'unsupported'`, *"DTO hiện không có hạn đánh giá; không tạo sự kiện lịch."*

Mình đã kiểm BE `cfed325`: `ProgressReportDto` vẫn chỉ có `PeriodStart`/`PeriodEnd` (không có hạn nộp), `EvaluationAssignmentDto` vẫn chỉ có `AssignedAt`/`RevokedAt` (không có `DueAt`). Đây là **BE-08/BE-09 chưa làm**.

**Hậu quả:** lịch **vẫn thiếu** hạn báo cáo và hạn đánh giá, nhưng giờ **không nói cho người dùng biết nữa** → giảng viên có deadline đánh giá thật, không thấy sự kiện nào và **kết luận là không có deadline**. Bằng chứng kỹ thuật cho thấy kênh disclosure đã chết: `calendar-types.ts:35` vẫn khai `CalendarSourceState = ... | 'unsupported'` nhưng **không còn dòng code nào phát ra giá trị này**.

**Cách sửa:**
1. Phục hồi các dòng `sources` cho từng nguồn thật sự được đọc (gồm cả nguồn khôi phục ở FIX-02).
2. **Bắt buộc giữ lại 2 disclosure `unsupported`** cho tới khi BE-08/BE-09 xong. Khi BE xong thì mới đổi thành nguồn thật.
3. Nguồn nào không còn đọc nữa thì **bỏ hẳn dòng của nó**, đừng để dòng mô tả sai thực tế.

**Xong khi:** panel nguồn phản ánh đúng những gì đã/chưa đưa vào lịch; `'unsupported'` lại có nơi phát ra; có test khẳng định 2 disclosure tồn tại.

---

## FIX-05 — Staff thuộc nhiều bộ môn (P2)

**Chỗ sửa:** `src/features/calendar/CalendarAttentionPage.tsx:34`

**Vấn đề:**
```ts
const departmentId = access.departmentIds?.length === 1 ? access.departmentIds[0] : null
```
Khi `departmentIds` có ≥2 phần tử → `null`. `calendar-data.ts:51` chỉ gọi `getDepartmentUrgentActions` khi `departmentId != null && ... > 0`, ngược lại push `unavailable` và trả **danh sách attention rỗng**. Bản cũ gọi `getPortfolioDashboard('department', ...)` — **không cần** departmentId.

**Hậu quả:** staff phụ trách 2 bộ môn (ví dụ IT + BA) trước đây thấy các mục `PROJECT_PROGRESS_FEEDBACK_PENDING` của cả hai; giờ chỉ thấy *"Chưa xác định được bộ môn từ phiên đăng nhập"* và **không có mục nào**.

**Cách sửa:** gọi `getDepartmentUrgentActions` **cho từng** `departmentId` trong `access.departmentIds` rồi gộp kết quả (dùng `Promise.allSettled`, bộ môn nào lỗi thì push `errorStatus` riêng cho bộ môn đó). Nếu quyết định không gộp thì phải cho người dùng **chọn bộ môn**, không được trả rỗng im lặng.

**Xong khi:** test với `departmentIds = [1, 2]` → có mục của cả hai bộ môn; với `[]` → vẫn hiện `unavailable` kèm lý do rõ ràng.

---

## FIX-06 — Không in enum thô cho người dùng (P2)

**Chỗ sửa:** `src/features/review-gates/components/StudentReviewTimeline.tsx:146`

```tsx
{timeline.academicProgressSource ? `Nguồn: ${timeline.academicProgressSource}` : '...'}
```
In thẳng hằng số backend. BE mặc định field này là `"NOT_CONFIGURED"`, và vì FE chưa gửi trọng số nên **đó là giá trị staging trả về cho mọi đồ án hiện nay** → **mọi sinh viên đang thấy dòng "Nguồn: NOT_CONFIGURED"**. Ô giá trị ngay bên trên đã map enum này sang tiếng Việt, nên hai dòng **tự mâu thuẫn về văn phong**.

**Cách sửa:** map enum sang nhãn tiếng Việt (ít nhất `NOT_CONFIGURED`, `INSUFFICIENT_DATA`, và nhánh đã cấu hình). Gặp giá trị lạ → hiện câu trung tính, **không in mã**, không crash.

**Xong khi:** không còn mã enum nào lộ ra UI; có test cho giá trị lạ.

---

## FIX-07 — Cỡ chữ ô KPI khi chưa cấu hình trọng số (P2)

**Chỗ sửa:** `src/features/review-gates/components/StudentReviewTimeline.tsx:134`

Khi `academicProgress` là `null`, span render *"Chưa áp dụng quy chế Cổng thẩm định"* (34 ký tự) ở `text-2xl font-black`, trong ô `lg:grid-cols-4` rộng ~300px — wrap 3 dòng trong khi các ô KPI bên cạnh chỉ 1 dòng, làm hàng KPI lệch và đẩy caption `({completedGatesCount}/{totalGatesCount} Cổng đạt)` mất căn.

Đây là **trạng thái mặc định trên staging hiện tại** (chưa có trọng số), không phải ca biên hiếm.

**Cách sửa:** nhánh có số giữ `text-2xl`; nhánh text dùng cỡ nhỏ hơn (ví dụ `text-sm`/`text-base`) và cho các ô KPI chiều cao nhất quán.

**Xong khi:** kiểm ở 390 / 768 / 1280 / 1440px với `academicProgress = null`, hàng KPI không lệch, không tràn, không cắt chữ. Kèm ảnh chụp.

---

## THÔNG TIN THÊM (không phải lỗi của bạn, nhưng cần biết)

Khi review mình kiểm tra xem merge có **ghi đè** công việc cũ không. Kết quả:

- ✅ **Không mất gì ở Review Gates.** `REVIEW_QUEUE_BUSY` handling (`AssignedGateReviewPage.tsx:34`) còn nguyên; test evidence-scope còn; `scopedCalendarProjection` đổi signature nhưng có default param nên caller không vỡ.
- ℹ️ `ProjectRegistrationFormPage`, `ProjectReviewStatusPage`, `TeamManagementPage` hiện **không** dùng `InlineAlert`/`WorkspacePage`. Mình đã kiểm net diff: **không có dòng nào bị xoá** → chúng đã vắng **từ trước** commit của bạn. Công việc Batch 2 (PR #88) nằm ở nhánh khác và **chưa từng được merge vào nhánh này**. Đây là việc leader cần quyết, **không phải việc bạn phải sửa**.

---

## ĐIỀU KIỆN HOÀN THÀNH

- [ ] FIX-01…FIX-07 xong, mỗi việc có test tương ứng như nêu trên.
- [ ] **Không revert** FE-04: `attention` vẫn dùng aggregator của BE (1 request/loại), **không** quay lại gộp client-side cho phần attention.
- [ ] **Không sửa lại** 4 phần đã làm đúng nêu ở lời nhắn (BigInt weights, `safeInternalDeepLink`, env guard, null-handling).
- [ ] `typecheck` + `lint` sạch; toàn bộ unit test xanh (**không nới assertion** để qua).
- [ ] Build production sạch.
- [ ] Không có số bịa: `null` hiện đúng là "chưa có dữ liệu", không bao giờ thành `0`.
- [ ] Nêu rõ trong báo cáo: việc nào **đã verify trên staging**, việc nào **chỉ có bằng chứng unit test**.
- [ ] Ghi lại đề nghị BE thêm kind `MILESTONE` (từ FIX-01) để leader đưa vào `BE_HANDOFF`.
- [ ] Không commit/push khi leader chưa đồng ý.
