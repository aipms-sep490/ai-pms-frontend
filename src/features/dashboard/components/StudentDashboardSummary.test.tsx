import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StudentDashboardSummary } from './StudentDashboardSummary'
import type { StudentDashboard } from '../api/dashboard-api'

const mockDashboardApi = vi.hoisted(() => ({
  getStudentDashboard: vi.fn(),
}))
const mockReviewGatesApi = vi.hoisted(() => ({
  getStudentReviewTimeline: vi.fn(),
}))
const mockWeeklyApi = vi.hoisted(() => ({
  getWeeklyAssessmentHistory: vi.fn(),
}))

vi.mock('../api/dashboard-api', () => mockDashboardApi)
vi.mock('../../review-gates/api/review-gates-api', () => mockReviewGatesApi)
vi.mock('../../../services/api/weekly.api', () => mockWeeklyApi)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const baseDashboard: StudentDashboard = {
  asOfUtc: '2026-11-14T00:00:00Z',
  actions: [],
  project: {
    id: 10,
    title: 'AI Research Platform',
    code: 'PROJ-10',
    status: 'ACTIVE',
    teamId: 1,
    semesterId: 3,
    pendingProgressReviews: 0,
    analysis: null,
    departmentId: 1,
    departmentName: 'Kỹ thuật phần mềm',
    majors: [{ id: 1, code: 'SE', name: 'Software Engineering' }],
    supervisor: { userId: 5, name: 'TS. Tran Van B' },
  },
  unreadNotifications: 0,
  assignedOpenTasks: 2,
  assignedOverdueTasks: 0,
  taskDeadlines: [
    { id: 1, title: 'Hoàn thiện tài liệu kiến trúc', status: 'IN_PROGRESS', dueAtUtc: '2026-11-20T00:00:00Z', isOverdue: false },
  ],
  milestoneDeadlines: [],
  contributionDataStatus: 'CURRENT',
}

describe('StudentDashboardSummary', () => {
  it('renders student weekly assessment feedback when available', async () => {
    mockDashboardApi.getStudentDashboard.mockResolvedValue(baseDashboard)
    mockReviewGatesApi.getStudentReviewTimeline.mockResolvedValue({
      projectId: '10',
      currentGate: 'Gate 2',
      gates: [],
    })
    mockWeeklyApi.getWeeklyAssessmentHistory.mockResolvedValue({
      items: [{
        id: 1,
        projectId: 10,
        studentId: 5,
        weekNumber: 4,
        status: 'SUBMITTED',
        totalScore: 9.2,
        comments: 'Tiến độ rất tốt, cần bổ sung test integration.',
        scores: [
          { rubricCriterionId: 1, name: 'Chủ động', score: 9.5, maxScore: 10, comments: 'Làm việc độc lập tốt' },
        ],
      }],
      totalCount: 1,
    })

    render(
      <MemoryRouter>
        <StudentDashboardSummary />
      </MemoryRouter>
    )

    expect(await screen.findByText('Đánh giá & Nhận xét tuần từ GVHD')).toBeTruthy()
    expect(screen.getByText('Tuần 4')).toBeTruthy()
    expect(screen.getByText(/Tiến độ rất tốt, cần bổ sung test integration/)).toBeTruthy()
    expect(screen.getByText('Chủ động')).toBeTruthy()
  })

  it('renders placeholder message when no weekly assessment is published yet', async () => {
    mockDashboardApi.getStudentDashboard.mockResolvedValue(baseDashboard)
    mockReviewGatesApi.getStudentReviewTimeline.mockResolvedValue(null)
    mockWeeklyApi.getWeeklyAssessmentHistory.mockResolvedValue({ items: [], totalCount: 0 })

    render(
      <MemoryRouter>
        <StudentDashboardSummary />
      </MemoryRouter>
    )

    expect(await screen.findByText('Đánh giá & Nhận xét tuần từ GVHD')).toBeTruthy()
    expect(screen.getByText('Chưa có đánh giá tuần nào được công bố')).toBeTruthy()
  })
})
