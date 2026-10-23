# BÁO CÁO KIỂM TOÁN TỔNG THỂ TRẢI NGHIỆM NGƯỜI DÙNG & TOÀN BỘ WORKSPACE (MASTER WORKSPACE AUDIT)

**Hệ thống:** AI-PMS (Academic Capstone Project Management System)  
**Nhánh Git:** `feat/uiux-master-redesign`  
**Phiên bản kiểm toán:** 2.0 (Toàn diện hệ thống)  
**Ngày thực hiện:** 2026-10-18  
**Tác giả:** Senior Product Designer, UX Architect & Academic BA  
**Tài liệu quy chuẩn tham chiếu:**  
- AI-PMS Business/Academic Evaluation & BE/FE Specification v5.0  
- Canonical Implementation Baseline v4.0  
- Software Requirement Specification (SRS) Report 3  
- Software Design Document (SDD) Report 4  
- Interdisciplinary Governance Baseline v3.0  
- Kế hoạch Quản lý Tiến trình Review (16/10/2026)  

---

## 1. MỤC LỤC
1. [Phương pháp Kiểm toán & Bộ Tiêu chuẩn Đánh giá](#1-phương-pháp-kiểm-toán--bộ-tiêu-chuẩn-đánh-giá)
2. [Bản đồ Tuyến đường & Ranh giới Thẩm quyền Thực tế (Route & Role Map)](#2-bản-đồ-tuyến-đường--ranh-giới-thẩm-quyền-thực-tế-route--role-map)
3. [Kiểm toán Chuyên sâu 7 Nhóm Workspace Cốt lõi](#3-kiểm-toán-chuyên-sâu-7-nhóm-workspace-cốt-lõi)
   - 3.1. [System Administrator Workspace](#31-system-administrator-workspace)
   - 3.2. [Department Staff Workspace](#32-department-staff-workspace)
   - 3.3. [Student Leader Workspace](#33-student-leader-workspace)
   - 3.4. [Student Member Workspace](#34-student-member-workspace)
   - 3.5. [Primary Supervisor Workspace](#35-primary-supervisor-workspace)
   - 3.6. [Discipline Mentor & Participating Department](#36-discipline-mentor--participating-department)
   - 3.7. [Reviewer / Faculty Evaluator & Industry Expert](#37-reviewer--faculty-evaluator--industry-expert)
4. [Bảng Chấm Điểm Định lượng Workspace (Thang 1–5 Điểm Kèm Bằng chứng)](#4-bảng-chấm-điểm-định-lượng-workspace-thang-15-điểm-kèm-bằng-chứng)
5. [Danh mục Khiếm khuyết Cụ thể & Bằng chứng Mã nguồn (Defect Catalog)](#5-danh-mục-khiếm-khuyết-cụ-thể--bằng-chứng-mã-nguồn-defect-catalog)
6. [Khoảng cách Hợp đồng & Phụ thuộc Backend (Gaps & Dependencies)](#6-khoảng-cách-hợp-đồng--phụ-thuộc-backend-gaps--dependencies)

---

## 1. PHƯƠNG PHÁP KIỂM TOÁN & BỘ TIÊU CHUẨN ĐÁNH GIÁ

Quá trình kiểm toán được thực thi trực tiếp trên mã nguồn của nhánh `feat/uiux-master-redesign`, đối chiếu với toàn bộ router, component cây giao diện, hook ngữ cảnh và các bài test tự động.

### 8 Tiêu chí Đánh giá Trải nghiệm (Thang điểm 1 đến 5):
1. **Navigation (Điều hướng):** Cấu trúc menu có rõ ràng, dễ định vị, không gây lạc lõng và không bắt người dùng bấm quá 3 lần để tới tác vụ chính.
2. **Clarity (Độ rõ ràng):** Thông tin hiển thị có dễ hiểu ngay từ cái nhìn đầu tiên, câu chữ rõ nghĩa học thuật, phân cấp trực quan tốt.
3. **Action Efficiency (Hiệu quả thao tác):** Người dùng có hoàn thành tác vụ với số bước tối thiểu, không phải nhập lại dữ liệu trùng lặp.
4. **Visual Consistency (Tính nhất quán thị giác):** Thống nhất về spacing, font size, màu sắc ngữ nghĩa (tokens), kiểu nút bấm, badge và bảng biểu.
5. **Business Completeness (Đầy đủ nghiệp vụ):** Phản ánh đúng quy chế học vụ, không thiếu sót các bước duyệt, khóa, nộp lại và phân tách quyền hạn.
6. **State & Feedback (Trạng thái & Phản hồi):** Có đầy đủ trạng thái Loading, Empty, Error, Disabled (kèm lý do vì sao bị vô hiệu hóa), Success.
7. **Accessibility (Khả năng tiếp cận):** Đạt chuẩn WCAG: tương phản màu sắc $\ge 4.5:1$, kích thước chữ $\ge 12\text{px}$, điều hướng bàn phím (Tab/Esc), focus-visible, nhãn ARIA.
8. **Responsive (Khả năng thích ứng đa thiết bị):** Vận hành tốt trên Desktop 1440px, Laptop 1024px, Tablet 768px, Mobile 375px (touch target $\ge 44\text{px}$).

---

## 2. BẢN ĐỒ TUYẾN ĐƯỜNG & RANH GIỚI THẨM QUYỀN THỰC TẾ (ROUTE & ROLE MAP)

Hệ thống AI-PMS hiện tại có tổng cộng **48 tuyến đường hoạt động** (active routes) được đăng ký qua `src/app/router/index.tsx` và `workspace-route-registry.ts`:

| Mã Khu vực | Không gian làm việc | Tuyến đường thực tế (Actual Routes) | Vai trò & Thẩm quyền bảo vệ | Trạng thái hiện tại |
|---|---|---|---|---|
| **WS-ADMIN** | Quản trị nền tảng | `/admin/access`, `/admin/portfolio`, `/admin/milestone-templates`, `/admin/access/rbac`, `/admin/access/users/:userId`, `/admin/industry` | `RoleRoute: admin` | `EXISTING` (Hoạt động tốt) |
| **WS-DEPT** | Quản lý học vụ bộ môn | `/department/workspace`, `/department/portfolio`, `/department/projects/progress-matrix`, `/department/projects/review`, `/department/supervisors`, `/department/student-qualifications`, `/department/topics`, `/academic/governance`, `/academic/rubrics`, `/academic/review-gates` | `RoleRoute: department, admin` kèm `DepartmentAcademicScopeRoute` | `PARTIAL` (Phân mảnh giữa Đề cương, Mốc, Gates) |
| **WS-STU-L** | Sinh viên Trưởng nhóm | `/project/overview`, `/projects/lifecycle`, `/project/workspace`, `/project/timeline`, `/project/tasks`, `/project/milestones`, `/project/gantt`, `/project/reports`, `/project/deliverables`, `/project/final-submission`, `/team` | `RoleRoute: student` (Leader flags: `isLeader === true`) | `PARTIAL` (Sidebar 20 mục gây quá tải nhận thức) |
| **WS-STU-M** | Sinh viên Thành viên | `/project/overview`, `/project/workspace`, `/project/tasks`, `/project/meetings`, `/project/contributions`, `/project/files` | `RoleRoute: student` (Read/Task-only) | `PARTIAL` (Dễ nhầm lẫn với quyền nộp bài của Leader) |
| **WS-SUP** | Giảng viên Hướng dẫn | `/supervisor/dashboard`, `/supervisor/workspace`, `/supervisor/projects/:projectId/workspace`, `/supervisor/projects/:projectId/progress`, `/supervisor/projects/:projectId/final-submission` | `RoleRoute: lecturer` kèm `SupervisorExecutionRoute` | `PARTIAL` (Dashboard thiếu bộ gom việc khẩn cấp) |
| **WS-MENTOR**| Hướng dẫn Chuyên ngành | `/mentor/workspace`, `/mentor/projects/:projectId/majors/:majorId/workspace` | `RoleRoute: lecturer` kèm `MentorExecutionRoute` | `PARTIAL` (Rời rạc với tiến trình tổng thể) |
| **WS-REV** | Thẩm định / Đánh giá | `/review/gate-assignments`, `/evaluator/workspace`, `/evaluator/evaluations/:evaluationId` | `RoleRoute: lecturer, department` | `EXISTING` (Đã tích hợp Gate Review v2) |
| **WS-ACC** | Tài khoản & Cá nhân | `/profile`, `/profile/security`, `/notifications`, `/calendar`, `/messages/:conversationId?` | Mọi vai trò đã đăng nhập | `EXISTING` |

---

## 3. KIỂM TOÁN CHUYÊN SÂU 7 NHÓM WORKSPACE CỐT LÕI

### 3.1. System Administrator Workspace
- **Tập tin liên quan:** `src/features/users/pages/AdminWorkspacePage.tsx`, `AdminRbacPage.tsx`, `AdminUserDetailPage.tsx`, `SystemStatusPanel.tsx`.
- **Chức năng đang có:**
  - Quản lý danh sách tài khoản (phân trang, tìm kiếm email/mã/tên, lọc trạng thái `ACTIVE/INACTIVE/SUSPENDED`).
  - Quản trị vai trò RBAC toàn cục (`GLOBAL` vs `PROJECT-SCOPED`).
  - Đọc nhật ký kiểm toán bảo mật (`Security Audit Log`).
  - Nhập danh sách sinh viên từ Excel và xuất báo cáo nhóm.
- **Vấn đề UX/UI & Thao tác:**
  - *Tab phân mảnh:* Chuyển đổi giữa Tài khoản và Nhật ký kiểm toán qua query params (`?tab=accounts` vs `?tab=audit`), nhưng liên kết "Phân quyền" lại điều hướng sang trang hoàn toàn mới `/admin/access/rbac`, gây mất ngữ cảnh lọc.
  - *Hiển thị phạm vi học vụ:* Cột "Phạm vi học thuật" hiển thị ID số thay vì tên Bộ môn/Ngành (`departmentId: 2` thay vì `Kỹ thuật phần mềm`).
- **Đánh giá thẩm quyền:** Đã tuân thủ nghiêm ngặt nguyên tắc: Admin quản trị hệ sinh thái người dùng, **tuyệt đối không can thiệp duyệt cổng học thuật hay chấm điểm đồ án**.

### 3.2. Department Staff Workspace (Ưu Tiên Cải Thiện Số 1)
- **Tập tin liên quan:** `src/features/department/pages/DepartmentWorkspacePage.tsx`, `src/features/review-gates/pages/ReviewGateGovernancePage.tsx`, `src/features/projects/pages/ProjectReviewPage.tsx`, `PeriodPolicyManagementPage.tsx`.
- **Chức năng đang có:**
  - Thống kê đồ án theo kỳ, danh sách hồ sơ chờ thẩm định đề cương, danh bạ giảng viên hướng dẫn.
  - Ma trận tiến độ Review Gates (`/department/projects/progress-matrix`).
  - Quản lý và ban hành cấu hình Cổng thẩm định theo ngành (`/academic/review-gates`).
- **Vấn đề UX/UI & Nghiệp vụ nghiêm trọng:**
  - *Trộn lẫn 5 tầng nghiệp vụ vào thanh Quick Links:* Trang chủ `DepartmentWorkspacePage.tsx` bày ra 11 nút bấm ngang hàng, không phân định giữa **Cấu hình học thuật (Configuration)**, **Quản trị đồ án (Governance)**, **Giám sát tiến độ (Monitoring)**, **Quyết định thẩm định (Review)**, và **Đánh giá/Kết quả (Evaluation)**.
  - *Phân mảnh khái niệm thẩm định:* Có 2 luồng thẩm định riêng biệt:
    1. Thẩm định phê duyệt đề cương ban đầu (`/department/projects/review`).
    2. Thẩm định các Cổng tiến độ Review Gates (`/review/gate-assignments` và `/academic/review-gates`). Người dùng không phân biệt được hồ sơ nào đang ở bước nào.
  - *Cấu hình đợt review theo ngành:* Hiện tại form cấu hình Gate ở `ReviewGateGovernancePage.tsx` đã linh hoạt theo ngành, nhưng giáo vụ chưa có một trang tổng quan để biết: *"Kỳ Fall 2026 ngành IT có 4 gates, ngành Biz có 3 gates, cổng nào đã Publish, cổng nào còn là Draft"*.

### 3.3. Student Leader Workspace
- **Tập tin liên quan:** `src/features/projects/pages/ActiveProjectWorkspacePage.tsx`, `CollaborationWorkspace.tsx`, `src/features/review-gates/components/StudentReviewTimeline.tsx`, `TaskBoardPage.tsx`.
- **Chức năng đang có:**
  - Bảng điều khiển nhóm (Sprint/Kanban, phân công công việc, quản lý mốc đồ án).
  - Lộ trình Review Gates với 4 thẻ KPI độc lập (Tiến độ học vụ, Tiến độ task, Cổng hiện tại, Điều kiện bảo vệ tư vấn).
  - Modal nộp minh chứng (Artifact Submission) có chọn tài liệu, phiên bản và ghi chú gửi thẩm định viên.
- **Vấn đề UX/UI & Thao tác:**
  - *Quá tải thanh điều hướng (Cognitive Overload):* Khi đồ án chuyển sang `ACTIVE`, Sidebar của sinh viên bung ra tới **20 mục con phẳng** (Flat list từ Tổng quan, Hồ sơ, Công việc, Mốc, Gantt, Báo cáo, Hạng mục nộp, Kho tệp, Lịch họp, Đóng góp, Bàn giao cuối, Kết quả, Nhóm, Cổng kiểm soát, Cam kết, Lịch bảo vệ, Chấm nguội, Đánh giá chéo, AI...). Sinh viên hoàn toàn bị ngợp và không biết bắt đầu từ đâu.
  - *Thiếu bảng điều hướng "Việc cần làm tiếp theo" (Next Action Banner):* Sinh viên phải tự click vào `/project/timeline` để biết cổng đang `REVISION_REQUIRED` vì lý do gì.

### 3.4. Student Member Workspace
- **Tập tin liên quan:** `CollaborationWorkspace.tsx`, `TaskBoardPage.tsx`, `ProjectContributionsPage.tsx`.
- **Chức năng đang có:** Xem công việc được giao, cập nhật trạng thái task (`TODO -> IN_PROGRESS -> DONE`), xem biên bản họp và tài liệu chung.
- **Vấn đề UX/UI:**
  - *Thiếu phân lập quyền hạn trực quan:* Ở một số màn hình như Nộp gói bàn giao cuối kỳ (`FinalSubmissionPage.tsx`), nút nộp bài chỉ bị vô hiệu hóa khi bấm vào mới báo lỗi "Chỉ Trưởng nhóm mới có quyền nộp". Cần hiển thị rõ ràng nhãn: *"Chỉ dành cho Trưởng nhóm nộp; Thành viên có quyền xem và rà soát file"*.

### 3.5. Primary Supervisor Workspace
- **Tập tin liên quan:** `src/features/dashboard/pages/SupervisorDashboardPage.tsx`, `SupervisorProjectWorkspacePage.tsx`, `SupervisorProgressReviewPage.tsx`.
- **Chức năng đang có:**
  - Theo dõi danh sách đồ án phụ trách, số lượng báo cáo tiến độ định kỳ chờ duyệt, công việc quá hạn.
  - Truy cập không gian làm việc chi tiết của từng đồ án.
- **Vấn đề UX/UI:**
  - *Thiếu Hộp thư công việc tập trung (Action Inbox):* Dashboard hiển thị con số "Có 3 báo cáo chờ duyệt", nhưng không cung cấp một danh sách gom tắt để giảng viên click duyệt nhanh từng báo cáo ngay tại Dashboard mà bắt buộc phải click vào từng đồ án rồi mở trang con.
  - *Phân biệt ý kiến GVHD và quyết định Cổng chính thức:* Cần hiển thị rõ: Giảng viên hướng dẫn ghi nhận xét chuyên môn và xác nhận báo cáo tuần, nhưng quyết định ĐẠT cổng Review Gate học vụ do Thẩm định viên độc lập chốt.

### 3.6. Discipline Mentor & Participating Department (Đồ án Liên ngành)
- **Tập tin liên quan:** `src/features/mentors/pages/MentorWorkspacePage.tsx`, `StudentReviewTimeline.tsx` (F5 Multi-branch section).
- **Chức năng đang có:**
  - Theo dõi đồ án theo từng ngành thành viên (`/mentor/projects/:projectId/majors/:majorId/workspace`).
  - Bảng phân nhánh tiến độ chuyên môn: Chung 40%, IT 20%, Marketing 20%, Thiết kế 20%.
- **Vấn đề UX/UI:**
  - *Nguy cơ tách rời dữ liệu:* Hiện tại Mentor chỉ thấy task của ngành mình mà không nhìn thấy bức tranh tổng thể của đồ án, dễ dẫn đến việc mentor ngành Design yêu cầu thay đổi kiến trúc gây xung đột với ngành IT. Cần có chế độ xem tích hợp (Combined view) nhưng phân định rõ trách nhiệm ký duyệt minh chứng theo ngành.

### 3.7. Reviewer / Faculty Evaluator & Industry Expert
- **Tập tin liên quan:** `src/features/review-gates/pages/AssignedGateReviewPage.tsx`, `src/features/evaluations/pages/EvaluatorWorkspacePage.tsx`, `IndustryExpertPortalPage.tsx`.
- **Chức năng đang có:**
  - Thẩm định minh chứng từng cổng, kiểm tra tài liệu bắt buộc, đưa quyết định `PASSED` hoặc `REVISION_REQUIRED` kèm Concurrency Token (`rowVersion`).
  - Chấm điểm đồ án bảo vệ theo Rubric chính thức.
- **Vấn đề UX/UI:**
  - Ranh giới giữa Thẩm định Cổng (Review Gate Decision - Đạt/Chưa đạt để đi tiếp) và Chấm điểm Hội đồng (Evaluation Rubric - Điểm số 1-10 để tính điểm môn học) đã được phân tách ở cấp route (`/review/gate-assignments` vs `/evaluator/workspace`), nhưng thanh điều hướng của Giảng viên chưa gom nhóm rõ ràng, khiến giảng viên thỉnh thoảng nhầm lẫn giữa hai nhiệm vụ.

---

## 4. BẢNG CHẤM ĐIỂM ĐỊNH LƯỢNG WORKSPACE (THANG 1–5 ĐIỂM KÈM BẰNG CHỨNG)

| Không gian làm việc (Workspace) | Navigation (1-5) | Clarity (1-5) | Action Efficiency (1-5) | Visual Consistency (1-5) | Business Completeness (1-5) | State & Feedback (1-5) | Accessibility (1-5) | Responsive (1-5) | **Điểm TB** | Đánh giá tổng quát |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **System Administrator** | 4.0 | 4.0 | 4.0 | 4.5 | 4.5 | 4.0 | 4.5 | 4.0 | **4.19** | Ổn định, rõ ràng, phân định đúng ranh giới kỹ thuật. |
| **Department Staff** | 2.5 | 3.0 | 2.5 | 3.5 | 4.5 | 3.5 | 4.0 | 3.5 | **3.38** | Nghiệp vụ rất đầy đủ nhưng điều hướng bị quá tải, trộn lẫn cấu hình và vận hành. |
| **Student Leader** | 2.5 | 3.5 | 3.0 | 4.0 | 4.5 | 4.0 | 4.5 | 4.0 | **3.75** | Tính năng Cổng thẩm định rất tốt, nhưng sidebar 20 mục phẳng gây hoang mang. |
| **Student Member** | 3.0 | 3.5 | 3.5 | 4.0 | 4.0 | 3.5 | 4.5 | 4.0 | **3.75** | Cần làm rõ hơn ranh giới giữa việc của tôi và việc của Leader. |
| **Primary Supervisor** | 3.5 | 3.5 | 3.0 | 4.0 | 4.5 | 3.5 | 4.5 | 4.0 | **3.81** | Tốt, cần bổ sung Action Inbox để duyệt nhanh báo cáo tuần mà không cần chuyển trang. |
| **Discipline Mentor** | 3.0 | 3.0 | 3.0 | 3.5 | 4.0 | 3.5 | 4.0 | 3.5 | **3.44** | Cần bổ sung góc nhìn tích hợp liên ngành thay vì chỉ đóng khung trong 1 major. |
| **Reviewer / Evaluator** | 4.5 | 4.5 | 4.5 | 4.5 | 4.5 | 4.5 | 4.5 | 4.0 | **4.44** | Giao diện thẩm định Review Gates rất mạch lạc, xử lý concurrency và minh chứng chuẩn xác. |

---

## 5. DANH MỤC KHIẾM KHUYẾT CỤ THỂ & BẰNG CHỨNG MÃ NGUỒN (DEFECT CATALOG)

### Defect 1: Sidebar Sinh viên có 20 mục phẳng rời rạc (Cognitive Overload)
- **Tập tin:** `src/app/router/workspace-route-registry.ts` (dòng 24–37, 60–66) & `src/app/layouts/Sidebar.tsx` (dòng 195–235).
- **Hiện trạng:** Khi sinh viên có đồ án `ACTIVE`, sidebar render 20 liên kết phẳng không phân nhóm. Người dùng phải cuộn chuột dài và mất thời gian tìm kiếm giữa các tính năng hàng ngày (Task, Meeting) và tính năng học vụ chính thức (Gates, Final Submission).
- **Mức độ:** `HIGH`
- **Đề xuất khắc phục:** Tái cấu trúc thành **5 nhóm hành trình học thuật có tiêu đề**:
  1. *Điều phối & Tiến độ:* Không gian nhóm, Tiến trình Review Gates, Mốc đồ án & Gantt.
  2. *Thực thi Công việc:* Bảng việc (Kanban), Lịch họp & Biên bản, Kho tệp & Minh chứng.
  3. *Tương tác & Hỗ trợ:* Trao đổi nhóm/GVHD, Trợ lý AI, Đánh giá đồng đội.
  4. *Nghiệm thu & Kết quả:* Bàn giao cuối kỳ, Lịch bảo vệ, Kết quả đồ án.
  5. *Hồ sơ & Đề tài:* Hồ sơ đồ án, Thành viên nhóm.

### Defect 2: Trang Department Workspace trộn lẫn Cấu hình và Giám sát vận hành
- **Tập tin:** `src/features/department/pages/DepartmentWorkspacePage.tsx` (dòng 58–70).
- **Hiện trạng:** 11 liên kết ngang hàng trong `department-quick-links` gom chung cả cấu hình khung đào tạo (`/academic`), tạo kỳ đồ án (`/academic/governance`), cài đặt tiêu chí (`/academic/rubrics`) với các tác vụ điều hành hàng ngày như duyệt đề cương (`/department/projects/review`) và ma trận tiến độ (`/department/projects/progress-matrix`).
- **Mức độ:** `HIGH`
- **Đề xuất khắc phục:** Tổ chức lại bố cục Department Workspace theo 3 khối rõ ràng:
  - **Khối A — Tác vụ Khẩn cấp Cần xử lý Ngay (Urgent Action Queue):** Đề cương chờ duyệt, Đồ án có nguy cơ trễ hạn/bị chặn, Yêu cầu phân công thẩm định viên.
  - **Khối B — Giám sát Tiến trình Học vụ (Academic Progress Monitoring):** Lối tắt vào Ma trận Tiến độ Gates, Theo dõi giảng viên hướng dẫn.
  - **Khối C — Cấu hình Học kỳ & Chính sách (Academic Setup & Policies):** Nhóm riêng các liên kết cấu hình Kỳ đồ án, Mẫu Review Gate, Rubric đánh giá.

### Defect 3: Nút bấm bị vô hiệu hóa (Disabled Button) thiếu lý do cản trở cụ thể
- **Tập tin:** `src/features/final-submission/FinalSubmissionPage.tsx` & `src/features/projects/pages/ProjectRegistrationFormPage.tsx`.
- **Hiện trạng:** Nút "Nộp bài" hoặc "Đăng ký đề tài" bị xám (disabled) khi chưa đủ điều kiện nhưng người dùng không thấy dòng chú thích giải thích vì sao bị khóa, buộc phải tự đoán hoặc mở console kiểm tra.
- **Mức độ:** `MEDIUM`
- **Đề xuất khắc phục:** Bắt buộc áp dụng pattern `ActionGuardButton` hoặc tooltip:
  - Nếu sinh viên chưa nộp SDD: *"Chưa thể gửi Review 2 vì Software Design Document chưa được nộp."*
  - Nếu không phải trưởng nhóm: *"Chức năng nộp bài chính thức chỉ dành cho Trưởng nhóm đồ án."*

### Defect 4: Phân mảnh thông tin giữa Task Board và Cổng Thẩm định
- **Tập tin:** `src/features/tasks/pages/TaskBoardPage.tsx` & `src/features/review-gates/components/StudentReviewTimeline.tsx`.
- **Hiện trạng:** Sinh viên làm việc hàng ngày trên Task Board (hoàn thành 90% task) nhưng không nhận thức được rằng Cổng thẩm định Review 2 đang bị yêu cầu sửa đổi (`REVISION_REQUIRED`). Sinh viên tưởng rằng hoàn thành task là sắp được bảo vệ.
- **Mức độ:** `HIGH`
- **Đề xuất khắc phục:** Đưa banner trạng thái Cổng thẩm định hiện tại (`Active Gate Status Pill`) lên đỉnh đầu của Task Board và Workspace chung, hiển thị rõ tiến độ học vụ thực tế.

---

## 6. KHOẢNG CÁCH HỢP ĐỒNG & PHỤ THUỘC BACKEND (GAPS & DEPENDENCIES)

1. **API Phê duyệt Cổng & Concurrency Token:** Đã có giao diện và test mock tại `AssignedGateReviewPage.tsx`, đang chờ Backend triển khai PR5 (`POST /api/review-gates/instances/{id}/decision` kèm `If-Match` ETag).
2. **Notification Outbox SRS §3.14:** FE đã có Notification Center và Deep-link reauthorization, đang chờ Backend PR6 để nhận sự kiện domain lưu trữ bền vững.
3. **Quy chế Khóa Bảo vệ (Advisory vs Hard Block):** Giữ nguyên mô hình tư vấn (Advisory) theo đúng [`OPEN_DECISIONS.md`](file:///f:/AI-PMS/ai-pms-frontend/docs/handoff/OPEN_DECISIONS.md) cho đến khi có văn bản chính thức của Hội đồng Đào tạo.
