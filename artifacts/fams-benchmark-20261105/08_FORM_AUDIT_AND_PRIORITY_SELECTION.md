# BẢNG KIỂM KÊ VÀ ĐÁNH GIÁ BIỂU MẪU TOÀN HỆ THỐNG (FE2-D1)

> **Căn cứ:** Master Prompt v6.1 §A4.2; `01_FE_PLAN_V2.md` §PHA D (FE2-D1); Rule `ai-pms-product-experience.md` §3 (Forms).  
> **Mục tiêu:** Rà soát 100% biểu mẫu (form/dialog/panel/inline editor) từ source code, đánh giá hiện trạng theo các tiêu chuẩn UX nhập liệu khắt khe, tính điểm ưu tiên và chọn ra 5 form cần chuẩn hóa ở FE2-D2.

---

## 1. Bảng kiểm kê và đánh giá biểu mẫu (Form Census & Assessment)

| # | Tên Biểu Mẫu | Tập tin nguồn | Actor chính | Tần suất (1-5) | Độ dài (1-5) | Hậu quả sai (1-5) | Điểm ưu tiên (FxLxC) | Label hiện/ẩn | Required rõ ràng | Helper text quy tắc BE | Validation | Error Summary | Focus first invalid | Draft retention |
|---|---|---|---|:---:|:---:|:---:|:---:|---|---|---|---|---|---|---|
| 1 | **Đăng ký đề cương đồ án** | `ProjectRegistrationFormPage.tsx` | Sinh viên (Leader) | 5 | 5 | 5 | **125** | Hiện | Đạt | Một phần | Inline + Submit | Có | Có | Có |
| 2 | **Tạo công việc nhóm** | `WorkspaceTaskForm.tsx` | Sinh viên / GVHD | 5 | 4 | 4 | **80** | Hiện | Đạt | Đầy đủ | Inline | Có | Có | Có |
| 3 | **Lên lịch cuộc họp** | `MeetingScheduleForm.tsx` | Nhóm SV / GVHD | 4 | 4 | 4 | **64** | Hiện | Đạt | Đầy đủ | Inline | Có | Có | Chưa |
| 4 | **Đề xuất đề tài ngân hàng** | `TopicContentForm.tsx` | Giảng viên / Bộ môn | 4 | 4 | 4 | **64** | Hiện | Đạt | Đầy đủ | Inline + Submit | Có | Có | Chưa |
| 5 | **Chỉnh sửa công việc (Modal/Detail)** | `TaskContentEditor` (`TaskDetailPage.tsx`) | Sinh viên / GVHD | 4 | 3 | 4 | **48** | Hiện | Đạt | Đầy đủ (UTC+7) | Inline | Có | Có | Chưa |
| 6 | **Nộp minh chứng Review Gate** | `ReviewSubmissionModal.tsx` | Sinh viên | 3 | 3 | 4 | **36** | Hiện | Đạt | Đầy đủ | Submit | Có | Có | Không |
| 7 | **Hồ sơ năng lực giảng viên** | `AcademicRecordForm.tsx` | Giảng viên | 2 | 3 | 4 | **24** | Hiện | Đạt | Một phần | Inline | Có | Có | Không |
| 8 | **Ghi nhận chứng chỉ** | `QualificationCertificateForm.tsx` | Sinh viên / CB | 2 | 3 | 3 | **18** | Hiện | Đạt | Đầy đủ | Inline | Có | Có | Không |
| 9 | **Cập nhật tiến độ / Lý do chặn** | `StatusEditor` (`TaskDetailPage.tsx`) | Thành viên nhóm | 4 | 2 | 2 | **16** | Hiện | Đạt (khi BLOCKED) | Đầy đủ | Inline | Có | Có | Không |
| 10 | **Ghi chú cuộc họp** | `MeetingNotesForm.tsx` | Thư ký cuộc họp | 3 | 2 | 2 | **12** | Hiện | Đạt | Cơ bản | Submit | Không | Có | Không |

---

## 2. Danh sách 5 Biểu Mẫu Ưu Tiên Chuẩn Hóa Cao Nhất (FE2-D2)

Dựa trên công thức xếp hạng `Điểm ưu tiên = Tần suất × Độ dài × Hậu quả sai`:

1. **`ProjectRegistrationFormPage.tsx` (125 điểm):**
   - Biểu mẫu lớn nhất và quan trọng nhất đối với sinh viên.
   - Chuẩn hóa: Phân nhóm trường học thuật theo cụm logic (Danh tính → Ngành học & Chế độ → Nội dung đề cương → Công nghệ/Lĩnh vực → Xác nhận cam kết), gắn sticky bar lưu nháp và thông báo rõ múi giờ Việt Nam.
2. **`WorkspaceTaskForm.tsx` (80 điểm):**
   - Biểu mẫu tạo việc được dùng hàng ngày.
   - Chuẩn hóa: Label luôn hiển thị, helper text ghi rõ giờ Việt Nam (UTC+7), validation `startAt <= dueAt` ngay tại thời điểm nhập, summary lỗi rõ ràng khi bỏ sót trường bắt buộc.
3. **`MeetingScheduleForm.tsx` (64 điểm):**
   - Lên lịch họp trực tuyến & tạo phòng họp video.
   - Chuẩn hóa: Mốc thời gian hiển thị rõ định dạng ngày giờ Việt Nam (UTC+7), tự động kiểm tra `bắt đầu < kết thúc`, hiển thị trạng thái phòng video và link cuộc họp.
4. **`TopicContentForm.tsx` (64 điểm):**
   - Biểu mẫu đề xuất đề tài cho đợt đăng ký.
   - Chuẩn hóa: Giữ nguyên label trên mọi trường, placeholder chỉ mang tính ví dụ, các ràng buộc độ dài tối thiểu/tối đa hiển thị dưới dạng counter / helper text thời gian thực.
5. **`TaskContentEditor` (`TaskDetailPage.tsx` / `TaskDetailModal.tsx`) (48 điểm):**
   - Chỉnh sửa thông tin công việc trong modal và trang chi tiết.
   - Chuẩn hóa: Đảm bảo inline validation rõ ràng, hiển thị rõ ràng giờ Việt Nam UTC+7, kiểm tra mốc đồ án và concurrency token.
