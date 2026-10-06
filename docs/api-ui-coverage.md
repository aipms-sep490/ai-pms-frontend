# Đối chiếu API và giao diện — 06/10/2026

Nguồn: Swagger staging `/swagger/v1/swagger.json`, 313 thao tác HTTP; đối chiếu thêm controller BE hiện tại. Bảng phân biệt API gọi trực tiếp, helper động, read model tương đương, alias và tích hợp nền. Có callsite không đồng nghĩa mọi mutation đã được chạy trên staging.

## Phần bổ sung

- Mẫu mốc: tạo/sửa/xóa, phiên bản, công bố, mốc trong mẫu, áp dụng cho kỳ.
- Xác minh hồ sơ học vụ và hồ sơ cá nhân.
- Tài khoản Google: xem liên kết, liên kết và gỡ liên kết bằng mật khẩu hiện tại.
- Điều kiện chứng nhận của kỳ đồ án.
- Xem trước và công bố kết quả từng sinh viên bằng token Backend.
- Điều phối: lịch báo cáo, công việc sau trao đổi, trạng thái và chi tiết để sửa.
- Phân công hướng dẫn: thay giảng viên, kết thúc phân công, bắt buộc lý do.
- Lịch sử kiểm tra điều kiện nhóm, kiểm tra lại và chốt nhóm.
- Trách nhiệm chuyên ngành đã lưu trong hồ sơ đồ án.
- Trạng thái dịch vụ và thử phân tích số liệu tiến độ.
- Trang tổng quan đồ án dành cho Admin: xem và xuất dữ liệu theo API /dashboards/admin, không hiển thị thao tác học vụ của bộ môn.
- Bổ sung thao tác xóa cấu trúc học vụ và lối vào quản lý học kỳ/kỳ đồ án.

## Phạm vi và điều kiện

- Các route theo vai trò và phân công. API nền xác thực/quyền và webhook không cần trang riêng.
- AI và Video giữ cờ triển khai hiện có; cờ không cấp quyền tài nguyên. Phòng Video đã có giao diện; cuộc gọi hai đầu chưa được xác minh trong đợt này.
- Governance hiện trả MANAGE_GOVERNANCE cho phạm vi rộng. UI yêu cầu thêm actor là bộ môn chủ trì, không phải admin nền tảng, và đồ án chưa hoàn tất/lưu trữ. Không suy diễn quyền từ vai trò chung.
- Không công bố điểm, chốt nhóm, gỡ Google hoặc thay giảng viên thật chỉ để kiểm tra giao diện. Các luồng ghi được kiểm thử với API mô phỏng; xác minh chạy thật từng mutation còn phụ thuộc dữ liệu thử và trạng thái Backend.
- 11 GET chi tiết/list dùng read model danh sách/cấu trúc có cùng DTO; không có nút gọi riêng từng endpoint này. Metadata tệp cũng hiển thị từ danh sách.

## Thống kê phân loại

- Có API gọi trong FE: 268
- Luồng trạng thái tương đương: 1
- Alias dùng chung: 4
- Đọc/duy trì phiên nền: 8
- Có API qua helper: 19
- Read model dùng chung: 12
- Tích hợp nền: 1

## Toàn bộ thao tác

| Nhóm | HTTP và đường dẫn | Giao diện/luồng | Phân loại | Bằng chứng |
|---|---|---|---|---|
| AcademicHierarchy | GET `/api/v1/academic/hierarchy` | /academic | Có API gọi trong FE | features\academic\api\academic-api.ts |
| AcademicProfiles | GET `/api/v1/users/me/academic-profile` | /profile; /academic/profile-verifications; /admin/access/users/:userId | Có API gọi trong FE | features\academic\api\profile-verification-api.ts |
| AcademicProfiles | GET `/api/v1/academic/profile-verifications` | /profile; /academic/profile-verifications; /admin/access/users/:userId | Có API gọi trong FE | features\academic\api\profile-verification-api.ts |
| AcademicProfiles | POST `/api/v1/users/{userId}/academic-profile/verify` | /profile; /academic/profile-verifications; /admin/access/users/:userId | Có API gọi trong FE | features\academic\api\profile-verification-api.ts |
| AcademicProfiles | POST `/api/v1/users/{userId}/academic-profile/reject` | /profile; /academic/profile-verifications; /admin/access/users/:userId | Có API gọi trong FE | features\academic\api\profile-verification-api.ts |
| AcademicProfiles | PATCH `/api/v1/users/{userId}/academic-profile` | /profile; /academic/profile-verifications; /admin/access/users/:userId | Có API gọi trong FE | features\users\api\admin-api.ts |
| AiAssistant | GET `/api/v1/projects/{projectId}/reports/{reportId}/summary` | /project/ai; /project/reports/:reportId | Có API gọi trong FE | features\ai\ai-api.ts |
| AiAssistant | GET `/api/v1/projects/{projectId}/ai/reports/{reportId}/summary` | /project/ai; /project/reports/:reportId | Alias dùng chung | Tóm tắt báo cáo dùng /projects/{projectId}/reports/{reportId}/summary. |
| AiAssistant | POST `/api/v1/projects/{projectId}/ai/assistant/ask` | /project/ai; /project/reports/:reportId | Có API gọi trong FE | features\ai\ai-api.ts |
| AiAssistant | POST `/api/v1/projects/{projectId}/ai/ask` | /project/ai; /project/reports/:reportId | Alias dùng chung | Trợ lý dùng /projects/{projectId}/ai/assistant/ask. |
| AiInsights | POST `/api/v1/ai/insights/progress` | /project/ai; /department/projects/:projectId/risk | Có API gọi trong FE | features\ai\components\ProgressScenarioPanel.tsx |
| AuditLogs | GET `/api/v1/security/audit-logs` | /admin/access | Có API gọi trong FE | features\users\api\admin-api.ts |
| Auth | POST `/api/v1/auth/login` | /login; /profile/security; /forgot-password; /reset-password; nút đăng xuất | Có API gọi trong FE | features\auth\api\auth-api.ts; services\api\auth.api.ts |
| Auth | POST `/api/v1/auth/refresh` | /login; /profile/security; /forgot-password; /reset-password; nút đăng xuất | Đọc/duy trì phiên nền | features\auth\api\auth-api.ts |
| Auth | POST `/api/v1/auth/logout` | /login; /profile/security; /forgot-password; /reset-password; nút đăng xuất | Có API gọi trong FE | features\auth\api\auth-api.ts |
| Auth | POST `/api/v1/auth/change-password` | /login; /profile/security; /forgot-password; /reset-password; nút đăng xuất | Có API gọi trong FE | features\auth\api\auth-api.ts |
| Auth | POST `/api/v1/auth/forgot-password` | /login; /profile/security; /forgot-password; /reset-password; nút đăng xuất | Có API gọi trong FE | features\auth\api\auth-api.ts |
| Auth | POST `/api/v1/auth/reset-password` | /login; /profile/security; /forgot-password; /reset-password; nút đăng xuất | Có API gọi trong FE | features\auth\api\auth-api.ts |
| Auth | GET `/api/v1/auth/me` | /login; /profile/security; /forgot-password; /reset-password; nút đăng xuất | Đọc/duy trì phiên nền | features\auth\api\auth-api.ts; services\api\auth.api.ts |
| Calendar | GET `/api/v1/calendar` | /calendar | Có API gọi trong FE | services\api\calendar.api.ts |
| Contributions | GET `/api/v1/projects/{projectId}/contributions` | /project/contributions | Có API gọi trong FE | features\contributions\contributions-api.ts |
| Contributions | GET `/api/v1/projects/{projectId}/contributions/{userId}/evidence` | /project/contributions | Có API gọi trong FE | features\contributions\contributions-api.ts |
| Contributions | POST `/api/v1/projects/{projectId}/contributions/snapshot` | /project/contributions | Có API gọi trong FE | features\contributions\contributions-api.ts |
| Dashboards | GET `/api/v1/dashboards/student` | /project/overview; /supervisor/dashboard; /department/portfolio; /admin/portfolio | Có API qua helper | features/dashboard/api/dashboard-api.ts; bảng tổng quan theo vai trò và xuất danh mục. |
| Dashboards | GET `/api/v1/dashboards/supervisor` | /project/overview; /supervisor/dashboard; /department/portfolio; /admin/portfolio | Có API qua helper | features/dashboard/api/dashboard-api.ts; bảng tổng quan theo vai trò và xuất danh mục. |
| Dashboards | GET `/api/v1/dashboards/department` | /project/overview; /supervisor/dashboard; /department/portfolio; /admin/portfolio | Có API qua helper | features/dashboard/api/dashboard-api.ts; bảng tổng quan theo vai trò và xuất danh mục. |
| Dashboards | GET `/api/v1/dashboards/admin` | /project/overview; /supervisor/dashboard; /department/portfolio; /admin/portfolio | Có API qua helper | features/dashboard/api/dashboard-api.ts; bảng tổng quan theo vai trò và xuất danh mục. |
| Dashboards | GET `/api/v1/dashboards/portfolio/export` | /project/overview; /supervisor/dashboard; /department/portfolio; /admin/portfolio | Có API qua helper | features/dashboard/api/dashboard-api.ts; bảng tổng quan theo vai trò và xuất danh mục. |
| Deliverables | GET `/api/v1/projects/{projectId}/deliverables` | /project/deliverables | Có API gọi trong FE | services\api\deliverables.api.ts |
| Deliverables | POST `/api/v1/projects/{projectId}/deliverables` | /project/deliverables | Có API gọi trong FE | services\api\deliverables.api.ts |
| Deliverables | GET `/api/v1/deliverables/{id}` | /project/deliverables | Có API gọi trong FE | services\api\deliverables.api.ts |
| Deliverables | PUT `/api/v1/deliverables/{id}` | /project/deliverables | Có API gọi trong FE | services\api\deliverables.api.ts |
| Deliverables | DELETE `/api/v1/deliverables/{id}` | /project/deliverables | Có API gọi trong FE | services\api\deliverables.api.ts |
| Deliverables | GET `/api/v1/deliverables/{id}/versions` | /project/deliverables | Có API gọi trong FE | services\api\deliverables.api.ts |
| Deliverables | POST `/api/v1/deliverables/{id}/versions` | /project/deliverables | Có API gọi trong FE | services\api\deliverables.api.ts |
| Deliverables | GET `/api/v1/deliverable-versions/{id}` | /project/deliverables | Read model dùng chung | Trang liệt kê/cấu trúc trả cùng DTO để xem và chỉnh sửa; không tạo trang chi tiết trùng nội dung. |
| Deliverables | POST `/api/v1/deliverable-versions/{id}/review` | /project/deliverables | Có API gọi trong FE | services\api\deliverables.api.ts |
| Deliverables | GET `/api/v1/deliverable-versions/{id}/feedback` | /project/deliverables | Có API gọi trong FE | services\api\deliverables.api.ts |
| Departments | GET `/api/v1/academic/departments` | /academic | Read model dùng chung | Trang liệt kê/cấu trúc trả cùng DTO để xem và chỉnh sửa; không tạo trang chi tiết trùng nội dung. |
| Departments | POST `/api/v1/academic/departments` | /academic | Có API gọi trong FE | features\academic\api\academic-api.ts |
| Departments | GET `/api/v1/academic/departments/{departmentId}` | /academic | Read model dùng chung | Trang liệt kê/cấu trúc trả cùng DTO để xem và chỉnh sửa; không tạo trang chi tiết trùng nội dung. |
| Departments | PUT `/api/v1/academic/departments/{departmentId}` | /academic | Có API gọi trong FE | features\academic\api\academic-api.ts |
| Departments | DELETE `/api/v1/academic/departments/{departmentId}` | /academic | Có API qua helper | features/academic/api/academic-api.ts; AcademicHierarchyTree + AcademicStructurePage. |
| Departments | PATCH `/api/v1/academic/departments/{departmentId}/status` | /academic | Có API qua helper | features/academic/api/academic-api.ts; AcademicHierarchyTree + AcademicStructurePage. |
| DisciplineGovernance | GET `/api/v1/teams/{teamId}/major-requirements/{majorId}/responsibilities` | /team; /projects/lifecycle; /project/tasks/:taskId | Có API gọi trong FE | features\projects\api\discipline-governance-api.ts |
| DisciplineGovernance | PUT `/api/v1/teams/{teamId}/major-requirements/{majorId}/responsibilities` | /team; /projects/lifecycle; /project/tasks/:taskId | Có API gọi trong FE | features\projects\api\discipline-governance-api.ts |
| DisciplineGovernance | GET `/api/v1/projects/{projectId}/major-requirements/{majorId}/responsibilities` | /team; /projects/lifecycle; /project/tasks/:taskId | Có API gọi trong FE | features\projects\api\discipline-governance-api.ts |
| DisciplineGovernance | GET `/api/v1/tasks/{taskId}/disciplines` | /team; /projects/lifecycle; /project/tasks/:taskId | Có API gọi trong FE | features\projects\api\discipline-governance-api.ts |
| DisciplineGovernance | PUT `/api/v1/tasks/{taskId}/disciplines` | /team; /projects/lifecycle; /project/tasks/:taskId | Có API gọi trong FE | features\projects\api\discipline-governance-api.ts |
| DisciplineGovernance | GET `/api/v1/projects/{projectId}/evidence` | /team; /projects/lifecycle; /project/tasks/:taskId | Có API gọi trong FE | features\projects\api\project-governance-api.ts |
| DisciplineGovernance | POST `/api/v1/projects/{projectId}/evidence` | /team; /projects/lifecycle; /project/tasks/:taskId | Có API gọi trong FE | features\projects\api\project-governance-api.ts |
| EvaluationDrafts | GET `/api/v1/projects/{projectId}/eligible-evaluators` | /evaluator/assignments/:assignmentId; /evaluator/evaluations/:evaluationId; /department/projects/:projectId/evaluation-schemes | Có API gọi trong FE | services\api\evaluations.api.ts |
| EvaluationDrafts | POST `/api/v1/projects/{projectId}/evaluation-assignments` | /evaluator/assignments/:assignmentId; /evaluator/evaluations/:evaluationId; /department/projects/:projectId/evaluation-schemes | Có API gọi trong FE | services\api\evaluations.api.ts |
| EvaluationDrafts | GET `/api/v1/projects/{projectId}/evaluation-assignments` | /evaluator/assignments/:assignmentId; /evaluator/evaluations/:evaluationId; /department/projects/:projectId/evaluation-schemes | Có API gọi trong FE | services\api\evaluations.api.ts |
| EvaluationDrafts | GET `/api/v1/evaluation-assignments/my` | /evaluator/assignments/:assignmentId; /evaluator/evaluations/:evaluationId; /department/projects/:projectId/evaluation-schemes | Có API gọi trong FE | services\api\evaluations.api.ts |
| EvaluationDrafts | POST `/api/v1/evaluation-assignments/{id}/revoke` | /evaluator/assignments/:assignmentId; /evaluator/evaluations/:evaluationId; /department/projects/:projectId/evaluation-schemes | Có API gọi trong FE | services\api\evaluations.api.ts |
| EvaluationDrafts | GET `/api/v1/evaluation-assignments/{id}` | /evaluator/assignments/:assignmentId; /evaluator/evaluations/:evaluationId; /department/projects/:projectId/evaluation-schemes | Có API gọi trong FE | services\api\evaluations.api.ts |
| EvaluationDrafts | GET `/api/v1/evaluation-assignments/{id}/evidence` | /evaluator/assignments/:assignmentId; /evaluator/evaluations/:evaluationId; /department/projects/:projectId/evaluation-schemes | Có API gọi trong FE | services\api\evaluations.api.ts |
| EvaluationDrafts | POST `/api/v1/evaluation-assignments/{id}/evaluation` | /evaluator/assignments/:assignmentId; /evaluator/evaluations/:evaluationId; /department/projects/:projectId/evaluation-schemes | Có API gọi trong FE | services\api\evaluations.api.ts |
| EvaluationDrafts | GET `/api/v1/evaluations/{id}` | /evaluator/assignments/:assignmentId; /evaluator/evaluations/:evaluationId; /department/projects/:projectId/evaluation-schemes | Có API gọi trong FE | services\api\evaluations.api.ts |
| EvaluationDrafts | PUT `/api/v1/evaluations/{id}/draft` | /evaluator/assignments/:assignmentId; /evaluator/evaluations/:evaluationId; /department/projects/:projectId/evaluation-schemes | Có API gọi trong FE | services\api\evaluations.api.ts |
| EvaluationDrafts | GET `/api/v1/projects/{projectId}/evaluations` | /evaluator/assignments/:assignmentId; /evaluator/evaluations/:evaluationId; /department/projects/:projectId/evaluation-schemes | Có API gọi trong FE | services\api\evaluations.api.ts |
| EvaluationDrafts | POST `/api/v1/evaluations/{id}/finalize` | /evaluator/assignments/:assignmentId; /evaluator/evaluations/:evaluationId; /department/projects/:projectId/evaluation-schemes | Có API gọi trong FE | services\api\evaluations.api.ts |
| ExecutionCapabilities | GET `/api/v1/projects/{projectId}/execution-actions` | Đọc nền tại workspace theo tài nguyên | Đọc/duy trì phiên nền | services\api\workflow.api.ts |
| ExecutionCapabilities | GET `/api/v1/tasks/{taskId}/execution-actions` | Đọc nền tại workspace theo tài nguyên | Đọc/duy trì phiên nền | services\api\workflow.api.ts |
| ExecutionCapabilities | GET `/api/v1/milestones/{milestoneId}/execution-actions` | Đọc nền tại workspace theo tài nguyên | Đọc/duy trì phiên nền | services\api\workflow.api.ts |
| Files | GET `/api/v1/projects/{projectId}/files` | /project/files; đính kèm trong công việc/báo cáo/cuộc họp | Có API gọi trong FE | features\files\project-files-api.ts |
| Files | GET `/api/v1/files/{id}` | /project/files; đính kèm trong công việc/báo cáo/cuộc họp | Read model dùng chung | Metadata hiển thị từ danh sách tệp; tải xuống/xóa có thao tác riêng. |
| Files | DELETE `/api/v1/files/{id}` | /project/files; đính kèm trong công việc/báo cáo/cuộc họp | Có API gọi trong FE | features\files\project-files-api.ts |
| Files | GET `/api/v1/files/{id}/download` | /project/files; đính kèm trong công việc/báo cáo/cuộc họp | Có API gọi trong FE | features\files\project-files-api.ts; services\api\deliverables.api.ts |
| Files | GET `/api/v1/tasks/{taskId}/evidence` | /project/files; đính kèm trong công việc/báo cáo/cuộc họp | Có API gọi trong FE | features\tasks\task-evidence-api.ts |
| Files | POST `/api/v1/files` | /project/files; đính kèm trong công việc/báo cáo/cuộc họp | Có API gọi trong FE | features\files\project-files-api.ts |
| FinalSubmissionDrafts | GET `/api/v1/projects/{projectId}/final-submission-periods` | /project/final-submission | Có API gọi trong FE | features\final-submission\final-submission-api.ts |
| FinalSubmissionDrafts | GET `/api/v1/projects/{projectId}/final-submission-draft` | /project/final-submission | Có API gọi trong FE | features\final-submission\final-submission-api.ts |
| FinalSubmissionDrafts | POST `/api/v1/projects/{projectId}/final-submission-draft` | /project/final-submission | Có API gọi trong FE | features\final-submission\final-submission-api.ts |
| FinalSubmissionDrafts | PUT `/api/v1/projects/{projectId}/final-submission-draft` | /project/final-submission | Có API gọi trong FE | features\final-submission\final-submission-api.ts |
| FinalSubmissions | GET `/api/v1/projects/{projectId}/final-submission/requirements` | /project/final-submission; trang xem bàn giao theo vai trò | Có API gọi trong FE | features\final-submission\final-submission-api.ts |
| FinalSubmissions | PUT `/api/v1/projects/{projectId}/final-submission/requirements` | /project/final-submission; trang xem bàn giao theo vai trò | Có API gọi trong FE | features\final-submission\final-submission-api.ts |
| FinalSubmissions | GET `/api/v1/projects/{projectId}/final-submission/checklist` | /project/final-submission; trang xem bàn giao theo vai trò | Có API gọi trong FE | features\final-submission\final-submission-api.ts |
| FinalSubmissions | POST `/api/v1/projects/{projectId}/final-submission` | /project/final-submission; trang xem bàn giao theo vai trò | Có API gọi trong FE | features\final-submission\final-submission-api.ts |
| FinalSubmissions | GET `/api/v1/projects/{projectId}/final-submission` | /project/final-submission; trang xem bàn giao theo vai trò | Có API gọi trong FE | features\final-submission\final-submission-api.ts |
| FinalSubmissions | GET `/api/v1/projects/{projectId}/final-submission/files/{fileId}/download` | /project/final-submission; trang xem bàn giao theo vai trò | Có API gọi trong FE | features\final-submission\final-submission-api.ts |
| GoogleAuth | POST `/api/v1/auth/google/challenge` | /login; /profile/security | Có API gọi trong FE | features\auth\api\auth-api.ts |
| GoogleAuth | POST `/api/v1/auth/google/login` | /login; /profile/security | Có API gọi trong FE | features\auth\api\auth-api.ts |
| GoogleAuth | POST `/api/v1/auth/google/link` | /login; /profile/security | Có API gọi trong FE | features\auth\api\auth-api.ts |
| GoogleAuth | POST `/api/v1/auth/google/unlink` | /login; /profile/security | Có API gọi trong FE | features\auth\api\auth-api.ts |
| GoogleAuth | GET `/api/v1/auth/external-logins` | /login; /profile/security | Có API gọi trong FE | features\auth\api\auth-api.ts |
| Majors | GET `/api/v1/academic/majors` | /academic | Có API gọi trong FE | services\api\academic.api.ts |
| Majors | POST `/api/v1/academic/majors` | /academic | Có API gọi trong FE | features\academic\api\academic-api.ts |
| Majors | GET `/api/v1/academic/majors/{majorId}` | /academic | Read model dùng chung | Trang liệt kê/cấu trúc trả cùng DTO để xem và chỉnh sửa; không tạo trang chi tiết trùng nội dung. |
| Majors | PUT `/api/v1/academic/majors/{majorId}` | /academic | Có API gọi trong FE | features\academic\api\academic-api.ts |
| Majors | DELETE `/api/v1/academic/majors/{majorId}` | /academic | Có API qua helper | features/academic/api/academic-api.ts; AcademicHierarchyTree + AcademicStructurePage. |
| Majors | PATCH `/api/v1/academic/majors/{majorId}/status` | /academic | Có API qua helper | features/academic/api/academic-api.ts; AcademicHierarchyTree + AcademicStructurePage. |
| MeetingGovernance | GET `/api/v1/meetings/{meetingId}/decisions` | /project/meetings/:meetingId | Có API gọi trong FE | services\api\meetings.api.ts |
| MeetingGovernance | POST `/api/v1/meetings/{meetingId}/decisions` | /project/meetings/:meetingId | Có API gọi trong FE | services\api\meetings.api.ts |
| MeetingGovernance | GET `/api/v1/meetings/{meetingId}/action-items` | /project/meetings/:meetingId | Có API gọi trong FE | services\api\meetings.api.ts |
| MeetingGovernance | POST `/api/v1/meetings/{meetingId}/action-items` | /project/meetings/:meetingId | Có API gọi trong FE | services\api\meetings.api.ts |
| MeetingGovernance | PUT `/api/v1/meetings/{meetingId}/action-items/{id}` | /project/meetings/:meetingId | Có API gọi trong FE | services\api\meetings.api.ts |
| MeetingGovernance | PATCH `/api/v1/meetings/{meetingId}/action-items/{id}` | /project/meetings/:meetingId | Alias dùng chung | Chỉnh sửa nội dung việc sau cuộc họp qua PUT cùng tài nguyên. |
| Meetings | GET `/api/v1/projects/{projectId}/meetings` | /project/meetings | Có API gọi trong FE | services\api\meetings.api.ts |
| Meetings | POST `/api/v1/projects/{projectId}/meetings` | /project/meetings | Có API gọi trong FE | services\api\meetings.api.ts |
| Meetings | GET `/api/v1/meetings/{id}` | /project/meetings | Có API gọi trong FE | services\api\meetings.api.ts |
| Meetings | PUT `/api/v1/meetings/{id}` | /project/meetings | Có API gọi trong FE | services\api\meetings.api.ts |
| Meetings | DELETE `/api/v1/meetings/{id}` | /project/meetings | Alias dùng chung | Hủy cuộc họp qua POST /meetings/{id}/cancel; cùng CancelMeetingCommand. |
| Meetings | POST `/api/v1/meetings/{id}/cancel` | /project/meetings | Có API gọi trong FE | services\api\meetings.api.ts |
| Meetings | POST `/api/v1/meetings/{id}/complete` | /project/meetings | Có API gọi trong FE | services\api\meetings.api.ts |
| Meetings | PUT `/api/v1/meetings/{id}/notes` | /project/meetings | Có API gọi trong FE | services\api\meetings.api.ts |
| Meetings | POST `/api/v1/meetings/{id}/participants` | /project/meetings | Có API gọi trong FE | services\api\meetings.api.ts |
| Meetings | DELETE `/api/v1/meetings/{id}/participants/{userId}` | /project/meetings | Có API gọi trong FE | services\api\meetings.api.ts |
| Meetings | POST `/api/v1/meetings/{id}/feedback` | /project/meetings | Có API gọi trong FE | services\api\meetings.api.ts |
| MeetingVideo | GET `/api/v1/meetings/{meetingId}/video/session` | /project/meetings/:meetingId/video | Có API gọi trong FE | features\meetings\video\meeting-video-api.ts |
| MeetingVideo | POST `/api/v1/meetings/{meetingId}/video/start` | /project/meetings/:meetingId/video | Có API gọi trong FE | features\meetings\video\meeting-video-api.ts |
| MeetingVideo | POST `/api/v1/meetings/{meetingId}/video/join` | /project/meetings/:meetingId/video | Có API gọi trong FE | features\meetings\video\meeting-video-api.ts |
| MeetingVideo | POST `/api/v1/meetings/{meetingId}/video/end` | /project/meetings/:meetingId/video | Có API gọi trong FE | features\meetings\video\meeting-video-api.ts |
| MeetingVideo | GET `/api/v1/meetings/{meetingId}/video/presence` | /project/meetings/:meetingId/video | Có API gọi trong FE | features\meetings\video\meeting-video-api.ts |
| Milestones | GET `/api/v1/milestones/{id}` | /project/milestones; /project/gantt | Có API gọi trong FE | services\api\milestones.api.ts |
| Milestones | PUT `/api/v1/milestones/{id}` | /project/milestones; /project/gantt | Có API gọi trong FE | services\api\milestones.api.ts |
| Milestones | DELETE `/api/v1/milestones/{id}` | /project/milestones; /project/gantt | Có API gọi trong FE | services\api\milestones.api.ts |
| Milestones | GET `/api/v1/milestones/project/{projectId}` | /project/milestones; /project/gantt | Có API gọi trong FE | services\api\milestones.api.ts |
| Milestones | GET `/api/v1/milestones/project/{projectId}/progress` | /project/milestones; /project/gantt | Có API gọi trong FE | services\api\milestones.api.ts |
| Milestones | POST `/api/v1/milestones` | /project/milestones; /project/gantt | Có API gọi trong FE | services\api\milestones.api.ts |
| Milestones | POST `/api/v1/milestones/project/{projectId}/reorder` | /project/milestones; /project/gantt | Có API gọi trong FE | services\api\milestones.api.ts |
| MilestoneTemplates | GET `/api/v1/milestone-templates` | /admin/milestone-templates | Có API gọi trong FE | features\milestones\milestone-templates-api.ts |
| MilestoneTemplates | POST `/api/v1/milestone-templates` | /admin/milestone-templates | Có API gọi trong FE | features\milestones\milestone-templates-api.ts |
| MilestoneTemplates | PUT `/api/v1/milestone-templates/{id}` | /admin/milestone-templates | Có API gọi trong FE | features\milestones\milestone-templates-api.ts |
| MilestoneTemplates | DELETE `/api/v1/milestone-templates/{id}` | /admin/milestone-templates | Có API gọi trong FE | features\milestones\milestone-templates-api.ts |
| MilestoneTemplates | POST `/api/v1/milestone-templates/{id}/versions` | /admin/milestone-templates | Có API gọi trong FE | features\milestones\milestone-templates-api.ts |
| MilestoneTemplates | POST `/api/v1/milestone-templates/versions/{id}/publish` | /admin/milestone-templates | Có API gọi trong FE | features\milestones\milestone-templates-api.ts |
| MilestoneTemplates | POST `/api/v1/milestone-templates/versions/{id}/items` | /admin/milestone-templates | Có API gọi trong FE | features\milestones\milestone-templates-api.ts |
| MilestoneTemplates | PUT `/api/v1/milestone-templates/items/{id}` | /admin/milestone-templates | Có API gọi trong FE | features\milestones\milestone-templates-api.ts |
| MilestoneTemplates | DELETE `/api/v1/milestone-templates/items/{id}` | /admin/milestone-templates | Có API gọi trong FE | features\milestones\milestone-templates-api.ts |
| MilestoneTemplates | POST `/api/v1/milestone-templates/periods/{periodId}/assign/{templateId}` | /admin/milestone-templates | Có API gọi trong FE | features\milestones\milestone-templates-api.ts |
| Notifications | GET `/api/v1/notifications` | Popover chuông; /notifications | Có API gọi trong FE | features\notifications\notifications-api.ts |
| Notifications | GET `/api/v1/notifications/unread-count` | Popover chuông; /notifications | Có API gọi trong FE | features\notifications\notifications-api.ts |
| Notifications | PATCH `/api/v1/notifications/{notificationId}/read` | Popover chuông; /notifications | Có API gọi trong FE | features\notifications\notifications-api.ts |
| Notifications | POST `/api/v1/notifications/read-all` | Popover chuông; /notifications | Có API gọi trong FE | features\notifications\notifications-api.ts |
| Organizations | GET `/api/v1/academic/organizations` | /academic | Read model dùng chung | Trang liệt kê/cấu trúc trả cùng DTO để xem và chỉnh sửa; không tạo trang chi tiết trùng nội dung. |
| Organizations | POST `/api/v1/academic/organizations` | /academic | Có API gọi trong FE | features\academic\api\academic-api.ts |
| Organizations | GET `/api/v1/academic/organizations/{organizationId}` | /academic | Read model dùng chung | Trang liệt kê/cấu trúc trả cùng DTO để xem và chỉnh sửa; không tạo trang chi tiết trùng nội dung. |
| Organizations | PUT `/api/v1/academic/organizations/{organizationId}` | /academic | Có API gọi trong FE | features\academic\api\academic-api.ts |
| Organizations | DELETE `/api/v1/academic/organizations/{organizationId}` | /academic | Có API qua helper | features/academic/api/academic-api.ts; AcademicHierarchyTree + AcademicStructurePage. |
| Organizations | PATCH `/api/v1/academic/organizations/{organizationId}/status` | /academic | Có API qua helper | features/academic/api/academic-api.ts; AcademicHierarchyTree + AcademicStructurePage. |
| Permissions | GET `/api/v1/security/permissions` | /admin/access/rbac | Có API gọi trong FE | features\users\api\admin-api.ts |
| Permissions | POST `/api/v1/security/permissions` | /admin/access/rbac | Có API gọi trong FE | features\users\api\admin-api.ts |
| Permissions | GET `/api/v1/security/permissions/{permissionId}` | /admin/access/rbac | Read model dùng chung | Trang liệt kê/cấu trúc trả cùng DTO để xem và chỉnh sửa; không tạo trang chi tiết trùng nội dung. |
| Permissions | PUT `/api/v1/security/permissions/{permissionId}` | /admin/access/rbac | Có API gọi trong FE | features\users\api\admin-api.ts |
| Permissions | DELETE `/api/v1/security/permissions/{permissionId}` | /admin/access/rbac | Có API gọi trong FE | features\users\api\admin-api.ts |
| Permissions | GET `/api/v1/security/permissions/matrix` | /admin/access/rbac | Có API gọi trong FE | features\users\api\admin-api.ts |
| PolicyEvaluation | GET `/api/v1/project-periods/{id}/policy-versions` | /academic/project-periods/:periodId/policy; kiểm tra điều kiện theo nguồn | Có API gọi trong FE | features\academic\api\period-policy-api.ts |
| PolicyEvaluation | GET `/api/v1/project-periods/{id}/effective-policy` | /academic/project-periods/:periodId/policy; kiểm tra điều kiện theo nguồn | Có API gọi trong FE | features\academic\api\period-policy-api.ts |
| PolicyEvaluation | PUT `/api/v1/project-periods/{id}/policy` | /academic/project-periods/:periodId/policy; kiểm tra điều kiện theo nguồn | Có API gọi trong FE | features\academic\api\period-policy-api.ts |
| PolicyEvaluation | GET `/api/v1/evaluation-schemes` | /academic/project-periods/:periodId/policy; kiểm tra điều kiện theo nguồn | Có API gọi trong FE | services\api\evaluations.api.ts |
| PolicyEvaluation | POST `/api/v1/evaluation-schemes` | /academic/project-periods/:periodId/policy; kiểm tra điều kiện theo nguồn | Có API gọi trong FE | services\api\evaluations.api.ts |
| PolicyEvaluation | GET `/api/v1/evaluation-schemes/{id}` | /academic/project-periods/:periodId/policy; kiểm tra điều kiện theo nguồn | Read model dùng chung | Trang liệt kê/cấu trúc trả cùng DTO để xem và chỉnh sửa; không tạo trang chi tiết trùng nội dung. |
| PolicyEvaluation | PUT `/api/v1/evaluation-schemes/{id}` | /academic/project-periods/:periodId/policy; kiểm tra điều kiện theo nguồn | Có API gọi trong FE | services\api\evaluations.api.ts |
| PolicyEvaluation | DELETE `/api/v1/evaluation-schemes/{id}` | /academic/project-periods/:periodId/policy; kiểm tra điều kiện theo nguồn | Có API gọi trong FE | services\api\evaluations.api.ts |
| PolicyEvaluation | POST `/api/v1/evaluation-schemes/{id}/publish` | /academic/project-periods/:periodId/policy; kiểm tra điều kiện theo nguồn | Có API gọi trong FE | services\api\evaluations.api.ts |
| PolicyEvaluation | POST `/api/v1/evaluation-schemes/{id}/versions` | /academic/project-periods/:periodId/policy; kiểm tra điều kiện theo nguồn | Có API gọi trong FE | services\api\evaluations.api.ts |
| PolicyEvaluation | GET `/api/v1/projects/{projectId}/students/{studentId}/result/preview` | /academic/project-periods/:periodId/policy; kiểm tra điều kiện theo nguồn | Có API gọi trong FE | services\api\project-results.api.ts |
| PolicyEvaluation | POST `/api/v1/projects/{projectId}/students/{studentId}/result` | /academic/project-periods/:periodId/policy; kiểm tra điều kiện theo nguồn | Có API gọi trong FE | services\api\project-results.api.ts |
| PolicyEvaluation | GET `/api/v1/projects/{projectId}/students/{studentId}/result` | /academic/project-periods/:periodId/policy; kiểm tra điều kiện theo nguồn | Có API gọi trong FE | services\api\project-results.api.ts |
| ProgressReports | GET `/api/v1/projects/{projectId}/progress-reports` | /project/reports | Có API gọi trong FE | services\api\progress-reports.api.ts |
| ProgressReports | POST `/api/v1/projects/{projectId}/progress-reports` | /project/reports | Có API gọi trong FE | services\api\progress-reports.api.ts |
| ProgressReports | GET `/api/v1/progress-reports/{id}` | /project/reports | Có API gọi trong FE | services\api\progress-reports.api.ts |
| ProgressReports | PUT `/api/v1/progress-reports/{id}` | /project/reports | Có API gọi trong FE | services\api\progress-reports.api.ts |
| ProgressReports | POST `/api/v1/progress-reports/{id}/submit` | /project/reports | Có API gọi trong FE | services\api\progress-reports.api.ts |
| ProgressReports | POST `/api/v1/progress-reports/{id}/feedback` | /project/reports | Có API gọi trong FE | services\api\progress-reports.api.ts |
| ProjectActionItems | GET `/api/v1/projects/{projectId}/action-items` | /department/projects/:projectId/governance | Có API gọi trong FE | features\projects\api\project-governance-api.ts |
| ProjectActionItems | POST `/api/v1/projects/{projectId}/action-items` | /department/projects/:projectId/governance | Có API gọi trong FE | features\projects\api\project-governance-api.ts |
| ProjectActionItems | GET `/api/v1/projects/{projectId}/action-items/{id}` | /department/projects/:projectId/governance | Có API gọi trong FE | features\projects\api\project-governance-api.ts |
| ProjectActionItems | PUT `/api/v1/projects/{projectId}/action-items/{id}` | /department/projects/:projectId/governance | Có API gọi trong FE | features\projects\api\project-governance-api.ts |
| ProjectActionItems | POST `/api/v1/projects/{projectId}/action-items/{id}/status` | /department/projects/:projectId/governance | Có API gọi trong FE | features\projects\api\project-governance-api.ts |
| ProjectGovernance | GET `/api/v1/projects/{projectId}/governance` | /department/projects/:projectId/governance | Có API gọi trong FE | features\projects\api\project-governance-api.ts |
| ProjectPeriods | GET `/api/v1/academic/project-periods` | /academic/governance; /academic/project-periods/:periodId/policy | Có API gọi trong FE | features\academic\api\governance-api.ts; features\milestones\MilestoneTemplatesPage.tsx; services\api\academic.api.ts |
| ProjectPeriods | POST `/api/v1/academic/project-periods` | /academic/governance; /academic/project-periods/:periodId/policy | Có API gọi trong FE | features\academic\api\governance-api.ts |
| ProjectPeriods | GET `/api/v1/academic/project-periods/{periodId}` | /academic/governance; /academic/project-periods/:periodId/policy | Read model dùng chung | Trang liệt kê/cấu trúc trả cùng DTO để xem và chỉnh sửa; không tạo trang chi tiết trùng nội dung. |
| ProjectPeriods | PUT `/api/v1/academic/project-periods/{periodId}` | /academic/governance; /academic/project-periods/:periodId/policy | Có API gọi trong FE | features\academic\api\governance-api.ts |
| ProjectPeriods | PATCH `/api/v1/academic/project-periods/{periodId}/status` | /academic/governance; /academic/project-periods/:periodId/policy | Có API qua helper | features/academic/api/governance-api.ts; setGovernanceStatus trong AcademicGovernancePage. |
| ProjectRequirements | GET `/api/v1/projects/{projectId}/major-requirements` | /project/register; /department/projects/review/:id; /department/projects/:projectId/final-requirements | Có API gọi trong FE | features\projects\api\project-review-api.ts |
| ProjectRequirements | PUT `/api/v1/projects/{projectId}/major-requirements` | /project/register; /department/projects/review/:id; /department/projects/:projectId/final-requirements | Có API gọi trong FE | features\projects\api\project-review-api.ts |
| ProjectRequirements | GET `/api/v1/projects/{projectId}/review-snapshots` | /project/register; /department/projects/review/:id; /department/projects/:projectId/final-requirements | Có API gọi trong FE | features\projects\api\project-review-api.ts |
| ProjectResults | GET `/api/v1/projects/{projectId}/result-policy` | /project/result; /department/projects/:projectId/result | Có API gọi trong FE | services\api\project-results.api.ts |
| ProjectResults | PUT `/api/v1/projects/{projectId}/result-policy` | /project/result; /department/projects/:projectId/result | Có API gọi trong FE | services\api\project-results.api.ts |
| ProjectResults | GET `/api/v1/projects/{projectId}/result/preview` | /project/result; /department/projects/:projectId/result | Có API gọi trong FE | services\api\project-results.api.ts |
| ProjectResults | POST `/api/v1/projects/{projectId}/result` | /project/result; /department/projects/:projectId/result | Có API gọi trong FE | services\api\project-results.api.ts |
| ProjectResults | GET `/api/v1/projects/{projectId}/result` | /project/result; /department/projects/:projectId/result | Có API gọi trong FE | services\api\project-results.api.ts |
| Projects | GET `/api/v1/projects/{id}/academic-review` | /project/register; /projects/lifecycle; /department/projects/review/:id; /department/projects/:projectId/archive-view | Có API gọi trong FE | features\projects\api\project-review-api.ts |
| Projects | POST `/api/v1/projects/{id}/department-decisions` | /project/register; /projects/lifecycle; /department/projects/review/:id; /department/projects/:projectId/archive-view | Có API gọi trong FE | features\projects\api\project-review-api.ts |
| Projects | GET `/api/v1/projects/lifecycle` | /project/register; /projects/lifecycle; /department/projects/review/:id; /department/projects/:projectId/archive-view | Có API gọi trong FE | features\projects\api\get-project-lifecycle.ts |
| Projects | POST `/api/v1/projects` | /project/register; /projects/lifecycle; /department/projects/review/:id; /department/projects/:projectId/archive-view | Có API gọi trong FE | services\api\projects.api.ts |
| Projects | GET `/api/v1/projects` | /project/register; /projects/lifecycle; /department/projects/review/:id; /department/projects/:projectId/archive-view | Có API gọi trong FE | services\api\projects.api.ts |
| Projects | PUT `/api/v1/projects/{id}` | /project/register; /projects/lifecycle; /department/projects/review/:id; /department/projects/:projectId/archive-view | Có API gọi trong FE | services\api\projects.api.ts |
| Projects | GET `/api/v1/projects/{id}` | /project/register; /projects/lifecycle; /department/projects/review/:id; /department/projects/:projectId/archive-view | Có API gọi trong FE | features\projects\api\archive-project.ts; features\projects\api\archive-project.ts; features\projects\api\project-review-api.ts; services\api\projects.api.ts |
| Projects | PUT `/api/v1/projects/{id}/majors` | /project/register; /projects/lifecycle; /department/projects/review/:id; /department/projects/:projectId/archive-view | Có API gọi trong FE | services\api\projects.api.ts |
| Projects | PUT `/api/v1/projects/{id}/topic` | /project/register; /projects/lifecycle; /department/projects/review/:id; /department/projects/:projectId/archive-view | Có API gọi trong FE | services\api\projects.api.ts |
| Projects | GET `/api/v1/projects/review-queue` | /project/register; /projects/lifecycle; /department/projects/review/:id; /department/projects/:projectId/archive-view | Có API gọi trong FE | features\projects\api\project-review-api.ts |
| Projects | POST `/api/v1/projects/{id}/submit` | /project/register; /projects/lifecycle; /department/projects/review/:id; /department/projects/:projectId/archive-view | Có API gọi trong FE | services\api\projects.api.ts |
| Projects | POST `/api/v1/projects/{id}/resubmit` | /project/register; /projects/lifecycle; /department/projects/review/:id; /department/projects/:projectId/archive-view | Có API gọi trong FE | services\api\projects.api.ts |
| Projects | POST `/api/v1/projects/{id}/start-review` | /project/register; /projects/lifecycle; /department/projects/review/:id; /department/projects/:projectId/archive-view | Có API gọi trong FE | features\projects\api\project-review-api.ts |
| Projects | POST `/api/v1/projects/{id}/revision` | /project/register; /projects/lifecycle; /department/projects/review/:id; /department/projects/:projectId/archive-view | Có API qua helper | features/projects/api/project-review-api.ts; decideProjectReview trong ProjectReviewPage. |
| Projects | POST `/api/v1/projects/{id}/approve` | /project/register; /projects/lifecycle; /department/projects/review/:id; /department/projects/:projectId/archive-view | Có API qua helper | features/projects/api/project-review-api.ts; decideProjectReview trong ProjectReviewPage. |
| Projects | POST `/api/v1/projects/{id}/reject` | /project/register; /projects/lifecycle; /department/projects/review/:id; /department/projects/:projectId/archive-view | Có API qua helper | features/projects/api/project-review-api.ts; decideProjectReview trong ProjectReviewPage. |
| Projects | POST `/api/v1/projects/{id}/archive` | /project/register; /projects/lifecycle; /department/projects/review/:id; /department/projects/:projectId/archive-view | Có API gọi trong FE | features\projects\api\archive-project.ts |
| Projects | GET `/api/v1/projects/{id}/history` | /project/register; /projects/lifecycle; /department/projects/review/:id; /department/projects/:projectId/archive-view | Có API gọi trong FE | features\projects\api\archive-project.ts; features\projects\api\project-review-api.ts; services\api\projects.api.ts |
| Projects | GET `/api/v1/projects/{id}/progress-analysis` | /project/register; /projects/lifecycle; /department/projects/review/:id; /department/projects/:projectId/archive-view | Có API gọi trong FE | features\ai\ai-api.ts |
| ReportingCycles | GET `/api/v1/projects/{projectId}/reporting-cycles` | /department/projects/:projectId/governance | Có API gọi trong FE | features\projects\api\project-governance-api.ts |
| ReportingCycles | POST `/api/v1/projects/{projectId}/reporting-cycles` | /department/projects/:projectId/governance | Có API gọi trong FE | features\projects\api\project-governance-api.ts |
| ReportingCycles | GET `/api/v1/projects/{projectId}/reporting-cycles/{id}` | /department/projects/:projectId/governance | Có API gọi trong FE | features\projects\api\project-governance-api.ts |
| ReportingCycles | PUT `/api/v1/projects/{projectId}/reporting-cycles/{id}` | /department/projects/:projectId/governance | Có API gọi trong FE | features\projects\api\project-governance-api.ts |
| Roles | GET `/api/v1/security/roles` | /admin/access/rbac | Có API gọi trong FE | features\users\api\admin-api.ts |
| Roles | POST `/api/v1/security/roles` | /admin/access/rbac | Có API gọi trong FE | features\users\api\admin-api.ts |
| Roles | GET `/api/v1/security/roles/{roleId}` | /admin/access/rbac | Read model dùng chung | Trang liệt kê/cấu trúc trả cùng DTO để xem và chỉnh sửa; không tạo trang chi tiết trùng nội dung. |
| Roles | PUT `/api/v1/security/roles/{roleId}` | /admin/access/rbac | Có API gọi trong FE | features\users\api\admin-api.ts |
| Roles | DELETE `/api/v1/security/roles/{roleId}` | /admin/access/rbac | Có API gọi trong FE | features\users\api\admin-api.ts |
| Roles | PUT `/api/v1/security/roles/{roleId}/permissions` | /admin/access/rbac | Có API gọi trong FE | features\users\api\admin-api.ts |
| Rubrics | GET `/api/v1/rubrics` | /academic/rubrics | Có API gọi trong FE | features\evaluations\rubrics-api.ts |
| Rubrics | POST `/api/v1/rubrics` | /academic/rubrics | Có API gọi trong FE | features\evaluations\rubrics-api.ts |
| Rubrics | GET `/api/v1/rubrics/{id}` | /academic/rubrics | Có API gọi trong FE | features\evaluations\rubrics-api.ts |
| Rubrics | PUT `/api/v1/rubrics/{id}` | /academic/rubrics | Có API gọi trong FE | features\evaluations\rubrics-api.ts |
| Rubrics | DELETE `/api/v1/rubrics/{id}` | /academic/rubrics | Có API gọi trong FE | features\evaluations\rubrics-api.ts |
| Rubrics | POST `/api/v1/rubrics/{id}/publish` | /academic/rubrics | Có API gọi trong FE | features\evaluations\rubrics-api.ts |
| Rubrics | POST `/api/v1/rubrics/{id}/retire` | /academic/rubrics | Có API gọi trong FE | features\evaluations\rubrics-api.ts |
| Rubrics | POST `/api/v1/rubrics/{id}/versions` | /academic/rubrics | Có API gọi trong FE | features\evaluations\rubrics-api.ts |
| Semesters | GET `/api/v1/academic/semesters` | /academic/governance | Có API gọi trong FE | features\academic\api\governance-api.ts; services\api\academic.api.ts; services\http\http-client.ts |
| Semesters | POST `/api/v1/academic/semesters` | /academic/governance | Có API gọi trong FE | features\academic\api\governance-api.ts |
| Semesters | GET `/api/v1/academic/semesters/{semesterId}` | /academic/governance | Read model dùng chung | Trang liệt kê/cấu trúc trả cùng DTO để xem và chỉnh sửa; không tạo trang chi tiết trùng nội dung. |
| Semesters | PUT `/api/v1/academic/semesters/{semesterId}` | /academic/governance | Có API gọi trong FE | features\academic\api\governance-api.ts |
| Semesters | PATCH `/api/v1/academic/semesters/{semesterId}/status` | /academic/governance | Có API gọi trong FE | features\academic\api\governance-api.ts |
| StudentQualifications | GET `/api/v1/student-qualifications/me` | /team; /department/student-qualifications; /academic/project-periods/:periodId/policy | Có API gọi trong FE | services\api\student-qualifications.api.ts |
| StudentQualifications | POST `/api/v1/student-qualifications/me/evidence` | /team; /department/student-qualifications; /academic/project-periods/:periodId/policy | Có API gọi trong FE | services\api\student-qualifications.api.ts |
| StudentQualifications | GET `/api/v1/student-qualifications/verification-queue` | /team; /department/student-qualifications; /academic/project-periods/:periodId/policy | Có API gọi trong FE | services\api\student-qualifications.api.ts |
| StudentQualifications | POST `/api/v1/student-qualifications/{qualificationId}/verify` | /team; /department/student-qualifications; /academic/project-periods/:periodId/policy | Có API gọi trong FE | services\api\student-qualifications.api.ts |
| StudentQualifications | POST `/api/v1/student-qualifications/{qualificationId}/reject` | /team; /department/student-qualifications; /academic/project-periods/:periodId/policy | Có API gọi trong FE | services\api\student-qualifications.api.ts |
| StudentQualifications | GET `/api/v1/academic/project-periods/{projectPeriodId}/qualification-policy` | /team; /department/student-qualifications; /academic/project-periods/:periodId/policy | Có API gọi trong FE | services\api\student-qualifications.api.ts |
| StudentQualifications | PUT `/api/v1/academic/project-periods/{projectPeriodId}/qualification-policy` | /team; /department/student-qualifications; /academic/project-periods/:periodId/policy | Có API gọi trong FE | services\api\student-qualifications.api.ts |
| SupervisorAssignments | GET `/api/v1/supervisor-assignments/{assignmentId}` | /project/supervisor; /supervisor/workspace; /department/projects/:projectId/governance | Có API gọi trong FE | features\supervisors\api\assignment-management-api.ts |
| SupervisorAssignments | GET `/api/v1/projects/{projectId}/supervisor-assignments` | /project/supervisor; /supervisor/workspace; /department/projects/:projectId/governance | Có API gọi trong FE | services\api\meetings.api.ts; services\api\supervisors.api.ts |
| SupervisorAssignments | GET `/api/v1/supervisors/assignments` | /project/supervisor; /supervisor/workspace; /department/projects/:projectId/governance | Có API gọi trong FE | services\api\supervisors.api.ts |
| SupervisorAssignments | POST `/api/v1/supervisor-assignments/{assignmentId}/replace` | /project/supervisor; /supervisor/workspace; /department/projects/:projectId/governance | Có API gọi trong FE | features\supervisors\api\assignment-management-api.ts |
| SupervisorAssignments | POST `/api/v1/supervisor-assignments/{assignmentId}/end` | /project/supervisor; /supervisor/workspace; /department/projects/:projectId/governance | Có API gọi trong FE | features\supervisors\api\assignment-management-api.ts |
| SupervisorRequests | POST `/api/v1/projects/{projectId}/supervisor-requests` | /project/supervisor; /supervisor/workspace | Có API gọi trong FE | services\api\supervisors.api.ts |
| SupervisorRequests | GET `/api/v1/projects/{projectId}/supervisor-requests` | /project/supervisor; /supervisor/workspace | Có API gọi trong FE | services\api\supervisors.api.ts |
| SupervisorRequests | GET `/api/v1/supervisors/requests` | /project/supervisor; /supervisor/workspace | Có API gọi trong FE | services\api\supervisors.api.ts |
| SupervisorRequests | POST `/api/v1/supervisor-requests/{requestId}/cancel` | /project/supervisor; /supervisor/workspace | Có API gọi trong FE | services\api\supervisors.api.ts |
| SupervisorRequests | POST `/api/v1/supervisor-requests/{requestId}/accept` | /project/supervisor; /supervisor/workspace | Có API qua helper | services/api/supervisors.api.ts; respondToSupervisorRequest trong giảng viên workspace. |
| SupervisorRequests | POST `/api/v1/supervisor-requests/{requestId}/reject` | /project/supervisor; /supervisor/workspace | Có API qua helper | services/api/supervisors.api.ts; respondToSupervisorRequest trong giảng viên workspace. |
| Supervisors | GET `/api/v1/projects/{projectId}/supervisor-candidates` | /project/supervisor; /supervisor/profile; /department/supervisors | Có API gọi trong FE | services\api\supervisors.api.ts |
| Supervisors | GET `/api/v1/supervisors` | /project/supervisor; /supervisor/profile; /department/supervisors | Có API gọi trong FE | features\supervisors\api\supervisor-api.ts |
| Supervisors | GET `/api/v1/supervisors/{profileId}` | /project/supervisor; /supervisor/profile; /department/supervisors | Có API gọi trong FE | features\supervisors\api\supervisor-api.ts |
| Supervisors | PUT `/api/v1/supervisors/users/{userId}/profile` | /project/supervisor; /supervisor/profile; /department/supervisors | Có API gọi trong FE | features\supervisors\api\supervisor-api.ts |
| Supervisors | PUT `/api/v1/supervisors/{profileId}/expertise` | /project/supervisor; /supervisor/profile; /department/supervisors | Có API gọi trong FE | features\supervisors\api\supervisor-api.ts |
| System | GET `/api/v1/system` | /admin/access | Có API gọi trong FE | features\users\components\SystemStatusPanel.tsx |
| TaskComments | GET `/api/v1/tasks/{taskId}/comments` | /project/tasks/:taskId | Có API gọi trong FE | features\tasks\task-evidence-api.ts |
| TaskComments | POST `/api/v1/tasks/{taskId}/comments` | /project/tasks/:taskId | Có API gọi trong FE | features\tasks\task-evidence-api.ts |
| Tasks | GET `/api/v1/tasks/{id}` | /project/tasks; /project/tasks/:taskId | Có API gọi trong FE | services\api\tasks.api.ts |
| Tasks | PUT `/api/v1/tasks/{id}` | /project/tasks; /project/tasks/:taskId | Có API gọi trong FE | services\api\tasks.api.ts |
| Tasks | DELETE `/api/v1/tasks/{id}` | /project/tasks; /project/tasks/:taskId | Có API gọi trong FE | services\api\tasks.api.ts |
| Tasks | GET `/api/v1/tasks/project/{projectId}` | /project/tasks; /project/tasks/:taskId | Có API gọi trong FE | services\api\tasks.api.ts |
| Tasks | POST `/api/v1/tasks` | /project/tasks; /project/tasks/:taskId | Có API gọi trong FE | services\api\tasks.api.ts |
| Tasks | POST `/api/v1/tasks/{id}/assignees` | /project/tasks; /project/tasks/:taskId | Có API gọi trong FE | services\api\tasks.api.ts |
| Tasks | POST `/api/v1/tasks/dependency` | /project/tasks; /project/tasks/:taskId | Có API gọi trong FE | services\api\tasks.api.ts |
| Tasks | DELETE `/api/v1/tasks/{id}/dependency/{dependsOnTaskId}` | /project/tasks; /project/tasks/:taskId | Có API gọi trong FE | services\api\tasks.api.ts |
| Tasks | PUT `/api/v1/tasks/{id}/status` | /project/tasks; /project/tasks/:taskId | Có API gọi trong FE | services\api\tasks.api.ts |
| Tasks | GET `/api/v1/tasks/{id}/history` | /project/tasks; /project/tasks/:taskId | Có API gọi trong FE | services\api\tasks.api.ts |
| Tasks | GET `/api/v1/tasks/project/{projectId}/overdue-blocked` | /project/tasks; /project/tasks/:taskId | Có API gọi trong FE | services\api\tasks.api.ts |
| Tasks | GET `/api/v1/tasks/project/{projectId}/timeline` | /project/tasks; /project/tasks/:taskId | Có API gọi trong FE | services\api\tasks.api.ts |
| Tasks | GET `/api/v1/tasks/project/{projectId}/progress-summary` | /project/tasks; /project/tasks/:taskId | Có API gọi trong FE | services\api\tasks.api.ts |
| TeamLeaderChangeRequests | GET `/api/v1/team-leader-change-requests` | /team; /supervisor/workspace | Có API gọi trong FE | services\api\teams.api.ts |
| TeamLeaderChangeRequests | POST `/api/v1/team-leader-change-requests/{requestId}/approve` | /team; /supervisor/workspace | Có API qua helper | services/api/teams.api.ts; quyết định yêu cầu đổi trưởng nhóm trong workspace giảng viên. |
| TeamLeaderChangeRequests | POST `/api/v1/team-leader-change-requests/{requestId}/reject` | /team; /supervisor/workspace | Có API qua helper | services/api/teams.api.ts; quyết định yêu cầu đổi trưởng nhóm trong workspace giảng viên. |
| Teams | GET `/api/v1/teams/current` | /team | Có API gọi trong FE | services\api\teams.api.ts |
| Teams | GET `/api/v1/teams/{teamId}` | /team | Có API gọi trong FE | services\api\meetings.api.ts; services\api\teams.api.ts |
| Teams | PUT `/api/v1/teams/{teamId}` | /team | Có API gọi trong FE | services\api\teams.api.ts |
| Teams | POST `/api/v1/teams` | /team | Có API gọi trong FE | services\api\teams.api.ts |
| Teams | PUT `/api/v1/teams/{teamId}/academic-scope` | /team | Có API gọi trong FE | services\api\teams.api.ts |
| Teams | GET `/api/v1/teams/{teamId}/eligibility` | /team | Có API gọi trong FE | features\teams\team-eligibility-api.ts |
| Teams | GET `/api/v1/teams/{teamId}/eligibility/history` | /team | Có API gọi trong FE | features\teams\team-eligibility-api.ts |
| Teams | POST `/api/v1/teams/{teamId}/eligibility/check` | /team | Có API gọi trong FE | features\teams\team-eligibility-api.ts |
| Teams | POST `/api/v1/teams/{teamId}/eligibility/refresh` | /team | Có API gọi trong FE | services\api\teams.api.ts |
| Teams | POST `/api/v1/teams/{teamId}/eligibility/lock` | /team | Có API gọi trong FE | features\teams\team-eligibility-api.ts |
| Teams | GET `/api/v1/teams/{teamId}/invitation-candidates` | /team | Có API gọi trong FE | services\api\teams.api.ts |
| Teams | POST `/api/v1/teams/{teamId}/invitations` | /team | Có API gọi trong FE | services\api\teams.api.ts |
| Teams | GET `/api/v1/teams/invitations` | /team | Có API gọi trong FE | services\api\teams.api.ts |
| Teams | POST `/api/v1/teams/invitations/{invitationId}/accept` | /team | Có API gọi trong FE | services\api\teams.api.ts |
| Teams | POST `/api/v1/teams/invitations/{invitationId}/reject` | /team | Có API gọi trong FE | services\api\teams.api.ts |
| Teams | POST `/api/v1/teams/invitations/{invitationId}/cancel` | /team | Có API gọi trong FE | services\api\teams.api.ts |
| Teams | DELETE `/api/v1/teams/{teamId}/members/{userId}` | /team | Có API gọi trong FE | services\api\teams.api.ts |
| Teams | POST `/api/v1/teams/{teamId}/leave` | /team | Có API gọi trong FE | services\api\teams.api.ts |
| Teams | POST `/api/v1/teams/{teamId}/leader` | /team | Có API gọi trong FE | services\api\teams.api.ts |
| Teams | POST `/api/v1/teams/{teamId}/leader-change-requests` | /team | Có API gọi trong FE | services\api\teams.api.ts |
| Topics | GET `/api/v1/topics` | /topics; /department/topics | Có API gọi trong FE | features\topics\api\topic-api.ts; services\api\topics.api.ts |
| Topics | POST `/api/v1/topics` | /topics; /department/topics | Có API gọi trong FE | features\topics\api\topic-api.ts |
| Topics | GET `/api/v1/topics/{id}` | /topics; /department/topics | Có API gọi trong FE | features\topics\api\topic-api.ts; services\api\topics.api.ts |
| Topics | PUT `/api/v1/topics/{id}` | /topics; /department/topics | Có API gọi trong FE | features\topics\api\topic-api.ts |
| Topics | POST `/api/v1/topics/{id}/publish` | /topics; /department/topics | Có API gọi trong FE | features\topics\api\topic-api.ts |
| Topics | POST `/api/v1/topics/{id}/close` | /topics; /department/topics | Có API gọi trong FE | features\topics\api\topic-api.ts |
| Users | GET `/api/v1/users` | /profile; /admin/access; /admin/access/users/:userId | Có API gọi trong FE | features\users\api\admin-api.ts |
| Users | POST `/api/v1/users` | /profile; /admin/access; /admin/access/users/:userId | Có API gọi trong FE | features\users\api\admin-api.ts |
| Users | GET `/api/v1/users/{userId}` | /profile; /admin/access; /admin/access/users/:userId | Có API gọi trong FE | features\users\api\admin-api.ts |
| Users | GET `/api/v1/users/me/profile` | /profile; /admin/access; /admin/access/users/:userId | Có API gọi trong FE | services\api\auth.api.ts |
| Users | PUT `/api/v1/users/me/profile` | /profile; /admin/access; /admin/access/users/:userId | Có API gọi trong FE | features\auth\api\auth-api.ts |
| Users | POST `/api/v1/users/import` | /profile; /admin/access; /admin/access/users/:userId | Có API gọi trong FE | features\users\api\admin-api.ts |
| Users | PATCH `/api/v1/users/{userId}/status` | /admin/access/users/:userId | Luồng tương đương | Giao diện dùng activate/deactivate/block/unblock; controller dùng cùng SetUserStatusCommand. |
| Users | POST `/api/v1/users/{userId}/activate` | /profile; /admin/access; /admin/access/users/:userId | Có API gọi trong FE | features\users\api\admin-api.ts |
| Users | POST `/api/v1/users/{userId}/deactivate` | /profile; /admin/access; /admin/access/users/:userId | Có API gọi trong FE | features\users\api\admin-api.ts |
| Users | POST `/api/v1/users/{userId}/block` | /profile; /admin/access; /admin/access/users/:userId | Có API gọi trong FE | features\users\api\admin-api.ts |
| Users | POST `/api/v1/users/{userId}/unblock` | /profile; /admin/access; /admin/access/users/:userId | Có API gọi trong FE | features\users\api\admin-api.ts |
| Users | PUT `/api/v1/users/{userId}/roles/{roleId}` | /profile; /admin/access; /admin/access/users/:userId | Có API gọi trong FE | features\users\api\admin-api.ts |
| Users | DELETE `/api/v1/users/{userId}/roles/{roleId}` | /profile; /admin/access; /admin/access/users/:userId | Có API gọi trong FE | features\users\api\admin-api.ts |
| VideoProviderWebhook | POST `/api/v1/integrations/video/livekit/webhook` | LiveKit → Backend, không phải thao tác người dùng | Tích hợp nền | Webhook có chữ ký LiveKit, không tạo nút giả trên FE. |
| WorkflowContext | GET `/api/v1/auth/me/context` | Đọc nền để xác định vai trò, phạm vi và điều hướng | Đọc/duy trì phiên nền | features\academic\api\academic-api.ts; services\api\workflow.api.ts |
| WorkflowContext | GET `/api/v1/teams/{teamId}/actions` | Đọc nền để xác định vai trò, phạm vi và điều hướng | Đọc/duy trì phiên nền | services\api\workflow.api.ts |
| WorkflowContext | GET `/api/v1/projects/{projectId}/actions` | Đọc nền để xác định vai trò, phạm vi và điều hướng | Đọc/duy trì phiên nền | features\projects\api\project-review-api.ts; services\api\workflow.api.ts |

## Kiểm chứng

- Build production và TypeScript: thành công. Lint: không có cảnh báo.
- Toàn bộ 146 tệp kiểm thử: 639 test đạt. Sau đó thêm test quyền xem Admin và chạy lại 18 test liên quan: tất cả đạt.
- Chrome DevTools: xem trang xác minh hồ sơ, bảo mật Google, điều phối; kiểm tra desktop và viewport 390px, không tràn ngang ở các trang đã xem.
- Build vẫn có cảnh báo bundle lớn hiện có; chưa thay chiến lược tải module trong phạm vi này.
