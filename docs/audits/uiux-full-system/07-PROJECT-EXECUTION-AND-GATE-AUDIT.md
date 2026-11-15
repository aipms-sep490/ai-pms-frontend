# Quản lý tiến trình, Gate, COLD và Defense

## Chuỗi trạng thái cần chứng minh

V5 D02 mô tả kỳ/đề tài → đủ điều kiện/đăng ký → khoa xét duyệt → supervisor nhận/ACTIVE → task, minh chứng, báo cáo, họp → Gate → final locked → chấm theo assignment → công bố/lưu trữ. D07 mô tả minh chứng bắt buộc, reviewer được phân, `PASSED` hoặc `REVISION_REQUIRED`, rồi nộp lại. Hai sơ đồ là thiết kế, không tự chứng minh runtime.

| Vùng | Bằng chứng mã hiện tại | Còn phải kiểm thử bằng FE–BE |
| --- | --- | --- |
| Milestone/sprint/task | Router có `/project/milestones/:milestoneId?`, `/project/tasks`, `/project/gantt`, workspace supervisor/mentor tương ứng; `WorkspaceTaskForm.tsx`, `TaskBoardPage.tsx` | Tạo/sửa với ngày hợp lệ, owner, dependency, scope ngành; giữ nháp, refresh, 409, task quá hạn và carry-over. |
| Báo cáo/họp/minh chứng | Router có reports, meetings, deliverables, files, evidence, contribution | Liên kết phiên bản tệp với task/Gate; quyền preview; lịch sử phản hồi; minh chứng bị thay sau khi package khóa. |
| Gate template | `ReviewGateGovernancePage.tsx` dùng `validateGateWeights`, `GateWorkbookPanel`; có trang sinh viên và reviewer | Import Excel rồi sửa trên UI và tải lại, đúng version policy; reviewer thấy criterion nào; chuyển trạng thái và thông báo. |
| Gate reviewer | BE `ReviewGateService.cs` yêu cầu hai reviewer Gate 1–3 và giữ cùng cặp, chặn supervisor active | Thử phân công người thứ ba, đổi cặp, supervisor trở thành reviewer, dự án liên ngành và tham gia nhiều role. |
| Gate decision | BE final decision chỉ `PASSED`/`REVISION_REQUIRED` và yêu cầu minh chứng bắt buộc được chấp nhận để pass | Hai reviewer, phản hồi mục, nộp sửa, resubmit, quyền tiếp tục công việc hợp lệ khi chưa pass, thời hạn. `PENDING` có thể là trạng thái tiến trình, không tự động là quyết định thứ ba. |
| Session script | FE `GateSessionScriptModal.tsx` có `FAILED`; BE `GateSessionScriptsController.cs`/service riêng | Làm rõ script verdict so với final Gate decision. `ReviewGateModeConfigPanel.tsx` có dữ liệu mô phỏng nhưng không được import vào route sản phẩm tại HEAD này. |
| Final/Defense/COLD | BE `DefenseCommitteeBinding.cs`, `ColdEvaluationBinding.cs` kiểm assignment, committee, scope và locked package; FE có route final, defense, evaluator | Tài khoản committee đúng/sai, thay assignment, snapshot version, thông báo, điểm nháp/gửi, readback và công bố. Chưa có bằng chứng runtime. |

## Chuẩn giao diện đề xuất cho một dự án đang chạy

Trang tổng quan dự án nên trả lời ngay: **đang ở chặng nào, việc gần hạn, ai đang giữ lượt, minh chứng còn thiếu, phản hồi cần sửa, hành động kế tiếp**. Có thể dùng tab tiến trình/việc/minh chứng/đánh giá trong workspace hiện có và giữ deep link route cũ. Trưởng nhóm thấy backlog và phân công; thành viên thấy việc của mình; supervisor thấy nhiều dự án và dấu hiệu cần can thiệp; mentor thấy scope ngành. Đây là `FE_COMPONENT/FE_LOGIC` đề xuất, chưa kết luận màn hiện tại kém từ browser vì chưa đăng nhập.

Gate nên hiển thị rõ **checkpoint, buổi họp, item evidence, package submission và quyết định cuối** là các thực thể khác nhau. Sắp phản hồi theo từng item và version, gom câu hỏi và yêu cầu sửa vào một khu vực có tác giả, hạn, người phụ trách. Không tạo trạng thái `FAIL` mới chỉ để giống lời mô tả; cần quyết định học vụ trước nếu quy chế thật sự yêu cầu.

## Tiêu chí nghiệm thu ưu tiên

1. Mỗi thao tác có loading, kết quả server, đọc lại sau refresh và lỗi 401/403/409/422 đúng ngữ cảnh.
2. Mọi ngày tương lai bắt buộc kiểm FE và BE; ngày chứng từ lịch sử, phiên cũ và sửa được ủy quyền vẫn có thể là quá khứ theo chính sách. Kiểm timezone, start/end, ranh giới cùng ngày và bản ghi đã có.
3. Không có supervisor chấm chính nhóm mình; reviewer Gate 1–3 là cùng hai người; Defense/COLD theo hội đồng và scope đã chốt.
4. Không công bố điểm theo tỷ lệ hoặc rubric chưa được duyệt.
