import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ExecutionAccessProvider } from '../../execution/context/ExecutionAccessProvider'
import { TaskDetailPage } from './TaskDetailPage'

const api = vi.hoisted(() => ({ getTask: vi.fn(), getTaskHistory: vi.fn(), updateTask: vi.fn(), updateTaskStatus: vi.fn(), setTaskAssignees: vi.fn(), addTaskDependency: vi.fn(), removeTaskDependency: vi.fn(), deleteTask: vi.fn() }))
vi.mock('../../../services/service-gateway', () => ({ services: { task: api } }))
const task = { id: 8, milestoneId: 3, title: 'Backend task', status: 'TODO', assignees: [{ id: 1, taskId: 8, userId: 2, userFullName: 'Member', assignedBy: 1, assignedAt: '' }], dependencies: [] }

function renderPage(canManageStructure: boolean, currentUserId = 2) {
  return render(<MemoryRouter initialEntries={['/project/tasks/8']}><ExecutionAccessProvider value={{ project: { id: 9 } as never, actor: 'student', currentUserId, canManageStructure, routeBase: '/project' }}><Routes><Route path="/project/tasks/:taskId" element={<TaskDetailPage />} /></Routes></ExecutionAccessProvider></MemoryRouter>)
}
afterEach(() => { vi.clearAllMocks() })
describe('TaskDetailPage RBAC UX', () => {
  it('hides structural task mutations from an ordinary student member', async () => {
    api.getTask.mockResolvedValue(task); api.getTaskHistory.mockResolvedValue([])
    renderPage(false)
    await screen.findByText('Backend task')
    expect(screen.queryByRole('button', { name: 'Lưu nội dung' })).toBeNull(); expect(screen.queryByRole('button', { name: 'Cập nhật assignees' })).toBeNull(); expect(screen.queryByRole('button', { name: 'Thêm dependency' })).toBeNull(); expect(screen.queryByRole('button', { name: 'Xóa Task' })).toBeNull()
  })
  it('keeps valid status UI for a task assignee while structural controls remain hidden', async () => {
    api.getTask.mockResolvedValue(task); api.getTaskHistory.mockResolvedValue([])
    renderPage(false, 2)
    expect(await screen.findByRole('button', { name: 'Cập nhật trạng thái' })).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Lưu nội dung' })).toBeNull()
  })
  it('renders the complete Backend status transition history', async () => {
    api.getTask.mockResolvedValue(task); api.getTaskHistory.mockResolvedValue([{ id: 1, taskId: 8, oldStatus: 'TODO', newStatus: 'IN_PROGRESS', changedBy: 2, changedByFullName: 'Member', changedAt: '2026-09-20T00:00:00Z' }])
    renderPage(false)
    expect(await screen.findByText('TODO → IN_PROGRESS · Member')).toBeTruthy()
  })
})
