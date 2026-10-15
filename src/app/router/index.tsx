import { createBrowserRouter } from 'react-router-dom'
import { RouteFrame } from './RouteFrame'
import { AppLayout } from '../layouts/AppLayout'
import { HomeRedirect, RoleRoute } from '../../features/auth/components/RoleRoute'
import { SupervisorExecutionRoute } from '../../features/supervisors/components/SupervisorExecutionRoute'
import { MentorExecutionRoute } from '../../features/mentors/components/MentorExecutionRoute'
import { ActiveStudentProjectRoute } from '../../features/projects/components/ActiveStudentProjectRoute'
import { NotFoundPage } from '../pages/NotFoundPage'
import { EvaluatorAssignmentRoute } from '../../features/evaluations/components/EvaluatorAssignmentRoute'
import { ProtectedRoute } from '../../features/auth/components/ProtectedRoute'
import { AcademicWorkflowGate, StudentJourneyProvider } from '../context'
import { env } from '../config/env'
import { DepartmentProjectLayout } from '../../features/department/components/DepartmentProjectLayout'
import { DepartmentAcademicScopeRoute } from '../../features/department/components/DepartmentAcademicScopeRoute'
import { AdminEvaluationLayout } from '../../features/evaluations/AdminEvaluationLayout'
import { ChatPage } from '../../features/chat/ChatPage'
import { IndustryLayout, IndustryWorkspaceRoute, IndustryAssignmentRoute } from '../../features/auth/components/IndustryRoutes'
import { IndustryEnrollmentRoute } from '../../features/auth/components/IndustryEnrollmentRoute'
import {
  MilestoneTemplatesPage, WorkflowPreviewPage, ProfileVerificationsPage, LecturerWorkspacePage, SupervisorProfilePage,
  SupervisorProjectWorkspacePage, SupervisorProgressReviewPage, SupervisorFinalSubmissionPage, WeeklyAssessmentsPage,
  MentorProjectWorkspacePage, MentorWorkspacePage, OverviewPage, ActiveProjectWorkspacePage, TaskBoardPage, TaskDetailPage,
  ProgressReportsPage, MeetingsPage, CreateMeetingPage, MeetingDetailPage, MeetingVideoRoomPage, ProgressReportDetailPage,
  ProjectLifecyclePage, MilestoneDetailPage, GanttPage, TeamManagementPage, TopicCataloguePage, ProjectRegistrationFormPage,
  ProjectReviewStatusPage, SupervisorSelectionPage, LoginPage, ForgotPasswordPage, ProfileSecurityPage, ResetPasswordPage,
  ProfilePage, AcademicStructurePage, AcademicGovernancePage, PeriodPolicyManagementPage, AdminWorkspacePage, AdminRbacPage,
  AdminUserDetailPage, ProjectReviewPage, ProjectGovernancePage, SupervisorMonitoringPage, TopicManagementPage,
  ColdTemplateManagementPage, RegistrationSourcePage, QualificationVerificationPage, DeliverablesPage,
  EvaluatorAssignmentsPage, EvaluationWorkspacePage, EvaluatorAssignmentDetailPage, EvaluatorWorkspacePage,
  ResultPublicationPage, ResultCorrectionsPage, NotificationsPage, PortfolioDashboardPage, SupervisorDashboardPage, FinalRequirementsPage,
  FinalSubmissionViewerPage, StudentFinalSubmissionPage, RubricManagementPage, EvaluatorAssignmentManagementPage,
  EvaluationSchemeManagementPage, StudentProjectResultPage, ProjectContributionsPage, ProjectFilesPage,
  ProjectEvidenceLedgerPage, ProjectAiPage, ProjectGatesPage, ProjectWorkingAgreementPage, ProjectDefensePage,
  ProjectPeerEvaluationPage, ColdChecklistPage, DepartmentProjectRiskPage, DepartmentWorkspacePage, ArchivedProjectsPage,
  ProjectArchiveViewPage, CalendarAttentionPage, AdminIndustryInvitationsPage,
} from './lazy-pages'

export const appRouter = createBrowserRouter([{ element: <RouteFrame />, children: [
  { path: 'login', element: <LoginPage /> },
  { path: 'forgot-password', element: <ForgotPasswordPage /> },
  { path: 'reset-password', element: <ResetPasswordPage /> },
  ...(env.industryEnabled ? [{ path: 'industry/enroll', element: <IndustryEnrollmentRoute /> }] : []),
  ...(env.industryEnabled ? [{
    path: 'industry', element: <ProtectedRoute><IndustryLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <IndustryWorkspaceRoute /> },
      { path: 'workspace', element: <IndustryWorkspaceRoute /> },
      { path: 'assignments/:assignmentId', element: <IndustryAssignmentRoute /> },
    ],
  }] : []),
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
            ...(env.gatesEnabled ? [{ path: 'project/gates', element: <ProjectGatesPage /> }] : []),
            ...(env.defenseScheduleEnabled ? [{ path: 'project/defense', element: <ProjectDefensePage /> }] : []),
            ...(env.coldReportEnabled ? [{ path: 'project/cold-reports', element: <ColdChecklistPage /> }] : []),
            ...(env.peerEvaluationEnabled ? [{ path: 'project/peer-evaluation', element: <ProjectPeerEvaluationPage /> }] : []),
            ...(env.aiAdvisoryEnabled ? [{ path: 'project/ai', element: <ProjectAiPage /> }] : []),
          ] },
          ...(env.workingAgreementEnabled ? [{ path: 'project/agreement', element: <ProjectWorkingAgreementPage /> }] : []),
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
            ...(env.weeklyAssessmentEnabled ? [{ path: 'supervisor/projects/:projectId/weekly-assessments', element: <WeeklyAssessmentsPage /> }] : []),
            ...(env.aiAdvisoryEnabled ? [{ path: 'supervisor/projects/:projectId/ai', element: <ProjectAiPage /> }] : []),
            ...(env.gatesEnabled ? [{ path: 'supervisor/projects/:projectId/checkpoints', element: <ProjectGatesPage /> }] : []),
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
            ...(env.gatesEnabled ? [{ path: 'mentor/projects/:projectId/majors/:majorId/checkpoints', element: <ProjectGatesPage /> }] : []),
          ] },
          { path: 'evaluator/evaluations', element: <EvaluatorAssignmentsPage /> },
          { path: 'evaluator/evaluations/:evaluationId', element: <EvaluationWorkspacePage /> },
          { path: 'evaluator/projects/:projectId/final-submission', element: <FinalSubmissionViewerPage backTo="/evaluator/workspace" backLabel="Danh sách phân công" /> },
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
          { path: 'academic/governance', element: <AcademicGovernancePage /> },
          { path: 'academic/project-periods/:periodId/policy', element: <PeriodPolicyManagementPage /> },
          { path: 'academic/profile-verifications', element: <ProfileVerificationsPage /> },
          { path: 'academic/rubrics', element: <RubricManagementPage /> },
        ],
      },
      ...(env.resultCorrectionEnabled ? [{
        element: <RoleRoute allowed={['department', 'lecturer']} />,
        children: [{ path: 'review/projects/:projectId/corrections', element: <ResultCorrectionsPage /> }],
      }] : []),
      {
        element: <RoleRoute allowed={['department']} />,
        children: [
          { element: <DepartmentAcademicScopeRoute />, children: [{ element: <DepartmentProjectLayout />, children: [
          { path: 'department/portfolio', element: <PortfolioDashboardPage /> },
          { path: 'department/projects/archived', element: <ArchivedProjectsPage /> },
          { path: 'department/projects/review', element: <ProjectReviewPage /> },
          { path: 'department/projects/review/:id', element: <ProjectReviewPage /> },
          { path: 'department/projects/:projectId/result', element: <ResultPublicationPage /> },
          ...(env.resultCorrectionEnabled ? [{ path: 'department/projects/:projectId/corrections', element: <ResultCorrectionsPage /> }] : []),
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
          ...(env.coldReportEnabled ? [{ path: 'department/cold-templates', element: <ColdTemplateManagementPage /> }] : []),
          ] }] },
        ],
      },
      {
        element: <RoleRoute allowed={['admin']} />,
        children: [
          { path: 'admin/access', element: <AdminWorkspacePage /> },
          { path: 'admin/portfolio', element: <PortfolioDashboardPage /> },
          { path: 'admin/projects/:projectId', element: <AdminEvaluationLayout />, children: [
            { path: 'evaluation-schemes', element: <EvaluationSchemeManagementPage /> },
            { path: 'evaluators', element: <EvaluatorAssignmentManagementPage /> },
            { path: 'final-submission', element: <FinalSubmissionViewerPage backTo="/admin/portfolio" backLabel="Danh mục đồ án" /> },
            { path: 'result', element: <ResultPublicationPage /> },
          ] },
          { path: 'admin/milestone-templates', element: <MilestoneTemplatesPage /> },
          { path: 'admin/access/rbac', element: <AdminRbacPage /> },
          { path: 'admin/access/users/:userId', element: <AdminUserDetailPage /> },
          ...(env.industryEnabled ? [{ path: 'admin/industry', element: <AdminIndustryInvitationsPage /> }] : []),
        ],
      },

      ...(env.workflowPreviewEnabled ? [{ path: 'preview/workflows', element: <WorkflowPreviewPage /> }] : []),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]}])
