# ĐẶC TẢ HÀNH ĐỘNG & BIỂU MẪU GIAO DIỆN CHI TIẾT (SCREEN ACTION SPECIFICATION)

**Hệ thống:** AI-PMS (Academic Capstone Project Management System)  
**Nhánh Git:** `feat/uiux-master-redesign`  
**Phiên bản:** 2.0  
**Ngày phát hành:** 2026-10-18  
**Tác giả:** Senior Product Designer, UX Architect & Academic BA  
**Kế thừa từ:** [`docs/ux/WORKSPACE_REDESIGN_PLAN.md`](file:///f:/AI-PMS/ai-pms-frontend/docs/ux/WORKSPACE_REDESIGN_PLAN.md) & [`docs/ux/USER_JOURNEY_MATRIX.md`](file:///f:/AI-PMS/ai-pms-frontend/docs/ux/USER_JOURNEY_MATRIX.md)  

---

## 1. MỤC LỤC
1. [Bộ Nguyên tắc Chuẩn hóa Biểu mẫu & Hành động (Form & Action Invariants)](#1-bộ-nguyên-tắc-chuẩn-hóa-biểu-mẫu--hành-động-form--action-invariants)
2. [Đặc tả Màn hình DS-01: Danh mục Mẫu Cổng Thẩm định (Department Template List)](#2-đặc-tả-màn-hình-ds-01-danh-mục-mẫu-cổng-thẩm-định-department-template-list)
3. [Đặc tả Màn hình DS-02: Thiết kế & Ban hành Cổng Thẩm định (Department Gate Builder)](#3-đặc-tả-màn-hình-ds-02-thiết-kế--ban-hành-cổng-thẩm-định-department-gate-builder)
4. [Đặc tả Màn hình DS-03: Ma trận Tiến độ Cổng Toàn khóa (Department Progress Matrix)](#4-đặc-tả-màn-hình-ds-03-ma-trận-tiến-độ-cổng-toàn-khóa-department-progress-matrix)
5. [Đặc tả Màn hình ST-01: Lộ trình Cổng & 4 Thẻ KPI Học vụ (Student Review Timeline)](#5-đặc-tả-màn-hình-st-01-lộ-trình-cổng--4-thẻ-kpi-học-vụ-student-review-timeline)
6. [Đặc tả Màn hình ST-02: Modal Nộp Gói Minh chứng Thẩm định (Student Artifact Submission)](#6-đặc-tả-màn-hình-st-02-modal-nộp-gói-minh-chứng-thẩm-định-student-artifact-submission)
7. [Đặc tả Màn hình RV-01: Bàn Thẩm định Minh chứng & Phê duyệt Cổng (Assigned Gate Review)](#7-đặc-tả-màn-hình-rv-01-bàn-thẩm-định-minh-chứng--phê-duyệt-cổng-assigned-gate-review)
8. [Đặc tả Màn hình DEF-01: Danh mục Kiểm tra Điều kiện Bảo vệ (Advisory Defense Readiness)](#8-đặc-tả-màn-hình-def-01-danh-mục-kiểm-tra-điều-kiện-bảo-vệ-advisory-defense-readiness)
9. [Bộ Từ điển Chuẩn hóa Thông báo Lỗi & Trạng thái Khóa (Guard Messages Dictionary)](#9-bộ-từ-điển-chuẩn-hóa-thông-báo-lỗi--trạng-thái-khóa-guard-messages-dictionary)

---

## 1. BỘ NGUYÊN TẮC CHUẨN HÓA BIỂU MẪU & HÀNH ĐỘNG (FORM & ACTION INVARIANTS)

1. **Phân định rõ ràng 5 loại nút bấm hành động:**
   - `Lưu bản nháp (Save Draft):` Lưu dữ liệu cục bộ hoặc tạm thời, không thay đổi trạng thái quy trình.
   - `Nộp hồ sơ (Submit):` Gửi gói dữ liệu/minh chứng lên máy chủ, chuyển trạng thái sang `WAITING_REVIEW`.
   - `Phê duyệt (Approve / PASS):` Quyết định chính thức từ người có thẩm quyền, chuyển trạng thái sang `PASSED` và kích hoạt tăng tiến độ học vụ.
   - `Yêu cầu chỉnh sửa (Request Revision):` Trả về nhóm kèm lý do bắt buộc, trạng thái chuyển sang `REVISION_REQUIRED`.
   - `Ban hành chính thức (Publish):` Khóa cấu hình (freeze snapshot) và kích hoạt áp dụng cho sinh viên.
2. **Quy tắc Nút bấm bị Vô hiệu hóa (Disabled Button Invariant):**
   - **Tuyệt đối không để nút xám câm lặng mà không giải thích.**
   - Mọi nút bấm disabled phải hiển thị Tooltip hoặc khối văn bản màu xám/vàng bên dưới giải thích rõ ràng: *Điều kiện nào chưa đạt để có thể bấm nút*.
3. **Phản hồi sau Thao tác (Post-action Feedback Invariant):**
   - Mọi thao tác thành công phải hiển thị Toast hoặc Banner nêu rõ: **Hành động gì đã được ghi nhận, trạng thái mới là gì, ai sẽ là người xử lý tiếp theo**.

---

## 2. ĐẶC TẢ MÀN HÌNH DS-01: DANH MỤC MẪU CỔNG THẨM ĐỊNH (DEPARTMENT TEMPLATE LIST)

- **Mã màn hình:** `DS-01`
- **Tập tin:** `src/features/review-gates/pages/ReviewGateGovernancePage.tsx`
- **Đường dẫn:** `/academic/review-gates`
- **Vai trò truy cập:** `DEPARTMENT_STAFF`, `ADMIN` (Phân quyền: `MANAGE_ACADEMIC_POLICIES`)
- **Mục tiêu:** Quản lý danh sách các mẫu quy trình Cổng thẩm định đã tạo, xem trạng thái DRAFT / PUBLISHED / RETIRED, tạo mẫu mới hoặc sao chép từ kỳ trước.

### Biểu mẫu & Trường dữ liệu:
| Trường nhập | Kiểu dữ liệu | Bắt buộc | Giá trị mặc định | Hướng dẫn & Quy tắc kiểm tra (Validation) |
|---|---|:---:|---|---|
| **Học kỳ áp dụng** | Select (Dropdown) | Có | Học kỳ hiện tại | Lấy từ danh sách kỳ học hoạt động (`periods`). |
| **Chuyên ngành** | Select (Dropdown) | Có | Ngành của tài khoản | Đơn ngành (SE, IA, MKT, GD) hoặc Đa ngành (INTERDISCIPLINARY). |
| **Tìm kiếm mẫu** | Text | Không | Rỗng | Tìm theo tên template hoặc mã quyết định. |

### Hành động & Trạng thái:
- **Nút "Tạo cấu hình cổng mới":** Mở màn hình DS-02.
- **Trạng thái hiển thị (Badges):**
  - `DRAFT` (Xám): Đang soạn thảo, cho phép chỉnh sửa trọng số và danh mục cổng.
  - `PUBLISHED` (Xanh lá): Đã ban hành, đã khóa bất biến. Chỉ cho phép xem (`Read-only`) hoặc nhân bản sang bản mới (`Clone`).
  - `RETIRED` (Đỏ nhạt): Đã hết hiệu lực thi hành.

---

## 3. ĐẶC TẢ MÀN HÌNH DS-02: THIẾT KẾ & BAN HÀNH CỔNG THẨM ĐỊNH (DEPARTMENT GATE BUILDER)

- **Mã màn hình:** `DS-02`
- **Tập tin:** `src/features/review-gates/components/GateTemplateBuilder.tsx`
- **Đường dẫn:** `/academic/review-gates/new` hoặc `/academic/review-gates/:id/edit`
- **Vai trò truy cập:** `DEPARTMENT_STAFF`
- **Mục tiêu:** Thiết lập danh sách các cổng thẩm định, gán trọng số phần trăm, quy định thời gian mở cổng và chỉ định các tài liệu minh chứng bắt buộc.

### Biểu mẫu & Trường dữ liệu:
| Tên trường | Kiểu dữ liệu | Bắt buộc | Hướng dẫn & Quy tắc kiểm tra |
|---|---|:---:|---|
| **Tên mẫu Cổng** | Text (max 100 ký tự) | Có | Ví dụ: `Quy trình Thẩm định Kỹ thuật Phần mềm Fall 2026`. |
| **Văn bản Quyết định** | Text (max 50 ký tự) | Có | Mã hiệu quyết định của Khoa (ví dụ: `QĐ-DHFP-2026-088`). |
| **Danh sách Cổng (Review Gates)** | Bảng động (Dynamic Table) | Có ($\ge 2$ cổng) | Mỗi hàng gồm: Tên cổng, Mã (R1..Rn), Trọng số %, Tuần bắt đầu, Tuần kết thúc. |
| **Trọng số Cổng (%)** | Decimal (0–100) | Có | $\sum \text{Weights} = 100.0\%$. Nếu khác 100%, hệ thống hiển thị cảnh báo đỏ và khóa nút Ban hành. |
| **Minh chứng bắt buộc** | Multi-select / Tag input | Có | Ví dụ: `PRD_DOCUMENT`, `SDD_DOCUMENT`, `PROTOTYPE_DEMO`. |

### Xử lý Trạng thái Khóa (Action Guards):
- **Nút "Công bố & Ban hành (Publish)":**
  - *Bị vô hiệu hóa nếu:* $\sum \text{Weights} \ne 100\%$ HOẶC có tên cổng bị trùng lặp HOẶC chưa nhập mã quyết định.
  - *Thông báo giải thích:* *"Chưa thể ban hành: Tổng trọng số các cổng hiện tại là 95%. Cần điều chỉnh để đạt chính xác 100%."*

---

## 4. ĐẶC TẢ MÀN HÌNH DS-03: MA TRẬN TIẾN ĐỘ CỔNG TOÀN KHÓA (DEPARTMENT PROGRESS MATRIX)

- **Mã màn hình:** `DS-03`
- **Tập tin:** `src/features/review-gates/pages/ReviewGateGovernancePage.tsx` (Tab Matrix)
- **Đường dẫn:** `/department/projects/progress-matrix`
- **Vai trò truy cập:** `DEPARTMENT_STAFF`, `ADMIN`
- **Mục tiêu:** Cung cấp bức tranh toàn cảnh về tiến độ vượt qua các Cổng thẩm định của tất cả các đồ án trong kỳ, phát hiện sớm các đồ án bị nghẽn ở khâu nộp bài hoặc bị từ chối nhiều lần.

### Cấu trúc Bảng Ma trận:
- **Cột 1: Mã đồ án & Tên nhóm:** Click mở hồ sơ chi tiết.
- **Cột 2: Giảng viên hướng dẫn:** Tên GVHD chính.
- **Cột 3: Ngành:** Badge chuyên ngành (`SE`, `MKT`, `INTERDISCIPLINARY`).
- **Cột 4..N: Trạng thái từng Cổng (R1, R2, R3, R4):**
  - `PASSED` (Xanh lá): Đã được thẩm định viên phê duyệt ĐẠT.
  - `WAITING_REVIEW` (Xanh dương nhấp nháy): Sinh viên đã nộp minh chứng, đang chờ phân công hoặc chờ thẩm định viên chấm.
  - `REVISION_REQUIRED` (Vàng hổ phách): Đang bị yêu cầu sửa đổi.
  - `IN_REVIEW` (Tím nhạt): Đang trong khung thời gian nộp bài.
  - `LOCKED` (Xám): Chưa mở hoặc chưa hoàn thành cổng tiên quyết.
- **Cột cuối: Tiến độ Học vụ (%):** Hiển thị chính xác tỷ lệ hoàn thành theo trọng số các cổng đã ĐẠT.

---

## 5. ĐẶC TẢ MÀN HÌNH ST-01: LỘ TRÌNH CỔNG & 4 THẺ KPI HỌC VỤ (STUDENT REVIEW TIMELINE)

- **Mã màn hình:** `ST-01`
- **Tập tin:** `src/features/review-gates/components/StudentReviewTimeline.tsx`
- **Đường dẫn:** `/project/timeline` hoặc `/project/review-gates`
- **Vai trò truy cập:** `STUDENT` (Trưởng nhóm & Thành viên)
- **Mục tiêu:** Cho sinh viên thấy toàn bộ lộ trình các đợt review, phân định rõ ràng giữa Tiến độ học vụ và Tiến độ task, nắm rõ hạn chót nộp bài và các minh chứng còn thiếu.

### 4 Thẻ KPI Cốt lõi:
1. **Tiến độ Học vụ (Academic Progress):**
   - Công thức: $100 \times \frac{\sum W_{\text{passed}}}{100}\%$.
   - Chú thích: *"Chỉ tính các cổng đã được Thẩm định viên phê duyệt ĐẠT."*
2. **Tiến độ Công việc Nhóm (Task Progress):**
   - Công thức: $\frac{\text{Task DONE}}{\text{Tổng số Task}} \times 100\%$.
   - Chú thích: *"Khối lượng kỹ thuật trên Task Board; độc lập với tiến độ học vụ."*
3. **Cổng Thẩm định Hiện tại:**
   - Tên cổng, hạn nộp và trạng thái (`IN_REVIEW`, `WAITING_REVIEW`, `REVISION_REQUIRED`).
4. **Điều kiện Bảo vệ Tư vấn (Advisory Readiness):**
   - Badge `READY` hoặc `NOT_READY`. Click mở Modal DEF-01.

---

## 6. ĐẶC TẢ MÀN HÌNH ST-02: MODAL NỘP GÓI MINH CHỨNG THẨM ĐỊNH (STUDENT ARTIFACT SUBMISSION)

- **Mã màn hình:** `ST-02`
- **Tập tin:** `src/features/review-gates/components/ArtifactSubmissionModal.tsx`
- **Kích hoạt từ:** Nút *"Nộp hồ sơ"* hoặc *"Nộp bản sửa đổi"* tại màn hình ST-01.
- **Thẩm quyền thực hiện:** `Chỉ Trưởng nhóm (Leader)`

### Biểu mẫu & Trường dữ liệu:
| Tên trường | Kiểu dữ liệu | Bắt buộc | Hướng dẫn & Ràng buộc |
|---|---|:---:|---|
| **Yêu cầu thẩm định** | Read-only | Có | Tên tài liệu bắt buộc (ví dụ: `Tài liệu Thiết kế Kiến trúc SDD`). |
| **Chọn tệp minh chứng** | File Upload (PDF, DOCX, ZIP $\le 50\text{MB}$) | Có | Tải file mới hoặc chọn từ Kho tệp đồ án (`/project/files`). |
| **Phiên bản tài liệu** | Text / Auto-generated | Có | Tự động tăng: nếu lần nộp đầu là `v1.0`, lần sau là `v2.0`. |
| **Ghi chú giải trình** | Textarea (max 500 ký tự) | Không | Nhập tóm tắt các điểm đã sửa đổi theo yêu cầu của Thẩm định viên. |

### Phản hồi sau khi Nộp:
- Gửi `POST /api/review-gates/instances/{id}/submissions`.
- Cổng chuyển sang trạng thái `WAITING_REVIEW`.
- Modal tự đóng, Toast thông báo: *"Đã nộp thành công minh chứng v2.0 cho Cổng thẩm định 2."*
- Tiến độ học vụ giữ nguyên, không được tự động tăng khi chưa có quyết định PASS.

---

## 7. ĐẶC TẢ MÀN HÌNH RV-01: BÀN THẨM ĐỊNH MINH CHỨNG & PHÊ DUYỆT CỔNG (ASSIGNED GATE REVIEW)

- **Mã màn hình:** `RV-01`
- **Tập tin:** `src/features/review-gates/pages/AssignedGateReviewPage.tsx`
- **Đường dẫn:** `/review/gate-assignments`
- **Vai trò truy cập:** `LECTURER`, `DEPARTMENT_STAFF` (Được phân công thẩm định cụ thể)
- **Mục tiêu:** Thẩm định viên xem trước file nộp, xác nhận từng minh chứng bắt buộc và đưa ra quyết định ĐẠT hoặc YÊU CẦU SỬA ĐỔI kèm lưu vết kiểm toán.

### Thao tác & Kiểm tra Ràng buộc:
1. **Xác nhận từng minh chứng:**
   - Với mỗi file sinh viên nộp, Thẩm định viên bấm:
     - `Chấp thuận (ACCEPTED)`
     - `Từ chối (REJECTED)` kèm lý do ngắn.
2. **Quyết định Phê duyệt ĐẠT (PASS Gate):**
   - **Ràng buộc cứng:** Nút "Phê duyệt ĐẠT" **bị khóa** nếu còn ít nhất 1 minh chứng bắt buộc chưa được `ACCEPTED`.
   - *Tooltip giải thích khi bị khóa:* *"Chưa thể duyệt ĐẠT: Tài liệu Software Design Document chưa được chấp thuận."*
3. **Quyết định Yêu cầu Sửa đổi (Request Revision):**
   - Bắt buộc phải nhập trường `Ghi chú phản hồi / Yêu cầu khắc phục` (tối thiểu 10 ký tự).
   - Nút "Gửi yêu cầu sửa đổi" bị khóa nếu để trống ô ghi chú.

---

## 8. ĐẶC TẢ MÀN HÌNH DEF-01: DANH MỤC KIỂM TRA ĐIỀU KIỆN BẢO VỆ (ADVISORY DEFENSE READINESS)

- **Mã màn hình:** `DEF-01`
- **Tập tin:** `src/features/review-gates/components/StudentReviewTimeline.tsx` (Advisory Defense Modal)
- **Đường dẫn:** Mở từ Thẻ KPI số 4 tại `/project/timeline`.
- **Vai trò:** Toàn bộ thành viên nhóm và GVHD.
- **Mục tiêu:** Hiển thị danh sách các điều kiện cần hoàn thành trước khi được bảo vệ tốt nghiệp theo hình thức tư vấn (Advisory Read Model).

### Danh mục Kiểm tra:
1. Tất cả các Cổng thẩm định Review Gates bắt buộc đều ở trạng thái `PASSED`.
2. Gói Bàn giao Cuối kỳ (`Final Submission Package`) đã tải đủ báo cáo, mã nguồn và poster.
3. Giảng viên hướng dẫn chính đã ký xác nhận đồng ý cho bảo vệ (`Supervisor Sign-off`).
4. Không có khiếu nại hoặc cảnh báo học vụ đang xử lý.
- **Lưu ý quy chế:** Bảng kiểm tra ghi rõ: *"Bảng kiểm tra này mang tính chất tư vấn để nhóm hoàn thiện hồ sơ. Quyết định danh sách bảo vệ chính thức do Hội đồng Khoa và Phòng Đào tạo ban hành."*

---

## 9. BỘ TỪ ĐIỂN CHUẨN HÓA THÔNG BÁO LỖI & TRẠNG THÁI KHÓA (GUARD MESSAGES DICTIONARY)

| Mã bảo vệ (Guard Code) | Tình huống xuất hiện | Thông báo hiển thị trên giao diện (User-facing Message) | Hướng dẫn khắc phục |
|---|---|---|---|
| **GUARD-LEADER-ONLY** | Thành viên nhóm bấm nộp bài | "Chỉ Trưởng nhóm (Leader) mới có quyền nộp minh chứng chính thức." | Hãy liên hệ Trưởng nhóm để rà soát và nộp tài liệu này. |
| **GUARD-GATE-LOCKED** | Sinh viên bấm nộp bài khi cổng chưa mở | "Cổng thẩm định chưa mở hoặc chưa hoàn thành Cổng tiên quyết trước đó." | Cần hoàn thành và đạt Cổng trước đó để mở khóa cổng này. |
| **GUARD-MISSING-DOC** | Thẩm định viên bấm duyệt ĐẠT khi còn file thiếu | "Chưa thể phê duyệt ĐẠT vì còn minh chứng bắt buộc chưa được chấp thuận." | Vui lòng kiểm tra và xác nhận toàn bộ các minh chứng bắt buộc. |
| **GUARD-WEIGHT-SUM** | Giáo vụ bấm ban hành mẫu cổng có tổng trọng số $\ne 100\%$ | "Tổng trọng số hiện tại là {sum}%. Cần điều chỉnh để đạt chính xác 100%." | Kiểm tra lại các tỷ lệ % của từng cổng và điều chỉnh lại. |
| **GUARD-CONCURRENCY-409** | Hai thẩm định viên cùng ra quyết định đồng thời | "Dữ liệu thẩm định đã được cập nhật bởi một giảng viên khác. Vui lòng tải lại trang." | Bấm nút 'Tải lại dữ liệu' để xem nhận xét mới nhất. |
| **GUARD-WRONG-MAJOR-403** | Mentor ngành A bấm duyệt tài liệu của ngành B | "Bạn không có quyền thẩm định minh chứng ngoài chuyên môn ngành được phân công." | Chuyển sang đúng phân nhánh chuyên môn của bạn để thao tác. |
