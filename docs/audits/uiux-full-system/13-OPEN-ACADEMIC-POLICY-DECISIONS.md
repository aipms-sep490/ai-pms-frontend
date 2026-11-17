# Quyết định học vụ còn mở — không tự chuẩn hóa bằng UI

Nguồn: v5.0 workbook `Decision_Register`, main specification, D02/D04/D07/D08/D09; các mục dưới là trạng thái **theo tài liệu**, chưa phải kết quả xác minh văn bản trường và dữ liệu Project Period hiện hành.

| Mục | Trạng thái nguồn | Tác động đến UI/BE và điều cần quyết định |
| --- | --- | --- |
| D4 — tỷ trọng COMMON 50 / OWN_MAJOR 30 / INDIVIDUAL 20 | Team-selected, academic open | Chỉ hiển thị khi có policy đã phê duyệt/version của kỳ; không hardcode chính thức. |
| D5 — major pass gate | Open | Không tự tính rớt chỉ từ điểm thành phần hay Gate chưa qua. |
| D6 — industry expert weighted | Open | Mặc định advisory trong baseline; không thêm quyền chấm chính thức. |
| D13 — Marketing rubric | Proposed | Cần bộ môn/đơn vị có thẩm quyền duyệt trước publish. |
| D14 — committee coverage | Open | Xác nhận số người, scope, ký và quorum theo kỳ/ngành; không suy từ ảnh FAMS. |
| D15 — course mapping | Open | Không đồng nhất Project Period với lớp học ngoài hệ thống. |
| D16 — rounding/second defense | Open | Không tự tính/làm UI công bố khi công thức và vòng bảo vệ chưa khóa. |
| IT COLD/Defense 30/70 | Chỉ ví dụ IT trong v5 | Không áp dụng mọi ngành. Cần policy theo ngành và kỳ. |
| PASS/PENDING/FAIL so với PASSED/REVISION_REQUIRED | Chưa có quyết định hợp nhất | BE Gate final hiện PASSED/REVISION_REQUIRED; `PENDING` có thể là trạng thái, `FAILED` xuất hiện ở kiểu script FE riêng. Truy chính sách, SRS/SDD và quy trình xử lý Gate không qua trước khi đổi domain enum. |
| Quy định ngày quá khứ | Theo từng nghiệp vụ | Lịch mới thường tương lai; biên bản/báo cáo lịch sử có thể quá khứ. Cần ma trận field/action/role/timezone thay cho chặn toàn cục. |
| DB-01 — dữ liệu policy hiện hành | Chưa xác minh read-only | Không khẳng định kỳ thực dùng những tỷ lệ/role/criteria trên khi chưa có SELECT có quyền và phiên bản policy. |

Người phê duyệt, hiệu lực, kỳ/ngành áp dụng, version và tài liệu quyết định phải được ghi trước bất kỳ sửa đổi domain/scoring nào. Các cải tiến trình bày chỉ dùng giá trị BE đã trả và ghi rõ “chưa cấu hình” nếu thiếu.
