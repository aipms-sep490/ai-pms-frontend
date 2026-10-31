# AI-PMS — BẢNG ĐIỀU TRA ROUTE, WORKSPACE & HÀNH VI HIỆN TẠI (ROUTE INVENTORY)

**Ngày lập:** 31/10/2026
**Nhánh công tác:** `feat/uiux-academic-command-center` (tạo từ `develop` mới nhất — SHA: `c67f42e`)
**Mục tiêu:** Kiểm toán toàn bộ routes, components, vai trò, quyền, state/mode dependencies, form, bảng, mức độ rủi ro theo tiêu chuẩn Giai đoạn A trong Master Prompt.
**Nguyên tắc bất biến:** Không đổi route, không đổi API contracts, không đổi logic nghiệp vụ, giữ nguyên ngôn ngữ tiếng Việt.

---

## 1. TỔNG HỢP ROUTE THEO MODULE & VAI TRÒ

| Route chính xác từ code | Module | Component / File | Role / Guard | State / Mode Dependency | API / Query Hooks | Forms & Actions | Test hiện có | Mức độ rủi ro | Trạng thái audit |
|---|---|---|---|---|---|---|---|---|---|
| `/login` | Identity | `LoginPage.tsx` | Public | None | `authApi.login` | Đăng nhập form, link forgot password | Auth tests | P1 | Đã audit |
| `/forgot-password` | Identity | `ForgotPasswordPage.tsx` | Public | None | `authApi.forgotPassword` | Form gửi email khôi phục | `SelfServicePages.test.tsx` | P2 | Đã audit |
| `/reset-password` | Identity | `ResetPasswordPage.tsx` | Public | None | `authApi.resetPassword` | Form đặt lại mật khẩu mới | `SelfServicePages.test.tsx` | P1 | Đã audit |
| `/industry/enroll` | Identity / Industry | `IndustryEnrollmentRoute.tsx` | Public / Feature flag | `env.industryEnabled` | `industryApi.enroll` | Nhập mã tham gia doanh nghiệp | `IndustryEnrollmentPage.test.tsx` | P2 | Đã audit |
| `/industry`, `/industry/workspace`, `/industry/assignments/:assignmentId` | Industry | `IndustryExpertPortalPage.tsx` | `industry` / Protected | `env.industryEnabled` | `industryApi.getAssignments` | Xem phân công, nộp nhận xét chuyên gia | `IndustryRoutes.tsx` | P1 | Đã audit |
| `/profile` | Account | `ProfilePage.tsx` | All authenticated | None | `authApi.getProfile`, `updateProfile` | Chỉnh sửa thông tin cá nhân | `ProfilePage.test.tsx` | P0 | Đã audit |
| `/profile/security` | Account | `ProfileSecurityPage.tsx` | All authenticated | None | `authApi.changePassword` | Đổi mật khẩu | `ProfilePage.test.tsx` | P1 | Đã audit |
| `/notifications` | Account / Inbox | `NotificationsPage.tsx` | All authenticated | None | `notificationsApi` | Xem thông báo, lọc, đánh dấu đã đọc | `notification-copy.test.tsx` | P1 | Đã audit |
| `/calendar` | Coordination | `CalendarAttentionPage.tsx` | All authenticated | None | `calendarApi`, `actionAggregator` | Lịch mốc, báo cáo, việc cần chú ý | `CalendarAttentionPage.test.tsx` | P0 | Đã audit |
| `/messages/:conversationId?` | Chat | `ChatPage.tsx` | All authenticated | None | `chatApi`, SignalR | Trò chuyện nhóm đồ án, đính kèm | `ChatDock.test.tsx` | P1 | Đã audit |
| `/project/overview` | Student Workspace | `OverviewPage.tsx` | `student` | Student Journey | `journeyApi`, `projectApi` | Xem tiến độ tổng quan đồ án | `OverviewPage.test.tsx` | P0 | Đã audit |
| `/project/workspace` | Student Workspace | `ActiveProjectWorkspacePage.tsx` | `student` / `ActiveStudentProjectRoute` | Project `ACTIVE` | `projectApi`, `milestonesApi` | Dashboard điều phối đồ án active | `CollaborationWorkspace.test.tsx` | P0 | Đã audit |
| `/project/milestones/:milestoneId?` | Student Milestones | `MilestoneDetailPage.tsx` | `student` | Project `ACTIVE` | `milestonesApi` | Chi tiết mốc, danh sách deliverables | `MilestoneDetailPage.test.tsx` | P0 | Đã audit |
| `/project/tasks` | Student Tasks | `TaskBoardPage.tsx` | `student` | Project `ACTIVE` | `tasksApi`, `sprintsApi` | Bảng Kanban công việc đồ án, lọc sprint | `TaskBoardPage.test.tsx` | P0 | Đã audit |
| `/project/tasks/:taskId` | Student Tasks | `TaskDetailPage.tsx` | `student` | Project `ACTIVE` | `tasksApi` | Chi tiết task, chỉnh sửa, gán người, minh chứng | `TaskDetailPage.test.tsx` | P0 | Đã audit |
| `/project/gantt` | Student Timeline | `GanttPage.tsx` | `student` | Project `ACTIVE` | `tasksApi`, `milestonesApi` | Biểu đồ Gantt tiến độ công việc | `filter-gantt-tasks.test.ts` | P1 | Đã audit |
| `/project/reports` | Student Reporting | `ProgressReportsPage.tsx` | `student` | Project `ACTIVE` | `progressReportsApi` | Danh sách báo cáo tiến độ theo chu kỳ | `ProgressReports.test.tsx` | P0 | Đã audit |
| `/project/reports/new` | Student Reporting | `ProgressReportDetailPage.tsx` | `student` | Project `ACTIVE` | `progressReportsApi` | Tạo báo cáo tiến độ mới | `ProgressReports.test.tsx` | P0 | Đã audit |
| `/project/reports/:reportId` | Student Reporting | `ProgressReportDetailPage.tsx` | `student` | Project `ACTIVE` | `progressReportsApi` | Chi tiết, nộp báo cáo, xem phản hồi GVHD | `ProgressReports.test.tsx` | P0 | Đã audit |
| `/project/meetings` | Collaboration | `MeetingsPage.tsx` | `student` | Project `ACTIVE` | `meetingsApi` | Danh sách lịch họp, điểm danh, biên bản | `Meetings.test.tsx` | P0 | Đã audit |
| `/project/meetings/new` | Collaboration | `CreateMeetingPage.tsx` | `student` | Project `ACTIVE` | `meetingsApi` | Đặt lịch họp mới với GVHD/nhóm | `Meetings.test.tsx` | P1 | Đã audit |
| `/project/meetings/:meetingId` | Collaboration | `MeetingDetailPage.tsx` | `student` | Project `ACTIVE` | `meetingsApi` | Biên bản cuộc họp, action items | `Meetings.test.tsx` | P1 | Đã audit |
| `/project/meetings/:meetingId/video` | Collaboration | `MeetingVideoRoomPage.tsx` | `student` | Project `ACTIVE` | LiveKit, SignalR | Phòng họp video trực tuyến | `MeetingVideoRoomPage.test.tsx` | P1 | Đã audit |
| `/project/deliverables` | Deliverables | `DeliverablesPage.tsx` | `student` | Project `ACTIVE` | `deliverablesApi` | Hạng mục sản phẩm nộp, tải file | `DeliverablesPage.test.tsx` | P0 | Đã audit |
| `/project/files` | File Repository | `ProjectFilesPage.tsx` | `student` | Project `ACTIVE` | `projectFilesApi` | Kho tệp tài liệu đồ án | `ProjectFilesPage.test.tsx` | P1 | Đã audit |
| `/project/evidence` | Evidence Ledger | `ProjectEvidenceLedgerPage.tsx` | `student` | Project `ACTIVE` | `evaluationEvidenceApi` | Sổ cái minh chứng học thuật | `evaluation-evidence.test.ts` | P0 | Đã audit |
| `/project/contributions` | Collaboration | `ProjectContributionsPage.tsx` | `student` | Project `ACTIVE` | `contributionsApi` | Phân tích tỉ lệ đóng góp thành viên | `contributions-api.test.ts` | P1 | Đã audit |
| `/project/gates` | Review Gates | `ProjectGatesPage.tsx` | `student` | `env.gatesEnabled` | `reviewGatesApi` | Trạng thái cổng soát xét | `ReviewGatesRound3.test.tsx` | P0 | Đã audit |
| `/project/timeline`, `/project/review-gates` | Review Gates | `StudentReviewTimelinePage.tsx` | `student` | Project `ACTIVE` | `reviewGatesApi` | Dòng thời gian Review Gates, nộp minh chứng | `ReviewGatesRound3.test.tsx` | P0 | Đã audit |
| `/project/defense` | Defense | `ProjectDefensePage.tsx` | `student` | `env.defenseScheduleEnabled` | `defenseApi` | Lịch bảo vệ và hội đồng | `defense-api.test.ts` | P1 | Đã audit |
| `/project/cold-reports` | Cold Evaluation | `ColdChecklistPage.tsx` | `student` | `env.coldReportEnabled` | `coldReportsApi` | Checklist báo cáo chấm nguội | `ColdChecklistPage.test.tsx` | P1 | Đã audit |
| `/project/peer-evaluation` | Peer Evaluation | `ProjectPeerEvaluationPage.tsx` | `student` | `env.peerEvaluationEnabled` | `peerEvaluationApi` | Đánh giá chéo thành viên nội bộ nhóm | `peer-eval-api.test.ts` | P1 | Đã audit |
| `/project/ai` | AI Insights | `ProjectAiPage.tsx` | `student` | `env.aiAdvisoryEnabled` | `aiApi` | Trợ lý AI và phân tích rủi ro tiến độ | `AiAnalysisRunsPanel.test.tsx` | P1 | Đã audit |
| `/project/agreement` | Working Agreement | `ProjectWorkingAgreementPage.tsx` | `student` | `env.workingAgreementEnabled` | `agreementApi` | Cam kết làm việc nhóm | `working-agreement.test.ts` | P2 | Đã audit |
| `/projects/lifecycle` | Lifecycle | `ProjectLifecyclePage.tsx` | `student` | None | `journeyApi` | Lịch sử trạng thái và tiến trình đồ án | `ProjectLifecyclePage.test.tsx` | P1 | Đã audit |
| `/team`, `/team/create` | Team | `TeamManagementPage.tsx` | `student` | None | `teamsApi` | Quản lý nhóm, mời thành viên, phân vai trò | `TeamManagementPage.test.tsx` | P0 | Đã audit |
| `/topics` | Topics | `TopicCataloguePage.tsx` | `student` | None | `topicsApi` | Tra cứu danh mục đề tài, đăng ký đề tài | `useTopics.test.tsx` | P0 | Đã audit |
| `/project/source` | Registration | `RegistrationSourcePage.tsx` | `student` | None | `registrationApi` | Chọn nguồn đề tài (đề xuất/khoa/doanh nghiệp) | `RegistrationSourcePage.test.tsx` | P1 | Đã audit |
| `/project/register`, `/project/edit` | Registration | `ProjectRegistrationFormPage.tsx` | `student` | None | `registrationApi` | Form đăng ký/chỉnh sửa đề tài | `ProjectRegistrationFormPage.test.tsx` | P0 | Đã audit |
| `/project/status` | Registration | `ProjectReviewStatusPage.tsx` | `student` | None | `registrationApi` | Trạng thái thẩm định đề tài | `ProjectReviewStatusPage.test.tsx` | P1 | Đã audit |
| `/project/supervisor` | Supervision | `SupervisorSelectionPage.tsx` | `student` | None | `supervisorsApi` | Đề xuất/lựa chọn GVHD và Mentor | `useSupervisorSelection.test.tsx` | P0 | Đã audit |
| `/project/final-submission` | Finalization | `StudentFinalSubmissionPage.tsx` | `student` | Project `ACTIVE` | `finalSubmissionApi` | Kiểm tra điều kiện & nộp đồ án cuối kỳ | `StudentFinalSubmissionPage.test.tsx` | P0 | Đã audit |
| `/project/result` | Results | `StudentProjectResultPage.tsx` | `student` | None | `resultsApi` | Kết quả điểm đồ án sinh viên | `StudentProjectResultPage.test.tsx` | P0 | Đã audit |
| `/academic/assistant` | AI Assistant | `AcademicAssistantPage.tsx` | `student` | `env.academicAiAssistantEnabled` | `aiApi` | Trợ lý học vụ AI | `AcademicAssistantPanel.test.tsx` | P1 | Đã audit |
| `/supervisor/workspace` | Lecturer / Supervision | `LecturerWorkspacePage.tsx` | `lecturer` | None | `supervisorsApi` | Quản lý danh sách đồ án đang hướng dẫn | `LecturerWorkspacePage.test.tsx` | P0 | Đã audit |
| `/supervisor/profile` | Lecturer / Supervision | `SupervisorProfilePage.tsx` | `lecturer` | None | `supervisorsApi` | Hồ sơ năng lực và định hướng nghiên cứu | `SupervisorProfilePage.test.tsx` | P1 | Đã audit |
| `/supervisor/dashboard` | Lecturer / Supervision | `SupervisorDashboardPage.tsx` | `lecturer` | None | `supervisorsApi` | Dashboard tổng quan công việc hướng dẫn | `SupervisorDashboardPage.test.tsx` | P0 | Đã audit |
| `/mentor/workspace` | Lecturer / Mentor | `MentorWorkspacePage.tsx` | `lecturer` | None | `mentorsApi` | Danh sách đồ án hướng dẫn chuyên ngành | `MentorWorkspacePage.test.tsx` | P0 | Đã audit |
| `/supervisor/projects/:projectId/workspace` | Lecturer / Supervision | `SupervisorProjectWorkspacePage.tsx` | `lecturer` / `SupervisorExecutionRoute` | Project assignment | `projectApi` | Không gian điều hành đồ án cho GVHD | `SupervisorProjectWorkspacePage.test.tsx` | P0 | Đã audit |
| `/supervisor/projects/:projectId/progress` | Lecturer / Supervision | `SupervisorProgressReviewPage.tsx` | `lecturer` | Project assignment | `progressReportsApi` | Duyệt báo cáo tiến độ tuần/đợt | `SupervisorProgressReviewPage.test.tsx` | P0 | Đã audit |
| `/supervisor/projects/:projectId/weekly-assessments` | Lecturer / Supervision | `WeeklyAssessmentsPage.tsx` | `lecturer` | `env.weeklyAssessmentEnabled` | `weeklyAssessmentsApi` | Chấm đánh giá tuần sinh viên | `WeeklyAssessmentsPage.test.tsx` | P0 | Đã audit |
| `/supervisor/projects/:projectId/final-submission` | Lecturer / Supervision | `SupervisorFinalSubmissionPage.tsx` | `lecturer` | Project assignment | `finalSubmissionApi` | GVHD xác nhận điều kiện bảo vệ | `SupervisorFinalSubmissionPage.test.tsx` | P0 | Đã audit |
| `/evaluator/evaluations`, `/evaluator/workspace` | Evaluator | `EvaluatorWorkspacePage.tsx` | `lecturer` (EVALUATOR) | Evaluator assignment | `evaluationsApi` | Không gian chấm đồ án của hội đồng | `EvaluatorWorkspacePhase5.test.tsx` | P0 | Đã audit |
| `/evaluator/assignments/:assignmentId` | Evaluator | `EvaluatorAssignmentDetailPage.tsx` | `lecturer` (EVALUATOR) | Evaluator assignment | `evaluationsApi` | Form chấm điểm theo Rubric phân công | `EvaluatorAssignmentDetailPage.test.tsx` | P0 | Đã audit |
| `/evaluator/projects/:projectId/final-submission` | Evaluator | `FinalSubmissionViewerPage.tsx` | `lecturer` (EVALUATOR) | None | `finalSubmissionApi` | Xem gói nộp cuối để chấm điểm | `FinalSubmissionViewerPage.test.tsx` | P1 | Đã audit |
| `/review/gate-assignments` | Review Gates | `AssignedGateReviewPage.tsx` | `lecturer` | None | `reviewGatesApi` | Thẩm định và duyệt minh chứng Review Gates | `AssignedGateReviewPage.test.tsx` | P0 | Đã audit |
| `/department/workspace` | Department | `DepartmentWorkspacePage.tsx` | `department` | Academic scope | `governanceApi` | Tổng quan quản lý đồ án bộ môn | `DepartmentWorkspacePage.test.tsx` | P0 | Đã audit |
| `/department/portfolio` | Department | `PortfolioDashboardPage.tsx` | `department` | Academic scope | `governanceApi` | Danh mục & tiến độ toàn bộ đồ án bộ môn | `PortfolioDashboardPage.test.tsx` | P0 | Đã audit |
| `/department/projects/progress-matrix` | Department | `ReviewGateGovernancePage.tsx` | `department` | Academic scope | `reviewGatesApi` | Ma trận tiến độ Gates của các đồ án | `ReviewGateGovernancePage.test.tsx` | P0 | Đã audit |
| `/department/projects/review`, `/department/projects/review/:id` | Department | `ProjectReviewPage.tsx` | `department` | Academic scope | `topicsApi` | Hội đồng bộ môn thẩm định đề tài | `ProjectReviewPage.test.tsx` | P0 | Đã audit |
| `/department/projects/:projectId/result` | Department | `ResultPublicationPage.tsx` | `department` | Academic scope | `resultsApi` | Tổng hợp điểm và công bố kết quả | `ResultPublicationPage.test.tsx` | P0 | Đã audit |
| `/department/projects/:projectId/corrections` | Department | `ResultCorrectionsPage.tsx` | `department` / `lecturer` | `env.resultCorrectionEnabled` | `resultsApi` | Xử lý phúc khảo / điều chỉnh điểm | `ResultCorrectionPanel.test.tsx` | P0 | Đã audit |
| `/department/projects/:projectId/evaluators`, `.../evaluations` | Department | `EvaluatorAssignmentManagementPage.tsx` | `department` | Academic scope | `evaluationsApi` | Phân công người chấm theo Rubric/Scope | `EvaluatorAssignmentManagementPage.test.tsx` | P0 | Đã audit |
| `/department/projects/:projectId/evaluation-schemes` | Department | `EvaluationSchemeManagementPage.tsx` | `department` | Academic scope | `evaluationsApi` | Cấu hình biểu điểm & trọng số đánh giá | `EvaluationSchemeManagementPage.test.tsx` | P0 | Đã audit |
| `/department/projects/:projectId/governance` | Department | `ProjectGovernancePage.tsx` | `department` | Academic scope | `governanceApi` | Điều hành và phê duyệt ngoại lệ đồ án | `ProjectGovernancePage.test.tsx` | P0 | Đã audit |
| `/department/supervisors`, `/department/supervisors/:id` | Department | `SupervisorMonitoringPage.tsx` | `department` | Academic scope | `supervisorsApi` | Giám sát tải & phân công GVHD | `SupervisorMonitoringPage.test.tsx` | P0 | Đã audit |
| `/department/student-qualifications` | Department | `QualificationVerificationPage.tsx` | `department` | Academic scope | `qualificationsApi` | Xác minh điều kiện làm đồ án của sinh viên | `QualificationVerificationPage.test.tsx` | P0 | Đã audit |
| `/department/topics`, `/department/topics/:id` | Department | `TopicManagementPage.tsx` | `department` | Academic scope | `topicsApi` | Quản lý ngân hàng đề tài bộ môn | `TopicManagementPage.test.tsx` | P0 | Đã audit |
| `/department/cold-templates` | Department | `ColdTemplateManagementPage.tsx` | `department` | `env.coldReportEnabled` | `coldReportsApi` | Quản lý mẫu báo cáo chấm nguội | `ColdTemplateManagementPage.test.tsx` | P1 | Đã audit |
| `/academic` | Academic | `AcademicStructurePage.tsx` | `department`, `admin` | None | `governanceApi` | Cơ cấu tổ chức (Khoa, Bộ môn, Chuyên ngành) | `AcademicStructurePage.test.tsx` | P1 | Đã audit |
| `/academic/governance` | Academic | `AcademicGovernancePage.tsx` | `department`, `admin` | None | `governanceApi` | Học kỳ, đợt làm đồ án, chính sách | `AcademicGovernancePage.test.tsx` | P0 | Đã audit |
| `/academic/project-periods/:periodId/policy` | Academic | `PeriodPolicyManagementPage.tsx` | `department`, `admin` | None | `governanceApi` | Quy chế và khung thời gian đợt đồ án | `PeriodPolicyManagementPage.test.tsx` | P0 | Đã audit |
| `/academic/review-gates`, `.../:periodId/review-gates` | Academic | `ReviewGateGovernancePage.tsx` | `department`, `admin` | None | `reviewGatesApi` | Cấu hình mốc Review Gates của kỳ | `ReviewGateGovernancePage.test.tsx` | P0 | Đã audit |
| `/academic/profile-verifications` | Academic | `ProfileVerificationsPage.tsx` | `department`, `admin` | None | `governanceApi` | Phê duyệt thông tin học vụ sinh viên | `ProfileVerificationsPage.test.tsx` | P1 | Đã audit |
| `/academic/rubrics` | Academic | `RubricManagementPage.tsx` | `department`, `admin` | None | `rubricsApi` | Ngân hàng tiêu chí đánh giá (Rubric) | `RubricManagementPage.test.tsx` | P0 | Đã audit |
| `/academic/knowledge` | Academic | `AcademicKnowledgeManagementPage.tsx` | `department`, `admin` | `env.academicAiAssistantEnabled` | `aiApi` | Quản lý kho tri thức quy chế đồ án | `AcademicKnowledgeManagementPage.test.tsx` | P1 | Đã audit |
| `/admin/access` | Admin | `AdminWorkspacePage.tsx` | `admin` | None | `adminApi` | Quản lý người dùng, tài khoản hệ thống | `AdminWorkspacePhase6.test.tsx` | P0 | Đã audit |
| `/admin/access/rbac` | Admin | `AdminRbacPage.tsx` | `admin` | None | `adminApi` | Ma trận phân quyền RBAC | `AdminRbacPage.readonly.test.tsx` | P0 | Đã audit |
| `/admin/access/users/:userId` | Admin | `AdminUserDetailPage.tsx` | `admin` | None | `adminApi` | Chi tiết tài khoản & cấp quyền | `AdminWorkspacePhase6.test.tsx` | P1 | Đã audit |
| `/admin/milestone-templates` | Admin | `MilestoneTemplatesPage.tsx` | `admin` | None | `milestonesApi` | Quản lý mẫu mốc chuẩn toàn trường | `MilestoneTemplatesPage.test.tsx` | P1 | Đã audit |
| `/admin/portfolio` | Admin | `PortfolioDashboardPage.tsx` | `admin` | None | `governanceApi` | Danh mục tổng thể toàn trường | `PortfolioDashboardPage.test.tsx` | P1 | Đã audit |
| `/admin/industry` | Admin | `AdminIndustryInvitationsPage.tsx` | `admin` | `env.industryEnabled` | `industryApi` | Quản lý lời mời chuyên gia doanh nghiệp | `AdminIndustryInvitationsPage.tsx` | P1 | Đã audit |
| `/preview/workflows` | Preview | `WorkflowPreviewPage.tsx` | Development | `env.workflowPreviewEnabled` | Mocks | Xem trước tương tác UI | `CollaborationPreview.test.tsx` | P2 | Đã audit |

---

## 2. KẾ HOẠCH BẢO TỒN HÀNH VI (BASELINE INVARIANTS)

1. **Ngôn ngữ:** 100% tiếng Việt hiện có, giữ nguyên các thuật ngữ: "Phối hợp nhóm", "Công việc", "Hạng mục cần nộp", "Báo cáo tiến độ", "Thẩm định đề cương", "Review Gates", "Chấm nguội", "Đánh giá đồ án", v.v.
2. **Quyền & RBAC:** Không thay đổi bất kỳ `RoleRoute`, `ProtectedRoute`, `SupervisorExecutionRoute`, `MentorExecutionRoute`, `EvaluatorAssignmentRoute`, `DepartmentAcademicScopeRoute`.
3. **API & Contracts:** Giữ nguyên các endpoints, types, DTOs, query parameters, headers.
4. **Forms:** Giữ nguyên form validation, request payloads, state machine, unsaved edit warnings.
5. **Kanban & Drag-Drop:** Giữ nguyên các lanes trạng thái (`TODO`, `IN_PROGRESS`, `BLOCKED`, `IN_REVIEW`, `DONE`), rollback khi API lỗi, keyboard accessibility.
6. **Milestone & Gates:** Giữ nguyên phân biệt giữa Mốc đồ án (Milestone), Cổng soát xét (Review Gate) và Trạng thái đồ án (Project State).
7. **Scoring & Rubric:** Giữ nguyên tính toán điểm theo Rubric, phân biệt các scope `COMMON`, `OWN_MAJOR`, `INDIVIDUAL` và stage `ONGOING`, `COLD`, `DEFENSE`.
