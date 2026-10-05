import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ExecutionAccessProvider } from '../../execution/context/ExecutionAccessProvider'
import { TaskBoardPage } from './TaskBoardPage'
const api = vi.hoisted(() => ({ getProjectTasks: vi.fn(), getProjectMilestones: vi.fn(), createTask: vi.fn() }))
vi.mock('../../../services/service-gateway', () => ({ services: { task: api, milestone: api } }))
const empty = { items: [], totalCount: 0, totalPages: 0, page: 1, pageSize: 20 }
const item = { id: 1, milestoneId: 3, title: 'Phân tích yêu cầu', status: 'TODO', priority: 'MEDIUM', assignees: [] }
const capabilities = (allowed: boolean) => ({ status: 'ready' as const, get: () => ({ state: allowed ? 'allowed' as const : 'denied' as const, allowed, reasons: [] }) })
function renderBoard(manage: boolean, url = '/project/tasks', allowed = manage) {
  return render(<MemoryRouter initialEntries={[url]}><ExecutionAccessProvider value={{ project: { id: 9 } as never, team: { members: [{ userId: 2, fullName: 'Khang' }, { userId: 5, fullName: 'Duy' }] } as never, actor: 'student', currentUserId: 2, canManageStructure: manage, executionCapabilities: capabilities(allowed), routeBase: '/project' }}><TaskBoardPage /></ExecutionAccessProvider></MemoryRouter>)
}
beforeEach(() => { api.getProjectTasks.mockResolvedValue(empty); api.getProjectMilestones.mockResolvedValue([{ id: 3, title: 'Khởi động', status: 'PLANNED' }]) })
afterEach(() => { cleanup(); vi.resetAllMocks() })
describe('TaskBoardPage', () => {
  it('hides creation for ordinary members', async () => {
    renderBoard(false); await screen.findByText('Không có công việc phù hợp')
    expect(screen.queryByRole('button', { name: 'Tạo công việc' })).toBeNull()
  })
  it('opens creation on demand with named people and milestones', async () => {
    renderBoard(true); await screen.findByText('Không có công việc phù hợp')
    expect(screen.queryByRole('textbox', { name: 'Tên công việc' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Tạo công việc' }))
    expect(await screen.findByRole('textbox', { name: 'Tên công việc' })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Duy' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Khởi động' })).toBeTruthy()
    expect(api.createTask).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', {name:'Hủy'}))
    expect(document.activeElement).toBe(screen.getByRole('button', {name:'Tạo công việc'}))
  })
  it('does not let an advisory leader flag override a denied backend action', async () => {
    renderBoard(true, '/project/tasks', false); await screen.findByText('Không có công việc phù hợp')
    expect(screen.queryByRole('button', { name: 'Tạo công việc' })).toBeNull()
  })
  it('keeps project structural creation hidden for a member even when a broad backend predicate allows it', async () => {
    renderBoard(false, '/project/tasks', true); await screen.findByText('Không có công việc phù hợp')
    expect(screen.queryByRole('button', { name: 'Tạo công việc' })).toBeNull()
  })
  it('submits filters to BE only after applying', async () => {
    renderBoard(false); await screen.findByText('Không có công việc phù hợp')
    fireEvent.change(screen.getByRole('textbox', { name: 'Tìm công việc' }), { target: { value: 'architecture' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Trạng thái' }), { target: { value: 'BLOCKED' } })
    expect(api.getProjectTasks).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }))
    await vi.waitFor(() => expect(api.getProjectTasks).toHaveBeenLastCalledWith(9, expect.objectContaining({ search: 'architecture', status: 'BLOCKED', page: 1, pageSize: 20 }), expect.any(AbortSignal)))
  })
  it('preserves member and milestone filters through actual server pagination', async () => {
    api.getProjectTasks.mockResolvedValueOnce({ ...empty, items: [item], totalCount: 21, totalPages: 2 })
      .mockResolvedValueOnce({ ...empty, page: 2, items: [{ ...item, id: 21, title: 'Công việc trang hai' }], totalCount: 21, totalPages: 2 })
    renderBoard(false, '/project/tasks?assignee=5&milestone=3')
    await screen.findByText('Phân tích yêu cầu'); expect(api.getProjectTasks).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Sau' }))
    await screen.findByText('Công việc trang hai')
    expect(screen.queryByText('Phân tích yêu cầu')).toBeNull()
    expect(api.getProjectTasks).toHaveBeenLastCalledWith(9, expect.objectContaining({ assigneeUserId: 5, milestoneId: 3, page: 2, pageSize: 20 }), expect.any(AbortSignal))
  })
  it('resets page when selecting the signed in member scope', async () => {
    renderBoard(false, '/project/tasks?page=3'); await screen.findByText('Không có công việc phù hợp')
    fireEvent.click(screen.getByRole('button', { name: 'Của tôi' }))
    await vi.waitFor(() => expect(api.getProjectTasks).toHaveBeenLastCalledWith(9, expect.objectContaining({ page: 1, assigneeUserId: 2 }), expect.any(AbortSignal)))
  })
})
