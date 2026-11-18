import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { TaskDependencyImpactPanel } from './TaskDependencyImpactPanel'
import type { TaskDependencyImpacts } from '../task-dependency-impacts-api'

const api = vi.hoisted(() => ({ getTaskDependencyImpacts: vi.fn(), resolveTaskDependencyImpact: vi.fn() }))
vi.mock('../task-dependency-impacts-api', () => api)

const impact = {
  id: 12, taskId: 8, predecessorTaskId: 3, predecessorTitle: 'Thiết kế sơ đồ CSDL',
  predecessorStatus: 'DONE', status: 'PENDING' as const, reopenedAt: '2026-11-18T03:00:00Z',
  reopenedBy: 2, reopenReason: 'Bổ sung bảng giao dịch', reviewedAt: null, reviewedBy: null,
  reviewReason: null, canResolve: true, blockedReason: null,
}
const data: TaskDependencyImpacts = { taskId: 8, canReview: true, items: [impact] }
function mount(onTaskUpdated = vi.fn(), canReview = true, taskStatus = 'DONE') {
  render(<MemoryRouter><TaskDependencyImpactPanel taskId={8} taskStatus={taskStatus} concurrencyToken="task-v2" routeBase="/project" revision={0} canReview={canReview} onTaskUpdated={onTaskUpdated} /></MemoryRouter>)
  return onTaskUpdated
}
beforeEach(() => { api.getTaskDependencyImpacts.mockResolvedValue(data); api.resolveTaskDependencyImpact.mockResolvedValue({ id: 8, status: 'DONE' }) })
afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('TaskDependencyImpactPanel', () => {
  it('keeps a reason for the same impact but clears it when reviewing another predecessor', async () => {
    api.getTaskDependencyImpacts.mockResolvedValue({ ...data, items: [impact, { ...impact, id: 13, predecessorTaskId: 4, predecessorTitle: 'Thiết kế API' }] })
    mount()
    const keepButtons = await screen.findAllByRole('button', { name: 'Giữ kết quả hoàn thành' })
    fireEvent.click(keepButtons[0])
    fireEvent.change(screen.getByRole('textbox', { name: 'Lý do đánh giá' }), { target: { value: 'Đã kiểm tra CSDL.' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Yêu cầu làm lại' })[0])
    expect((screen.getByRole('textbox', { name: 'Lý do đánh giá' }) as HTMLTextAreaElement).value).toBe('Đã kiểm tra CSDL.')
    fireEvent.click(keepButtons[1])
    expect((screen.getByRole('textbox', { name: 'Lý do đánh giá' }) as HTMLTextAreaElement).value).toBe('')
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận vẫn hợp lệ' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(api.resolveTaskDependencyImpact).not.toHaveBeenCalled()
  })

  it('keeps review controls read-only when the parent scope forbids edits despite a server capability', async () => {
    mount(vi.fn(), false)
    await screen.findByText('Cần kiểm tra ảnh hưởng')
    expect(screen.queryByRole('button', { name: 'Yêu cầu làm lại' })).toBeNull()
    expect(api.resolveTaskDependencyImpact).not.toHaveBeenCalled()
  })
  it.each(['IN_REVIEW', 'CANCELLED'])('does not offer an invalid rework action for status %s', async status => {
    mount(vi.fn(), true, status)
    expect((await screen.findByRole('button', { name: 'Yêu cầu làm lại' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Giữ kết quả hoàn thành' }) as HTMLButtonElement).disabled).toBe(false)
  })
  it('keeps the accepted result pending while the predecessor is unfinished', async () => {
    api.getTaskDependencyImpacts.mockResolvedValue({ ...data, items: [{ ...impact, predecessorStatus: 'IN_PROGRESS', canResolve: false, blockedReason: 'Công việc tiền nhiệm chưa hoàn thành.' }] })
    mount()
    expect(await screen.findByText('Bổ sung bảng giao dịch', { exact: false })).toBeTruthy()
    expect(screen.getByText(/Trạng thái hoàn thành được giữ nguyên/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Giữ kết quả hoàn thành' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Yêu cầu làm lại' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('link', { name: impact.predecessorTitle }).getAttribute('href')).toBe('/project/tasks/3')
    expect(api.resolveTaskDependencyImpact).not.toHaveBeenCalled()
  })

  it('shows the warning to a member without offering review actions', async () => {
    api.getTaskDependencyImpacts.mockResolvedValue({ ...data, canReview: false, items: [{ ...impact, canResolve: false }] })
    mount()
    await screen.findByText('Cần kiểm tra ảnh hưởng')
    expect(screen.queryByRole('button', { name: 'Yêu cầu làm lại' })).toBeNull()
    expect(screen.getByText(/Trưởng nhóm hoặc GVHD có quyền đánh giá/)).toBeTruthy()
  })

  it('requires review reasons and sends the current task revision for a valid-result decision', async () => {
    const refreshed = mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Giữ kết quả hoàn thành' }))
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận vẫn hợp lệ' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Nhập lý do và kết quả đối chiếu trước khi xác nhận.')
    expect(api.resolveTaskDependencyImpact).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole('textbox', { name: 'Lý do đánh giá' }), { target: { value: '  SQL đã bao gồm bảng mới.  ' } })
    api.getTaskDependencyImpacts.mockResolvedValue({ ...data, items: [{ ...impact, status: 'CONFIRMED_VALID', canResolve: false, reviewedAt: '2026-11-18T04:00:00Z', reviewedBy: 1, reviewReason: 'SQL đã bao gồm bảng mới.' }] })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận vẫn hợp lệ' }))
    await waitFor(() => expect(api.resolveTaskDependencyImpact).toHaveBeenCalledWith(8, 12, { decision: 'CONFIRMED_VALID', reason: 'SQL đã bao gồm bảng mới.', concurrencyToken: 'task-v2' }))
    expect(refreshed).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Lịch sử đánh giá ảnh hưởng (1)')).toBeTruthy()
  })

  it('explains and confirms a rework decision before sending it', async () => {
    const refreshed = mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Yêu cầu làm lại' }))
    expect(screen.getByText(/Xác nhận sẽ mở lại công việc đã hoàn thành/)).toBeTruthy()
    expect(api.resolveTaskDependencyImpact).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole('textbox', { name: 'Lý do đánh giá' }), { target: { value: 'SQL thiếu bảng giao dịch.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận yêu cầu làm lại' }))
    await waitFor(() => expect(api.resolveTaskDependencyImpact).toHaveBeenCalledWith(8, 12, { decision: 'REWORK_REQUIRED', reason: 'SQL thiếu bảng giao dịch.', concurrencyToken: 'task-v2' }))
    expect(refreshed).toHaveBeenCalledTimes(1)
  })

  it('preserves the reason when a stale revision is rejected and does not replay the write', async () => {
    api.resolveTaskDependencyImpact.mockRejectedValue(new HttpError('stale', 409))
    const refreshed = mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Yêu cầu làm lại' }))
    const reason = screen.getByRole('textbox', { name: 'Lý do đánh giá' }) as HTMLTextAreaElement
    fireEvent.change(reason, { target: { value: 'Cần bổ sung khóa ngoại.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận yêu cầu làm lại' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(reason.value).toBe('Cần bổ sung khóa ngoại.')
    expect(api.resolveTaskDependencyImpact).toHaveBeenCalledTimes(1)
    expect(refreshed).not.toHaveBeenCalled()
  })

  it('reports unavailable impact data without claiming there are no pending warnings', async () => {
    api.getTaskDependencyImpacts.mockRejectedValue(new Error('offline'))
    mount()
    expect(await screen.findByText('Chưa thể tải thông tin ảnh hưởng. Hãy thử lại.')).toBeTruthy()
    expect(screen.queryByText(/Chưa ghi nhận công việc tiền nhiệm/)).toBeNull()
    api.getTaskDependencyImpacts.mockResolvedValue({ ...data, items: [] })
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText(/Chưa ghi nhận công việc tiền nhiệm/)).toBeTruthy()
  })
})
