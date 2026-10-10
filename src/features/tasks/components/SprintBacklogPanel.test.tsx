import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SprintBacklogPanel } from './SprintBacklogPanel'
import type { SprintDto, TaskDto } from '../../../types/backend'

const api = vi.hoisted(() => ({ getProjectSprints: vi.fn(), getProjectTasks: vi.fn(), createSprint: vi.fn(), updateSprintStatus: vi.fn(), setTaskSprint: vi.fn(), setTaskPlanning: vi.fn() }))
vi.mock('../../../services/api/tasks.api', () => api)

const task = (id: number, over: Partial<TaskDto>): TaskDto => ({ id, milestoneId: 1, title: `T${id}`, status: 'TODO', createdBy: 1, createdByFullName: 'x', createdAt: '', updatedAt: '', assignees: [], dependencies: [], ...over })
const render_ = () => render(<MemoryRouter><SprintBacklogPanel projectId={9} routeBase="/project" /></MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
  api.getProjectSprints.mockResolvedValue([{ id: 1, projectId: 9, name: 'Sprint 1', status: 'PLANNING' } as SprintDto])
  api.getProjectTasks.mockResolvedValue({ items: [task(10, { sprintId: 1, storyPoints: 5, status: 'IN_PROGRESS' }), task(11, { sprintId: null })], page: 1, pageSize: 100, totalCount: 2 })
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

  it('blocks completing an active sprint while a task is still open', async () => {
    api.getProjectSprints.mockResolvedValue([{ id: 1, projectId: 9, name: 'Sprint 1', status: 'ACTIVE' } as SprintDto])
    render_()
    const complete = await screen.findByRole('button', { name: 'Hoàn tất' })
    expect((complete as HTMLButtonElement).disabled).toBe(true)
  })

  it('moves a backlog task into a sprint through the scoped API', async () => {
    api.setTaskSprint.mockResolvedValue(task(11, { sprintId: 1 }))
    render_()
    const backlog = await screen.findByRole('region', { name: 'Backlog' })
    fireEvent.change(within(backlog).getByRole('combobox'), { target: { value: '1' } })
    await waitFor(() => expect(api.setTaskSprint).toHaveBeenCalledWith(11, 1, undefined))
  })

  it('creates a sprint via the project-scoped endpoint', async () => {
    api.createSprint.mockResolvedValue({ id: 2, projectId: 9, name: 'Sprint 2', status: 'PLANNING' })
    render_()
    fireEvent.change(await screen.findByLabelText('Tên sprint'), { target: { value: 'Sprint 2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo sprint' }))
    await waitFor(() => expect(api.createSprint).toHaveBeenCalledWith(9, expect.objectContaining({ name: 'Sprint 2' })))
  })

  it('sets story points through the planning endpoint', async () => {
    api.setTaskPlanning.mockResolvedValue(task(11, { storyPoints: 3 }))
    render_()
    const backlog = await screen.findByRole('region', { name: 'Backlog' })
    fireEvent.click(within(backlog).getByRole('button', { name: 'Điểm & nhãn' }))
    fireEvent.click(within(backlog).getByRole('button', { name: '3', pressed: false }))
    fireEvent.click(within(backlog).getByRole('button', { name: 'Lưu' }))
    await waitFor(() => expect(api.setTaskPlanning).toHaveBeenCalledWith(11, expect.objectContaining({ storyPoints: 3, labels: [] })))
  })
})
