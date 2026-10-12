import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SprintBacklogPanel } from './SprintBacklogPanel'
import type { SprintDto, TaskDto } from '../../../types/backend'

const api = vi.hoisted(() => ({
  getProjectSprints: vi.fn(), getTaskBoard: vi.fn(), createSprint: vi.fn(), startSprint: vi.fn(), completeSprint: vi.fn(),
  saveTaskBoard: vi.fn(), getSprintBurndown: vi.fn(),
}))
vi.mock('../../../services/api/tasks.api', () => api)

const task = (id: number, over: Partial<TaskDto>): TaskDto => ({ id, milestoneId: 1, title: `T${id}`, status: 'TODO', createdBy: 1, createdByFullName: 'x', createdAt: '', updatedAt: '', assignees: [], dependencies: [], ...over })
const sprint = (over: Partial<SprintDto>): SprintDto => ({
  id: 1, projectId: 9, name: 'Sprint 1', status: 'PLANNING', startAt: '2026-10-01', endAt: '2026-10-14',
  concurrencyToken: 'sprint-ct', canEdit: true, canStart: true, canComplete: false, ...over,
})
const render_ = () => render(<MemoryRouter><SprintBacklogPanel projectId={9} routeBase="/project" /></MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
  api.getProjectSprints.mockResolvedValue({ items: [sprint({})], page: 1, pageSize: 50, totalCount: 1 })
  api.getTaskBoard.mockResolvedValue({ items: [task(10, { sprintId: 1, storyPoints: 5, status: 'IN_PROGRESS', concurrencyToken: 'task-10-ct' }), task(11, { sprintId: null, concurrencyToken: 'task-11-ct' })], page: 1, pageSize: 100, totalCount: 2 })
  api.getSprintBurndown.mockResolvedValue({ sprintId: 1, points: [], complete: false })
})
afterEach(cleanup)

describe('SprintBacklogPanel', () => {
  it('shows sprint members, backlog and a committed-points summary', async () => {
    render_()
    expect(await screen.findByRole('link', { name: '#10 · T10' })).toBeTruthy()
    expect(screen.getByText(/0\/5 điểm hoàn thành · 1 công việc/)).toBeTruthy()
    const backlog = screen.getByRole('region', { name: 'Backlog' })
    expect(within(backlog).getByRole('link', { name: '#11 · T11' })).toBeTruthy()
  })

  it('disables Start/Complete per the server-issued canStart/canComplete flags', async () => {
    api.getProjectSprints.mockResolvedValue({ items: [sprint({ status: 'ACTIVE', canStart: false, canComplete: false })], page: 1, pageSize: 50, totalCount: 1 })
    render_()
    const complete = await screen.findByRole('button', { name: 'Hoàn tất' })
    expect((complete as HTMLButtonElement).disabled).toBe(true)
  })

  it('starts a planning sprint through the start endpoint', async () => {
    api.startSprint.mockResolvedValue(sprint({ status: 'ACTIVE' }))
    render_()
    fireEvent.click(await screen.findByRole('button', { name: 'Bắt đầu' }))
    await waitFor(() => expect(api.startSprint).toHaveBeenCalledWith(9, 1, 'sprint-ct'))
  })

  it('moves a backlog task into a sprint through the unified board endpoint', async () => {
    api.saveTaskBoard.mockResolvedValue(task(11, { sprintId: 1 }))
    render_()
    const backlog = await screen.findByRole('region', { name: 'Backlog' })
    fireEvent.change(within(backlog).getByRole('combobox'), { target: { value: '1' } })
    await waitFor(() => expect(api.saveTaskBoard).toHaveBeenCalledWith(11, expect.objectContaining({ sprintId: 1, concurrencyToken: 'task-11-ct' })))
  })

  it('creates a sprint via the project-scoped endpoint without a goal field', async () => {
    api.createSprint.mockResolvedValue(sprint({ id: 2, name: 'Sprint 2' }))
    render_()
    fireEvent.change(await screen.findByLabelText('Tên sprint'), { target: { value: 'Sprint 2' } })
    fireEvent.change(screen.getByLabelText('Bắt đầu'), { target: { value: '2026-11-01' } })
    fireEvent.change(screen.getByLabelText('Kết thúc'), { target: { value: '2026-11-14' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo sprint' }))
    await waitFor(() => expect(api.createSprint).toHaveBeenCalledWith(9, { name: 'Sprint 2', startAt: '2026-11-01', endAt: '2026-11-14' }))
  })

  it('sets story points through the unified board endpoint', async () => {
    api.saveTaskBoard.mockResolvedValue(task(11, { storyPoints: 3 }))
    render_()
    const backlog = await screen.findByRole('region', { name: 'Backlog' })
    fireEvent.click(within(backlog).getByRole('button', { name: 'Điểm & nhãn' }))
    fireEvent.click(within(backlog).getByRole('button', { name: '3', pressed: false }))
    fireEvent.click(within(backlog).getByRole('button', { name: 'Lưu' }))
    await waitFor(() => expect(api.saveTaskBoard).toHaveBeenCalledWith(11, expect.objectContaining({ storyPoints: 3, labels: [] })))
  })

  it('opens a carryover picker before completing a sprint with open tasks', async () => {
    api.getProjectSprints.mockResolvedValue({ items: [sprint({ status: 'ACTIVE', canStart: false, canComplete: true })], page: 1, pageSize: 50, totalCount: 1 })
    api.completeSprint.mockResolvedValue(sprint({ status: 'COMPLETED' }))
    render_()
    fireEvent.click(await screen.findByRole('button', { name: 'Hoàn tất' }))
    expect(await screen.findByRole('dialog', { name: 'Hoàn tất sprint Sprint 1' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận hoàn tất' }))
    await waitFor(() => expect(api.completeSprint).toHaveBeenCalledWith(9, 1, 'sprint-ct', [{ taskId: 10, targetSprintId: null, taskConcurrencyToken: 'task-10-ct' }]))
  })
})
