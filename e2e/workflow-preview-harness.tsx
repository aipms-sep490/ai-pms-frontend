// Test entry only. Never imported from the production app.
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import '../src/index.css'
import { WorkflowPreviewPage } from '../src/features/workflow-preview/WorkflowPreviewPage'
import { TaskBoardPage } from '../src/features/tasks/pages/TaskBoardPage'
import { ExecutionAccessProvider } from '../src/features/execution/context/ExecutionAccessProvider'
import { services } from '../src/services/service-gateway'
import type { TaskDto } from '../src/types/backend'
const board = new URLSearchParams(location.search).has('board')
if (board) {
  const items = ['TODO', 'BLOCKED', 'CANCELLED'].map((status, index) => ({ id: index + 1, title: `Task fixture ${status}`, status, priority: 'MEDIUM', assignees: [], milestoneId: 1, dueAt: '2026-10-15T00:00:00Z' }) as TaskDto)
  services.task = { ...services.task, getProjectTasks: async () => ({ items, page: 1, pageSize: 20, totalCount: 3, totalPages: 1 }) }
  services.milestone = { ...services.milestone, getProjectMilestones: async () => [] }
}
createRoot(document.getElementById('root')!).render(<MemoryRouter><main style={{ maxWidth: 1400, padding: 16, margin: '0 auto' }}>
  {board ? <ExecutionAccessProvider value={{ project: { id: 1, majors: [] } as never, team: { members: [] } as never, currentUserId: 1, actor: 'student', canManageStructure: false, routeBase: '/project', executionCapabilities: { status: 'ready', get: () => ({ state: 'denied', allowed: false, reasons: [] }) } }}><TaskBoardPage /></ExecutionAccessProvider> : <WorkflowPreviewPage />}
</main></MemoryRouter>)
