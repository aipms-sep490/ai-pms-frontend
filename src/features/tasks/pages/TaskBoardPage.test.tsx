import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ExecutionAccessProvider } from '../../execution/context/ExecutionAccessProvider'
import { TaskBoardPage } from './TaskBoardPage'

const api = vi.hoisted(() => ({ getProjectTasks: vi.fn(), getProjectMilestones: vi.fn(), createTask: vi.fn() }))
vi.mock('../../../services/service-gateway', () => ({ services: { task: { getProjectTasks: api.getProjectTasks, createTask: api.createTask }, milestone: { getProjectMilestones: api.getProjectMilestones } } }))

function renderBoard(canManageStructure: boolean) {
  return render(<MemoryRouter><ExecutionAccessProvider value={{ project: { id: 9 } as never, actor: 'student', currentUserId: 2, canManageStructure, routeBase: '/project' }}><TaskBoardPage /></ExecutionAccessProvider></MemoryRouter>)
}
afterEach(() => { vi.clearAllMocks() })
describe('TaskBoardPage RBAC UX', () => {
  it('hides task creation from an ordinary student member', async () => {
    api.getProjectTasks.mockResolvedValue({ items: [] }); api.getProjectMilestones.mockResolvedValue([{ id: 3, title: 'M1' }])
    renderBoard(false)
    await screen.findByText(/Backend chưa trả Task/)
    expect(screen.queryByRole('button', { name: 'Tạo' })).toBeNull()
  })
  it('shows task creation to the student leader', async () => {
    api.getProjectTasks.mockResolvedValue({ items: [] }); api.getProjectMilestones.mockResolvedValue([{ id: 3, title: 'M1' }])
    renderBoard(true)
    expect(await screen.findByRole('button', { name: 'Tạo' })).toBeTruthy()
  })
})
