# ARCHITECTURE DECISION RECORD (ADR) — TASK DETAIL MODAL (FE2-C1)

> **Căn cứ:** Master Prompt v6.1 §A4.1; `01_FE_PLAN_V2.md` §PHA C (FE2-C1).  
> **Ngữ cảnh:** Trước đây khi click vào thẻ task trên Kanban Board (`TaskBoardPage.tsx`), người dùng bị điều hướng rời khỏi trang sang `TaskDetailPage.tsx`, làm mất ngữ cảnh trực quan của toàn bộ board (Figure 64). Yêu cầu P0 của hệ thống là click task phải mở modal chi tiết ở giữa màn hình và giữ nguyên bảng Kanban phía sau.

---

## 1. Lựa chọn kiến trúc: URL-Backed Modal vs Local State Modal

Chúng tôi xem xét 2 phương án kiến trúc:

### Phương án 1: Local State Modal (`selectedTaskId` lưu ở React state)
- *Ưu điểm:* Đơn giản, đóng mở tức thì không chạm URL.
- *Nhược điểm:* Không thể chia sẻ URL (deep link) tới modal; reload trang làm mất modal; nút Back của trình duyệt sẽ back ra khỏi board thay vì đóng modal.

### Phương án 2: URL-Backed Modal (Sử dụng URL search param `?taskDetail=:id` hoặc route state)
- *Ưu điểm:*
  1. **Khả năng Deep Link 100%:** Người dùng có thể copy đường link `/project/tasks?taskDetail=8` và chia sẻ cho đồng nghiệp; khi mở link, hệ thống tải board và mở ngay modal chi tiết tương ứng.
  2. **Trải nghiệm nút Back chuẩn web:** Bấm Back của trình duyệt (hoặc phím cứng điện thoại) sẽ đóng modal và giữ nguyên vị trí cuộn / bộ lọc của Kanban board mà không reload lại toàn bộ trang.
  3. **Không tạo nguồn sự thật thứ hai (Single Source of Truth):** Modal tái sử dụng trực tiếp các service API của `TaskDetailPage` (`getTask`, `getTaskHistory`, `getProjectTimeline`, `updateTaskStatus`, `updateTask`, `setTaskAssignees`, `addTaskDependency`, `removeTaskDependency`, `useTaskExecutionCapabilities`).
  4. **Bảo tồn Route Full-Detail:** Tuyến đường `/project/tasks/:taskId` độc lập vẫn tiếp tục hoạt động 100% cho các trường hợp cần mở tab mới hoặc xem toàn màn hình; trong modal có nút "Mở trang chi tiết đầy đủ →" dẫn sang route này.

---

## 2. Quyết định (Decision)

**Chọn Phương án 2: URL-Backed Modal** kết hợp với `<Modal>` component native dialog chuẩn hệ thống:
1. Khi click vào task card (trừ thao tác kéo thả drag-and-drop): cập nhật search param `taskDetail=taskId` (hoặc mở modal với taskId).
2. Khi đóng modal: xóa param `taskDetail` hoặc gọi `onClose`, trả focus về card vừa click nhờ cơ chế `opener` của native `<dialog>`.
3. Modal được hiển thị ở chính giữa màn hình (center viewport), có body scroll lock, hỗ trợ phím Esc để đóng an toàn, và có 2 cột thông tin đầy đủ theo đúng MASTER §A4.1:
   - Header: Mã task, tiêu đề, trạng thái (`StatusBadge`), mức ưu tiên (`StatusBadge`).
   - Body: 2 cột (Cột 1: Mô tả, người phụ trách, ngày bắt đầu/hạn hoàn thành, mốc đồ án, công việc phụ thuộc; Cột 2: Minh chứng, bình luận, lịch sử thay đổi, ghi nhận ngành học).
   - Footer: Nút đóng modal và liên kết "Mở trang chi tiết đầy đủ →".
4. Xử lý xung đột Concurrency Token: khi gặp lỗi 409 từ API, hiển thị thông báo lỗi và refetch lại dữ liệu mới nhất, không tự ý áp dụng optimistic updates.

---

## 3. Ảnh hưởng tới Test Suite hiện có
- `TaskDetailPage.test.tsx` vẫn kiểm thử toàn diện route full detail `/project/tasks/:taskId` (11 tests tiếp tục pass 100%).
- `TaskBoardPage.test.tsx` bổ sung các test cases kiểm tra:
  - Click card mở modal giữa màn hình mà không rời board.
  - Kéo thả card không vô tình kích hoạt mở modal.
  - Phím Escape hoặc click nút đóng sẽ đóng modal và trả lại focus.
  - Hiển thị nhãn đếm "trên trang này" tránh gây hiểu lầm là tổng số của toàn bộ dự án.
