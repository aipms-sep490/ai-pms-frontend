# Báo Cáo Kiểm Thử Giao Diện & Hướng Dẫn Sửa Lỗi Cho Codex (UI DevTools Audit Feedback)

> **Mục tiêu**: Báo cáo tổng hợp toàn bộ các lỗi hiển thị (Visual), logic trạng thái (State), bố cục responsive (1024px & 1440px), và chuẩn trợ năng (A11y) được phát hiện trong phiên kiểm thử tự động bằng **ChromeDevTools MCP** trên bản build thực tế (`pnpm preview` tại `http://localhost:4173/`).
>
> **Tài liệu tham chiếu cho Codex**: Thực hiện chỉnh sửa mã nguồn dựa trên danh sách các issue dưới đây, sau đó kiểm tra lại bằng toàn bộ quality gates (`pnpm lint`, `pnpm test`, `pnpm build`).

---

## Tóm Tắt Mức Độ Ưu Tiên

| Mã Issue | Vấn đề | File bị ảnh hưởng | Mức độ |
|:---|:---|:---|:---:|
| **ISSUE-01** | Lỗi hiển thị chuỗi `"Nhóm undefined đang kiện toàn nhân sự"` | `src/features/dashboard/components/StudentJourneyHero.tsx` | 🔴 Cao |
| **ISSUE-02** | Trục thời gian Gantt 15 tuần bị cắt cụt từ T5 đến T15 tại 1024px & Cảnh báo CPM bị `truncate` | `src/features/progress/components/GanttChart.tsx`<br>`src/features/progress/components/GanttHeader.tsx` | 🔴 Cao |
| **ISSUE-03** | Dải nút bộ lọc trên Kanban bị tràn và che khuất nút `[QA]` tại 1024px & Assignee name bị cắt sớm | `src/features/milestones/pages/MilestoneDetailPage.tsx`<br>`src/features/milestones/components/KanbanCard.tsx` | 🟡 Trung bình |
| **ISSUE-04** | Trang `/topics` hiển thị raw `"Bad Gateway"` không có nút retry và báo sai kết quả tìm kiếm rỗng | `src/features/projects/pages/TopicCataloguePage.tsx` | 🟡 Trung bình |
| **ISSUE-05** | Form Sửa đề tài `/project/edit` hiển thị sai tiêu đề tạo mới và nút nộp sơ bộ | `src/features/projects/pages/ProjectRegistrationFormPage.tsx` | 🟡 Trung bình |
| **ISSUE-06** | Mâu thuẫn thông tin giữa AppLayout (`Nhóm SE28`) và nội dung trang (`Chưa có nhóm`), Overview trống 80% khi chưa Active | `src/app/layouts/Sidebar.tsx`<br>`src/app/layouts/TopHeader.tsx`<br>`src/app/pages/OverviewPage.tsx` | 🟡 Trung bình |
| **ISSUE-07** | Thiếu `<label htmlFor="...">`, `id` và `name` trên các trường form gây lỗi DevTools A11y | `src/features/projects/pages/ProjectRegistrationFormPage.tsx`<br>`src/features/projects/pages/TopicCataloguePage.tsx`<br>`src/features/milestones/pages/MilestoneDetailPage.tsx`<br>`src/features/progress/pages/GanttPage.tsx` | 🟢 Thấp |

---

## Chi Tiết Từng Lỗi & Hướng Dẫn Sửa Dành Cho Codex

### ISSUE-01: Lỗi hiển thị chuỗi `"Nhóm undefined đang kiện toàn nhân sự"`
- **Vị trí**: `src/features/dashboard/components/StudentJourneyHero.tsx` (dòng 28, 41, 79, 92)
- **Triệu chứng**:
  - Tại `/project/workspace`, tiêu đề banner hiển thị:
    > `Nhóm undefined đang kiện toàn nhân sự`
- **Nguyên nhân kỹ thuật**:
  - Tại dòng 28:
    ```tsx
    title: `Nhóm ${team?.name ?? team?.code} đang kiện toàn nhân sự`
    ```
  - Khi đối tượng `team` tồn tại nhưng cả hai trường `name` và `code` đều là `undefined` hoặc chuỗi rỗng, biểu thức `team?.name ?? team?.code` trả về `undefined`, và template string chuyển thành chuỗi ký tự `"undefined"`.
  - Tương tự tại dòng 41 (`team?.name ?? team?.code`) và dòng 79 (`team?.name ?? ''`).
- **Hướng dẫn sửa cho Codex**:
  - Viết helper fallback an toàn:
    ```tsx
    const teamDisplayName = team?.name || team?.code || 'của bạn'
    ```
  - Sử dụng `teamDisplayName` trong tất cả các chuỗi template:
    - Case `TEAM_FORMING`: `title: \`Nhóm ${teamDisplayName} đang kiện toàn nhân sự\``
    - Case `TEAM_ELIGIBLE`: `desc: \`Nhóm ${teamDisplayName} đã đạt chuẩn nhân sự (4-5 thành viên đơn ngành)...\``
    - Case `SUPERVISOR_PENDING`: `desc: \`Chúc mừng nhóm ${teamDisplayName}! Đề tài đã thông qua...\``

---

### ISSUE-02: Biểu đồ Gantt bị cắt cụt trục thời gian từ T5 đến T15 tại 1024px & Cảnh báo CPM bị `truncate`
- **Vị trí**:
  - `src/features/progress/components/GanttChart.tsx` (dòng 50–75)
  - `src/features/progress/components/GanttHeader.tsx` (dòng 125–135)
  - `src/features/progress/pages/GanttPage.tsx` (dòng 87–140)
- **Triệu chứng tại độ phân giải 1024x768**:
  - Bảng Gantt chỉ hiển thị được các cột `T1 (W01)` đến `T4 (W04)`. Toàn bộ từ tuần **T5** đến **T15** (bao gồm cả tuần hiện tại **T6**) bị tràn và biến mất khỏi mép phải màn hình.
  - Cột WBS bên trái cố định độ rộng quá lớn: `w-[520px]`. Trên màn hình 1024px (sau khi trừ Sidebar 240px và Padding 48px, vùng nội dung chỉ còn ~736px), phần còn lại cho 15 tuần chỉ còn ~216px!
  - Banner cảnh báo CPM màu vàng bị cắt cụt chữ bằng dấu ba chấm do có class `truncate`:
    > `Cảnh báo đường găng: Nhiệm vụ SEP-108 đang chậm 2 ngày trên chuỗi SEP-105 → SEP-108 → SEP-112, có nguy cơ l...`
- **Hướng dẫn sửa cho Codex**:
  1. **Trong `GanttChart.tsx`**:
     - Điều chỉnh độ rộng của cột dính bên trái (Sticky Left Column) theo responsive:
       Thay vì cố định `w-[520px]`, dùng: `w-[320px] lg:w-[460px] xl:w-[520px]`.
     - Cột tên WBS: Cho phép co giãn với `min-w-[180px] lg:min-w-[240px]` và thu nhỏ font text/padding ở màn hình nhỏ hơn 1280px.
     - Đảm bảo container `overflow-x-auto` có style trực quan (như hiển thị thanh cuộn nhẹ nhàng hoặc hint gradient để người dùng biết có thể cuộn ngang).
  2. **Trong `GanttHeader.tsx`**:
     - Bỏ class `truncate` tại thẻ bọc nội dung cảnh báo (dòng 129), thay bằng `text-xs leading-relaxed break-words` để câu cảnh báo tự động xuống dòng đầy đủ.
  3. **Trong `GanttPage.tsx`**:
     - Thêm `flex-wrap` vào thanh công cụ tìm kiếm và nút toggle đường găng để không bị tràn ở 1024px.

---

### ISSUE-03: Dải nút bộ lọc trên Kanban bị tràn che khuất nút `[QA]` & Assignee name bị cắt sớm
- **Vị trí**:
  - `src/features/milestones/pages/MilestoneDetailPage.tsx` (dòng 71–120)
  - `src/features/milestones/components/KanbanCard.tsx` (dòng 41–56)
- **Triệu chứng tại độ phân giải 1024x768**:
  - Hàng nút lọc chuyên ngành và ô tìm kiếm xếp cùng 1 hàng. Ô tìm kiếm có `min-w-[240px]`, đẩy hàng nút lọc sang trái làm nút `[QA] QA` bị lọt ra ngoài mép màn hình và bị che khuất.
  - Trên thẻ `KanbanCard`, tên người phụ trách bị cắt cụt quá ngắn (ví dụ: `"Hoàng Q..."`, `"Nguyễn..."`) dù khoảng trống vẫn còn.
- **Hướng dẫn sửa cho Codex**:
  1. **Trong `MilestoneDetailPage.tsx`**:
     - Điều chỉnh thanh công cụ bộ lọc:
       ```tsx
       <div className="p-3.5 rounded-xl bg-white border border-hairline shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
         <div className="flex items-center gap-1.5 flex-wrap">
           {/* Các nút lọc chuyên ngành tự động wrap xuống dòng nếu hẹp */}
         </div>
         <div className="relative w-full lg:w-72">
           {/* Ô tìm kiếm chiếm full width trên màn hình nhỏ và cố định 288px trên desktop lớn */}
         </div>
       </div>
       ```
  2. **Trong `KanbanCard.tsx`**:
     - Tại phần chân thẻ (`Bottom row`): Cho phép `task.assignee` hiển thị linh hoạt hơn, chỉ `truncate` khi thật sự chạm vào khối ngày deadline.

---

### ISSUE-04: Danh mục đề tài `/topics` hiển thị raw `"Bad Gateway"` và thông báo sai lệch
- **Vị trí**: `src/features/projects/pages/TopicCataloguePage.tsx` (dòng 70–74 và 190–205)
- **Triệu chứng**:
  - Khi API trả lỗi 502 Bad Gateway (backend chưa bật), UI hiện một hộp viền đỏ chỉ có dòng chữ:
    > `Bad Gateway`
  - Đồng thời, ngay dưới đó lại hiển thị thông báo:
    > *"Không tìm thấy đề tài phù hợp. Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc ngành."*
- **Hướng dẫn sửa cho Codex**:
  - Tách bạch rõ 3 trạng thái của trang: `isLoading`, `errorMessage`, và `emptyResults` (chỉ hiện khi không có lỗi và kết quả trả về `[]`).
  - Khi có `errorMessage`: Hiển thị một Error Card chuyên nghiệp:
    - Icon cảnh báo (`error` hoặc `cloud_off`).
    - Tiêu đề: `"Không thể tải danh mục đề tài"`.
    - Mô tả thân thiện: `"Máy chủ dịch vụ đề tài hiện không phản hồi (${errorMessage}). Vui lòng kiểm tra lại kết nối hoặc thử lại."`.
    - Nút hành động: `[Thử lại (Retry)]` kích hoạt lại hàm `loadTopics()`.
  - **Không** render thẻ `"Không tìm thấy đề tài phù hợp"` khi đang có lỗi API.

---

### ISSUE-05: Form Sửa đề tài `/project/edit` hiển thị sai tiêu đề và nút nộp
- **Vị trí**: `src/features/projects/pages/ProjectRegistrationFormPage.tsx` (dòng 220–250, 410–425)
- **Triệu chứng**:
  - Khi truy cập `/project/edit`:
    - Breadcrumb hiển thị đúng: `Chỉnh sửa Đề cương Đồ án`.
    - Tiêu đề H1 lại hiển thị: `Đăng ký Đề cương Đồ án Tốt nghiệp` (tiêu đề tạo mới).
    - Nút nộp hiển thị: `Nộp Đề cương Sơ bộ` thay vì `Cập nhật / Nộp lại Đề cương`.
- **Hướng dẫn sửa cho Codex**:
  - Xác định cờ chế độ:
    ```tsx
    const location = useLocation()
    const isEditMode = location.pathname.includes('/project/edit') || Boolean(project?.id)
    ```
  - Cập nhật tiêu đề:
    ```tsx
    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
      {isEditMode ? 'Chỉnh sửa Đề cương Đồ án Tốt nghiệp' : 'Đăng ký Đề cương Đồ án Tốt nghiệp'}
    </h1>
    ```
  - Cập nhật nút bấm:
    ```tsx
    <span>{isRevisionRequired ? 'Nộp lại Đề cương (Resubmit)' : isEditMode ? 'Cập nhật Đề cương' : 'Nộp Đề cương Sơ bộ'}</span>
    ```

---

### ISSUE-06: Mâu thuẫn thông tin giữa AppLayout và nội dung trang & Overview trống 80%
- **Vị trí**:
  - `src/app/layouts/Sidebar.tsx`
  - `src/app/layouts/TopHeader.tsx`
  - `src/app/pages/OverviewPage.tsx`
- **Triệu chứng**:
  - Sidebar hiển thị cứng: `CP_SEP490 / Nhóm SE28` (chấm xanh "Đang hoạt động").
  - Breadcrumb hiển thị: `SEP490 / Nhóm SE28 / ...`.
  - Nhưng trong các trang `/team`, `/project/register`, `/project/status` lại thông báo sinh viên "Chưa có nhóm nào", "Học kỳ: Chưa xác định".
  - Tại `/project/workspace`: Do `journeyState !== 'ACTIVE'`, toàn bộ nửa dưới của Overview bị trả về `null`, để lại một khoảng trắng khổng lồ.
- **Hướng dẫn sửa cho Codex**:
  1. **Trong `Sidebar.tsx` & `TopHeader.tsx`**:
     - Lấy `team`, `project`, `semester`, `profile` từ `useStudentJourney()` để hiển thị linh hoạt:
       - Nếu có `team`: hiển thị `${team.code || team.name}`.
       - Nếu chưa có `team`: hiển thị `Chưa có nhóm` hoặc `Đang tuyển quân` với badge trung tính (neutral/amber).
  2. **Trong `OverviewPage.tsx`**:
     - Khi `journeyState !== 'ACTIVE'`, thay vì trả về `null`, hãy render một khối Onboarding / Next Steps Card:
       - Tóm tắt tiến trình 5 bước của Student Journey (Tuyển quân → Đề cương → Thẩm định → Ghép GVHD → Thực hiện).
       - Nêu rõ bước tiếp theo nhóm cần thực hiện kèm nút điều hướng nhanh.
       - Giúp bố cục trang cân đối, chuyên nghiệp và dẫn dắt người dùng rõ ràng.

---

### ISSUE-07: Chuẩn Hóa Accessibility & HTML Form Standards theo cảnh báo DevTools
- **Vị trí**:
  - `src/features/projects/pages/ProjectRegistrationFormPage.tsx`
  - `src/features/projects/pages/TopicCataloguePage.tsx`
  - `src/features/milestones/pages/MilestoneDetailPage.tsx`
  - `src/features/progress/pages/GanttPage.tsx`
- **Triệu chứng**:
  - ChromeDevTools Console ghi nhận:
    - `[issue] No label associated with a form field (count: 8)`
    - `[issue] A form field element should have an id or name attribute (count: 7)`
- **Hướng dẫn sửa cho Codex**:
  - Trong `ProjectRegistrationFormPage.tsx`:
    - Gắn `id` và `name` cho tất cả các thẻ `<input>` và `<textarea>`:
      - `id="project-title" name="title"`
      - `id="project-problem" name="problemStatement"`
      - `id="project-objectives" name="objectives"`
      - `id="project-expected-output" name="expectedOutput"`
      - `id="project-domain" name="domain"`
      - `id="project-technologies" name="technologies"`
      - `id="project-keywords" name="keywords"`
    - Gắn `htmlFor="<id-tương-ứng>"` vào các thẻ `<label>` bọc phía trên.
  - Trong các ô tìm kiếm (`searchQuery`) tại `TopicCataloguePage`, `MilestoneDetailPage`, `GanttPage`:
    - Thêm thuộc tính `id="search-topics" name="searchQuery" aria-label="Tìm kiếm..."`.

---

## Bộ Lệnh Kiểm Tra Cho Codex Sau Khi Sửa (Quality Gates)

Codex cần chạy tuần tự các lệnh sau và đảm bảo **100% PASS** trước khi bàn giao:

```powershell
# 1. Kiểm tra Linting
pnpm lint

# 2. Kiểm tra TypeScript Types
pnpm typecheck

# 3. Chạy toàn bộ Unit & Component Tests
pnpm test

# 4. Kiểm tra Production Build
pnpm build

# 5. Chạy preview để xác minh hiển thị
pnpm preview
```
