# DANH MỤC QUY TẮC NGHIỆP VỤ BACKEND (BE BUSINESS RULES CATALOG)

**Dự án:** AI-PMS (Capstone Project Management System)  
**Tài liệu tham chiếu:** `04_BE_BR_HANDOFF_SEED.md`, `01_ANTIGRAVITY_MASTER_PROMPT.md`, SRS Report 3, SDD Report 4.  
**Trạng thái phân loại:** Các quy tắc bắt đầu bằng `BRX-` là các quy tắc mở rộng đã được đồng bộ hóa với Frontend; liên kết với các quy tắc gốc `BR-01..161` trong SRS.

---

## 1. NHÓM QUY TẮC CẤU HÌNH CHÍNH SÁCH & SNAPSHOT (BRX-PROC-01 .. 11)

### BRX-PROC-01: Quyền Hạn Quản Trị Template theo Bộ Môn & Kỳ Đồ Án
- **Nguồn / Trạng thái:** SRS §3.5 / `FE_IMPLEMENTED`
- **Tác nhân:** Giáo vụ khoa, Trưởng bộ môn (`DEPARTMENT_STAFF`, `ADMIN`).
- **Điều kiện tiên quyết:** `ProjectPeriodId` hợp lệ và đang mở cấu hình. Bộ môn của người dùng phải sở hữu chuyên ngành của template.
- **Bất biến (Invariant):** Không thể tạo template cho một kỳ đồ án đã kết thúc hoặc ngành học không thuộc quyền quản lý của bộ môn.
- **Hiệu ứng miền:** Bản ghi `ReviewGateTemplate` được tạo với trạng thái `DRAFT`.
- **Lỗi & Phản hồi:** `403 Forbidden` nếu ngoài phạm vi bộ môn; `422 Unprocessable Entity` nếu `ProjectPeriodId` không tồn tại.

### BRX-PROC-02: Tính Toàn Vẹn Chuyên Ngành theo Chế Độ Đồ Án (Mode-aware Scopes)
- **Nguồn / Trạng thái:** Governance Baseline v3 / `FE_IMPLEMENTED`
- **Bất biến:**
  - Nếu `mode === 'SINGLE_MAJOR'`: Template có duy nhất 1 chuyên ngành chính (`primaryMajorId`).
  - Nếu `mode === 'INTERDISCIPLINARY'`: Template có từ 2 chuyên ngành trở lên (`requiredMajorIds.length >= 2`).
- **Lỗi:** `422 Unprocessable Entity` nếu khai báo sai số lượng chuyên ngành tương ứng với chế độ.

### BRX-PROC-03: Tính Bất Biến của Mẫu đã Ban Hành (Template Version Immutability)
- **Nguồn / Trạng thái:** SDD §4.2 / `FE_IMPLEMENTED`
- **Bất biến:** Template đã chuyển sang `PUBLISHED` không bao giờ được phép chỉnh sửa trực tiếp (No in-place mutation). Mọi sửa đổi phải thông qua việc tạo bản sao với số hiệu phiên bản mới (`v2.0`).
- **Lỗi:** `409 Conflict` nếu gửi request `PUT` vào template đang ở trạng thái `PUBLISHED`.

### BRX-PROC-04: Điều Kiện Tiên Quyết Ban Hành Chính Sách (Publish Preconditions)
- **Nguồn / Trạng thái:** SRS §3.5 / `FE_IMPLEMENTED`
- **Bất biến:** Để `PUBLISHED`, template phải thỏa mãn:
  1. Tổng trọng số tiến độ của các cổng bằng 100%.
  2. Đồ thị phụ thuộc giữa các cổng không có chu trình (Acyclic).
  3. Mỗi cổng có ít nhất 1 tiêu chí thẩm định bắt buộc.
- **Lỗi:** `422 Unprocessable Entity` kèm danh sách lý do vi phạm (`validationErrors[]`).

### BRX-PROC-08: Đóng Băng Quy Trình Đồ Án Bất Biến (Project Process Snapshot)
- **Nguồn / Trạng thái:** SDD §4.3 / `FE_IMPLEMENTED`
- **Kích hoạt:** Khi đồ án chuyển sang trạng thái `ACTIVE` (đã được bộ môn phê duyệt đề cương và phân công GVHD).
- **Hiệu ứng miền:** Hệ thống nhân bản toàn bộ cấu trúc các cổng và tiêu chí từ template đang có hiệu lực thành bản ghi `ProjectProcessSnapshot`. Bản snapshot này thuộc quyền sở hữu riêng của đồ án và không bị ảnh hưởng nếu template gốc bị sửa đổi.

---

## 2. NHÓM QUY TẮC THẨM ĐỊNH MINH CHỨNG & CỔNG (BRX-RG-01 .. 15)

### BRX-RG-01: Máy Trạng Thái Cổng Thẩm Định
- **Nguồn / Trạng thái:** SRS §3.9 / `FE_IMPLEMENTED`
- **Trạng thái hợp lệ:** `PLANNED → IN_REVIEW → WAITING_REVIEW → PASSED / REVISION_REQUIRED / LOCKED`.
- **Lỗi:** `409 Conflict` nếu chuyển trạng thái trái với luồng máy trạng thái.

### BRX-RG-02: Nộp Minh Chứng Không Tự Động Duyệt Đạt Cổng
- **Nguồn / Trạng thái:** Canonical Implementation Baseline v4 / `FE_IMPLEMENTED`
- **Bất biến:** Khi Trưởng nhóm nộp minh chứng thành công, cổng chuyển sang trạng thái `WAITING_REVIEW`. Tiến độ học vụ của đồ án **giữ nguyên không tăng**.
- **Hiệu ứng miền:** Tạo bản ghi nộp mới `GateArtifactSubmission` với số phiên bản tăng dần `v(N+1)`, phát sinh sự kiện thông báo cho Thẩm định viên.

### BRX-RG-05: Toàn Vẹn Phiên Bản Tài Liệu Nộp (Artifact Lineage)
- **Nguồn / Trạng thái:** SDD §4.6 / `FE_IMPLEMENTED`
- **Bất biến:** Mỗi lần nộp bài sửa đổi bắt buộc phải gửi kèm số phiên bản mong đợi (`expectedVersion`).
- **Lỗi:** `409 Conflict` nếu tài liệu trên server đã có phiên bản cao hơn (phát hiện xung đột đồng thời).

### BRX-RG-06: Tách Biệt Xác Minh Minh Chứng và Quyết Định Cổng
- **Nguồn / Trạng thái:** Governance Baseline v3 / `FE_IMPLEMENTED`
- **Bất biến:** Thẩm định viên phải xác minh từng minh chứng bắt buộc sang `ACCEPTED` trước khi hệ thống cho phép bấm nút "Phê duyệt ĐẠT" (PASS).
- **Lỗi:** `422 Unprocessable Entity` nếu duyệt ĐẠT khi còn minh chứng bắt buộc ở trạng thái `PENDING` hoặc `REJECTED`.

### BRX-RG-07: Phạm Vi Thẩm Quyền Thẩm Định Viên (Reviewer Scoping)
- **Nguồn / Trạng thái:** SRS §3.9 / `FE_IMPLEMENTED`
- **Bất biến:** Thẩm định viên chỉ được phép chấm các đồ án và cổng mà họ được phân công chính thức trong phân bổ của Bộ môn.
- **Lỗi:** `403 Forbidden` nếu thẩm định viên cố tình chấm đồ án hoặc chuyên ngành ngoài phạm vi phân công.

### BRX-RG-09: Quyết Định Duyệt ĐẠT Tăng Tiến Độ Học Vụ Duy Nhất Một Lần
- **Nguồn / Trạng thái:** Academic Progress Invariant / `FE_IMPLEMENTED`
- **Hiệu ứng miền:** Khi quyết định `PASSED` được lưu:
  1. Cổng chuyển sang trạng thái `PASSED`.
  2. Tiến độ học vụ được cộng đúng trọng số của cổng đó.
  3. Cổng kế tiếp đủ điều kiện chuyển sang `READY` hoặc `IN_REVIEW`.
  4. Ghi nhận nhật ký kiểm toán không thể xóa vào `ReviewGateAudits`.

---

## 3. NHÓM QUY TẮC TIẾN ĐỘ & LIÊN NGÀNH (BRX-PRG-01 .. 08)

### BRX-PRG-01: Công Thức Tính Tiến Độ Học Vụ Độc Lập
- **Công thức:**
  $$\text{AcademicProgress} = \frac{\sum_{\text{gate} \in \text{PASSED}} \text{Weight}(\text{gate})}{\sum_{\text{all gates}} \text{Weight}(\text{gate})} \times 100\%$$
- **Bất biến:** Tiến độ task trên Task Board (ví dụ 90% hoàn thành) không làm thay đổi giá trị của công thức này.

### BRX-PRG-06: Khóa Cổng Tích Hợp Liên Ngành (Hybrid Integration Gate Lock)
- **Nguồn / Trạng thái:** Governance Baseline v3 / `FE_IMPLEMENTED`
- **Bất biến:** Cổng tích hợp chung (`Integration Gate`) chỉ được phép chuyển sang `PASSED` khi:
  - Nhánh Khối chung (Common) = `PASSED`.
  - Nhánh Kỹ thuật Phần mềm (IT) = `PASSED`.
  - Nhánh Marketing = `PASSED`.
  - Nhánh Thiết kế (Design) = `PASSED`.
- **Lỗi:** `422 Unprocessable Entity` nếu cố tình duyệt ĐẠT cổng tích hợp khi còn ngành thành viên chưa hoàn tất.

---

## 4. NHÓM QUY TẮC BẢO VỆ & AN NINH (BRX-DEF-01 .. 03 & BRX-SEC-01 .. 03)

### BRX-DEF-02: Tính Cố Vấn của Điều Kiện Bảo Vệ (Advisory Readiness)
- **Bất biến:** API `GET /api/v1/projects/{id}/defense-readiness` trả về mô hình đọc mang tính chất tư vấn học vụ. Không cho phép bất kỳ logic tự động nào khóa quyền nộp gói bàn giao cuối kỳ của sinh viên trừ khi có văn bản phê duyệt chính thức từ Hội đồng nhà trường.

### BRX-SEC-01: Kiểm Tra Toàn Vẹn Quyền Hạn Mọi Request (Server-side RBAC)
- **Bất biến:** Backend không bao giờ tin tưởng quyền hạn gửi từ Frontend. Mọi request nộp bài, duyệt bài đều kiểm tra đối chiếu `UserId`, `RoleId`, `ProjectScope` và `RowVersion` tại tầng Entity Framework Core.
