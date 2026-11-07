# AI-PMS — FE → BE/DB SINGLE HANDOFF LIVE REGISTER

> **Tài liệu bàn giao duy nhất (Single Source of Truth) từ Frontend sang Backend & Database.**  
> Căn cứ: Master Prompt v6.1 §6; `01_FE_PLAN_V2.md`; kiểm chứng trực tiếp trên mã nguồn `ai-pms-backend` (`develop` @ commit `8e2e958`) và môi trường staging.

---

## 0. Quy ước và Hướng dẫn dành cho BE Developer

1. **Nguyên tắc bảo toàn:** Không sửa đổi các endpoint hiện đang hoạt động bình thường — Frontend trên nhánh `feat/fe-uiux-standardisation-20261106` đã đồng bộ và kiểm thử xanh 100% với contract hiện tại.
2. **Quy chuẩn mã lỗi & Concurrency:** Mọi thao tác ghi (Write) bắt buộc nhận `concurrencyToken` (optimistic locking), trả lỗi `409 Conflict` khi lệch token và `422 Unprocessable Entity` khi vi phạm nghiệp vụ.
3. **Audit Log:** Mọi hành động thay đổi trạng thái vòng đời học thuật bắt buộc ghi nhận vào `AuditRecords` thông qua cơ chế của `GET /api/v1/security/audit-logs`.
4. **Contract Example:** Sau khi tạo/sửa endpoint, bổ sung file mẫu JSON vào `docs/contracts/cib-v4/examples/` trên repo Backend để Frontend chạy lệnh `pnpm run sync-contracts` tự động đồng bộ.
5. **Độc lập triển khai:** 5 ticket dưới đây (`BE-16-01` đến `BE-16-05`) hoàn toàn độc lập, có thể phân chia song song cho các lập trình viên Backend.

---

## TỔNG HỢP DANH SÁCH TICKET BÀN GIAO BE / DB

| Mã Ticket | Nghiệp vụ chức năng | Mức ưu tiên | Trạng thái hiện tại | Ảnh hưởng tới Frontend |
|---|---|:---:|:---:|---|
| **BE-16-01** | Lịch làm việc và ngày nghỉ lễ cấp đợt đồ án (`ProjectPeriodCalendar`) | **P1 (Cao nhất)** | `GAP_CONFIRMED` | Tính sai hạn 5 ngày sửa đề cương và 72h kháng nghị khi rơi vào Tết/lễ |
| **BE-16-02** | Danh mục thực thể Phòng (`Rooms`) & Danh sách bảo vệ cấp kỳ | **P1** | `GAP_CONFIRMED` | Mở khóa màn hình Lưới phòng × Khung giờ bảo vệ toàn trường |
| **BE-16-03** | Quyền Trưởng bộ môn ghi đè Cổng thẩm định (`Gate Override`) | **P2** | `GAP_CONFIRMED` | Nút "Ghi đè thẩm định" trên panel phán quyết ActionVerdict |
| **BE-16-04** | Sinh viên / GV rút yêu cầu đính chính kết quả (`Withdraw Correction`) | **P2** | `GAP_CONFIRMED` | Nút "Thu hồi yêu cầu" trên bảng đơn đính chính |
| **BE-16-05** | Tải file nén ZIP toàn bộ minh chứng của Cổng (`Download Gate ZIP`) | **P3** | `GAP_CONFIRMED` | Nút "Tải toàn bộ tài liệu cổng" cho giảng viên phản biện |
| **BE-16-06** | Thống kê số lượng task theo cột Kanban (`Task Board Summary`) | **P3** | `GAP_CONFIRMED` | Hiển thị tổng số task thật theo từng trạng thái trên board |
| **BE-16-07** | Quy chế tổ chức bảo vệ Review 3–4 Offline | **Chờ chính sách** | `POLICY_PENDING` | Chờ văn bản chốt quy tắc điểm danh và thành phần hội đồng |

---

## CHI TIẾT TỪNG TICKET KỸ THUẬT

### 1. BE-16-01: Lịch làm việc và Ngày nghỉ lễ cấp đợt đồ án (`ProjectPeriodCalendar`)

* **Bối cảnh nghiệp vụ:** Quy chế học vụ quy định:
  - Sinh viên có **5 ngày làm việc (business days)** để chỉnh sửa đề cương/minh chứng sau khi Cổng thẩm định trả về `REVISION_REQUIRED`.
  - Sinh viên có **72 giờ làm việc** để nộp đơn kháng nghị sau khi công bố kết quả.
  Hiện tại Backend đang cộng ngày lịch thuần túy (`DateTimeOffset.AddDays`). Nếu mốc rơi vào kỳ nghỉ Tết Nguyên đán hoặc lễ 30/4–1/5, sinh viên bị mất thời gian hợp lệ.
* **Bằng chứng mã nguồn:** File `src/AIPMS.Application/Features/Semesters/DTOs/PeriodPolicyDtos.cs` chỉ có 7 trường cấu hình quy mô nhóm, hoàn toàn không có trường ngày làm việc/ngày nghỉ lễ.
* **Đặc tả Backend & Database:**
  1. **Tạo bảng `ProjectPeriodCalendars`:**
     - `Id` (PK, bigint)
     - `ProjectPeriodId` (FK, bigint, unique)
     - `WorkingDaysOfWeek` (int / bitmask: quy định các ngày làm việc trong tuần, mặc định Thứ 2 đến Thứ 7)
     - `HolidaysJson` (text/json: mảng danh sách `{ Date: "YYYY-MM-DD", Name: string, IsRecurring: bool }`)
     - `ConcurrencyToken` (string/guid)
  2. **Các Endpoint API đề xuất:**
     - `GET /api/v1/project-periods/{id}/calendar` — Lấy cấu hình lịch nghỉ lễ của đợt.
     - `PUT /api/v1/project-periods/{id}/calendar` — Cập nhật lịch làm việc/nghỉ lễ (yêu cầu `concurrencyToken`).
     - `POST /api/v1/project-periods/{id}/calendar/load-vn-holidays` — Tự động nạp danh mục ngày nghỉ lễ chính thức của Việt Nam trong khoảng thời gian diễn ra đợt học (chú ý: Tết Âm lịch tra cứu theo bảng dữ liệu, không tính công thức).
  3. **Service xử lý hạn chót:**
     - Tạo service `IWorkingDayCalculator` với phương thức `AddWorkingDays(DateTimeOffset fromDate, int businessDays, long projectPeriodId)`.
     - Thay thế các lời gọi `AddDays` / `AddHours` tính hạn chót thẩm định và kháng nghị bằng service này.
     - *Fallback an toàn:* Nếu đợt chưa cấu hình lịch, fallback về cộng ngày lịch cũ và ghi warning log.

---

### 2. BE-16-02: Danh mục thực thể Phòng (`Rooms`) & Danh sách bảo vệ cấp kỳ

* **Bối cảnh nghiệp vụ:** Khoa và Bộ môn cần phân công phòng bảo vệ đồ án tốt nghiệp, đảm bảo phòng đủ chỗ cho hội đồng + sinh viên và **tuyệt đối không bị trùng phòng giữa các hội đồng**.
* **Bằng chứng mã nguồn:**
  - `DefenseSessionDto` và `ScheduleDefenseRequest` hiện đang lưu `room` dưới dạng **chuỗi tự do (`string`)**. Do đó `A201`, `a-201`, `A 201` bị xem là 3 phòng khác nhau.
  - Endpoint `GET /api/v1/projects/{projectId}/defense-sessions` chỉ trả buổi bảo vệ của duy nhất 1 đồ án, không có cách nào lấy toàn bộ buổi bảo vệ của đợt để xếp lịch tổng thể.
* **Đặc tả Backend & Database:**
  1. **Tạo bảng `Rooms` (Master Data):**
     - `Id` (PK, bigint)
     - `Code` (varchar, unique, chuẩn hóa chữ hoa không dấu: `A-201`, `G-214`)
     - `Building` (varchar: Tòa nhà Alpha, Tòa Beta...)
     - `Floor` (int: Tầng)
     - `Capacity` (int: Sức chứa chỗ ngồi)
     - `Status` (varchar: `ACTIVE`, `MAINTENANCE`, `INACTIVE`)
  2. **API CRUD Phòng:**
     - `GET /api/v1/rooms` (hỗ trợ lọc theo `status`, `building`)
     - `POST /api/v1/rooms`
     - `PUT /api/v1/rooms/{id}`
     - `DELETE /api/v1/rooms/{id}`
  3. **Cập nhật thực thể `DefenseSession`:**
     - Bổ sung trường `RoomId` (FK nullable liên kết sang bảng `Rooms`).
     - Viết migration script chuẩn hóa các chuỗi phòng cũ chuyển sang mã `Code` tương ứng.
     - **Ràng buộc chống trùng:** Chặn không cho 2 buổi bảo vệ có cùng `RoomId` và khoảng thời gian `[StartAt, EndAt)` giao nhau (enforce ở cả Application Service và DB constraint). Trả `409 Conflict` kèm thông tin buổi đang chiếm phòng nếu trùng.
  4. **Các Endpoint mở khóa cho Frontend:**
     - `GET /api/v1/project-periods/{id}/defense-sessions` — Trả về toàn bộ các buổi bảo vệ trong kỳ thuộc phạm vi quản lý của khoa/bộ môn (kèm thông tin phòng, hội đồng, thời gian, trạng thái).
     - `GET /api/v1/project-periods/{id}/rooms/availability?date=YYYY-MM-DD&from=HH:mm&to=HH:mm` — Trả về danh sách các phòng còn trống trong khung giờ được chọn.

---

### 3. BE-16-03: Ghi đè quyết định Cổng thẩm định (`Review Gate Override`)

* **Bối cảnh nghiệp vụ:** Khi hội đồng thẩm định xảy ra mâu thuẫn bất khả kháng hoặc trục trặc kỹ thuật dẫn đến bế tắc tiến trình của đồ án, Trưởng bộ môn (Department Head) có thẩm quyền tối cao can thiệp ghi đè trạng thái cổng (ví dụ: chuyển từ `REVISION_REQUIRED` sang `PASSED` hoặc ngược lại) kèm lý do giải trình bắt buộc để lưu vết thanh tra.
* **Bằng chứng mã nguồn:** `ReviewGatesController.cs` chỉ có endpoint thẩm định theo lượt thông thường, chưa có endpoint can thiệp ghi đè (`grep -rn "override" src/AIPMS.Api/Controllers/ReviewGatesController.cs` trả về rỗng).
* **Đặc tả Backend & Database:**
  1. **API Endpoint:**
     - `POST /api/v1/review-gates/{gateId}/override`
     - Payload:
       ```json
       {
         "decision": "PASSED", // hoặc FAILED, REVISION_REQUIRED
         "reason": "Giải trình căn cứ phê duyệt ghi đè... (tối thiểu 50 ký tự)",
         "concurrencyToken": "abc-xyz"
       }
       ```
  2. **Phân quyền (RBAC):**
     - Chỉ cấp quyền cho `DEPARTMENT_HEAD` đúng khoa phụ trách đồ án. Tuyệt đối **không cấp quyền cho Admin trần (bare Admin)** theo tiền lệ kiến trúc bảo mật `BE-AW-005`.
  3. **Kiểm tra và Lưu vết:**
     - Bổ sung trường `decisionSource` vào DTO trả về của Cổng: giá trị `REVIEW` (quyết định của hội đồng) hoặc `OVERRIDE` (quyết định ghi đè của Trưởng bộ môn).
     - Ghi nhận `AuditRecord`: `action = "REVIEW_GATE_OVERRIDE"`, `entityType = "ProjectGateInstance"`, lưu chi tiết trạng thái trước/sau và lý do vào `detailsJson`.
     - Cập nhật quyền `override_gate` vào endpoint `/my-capabilities` để Frontend hiển thị panel `ActionVerdict`.

---

### 4. BE-16-04: Rút yêu cầu đính chính kết quả / phúc khảo (`Withdraw Correction Request`)

* **Bối cảnh nghiệp vụ:** Sinh viên nộp đơn xin phúc khảo hoặc giảng viên gửi yêu cầu đính chính điểm nhưng nhận ra nộp nhầm file hoặc nhầm thông tin. Hiện tại không có nút rút đơn, buộc Trưởng bộ môn phải mở ra đọc và bấm "Từ chối" thủ công gây phiền toái.
* **Bằng chứng mã nguồn:** Các API kết quả (`/result/correction-requests`) chỉ có endpoint phê duyệt/từ chối từ phía người xử lý, thiếu hoàn toàn endpoint thu hồi từ phía người gửi.
* **Đặc tả Backend & Database:**
  1. **API Endpoint:**
     - `POST /api/v1/projects/{projectId}/result/correction-requests/{id}/withdraw`
  2. **Quy tắc nghiệp vụ:**
     - Chỉ cho phép chính người đã tạo đơn gọi endpoint này.
     - Chỉ được rút khi đơn đang ở trạng thái `PENDING` (nếu đơn đã được xử lý duyệt/từ chối, trả `409 Conflict`).
     - Chuyển trạng thái đơn sang `WITHDRAWN` (phân biệt rạch ròi với trạng thái `REJECTED`).
     - Ghi nhận sự kiện thu hồi vào lịch sử đồ án để hiển thị trên `HistoryTimeline`.

---

### 5. BE-16-05: Tải file nén ZIP toàn bộ minh chứng theo Cổng (`Download Gate Evidence Archive`)

* **Bối cảnh nghiệp vụ:** Một cổng thẩm định (Review Gate) thường bao gồm 10 đến 20 yêu cầu nộp minh chứng (Tài liệu đặc tả, Báo cáo kiểm thử, Slide, Biên bản...). Giảng viên phản biện hiện phải click tải từng file rất mất thời gian.
* **Bằng chứng mã nguồn:** Backend hiện chỉ có endpoint tải từng file đơn lẻ theo phiên bản `GET .../requirements/{reqId}/evidence/{ver}/download`.
* **Đặc tả Backend & Database:**
  1. **API Endpoint:**
     - `GET /api/v1/projects/{projectId}/review-gates/{gateCode}/evidence/archive`
     - Response: `application/zip` (File nén đặt tên dạng `{ProjectCode}_{GateCode}_Evidence.zip`).
  2. **Quy tắc xử lý:**
     - Nén theo cấu trúc thư mục rõ ràng: `{Mã_Yêu_Cầu}/{Phiên_Bản}_{Tên_File_Gốc}`.
     - Thực hiện streaming nén trực tiếp vào response stream, không lưu tạm file lớn trên bộ nhớ server.
     - Kế thừa đúng quyền hạn: chỉ nén những file mà người gọi được phép đọc.
     - Nếu cổng chưa có minh chứng nào được nộp, trả về `404 Not Found` kèm thông điệp rõ ràng, không trả về file zip rỗng 0 bytes.

---

### 6. BE-16-06: Thống kê số lượng Task theo từng cột Kanban (`Task Board Summary`)

* **Bối cảnh nghiệp vụ:** Bảng Kanban phân trang `pageSize=20`. Cần hiển thị tổng số việc thực tế của toàn đồ án theo từng trạng thái (ví dụ: TODO: 15, IN_PROGRESS: 4, DONE: 32) thay vì chỉ đếm được số lượng trên trang hiện tại.
* **Đặc tả Backend API:**
  - `GET /api/v1/projects/{projectId}/task-board/summary`
  - Response:
    ```json
    [
      { "status": "TODO", "count": 15 },
      { "status": "IN_PROGRESS", "count": 4 },
      { "status": "BLOCKED", "count": 2 },
      { "status": "IN_REVIEW", "count": 3 },
      { "status": "DONE", "count": 32 },
      { "status": "CANCELLED", "count": 1 }
    ]
    ```

---

### 7. Hạng mục Chờ Chính sách Học thuật: Review 3–4 Offline (`BE-16-07`)

* **Trạng thái:** `POLICY_PENDING` (Chưa triển khai code cho tới khi có văn bản quy chế chính thức).
* **Các câu hỏi nghiệp vụ cần Ban Đào tạo / Trưởng khoa chốt trước khi BE thiết kế:**
  1. Bốn đợt Review có áp dụng bắt buộc cho tất cả các kỳ học và tất cả hình thức đề tài không?
  2. Review 1 và Review 2 tổ chức Online hay Offline?
  3. Cơ cấu hội đồng: Cần tối thiểu bao nhiêu thành viên (Quorum)? Có bắt buộc Chủ tịch và Thư ký hội đồng không?
  4. Thời lượng tối đa cho mỗi phiên Review là bao nhiêu phút?
  5. Danh sách hội đồng được công bố công khai cho sinh viên trước bao nhiêu ngày?
  6. Cơ chế điểm danh và xác nhận mặt sinh viên tại phòng xử lý ra sao?
