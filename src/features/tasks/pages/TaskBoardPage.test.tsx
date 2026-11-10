import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { ExecutionAccessProvider } from '../../execution/context/ExecutionAccessProvider'
import { TaskBoardPage } from './TaskBoardPage'

const api = vi.hoisted(() => ({
  getProjectTasks: vi.fn(),
  getProjectMilestones: vi.fn(),
  createTask: vi.fn(),
  updateTaskStatus: vi.fn(),
  getTask: vi.fn(),
  getTaskHistory: vi.fn(),
  getProjectTimeline: vi.fn(),
  setTaskAssignees: vi.fn(),
  addTaskDependency: vi.fn(),
  removeTaskDependency: vi.fn(),
  deleteTask: vi.fn(),
  updateTask: vi.fn(),
}))

const workflow = vi.hoisted(() => ({ getTaskExecutionActions: vi.fn() }))

vi.mock('../../../services/service-gateway', () => ({ services: { task: api, milestone: api } }))
vi.mock('../../../services/api/workflow.api', () => workflow)

const empty = { items: [], totalCount: 0, totalPages: 0, page: 1, pageSize: 20 }
const item = { id: 1, milestoneId: 3, title: 'Phân tích yêu cầu', status: 'TODO', priority: 'MEDIUM', assignees: [], concurrencyToken: 'task-token', dependencies: [] }
const capabilities = (allowed: boolean) => ({ status: 'ready' as const, get: () => ({ state: allowed ? 'allowed' as const : 'denied' as const, allowed, reasons: [] }) })

function renderBoard(manage: boolean, url = '/project/tasks', allowed = manage, hasTeam = true, retryTeam = vi.fn(), readOnly = false) {
  const router = createMemoryRouter([{ path: '*', element:
      <ExecutionAccessProvider
        value={{
          project: { id: 9, majors: [] } as never,
          team: hasTeam ? { members: [{ userId: 2, fullName: 'Khang' }, { userId: 5, fullName: 'Duy' }] } as never : undefined,
          teamLoadError: hasTeam ? undefined : 'Chưa tải được danh sách thành viên nhóm.',
          retryTeam,
          actor: 'student',
          currentUserId: 2,
          canManageStructure: manage,
          readOnly,
          executionCapabilities: capabilities(allowed),
          routeBase: '/project',
        }}
      >
        <TaskBoardPage />
      </ExecutionAccessProvider>,
  }], { initialEntries: [url] })
  return { ...render(<RouterProvider router={router} />), router }
}

beforeEach(() => {
  api.getProjectTasks.mockResolvedValue(empty)
  api.getProjectMilestones.mockResolvedValue([{ id: 3, title: 'Khởi động', status: 'PLANNED' }])
  api.getTask.mockResolvedValue(item)
  api.getTaskHistory.mockResolvedValue([])
  api.getProjectTimeline.mockResolvedValue({ projectId: 9, milestones: [{ id: 3, title: 'Khởi động', tasks: [item] }] })
  workflow.getTaskExecutionActions.mockResolvedValue({ taskId: 1, projectId: 9, status: 'TODO', concurrencyToken: 'task-token', actions: [] })
})

afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('TaskBoardPage', () => {
  it('waits for persistence, prevents duplicate drops and reloads tokens before the next transition', async () => {
    let current = { ...item, concurrencyToken: 'first-token' }
    api.getProjectTasks.mockImplementation(async () => ({ ...empty, items: [current], totalCount: 1, totalPages: 1 }))
    let finish!: () => void
    api.updateTaskStatus.mockImplementationOnce(() => new Promise(resolve => { finish = () => { current = { ...current, status: 'IN_PROGRESS', concurrencyToken: 'next-token' }; resolve(current) } }))
      .mockImplementationOnce(async () => { current = { ...current, status: 'IN_REVIEW', concurrencyToken: 'final-token' }; return current })
    renderBoard(true)
    await screen.findByText(item.title)
    fireEvent.click(screen.getByRole('button', { name: 'Bảng Kanban' }))
    const drag = (destination: string) => {
      fireEvent.dragStart(screen.getByRole('link', { name: new RegExp(item.title) }).closest('li')!, { dataTransfer: { setData: vi.fn() } })
      fireEvent.drop(screen.getByRole('region', { name: destination }), { dataTransfer: {} })
    }
    drag('Đang làm'); drag('Đang làm')
    expect(api.updateTaskStatus).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Đang cập nhật trạng thái công việc…')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Chưa bắt đầu' })).getByText(item.title)).toBeTruthy()
    finish()
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Đang làm' })).getByText(item.title)).toBeTruthy())
    drag('Chờ kiểm tra')
    await waitFor(() => expect(api.updateTaskStatus).toHaveBeenLastCalledWith(1, expect.objectContaining({ newStatus: 'IN_REVIEW', concurrencyToken: 'next-token' })))
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Chờ kiểm tra' })).getByText(item.title)).toBeTruthy())
  })
  it('keeps the saved card in its original column when a drop fails', async () => {
    api.getProjectTasks.mockResolvedValue({ ...empty, items: [item], totalCount: 1, totalPages: 1 })
    api.updateTaskStatus.mockRejectedValue(new Error('Network unavailable'))
    renderBoard(true)
    await screen.findByText(item.title)
    fireEvent.click(screen.getByRole('button', { name: 'Bảng Kanban' }))
    fireEvent.dragStart(screen.getByRole('link', { name: new RegExp(item.title) }).closest('li')!, { dataTransfer: { setData: vi.fn() } })
    fireEvent.drop(screen.getByRole('region', { name: 'Đang làm' }))
    await screen.findByText('Chưa thể cập nhật trạng thái. Hãy thử lại.')
    expect(within(screen.getByRole('region', { name: 'Chưa bắt đầu' })).getByText(item.title)).toBeTruthy()
    expect(screen.queryByText(/Đã chuyển công việc/)).toBeNull()
  })
  it('offers the full roster as an assignee filter', async () => {
    renderBoard(false); await screen.findByText('Không có công việc phù hợp')
    const filter = screen.getByRole('combobox', { name: 'Người phụ trách' })
    expect(filter.querySelectorAll('option')).toHaveLength(3)
    expect(screen.getByRole('option', { name: 'Duy' })).toBeTruthy()
  })
  it('explains a missing roster and lets the user retry without hiding tasks', async () => {
    const retry = vi.fn()
    renderBoard(false, '/project/tasks', false, false, retry)
    await screen.findByText('Không có công việc phù hợp')
    expect(screen.getByText(/Chưa tải được danh sách thành viên nhóm/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(retry).toHaveBeenCalledOnce()
    expect(screen.queryByRole('combobox', { name: 'Người phụ trách' })).toBeNull()
  })
  it('keeps Kanban cards readable but not draggable in read-only mode', async () => {
    api.getProjectTasks.mockResolvedValue({ ...empty, items: [item], totalCount: 1, totalPages: 1 })
    renderBoard(true, '/project/tasks', true, true, vi.fn(), true)
    await screen.findByText('Phân tích yêu cầu')
    fireEvent.click(screen.getByRole('button', { name: 'Bảng Kanban' }))
    expect(screen.getByText(/Bảng công việc chỉ xem/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /Phân tích yêu cầu/ }).closest('li')?.draggable).toBe(false)
    expect(screen.queryByRole('button', { name: 'Tạo công việc' })).toBeNull()
  })
  it('shows a paged board using backend statuses without hiding blocked or cancelled tasks', async () => {
    api.getProjectTasks.mockResolvedValue({ ...empty, items: [item, { ...item, id: 2, title: 'Đang bị chặn', status: 'BLOCKED' }, { ...item, id: 3, title: 'Đã hủy công việc', status: 'CANCELLED' }], totalCount: 23, totalPages: 2 })
    renderBoard(false)
    await screen.findByText('Phân tích yêu cầu')
    fireEvent.click(screen.getByRole('button', { name: 'Bảng Kanban' }))
    expect(screen.getByRole('region', { name: 'Bảng công việc theo trang' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Đang bị chặn/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Đã hủy công việc/ })).toBeTruthy()
    expect(screen.getByText(/Chỉ hiển thị công việc trên trang hiện tại/)).toBeTruthy()
    expect(api.getProjectTasks).toHaveBeenCalledTimes(1)
  })
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

  // Phase C tests (FE2-C1, C2, C3)
  it('clears the previous modal task when navigation selects another task', async () => {
    api.getTask.mockImplementation((id: number) => id === 1 ? Promise.resolve(item) : new Promise(() => {}))
    const { router } = renderBoard(true, '/project/tasks?taskDetail=1')
    expect(await screen.findByRole('heading', { name: /#1 · Phân tích yêu cầu/ })).toBeTruthy()
    await act(async () => { await router.navigate('/project/tasks?taskDetail=2') })
    expect(screen.queryByRole('heading', { name: /#1 · Phân tích yêu cầu/ })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Công việc #2' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Mở trang chi tiết đầy đủ/ }).getAttribute('href')).toBe('/project/tasks/2')
    expect(api.updateTask).not.toHaveBeenCalled()
    expect(api.updateTaskStatus).not.toHaveBeenCalled()
  })

  it('opens task detail modal on card click while keeping the board rendered underneath', async () => {
    api.getProjectTasks.mockResolvedValue({ ...empty, items: [item], totalCount: 1, totalPages: 1 })
    renderBoard(true)
    await screen.findByText('Phân tích yêu cầu')
    fireEvent.click(screen.getByRole('button', { name: 'Bảng Kanban' }))

    // Click on the task card on the board
    const cardLink = screen.getByRole('link', { name: new RegExp(item.title) })
    fireEvent.click(cardLink)

    // Modal opens centered over the board
    expect(await screen.findByRole('dialog')).toBeDefined()
    expect(screen.getByRole('heading', { name: /#1 · Phân tích yêu cầu/ })).toBeDefined()

    // Board context is still fully present in the DOM
    expect(screen.getByRole('region', { name: 'Bảng công việc theo trang' })).toBeDefined()

    // Close the modal
    const closeButton = screen.getByRole('button', { name: 'Đóng hộp thoại' })
    fireEvent.click(closeButton)

    // Modal closes
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('clarifies page-level count in Kanban columns avoiding confusion with project totals', async () => {
    api.getProjectTasks.mockResolvedValue({ ...empty, items: [item], totalCount: 20, totalPages: 1 })
    renderBoard(false)
    await screen.findByText('Phân tích yêu cầu')
    fireEvent.click(screen.getByRole('button', { name: 'Bảng Kanban' }))

    // Column header explicitly specifies "trên trang này"
    const heading = screen.getByRole('heading', { name: /Chưa bắt đầu/ })
    expect(heading.textContent).toContain('trên trang này')
  })

  it('structures the toolbar into two dedicated rows separating scope and view controls (FE2-E3)', async () => {
    api.getProjectTasks.mockResolvedValue({ ...empty, items: [item], totalCount: 25, totalPages: 2 })
    renderBoard(false)
    await screen.findByText('Phân tích yêu cầu')

    // Two distinct tab groups exist for scope and view mode
    const scopeGroup = screen.getByRole('group', { name: 'Phạm vi công việc' })
    const viewGroup = screen.getByRole('group', { name: 'Cách hiển thị' })
    expect(scopeGroup).toBeDefined()
    expect(viewGroup).toBeDefined()

    // Row 1 also displays total project task count indicator
    expect(screen.getByText(/Tổng số công việc:/)).toBeDefined()
  })
})
