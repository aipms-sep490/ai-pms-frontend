# BẢNG PHÂN TÍCH KIẾN TRÚC THÔNG TIN (IA) TRANG CHI TIẾT ĐỒ ÁN (FE2-B1)

> **Căn cứ:** Master Prompt v6.1 §3, §4; `01_FE_PLAN_V2.md` §PHA B (FE2-B1); Rule `ai-pms-product-experience.md` §2.  
> **Hiện trạng:** Figure 47 (`references/ai-pms-guide/figure-047.png`) — trang Thẩm định đề cương (`/department/projects/:id`) có 9–10 tab cuộn xuống 2 dòng ở độ phân giải 1280px / 1440px, vi phạm nguyên tắc *"tabs containing unrelated domains"* và *"unbounded nested navigation"*.

---

## 1. Bảng phân loại 10 tab theo Job-to-be-done (JTBD)

| # | Tên Tab | Tuyến đường (URL) | Actor chính | Tần suất sử dụng | Giai đoạn vòng đời đồ án | Capability / Quyền yêu cầu |
|---|---|---|---|---|---|---|
| 1 | **Thẩm định** | `/department/projects/review/:id` | Trưởng bộ môn / CB Phụ trách | Cao (đầu kỳ) | Khởi tạo & Phê duyệt đề tài | `review_project`, `approve_project`, `request_revision` |
| 2 | **Điều phối và hướng dẫn** | `/department/projects/:id/governance` | Trưởng bộ môn / Điều phối viên | Trung bình (suốt kỳ) | Giám sát thực hiện & Phân công GVHD | `assign_supervisor`, `view_governance` |
| 3 | **Phương án đánh giá** | `/department/projects/:id/evaluation-schemes` | Trưởng bộ môn / Phụ trách học vụ | Thấp - Trung bình (giữa kỳ) | Đánh giá & Khung tiêu chí | `manage_evaluation_schemes`, `view_rubric` |
| 4 | **Phân công người chấm** | `/department/projects/:id/evaluators` | Trưởng bộ môn / Hội đồng | Trung bình (trước bảo vệ) | Phân công phản biện / Hội đồng chấm | `assign_evaluators`, `view_assignments` |
| 5 | **Yêu cầu bàn giao** | `/department/projects/:id/final-requirements` | Bộ môn / P. Đào tạo | Thấp (cuối kỳ) | Chuẩn bị nghiệm thu & bàn giao | `manage_final_requirements` |
| 6 | **Hồ sơ bàn giao** | `/department/projects/:id/final-submission` | Sinh viên nộp / Bộ môn duyệt | Thấp (cuối kỳ) | Nghiệm thu sản phẩm cuối | `view_final_submission`, `verify_deliverables` |
| 7 | **Kết quả** | `/department/projects/:id/result` | Bộ môn / Giảng viên / SV | Cao (cuối kỳ) | Công bố điểm & Tổng kết | `publish_results`, `view_project_result` |
| 8 | **Kho tệp** | `/department/projects/:id/files` | Tất cả các bên (Tra cứu) | Định kỳ khi cần tra cứu | Tra cứu tài nguyên xuyên suốt | `view_project_files`, `download_files` |
| 9 | **Đóng góp** | `/department/projects/:id/contributions` | Giảng viên HD / Bộ môn | Định kỳ khi đánh giá công sức | Tra cứu phân tích đóng góp thành viên | `view_contributions` |
| 10 | **Lịch bảo vệ (nếu bật)** | `/department/projects/:id/defense` | Hội đồng / Bộ môn | Thấp (đợt bảo vệ) | Tổ chức bảo vệ đề tài | `view_defense_schedule` |

---

## 2. Phân nhóm miền nghiệp vụ

1. **Miền Giai đoạn Vòng đời Chính (Lifecycle Core - 5 tác vụ cốt lõi của Bộ môn):**
   - Thẩm định đề cương (Duyệt bắt đầu)
   - Điều phối & Hướng dẫn (Phân công GVHD & giám sát)
   - Phương án đánh giá (Thiết lập barem & hội đồng)
   - Phân công người chấm (Chỉ định giảng viên chấm)
   - Kết quả (Tổng kết & công bố kết quả đồ án)
2. **Miền Nghiệm thu Bàn giao (Deliverables & Submission):**
   - Yêu cầu bàn giao (`final-requirements`)
   - Hồ sơ bàn giao (`final-submission`)
3. **Miền Tài nguyên Tra cứu (Supporting Resources):**
   - Kho tệp đồ án (`files`)
   - Đóng góp thành viên (`contributions`)

---

## 3. So sánh 3 phương án kiến trúc thay thế

| Tiêu chí | (a) Stepper vòng đời + Drawer tài nguyên | (b) 5 Tab chính + Dropdown "Thao tác khác" | (c) Tách route con / Cây điều hướng độc lập |
|---|---|---|---|
| **Trải nghiệm 1280px / 1440px** | Gọn, không wrap dòng | **Gọn gàng, vừa khít 1 dòng (≤ 6 items), hoàn toàn không wrap** | Phân tầng sâu, tốn nhiều click |
| **Bảo toàn 100% URL Deep Link** | Khó (Drawer làm mất link tĩnh trực tiếp của tài nguyên) | **Bảo toàn 100% tất cả deep links hiện có** | Có nguy cơ thay đổi cấu trúc URL cũ |
| **Tương thích Mobile** | Cần viết lại drawer phức tạp | **Giữ nguyên `<select>` thân thiện, chạm 1 bước** | Phức tạp cho mobile |
| **Độ rủi ro với test suite hiện có** | Cao (dễ gãy các test click tab) | **Rất thấp (các `<NavLink>` vẫn tồn tại trong DOM)** | Cao |
| **Lý do chọn/loại** | *Loại:* Drawer gây mất khả năng bookmark trực tiếp kho tệp/đóng góp. | **CHỌN: Đảm bảo không wrap, giữ vững deep links và backward compatibility.** | *Loại:* Chia nhỏ route làm người dùng phải bấm back nhiều lần. |

---

## 4. Quyết định kiến trúc (Đề xuất duy nhất)

- **Áp dụng Phương án (b):**
  - Hiển thị trực tiếp 5 tab chính đại diện cho các mốc hành động quan trọng nhất của Bộ môn:
    1. `Thẩm định`
    2. `Điều phối & hướng dẫn`
    3. `Phương án đánh giá`
    4. `Phân công người chấm`
    5. `Kết quả`
  - Gom các tác vụ tra cứu & nghiệm thu còn lại vào dropdown accessible **"Thao tác khác ▾"**:
    - `Yêu cầu bàn giao`
    - `Hồ sơ bàn giao`
    - `Kho tệp`
    - `Đóng góp`
  - **Trạng thái chủ động (Active Awareness):** Nếu người dùng truy cập trực tiếp deep link vào 1 trong 4 tab phụ (ví dụ: `/department/projects/:id/files`), nút dropdown "Thao tác khác" sẽ được kích hoạt tone `bg-primary-subtle text-primary` và hiển thị nhãn: `Thao tác khác: Kho tệp ▾`.
  - **Mobile viewport:** Duy trì `<select>` chọn nghiệp vụ gồm đầy đủ 9–10 tùy chọn, đảm bảo trải nghiệm cảm ứng một chạm.
