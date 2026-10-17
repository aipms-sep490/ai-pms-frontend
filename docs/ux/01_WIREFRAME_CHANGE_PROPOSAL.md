# ĐỀ XUẤT THAY ĐỔI & ĐỐI SOÁT WIREFRAME (PHASE 0 & 1)

**Tài liệu tham chiếu:** `03_INTERACTIVE_FE_WIREFRAME.html`, `02_FE_BUSINESS_REQUIREMENTS.md`.  
**Nhánh Git:** `feat/uiux-master-redesign` | **Mục tiêu:** Đối chiếu chi tiết giao diện offline wireframe với mã nguồn React hiện tại, đề xuất phương án tinh chỉnh tối ưu và đồng bộ với Design System AI-PMS.

---

## 1. SO SÁNH TRANG / THÀNH PHẦN GIỮA WIREFRAME VÀ FE CODEBASE

| Mã màn hình | Màn hình trong Wireframe HTML (`03_INTERACTIVE_FE_WIREFRAME.html`) | Thành phần React thực tế trong Codebase | Đánh giá sai lệch & Đề xuất tinh chỉnh |
|---|---|---|---|
| **DS-01 & DS-02** | `policy`: Bố cục chia đôi (trái: timeline & form; phải: preview weights & readiness). | [`src/features/review-gates/components/ReviewGateBuilder.tsx`](file:///f:/AI-PMS/ai-pms-frontend/src/features/review-gates/components/ReviewGateBuilder.tsx) | **ĐẠT CHUẨN.** Codebase đã triển khai đầy đủ các cấu hình kỳ, chế độ đồ án, danh sách cổng R1..R4, drawer cấu hình tiêu chí (`GateRequirementDrawer.tsx`). |
| **DS-03** | `monitor`: Bảng ma trận tiến độ (Project, Mode, Task %, Academic %, Gate Statuses, Defense). | [`src/features/review-gates/components/ProjectProgressMatrix.tsx`](file:///f:/AI-PMS/ai-pms-frontend/src/features/review-gates/components/ProjectProgressMatrix.tsx) | **ĐẠT CHUẨN.** Đã tích hợp đầy đủ bộ lọc, hiển thị phân tách tiến độ task và tiến độ học vụ, hỗ trợ thao tác nhanh cho Khoa. |
| **ST-01** | `student`: 4 thẻ KPI đầu trang (Academic Progress, Task Progress, Current Review, Defense Readiness) + Thanh Stepper. | [`src/features/review-gates/components/StudentReviewTimeline.tsx`](file:///f:/AI-PMS/ai-pms-frontend/src/features/review-gates/components/StudentReviewTimeline.tsx) | **CẦN BỔ SUNG KHỐI KPI.** Wireframe có 4 thẻ thống kê rạch ròi. Codebase hiện tại đang hiển thị trực tiếp stepper mà chưa có khối KPI đối chiếu hai loại tiến độ. Cần bổ sung 4 KPI cards vào đầu trang. |
| **ST-02 & ST-03** | `stage`: Danh mục tiêu chí (Document, Verification, Decision), form nộp minh chứng, lịch sử phiên bản. | [`src/features/review-gates/components/ReviewSubmissionModal.tsx`](file:///f:/AI-PMS/ai-pms-frontend/src/features/review-gates/components/ReviewSubmissionModal.tsx) | **ĐẠT CHUẨN.** Form nộp minh chứng của Leader kiểm tra nghiêm ngặt `expectedVersion`, hiển thị lịch sử nhận xét của Thẩm định viên, khóa nút đối với Member. |
| **SV-01** | `supervisor`: Danh sách đồ án chờ xử lý, lưu ý vai trò hướng dẫn vs chấm điểm. | [`src/features/review-gates/components/SupervisorGateFollowupPanel.tsx`](file:///f:/AI-PMS/ai-pms-frontend/src/features/review-gates/components/SupervisorGateFollowupPanel.tsx) | **ĐẠT CHUẨN.** Đã nhúng panel hỗ trợ GVHD phản hồi, cảnh báo vướng mắc mà không cho phép tự ý duyệt đạt cổng. |
| **RV-01** | `reviewer`: Hàng đợi thẩm định, duyệt từng minh chứng rồi mới cho phép bấm quyết định Gate. | [`src/features/review-gates/components/AssignedReviewQueue.tsx`](file:///f:/AI-PMS/ai-pms-frontend/src/features/review-gates/components/AssignedReviewQueue.tsx) | **ĐẠT CHUẨN.** Đã cài đặt nút xác minh minh chứng (Accepted/Rejected) trước khi mở khóa quyết định ĐẠT hoặc YÊU CẦU SỬA ĐỔI. |
| **PD-01** | `discipline`: Thẩm định chuyên môn từng ngành cho đồ án liên ngành. | [`src/features/review-gates/components/InterdisciplinaryGatePanel.tsx`](file:///f:/AI-PMS/ai-pms-frontend/src/features/review-gates/components/InterdisciplinaryGatePanel.tsx) | **ĐẠT CHUẨN.** Hiển thị tiến độ và quyết định độc lập của từng ngành (IT, Marketing, Design), phản ánh trạng thái cổng tích hợp chung. |
| **DEF-01** | `defense`: Danh sách kiểm tra điều kiện bảo vệ (Advisory Checklist). | [`src/features/review-gates/components/DefenseReadinessChecker.tsx`](file:///f:/AI-PMS/ai-pms-frontend/src/features/review-gates/components/DefenseReadinessChecker.tsx) | **ĐẠT CHUẨN.** Liệt kê điều kiện bảo vệ dưới dạng tư vấn học vụ, không can thiệp trái phép vào quy trình nộp cuối kỳ khi chưa có phê duyệt chính thức. |

---

## 2. KẾ HOẠCH NÂNG CẤP VÀ TINH CHỈNH GIAO DIỆN (FE INCREMENTS)

1. **Khối 4 KPI Cards tại `StudentReviewTimeline.tsx`:**
   - Thẻ 1: **Tiến độ Thực hiện Học vụ (Academic Execution Progress):** Trọng số các cổng đã được phê duyệt ĐẠT / Tổng trọng số (Ví dụ: 40%). Ghi chú: Chỉ tính các mốc đã được Hội đồng thẩm định chấp thuận chính thức.
   - Thẻ 2: **Tiến độ Công việc (Task Progress):** Tỷ lệ hoàn thành công việc kỹ thuật (Ví dụ: 90%). Ghi chú: Hoàn thành task kỹ thuật không đồng nghĩa với đạt cổng thẩm định.
   - Thẻ 3: **Cổng Đang xét duyệt (Current Review):** Mã cổng, trạng thái thẩm định, thời hạn chót.
   - Thẻ 4: **Đủ điều kiện Bảo vệ (Defense Readiness):** `CHƯA ĐỦ ĐIỀU KIỆN` hoặc `ĐỦ ĐIỀU KIỆN (DỰ KIẾN)` kèm nhãn Cố vấn (Advisory).
2. **Khối Tiến độ Liên ngành Đa nhánh (Hybrid Branch Progress):**
   - Khi đồ án ở chế độ `INTERDISCIPLINARY`: Hiển thị thanh tiến độ từng nhánh chuyên môn:
     - Khối chung (Common): 50%
     - Chuyên ngành Phần mềm (IT): 100%
     - Chuyên ngành Marketing: 50%
     - Chuyên ngành Thiết kế (Design): 0%
   - Banner cảnh báo: Cổng tích hợp liên ngành không thể ĐẠT nếu một trong các ngành bắt buộc chưa hoàn thành hoặc bị yêu cầu sửa đổi.
3. **Drawer / Modal Chi tiết Điều kiện Bảo vệ (Advisory Defense Modal):**
   - Nút liên kết từ thẻ KPI thứ 4 mở bảng điều kiện bảo vệ chi tiết để sinh viên chủ động chuẩn bị hồ sơ.
