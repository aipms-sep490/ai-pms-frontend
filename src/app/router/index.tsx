import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { OverviewPage } from '../pages/OverviewPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ProjectLifecyclePage } from '../../features/projects/pages/ProjectLifecyclePage'

export const appRouter = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'projects/lifecycle', element: <ProjectLifecyclePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
