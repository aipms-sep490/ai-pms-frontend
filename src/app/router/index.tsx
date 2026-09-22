import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { HomeRedirect, RoleRoute } from '../../features/auth/components/RoleRoute'
import { LecturerWorkspacePage } from '../../features/supervisors/pages/LecturerWorkspacePage'
import { SupervisorProjectWorkspacePage } from '../../features/supervisors/pages/SupervisorProjectWorkspacePage'
import { SupervisorExecutionRoute } from '../../features/supervisors/components/SupervisorExecutionRoute'
import { OverviewPage } from '../pages/OverviewPage'
import { ActiveProjectWorkspacePage } from '../../features/projects/pages/ActiveProjectWorkspacePage'
import { ActiveStudentProjectRoute } from '../../features/projects/components/ActiveStudentProjectRoute'
import { TaskBoardPage } from '../../features/tasks/pages/TaskBoardPage'
import { TaskDetailPage } from '../../features/tasks/pages/TaskDetailPage'
import { ProgressReportsPage } from '../../features/reports/ProgressReportsPage'
import { MeetingsPage } from '../../features/meetings/MeetingsPage'
import { CreateMeetingPage } from '../../features/meetings/CreateMeetingPage'
import { MeetingDetailPage } from '../../features/meetings/MeetingDetailPage'
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
import { ProfilePage } from '../../features/auth/pages/ProfilePage'
import { AcademicStructurePage } from '../../features/academic/pages/AcademicStructurePage'
import { AcademicGovernancePage } from '../../features/academic/pages/AcademicGovernancePage'
import { AdminSecurityPage } from '../../features/users/pages/AdminSecurityPage'
import { ProjectReviewPage } from '../../features/projects/pages/ProjectReviewPage'
import { SupervisorMonitoringPage } from '../../features/supervisors/pages/SupervisorMonitoringPage'
import { TopicManagementPage } from '../../features/topics/pages/TopicManagementPage'
import { RegistrationSourcePage } from '../../features/registration/pages/RegistrationSourcePage'
import { QualificationVerificationPage } from '../../features/qualifications/pages/QualificationVerificationPage'
import { ProtectedRoute } from '../../features/auth/components/ProtectedRoute'
import { AcademicWorkflowGate, StudentJourneyProvider } from '../context'

export const appRouter = createBrowserRouter([
  { path: 'login', element: <LoginPage /> },
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
            { path: 'project/meetings/:meetingId', element: <MeetingDetailPage /> },
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
        ],
      },
      {
        element: <RoleRoute allowed={['lecturer']} />,
        children: [
          { path: 'supervisor/workspace', element: <LecturerWorkspacePage /> },
          { element: <SupervisorExecutionRoute />, children: [
            { path: 'supervisor/projects/:projectId/workspace', element: <SupervisorProjectWorkspacePage /> },
            { path: 'supervisor/projects/:projectId/milestones/:milestoneId?', element: <MilestoneDetailPage /> },
            { path: 'supervisor/projects/:projectId/tasks', element: <TaskBoardPage /> },
            { path: 'supervisor/projects/:projectId/tasks/:taskId', element: <TaskDetailPage /> },
            { path: 'supervisor/projects/:projectId/gantt', element: <GanttPage /> },
            { path: 'supervisor/projects/:projectId/reports', element: <ProgressReportsPage /> },
            { path: 'supervisor/projects/:projectId/reports/:reportId', element: <ProgressReportDetailPage /> },
            { path: 'supervisor/projects/:projectId/meetings', element: <MeetingsPage /> },
            { path: 'supervisor/projects/:projectId/meetings/new', element: <CreateMeetingPage /> },
            { path: 'supervisor/projects/:projectId/meetings/:meetingId', element: <MeetingDetailPage /> },
          ] },
        ],
      },
      {
        element: <RoleRoute allowed={['department', 'admin']} />,
        children: [
          { path: 'academic', element: <AcademicStructurePage /> },
          { path: 'academic/governance', element: <AcademicGovernancePage /> },
          { path: 'department/projects/review', element: <ProjectReviewPage /> },
          { path: 'department/projects/review/:id', element: <ProjectReviewPage /> },
          { path: 'department/supervisors', element: <SupervisorMonitoringPage /> },
          { path: 'department/supervisors/:id', element: <SupervisorMonitoringPage /> },
          { path: 'department/student-qualifications', element: <QualificationVerificationPage /> },
          { path: 'department/topics', element: <TopicManagementPage /> },
          { path: 'department/topics/:id', element: <TopicManagementPage /> },
        ],
      },
      {
        element: <RoleRoute allowed={['admin']} />,
        children: [{ path: 'admin/access', element: <AdminSecurityPage /> }],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
