import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ExecutionAccessProvider } from '../../execution/context/ExecutionAccessProvider'
import { TaskDetailPage } from './TaskDetailPage'
const api = vi.hoisted(() => ({ getTask: vi.fn(), getTaskHistory: vi.fn(), getProjectTimeline: vi.fn(), updateTask: vi.fn(), updateTaskStatus: vi.fn(), setTaskAssignees: vi.fn(), addTaskDependency: vi.fn(), removeTaskDependency: vi.fn(), deleteTask: vi.fn() }))
vi.mock('../../../services/service-gateway', () => ({ services: { task: api } }))
const task = { id: 8, milestoneId: 3, title: 'Phân tích yêu cầu', status: 'TODO', priority: 'MEDIUM', assignees: [{ id: 1, taskId: 8, userId: 2, userFullName: 'Khang', assignedBy: 1, assignedAt: '' }], dependencies: [] }
const timeline = { projectId: 9, milestones: [{ id: 3, title: 'Khởi động', tasks: [{ ...task, assignees: [{ userId: 2, fullName: 'Khang' }] }, { ...task, id: 10, title: 'Thiết kế dữ liệu', assignees: [] }] }] }
function renderPage(manage: boolean, currentUserId = 2) {
  return render(<MemoryRouter initialEntries={['/project/tasks/8']}><ExecutionAccessProvider value={{ project: { id: 9 } as never, team: { members: [{ userId: 2, fullName: 'Khang' }, { userId: 5, fullName: 'Duy' }] } as never, actor: 'student', currentUserId, canManageStructure: manage, routeBase: '/project' }}><Routes><Route path="/project/tasks/:taskId" element={<TaskDetailPage />} /></Routes></ExecutionAccessProvider></MemoryRouter>)
}
beforeEach(() => { api.getTask.mockResolvedValue(task); api.getTaskHistory.mockResolvedValue([]); api.getProjectTimeline.mockResolvedValue(timeline) })
afterEach(() => { cleanup(); vi.resetAllMocks() })
describe('TaskDetailPage', () => {
  it('offers an assigned member only the state transitions supported by BE', async () => {
    renderPage(false)
    const select = await screen.findByRole('combobox', { name: 'Trạng thái tiếp theo' })
    expect(within(select).getAllByRole('option').map(option => (option as HTMLOptionElement).value)).toEqual(['IN_PROGRESS','BLOCKED','CANCELLED'])
    for (const name of ['Chỉnh sửa','Phân công','Thêm liên kết','Xóa công việc']) expect(screen.queryByRole('button', { name })).toBeNull()
  })
  it('hides status controls for unrelated members', async () => {
    renderPage(false,5); await screen.findByRole('heading', { name: 'Phân tích yêu cầu' })
    expect(screen.queryByRole('button', { name: 'Cập nhật trạng thái' })).toBeNull()
  })
  it('shows contextual Vietnamese history and Vietnam time', async () => {
    api.getTaskHistory.mockResolvedValue([{ id: 1, taskId: 8, oldStatus: 'TODO', newStatus: 'IN_PROGRESS', changedBy: 2, changedByFullName: 'Khang', changedAt: '2026-09-20T00:00:00', reason: 'Đã nhận việc' }])
    renderPage(false)
    expect(await screen.findByText('Chưa bắt đầu → Đang làm')).toBeTruthy()
    expect(screen.getByText('Đã nhận việc')).toBeTruthy()
    expect(screen.getByText(/07:00.*20\/09\/2026.*Khang/)).toBeTruthy()
  })
  it('sends named assignee selection as real user IDs', async () => {
    api.setTaskAssignees.mockResolvedValue(undefined); renderPage(true)
    fireEvent.click(await screen.findByRole('button', { name: 'Phân công' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Duy' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu phân công' }))
    await vi.waitFor(() => expect(api.setTaskAssignees).toHaveBeenCalledWith(8,[2,5]))
  })
  it('selects dependencies from actual project tasks', async () => {
    api.addTaskDependency.mockResolvedValue(undefined); renderPage(true)
    fireEvent.click(await screen.findByRole('button', { name: 'Thêm liên kết' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Công việc liên quan' }), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu liên kết' }))
    await vi.waitFor(() => expect(api.addTaskDependency).toHaveBeenCalledWith({ taskId:8, dependsOnTaskId:10, dependencyType:'FINISH_TO_START' }))
  })
  it('keeps current details usable when history fails without claiming an empty history', async () => {
    api.getTaskHistory.mockRejectedValue(new Error('network')); renderPage(false)
    expect(await screen.findByRole('button', { name: 'Cập nhật trạng thái' })).toBeTruthy()
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.queryByText('Chưa có thay đổi trạng thái.')).toBeNull()
  })
  it('blocks changes to a task outside the selected project', async () => {
    api.getProjectTimeline.mockResolvedValue({projectId:9,milestones:[]}); renderPage(true)
    expect(await screen.findByText(/Công việc này không thuộc đồ án/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Chỉnh sửa' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cập nhật trạng thái' })).toBeNull()
  })
  it('retains the reason when BE rejects a state update', async () => {
    api.updateTaskStatus.mockRejectedValue(new Error('offline')); renderPage(false)
    const reason = await screen.findByRole('textbox', { name:'Ghi chú thay đổi' })
    fireEvent.change(reason, {target:{value:'Chờ bộ dữ liệu'}})
    fireEvent.click(screen.getByRole('button', {name:'Cập nhật trạng thái'}))
    await screen.findByRole('alert')
    expect(api.updateTaskStatus).toHaveBeenCalledWith(8,{newStatus:'IN_PROGRESS',reason:'Chờ bộ dữ liệu'})
    expect((reason as HTMLTextAreaElement).value).toBe('Chờ bộ dữ liệu')
  })
  it('requires confirmation and keeps details when deletion fails', async () => {
    api.getTask.mockResolvedValue({...task,assignees:[]}); api.deleteTask.mockRejectedValue(new Error('conflict'))
    renderPage(true); fireEvent.click(await screen.findByRole('button', {name:'Xóa công việc'}))
    expect(api.deleteTask).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', {name:'Xác nhận xóa'}))
    await screen.findByRole('alert'); expect(api.deleteTask).toHaveBeenCalledWith(8)
    expect(screen.getByRole('heading', {name:'Phân tích yêu cầu'})).toBeTruthy()
  })
})
