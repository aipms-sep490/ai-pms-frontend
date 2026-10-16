# BÁO CÁO KIỂM TOÁN TRẢI NGHIỆM NGƯỜI DÙNG (WORKSPACE UX/UI AUDIT)
## HỆ THỐNG QUẢN LÝ ĐỒ ÁN TỐT NGHIỆP AI-PMS

> **Tài liệu**: WORKSPACE_UX_AUDIT.md  
> **Phiên bản**: 1.0  
> **Hệ thống**: AI-PMS Frontend (`ai-pms-frontend`)  
> **Nhánh Git**: `feat/uiux-master-redesign`  
> **Tiêu chuẩn tham chiếu**: AI-PMS Business/Academic Evaluation Spec v5.0, Canonical Baseline v4.0, SRS Report 3, SDD Report 4, Cross-Role Business FE Spec v2.0.

---

### MỤC LỤC
1. [Tổng quan & Phương pháp Kiểm toán](#1-tổng-quan--phương-pháp-kiểm-toán)
2. [Bản đồ Không gian Làm việc & Định tuyến theo Vai trò](#2-bản-đồ-không-gian-làm-việc--định-tuyến-theo-vai-trò)
3. [Kiểm toán Chi tiết Từng Không gian Làm việc (Workspace Audits)](#3-kiểm-toán-chi-tiết-từng-không-gian-làm-việc-workspace-audits)
   - [A. Quản trị Hệ thống (System Administrator Workspace)](#a-quản-trị-hệ-thống-system-administrator-workspace)
   - [B. Cán bộ Bộ môn (Department Staff Workspace)](#b-cán-bộ-bộ-môn-department-staff-workspace)
   - [C. Sinh viên Trưởng nhóm & Thành viên (Student Workspaces)](#c-sinh-viên-trưởng-nhóm--thành-viên-student-workspaces)
   - [D. Giảng viên Hướng dẫn (Primary Supervisor Workspace)](#d-giảng-viên-hướng-dẫn-primary-supervisor-workspace)
   - [E. Cán bộ / Giảng viên Thẩm định (Evaluator / Reviewer Workspace)](#e-cán-bộ--giảng-viên-thẩm-định-evaluator--reviewer-workspace)
   - [F. Hướng dẫn Chuyên ngành Liên ngành (Discipline Mentor Workspace)](#f-hướng-dẫn-chuyên-ngành-liên-ngành-discipline-mentor-workspace)
4. [Bảng Đánh giá UX 12 Chiều (12-Dimension UX Matrix)](#4-bảng-đánh-giá-ux-12-chiều-12-dimension-ux-matrix)
5. [Danh mục Vấn đề Cụ thể & Bằng chứng Mã nguồn (Defect Catalog)](#5-danh-mục-vấn-đề-cụ-thể--bằng-chứng-mã-nguồn-defect-catalog)
6. [Khoảng cách Hợp đồng & Phụ thuộc Backend (Contract & Dependency Gaps)](#6-khoảng-cách-hợp-đồng--phụ-thuộc-backend-contract--dependency-gaps)

---

### 1. TỔNG QUAN & PHƯƠNG PHÁP KIỂM TOÁN

Quá trình kiểm toán được thực hiện trực tiếp trên mã nguồn của nhánh `feat/uiux-master-redesign`, đối chiếu với toàn bộ tài liệu đặc tả học thuật, quy chế đào tạo và mô hình phân quyền thực tế của trường đại học.

#### Tiêu chí Phân loại Trạng thái:
- **EXISTING**: Đã có mã nguồn, hoạt động ổn định và có kiểm thử tự động.
- **PARTIAL**: Đã có giao diện hoặc logic nhưng còn rời rạc, thiếu liên kết hoặc trải nghiệm chưa liền mạch.
- **MISSING**: Yêu cầu nghiệp vụ bắt buộc nhưng chưa có màn hình/chức năng.
- **PROPOSED**: Cải tiến về mặt thông tin, luồng thao tác nhằm tối ưu hóa hiệu quả người dùng.
- **BLOCKED**: Phụ thuộc vào endpoint Backend hoặc quy chế chưa được phê duyệt.

#### Thang mức Độ nghiêm trọng (Severity):
- **CRITICAL**: Ngăn cản hoàn thành luồng công việc học thuật cốt lõi, vi phạm phân quyền hoặc gây hiểu lầm nghiêm trọng về kết quả đồ án.
- **HIGH**: Gây khó khăn lớn cho người dùng, phân mảnh thông tin, bắt người dùng phải bấm nhảy qua quá nhiều trang không liên quan.
- **MEDIUM**: Trải nghiệm thao tác chưa tối ưu, thiếu phản hồi trạng thái hoặc thông tin giải thích lý do bị chặn.
- **LOW**: Vấn đề thẩm mỹ nhỏ, khoảng cách, căn chỉnh hoặc câu chữ chưa đồng nhất.

---

### 2. BẢN ĐỒ KHÔNG GIAN LÀM VIỆC & ĐỊNH TUYẾN THEO VAI TRÒ

Hiện tại hệ thống được tổ chức định tuyến qua `src/app/router/index.tsx` và `workspace-route-registry.ts`:

| Vai trò (Identity Role) | Tuyến đường gốc (Root Route) | Không gian làm việc chính (Workspace Landing) | Số lượng Menu Sidebar hiện tại | Trạng thái |
| :--- | :--- | :--- | :---: | :---: |
| **Quản trị viên (ADMIN)** | `/admin/*`, `/academic/*` | `/admin/access` (Quản trị quyền) & `/admin/portfolio` | 4 mục | **EXISTING** |
| **Cán bộ Bộ môn (DEPARTMENT_STAFF)** | `/department/*`, `/academic/*` | `/department/workspace` (Quản lý đồ án bộ môn) | 12 mục | **PARTIAL** |
| **Giảng viên (LECTURER)** | `/supervisor/*`, `/mentor/*`, `/evaluator/*`, `/review/*` | `/supervisor/workspace` (Hướng dẫn đồ án) | 5 mục | **PARTIAL** |
| **Sinh viên (STUDENT)** | `/project/*`, `/team` | `/project/workspace` (Phối hợp nhóm) & `/project/overview` | **20 mục** *(khi ACTIVE)* | **PARTIAL** |

---

### 3. KIỂM TOÁN CHI TIẾT TỪNG KHÔNG GIAN LÀM VIỆC (WORKSPACE AUDITS)

#### A. Quản trị Hệ thống (System Administrator Workspace)
- **Đường dẫn**: `/admin/access`, `/admin/portfolio`, `/admin/access/rbac`, `/admin/access/users/:userId`, `/admin/industry`.
- **Ưu điểm**:
  - Giao diện quản lý người dùng, gán role, phân quyền RBAC rõ ràng.
  - Có các dialog chuyên biệt cho nhập xuất sinh viên (`StudentImportDialog`, `RosterExportDialog`).
- **Tồn tại UX**:
  - Thiếu trang Dashboard tổng quan tình trạng toàn hệ thống (System Health, Active Periods, User Counts). Trang `/admin/portfolio` chỉ hiển thị danh mục đồ án tương tự Bộ môn mà thiếu các chỉ số vận hành nền tảng.
  - Phân tán giữa `/admin/access` và `/admin/access/rbac` khiến admin phải chuyển đổi trang nhiều lần khi quản lý quyền hạn của một người dùng.

#### B. Cán bộ Bộ môn (Department Staff Workspace)
- **Đường dẫn**: `/department/workspace`, `/academic/governance`, `/academic/review-gates`, `/department/projects/progress-matrix`, `/department/projects/review`, `/department/portfolio`, `/department/supervisors`, `/department/student-qualifications`, `/department/topics`.
- **Tồn tại UX cốt lõi**:
  1. **Menu Sidebar quá tải và thiếu cấu trúc giai đoạn**: Có đến 12 mục menu nằm ngang hàng, không phân định giữa *Cấu hình trước kỳ* (Chính sách, Mẫu Gate, Rubric) và *Vận hành trong kỳ* (Thẩm định đề cương, Phân công GVHD, Giám sát tiến độ, Xét điều kiện bảo vệ).
  2. **Gãy liên kết quy trình Review Gates**: Trang chủ bộ môn (`DepartmentWorkspacePage.tsx`) có cụm liên kết nhanh 9 mục nhưng **hoàn toàn thiếu lối tắt tới Quản trị Review Gates** (`/academic/review-gates`) và **Ma trận Tiến độ Gates** (`/department/projects/progress-matrix`).
  3. **Nhầm lẫn thuật ngữ giữa Đề cương và Tiến trình**: Khối "Thẩm định học vụ" trên Dashboard hiển thị link "Xem thẩm định" trỏ về `/department/projects/review/{id}` (Thẩm định Đề cương ban đầu), khiến cán bộ bộ môn không phân biệt được với việc thẩm định các đợt Review Gates (R1..R4) trong kỳ.
  4. **Quy trình chuẩn bị phân mảnh**: Luồng nghiệp vụ cốt lõi:
     $$\text{Kỳ đồ án} \longrightarrow \text{Chính sách đợt} \longrightarrow \text{Review Gates} \longrightarrow \text{Tiêu chí minh chứng} \longrightarrow \text{Công bố} \longrightarrow \text{Ma trận đồ án} \longrightarrow \text{Điều kiện bảo vệ}$$
     hiện bị chia cắt ra 5 trang URL khác nhau mà không có thanh tiến trình (Stepper) chỉ dẫn.

#### C. Sinh viên Trưởng nhóm & Thành viên (Student Workspaces)
- **Đường dẫn**: `/project/overview`, `/projects/lifecycle`, `/project/workspace`, `/project/timeline`, `/project/tasks`, `/project/milestones`, `/project/gantt`, `/project/reports`, `/project/deliverables`, `/project/files`, `/project/meetings`, `/project/contributions`, `/project/final-submission`, `/project/result`, `/team`, `/project/gates`, `/project/agreement`, `/project/defense`, `/project/cold-reports`, `/project/peer-evaluation`, `/project/ai`.
- **Tồn tại UX cốt lõi**:
  1. **Tình trạng Phân mảnh Sidebar nghiêm trọng (Sidebar Bloat)**: Khi đồ án ở trạng thái `ACTIVE`, Sidebar của sinh viên hiển thị tới **20 mục menu khác nhau**. Sinh viên bị choáng ngợp và không biết phải vào đâu để làm nhiệm vụ quan trọng nhất hiện tại.
  2. **Trùng lặp & chồng chéo tính năng**:
     - "Mốc đồ án" (`/project/milestones`) vs "Lịch thực hiện" (`/project/gantt`) vs "Cổng kiểm soát cũ" (`/project/gates`) vs "Dòng thời gian Review Gates" (`/project/timeline`).
     - "Báo cáo tiến độ" (`/project/reports`) vs "Hạng mục cần nộp" (`/project/deliverables`) vs "Kho tệp đồ án" (`/project/files`).
  3. **Thiếu Tín hiệu Hành động Trực quan (Next Required Action)**:
     - Khi vào trang chủ `/project/workspace`, sinh viên nhìn thấy biểu đồ tiến độ công việc chung (Tasks/Milestones), nhưng **không nhìn thấy thông tin về đợt Review Gate đang diễn ra**: hạn nộp là ngày nào? Đang thiếu minh chứng gì? Tại sao bị chặn không được chuyển Gate?
     - Để biết mình có bị Reviewer từ chối minh chứng hay không, sinh viên phải tự tìm và bấm vào trang Dòng thời gian Review Gate.
  4. **Phân biệt Leader vs Member**:
     - Mặc dù hệ thống đã có component chặn nộp bài đối với Member (`ReviewSubmissionModal.tsx`), trên các màn hình tổng thể, thành viên thường vẫn nhìn thấy các nút hành động dạng mờ hoặc không có giải thích lý do chỉ Trưởng nhóm mới được thao tác.

#### D. Giảng viên Hướng dẫn (Primary Supervisor Workspace)
- **Đường dẫn**: `/supervisor/workspace`, `/supervisor/projects/:projectId/workspace`, `/supervisor/projects/:projectId/tasks`, `/supervisor/projects/:projectId/reports`, `/supervisor/projects/:projectId/meetings`, `/supervisor/projects/:projectId/deliverables`.
- **Tồn tại UX cốt lõi**:
  1. **Thẻ đồ án trên Dashboard thiếu tín hiệu Review Gates**: Thẻ đồ án trong `LecturerWorkspacePage.tsx` hiển thị tiến độ công việc, việc quá hạn, việc vướng mắc, nhưng **thiếu hoàn toàn huy hiệu trạng thái đợt Review Gate hiện tại** (ví dụ: `R2: Cần chỉnh sửa minh chứng SDD`).
  2. **Thanh tác vụ đồ án thiếu lối tắt Hậu kiểm Gate**: Thanh điều hướng nhanh của đồ án (`lecturer-project-actions`) chỉ có 5 nút: *Tổng quan, Công việc, Báo cáo tiến độ, Lịch họp, Hạng mục cần nộp*. GVHD không có cách nào nhảy thẳng vào trang Dòng thời gian Gate để ghi nhận ý kiến tư vấn định hướng (`SupervisorGateFollowupPanel`).
  3. **Không gian làm việc bị lẫn lộn giữa GVHD và Reviewer**: Giảng viên vừa hướng dẫn đồ án A, vừa được phân công thẩm định đồ án B. Hai trách nhiệm này có tính chất đối lập (Tư vấn đồng hành vs Đánh giá độc lập), nhưng menu điều hướng chưa tách bạch rõ ngữ cảnh làm việc.

#### E. Cán bộ / Giảng viên Thẩm định (Evaluator / Reviewer Workspace)
- **Đường dẫn**: `/evaluator/workspace`, `/evaluator/assignments/:assignmentId`, `/review/gate-assignments`.
- **Tồn tại UX cốt lõi**:
  1. **Sự nhầm lẫn giữa Chấm điểm Cuối kỳ và Thẩm định Tiến trình**:
     - `/evaluator/workspace`: Dùng cho việc chấm điểm Rubric đồ án cuối kỳ hoặc bảo vệ.
     - `/review/gate-assignments`: Dùng cho thẩm định minh chứng các đợt Review Gates (R1..R4).
     - Hiện tại trên Sidebar giảng viên chỉ có mục "Đánh giá đồ án" trỏ về `/evaluator/workspace`, giảng viên được phân công thẩm định Gate không thấy mục "Thẩm định Review Gates" trên Sidebar trừ khi có đường link trực tiếp hoặc qua thông báo.

#### F. Hướng dẫn Chuyên ngành Liên ngành (Discipline Mentor Workspace)
- **Đường dẫn**: `/mentor/workspace`, `/mentor/projects/:projectId/majors/:majorId/*`.
- **Tồn tại UX cốt lõi**:
  - Giao diện hiển thị tách biệt theo từng chuyên ngành của đồ án liên ngành, tuy nhiên chưa thể hiện rõ mối liên hệ giữa tiến độ ngành thành viên với đợt Review Gate tích hợp chung của toàn dự án (`G1..G4`).

---

### 4. BẢNG ĐÁNH GIÁ UX 12 CHIỀU (12-DIMENSION UX MATRIX)

| Chiều đánh giá | Hiện trạng kiểm toán | Mức độ | Vấn đề phát hiện |
| :--- | :--- | :---: | :--- |
| **1. Kiến trúc thông tin (IA)** | Rời rạc, sidebar sinh viên có 20 mục; bộ môn có 12 mục ngang hàng | **HIGH** | Thiếu gom nhóm theo giai đoạn vòng đời và ngữ cảnh hành động. |
| **2. Điều hướng (Navigation)** | Nhiều lối tắt trùng lặp nhưng thiếu liên kết giữa các tính năng cốt lõi mới | **HIGH** | Bộ môn không có link vào Review Gates; GVHD không có link vào theo dõi Gate. |
| **3. Phân cấp thị giác (Hierarchy)** | Card đồ án chú trọng vào số lượng task hơn là trạng thái học vụ chính thức | **MEDIUM** | Người dùng khó nhận biết ngay việc gì là quan trọng nhất cần làm ngay hôm nay. |
| **4. Khả năng phát hiện hành động** | Nút bấm chính (CTA) bị chìm giữa nhiều nút phụ cùng màu | **MEDIUM** | Trưởng nhóm khó thấy ngay nút nộp minh chứng khi Gate bị yêu cầu chỉnh sửa. |
| **5. Hiệu quả tương tác** | Phải click qua 3-4 trang để hoàn thành việc kiểm tra và nộp bài | **HIGH** | Sinh viên xem task ở 1 trang, xem hạn nộp ở trang khác, nộp minh chứng ở trang thứ 3. |
| **6. Thiết kế Form & Modal** | Các form nộp minh chứng và nhập ý kiến đã có xác thực và thông báo lỗi tốt | **LOW** | Form rõ ràng, đã có chặn rỗng và thông báo cụ thể. |
| **7. Độ rõ ràng trạng thái (State)** | Các trạng thái Gate (PASSED, REVISION_REQUIRED) hiển thị màu chuẩn | **LOW** | Đã có cảnh báo blockingReasons chi tiết. |
| **8. Phản hồi hành động (Feedback)** | Mọi thao tác đều có thông báo thành công hoặc lỗi chi tiết | **LOW** | Không có hiện tượng click mà không có phản hồi. |
| **9. Nhất quán vai trò (Role Consistency)**| Phân quyền Leader/Member, GVHD/Reviewer đã được kiểm thử chặt chẽ | **LOW** | Backend và Mock Adapter đều chặn đúng mã 403. |
| **10. Khả năng tiếp cận (A11y)** | Toàn bộ font size >= 12px (text-xs), có aria-label, focus trap | **LOW** | Đạt 100% bài test design-tokens và a11y cơ bản. |
| **11. Thiết kế đáp ứng (Responsive)**| Layout Grid/Flex co giãn tốt, có drawer trên thiết bị di động | **LOW** | Giao diện hiển thị tốt trên màn hình hẹp. |
| **12. Tính nhất quán (Design Tokens)**| Đồng bộ hệ màu Semantic, Tailwind v4 tokens, WorkspacePage chuẩn | **LOW** | Sử dụng chung bộ component UI (`Button`, `WorkspacePage`, `Badge`). |

---

### 5. DANH MỤC VẤN ĐỀ CỤ THỂ & BẰNG CHỨNG MÃ NGUỒN (DEFECT CATALOG)

#### Vấn đề 1: Sidebar Sinh viên bị quá tải nghiêm trọng (20 menu items)
- **Mã lỗi**: `UX-STU-01`
- **Mức độ**: **HIGH**
- **Vị trí**: [`src/app/router/workspace-route-registry.ts#L23-L66`](file:///f:/AI-PMS/ai-pms-frontend/src/app/router/workspace-route-registry.ts#L23-L66)
- **Bằng chứng**: Khai báo 20 routes cho role `STUDENT` với `navigationVisibility: 'contextual'`, hiển thị toàn bộ lên sidebar khi đồ án `ACTIVE`.
- **Ảnh hưởng**: Sinh viên bị phân tán chú ý, khó tìm thấy trang nộp minh chứng đợt Review Gate (`/project/timeline`).

#### Vấn đề 2: Trang chủ Bộ môn thiếu lối tắt đến Review Gates & Ma trận Tiến trình
- **Mã lỗi**: `UX-DEP-01`
- **Mức độ**: **HIGH**
- **Vị trí**: [`src/features/department/pages/DepartmentWorkspacePage.tsx#L48-L58`](file:///f:/AI-PMS/ai-pms-frontend/src/features/department/pages/DepartmentWorkspacePage.tsx#L48-L58)
- **Bằng chứng**: Khối `department-quick-links` chỉ chứa 9 liên kết cũ, không có `/academic/review-gates` và `/department/projects/progress-matrix`.
- **Ảnh hưởng**: Cán bộ bộ môn không phát hiện ra chức năng quản lý chính sách Gate và theo dõi ma trận tiến độ đồ án mới triển khai.

#### Vấn đề 3: Trang làm việc GVHD thiếu huy hiệu cảnh báo Gate và liên kết theo dõi
- **Mã lỗi**: `UX-SUP-01`
- **Mức độ**: **MEDIUM**
- **Vị trí**: [`src/features/supervisors/pages/LecturerWorkspacePage.tsx#L68-L74`](file:///f:/AI-PMS/ai-pms-frontend/src/features/supervisors/pages/LecturerWorkspacePage.tsx#L68-L74)
- **Bằng chứng**: Menu hành động đồ án `lecturer-project-actions` chỉ có 5 mục truyền thống, không có thông tin Review Gate của đồ án đang hướng dẫn.
- **Ảnh hưởng**: GVHD không biết đồ án mình hướng dẫn đang bị Reviewer yêu cầu sửa minh chứng gì để kịp thời định hướng sinh viên.

#### Vấn đề 4: Thiếu chỉ dẫn trạng thái Review Gate trên Không gian Phối hợp nhóm của Sinh viên
- **Mã lỗi**: `UX-STU-02`
- **Mức độ**: **HIGH**
- **Vị trí**: [`src/features/projects/pages/CollaborationWorkspace.tsx#L58-L62`](file:///f:/AI-PMS/ai-pms-frontend/src/features/projects/pages/CollaborationWorkspace.tsx#L58-L62)
- **Bằng chứng**: Khối `cw-project-line` chỉ hiển thị tiến độ hoàn thành Tasks (`doneTasks / totalTasks`), không có thanh trạng thái Review Gate (ví dụ: `Đợt hiện tại: Review 2 - Hạn chót 18/10`).
- **Ảnh hưởng**: Sinh viên tưởng đồ án đang ổn vì task đạt 80%, trong khi thực tế đồ án đang bị tắc ở Review Gate 2 vì tài liệu SDD bị từ chối.

---

### 6. KHOẢNG CÁCH HỢP ĐỒNG & PHỤ THUỘC BACKEND (CONTRACT & DEPENDENCY GAPS)

| Tính năng | Trạng thái Frontend | Trạng thái Backend | Phụ thuộc kỹ thuật cần giải quyết |
| :--- | :---: | :---: | :--- |
| **Review Gate Policy Builder (DS-01..03)** | EXISTING (Mock Adapter) | MISSING | Cần BE chạy migration tạo bảng `ReviewGateTemplates`, `ReviewGateDefinitions`, `ReviewGateRequirements` và các API CRUD. |
| **Ma trận Tiến độ Đồ án (DS-04..05)** | EXISTING (Mock Adapter) | MISSING | Cần BE trả về danh sách đồ án kèm ma trận trạng thái Gate (`R1..R4`) và phân nhánh chuyên ngành (`hybridScopes`). |
| **Tiến trình & Nộp bài Sinh viên (ST-01..02)**| EXISTING (Mock Adapter) | MISSING | Cần BE endpoint `GET /api/v1/projects/{id}/review-gates/timeline` và `POST .../revisions` kiểm tra quyền Trưởng nhóm. |
| **Hàng đợi & Quyết định Reviewer (RV-01)** | EXISTING (Mock Adapter) | MISSING | Cần BE endpoint `GET /api/v1/reviewers/gate-assignments` và các API xác minh minh chứng, ký duyệt PASS có kiểm tra 100% minh chứng bắt buộc. |
| **Thông báo & Deep Links (NT-01)** | EXISTING | PARTIAL | FE đã hỗ trợ 11 sự kiện; BE cần cấu hình phát sinh sự kiện qua Outbox Pattern khi có thay đổi trạng thái Gate. |
