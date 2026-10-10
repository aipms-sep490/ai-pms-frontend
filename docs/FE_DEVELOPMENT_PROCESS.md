# Quy trình phát triển Frontend AI-PMS

Áp dụng cho mọi dev FE từ 12/10/2026. Đi kèm kế hoạch tổng `AI-PMS_Ke_hoach_Hoan_thien_2026-10-09.md` (thư mục dự án), `design-system/ai-pms/MASTER.md` (chuẩn giao diện) và file giao việc của BE (`BE_KhaiNQ_Nhiem_vu.md`, `BE_DongVV_Nhiem_vu.md`).

## 1. Nguyên tắc bất biến
1. **BE là nguồn sự thật.** FE không tự tính điểm, không tự suy quyền, không tự đổi trạng thái. Nút hành động chỉ hiện khi BE trả quyền (`actions`, `execution-actions`, `canPublish`…); nút bị chặn phải ghi lý do.
2. **Không có hợp đồng thì không nối API.** Endpoint mới chỉ được gọi khi BE đã merge controller + tài liệu trong `ai-pms-backend/docs` (request, response, mã lỗi). Trước đó FE dựng màn bằng mock (`VITE_DATA_MODE=mock`) hoặc fixture test.
3. **Không ghi lên DB dùng chung `AI_PMS`** từ máy dev hay test. Dùng tài khoản/dữ liệu seed riêng do BE cấp.
4. **Một nguồn giao diện.** Chỉ dùng token trong `src/index.css` (`bg-primary`, `text-ink`, `border-line`…). Cấm hex trong tsx/css trang, cấm chữ dưới 12px, cấm palette Tailwind thô cho trạng thái (dùng `StatusBadge`/`Badge`).

## 2. Vòng đời một ticket FE

| Bước | Việc | Đầu ra |
|---|---|---|
| 1. Nhận ticket | Đọc ticket FE-xx trong kế hoạch, mở ticket BE tương ứng (nếu có). Ghi rõ role, route, trạng thái project được phép. | Checklist trong mô tả PR |
| 2. Kiểm tra hợp đồng | Đọc controller + DTO + doc BE. Nếu thiếu field/mã lỗi → hỏi trong nhóm, **không đoán**. | Kiểu TS trong `src/types/backend` hoặc `features/*/api` |
| 3. Thiết kế màn | Chọn 1 trong 5 khuôn trang (Dashboard, List, Detail/Workspace, Form/Wizard, Review/Scoring). Viết 5 trạng thái: loading, empty, partial, 403/404, 409/lỗi. | Phác thảo trong PR hoặc `design-system/ai-pms/pages/<trang>.md` |
| 4. Code | Nhánh `feat/FE-xx-<mo-ta>` từ `develop`. Tái dùng `components/ui` trước khi tạo mới; component dùng ≥2 nơi phải đưa vào `components/ui`. | Code + test |
| 5. Test | Vitest cho API wrapper và hook; test component cho trạng thái lỗi/quyền; Playwright cho luồng chính nếu đổi route. | Test xanh |
| 6. Tự kiểm | Chạy bộ lệnh ở mục 4. Mở trang ở 375 / 768 / 1024 / 1440 px, kiểm bàn phím và focus. | Ảnh chụp đính kèm PR |
| 7. PR | PR vào `develop`, tiêu đề `FE-xx: …`, link PR BE liên quan. Mô tả Trước/Sau. | 1 người review |
| 8. Nghiệm thu chung | Chạy luồng trên staging với tài khoản đúng role (không dùng Admin thay). | Ghi vào `docs/FINAL_FE_BE_SYNC_AUDIT.md` |

## 3. Đồng bộ với BE (KhaiNQ, DongVV)
- **Tiền tố chung:** ticket BE `BE-07` ↔ FE dùng cùng số khi là cặp (ví dụ FE-07 lọc task theo ngành chờ BE-07).
- **Thứ tự:** BE merge hợp đồng (controller + doc + test) → FE nối API → nghiệm thu chung. FE có thể làm song song bằng mock nhưng không merge phần gọi API trước BE.
- **Thay đổi hợp đồng:** BE phải báo trước khi đổi tên field, enum, URL hoặc mã lỗi. FE cập nhật kiểu TS trong cùng ngày.
- **Enum trạng thái:** tên giống hệt DB/API (`ACTIVE`, `FINAL_SUBMISSION`…). Nhãn tiếng Việt chỉ đặt trong `components/ui/display-label.ts`.
- **Mã lỗi:** 403 và 404 hiển thị giống nhau (không lộ tồn tại); 409 giữ nội dung đang nhập và tải lại; 422 hiển thị danh sách `issues`/`errors` theo trường.
- **Họp đồng bộ:** 15 phút mỗi thứ Hai và thứ Năm, xem bảng ticket đang chờ phía bên kia.

## 4. Lệnh bắt buộc trước khi mở PR
```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
git diff --check
```
Không thêm cảnh báo lint mới, không tắt rule, không skip test.

## 5. Chuẩn giao diện tóm tắt
- **Màu:** `primary` #0F5B4E (điều hướng, nút chính), `ink` chữ chính, `ink-muted` chữ phụ, `line` viền nhẹ, `status-success/warning/error` cho trạng thái.
- **Chữ:** tối thiểu 12px (`text-xs`). Tiêu đề trang `text-2xl` font heading.
- **Khoảng cách:** bội số 4/8; giữa các section 24px, trong card 16px.
- **Khung trang:** dùng `WorkspacePage`; header ngữ cảnh → số liệu → danh sách/form → điều hướng liên quan.
- **Bảng:** tiêu đề cột rõ, phân trang từ BE (`page`, `pageSize`, `totalCount`), không tự gom nhiều trang.
- **Tải tệp:** dùng `httpGetBlob`/`httpPostForm` sẵn có; giải phóng object URL sau khi tải.

## 6. Definition of Done cho FE
- [ ] Đúng hợp đồng BE đã merge, không field ngoài hợp đồng
- [ ] Đủ 5 trạng thái dữ liệu; nút bị chặn có lý do
- [ ] Không tràn ngang ở 375px, focus nhìn thấy, chữ ≥12px, không hex mới
- [ ] Test mới cho logic quyền/lỗi; toàn bộ test cũ xanh
- [ ] Ảnh chụp trước/sau trong PR
- [ ] Đã chạy với tài khoản đúng role trên staging (hoặc ghi rõ đang chờ BE)
