# FE — YÊU CẦU SỬA ĐỢT 2 (sau review `0e46c53`)

**Dự án:** AI-PMS · **Người nhận:** FE Developer
**Ngày:** 2026-10-22
**Commit được review:** `0e46c53` *fix(calendar): restore batch 1 sources and focused attention*
**Nhánh:** `feat/uiux-master-redesign`
**Tài liệu trước:** `docs/review-gates/FE_FIX_BATCH1_REVIEW_2026-10-22.md`

---

## LỜI NHẮN GỬI FE DEV

> Chào bạn, mình đã review `0e46c53` và verify **từng fix một** chứ không chỉ đọc báo cáo.
>
> **FIX-01…FIX-07: ĐẠT CẢ 7. Đóng lại, không cần đụng tới nữa.** Vài chỗ bạn làm chính xác hơn mức mình yêu cầu:
> - FIX-01: chỉ lấy `milestoneDeadlines`, **không** lấy lại `taskDeadlines` — đúng cảnh báo chống nhân đôi.
> - FIX-02: fallback chỉ chạy khi `!scopedCalendarReady` → không tái tạo waterfall mà FE-04 đã loại bỏ.
> - FIX-03: thêm `actionKeys` dedupe — mình **không** yêu cầu, nhưng cần thật cho trường hợp 2 bộ môn trả cùng một mục.
> - FIX-06: `FROZEN_GATE_WEIGHTS` trong switch **khớp đúng giá trị BE thật** (`ReviewGateService.cs:520`) — bạn đã tra source BE chứ không đoán.
> - Test viết thực chất: phủ fallback, cô lập lỗi từng nguồn, không query khi thiếu project, giữ cả 2 disclosure, gộp đa bộ môn.
>
> Mình cũng đã kiểm và **loại 3 nghi ngờ** để bạn khỏi mất công: không có loop vô hạn (`authorization` đã bọc `useMemo`); `getFinalChecklist` không có tham số `signal` nên không phải bạn quên; việc bỏ row `meetings`/`deliverables` ở nhánh happy path là **đúng** yêu cầu mình viết.
>
> **Còn 2 việc**, đều nhỏ, sửa chung một lượt được. Cả hai đều cùng một bản chất: **UI khẳng định điều mà dữ liệu không bảo đảm**.
>
> Cảm ơn bạn.

---

## BẢNG VIỆC

| ID | Việc | Mức | File |
|---|---|---|---|
| **FIX-08** | `attentionKnown` khẳng định con số khi nguồn đã lỗi | 🔴 P1 | `CalendarAttentionPage.tsx:57` |
| **FIX-09** | Nhãn nguồn in id bộ môn thô thay vì tên | 🟡 P2 | `calendar-data.ts:118` + `workspace-access.ts` |

---

## FIX-08 — `attentionKnown` khẳng định con số khi nguồn đã lỗi (P1)

**Chỗ sửa:** `src/features/calendar/CalendarAttentionPage.tsx:57`

**Nguyên văn hiện tại:**
```ts
const attentionKnown = (data?.attention.length ?? 0) > 0 || (data?.sources.some(source =>
  (['next-actions', 'triage-queue', 'accounts'].includes(source.id) || source.id.startsWith('urgent-actions-'))
  && (source.state === 'ready' || source.state === 'empty')) ?? false)
```

**Vấn đề:** mệnh đề đầu `(data?.attention.length ?? 0) > 0` **short-circuit** toàn bộ phần kiểm tra trạng thái nguồn. Chỉ cần có **một** mục attention bất kỳ là `attentionKnown = true`, kể cả khi nguồn chính đã lỗi.

**Kịch bản hỏng cụ thể:** sinh viên có **3 task quá hạn** và **1 mốc quá hạn**.
1. `getStudentNextActions` lỗi (500 / mất mạng) → nguồn `next-actions` ở state `error`, **không có** item TASK nào.
2. `getStudentDashboard` thành công → `result.attention` có đúng **1** mục `MILESTONE_OVERDUE`.
3. `attention.length > 0` → `attentionKnown = true`.
4. Badge hiện **"1"**, `aria-label` đọc **"1 điểm cần chú ý"**.

→ Sinh viên được thông báo **có đúng 1 việc cần chú ý**, trong khi thực tế **3 task quá hạn đang bị giấu**. Trước commit này, `attentionKnown` bắt buộc có nguồn `ready`/`empty` nên badge hiện `—` và aria-label đọc "Chưa xác định số việc cần làm" — **đúng hơn**. Lỗi chỉ xuất hiện ở panel nguồn riêng, người dùng không bắt buộc phải nhìn tới.

**Cách sửa:** `known` phải nghĩa là **mọi nguồn đóng góp vào attention đều đọc thành công**, không phải "có ít nhất một mục".

Lưu ý `student-dashboard` **cũng** đóng góp attention (mốc quá hạn) nên phải tính vào danh sách nguồn:

```ts
const isAttentionSource = (id: string) =>
  ['next-actions', 'triage-queue', 'accounts', 'student-dashboard'].includes(id) || id.startsWith('urgent-actions-')

const attentionSources = data?.sources.filter(source => isAttentionSource(source.id)) ?? []
const attentionKnown = attentionSources.length > 0
  && attentionSources.every(source => source.state === 'ready' || source.state === 'empty')
```

**Quan trọng — vẫn phải hiện dữ liệu đã có:**
- **Không ẩn** danh sách attention khi `attentionKnown === false`. Mục nào đã đọc được thì vẫn hiển thị.
- Badge hiện `—` (như cũ).
- Thêm **một dòng cảnh báo rõ ràng** ngay trong panel, ví dụ: *"Một số nguồn chưa tải được; danh sách có thể chưa đầy đủ."* kèm nút tải lại. Không được để người dùng phải tự suy ra từ panel nguồn.

⚠️ Đừng sửa bằng cách bỏ luôn mục mốc quá hạn ra khỏi attention — đó là dữ liệu thật và FIX-01 vừa khôi phục nó.

**Acceptance:**
- [ ] Aggregator lỗi + dashboard OK (có mốc quá hạn) → badge `—`, có dòng cảnh báo chưa đầy đủ, **mục mốc vẫn hiện**.
- [ ] Dashboard lỗi + aggregator OK → badge `—` (mốc đang thiếu), các mục HIGH vẫn hiện.
- [ ] Cả hai OK → badge hiện đúng số, **không** có dòng cảnh báo.
- [ ] Cả hai OK và không có mục nào → badge `0`, empty state "Không có việc cần làm."
- [ ] Bộ môn: một `urgent-actions-{id}` lỗi trong khi cái kia OK → badge `—` kèm cảnh báo.

---

## FIX-09 — Nhãn nguồn in id bộ môn thô (P2)

**Chỗ sửa:** `src/features/calendar/calendar-data.ts:118`

**Nguyên văn hiện tại:**
```ts
await Promise.allSettled(departmentIds.map(id =>
  loadActions(`urgent-actions-${id}`, `Việc cần xử lý · Bộ môn ${id}`,
    () => apis.getDepartmentUrgentActions(id, input.signal))))
```

**Vấn đề:** nhãn hiển thị **id thô của CSDL**. Staff thuộc bộ môn id 3 thấy *"Việc cần xử lý · Bộ môn 3"* thay vì *"Công nghệ thông tin"*. Với FIX-05 giờ render **một dòng cho mỗi bộ môn**, staff thuộc 2 bộ môn thấy *"Bộ môn 3"* và *"Bộ môn 7"* — **không biết dòng nào là bộ môn nào**, nên khi một dòng báo lỗi họ cũng không biết mất dữ liệu của bộ môn nào.

Đây đúng loại lỗi đã ghi cho BE là **BE-05** (`hybridScopes` trả major id, UI hiện "Chuyên ngành 12"). Lần này dữ liệu **đã có sẵn ở FE**, không phải chờ BE.

**Tên bộ môn lấy ở đâu:** `AcademicContextSnapshot.departments` là `readonly AcademicReferenceDto[]`, mà `AcademicReferenceDto = { id: number; code: string; name: string; isActive: boolean }` (`src/types/backend/workflow.backend.types.ts:20`). Tên **đã có**, chỉ là `workspace-access.ts` hiện mới expose `departmentIds: readonly number[]`.

**Cách sửa (chọn 1):**

**Cách A — khuyến nghị.** Expose thêm `departments: readonly { id: number; name: string }[]` qua `workspace-access.ts` (lấy từ `academic.academic?.departments`), truyền vào `CalendarLoaderInput`, và dùng:
```ts
const label = departments.find(d => d.id === id)?.name ?? `Bộ môn ${id}`
loadActions(`urgent-actions-${id}`, `Việc cần xử lý · ${label}`, ...)
```
⚠️ Khi thêm field vào object của `workspace-access`, nhớ **giữ nguyên `useMemo`** và thêm dep tương ứng — mảng mới tạo mỗi render sẽ làm `refresh` đổi identity và gây vòng lặp tải lại ở `CalendarAttentionPage`. Hiện `authorization` đang được memo hoá đúng, đừng phá.

**Cách B — tối thiểu.** Nếu chưa muốn đổi `workspace-access`: khi chỉ có **1** bộ môn thì dùng nhãn chung *"Việc cần xử lý của bộ môn"* (bỏ id); khi có nhiều bộ môn vẫn phải có tên — tức vẫn cần Cách A. **Cách B chỉ hợp lệ nếu hệ thống chốt là mỗi staff luôn thuộc đúng 1 bộ môn** — hỏi leader trước khi chọn.

Giữ nguyên `id` của source (`urgent-actions-${id}`) để `attentionKnown` và logic lọc không vỡ — **chỉ đổi phần `label`**.

**Acceptance:**
- [ ] Staff 1 bộ môn → hiện tên bộ môn, không còn số.
- [ ] Staff 2 bộ môn → 2 dòng, mỗi dòng đúng tên; một bộ môn lỗi thì thông báo nêu rõ **tên** bộ môn đó.
- [ ] Không tra được tên → fallback `Bộ môn ${id}` (không crash).
- [ ] `source.id` giữ nguyên định dạng `urgent-actions-{id}`; test của FIX-05 vẫn xanh.
- [ ] Không phát sinh vòng lặp tải lại: `CalendarAttentionPage` chỉ gọi `loadCalendarAttention` **một lần** mỗi lần đổi điều kiện thật (thêm test hoặc đếm số lần gọi mock).

---

## ĐIỀU KIỆN HOÀN THÀNH

- [ ] FIX-08, FIX-09 xong, mỗi việc có test như nêu trên.
- [ ] **Không sửa lại** FIX-01…FIX-07 — đã verify đạt, đóng lại.
- [ ] **Không ẩn dữ liệu** để làm cho trạng thái "sạch": thiếu thì nói thiếu, đã đọc được thì vẫn hiện.
- [ ] `typecheck` + `lint` sạch; toàn bộ unit test xanh (**không nới assertion**).
- [ ] Build production sạch.
- [ ] Nêu rõ trong báo cáo: việc nào **verify trên staging**, việc nào **chỉ có bằng chứng unit test**.
- [ ] Không commit/push khi leader chưa đồng ý.
