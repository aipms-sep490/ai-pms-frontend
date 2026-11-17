# Quy tắc làm việc do người dùng yêu cầu (AI-PMS Frontend)

## Quy tắc Quản trị Kỹ thuật Chung (Bắt buộc cho cả FE & BE)
Toàn bộ kỹ sư và agent khi làm việc trên Frontend bắt buộc phải tuân thủ nghiêm ngặt **8 Quy tắc Quản trị Kỹ thuật Chung** được đồng bộ tại:
[AI_PMS_SHARED_GOVERNANCE_RULES.md](docs/rules/AI_PMS_SHARED_GOVERNANCE_RULES.md)

### Tóm lược 8 quy tắc cốt lõi:
1. **Thứ tự nguồn thẩm quyền:** Yêu cầu người dùng → Business rule/DB/BE contract → FE representation → Ảnh tham khảo.
2. **Phân quyền đa chiều:** Role + Persisted state + Scope (Organization/Department/Major/Assignment); FE guard chỉ phục vụ UX.
3. **Liêm chính dữ liệu:** Tuyệt đối không tự tạo endpoint, trạng thái, quyền, điểm số, mock data thành production, “online” hay vị trí địa lý.
4. **Ma trận trạng thái:** Mỗi màn hình bắt buộc có Loading, Empty, Filtered-Empty, Blocked, 401/403/404, 409, Lỗi mạng/5xx, Retry, Read-only và Success.
5. **Bảo toàn dữ liệu & Mutation:** Bảo toàn draft khi gặp lỗi 400/409/mạng; mutation chỉ báo thành công sau khi BE xác nhận; đọc lại (readback) dữ liệu/token sau ghi.
6. **Thương hiệu & A11y:** Dùng logo, mascot, palette FAMS-inspired sáng (`#F8F9FB` canvas, `#C2410C` action, `#F37021` accent) và token AIPMS; cấm hardcode hex/rgba; WCAG 2.1 AA, keyboard/focus, `prefers-reduced-motion`.
7. **Phân định hoàn thiện:** Phân biệt minh bạch IMPLEMENTED, TESTED, RUNTIME VERIFIED, PROPOSED, BLOCKED.
8. **Truy vết kỹ thuật:** Mỗi thay đổi có Source → Vấn đề → Giải pháp → Test → Giới hạn; không hạ chuẩn test hoặc che lỗi bằng mock.

Chi tiết giao diện và tương tác tuân theo:
- Design system: [MASTER.md](design-system/ai-pms/MASTER.md)
- Interaction rules: [02-INTERACTION-RULES.md](docs/uiux/02-INTERACTION-RULES.md)

---

## Quy trình nhánh và merge
- Bắt đầu task mới từ `origin/develop` đã fetch, trừ khi người dùng chỉ định nhánh khác.
- Kiểm tra trạng thái checkout, commit gốc, nhánh remote và CI trước khi push hoặc merge; giữ nguyên thay đổi chưa commit của người khác.
- Chỉ merge khi người dùng yêu cầu. Xác minh đúng head, kiểm tra phụ thuộc BE/FE, đồng bộ hợp đồng và chạy test trên kết quả tích hợp trước khi cập nhật `develop`.
- Không force push, reset hay stash để ép checkout sạch. FE chỉ gọi API có hợp đồng BE tương ứng trên nhánh đã tích hợp.

---

## Phân công FE2 & Ranh giới Thẩm quyền
- FE2 phụ trách: Router, sidebar, shared guards, evaluation workspace, result publication.
- FE1 phụ trách: Student registration, qualification, team management, project execution workspace, StudentProjectResultPage.
- Tái sử dụng contract hiện có; Backend sở hữu quyền, trạng thái, công thức tính điểm và persistence.
