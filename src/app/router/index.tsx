import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { OverviewPage } from '../pages/OverviewPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ProjectLifecyclePage } from '../../features/projects/pages/ProjectLifecyclePage'
import { MilestoneDetailPage } from '../../features/milestones/pages/MilestoneDetailPage'
import { GanttPage } from '../../features/progress/pages/GanttPage'
import { LoginPage } from '../../features/auth/pages/LoginPage'
import { ProfilePage } from '../../features/auth/pages/ProfilePage'

export const appRouter = createBrowserRouter([
  { path: 'login', element: <LoginPage /> },
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/project/workspace" replace /> },
      { path: 'project/workspace', element: <OverviewPage /> },
      { path: 'projects/lifecycle', element: <ProjectLifecyclePage /> },
      { path: 'project/milestones/:milestoneId', element: <MilestoneDetailPage /> },
      { path: 'project/milestones', element: <Navigate to="/project/milestones/M3" replace /> },
      { path: 'project/gantt', element: <GanttPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
