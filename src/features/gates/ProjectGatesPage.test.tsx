import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom'
import { ExecutionAccessProvider } from '../execution/context/ExecutionAccessProvider'
import type { ExecutionAccess } from '../execution/context/ExecutionAccessContext'
import { HttpError } from '../../services/http/http-client'
import { ProjectGatesPage } from './ProjectGatesPage'
import type { ProjectCheckpoint } from './gates-types'

const api = vi.hoisted(() => ({ getProjectCheckpoints: vi.fn(), createCheckpoint: vi.fn(), updateCheckpoint: vi.fn(), decideCheckpoint: vi.fn() }))
vi.mock('./gates-api', () => api)

const checkpoint: ProjectCheckpoint = {
  id: 1, projectId: 9, title: 'Chốt đề cương', majorId: null, plannedAt: '2026-10-20T00:00:00Z', concurrencyToken: 'cp-token',
  isOverdue: true, canManage: true, decisions: [], trackingOnly: true, blocksAcademicWorkflow: false,
}

function mount(actor: 'student' | 'supervisor' = 'supervisor') {
  const access: ExecutionAccess = { project: { id: 9, title: 'Quản lý đồ án', status: 'ACTIVE' } as ExecutionAccess['project'], actor, canManageStructure: true, currentUserId: 5, routeBase: '/supervisor/projects/9' }
  const router = createMemoryRouter([{ element: <ExecutionAccessProvider value={access}><Outlet /></ExecutionAccessProvider>, children: [
    { path: '/gates', element: <ProjectGatesPage /> },
  ] }], { initialEntries: ['/gates'] })
  return render(<RouterProvider router={router} />)
}
const paged = (items: ProjectCheckpoint[]) => ({ items, page: 1, pageSize: 50, totalCount: items.length, totalPages: 1 })

beforeEach(() => vi.resetAllMocks())
afterEach(cleanup)

describe('ProjectGatesPage', () => {
  it('shows an overdue-without-conclusion risk badge, never a failure state', async () => {
    api.getProjectCheckpoints.mockResolvedValue(paged([checkpoint]))
    mount()
    expect(await screen.findByText('Chốt đề cương')).toBeTruthy()
    expect(screen.getByText('Quá hạn, chưa kết luận')).toBeTruthy()
    expect(screen.getByText('Chưa có kết luận.')).toBeTruthy()
  })

  it('renders decision history with its badge and reason', async () => {
    api.getProjectCheckpoints.mockResolvedValue(paged([{ ...checkpoint, isOverdue: false, decisions: [{ id: 5, decision: 'MET', reason: 'Đạt yêu cầu', decidedBy: 3, decidedAt: '2026-10-18T00:00:00Z', evidence: [] }] }]))
    mount()
    const item = (await screen.findByText('Đạt yêu cầu')).closest('li') as HTMLElement
    expect(within(item).getByText('Đạt')).toBeTruthy()
    expect(screen.queryByText('Quá hạn, chưa kết luận')).toBeNull()
  })

  it('shows an empty state when there are no checkpoints', async () => {
    api.getProjectCheckpoints.mockResolvedValue(paged([]))
    mount()
    expect(await screen.findByText('Đồ án chưa có checkpoint theo dõi nào.')).toBeTruthy()
  })

  it('surfaces a distinct message on 403', async () => {
    api.getProjectCheckpoints.mockRejectedValue(new HttpError('forbidden', 403))
    mount()
    expect((await screen.findByRole('alert')).textContent).toContain('chưa có quyền xem')
  })

  it('hides the create form and decision controls for a read-only student actor', async () => {
    api.getProjectCheckpoints.mockResolvedValue(paged([{ ...checkpoint, canManage: false }]))
    mount('student')
    await screen.findByText('Chốt đề cương')
    expect(screen.queryByText('Tạo checkpoint mới')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ghi kết luận' })).toBeNull()
  })

  it('creates a checkpoint with a null majorId when left blank', async () => {
    api.getProjectCheckpoints.mockResolvedValue(paged([]))
    api.createCheckpoint.mockResolvedValue(checkpoint)
    mount()
    await screen.findByText('Tạo checkpoint mới')
    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'Review giữa kỳ' } })
    fireEvent.change(screen.getByLabelText('Thời điểm dự kiến'), { target: { value: '2026-11-01T09:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo checkpoint' }))
    await waitFor(() => expect(api.createCheckpoint).toHaveBeenCalledWith(9, { title: 'Review giữa kỳ', majorId: null, plannedAt: new Date('2026-11-01T09:00').toISOString() }))
  })

  it('records a decision with the checkpoint concurrency token and empty evidence', async () => {
    api.getProjectCheckpoints.mockResolvedValue(paged([checkpoint]))
    api.decideCheckpoint.mockResolvedValue({ ...checkpoint, decisions: [{ id: 9, decision: 'AT_RISK', reason: 'Chưa đủ minh chứng', decidedBy: 5, decidedAt: '2026-10-21T00:00:00Z', evidence: [] }] })
    mount()
    await screen.findByText('Chốt đề cương')
    fireEvent.change(screen.getByLabelText('Kết luận'), { target: { value: 'AT_RISK' } })
    fireEvent.change(screen.getByLabelText('Lý do'), { target: { value: 'Chưa đủ minh chứng' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ghi kết luận' }))
    await waitFor(() => expect(api.decideCheckpoint).toHaveBeenCalledWith(1, { concurrencyToken: 'cp-token', decision: 'AT_RISK', reason: 'Chưa đủ minh chứng', evidence: [] }))
    const item = (await screen.findByText('Chưa đủ minh chứng')).closest('li') as HTMLElement
    expect(within(item).getByText('Rủi ro')).toBeTruthy()
  })

  it('reloads the list instead of replaying the mutation on a 409 conflict', async () => {
    api.getProjectCheckpoints.mockResolvedValue(paged([checkpoint]))
    api.decideCheckpoint.mockRejectedValue(new HttpError('stale', 409))
    mount()
    await screen.findByText('Chốt đề cương')
    fireEvent.change(screen.getByLabelText('Lý do'), { target: { value: 'Thử lại' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ghi kết luận' }))
    await waitFor(() => expect(api.getProjectCheckpoints).toHaveBeenCalledTimes(2))
  })

  it('records decision with reviewed evidence citations attached', async () => {
    api.getProjectCheckpoints.mockResolvedValue(paged([checkpoint]))
    api.decideCheckpoint.mockResolvedValue({
      ...checkpoint,
      decisions: [{ id: 10, decision: 'MET', reason: 'Đủ điều kiện', decidedBy: 5, decidedAt: '2026-10-22T00:00:00Z', evidence: [{ evidenceId: 101, reviewId: 202 }] }],
    })
    mount()
    await screen.findByText('Chốt đề cương')
    fireEvent.change(screen.getByLabelText('Lý do'), { target: { value: 'Đủ điều kiện' } })

    fireEvent.click(screen.getByRole('button', { name: '+ Thêm minh chứng' }))
    fireEvent.change(screen.getByPlaceholderText('Evidence ID'), { target: { value: '101' } })
    fireEvent.change(screen.getByPlaceholderText('Review ID'), { target: { value: '202' } })

    fireEvent.click(screen.getByRole('button', { name: 'Ghi kết luận' }))
    await waitFor(() => expect(api.decideCheckpoint).toHaveBeenCalledWith(1, {
      concurrencyToken: 'cp-token',
      decision: 'MET',
      reason: 'Đủ điều kiện',
      evidence: [{ evidenceId: 101, reviewId: 202 }],
    }))
  })

  it('prevents concluding MET without evidence for a workflow-blocking checkpoint', async () => {
    const blockingCheckpoint = { ...checkpoint, blocksAcademicWorkflow: true, trackingOnly: false }
    api.getProjectCheckpoints.mockResolvedValue(paged([blockingCheckpoint]))
    mount()
    await screen.findByText('Chốt đề cương')

    fireEvent.change(screen.getByLabelText('Lý do'), { target: { value: 'Đạt không có bằng chứng' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ghi kết luận' }))

    expect(await screen.findByText(/bắt buộc phải đính kèm ít nhất một minh chứng/)).toBeTruthy()
    expect(api.decideCheckpoint).not.toHaveBeenCalled()
  })
})
