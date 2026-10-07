import { MilestoneTemplatesPage } from '../../features/milestones/MilestoneTemplatesPage'
import { ProfileVerificationsPage } from '../../features/academic/pages/ProfileVerificationsPage'
import { createBrowserRouter } from 'react-router-dom'
import { RouteFrame } from './RouteFrame'
import { AppLayout } from '../layouts/AppLayout'
import { HomeRedirect, RoleRoute } from '../../features/auth/components/RoleRoute'
import { LecturerWorkspacePage } from '../../features/supervisors/pages/LecturerWorkspacePage'
import { SupervisorProfilePage } from '../../features/supervisors/pages/SupervisorProfilePage'
import { SupervisorProjectWorkspacePage } from '../../features/supervisors/pages/SupervisorProjectWorkspacePage'
import { SupervisorProgressReviewPage } from '../../features/supervisors/pages/SupervisorProgressReviewPage'
import { SupervisorFinalSubmissionPage } from '../../features/supervisors/pages/SupervisorFinalSubmissionPage'
import { SupervisorExecutionRoute } from '../../features/supervisors/components/SupervisorExecutionRoute'
import { MentorExecutionRoute } from '../../features/mentors/components/MentorExecutionRoute'
import { MentorProjectWorkspacePage, MentorWorkspacePage } from '../../features/mentors/pages/MentorWorkspacePage'
import { OverviewPage } from '../pages/OverviewPage'
import { ActiveProjectWorkspacePage } from '../../features/projects/pages/ActiveProjectWorkspacePage'
import { ActiveStudentProjectRoute } from '../../features/projects/components/ActiveStudentProjectRoute'
import { TaskBoardPage } from '../../features/tasks/pages/TaskBoardPage'
import { TaskDetailPage } from '../../features/tasks/pages/TaskDetailPage'
import { ProgressReportsPage } from '../../features/reports/ProgressReportsPage'
import { MeetingsPage } from '../../features/meetings/MeetingsPage'
import { CreateMeetingPage } from '../../features/meetings/CreateMeetingPage'
import { MeetingDetailPage } from '../../features/meetings/MeetingDetailPage'
import { MeetingVideoRoomPage } from '../../features/meetings/video/MeetingVideoRoomPage'
import { ProgressReportDetailPage } from '../../features/reports/ProgressReportDetailPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ProjectLifecyclePage } from '../../features/projects/pages/ProjectLifecyclePage'
import { MilestoneDetailPage } from '../../features/milestones/pages/MilestoneDetailPage'
import { GanttPage } from '../../features/progress/pages/GanttPage'
import { TeamManagementPage } from '../../features/teams/pages/TeamManagementPage'
import { TopicCataloguePage } from '../../features/projects/pages/TopicCataloguePage'
import { ProjectRegistrationFormPage } from '../../features/projects/pages/ProjectRegistrationFormPage'
import { ProjectReviewStatusPage } from '../../features/projects/pages/ProjectReviewStatusPage'
import { SupervisorSelectionPage } from '../../features/supervisors/pages/SupervisorSelectionPage'
import { LoginPage } from '../../features/auth/pages/LoginPage'
import { ForgotPasswordPage, ProfileSecurityPage, ResetPasswordPage } from '../../features/auth/pages/SelfServicePages'
import { ProfilePage } from '../../features/auth/pages/ProfilePage'
import { AcademicStructurePage } from '../../features/academic/pages/AcademicStructurePage'
import { AcademicGovernancePage } from '../../features/academic/pages/AcademicGovernancePage'
import { PeriodPolicyManagementPage } from '../../features/academic/pages/PeriodPolicyManagementPage'
import { AdminWorkspacePage } from '../../features/users/pages/AdminWorkspacePage'
import { AdminRbacPage } from '../../features/users/pages/AdminRbacPage'
import { AdminUserDetailPage } from '../../features/users/pages/AdminUserDetailPage'
import { ProjectReviewPage } from '../../features/projects/pages/ProjectReviewPage'
import { ProjectGovernancePage } from '../../features/projects/pages/ProjectGovernancePage'
import { SupervisorMonitoringPage } from '../../features/supervisors/pages/SupervisorMonitoringPage'
import { TopicManagementPage } from '../../features/topics/pages/TopicManagementPage'
import { RegistrationSourcePage } from '../../features/registration/pages/RegistrationSourcePage'
import { QualificationVerificationPage } from '../../features/qualifications/pages/QualificationVerificationPage'
import { DeliverablesPage } from '../../features/deliverables/DeliverablesPage'
import { EvaluatorAssignmentsPage } from '../../features/evaluations/EvaluatorAssignmentsPage'
import { EvaluationWorkspacePage } from '../../features/evaluations/EvaluationWorkspacePage'
import { EvaluatorAssignmentRoute } from '../../features/evaluations/components/EvaluatorAssignmentRoute'
import { EvaluatorAssignmentDetailPage } from '../../features/evaluations/pages/EvaluatorAssignmentDetailPage'
import { EvaluatorWorkspacePage } from '../../features/evaluations/pages/EvaluatorWorkspacePage'
import { ResultPublicationPage } from '../../features/results/ResultPublicationPage'
import { ProtectedRoute } from '../../features/auth/components/ProtectedRoute'
import { NotificationsPage } from '../../features/notifications/NotificationsPage'
import { PortfolioDashboardPage } from '../../features/dashboard/pages/PortfolioDashboardPage'
import { SupervisorDashboardPage } from '../../features/dashboard/pages/SupervisorDashboardPage'
import { FinalRequirementsPage, FinalSubmissionViewerPage, StudentFinalSubmissionPage } from '../../features/final-submission/FinalSubmissionPage'
import { RubricManagementPage } from '../../features/evaluations/RubricManagementPage'
import { EvaluatorAssignmentManagementPage } from '../../features/evaluations/EvaluatorAssignmentManagementPage'
import { EvaluationSchemeManagementPage } from '../../features/evaluations/EvaluationSchemeManagementPage'
import { StudentProjectResultPage } from '../../features/results/StudentProjectResultPage'
import { ProjectContributionsPage } from '../../features/contributions/ProjectContributionsPage'
import { ProjectFilesPage } from '../../features/files/ProjectFilesPage'
import { ProjectEvidenceLedgerPage } from '../../features/evidence/ProjectEvidenceLedger'
import { ProjectAiPage } from '../../features/ai/ProjectAiPage'
import { DepartmentProjectRiskPage } from '../../features/ai/DepartmentProjectRiskPage'
import { DepartmentWorkspacePage } from '../../features/department/pages/DepartmentWorkspacePage'
import { DepartmentAcademicScopeRoute } from '../../features/department/components/DepartmentAcademicScopeRoute'
import { ArchivedProjectsPage } from '../../features/projects/pages/ArchivedProjectsPage'
import { ProjectArchiveViewPage } from '../../features/projects/pages/ProjectArchiveViewPage'
import { CalendarAttentionPage } from '../../features/calendar/CalendarAttentionPage'
import { AcademicWorkflowGate, StudentJourneyProvider } from '../context'
import { env } from '../config/env'
import { ChatPage } from '../../features/chat/ChatPage'

export const appRouter = createBrowserRouter([{ element: <RouteFrame />, children: [
  { path: 'login', element: <LoginPage /> },
  { path: 'forgot-password', element: <ForgotPasswordPage /> },
  { path: 'reset-password', element: <ResetPasswordPage /> },
  {
    element: (
      <ProtectedRoute>
        <AcademicWorkflowGate>
          <StudentJourneyProvider>
            <AppLayout />
          </StudentJourneyProvider>
        </AcademicWorkflowGate>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'profile/security', element: <ProfileSecurityPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'calendar', element: <CalendarAttentionPage /> },
      { path: 'messages/:conversationId?', element: <ChatPage /> },
      {
        element: <RoleRoute allowed={['student']} />,
        children: [
          { path: 'project/overview', element: <OverviewPage /> },
          { element: <ActiveStudentProjectRoute />, children: [
            { path: 'project/workspace', element: <ActiveProjectWorkspacePage /> },
            { path: 'project/milestones/:milestoneId?', element: <MilestoneDetailPage /> },
            { path: 'project/tasks', element: <TaskBoardPage /> },
            { path: 'project/tasks/:taskId', element: <TaskDetailPage /> },
            { path: 'project/gantt', element: <GanttPage /> },
            { path: 'project/reports', element: <ProgressReportsPage /> },
            { path: 'project/reports/new', element: <ProgressReportDetailPage create /> },
            { path: 'project/reports/:reportId', element: <ProgressReportDetailPage /> },
            { path: 'project/meetings', element: <MeetingsPage /> },
            { path: 'project/meetings/new', element: <CreateMeetingPage /> },
            { path: 'project/meetings/:meetingId/video', element: <MeetingVideoRoomPage /> },
            { path: 'project/meetings/:meetingId', element: <MeetingDetailPage /> },
            { path: 'project/deliverables', element: <DeliverablesPage /> },
            { path: 'project/files', element: <ProjectFilesPage /> },
            { path: 'project/evidence', element: <ProjectEvidenceLedgerPage /> },
            { path: 'project/contributions', element: <ProjectContributionsPage /> },
            ...(env.aiAdvisoryEnabled ? [{ path: 'project/ai', element: <ProjectAiPage /> }] : []),
          ] },
          { path: 'projects/lifecycle', element: <ProjectLifecyclePage /> },
          { path: 'team', element: <TeamManagementPage /> },
          { path: 'team/create', element: <TeamManagementPage /> },
          { path: 'topics', element: <TopicCataloguePage /> },
          { path: 'project/source', element: <RegistrationSourcePage /> },
          { path: 'project/register', element: <ProjectRegistrationFormPage /> },
          { path: 'project/edit', element: <ProjectRegistrationFormPage /> },
          { path: 'project/status', element: <ProjectReviewStatusPage /> },
          { path: 'project/supervisor', element: <SupervisorSelectionPage /> },
          { path: 'project/final-submission', element: <StudentFinalSubmissionPage /> },
          { path: 'project/result', element: <StudentProjectResultPage /> },
        ],
      },
      {
        element: <RoleRoute allowed={['lecturer']} />,
        children: [
          { path: 'supervisor/workspace', element: <LecturerWorkspacePage /> },
          { path: 'supervisor/profile', element: <SupervisorProfilePage /> },
          { path: 'supervisor/dashboard', element: <SupervisorDashboardPage /> },
          { path: 'mentor/workspace', element: <MentorWorkspacePage /> },
          { element: <SupervisorExecutionRoute />, children: [
            { path: 'supervisor/projects/:projectId/workspace', element: <SupervisorProjectWorkspacePage /> },
            { path: 'supervisor/projects/:projectId/progress', element: <SupervisorProgressReviewPage /> },
            { path: 'supervisor/projects/:projectId/milestones/:milestoneId?', element: <MilestoneDetailPage /> },
            { path: 'supervisor/projects/:projectId/tasks', element: <TaskBoardPage /> },
            { path: 'supervisor/projects/:projectId/tasks/:taskId', element: <TaskDetailPage /> },
            { path: 'supervisor/projects/:projectId/gantt', element: <GanttPage /> },
            { path: 'supervisor/projects/:projectId/reports', element: <ProgressReportsPage /> },
            { path: 'supervisor/projects/:projectId/reports/:reportId', element: <ProgressReportDetailPage /> },
            { path: 'supervisor/projects/:projectId/meetings', element: <MeetingsPage /> },
            { path: 'supervisor/projects/:projectId/meetings/new', element: <CreateMeetingPage /> },
            { path: 'supervisor/projects/:projectId/meetings/:meetingId/video', element: <MeetingVideoRoomPage /> },
            { path: 'supervisor/projects/:projectId/meetings/:meetingId', element: <MeetingDetailPage /> },
            { path: 'supervisor/projects/:projectId/deliverables', element: <DeliverablesPage /> },
            { path: 'supervisor/projects/:projectId/files', element: <ProjectFilesPage /> },
            { path: 'supervisor/projects/:projectId/evidence', element: <ProjectEvidenceLedgerPage /> },
            { path: 'supervisor/projects/:projectId/contributions', element: <ProjectContributionsPage /> },
            { path: 'supervisor/projects/:projectId/final-submission', element: <SupervisorFinalSubmissionPage /> },
            ...(env.aiAdvisoryEnabled ? [{ path: 'supervisor/projects/:projectId/ai', element: <ProjectAiPage /> }] : []),
          ] },
          { element: <MentorExecutionRoute />, children: [
            { path: 'mentor/projects/:projectId/majors/:majorId/workspace', element: <MentorProjectWorkspacePage /> },
            { path: 'mentor/projects/:projectId/majors/:majorId/tasks', element: <TaskBoardPage /> },
            { path: 'mentor/projects/:projectId/majors/:majorId/tasks/:taskId', element: <TaskDetailPage /> },
            { path: 'mentor/projects/:projectId/majors/:majorId/reports', element: <ProgressReportsPage /> },
            { path: 'mentor/projects/:projectId/majors/:majorId/reports/:reportId', element: <ProgressReportDetailPage /> },
            { path: 'mentor/projects/:projectId/majors/:majorId/meetings', element: <MeetingsPage /> },
            { path: 'mentor/projects/:projectId/majors/:majorId/meetings/:meetingId', element: <MeetingDetailPage /> },
            { path: 'mentor/projects/:projectId/majors/:majorId/evidence', element: <ProjectEvidenceLedgerPage /> },
          ] },
          { path: 'evaluator/evaluations', element: <EvaluatorAssignmentsPage /> },
          { path: 'evaluator/evaluations/:evaluationId', element: <EvaluationWorkspacePage /> },
          { path: 'evaluator/projects/:projectId/final-submission', element: <FinalSubmissionViewerPage backTo="/evaluator/evaluations" backLabel="Danh sách phân công" /> },
          { path: 'evaluator/workspace', element: <EvaluatorWorkspacePage /> },
          { element: <EvaluatorAssignmentRoute />, children: [
            { path: 'evaluator/assignments/:assignmentId', element: <EvaluatorAssignmentDetailPage /> },
          ] },
        ],
      },
      {
        element: <RoleRoute allowed={['department']} />,
        children: [
          { element: <DepartmentAcademicScopeRoute />, children: [
            { path: 'department/workspace', element: <DepartmentWorkspacePage /> },
          ] },
        ],
      },
      {
        element: <RoleRoute allowed={['department', 'admin']} />,
        children: [
          { path: 'academic', element: <AcademicStructurePage /> },
          { path: 'academic/profile-verifications', element: <ProfileVerificationsPage /> },
        ],
      },
      {
        element: <RoleRoute allowed={['department']} />,
        children: [
          { path: 'department/portfolio', element: <PortfolioDashboardPage /> },
          { path: 'department/projects/archived', element: <ArchivedProjectsPage /> },
          { path: 'academic/governance', element: <AcademicGovernancePage /> },
          { path: 'academic/project-periods/:periodId/policy', element: <PeriodPolicyManagementPage /> },
          { path: 'academic/rubrics', element: <RubricManagementPage /> },
          { path: 'department/projects/review', element: <ProjectReviewPage /> },
          { path: 'department/projects/review/:id', element: <ProjectReviewPage /> },
          { path: 'department/projects/:projectId/result', element: <ResultPublicationPage /> },
          { path: 'department/projects/:projectId/evaluations', element: <EvaluatorAssignmentManagementPage /> },
          { path: 'department/projects/:projectId/evaluators', element: <EvaluatorAssignmentManagementPage /> },
          { path: 'department/projects/:projectId/evaluation-schemes', element: <EvaluationSchemeManagementPage /> },
          { path: 'department/projects/:projectId/governance', element: <ProjectGovernancePage /> },
          { path: 'department/projects/:projectId/final-requirements', element: <FinalRequirementsPage /> },
          { path: 'department/projects/:projectId/final-submission', element: <FinalSubmissionViewerPage backTo="/department/portfolio" backLabel="Danh mục đồ án" /> },
          { path: 'department/projects/:projectId/files', element: <ProjectFilesPage /> },
          { path: 'department/projects/:projectId/contributions', element: <ProjectContributionsPage /> },
          ...(env.aiAdvisoryEnabled ? [{ path: 'department/projects/:projectId/risk', element: <DepartmentProjectRiskPage /> }] : []),
          { path: 'department/projects/:projectId/archive-view', element: <ProjectArchiveViewPage /> },
          { path: 'department/supervisors', element: <SupervisorMonitoringPage /> },
          { path: 'department/supervisors/:id', element: <SupervisorMonitoringPage /> },
          { path: 'department/student-qualifications', element: <QualificationVerificationPage /> },
          { path: 'department/topics', element: <TopicManagementPage /> },
          { path: 'department/topics/:id', element: <TopicManagementPage /> },
        ],
      },
      {
        element: <RoleRoute allowed={['admin']} />,
        children: [
          { path: 'admin/access', element: <AdminWorkspacePage /> },
          { path: 'admin/portfolio', element: <PortfolioDashboardPage /> },
          { path: 'admin/milestone-templates', element: <MilestoneTemplatesPage /> },
          { path: 'admin/access/rbac', element: <AdminRbacPage /> },
          { path: 'admin/access/users/:userId', element: <AdminUserDetailPage /> },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
]}])

