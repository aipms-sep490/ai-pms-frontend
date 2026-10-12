# Quy tắc làm việc do người dùng yêu cầu

## Nhánh cho từng task

- Mỗi task mới phải tạo một nhánh mới từ `develop` đã cập nhật với `origin/develop`. Không code hoặc commit trực tiếp trên `develop`.
- Trước khi sửa file: kiểm tra `git status`, nhánh hiện tại và commit gốc; fetch remote. Chỉ cập nhật `develop` bằng fast-forward khi an toàn. Không reset, stash hoặc ghi đè thay đổi của người khác để ép checkout sạch.
- Task trước chưa merge không phải lý do để dùng tiếp nhánh cũ cho task mới. Giữ nguyên nhánh cũ; task phụ thuộc chờ merge vào `develop`, hoặc báo rõ dependency. Không âm thầm cherry-pick việc chưa duyệt.
- Một nhánh/PR cho một task có phạm vi review được. Sửa tiếp trong cùng task dùng nhánh của task đó; bắt đầu task khác tạo nhánh khác từ `develop`.
- Ngoại lệ checkpoint 12/10/2026: người dùng yêu cầu gộp bốn task FE2 đã làm cùng UI fixes/roadmap vào một nhánh tích hợp mới từ develop, push và tạo PR để tự audit/merge. Chỉ gộp trong phạm vi này; không tự merge PR vào develop hoặc bật auto-merge.
- Khi bắt đầu task, thông báo tên nhánh và baseline. Khi bàn giao, ghi validation và trạng thái commit/push/PR.

## FE2

- Kế hoạch tại `docs/fe2/FE2_ROADMAP_2026-10-09.md` đã được người dùng duyệt và yêu cầu bắt đầu ngày 09/10/2026. Triển khai task core theo roadmap; các extension vẫn cần approval/contract liên quan.
- FE2 sở hữu router/sidebar/shared guards và evaluation/result publication; FE1 sở hữu student/qualification/team/execution và StudentProjectResultPage. Phối hợp trước khi sửa bề mặt chung hoặc module của FE1, trừ khi người dùng đã yêu cầu trực tiếp.
- Tái sử dụng contract hiện có; BE quyết định authority, scope, trạng thái, scoring và persistence. Không biến CIB v4 PROPOSED/OPEN thành chính sách chính thức bằng code FE.
