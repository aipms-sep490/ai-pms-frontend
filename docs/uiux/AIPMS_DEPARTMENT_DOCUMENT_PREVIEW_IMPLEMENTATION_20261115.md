# Kho tài liệu mẫu bộ môn và xem nhanh Office — đối chiếu triển khai

Ngày: 2026-11-15. Chỉ áp dụng trên nhánh BE `feat/be-access-audit-20261113` và FE `feat/fe-fresearch-reference-20261113`.

## Source → vấn đề → giải pháp

- Yêu cầu của chủ hệ thống: bộ môn tải mẫu cho ngành, sinh viên xem/tải mẫu, giảng viên và người chấm xem trước file sinh viên nộp. Ảnh FAMS/F-Research là tham khảo trình bày, không quyết định quyền.
- `AcademicKnowledgeService` lưu tài liệu text để lập chỉ mục AI; `SourceFileName` không phải file gốc. Vì vậy kho file mẫu học vụ dùng bảng `department_document_templates` riêng, không đưa file vào chỉ mục AI.
- `DocumentPreviewModal` đã hiển thị PDF/ảnh, Office trước đây chỉ tải về. Bổ sung trích xuất DOCX thành đoạn văn và XLSX thành bảng chỉ đọc trên API nội bộ. Không gửi file đến dịch vụ viewer công cộng và không thực thi HTML, macro hoặc công thức.

## Nghiệp vụ và quyền

| Vai trò | Xem danh sách/tải | Tải bản mới | Công bố/thu hồi |
|---|---|---|---|
| Cán bộ bộ môn | Mọi phiên bản của ngành thuộc bộ môn mình | Có | Có, kèm concurrency token |
| Sinh viên | Bản công bố thuộc ngành cá nhân; mẫu gắn kỳ cần có đồ án trong kỳ đó | Không | Không |
| Sinh viên đồ án liên ngành | Bản công bố của các ngành thuộc đồ án và kỳ tương ứng | Không | Không |
| Admin/giảng viên không có phân công bộ môn | Không được quyền quản trị chỉ nhờ nhãn role | Không | Không |

File được kiểm tra phần mở rộng, MIME và magic/ZIP bằng `UploadValidator`, trần 20 MiB. Cùng mã/ngành/kỳ tạo phiên bản tăng dần; công bố phiên bản mới thu hồi bản đang công bố trong cùng phạm vi. File bản cũ vẫn tồn tại cho truy vết bộ môn; sinh viên không tải được bản đã thu hồi. Mọi thao tác ghi có audit và token chống ghi đè đồng thời.

API BE: `GET/POST /api/v1/academic/department-documents`, `POST /{id}/publish`, `POST /{id}/retire`, `GET /{id}/download`. FE: `/department/documents`, `/project/templates`. Route phía người dùng chỉ là gợi ý điều hướng; BE kiểm tra role, tổ chức, bộ môn, ngành, kỳ và thành viên đồ án.

## Xem nhanh Office

`DocumentPreviewModal` tiếp tục tải blob qua API tệp gốc có quyền, sau đó gửi blob đó đến `POST /api/v1/files/office-preview` trên cùng backend. Endpoint chỉ nhận phiên đăng nhập và tệp DOCX/XLSX ≤5 MiB. ZIP có trần số entry/dung lượng giải nén, cấm macro/external links; XML cấm DTD và giới hạn ký tự. DOCX hiển thị tối đa 200 đoạn văn; XLSX tối đa 3 sheet, 100 hàng, 20 cột/sheet, 500 ký tự/ô. Giá trị công thức chỉ dùng giá trị lưu sẵn, không tính toán.

Đây là **xem nhanh nội dung**, không phải bản dựng nguyên bố cục Word/Excel. Với tệp lớn, cấu trúc không hỗ trợ hoặc lỗi chuyển đổi, UI hiển thị lý do và cho tải bản gốc bằng quyền sẵn có. Khả năng chuyển DOCX ra PDF đúng bố cục vẫn cần worker LibreOffice được triển khai và kiểm chứng riêng; môi trường local hiện chưa có worker đó.

## Bằng chứng và giới hạn

- `DepartmentDocumentEndpointTests`: SQL cô lập, draft không lộ, student không publish, publish/readback/download, version 2 thay bản công bố, token cũ bị từ chối; endpoint Office 401 và grid đọc được.
- `OfficePreviewTests`: trích xuất DOCX/XLSX, từ chối oversized/unsupported/DTD/external link.
- `DepartmentDocumentsPage.test.tsx`, `DocumentPreviewModal.test.tsx`: luồng form/công bố, sinh viên không có nút quản trị, DOCX/XLSX render escaped, fallback tải về.
- Build và kiểm thử nguồn không thay thế nghiệm thu trình duyệt đăng nhập thật, DB UAT, hoặc việc duyệt đầy đủ 140 route theo role. Theo dõi trong `tasks/progress-cold-defense-20261114.md`.
