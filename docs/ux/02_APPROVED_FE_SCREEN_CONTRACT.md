# ĐẶC TẢ HỢP ĐỒNG GIAO DIỆN & HÀNH ĐỘNG WORKSPACES (PHASE 1)

**Tài liệu tham chiếu:** `01_ANTIGRAVITY_MASTER_PROMPT.md`, `02_FE_BUSINESS_REQUIREMENTS.md`.  
**Phạm vi:** Định nghĩa hợp đồng màn hình chuẩn hóa (DS/ST/SV/RV/PD/NT/DEF) bao gồm Actor, Trigger, Guard, DTO, Endpoint, Trạng thái phản hồi và Biện pháp bảo vệ bất biến học vụ.

---

## 1. MÀN HÌNH QUẢN TRỊ HỌC VỤ & CHÍNH SÁCH CỔNG (DS-01, DS-02, DS-03, DS-04)

### DS-01: Danh mục Chính sách Cổng (Review Gate Policy Overview)
- **Actor:** Trưởng bộ môn, Giáo vụ khoa (`DEPARTMENT_STAFF`, `ADMIN`).
- **Endpoint:** `GET /api/v1/academic/review-gates/templates?periodId={periodId}`
- **DTO Trả về:** `ReviewGateTemplate[]` (`id`, `code`, `name`, `mode`, `major`, `gatesCount`, `status: 'DRAFT' | 'PUBLISHED' | 'RETIRED'`, `version`, `concurrencyToken`).
- **UI Guard:** Chỉ người dùng có vai trò `DEPARTMENT_STAFF` hoặc `ADMIN` được phép truy cập. Mẫu đã `PUBLISHED` không cho phép sửa trực tiếp, bắt buộc phải chọn "Tạo phiên bản mới".

### DS-02: Trình tạo & Soạn thảo Tiêu chí Cổng (Gate Requirement Builder)
- **Actor:** Giáo vụ khoa (`DEPARTMENT_STAFF`).
- **Endpoint:**
  - Lưu nháp: `POST /api/v1/academic/review-gates/templates`
  - Ban hành: `POST /api/v1/academic/review-gates/templates/{id}/publish`
- **DTO Request:** `ReviewGateTemplate` bao gồm danh sách `gates[]`, mỗi cổng có `requirements[]` (`title`, `type`, `scope`, `verification`, `required`).
- **Error Guard:** Trả về `409 Conflict` nếu `concurrencyToken` không khớp; trả về `422 Unprocessable Entity` nếu tổng trọng số không bằng 100% hoặc có chu trình phụ thuộc vòng giữa các cổng.

### DS-03: Ma trận Giám sát Tiến độ Cổng Đồ án (Project Progress Matrix)
- **Actor:** Ban chủ nhiệm bộ môn, Giáo vụ (`DEPARTMENT_STAFF`).
- **Endpoint:** `GET /api/v1/academic/review-gates/monitoring-matrix?filterMode={SINGLE_MAJOR|INTERDISCIPLINARY}`
- **DTO Trả về:** `ProjectReviewMatrixRow[]` (`projectId`, `projectName`, `mode`, `major`, `taskProgress`, `gateStatuses`, `blockingReasons`, `hybridScopes`).
- **UI Guard:** Hiển thị trực quan hai chỉ số: Tiến độ công việc (Task Progress) và Trạng thái Cổng học vụ (Gate Status: `PLANNED`, `IN_REVIEW`, `PASSED`, `REVISION_REQUIRED`, `LOCKED`).

### DS-04: Bảng Điều kiện Đủ điều kiện Bảo vệ (Department Defense Readiness)
- **Actor:** Giáo vụ khoa, Hội đồng học vụ.
- **Endpoint:** `GET /api/v1/projects/{projectId}/defense-readiness`
- **DTO Trả về:** `DefenseReadinessSummary` (`isReady: boolean`, `blockedCount: number`, `conditions: DefenseCondition[]`).
- **Quy tắc:** Chỉ mang tính tư vấn học vụ (Advisory); không tự ý khóa cổng nộp cuối kỳ khi chưa có quyết định phê duyệt chính thức bằng văn bản của Hội đồng trường/khoa.

---

## 2. MÀN HÌNH SINH VIÊN (ST-01, ST-02, ST-03)

### ST-01: Dòng thời gian Thẩm định Đồ án (Student Review Timeline)
- **Actor:** Trưởng nhóm (`STUDENT_LEADER`), Thành viên (`STUDENT_MEMBER`).
- **Endpoint:** `GET /api/v1/projects/{projectId}/review-timeline`
- **DTO Trả về:** `StudentReviewTimelineDto` (`currentGateCode`, `effectivePolicyVersion`, `gates[]`, `capabilities`).
- **4 Thẻ KPI:**
  1. `AcademicExecutionProgress`: % Trọng số các cổng đã ĐẠT (chỉ tăng khi Hội đồng duyệt PASS).
  2. `TaskProgress`: % Hoàn thành task kỹ thuật của nhóm.
  3. `CurrentReview`: Cổng hiện tại kèm hạn chót thẩm định.
  4. `DefenseReadiness`: Trạng thái dự kiến đủ điều kiện bảo vệ (`NOT_READY` / `READY`).

### ST-02: Nộp Hồ sơ Thẩm định & Bản sửa đổi (Review Submission Modal)
- **Actor:** Trưởng nhóm sinh viên (`STUDENT_LEADER`).
- **Endpoint:** `POST /api/v1/projects/{projectId}/review-gates/{gateCode}/revisions`
- **DTO Request:** `SubmitRevisionRequest` (`requirementId`, `artifactName`, `notes`, `expectedVersion`).
- **Guard:** Chặn thành viên thường (`403 Forbidden`). Trả về `409 Conflict` nếu tài liệu đã có phiên bản mới hơn.

---

## 3. MÀN HÌNH GIẢNG VIÊN & THẨM ĐỊNH VIÊN (SV-01, RV-01, PD-01)

### SV-01: Giám sát & Nhận xét Hướng dẫn (Supervisor Gate Follow-up)
- **Actor:** Giảng viên hướng dẫn chính (`PRIMARY_SUPERVISOR`).
- **Endpoint:** `POST /api/v1/supervisors/projects/{projectId}/advisory-feedback`
- **Quy tắc:** GVHD chỉ có thẩm quyền gửi nhận xét đôn đốc và định hướng khắc phục cho sinh viên, không có thẩm quyền tự chấm đạt cổng thay Hội đồng thẩm định độc lập.

### RV-01: Hàng đợi & Quyết định Thẩm định (Assigned Reviewer Queue)
- **Actor:** Thẩm định viên được phân công (`ASSIGNED_REVIEWER`).
- **Endpoint:**
  - Xác minh minh chứng: `POST /api/v1/reviews/evidence/verify` (`requirementId`, `verificationStatus: 'ACCEPTED' | 'REJECTED'`, `feedback`)
  - Quyết định cổng: `POST /api/v1/reviews/gate-decision` (`projectId`, `gateCode`, `decision: 'PASSED' | 'REVISION_REQUIRED'`, `notes`, `expectedVersion`)
- **Guard:** Nút "Phê duyệt ĐẠT" (PASS) bị vô hiệu hóa cho đến khi tất cả các minh chứng bắt buộc đã được xác minh `ACCEPTED`. Trả về `422` nếu vi phạm.

### PD-01: Thẩm định Phạm vi Liên ngành (Interdisciplinary Discipline Scope)
- **Actor:** Đại diện bộ môn tham gia / Mentor chuyên ngành (`PARTICIPATING_DEPARTMENT`).
- **Endpoint:** `PUT /api/v1/reviews/hybrid-scopes/{scope}`
- **Quy tắc:** Bộ môn nào chỉ có thẩm quyền phê duyệt phạm vi chuyên ngành của bộ môn đó. Cổng tích hợp chung chỉ chuyển sang `PASSED` khi toàn bộ các ngành thành viên đều đạt chuẩn.
