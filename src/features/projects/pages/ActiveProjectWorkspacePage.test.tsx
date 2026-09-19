import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ActiveProjectWorkspacePage } from './ActiveProjectWorkspacePage'

const journey = vi.hoisted(() => ({ useStudentJourney: vi.fn() }))
const api = vi.hoisted(() => ({
  getProjectMilestones: vi.fn().mockResolvedValue([]),
  getProjectProgressSummary: vi.fn().mockResolvedValue({ progressPercentage: 0 }),
  getProjectTimeline: vi.fn().mockResolvedValue({ milestones: [] }),
  getOverdueBlockedTasks: vi.fn().mockResolvedValue({ overdueTasks: [], blockedTasks: [] }),
}))
vi.mock('../../../app/context', () => journey)
vi.mock('../../../services/service-gateway', () => ({ services: { milestone: { getProjectMilestones: api.getProjectMilestones }, task: { getProjectProgressSummary: api.getProjectProgressSummary, getProjectTimeline: api.getProjectTimeline, getOverdueBlockedTasks: api.getOverdueBlockedTasks } } }))

const activeJourney = {
  journeyState: 'ACTIVE', isLoading: false, error: null, refreshAll: vi.fn(),
  project: {
    id: 9, teamId: 2, teamName: 'SE-9', code: 'PRJ-9', title: 'AI-PMS', status: 'Active',
    description: 'Mô tả thật', objectives: 'Mục tiêu thật', problemStatement: null, expectedOutput: 'Web app',
    registeredAt: '', createdBy: 1, createdByName: 'Leader', createdAt: '', updatedAt: '', concurrencyToken: 'token', majors: [], tags: [],
  },
  team: { id: 2, code: 'SE9', name: 'SE-9', status: 'ACTIVE', members: [], eligibility: { canRegister: true, reasons: [] }, academicScope: { projectMode: 'INTERDISCIPLINARY', leadDepartmentId: 1, requirements: [], concurrencyToken: 'scope' } },
  assignments: [{ id: 3, projectId: 9, supervisorProfileId: 4, supervisorUserId: 5, supervisorName: 'Dr. Mai', supervisorRequestId: 7, isPrimary: true, assignedAt: '' }],
}

afterEach(() => { vi.clearAllMocks() })

describe('ActiveProjectWorkspacePage', () => {
  it('renders only backend-backed ACTIVE summary data after a reload', () => {
    journey.useStudentJourney.mockReturnValue(activeJourney)
    render(<MemoryRouter><ActiveProjectWorkspacePage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Không gian đồ án ACTIVE' })).toBeTruthy()
    expect(screen.getByText('AI-PMS')).toBeTruthy()
    expect(screen.getByText('INTERDISCIPLINARY')).toBeTruthy()
    expect(screen.getByText('Dr. Mai')).toBeTruthy()
    expect(screen.getByText(/không tạo milestone, task, tiến độ/)).toBeTruthy()
  })

  it('guards the workspace URL and returns a non-ACTIVE project to its real next action', () => {
    journey.useStudentJourney.mockReturnValue({ ...activeJourney, journeyState: 'SUPERVISOR_PENDING', project: { ...activeJourney.project, status: 'Approved' }, assignments: [] })
    render(<MemoryRouter initialEntries={['/project/workspace']}><Routes><Route path="/project/workspace" element={<ActiveProjectWorkspacePage />} /><Route path="/project/supervisor" element={<p>Supervisor selection</p>} /></Routes></MemoryRouter>)
    expect(screen.getByText('Supervisor selection')).toBeTruthy()
  })
})
