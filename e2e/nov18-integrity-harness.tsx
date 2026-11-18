// Real components with intercepted HTTP fixtures; never imported by the application.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '../src/index.css'
import { AcademicScopePanel } from '../src/features/teams/components/AcademicScopePanel'
import { StructuredResponsibilitiesPanel } from '../src/features/teams/components/StructuredResponsibilitiesPanel'
import { ExecutionAccessProvider } from '../src/features/execution/context/ExecutionAccessProvider'
import { TaskDetailPage } from '../src/features/tasks/pages/TaskDetailPage'
import { services } from '../src/services/service-gateway'
import type { TeamAcademicScopeDto } from '../src/types/backend'

const initialScope: TeamAcademicScopeDto = {
  projectMode: 'INTERDISCIPLINARY', primaryMajorId: null, leadDepartmentId: 1, concurrencyToken: 'scope-1',
  requirements: [1, 2].map(majorId => ({ majorId, minMembers: 1, maxMembers: 5, responsibility: 'Phối hợp' })),
}
function TeamPanels() {
  const [scope, setScope] = useState(initialScope)
  const reload = async () => { const team = await services.team.getTeam(7); setScope(team.academicScope!) }
  return <>
    <h1 className="mb-4 text-xl font-semibold">Nhóm liên ngành DEMO</h1>
    <AcademicScopePanel teamId={7} scope={scope} period={null} workflowContext={null} canConfigure onSaved={reload} fallbackOrganizationId={1} fallbackMajorId={1} />
    <StructuredResponsibilitiesPanel teamId={7} scope={scope} majorNames={{ 1: 'Kỹ thuật phần mềm', 2: 'Marketing' }} canEdit onSaved={reload} />
  </>
}
const view = new URLSearchParams(location.search).get('view') || 'team'
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={[view === 'team' ? '/team' : '/project/tasks/42']}>
  <main className="mx-auto min-w-0 max-w-7xl p-3">
    <p className="mb-3 text-sm text-ink-muted">Kiểm thử trình duyệt bằng dữ liệu hợp đồng giả lập · Không phải dữ liệu đang vận hành</p>
    {view === 'team' ? <TeamPanels /> : <ExecutionAccessProvider value={{
      project: { id: 9, title: 'Đồ án DEMO', status: 'ACTIVE', majors: [] } as never,
      team: { members: [{ userId: 2, fullName: 'Sinh viên DEMO' }] } as never,
      currentUserId: 2, actor: 'student', canManageStructure: true, readOnly: false, routeBase: '/project',
    }}><Routes><Route path="/project/tasks/:taskId" element={<TaskDetailPage />} /></Routes></ExecutionAccessProvider>}
  </main>
</MemoryRouter>)
