import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ExecutionAccessProvider } from '../../execution/context/ExecutionAccessProvider'
import { TaskDetailModal } from './TaskDetailModal'

const api = vi.hoisted(() => ({
  getTask: vi.fn(),
  getTaskHistory: vi.fn(),
  getProjectTimeline: vi.fn(),
  updateTask: vi.fn(),
  updateTaskStatus: vi.fn(),
  setTaskAssignees: vi.fn(),
  addTaskDependency: vi.fn(),
  removeTaskDependency: vi.fn(),
  deleteTask: vi.fn(),
}))

const workflow = vi.hoisted(() => ({ getTaskExecutionActions: vi.fn() }))

vi.mock('../../../services/service-gateway', () => ({ services: { task: api } }))
vi.mock('../../../services/api/workflow.api', () => workflow)

const task = {
  id: 42,
  milestoneId: 5,
  title: 'Xây dựng giao diện Kanban',
  description: 'Chi tiết mô tả công việc cần làm.',
  status: 'IN_PROGRESS',
  priority: 'HIGH',
  concurrencyToken: 'token-42',
  startAt: '2026-11-01T08:00:00Z',
  dueAt: '2026-11-10T17:00:00Z',
  assignees: [{ id: 1, taskId: 42, userId: 2, userFullName: 'Khang', assignedBy: 1, assignedAt: '' }],
  dependencies: [],
}

const timeline = {
  projectId: 9,
  milestones: [{ id: 5, title: 'Sprint 1', tasks: [task] }],
}

function renderModal(onClose = vi.fn(), manage = true) {
  return render(
    <MemoryRouter initialEntries={['/project/tasks?taskDetail=42']}>
      <ExecutionAccessProvider
        value={{
          project: { id: 9, majors: [] } as never,
          team: { members: [{ userId: 2, fullName: 'Khang' }] } as never,
          actor: 'student',
          currentUserId: 2,
          canManageStructure: manage,
          readOnly: false,
          routeBase: '/project',
        }}
      >
        <TaskDetailModal taskId={42} onClose={onClose} />
      </ExecutionAccessProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  api.getTask.mockResolvedValue(task)
  api.getTaskHistory.mockResolvedValue([
    { id: 1, taskId: 42, oldStatus: 'TODO', newStatus: 'IN_PROGRESS', changedBy: 2, changedByFullName: 'Khang', changedAt: '2026-11-02T09:00:00Z', reason: 'Bắt đầu làm' },
  ])
  api.getProjectTimeline.mockResolvedValue(timeline)
  workflow.getTaskExecutionActions.mockResolvedValue({
    taskId: 42,
    projectId: 9,
    status: 'IN_PROGRESS',
    concurrencyToken: 'token-42',
    actions: [],
  })
})

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

describe('TaskDetailModal', () => {
  it('renders task details with status badge, priority badge, and description', async () => {
    renderModal()
    expect(await screen.findByRole('dialog')).toBeDefined()
    expect(screen.getByRole('heading', { name: /Xây dựng giao diện Kanban/ })).toBeDefined()
    expect(screen.getByText('Chi tiết mô tả công việc cần làm.')).toBeDefined()
    expect(screen.getByText('Khang')).toBeDefined()
    expect(screen.getByText('Đang làm')).toBeDefined()
    expect(screen.getByText(/Ưu tiên cao/i)).toBeDefined()
  })

  it('switches between secondary tabs and shows status history', async () => {
    renderModal()
    await screen.findByText('Chi tiết mô tả công việc cần làm.')

    const historyTab = screen.getByRole('tab', { name: /Lịch sử/ })
    fireEvent.click(historyTab)

    expect(await screen.findByText('Lịch sử thay đổi')).toBeDefined()
    expect(screen.getByText(/Chưa bắt đầu → Đang làm/)).toBeDefined()
    expect(screen.getByText('Bắt đầu làm')).toBeDefined()
  })

  it('provides a full page link and triggers onClose when close button clicked', async () => {
    const handleClose = vi.fn()
    renderModal(handleClose)
    await screen.findByText('Chi tiết mô tả công việc cần làm.')

    const fullPageLink = screen.getByRole('link', { name: /Mở trang chi tiết đầy đủ/ })
    expect(fullPageLink.getAttribute('href')).toBe('/project/tasks/42')

    const closeButton = screen.getByRole('button', { name: 'Đóng' })
    fireEvent.click(closeButton)
    expect(handleClose).toHaveBeenCalledOnce()
  })

  it.each(['IN_REVIEW', 'DONE'])('locks assignment for %s even when the backend capability observation is stale', async status => {
    api.getTask.mockResolvedValue({ ...task, status })
    workflow.getTaskExecutionActions.mockResolvedValue({ taskId: 42, projectId: 9, status: 'IN_PROGRESS', concurrencyToken: 'token-42', actions: [
      { code: 'assign_task', allowed: true, reasons: [] },
      { code: 'change_task_status', allowed: true, reasons: [] },
    ] })
    renderModal()
    await screen.findByRole('button', { name: 'Cập nhật trạng thái' })
    expect(screen.queryByRole('button', { name: 'Phân công' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Lưu phân công' })).toBeNull()
    expect(screen.getByText(/Phân công đã khóa khi chờ nghiệm thu hoặc hoàn thành/)).toBeTruthy()
    expect(api.setTaskAssignees).not.toHaveBeenCalled()
  })

  it('requires a reason before reopening a completed task from the modal', async () => {
    api.getTask.mockResolvedValue({ ...task, status: 'DONE' })
    workflow.getTaskExecutionActions.mockResolvedValue({ taskId: 42, projectId: 9, status: 'DONE', concurrencyToken: 'token-42', actions: [
      { code: 'change_task_status', allowed: true, reasons: [] },
    ] })
    renderModal()
    const reason = await screen.findByRole('textbox', { name: 'Ghi chú thay đổi' }) as HTMLTextAreaElement
    fireEvent.change(reason, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cập nhật trạng thái' }))
    expect(screen.getByText(/Cần ghi lý do thay đổi công việc đã hoàn thành/)).toBeTruthy()
    expect(document.activeElement).toBe(reason)
    expect(reason.value).toBe('   ')
    expect(api.updateTaskStatus).not.toHaveBeenCalled()
    fireEvent.change(reason, { target: { value: '  Điều chỉnh giao diện theo thiết kế mới  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cập nhật trạng thái' }))
    await vi.waitFor(() => expect(api.updateTaskStatus).toHaveBeenCalledExactlyOnceWith(42, { newStatus: 'IN_PROGRESS', reason: 'Điều chỉnh giao diện theo thiết kế mới', concurrencyToken: 'token-42' }))
  })
})
