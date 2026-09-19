import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { GanttPage } from './GanttPage'

const journey = vi.hoisted(() => ({ useStudentJourney: vi.fn() }))
const api = vi.hoisted(() => ({ getProjectTimeline: vi.fn(), getProjectProgressSummary: vi.fn() }))
vi.mock('../../../app/context', () => journey)
vi.mock('../../../services/service-gateway', () => ({ services: { task: api } }))

afterEach(() => { vi.clearAllMocks() })
describe('GanttPage', () => {
  it('renders the Backend timeline and progress projection without preview fixture data', async () => {
    journey.useStudentJourney.mockReturnValue({ project: { id: 9 } })
    api.getProjectTimeline.mockResolvedValue({ projectId: 9, milestones: [{ id: 3, title: 'Backend M3', status: 'IN_PROGRESS', progressPercentage: 50, tasks: [{ id: 8, title: 'Backend task', status: 'TODO', assignees: [], dependencies: [] }] }] })
    api.getProjectProgressSummary.mockResolvedValue({ projectId: 9, progressPercentage: 50, doneTasks: 2, totalTasks: 4, overdueTasks: 1, blockedTasks: 1, totalMilestones: 1, completedMilestones: 0 })
    render(<MemoryRouter><GanttPage /></MemoryRouter>)
    expect(await screen.findByText('Backend M3')).toBeTruthy()
    expect(screen.getByText('Backend task')).toBeTruthy()
    expect(screen.queryByText('Dữ liệu mô phỏng')).toBeNull()
  })
})
