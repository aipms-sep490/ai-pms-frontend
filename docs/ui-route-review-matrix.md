# Ma trận rà giao diện — 07/10/2026

Nguồn route: `src/app/router/index.tsx`. Đây là bằng chứng phạm vi, không phải tuyên bố mọi thao tác đã chạy trên dữ liệu thật. Các snapshot lượt trước có thể chứa trạng thái đang tải; không tính chúng là kiểm tra sâu.

Các thao tác học vụ có ghi dữ liệu được kiểm tra bằng fixture/test; kiểm tra trình duyệt chỉ mở, lọc và hủy. Mentor/evaluator hiện thiếu phân công cho tài khoản thử nghiệm. Google OAuth được bỏ qua theo chỉ đạo. API đã có bảng riêng trong [api-ui-coverage.md](api-ui-coverage.md).

| Vai trò | Route | Component | Bằng chứng trình duyệt | Kiểm thử component có sẵn |
|---|---|---|---|---|
| Chung/Xác thực | `/login` | LoginPage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | `src/features/auth/pages/LoginPage.test.tsx` |
| Chung/Xác thực | `/forgot-password` | ForgotPasswordPage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | Không có test riêng theo tên component |
| Chung/Xác thực | `/reset-password` | ResetPasswordPage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | Không có test riêng theo tên component |
| Chung/Xác thực | `/profile` | ProfilePage | Snapshot lượt trước (admin); chưa xác minh mọi thao tác. | `src/features/auth/pages/ProfilePage.test.tsx` |
| Chung/Xác thực | `/profile/security` | ProfileSecurityPage | Snapshot lượt trước (admin); chưa xác minh mọi thao tác. | Không có test riêng theo tên component |
| Chung/Xác thực | `/notifications` | NotificationsPage | Sinh viên: chuông mở dropdown tại chỗ, tải danh sách, lọc chưa đọc, mở trang đầy đủ; desktop/390px; không đánh dấu thật. | `src/features/notifications/NotificationsPage.test.tsx` |
| Chung/Xác thực | `/calendar` | CalendarAttentionPage | Snapshot lượt trước (admin); chưa xác minh mọi thao tác. | `src/features/calendar/CalendarAttentionPage.test.tsx` |
| Sinh viên | `/project/overview` | OverviewPage | Snapshot lượt trước (student); chưa xác minh mọi thao tác. | `src/app/pages/OverviewPage.test.tsx` |
| Sinh viên | `/project/workspace` | ActiveProjectWorkspacePage | Snapshot lượt trước (student); chưa xác minh mọi thao tác. | `src/features/projects/pages/ActiveProjectWorkspacePage.test.tsx` |
| Sinh viên | `/project/milestones/:milestoneId?` | MilestoneDetailPage | Snapshot lượt trước (student); chưa xác minh mọi thao tác. | `src/features/milestones/pages/MilestoneDetailPage.test.tsx` |
| Sinh viên | `/project/tasks` | TaskBoardPage | Snapshot lượt trước (student); chưa xác minh mọi thao tác. | `src/features/tasks/pages/TaskBoardPage.test.tsx` |
| Sinh viên | `/project/tasks/:taskId` | TaskDetailPage | Snapshot lượt trước (student); chưa xác minh mọi thao tác. | `src/features/tasks/pages/TaskDetailPage.test.tsx` |
| Sinh viên | `/project/gantt` | GanttPage | Snapshot lượt trước (student); chưa xác minh mọi thao tác. | `src/features/progress/pages/GanttPage.test.tsx` |
| Sinh viên | `/project/reports` | ProgressReportsPage | Snapshot lượt trước (student); chưa xác minh mọi thao tác. | Không có test riêng theo tên component |
| Sinh viên | `/project/reports/new` | ProgressReportDetailPage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | Không có test riêng theo tên component |
| Sinh viên | `/project/reports/:reportId` | ProgressReportDetailPage | Snapshot lượt trước (student); chưa xác minh mọi thao tác. | Không có test riêng theo tên component |
| Sinh viên | `/project/meetings` | MeetingsPage | Snapshot lượt trước (student); chưa xác minh mọi thao tác. | Không có test riêng theo tên component |
| Sinh viên | `/project/meetings/new` | CreateMeetingPage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | Không có test riêng theo tên component |
| Sinh viên | `/project/meetings/:meetingId/video` | MeetingVideoRoomPage | 40007 chưa mở: thấy từ chối tham gia đúng lý do. Xem trước thiết bị/kết nối thật chưa thử. | `src/features/meetings/video/MeetingVideoRoomPage.test.tsx` |
| Sinh viên | `/project/meetings/:meetingId` | MeetingDetailPage | Cuộc họp 40007: nội dung/điểm danh, dữ liệu kết nối rỗng; không mở phòng/chỉnh điểm danh. | Không có test riêng theo tên component |
| Sinh viên | `/project/deliverables` | DeliverablesPage | Mở drawer phiên bản/phản hồi desktop/390px; đóng. Bản nộp có dữ liệu, phản hồi rỗng; kiểm thử phản hồi có dữ liệu. | `src/features/deliverables/DeliverablesPage.test.tsx` |
| Sinh viên | `/project/files` | ProjectFilesPage | Mở lọc nâng cao, đổi nguồn đính kèm; 390px; mở xác nhận xóa rồi giữ lại. Không tải lên/xóa tệp. | `src/features/files/ProjectFilesPage.test.tsx` |
| Sinh viên | `/project/evidence` | ProjectEvidenceLedgerPage | Snapshot lượt trước (student); chưa xác minh mọi thao tác. | Không có test riêng theo tên component |
| Sinh viên | `/project/contributions` | ProjectContributionsPage | Mở drawer minh chứng thành viên, lọc cuộc họp; 390px; không lưu snapshot. | `src/features/contributions/ProjectContributionsPage.test.tsx` |
| Sinh viên | `/project/ai` | ProjectAiPage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | Không có test riêng theo tên component |
| Sinh viên | `/projects/lifecycle` | ProjectLifecyclePage | Snapshot lượt trước (student); chưa xác minh mọi thao tác. | `src/features/projects/pages/ProjectLifecyclePage.test.tsx` |
| Sinh viên | `/team` | TeamManagementPage | Snapshot lượt trước (student); chưa xác minh mọi thao tác. | `src/features/teams/pages/TeamManagementPage.test.tsx` |
| Sinh viên | `/team/create` | TeamManagementPage | Snapshot lượt trước (student); chưa xác minh mọi thao tác. | `src/features/teams/pages/TeamManagementPage.test.tsx` |
| Sinh viên | `/topics` | TopicCataloguePage | Snapshot lượt trước (student); chưa xác minh mọi thao tác. | `src/features/projects/pages/TopicCataloguePage.test.tsx` |
| Sinh viên | `/project/source` | RegistrationSourcePage | Snapshot lượt trước (student); chưa xác minh mọi thao tác. | `src/features/registration/pages/RegistrationSourcePage.test.tsx` |
| Sinh viên | `/project/register` | ProjectRegistrationFormPage | Snapshot lượt trước (student); chưa xác minh mọi thao tác. | `src/features/projects/pages/ProjectRegistrationFormPage.test.tsx` |
| Sinh viên | `/project/edit` | ProjectRegistrationFormPage | Snapshot lượt trước (student); chưa xác minh mọi thao tác. | `src/features/projects/pages/ProjectRegistrationFormPage.test.tsx` |
| Sinh viên | `/project/status` | ProjectReviewStatusPage | ACTIVE và 6 bước lịch sử hiển thị nhãn tiếng Việt/ngày UTC+7; lỗi tải được thử lại. | `src/features/projects/pages/ProjectReviewStatusPage.test.tsx` |
| Sinh viên | `/project/supervisor` | SupervisorSelectionPage | Phân công/yêu cầu có dữ liệu, tên được lấy từ assignments/candidates, thời gian định dạng; không gửi yêu cầu. | `src/features/supervisors/pages/SupervisorSelectionPage.test.tsx` |
| Sinh viên | `/project/final-submission` | StudentFinalSubmissionPage | Snapshot lượt trước (student); chưa xác minh mọi thao tác. | `src/features/final-submission/StudentFinalSubmissionPage.test.tsx` |
| Sinh viên | `/project/result` | StudentProjectResultPage | Snapshot lượt trước (student); chưa xác minh mọi thao tác. | Không có test riêng theo tên component |
| Giảng viên | `/supervisor/workspace` | LecturerWorkspacePage | Giảng viên: đồ án có dữ liệu, liên kết trực tiếp công việc/báo cáo/họp/hạng mục; yêu cầu hướng dẫn. | `src/features/supervisors/pages/LecturerWorkspacePage.test.tsx` |
| Giảng viên | `/supervisor/profile` | SupervisorProfilePage | Snapshot lượt trước (lecturer); chưa xác minh mọi thao tác. | `src/features/supervisors/pages/SupervisorProfilePage.test.tsx` |
| Giảng viên | `/supervisor/dashboard` | SupervisorDashboardPage | Snapshot lượt trước (lecturer); chưa xác minh mọi thao tác. | `src/features/dashboard/pages/SupervisorDashboardPage.test.tsx` |
| Hướng dẫn chuyên ngành | `/mentor/workspace` | MentorWorkspacePage | Snapshot lượt trước (lecturer); chưa xác minh mọi thao tác. | Không có test riêng theo tên component |
| Giảng viên | `/supervisor/projects/:projectId/workspace` | SupervisorProjectWorkspacePage | Snapshot lượt trước (lecturer); chưa xác minh mọi thao tác. | `src/features/supervisors/pages/SupervisorProjectWorkspacePage.test.tsx` |
| Giảng viên | `/supervisor/projects/:projectId/progress` | SupervisorProgressReviewPage | Snapshot lượt trước (lecturer); chưa xác minh mọi thao tác. | `src/features/supervisors/pages/SupervisorProgressReviewPage.test.tsx` |
| Giảng viên | `/supervisor/projects/:projectId/milestones/:milestoneId?` | MilestoneDetailPage | Snapshot lượt trước (lecturer); chưa xác minh mọi thao tác. | `src/features/milestones/pages/MilestoneDetailPage.test.tsx` |
| Giảng viên | `/supervisor/projects/:projectId/tasks` | TaskBoardPage | Snapshot lượt trước (lecturer); chưa xác minh mọi thao tác. | `src/features/tasks/pages/TaskBoardPage.test.tsx` |
| Giảng viên | `/supervisor/projects/:projectId/tasks/:taskId` | TaskDetailPage | Snapshot lượt trước (lecturer); chưa xác minh mọi thao tác. | `src/features/tasks/pages/TaskDetailPage.test.tsx` |
| Giảng viên | `/supervisor/projects/:projectId/gantt` | GanttPage | Snapshot lượt trước (lecturer); chưa xác minh mọi thao tác. | `src/features/progress/pages/GanttPage.test.tsx` |
| Giảng viên | `/supervisor/projects/:projectId/reports` | ProgressReportsPage | Snapshot lượt trước (lecturer); chưa xác minh mọi thao tác. | Không có test riêng theo tên component |
| Giảng viên | `/supervisor/projects/:projectId/reports/:reportId` | ProgressReportDetailPage | Snapshot lượt trước (lecturer); chưa xác minh mọi thao tác. | Không có test riêng theo tên component |
| Giảng viên | `/supervisor/projects/:projectId/meetings` | MeetingsPage | Snapshot lượt trước (lecturer); chưa xác minh mọi thao tác. | Không có test riêng theo tên component |
| Giảng viên | `/supervisor/projects/:projectId/meetings/new` | CreateMeetingPage | Snapshot lượt trước (lecturer); chưa xác minh mọi thao tác. | Không có test riêng theo tên component |
| Giảng viên | `/supervisor/projects/:projectId/meetings/:meetingId/video` | MeetingVideoRoomPage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | `src/features/meetings/video/MeetingVideoRoomPage.test.tsx` |
| Giảng viên | `/supervisor/projects/:projectId/meetings/:meetingId` | MeetingDetailPage | Snapshot lượt trước (lecturer); chưa xác minh mọi thao tác. | Không có test riêng theo tên component |
| Giảng viên | `/supervisor/projects/:projectId/deliverables` | DeliverablesPage | Giảng viên: mở phiên bản đang chờ duyệt; xem form quyết định/nhận xét; không gửi đánh giá. | `src/features/deliverables/DeliverablesPage.test.tsx` |
| Giảng viên | `/supervisor/projects/:projectId/files` | ProjectFilesPage | Snapshot lượt trước (lecturer); chưa xác minh mọi thao tác. | `src/features/files/ProjectFilesPage.test.tsx` |
| Giảng viên | `/supervisor/projects/:projectId/evidence` | ProjectEvidenceLedgerPage | Snapshot lượt trước (lecturer); chưa xác minh mọi thao tác. | Không có test riêng theo tên component |
| Giảng viên | `/supervisor/projects/:projectId/contributions` | ProjectContributionsPage | Snapshot lượt trước (lecturer); chưa xác minh mọi thao tác. | `src/features/contributions/ProjectContributionsPage.test.tsx` |
| Giảng viên | `/supervisor/projects/:projectId/final-submission` | SupervisorFinalSubmissionPage | Snapshot lượt trước (lecturer); chưa xác minh mọi thao tác. | Không có test riêng theo tên component |
| Giảng viên | `/supervisor/projects/:projectId/ai` | ProjectAiPage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | Không có test riêng theo tên component |
| Hướng dẫn chuyên ngành | `/mentor/projects/:projectId/majors/:majorId/workspace` | MentorProjectWorkspacePage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | Không có test riêng theo tên component |
| Hướng dẫn chuyên ngành | `/mentor/projects/:projectId/majors/:majorId/tasks` | TaskBoardPage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | `src/features/tasks/pages/TaskBoardPage.test.tsx` |
| Hướng dẫn chuyên ngành | `/mentor/projects/:projectId/majors/:majorId/tasks/:taskId` | TaskDetailPage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | `src/features/tasks/pages/TaskDetailPage.test.tsx` |
| Hướng dẫn chuyên ngành | `/mentor/projects/:projectId/majors/:majorId/reports` | ProgressReportsPage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | Không có test riêng theo tên component |
| Hướng dẫn chuyên ngành | `/mentor/projects/:projectId/majors/:majorId/reports/:reportId` | ProgressReportDetailPage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | Không có test riêng theo tên component |
| Hướng dẫn chuyên ngành | `/mentor/projects/:projectId/majors/:majorId/meetings` | MeetingsPage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | Không có test riêng theo tên component |
| Hướng dẫn chuyên ngành | `/mentor/projects/:projectId/majors/:majorId/meetings/:meetingId` | MeetingDetailPage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | Không có test riêng theo tên component |
| Hướng dẫn chuyên ngành | `/mentor/projects/:projectId/majors/:majorId/evidence` | ProjectEvidenceLedgerPage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | Không có test riêng theo tên component |
| Người chấm | `/evaluator/evaluations` | EvaluatorAssignmentsPage | Snapshot lượt trước (lecturer); chưa xác minh mọi thao tác. | Không có test riêng theo tên component |
| Người chấm | `/evaluator/evaluations/:evaluationId` | EvaluationWorkspacePage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | `src/features/evaluations/EvaluationWorkspacePage.test.tsx` |
| Người chấm | `/evaluator/projects/:projectId/final-submission` | FinalSubmissionViewerPage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | `src/features/final-submission/FinalSubmissionViewerPage.test.tsx` |
| Người chấm | `/evaluator/workspace` | EvaluatorWorkspacePage | Snapshot lượt trước (lecturer); chưa xác minh mọi thao tác. | Không có test riêng theo tên component |
| Người chấm | `/evaluator/assignments/:assignmentId` | EvaluatorAssignmentDetailPage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | Không có test riêng theo tên component |
| Bộ môn | `/department/workspace` | DepartmentWorkspacePage | Snapshot lượt trước (department); chưa xác minh mọi thao tác. | `src/features/department/pages/DepartmentWorkspacePage.test.tsx` |
| Học vụ (theo vai trò route) | `/academic` | AcademicStructurePage | Snapshot lượt trước (department); chưa xác minh mọi thao tác. | `src/features/academic/pages/AcademicStructurePage.test.tsx` |
| Học vụ (theo vai trò route) | `/academic/profile-verifications` | ProfileVerificationsPage | Snapshot lượt trước (department); chưa xác minh mọi thao tác. | `src/features/academic/pages/ProfileVerificationsPage.test.tsx` |
| Bộ môn | `/department/portfolio` | PortfolioDashboardPage | Snapshot lượt trước (department); chưa xác minh mọi thao tác. | `src/features/dashboard/pages/PortfolioDashboardPage.test.tsx` |
| Bộ môn | `/department/projects/archived` | ArchivedProjectsPage | Snapshot lượt trước (department); chưa xác minh mọi thao tác. | Không có test riêng theo tên component |
| Học vụ (theo vai trò route) | `/academic/governance` | AcademicGovernancePage | Tài khoản ADMIN + DEPARTMENT_STAFF: menu mở đúng trang; thẻ/trạng thái/form đã kiểm tra lượt trước. | `src/features/academic/pages/AcademicGovernancePage.test.tsx` |
| Học vụ (theo vai trò route) | `/academic/project-periods/:periodId/policy` | PeriodPolicyManagementPage | Giai đoạn 4: mở bản kế tiếp, kiểm tra form 390px, hủy; không lưu chính sách. | Không có test riêng theo tên component |
| Học vụ (theo vai trò route) | `/academic/rubrics` | RubricManagementPage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | `src/features/evaluations/RubricManagementPage.test.tsx` |
| Bộ môn | `/department/projects/review` | ProjectReviewPage | Snapshot lượt trước (department); chưa xác minh mọi thao tác. | `src/features/projects/pages/ProjectReviewPage.test.tsx` |
| Bộ môn | `/department/projects/review/:id` | ProjectReviewPage | Snapshot lượt trước (department); chưa xác minh mọi thao tác. | `src/features/projects/pages/ProjectReviewPage.test.tsx` |
| Bộ môn | `/department/projects/:projectId/result` | ResultPublicationPage | Snapshot lượt trước (department); chưa xác minh mọi thao tác. | Không có test riêng theo tên component |
| Bộ môn | `/department/projects/:projectId/evaluations` | EvaluatorAssignmentManagementPage | Snapshot lượt trước (department); chưa xác minh mọi thao tác. | `src/features/evaluations/EvaluatorAssignmentManagementPage.test.tsx` |
| Bộ môn | `/department/projects/:projectId/evaluators` | EvaluatorAssignmentManagementPage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | `src/features/evaluations/EvaluatorAssignmentManagementPage.test.tsx` |
| Bộ môn | `/department/projects/:projectId/evaluation-schemes` | EvaluationSchemeManagementPage | Snapshot lượt trước (department); chưa xác minh mọi thao tác. | Không có test riêng theo tên component |
| Bộ môn | `/department/projects/:projectId/governance` | ProjectGovernancePage | Snapshot lượt trước (department); chưa xác minh mọi thao tác. | Không có test riêng theo tên component |
| Bộ môn | `/department/projects/:projectId/final-requirements` | FinalRequirementsPage | Snapshot lượt trước (department); chưa xác minh mọi thao tác. | Không có test riêng theo tên component |
| Bộ môn | `/department/projects/:projectId/final-submission` | FinalSubmissionViewerPage | Snapshot lượt trước (department); chưa xác minh mọi thao tác. | `src/features/final-submission/FinalSubmissionViewerPage.test.tsx` |
| Bộ môn | `/department/projects/:projectId/files` | ProjectFilesPage | Snapshot lượt trước (department); chưa xác minh mọi thao tác. | `src/features/files/ProjectFilesPage.test.tsx` |
| Bộ môn | `/department/projects/:projectId/contributions` | ProjectContributionsPage | Snapshot lượt trước (department); chưa xác minh mọi thao tác. | `src/features/contributions/ProjectContributionsPage.test.tsx` |
| Bộ môn | `/department/projects/:projectId/risk` | DepartmentProjectRiskPage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | Không có test riêng theo tên component |
| Bộ môn | `/department/projects/:projectId/archive-view` | ProjectArchiveViewPage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | Không có test riêng theo tên component |
| Bộ môn | `/department/supervisors` | SupervisorMonitoringPage | Snapshot lượt trước (department); chưa xác minh mọi thao tác. | `src/features/supervisors/pages/SupervisorMonitoringPage.test.tsx` |
| Bộ môn | `/department/supervisors/:id` | SupervisorMonitoringPage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | `src/features/supervisors/pages/SupervisorMonitoringPage.test.tsx` |
| Bộ môn | `/department/student-qualifications` | QualificationVerificationPage | Snapshot lượt trước (department); chưa xác minh mọi thao tác. | `src/features/qualifications/pages/QualificationVerificationPage.test.tsx` |
| Bộ môn | `/department/topics` | TopicManagementPage | Snapshot lượt trước (department); chưa xác minh mọi thao tác. | `src/features/topics/pages/TopicManagementPage.test.tsx` |
| Bộ môn | `/department/topics/:id` | TopicManagementPage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | `src/features/topics/pages/TopicManagementPage.test.tsx` |
| Quản trị | `/admin/access` | AdminWorkspacePage | Chưa ghi nhận kiểm tra trực tiếp; rà nguồn/kiểm thử khi có. | Không có test riêng theo tên component |
| Quản trị | `/admin/portfolio` | PortfolioDashboardPage | Snapshot lượt trước (admin); chưa xác minh mọi thao tác. | `src/features/dashboard/pages/PortfolioDashboardPage.test.tsx` |
| Quản trị | `/admin/milestone-templates` | MilestoneTemplatesPage | Danh sách rỗng; mở form tạo mẫu rồi hủy. Phiên bản có dữ liệu: kiểm thử component. | `src/features/milestones/MilestoneTemplatesPage.test.tsx` |
| Quản trị | `/admin/access/rbac` | AdminRbacPage | Snapshot lượt trước (admin); chưa xác minh mọi thao tác. | Không có test riêng theo tên component |
| Quản trị | `/admin/access/users/:userId` | AdminUserDetailPage | Snapshot lượt trước (admin); chưa xác minh mọi thao tác. | `src/features/users/pages/AdminUserDetailPage.test.tsx` |
