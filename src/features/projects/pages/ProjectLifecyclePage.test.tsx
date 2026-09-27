import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProjectLifecyclePage } from './ProjectLifecyclePage'

const mocks = vi.hoisted(() => ({
  useProjectLifecycle: vi.fn(),
  useStudentJourney: vi.fn(),
  getHistory: vi.fn(),
}))

vi.mock('../hooks/useProjectLifecycle', () => ({ useProjectLifecycle: mocks.useProjectLifecycle }))
vi.mock('../../../app/context', () => ({ useStudentJourney: mocks.useStudentJourney }))
vi.mock('../../../services/service-gateway', () => ({ services: { project: { getHistory: mocks.getHistory } } }))

const journey = {
  project: {
    id: 2, teamId: 2, teamName: 'AI-PMS', code: 'SEP490-FA26-AIPMS', title: 'AI-PMS thật',
    status: 'ACTIVE', registeredAt: '2026-08-20', createdBy: 9, createdByName: 'Nguyễn Minh Khang',
    createdAt: '2026-08-20', updatedAt: '2026-09-12', concurrencyToken: 'token',
    objectives: 'Theo dõi tiến độ thật', expectedOutput: 'Web platform',
    majors: [{ id: 1, majorId: 3, majorCode: 'SE', majorName: 'Software Engineering' }], tags: [],
  },
  team: {
    id: 2, academicSemesterId: 2, code: 'SEP490_G01', name: 'AI-PMS', status: 'LOCKED',
    members: [{ userId: 9, fullName: 'Nguyễn Minh Khang', majorId: 3, isEligibleStudent: true, isLeader: true }],
    eligibility: { canRegister: false, rosterLocked: true, reasons: ['ROSTER_LOCKED'] },
  },
  assignments: [{ id: 1, projectId: 2, supervisorProfileId: 2, supervisorUserId: 3, supervisorName: 'Nguyễn Hoàng Minh', supervisorRequestId: 1, isPrimary: true, assignedAt: '2026-09-12' }],
  semester: { name: 'Fall 2026' },
  isLoading: false,
  error: null,
}

beforeEach(() => {
  mocks.useStudentJourney.mockReturnValue(journey)
  mocks.getHistory.mockResolvedValue([])
  mocks.useProjectLifecycle.mockReturnValue({ data: { states: [] }, error: null, isLoading: false, isForbidden: false, isEmpty: true, retry: vi.fn() })
})

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('ProjectLifecyclePage', () => {
  it('renders only backend-backed project, team and supervisor data', async () => {
    render(<ProjectLifecyclePage />, { wrapper: MemoryRouter })
    expect(screen.getByText('AI-PMS thật')).toBeDefined()
    expect(screen.getAllByText('Nguyễn Minh Khang').length).toBeGreaterThan(0)
    expect(screen.getByText('Nguyễn Hoàng Minh')).toBeDefined()
    expect(screen.queryByText(/Mô phỏng/)).toBeNull()
  })

  it('does not render the API and state-machine debug section', async () => {
    render(<ProjectLifecyclePage />, { wrapper: MemoryRouter })
    expect(await screen.findByText('Chưa có lịch sử đồ án.')).toBeDefined()
    expect(screen.queryByText(/GET \/api|Domain workflow|backend hỗ trợ/)).toBeNull()
    expect(screen.getByText('Đang thực hiện')).toBeDefined()
  })

  it('keeps a history error distinct from an empty history', async () => {
    mocks.getHistory.mockRejectedValue(new Error('SQL details'))
    render(<ProjectLifecyclePage />, { wrapper: MemoryRouter })
    expect((await screen.findByRole('alert')).textContent).toContain('Chưa tải được lịch sử đồ án')
    expect(screen.queryByText('Chưa có lịch sử đồ án.')).toBeNull()
    expect(screen.queryByText('SQL details')).toBeNull()
  })
})
