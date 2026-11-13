# Quy tắc làm việc do người dùng yêu cầu (AI-PMS Frontend)

## Quy tắc Quản trị Kỹ thuật Chung (Bắt buộc cho cả FE & BE)
Toàn bộ kỹ sư và agent khi làm việc trên Frontend bắt buộc phải tuân thủ nghiêm ngặt **8 Quy tắc Quản trị Kỹ thuật Chung** được đồng bộ tại:
[AI_PMS_SHARED_GOVERNANCE_RULES.md](file:///F:/AI-PMS/ai-pms-frontend-fresearch-20261113/docs/rules/AI_PMS_SHARED_GOVERNANCE_RULES.md)

### Tóm lược 8 quy tắc cốt lõi:
1. **Thứ tự nguồn thẩm quyền:** Yêu cầu người dùng → Business rule/DB/BE contract → FE representation → Ảnh tham khảo.
2. **Phân quyền đa chiều:** Role + Persisted state + Scope (Organization/Department/Major/Assignment); FE guard chỉ phục vụ UX.
3. **Liêm chính dữ liệu:** Tuyệt đối không tự tạo endpoint, trạng thái, quyền, điểm số, mock data thành production, “online” hay vị trí địa lý.
4. **Ma trận trạng thái:** Mỗi màn hình bắt buộc có Loading, Empty, Filtered-Empty, Blocked, 401/403/404, 409, Lỗi mạng/5xx, Retry, Read-only và Success.
5. **Bảo toàn dữ liệu & Mutation:** Bảo toàn draft khi gặp lỗi 400/409/mạng; mutation chỉ báo thành công sau khi BE xác nhận; đọc lại (readback) dữ liệu/token sau ghi.
6. **Thương hiệu & A11y:** Dùng logo, mascot, palette sáng (`#F6FAFE`, `#0868B8`) và token AIPMS; cấm hardcode hex/rgba; WCAG 2.1 AA, keyboard/focus, `prefers-reduced-motion`.
7. **Phân định hoàn thiện:** Phân biệt minh bạch IMPLEMENTED, TESTED, RUNTIME VERIFIED, PROPOSED, BLOCKED.
8. **Truy vết kỹ thuật:** Mỗi thay đổi có Source → Vấn đề → Giải pháp → Test → Giới hạn; không hạ chuẩn test hoặc che lỗi bằng mock.

Chi tiết giao diện và tương tác tuân theo:
- Design system: [MASTER.md](file:///F:/AI-PMS/ai-pms-frontend-fresearch-20261113/design-system/ai-pms/MASTER.md)
- Interaction rules: [02-INTERACTION-RULES.md](file:///F:/AI-PMS/ai-pms-frontend-fresearch-20261113/docs/uiux/02-INTERACTION-RULES.md)

---

## Nhánh cho từng task & Ngoại lệ chỉ định trực tiếp
- **Chỉ định trực tiếp cho Task Hiện tại:**
  - Nhánh FE được chỉ định duy nhất: `feat/fe-fresearch-reference-20261113`.
  - Đây là ngoại lệ trực tiếp của người dùng đối với quy tắc "task mới tạo nhánh mới". Tuyệt đối không tạo nhánh thay thế.
  - Chỉ commit và push lên đúng nhánh `feat/fe-fresearch-reference-20261113`.
  - Không tạo PR, không merge, không rebase/reset hoặc đưa code lên `develop`.
- **Quy tắc chung thông thường:**
  - Mỗi task mới tạo nhánh từ `develop`.
  - Kiểm tra `git status`, commit gốc, không force push hoặc stash đè lên thay đổi chưa commit.

---

## Phân công FE2 & Ranh giới Thẩm quyền
- FE2 phụ trách: Router, sidebar, shared guards, evaluation workspace, result publication.
- FE1 phụ trách: Student registration, qualification, team management, project execution workspace, StudentProjectResultPage.
- Tái sử dụng contract hiện có; Backend sở hữu quyền, trạng thái, công thức tính điểm và persistence.
