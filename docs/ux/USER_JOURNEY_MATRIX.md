# MA TRẬN HÀNH TRÌNH NGƯỜI DÙNG & TỐI ƯU HÓA QUY TRÌNH (USER JOURNEY MATRIX)

**Hệ thống:** AI-PMS (Academic Capstone Project Management System)  
**Nhánh Git:** `feat/uiux-master-redesign`  
**Phiên bản:** 2.0  
**Ngày phát hành:** 2026-10-18  
**Tác giả:** Senior Product Designer, UX Architect & Academic BA  
**Kế thừa từ:** [`docs/ux/MASTER_WORKSPACE_AUDIT.md`](file:///f:/AI-PMS/ai-pms-frontend/docs/ux/MASTER_WORKSPACE_AUDIT.md) & [`docs/ux/WORKSPACE_REDESIGN_PLAN.md`](file:///f:/AI-PMS/ai-pms-frontend/docs/ux/WORKSPACE_REDESIGN_PLAN.md)  

---

## 1. MỤC LỤC
1. [Khung Tiêu chuẩn Phân tích Hành trình Người dùng](#1-khung-tiêu-chuẩn-phân-tích-hành-trình-người-dùng)
2. [Hành trình 1: Cán bộ Bộ môn Thiết lập Kỳ học & Quản trị Cổng Thẩm định (Department Staff Journey)](#2-hành-trình-1-cán-bộ-bộ-môn-thiết-lập-kỳ-học--quản-trị-cổng-thẩm-định-department-staff-journey)
3. [Hành trình 2: Sinh viên Trưởng nhóm Nộp Minh chứng & Khắc phục Yêu cầu Chỉnh sửa (Student Leader Journey)](#3-hành-trình-2-sinh-viên-trưởng-nhóm-nộp-minh-chứng--khắc-phục-yêu-cầu-chỉnh-sửa-student-leader-journey)
4. [Hành trình 3: Sinh viên Thành viên Thực hiện Task & Hỗ trợ Leader (Student Member Journey)](#4-hành-trình-3-sinh-viên-thành-viên-thực-hiện-task--hỗ-trợ-leader-student-member-journey)
5. [Hành trình 4: Giảng viên Hướng dẫn Giám sát & Xác nhận Báo cáo Tuần (Primary Supervisor Journey)](#5-hành-trình-4-giảng-viên-hướng-dẫn-giám-sát--xác-nhận-báo-cáo-tuần-primary-supervisor-journey)
6. [Hành trình 5: Giảng viên Thẩm định Kiểm tra Minh chứng & Chốt Quyết định Cổng (Reviewer Journey)](#6-hành-trình-5-giảng-viên-thẩm-định-kiểm-tra-minh-chứng--chốt-quyết-định-cổng-reviewer-journey)
7. [Hành trình 6: Hướng dẫn Chuyên môn Đồ án Liên ngành (Discipline Mentor Journey)](#7-hành-trình-6-hướng-dẫn-chuyên-môn-đồ-án-liên-ngành-discipline-mentor-journey)
8. [Hành trình 7: Quản trị viên Quản lý Vòng đời Tài khoản & RBAC (System Administrator Journey)](#8-hành-trình-7-quản-trị-viên-quản-lý-vòng-đời-tài-khoản--rbac-system-administrator-journey)
9. [Bảng So sánh Hiệu quả Thao tác Trước và Sau Cải tiến (Action Efficiency Metrics)](#9-bảng-so-sánh-hiệu-quả-thao-tác-trước-và-sau-cải-tiến-action-efficiency-metrics)

---

## 1. KHUNG TIÊU CHUẨN PHÂN TÍCH HÀNH TRÌNH NGƯỜI DÙNG

Với mỗi luồng nghiệp vụ học thuật cốt lõi, ma trận trả lời toàn diện 10 câu hỏi theo chuẩn quốc tế:
1. **Điểm bắt đầu (Start Point):** Người dùng bắt đầu từ màn hình nào?
2. **Khám phá chức năng (Discovery):** Họ tìm thấy tính năng cần làm bằng cách nào?
3. **Số bước thao tác (Steps Count):** Cần bao nhiêu cú click để hoàn thành?
4. **Bước thao tác dư thừa (Friction):** Có bước nào thừa hoặc phải chuyển trang không cần thiết không?
5. **Dữ liệu nhập lại (Redundancy):** Có thông tin nào người dùng phải nhập lặp lại không?
6. **Dữ liệu tham chiếu & Hướng dẫn (Contextual Help):** Người dùng có được cung cấp quy chế hoặc hướng dẫn tại chỗ không?
7. **Phản hồi thành công (Success Feedback):** Hệ thống phản hồi thế nào khi thao tác hoàn tất?
8. **Xử lý sự cố (Error Recovery):** Nếu xảy ra lỗi (403, 409, 422), thông báo có hướng dẫn cách khắc phục không?
9. **Điều hướng tiếp theo (Next Action Routing):** Sau khi hoàn thành, hệ thống dẫn người dùng đi đâu?
10. **Truy xuất lịch sử (Auditability):** Người dùng xem lại lịch sử các hành động ở đâu?

---

## 2. HÀNH TRÌNH 1: CÁN BỘ BỘ MÔN THIẾT LẬP KỲ HỌC & QUẢN TRỊ CỔNG THẨM ĐỊNH (DEPARTMENT STAFF JOURNEY)

### Mục tiêu:
Cán bộ bộ môn cấu hình đợt làm đồ án cho Học kỳ mới (ví dụ: Fall 2026), áp dụng mẫu Cổng thẩm định 4 đợt cho ngành Kỹ thuật Phần mềm (SE), kiểm tra tổng trọng số 100%, ban hành (Publish) và theo dõi ma trận tiến độ của toàn bộ đồ án trong kỳ.

### Chi tiết Luồng Thao tác:
- **Bắt đầu:** Đăng nhập vào hệ thống $\to$ Điều hướng tới `/department/workspace`.
- **Khám phá:** Nhìn thấy thẻ *"Cấu hình Quy chế Học vụ"* $\to$ Click *"Chính sách Review Gates"* (`/academic/review-gates`).
- **Thao tác cấu hình:**
  1. Chọn Học kỳ: `Fall 2026`, Ngành: `Kỹ thuật phần mềm (SE)`.
  2. Bấm *"Tạo cấu hình cổng mới"* $\to$ Nhập tên template, mã hiệu văn bản phê duyệt của Trưởng khoa (`sourceDecisionReference`).
  3. Thêm 4 Cổng tuần tự:
     - Gate 1: Đề cương chi tiết (Weight: 20%, Minh chứng: `PRD_v1.0`).
     - Gate 2: Thiết kế kiến trúc (Weight: 20%, Minh chứng: `SDD_v1.0`).
     - Gate 3: Bản chạy thử nghiệm Alpha (Weight: 35%, Minh chứng: `DEMO_LINK`, `TEST_REPORT`).
     - Gate 4: Nghiệm thu hoàn thiện trước bảo vệ (Weight: 25%, Minh chứng: `FINAL_REPORT`, `SOURCE_CODE`).
  4. Hệ thống tự động tính tổng trọng số: $20 + 20 + 35 + 25 = 100\%$. Nếu $\ne 100\%$, nút Publish bị vô hiệu hóa kèm cảnh báo đỏ.
  5. Bấm *"Công bố & Kích hoạt Chính sách"* $\to$ Modal xác nhận cảnh báo: *"Chính sách sau khi công bố sẽ được đóng băng (freeze) cho các đồ án kích hoạt trong kỳ. Bạn có chắc chắn không?"* $\to$ Bấm *"Xác nhận Công bố"*.
- **Phản hồi thành công:** Toast thông báo *"Đã ban hành thành công Chính sách Review Gates SE Fall 2026 (Phiên bản 1.0)"*. Trạng thái chuyển sang badge xanh lá `PUBLISHED`.
- **Giám sát vận hành:** Giáo vụ chuyển sang tab *"Ma trận Tiến độ Đồ án"* (`/department/projects/progress-matrix`). Bảng hiển thị toàn bộ 25 đồ án của kỳ, mỗi cột là 1 Gate, hiển thị tức thời đồ án nào đã PASS, đồ án nào đang WAITING_REVIEW hoặc REVISION_REQUIRED.

---

## 3. HÀNH TRÌNH 2: SINH VIÊN TRƯỞNG NHÓM NỘP MINH CHỨNG & KHẮC PHỤC YÊU CẦU CHỈNH SỬA (STUDENT LEADER JOURNEY)

### Mục tiêu:
Trưởng nhóm nhận thông báo Gate 2 (Thiết kế kiến trúc) bị yêu cầu sửa đổi (`REVISION_REQUIRED`), xem nhận xét của thẩm định viên, tải lên bản sửa đổi v2 và nộp lại bài.

### Chi tiết Luồng Thao tác:
- **Bắt đầu:** Sinh viên đăng nhập $\to$ Trang chủ `/project/workspace`.
- **Khám phá:** Nhìn thấy ngay `NextActionBanner` ở đầu trang:
  > ⚠️ **Yêu cầu chỉnh sửa Gate 2 (Kiến trúc phần mềm):** Thẩm định viên ThS. Nguyễn Văn A yêu cầu bổ sung sơ đồ CSDL và làm rõ API bảo mật. Hạn nộp lại: 25/10/2026.
- **Thao tác nộp bài:**
  1. Click nút *"Xem nhận xét & Nộp bản sửa đổi"* ngay trên Banner (1 click).
  2. Hệ thống mở trực tiếp Modal nộp bài tại `/project/timeline`.
  3. Trưởng nhóm xem nhận xét chi tiết của lần nộp v1 (lưu vết bất biến).
  4. Chọn tệp minh chứng mới: `AI-PMS_SDD_v2.0_Final.pdf`.
  5. Nhập ghi chú giải trình: *"Nhóm đã bổ sung sơ đồ ERD chi tiết tại trang 24 và đặc tả API bảo mật JWT tại trang 35."*
  6. Bấm *"Nộp bản sửa đổi v2"*.
- **Phản hồi thành công:**
  - Cổng Gate 2 chuyển sang màu xanh dương `WAITING_REVIEW`.
  - **Tiến độ học vụ KHÔNG tăng** (giữ nguyên 20% của Gate 1) vì minh chứng chưa được thẩm định viên duyệt đạt.
  - Toast thông báo: *"Đã nộp thành công minh chứng v2. Hồ sơ đã chuyển đến Thẩm định viên."*
- **Xử lý sự cố:** Nếu thành viên (Member) bấm vào nút này, hệ thống hiển thị thông báo: *"Chỉ Trưởng nhóm (Leader) mới có quyền nộp minh chứng chính thức. Bạn có thể tải file lên kho lưu trữ để Trưởng nhóm rà soát."*

---

## 4. HÀNH TRÌNH 3: SINH VIÊN THÀNH VIÊN THỰC HIỆN TASK & HỖ TRỢ LEADER (STUDENT MEMBER JOURNEY)

### Mục tiêu:
Thành viên xem các công việc cá nhân được giao, cập nhật tiến độ task, tham gia cuộc họp và phối hợp chuẩn bị tài liệu nộp cổng mà không can thiệp vào thẩm quyền của Leader.

### Chi tiết Luồng Thao tác:
- **Bắt đầu:** Đăng nhập $\to$ Vào `/project/workspace`.
- **Khám phá:** Màn hình tự động lọc theo chế độ xem *"Công việc của tôi"* (`focusedMemberId === currentUserId`).
- **Thao tác thực thi:**
  1. Xem danh sách 3 task được giao trong tuần: `Viết mã kiểm thử API Auth`, `Tối ưu hóa bảng CSDL`, `Soạn thảo tài liệu API`.
  2. Click vào task `Viết mã kiểm thử API Auth` $\to$ Cập nhật trạng thái từ `IN_PROGRESS` sang `DONE`.
  3. Tải file `API_Test_Report.pdf` lên kho tệp chung `/project/files`.
  4. Mở tab `/project/meetings` để kiểm tra lịch họp cố vấn với GVHD vào 14:00 thứ Tư.
- **Minh bạch ranh giới:** Khi mở `/project/timeline`, thành viên xem được đầy đủ toàn bộ tiến độ và nhận xét của thầy cô, nhưng nút *"Nộp hồ sơ"* hiển thị nhãn: *"Chỉ dành cho Trưởng nhóm nộp"*.

---

## 5. HÀNH TRÌNH 4: GIẢNG VIÊN HƯỚNG DẪN GIÁM SÁT & XÁC NHẬN BÁO CÁO TUẦN (PRIMARY SUPERVISOR JOURNEY)

### Mục tiêu:
Giảng viên hướng dẫn kiểm tra nhanh 5 đồ án đang phụ trách, phát hiện 1 đồ án có nguy cơ trễ hạn, duyệt 2 báo cáo tiến độ định kỳ và để lại nhận xét định hướng.

### Chi tiết Luồng Thao tác:
- **Bắt đầu:** Đăng nhập $\to$ Trang tổng quan `/supervisor/dashboard`.
- **Khám phá:** Khối chỉ số đầu trang hiển thị: `5 Đồ án phụ trách`, `2 Báo cáo chờ duyệt (Warning amber)`, `1 Công việc quá hạn`.
- **Thao tác duyệt nhanh:**
  1. Trong bảng danh sách đồ án, click *"Xem 2 báo cáo chờ duyệt"* $\to$ Mở ngay ngăn kéo (Drawer) duyệt nhanh.
  2. Báo cáo của Nhóm 03: Đọc nội dung công việc tuần qua, xem tỷ lệ hoàn thành task (85%).
  3. Nhập nhận xét: *"Nhóm cần đẩy nhanh tiến độ làm Mockup giao diện để kịp nộp Gate 2 tuần sau."*
  4. Bấm *"Xác nhận báo cáo"* $\to$ Badge báo cáo chuyển thành `Đã xác nhận`.
- **Ranh giới học thuật:** Giảng viên thấy rõ dòng nhắc: *"Xác nhận báo cáo tiến độ tuần là hoạt động theo dõi hướng dẫn nội bộ; việc thông qua Cổng thẩm định chính thức sẽ do Thẩm định viên được phân công phê duyệt."*

---

## 6. HÀNH TRÌNH 5: GIẢNG VIÊN THẨM ĐỊNH KIỂM TRA MINH CHỨNG & CHỐT QUYẾT ĐỊNH CỔNG (REVIEWER JOURNEY)

### Mục tiêu:
Thẩm định viên mở danh sách các đồ án được phân công thẩm định Cổng (`AssignedGateReviewPage`), mở hồ sơ nộp lại v2 của Nhóm 01, xác minh minh chứng và phê duyệt ĐẠT (`PASSED`).

### Chi tiết Luồng Thao tác:
- **Bắt đầu:** Vào menu *"Thẩm định Review Gates"* (`/review/gate-assignments`).
- **Khám phá:** Bảng phân công hiển thị 3 hồ sơ. Hồ sơ Nhóm 01 có badge cam: `YÊU CẦU SỬA ĐỔI (Đã có bản nộp lại v2)`.
- **Thao tác thẩm định:**
  1. Click *"Mở hồ sơ thẩm định"* $\to$ Drawer mở ra toàn bộ chi tiết cổng.
  2. Xem danh sách minh chứng bắt buộc:
     - Minh chứng 1: `Tài liệu Thiết kế Kiến trúc SDD (v2.0)` $\to$ Bấm xem trước (Preview) tài liệu PDF $\to$ Bấm nút *"Chấp thuận minh chứng"* (`ACCEPTED`).
     - Minh chứng 2: `Biên bản xác nhận công nghệ` $\to$ Đã được chấp thuận trước đó (`ACCEPTED`).
  3. Sau khi tất cả minh chứng bắt buộc đều chuyển sang `ACCEPTED`, nút *"Phê duyệt ĐẠT Cổng (PASS)"* được kích hoạt (màu xanh lá).
  4. Nhập nhận xét thẩm định chính thức: *"Nhóm đã khắc phục đầy đủ sơ đồ CSDL và phân quyền API. Đạt yêu cầu qua cổng."*
  5. Bấm *"Xác nhận Phê duyệt ĐẠT"*.
- **Phản hồi thành công:**
  - Hệ thống gửi request kèm Concurrency Token `If-Match: "rev-v2-etag"`.
  - Cổng chuyển sang trạng thái xanh lá `PASSED`.
  - **Tiến độ học vụ của đồ án tăng chính xác một lần từ 20% lên 40%**.
  - Cổng tiếp theo (Gate 3) tự động chuyển sang trạng thái `READY`.

---

## 7. HÀNH TRÌNH 6: HƯỚNG DẪN CHUYÊN MÔN ĐỒ ÁN LIÊN NGÀNH (DISCIPLINE MENTOR JOURNEY)

### Mục tiêu:
Giảng viên thuộc Bộ môn Marketing được phân công hướng dẫn phân nhánh Marketing của một đồ án liên ngành IT + Marketing + Thiết kế.

### Chi tiết Luồng Thao tác:
- **Bắt đầu:** Vào `/mentor/workspace` $\to$ Chọn đồ án liên ngành `PRJ-INT-01`.
- **Khám phá:** Màn hình hiển thị rõ ràng:
  - *Phạm vi phụ trách:* Nhánh Chuyên môn Marketing (Trọng số 20%).
  - *Tiến độ nhánh Marketing:* 50% (Đã đạt Mốc Kế hoạch Truyền thông, đang chờ Duyệt Bộ nhận diện nội dung).
- **Thao tác chuyên môn:**
  1. Mentor mở tab `/mentor/projects/PRJ-INT-01/majors/MKT/evidence` để thẩm định bộ tài liệu Nghiên cứu Thị trường.
  2. Nhập nhận xét riêng cho sinh viên ngành Marketing trong nhóm.
  3. Xem trạng thái Khóa Tích hợp (Integration Gate Lock): Hệ thống hiển thị rõ ràng rằng Cổng Tích hợp toàn đồ án cuối kỳ đang bị khóa cho đến khi cả ngành IT, Marketing và Design đều hoàn thành các cổng chuyên môn của mình.

---

## 8. HÀNH TRÌNH 7: QUẢN TRỊ VIÊN QUẢN LÝ VÒNG ĐỜI TÀI KHOẢN & RBAC (SYSTEM ADMINISTRATOR JOURNEY)

### Mục tiêu:
Quản trị viên tìm kiếm tài khoản một sinh viên, kiểm tra trạng thái kích hoạt, gán vai trò trợ giảng và theo dõi nhật ký đăng nhập.

### Chi tiết Luồng Thao tác:
- **Bắt đầu:** Đăng nhập $\to$ `/admin/access`.
- **Khám phá:** Nhập mã sinh viên `SE170123` vào ô tìm kiếm $\to$ Bấm *"Áp dụng"*.
- **Thao tác quản trị:**
  1. Kết quả hiển thị: Sinh viên Nguyễn Văn B, ngành Kỹ thuật Phần mềm, Trạng thái: `ACTIVE`.
  2. Click *"Chi tiết tài khoản"* $\to$ Xem các vai trò đang có.
  3. Bấm *"Khóa tài khoản (Suspend)"* khi có yêu cầu từ Phòng Công tác sinh viên $\to$ Nhập lý do: *"Tạm ngừng học tập kỳ Fall 2026"* $\to$ Xác nhận.
  4. Chuyển sang tab *"Nhật ký bảo mật"* $\to$ Kiểm tra bản ghi kiểm toán ghi nhận: `Admin đã khóa tài khoản SE170123 vào lúc 10:15:30 18/10/2026`.

---

## 9. BẢNG SO SÁNH HIỆU QUẢ THAO TÁC TRƯỚC VÀ SAU CẢI TIẾN

| Luồng công việc (Workflow) | Số bước trước cải tiến (Before) | Số bước sau cải tiến (After) | Tỷ lệ giảm thao tác thừa | Điểm cải thiện cốt lõi |
|---|:---:|:---:|:---:|---|
| **Sinh viên nộp lại minh chứng Gate bị REVISION** | 6 bước (tìm trang, mở timeline, chọn cổng, tải file, nhập ghi chú, gửi) | **2 bước** (bấm nút trên Next Action Banner $\to$ chọn file và nộp ngay trên Modal) | **Giảm 66%** | Có Banner điều hướng ngữ cảnh trực tiếp. |
| **Giảng viên hướng dẫn duyệt báo cáo tiến độ tuần** | 5 bước (mở dashboard, click đồ án, vào menu báo cáo, tìm tuần, bấm duyệt) | **2 bước** (mở Action Inbox trên Dashboard $\to$ bấm Xác nhận) | **Giảm 60%** | Gom việc khẩn cấp về một chỗ. |
| **Giáo vụ kiểm tra tiến độ Cổng toàn bộ đồ án** | 4 bước (mở từng đồ án để kiểm tra tiến trình) | **1 bước** (mở trực tiếp Ma trận Tiến độ Review Gates) | **Giảm 75%** | Bảng ma trận tổng hợp toàn khóa. |
| **Thẩm định viên phê duyệt ĐẠT Cổng** | 5 bước (tìm menu, chọn đồ án, đối chiếu file, nhập lý do, duyệt) | **2 bước** (mở hồ sơ từ inbox $\to$ bấm Duyệt ĐẠT khi đủ điều kiện) | **Giảm 60%** | Nút bấm thông minh có kiểm tra điều kiện tự động. |
