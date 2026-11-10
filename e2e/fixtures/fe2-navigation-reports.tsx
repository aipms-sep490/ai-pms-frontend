// Test-only entry: real router history and report components, explicit mocked API.
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Link, Outlet, RouterProvider } from 'react-router-dom'
import '../../src/index.css'
import '../../src/components/ui/workspace-experience.css'
import { ExecutionAccessProvider } from '../../src/features/execution/context/ExecutionAccessProvider'
import type { ExecutionAccess } from '../../src/features/execution/context/ExecutionAccessContext'
import { ProgressReportsPage } from '../../src/features/reports/ProgressReportsPage'
import { ProgressReportDetailPage } from '../../src/features/reports/ProgressReportDetailPage'

const direct = new URLSearchParams(location.search).get('entry') === 'detail'
history.replaceState(null, '', direct ? '/project/reports/17' : '/notifications')
const access: ExecutionAccess = {
  project: { id: 9, title: 'Đồ án thử nghiệm điều hướng', status: 'ACTIVE' } as ExecutionAccess['project'],
  actor: 'student', canManageStructure: false, currentUserId: 2, routeBase: '/project',
}
const router = createBrowserRouter([{ element: <ExecutionAccessProvider value={access}><main data-experience="enhanced" className="mx-auto max-w-6xl p-4 sm:p-8"><Outlet /></main></ExecutionAccessProvider>, children: [
  { path: '/notifications', element: <><h1>Thông báo</h1><Link to="/project/reports?status=SUBMITTED">Mở báo cáo từ thông báo</Link></> },
  { path: '/project/workspace', element: <h1>Phối hợp nhóm</h1> },
  { path: '/project/reports', element: <ProgressReportsPage /> },
  { path: '/project/reports/:reportId', element: <ProgressReportDetailPage /> },
] }])
createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />)
