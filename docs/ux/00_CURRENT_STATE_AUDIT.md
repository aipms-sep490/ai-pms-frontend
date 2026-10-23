# BÁO CÁO KIỂM TOÁN HIỆN TRẠNG WORKSPACES & REVIEW GATES (PHASE 0)

**Tài liệu tham chiếu:** `00_START_HERE.md`, `01_ANTIGRAVITY_MASTER_PROMPT.md`, `02_FE_BUSINESS_REQUIREMENTS.md`, `04_BE_BR_HANDOFF_SEED.md`, `05_E2E_ACCEPTANCE_MATRIX.md`.  
**Nhánh Git:** `feat/uiux-master-redesign` | **Commit cơ sở:** `e9e0d14` | **Thời điểm audit:** 2026-10-17  
**Phạm vi:** `f:\AI-PMS\ai-pms-frontend` (FE) và `f:\AI-PMS\ai-pms-backend` (BE read-only).

---

## 1. TỔNG QUAN HẠ TẦNG VÀ TRẠNG THÁI MÃ NGUỒN

| Hạng mục | Trạng thái ghi nhận | Bằng chứng mã nguồn |
|---|---|---|
| **Git Branch** | `feat/uiux-master-redesign` | `git status` clean, HEAD tại `e9e0d14` |
| **Framework & Build** | React 19, TypeScript 5.8, Vite 6, Tailwind CSS | [`package.json`](file:///f:/AI-PMS/ai-pms-frontend/package.json), `npm run build` PASS (829ms) |
| **Kiểm thử tự động** | Vitest 4.1.11, Testing Library, JSDOM | 11 test suites, 64/64 tests PASS (100%) |
| **Design Tokens** | Không vi phạm font < 12px, Emerald Luxury Theme | [`src/test/design-tokens.test.ts`](file:///f:/AI-PMS/ai-pms-frontend/src/test/design-tokens.test.ts) PASS (3/3) |
| **Hệ thống Router** | React Router v7 data router with code-splitting | [`src/app/router/index.tsx`](file:///f:/AI-PMS/ai-pms-frontend/src/app/router/index.tsx), [`workspace-route-registry.ts`](file:///f:/AI-PMS/ai-pms-frontend/src/app/router/workspace-route-registry.ts) |

---

## 2. MA TRẬN ĐÁNH GIÁ TÍNH NĂNG THEO MÀN HÌNH CHUẨN (DS / ST / SV / RV / PD / NT / DEF)

| Screen ID | Tên màn hình / Quy trình | Đường dẫn Route thực tế | Trạng thái hiện tại | Ghi chú kỹ thuật & Khoảng trống |
|---|---|---|---|---|
| **DS-01** | Quản lý Chính sách & Phiên bản Cổng kiểm soát (Department Staff) | `/academic/review-gates`, `/academic/project-periods/:periodId/review-gates` | **VERIFIED_EXISTING** | Đã có `ReviewGateGovernancePage.tsx`, cho phép xem danh sách template đơn ngành & liên ngành, trạng thái DRAFT / PUBLISHED. |
| **DS-02** | Trình tạo Cổng & Tiêu chí Thẩm định (Gate Requirement Builder) | `/academic/review-gates` (Tab Builder) | **VERIFIED_EXISTING** | `ReviewGateBuilder.tsx` + `GateRequirementDrawer.tsx`. Hỗ trợ cấu hình R1..R4, scope (Common/IT/Marketing/Design), verification mode (HUMAN/SYSTEM/BOTH). |
| **DS-03** | Ma trận Giám sát Tiến độ Cổng (Project Progress Matrix) | `/department/projects/progress-matrix` | **VERIFIED_EXISTING** | `ProjectProgressMatrix.tsx`. Hiển thị phân loại Đơn ngành / Liên ngành, tiến độ task, trạng thái từng cổng, cờ hybrid scopes. |
| **DS-04** | Kiểm tra Đủ điều kiện Bảo vệ (Department Defense Readiness) | `/department/projects/progress-matrix` (Drawer / Tab) | **VERIFIED_EXISTING** | `DefenseReadinessChecker.tsx`. Liệt kê điều kiện tiên quyết, khóa bảo vệ, tình trạng đạt/chưa đạt. |
| **ST-01** | Dòng thời gian & Tiến trình Cổng (Student Progress Timeline) | `/project/timeline`, `/project/workspace` (Banner) | **PARTIAL** | Đã có stepper R1..R4 và banner trạng thái. **Cần bổ sung:** 4 thẻ KPI chuẩn (Academic Progress vs Task Progress, Current Review, Advisory Defense Readiness) và thanh tiến độ đa nhánh liên ngành. |
| **ST-02** | Nộp Hồ sơ / Bản sửa đổi Cổng (Student Review Submission) | `/project/timeline` (Modal) | **VERIFIED_EXISTING** | `ReviewSubmissionModal.tsx`. Leader nộp bản sửa artifact version mới, ghi nhận nhật ký và chặn Member nộp trái quyền (403 guard). |
| **ST-03** | Không gian Thành viên (Student Member Scoped View) | `/project/timeline`, `/project/workspace` | **VERIFIED_EXISTING** | Member xem tiến độ, minh chứng, nhưng các nút nộp/sửa đổi bị ẩn hoặc hiển thị nhãn chỉ dẫn quyền hạn. |
| **SV-01** | Bàn làm việc & Giám sát của GVHD (Supervisor Workspace) | `/supervisor/workspace`, `/supervisor/projects/:id/review-gates` | **VERIFIED_EXISTING** | `LecturerWorkspacePage.tsx` có nút "Tiến trình Gates", `StudentReviewTimelinePage.tsx` tự động nhúng `SupervisorGateFollowupPanel.tsx` cho GVHD. |
| **RV-01** | Hàng đợi Thẩm định Độc lập (Assigned Reviewer Queue) | `/review/gate-assignments` | **VERIFIED_EXISTING** | `AssignedGateReviewPage.tsx` + `AssignedReviewQueue.tsx`. Kiểm duyệt từng minh chứng (ACCEPTED/REJECTED) trước khi đưa ra quyết định PASS/REVISION_REQUIRED. |
| **PD-01** | Thẩm định Phạm vi Liên ngành (Participating Department / Mentor) | `/academic/review-gates` (Tab Interdisciplinary) | **VERIFIED_EXISTING** | `InterdisciplinaryGatePanel.tsx`. Khóa Integration Gate nếu bất kỳ ngành bắt buộc nào (Marketing/Design) chưa đạt PASS. |
| **NT-01** | Trung tâm Thông báo & Deep-link (Persistent Notifications) | `/notifications`, Notification Bell | **PARTIAL** | Có component thông báo chung. Cần đảm bảo ánh xạ trực tiếp deep-link tới `/project/timeline` và `/review/gate-assignments`. |
| **DEF-01** | Bảng điều kiện Bảo vệ Cố vấn (Advisory Defense Readiness) | `/department/projects/progress-matrix`, Drawer | **VERIFIED_EXISTING** | `DefenseReadinessChecker.tsx`. Hoàn toàn tuân thủ quy tắc: mang tính cố vấn (Advisory), không tự ý khóa cổng nộp cuối kỳ khi chưa có phê duyệt học vụ. |

---

## 3. ĐỐI SOÁT QUY TẮC BẤT BIẾN HỌC VẬT (ACADEMIC INVARIANTS)

1. **Phân biệt rạch ròi 3 chỉ số tiến độ:**
   - *Tiến độ công việc (Task Progress):* Số việc hoàn thành / tổng số việc (ví dụ 90% xong việc).
   - *Tiến độ học vụ (Academic Execution Progress):* Tổng trọng số các Cổng đã được Hội đồng phê duyệt ĐẠT (ví dụ 40%). Không phụ thuộc vào số lượng task và không tăng khi chỉ mới nộp hồ sơ (`WAITING_REVIEW`).
   - *Điểm số / Đánh giá cuối kỳ (Grade/Evaluation):* Thực hiện bởi Hội đồng bảo vệ riêng biệt.
2. **Quyền hạn Trưởng nhóm vs Thành viên (ST-02 vs ST-03):**
   - Trưởng nhóm có quyền nộp gói minh chứng và bản sửa đổi.
   - Thành viên chỉ được xem và chuẩn bị tài liệu nội bộ, không có nút nộp chính thức.
3. **Thẩm quyền Giảng viên Hướng dẫn vs Thẩm định viên (SV-01 vs RV-01):**
   - GVHD theo dõi, nhận xét định hướng hành động (Advisory follow-up) qua `SupervisorGateFollowupPanel`.
   - Quyết định ĐẠT cổng (PASS) thuộc về Thẩm định viên độc lập được phân công qua `AssignedReviewQueue`.
4. **Cổng Tích hợp Liên ngành (F5 / PD-01):**
   - Không tạo các đồ án độc lập cho từng ngành.
   - Cổng tích hợp chung chỉ được PASS khi tất cả các ngành thành viên (Common, IT, Marketing, Design) đều đã thông qua.

---

## 4. KẾT LUẬN AUDIT VÀ CÁC ĐIỂM CẦN HOÀN THIỆN NGAY (GAP CLOSURE)

1. **Nâng cấp `StudentReviewTimeline.tsx`:** Bổ sung khối 4 KPI Cards (Academic Progress, Task Progress, Current Review, Advisory Readiness) và hiển thị thanh tiến độ đa nhánh liên ngành.
2. **Cập nhật ánh xạ Deep-link Thông báo (`NT-01`):** Bổ sung điều hướng chuẩn xác cho các sự kiện Review Gate.
3. **Đóng gói toàn diện bộ tài liệu BE Handoff (`docs/handoff/`):** Chuyển giao đầy đủ 6 tài liệu đặc tả chuẩn bị cho đội Backend triển khai.
