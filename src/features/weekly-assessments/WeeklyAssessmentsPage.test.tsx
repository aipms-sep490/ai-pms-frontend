import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom'
import { ExecutionAccessProvider } from '../execution/context/ExecutionAccessProvider'
import type { ExecutionAccess } from '../execution/context/ExecutionAccessContext'
import { HttpError } from '../../services/http/http-client'
import { WeeklyAssessmentsPage } from './WeeklyAssessmentsPage'
import type { Rubric, WeeklyAssessment, WeeklyAssessmentCalendar } from '../../services/api/weekly.api'

const api = vi.hoisted(() => ({
  getWeeklyAssessmentWeeks: vi.fn(), getWeeklyAssessmentRubrics: vi.fn(), getWeeklyAssessmentHistory: vi.fn(),
  getWeeklyAssessment: vi.fn(), saveWeeklyAssessment: vi.fn(), submitWeeklyAssessment: vi.fn(),
  getTeam: vi.fn(),
}))
vi.mock('../../services/api/weekly.api', () => api)
vi.mock('../../services/api/teams.api', () => ({ getTeam: api.getTeam }))

const calendar: WeeklyAssessmentCalendar = {
  academicSemesterId: 3, timeZoneId: 'Asia/Ho_Chi_Minh',
  weeks: [
    { weekNumber: 1, startDate: '2026-09-07', endDate: '2026-09-13', hasStarted: true },
    { weekNumber: 2, startDate: '2026-09-14', endDate: '2026-09-20', hasStarted: true },
    { weekNumber: 3, startDate: '2026-09-21', endDate: '2026-09-27', hasStarted: false },
  ],
}
const rubric: Rubric = {
  id: 34, departmentId: 1, academicSemesterId: 3, code: 'WK', name: 'Weekly rubric', description: null, status: 'PUBLISHED',
  rootRubricId: 34, version: 1, concurrencyToken: 'rub-token', isReferenced: true, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
  criteria: [{ id: 56, criterionId: 56, name: 'Chủ động', description: null, weightPercent: 100, maxScore: 10, sortOrder: 1, isRequired: true, parentId: null, effectiveWeightPercent: 100 }],
}
const draft: WeeklyAssessment = {
  id: 501, projectId: 9, studentId: 12, majorId: 203, academicSemesterId: 3, weekNumber: 2, startDate: '2026-09-14', endDate: '2026-09-20',
  timeZoneId: 'Asia/Ho_Chi_Minh', version: 1, status: 'DRAFT', rubricId: 34, rubricName: 'Weekly rubric', rubricVersion: 1,
  scores: [{ rubricCriterionId: 56, name: 'Chủ động', description: null, weightPercent: 100, maxScore: 10, sortOrder: 1, isRequired: true, score: 8, comments: null }],
  totalScore: null, comments: 'Tốt', revisionReason: null, concurrencyToken: 'week-token-1', createdBy: 5, primaryAssignmentId: 77,
  createdAt: '2026-09-15T00:00:00Z', submittedAt: null, canEdit: true, canSubmit: true, isDemo: true, affectsOfficialResult: false,
}

function mount(withTeam = true) {
  const access: ExecutionAccess = {
    project: { id: 9, title: 'Quản lý đồ án', status: 'ACTIVE' } as ExecutionAccess['project'],
    team: { id: 1, academicSemesterId: 3, code: 'T1', name: 'Nhóm 1', status: 'ACTIVE', members: [{ userId: 12, fullName: 'Nguyễn Văn A', isEligibleStudent: true, isLeader: true }], eligibility: { canRegister: true, rosterLocked: true } } as ExecutionAccess['team'],
    actor: 'supervisor', canManageStructure: false, currentUserId: 5, routeBase: '/supervisor/projects/9',
  }
  if (!withTeam) { access.team = undefined; access.project.teamId = 1 }
  const router = createMemoryRouter([{ element: <ExecutionAccessProvider value={access}><Outlet /></ExecutionAccessProvider>, children: [
    { path: '/supervisor/projects/:projectId/weekly-assessments', element: <WeeklyAssessmentsPage /> },
  ] }], { initialEntries: ['/supervisor/projects/9/weekly-assessments'] })
  return render(<RouterProvider router={router} />)
}

beforeEach(() => {
  vi.resetAllMocks()
  api.getWeeklyAssessmentWeeks.mockResolvedValue(calendar)
  api.getWeeklyAssessmentRubrics.mockResolvedValue({ items: [rubric], page: 1, pageSize: 50, totalCount: 1, totalPages: 1 })
})
afterEach(cleanup)

describe('Weekly assessments page', () => {
  it('loads the team when the Primary workspace has no student roster', async () => {
    api.getTeam.mockResolvedValue({ members: [{ userId: 12, fullName: 'Nguyễn Văn A' }] })
    api.getWeeklyAssessmentHistory.mockResolvedValue({ items: [draft], totalCount: 1 })
    mount(false)
    await screen.findByDisplayValue('8')
    expect(api.getTeam).toHaveBeenCalledWith(1)
    expect(screen.getByRole('option', { name: 'Nguyễn Văn A' })).toBeTruthy()
  })
  it('does not offer first-draft creation when reading the latest version fails', async () => {
    api.getWeeklyAssessmentHistory.mockRejectedValue(new HttpError('forbidden', 403))
    mount(); await screen.findByRole('alert')
    expect(screen.queryByRole('button', { name: 'Tạo bản chấm' })).toBeNull()
    expect(screen.queryByLabelText('Rubric áp dụng')).toBeNull()
  })
  it('keeps the refreshed token when save succeeds but submission fails', async () => {
    api.getWeeklyAssessmentHistory.mockResolvedValue({ items: [draft], totalCount: 1 })
    api.saveWeeklyAssessment.mockResolvedValue({ ...draft, concurrencyToken: 'fresh-token', scores: [{ ...draft.scores[0], score: 9 }] })
    api.submitWeeklyAssessment.mockRejectedValueOnce(new HttpError('unavailable', 503)).mockResolvedValueOnce({ ...draft, status: 'SUBMITTED' })
    mount()
    fireEvent.change(await screen.findByLabelText('Điểm Chủ động'), { target: { value: '9' } })
    fireEvent.click(screen.getByRole('button', { name: 'Nộp điểm' }))
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: 'Nộp điểm' }))
    await waitFor(() => expect(api.submitWeeklyAssessment).toHaveBeenCalledTimes(2))
    expect(api.submitWeeklyAssessment).toHaveBeenLastCalledWith(501, 'fresh-token')
    expect(api.saveWeeklyAssessment).toHaveBeenCalledTimes(1)
  })
  it('asks before discarding visible edits on a week change', async () => {
    api.getWeeklyAssessmentHistory.mockResolvedValue({ items: [draft], totalCount: 1 })
    mount()
    fireEvent.change(await screen.findByLabelText('Điểm Chủ động'), { target: { value: '9' } })
    fireEvent.change(screen.getByLabelText('Tuần'), { target: { value: '3' } })
    await screen.findByRole('dialog')
    expect(api.getWeeklyAssessmentHistory).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ thay đổi và chuyển' }))
    await waitFor(() => expect(api.getWeeklyAssessmentHistory).toHaveBeenCalledTimes(2))
  })
  it('saves visible edits before submitting and uses the refreshed token', async () => {
    api.getWeeklyAssessmentHistory.mockResolvedValue({ items: [draft], totalCount: 1 })
    api.saveWeeklyAssessment.mockResolvedValue({ ...draft, concurrencyToken: 'saved-token', scores: [{ ...draft.scores[0], score: 9 }] })
    api.submitWeeklyAssessment.mockResolvedValue({ ...draft, status: 'SUBMITTED', canEdit: false, canSubmit: false })
    mount()
    fireEvent.change(await screen.findByLabelText('Điểm Chủ động'), { target: { value: '9' } })
    fireEvent.click(screen.getByRole('button', { name: 'Nộp điểm' }))
    await waitFor(() => expect(api.submitWeeklyAssessment).toHaveBeenCalledWith(501, 'saved-token'))
    expect(api.saveWeeklyAssessment).toHaveBeenCalledWith(9, expect.objectContaining({ scores: [{ rubricCriterionId: 56, score: 9, comments: null }] }))
  })
  it('offers an append-only revision for a submitted row whose canEdit is false', async () => {
    api.getWeeklyAssessmentHistory.mockResolvedValue({ items: [{ ...draft, status: 'SUBMITTED', canEdit: false, canSubmit: false }], totalCount: 1 })
    api.saveWeeklyAssessment.mockResolvedValue({ ...draft, version: 2 })
    mount()
    fireEvent.change(await screen.findByLabelText('Lý do chỉnh sửa'), { target: { value: 'Bổ sung phản hồi' } })
    expect(screen.queryByRole('spinbutton')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Tạo chỉnh sửa (phiên bản mới)' }))
    await waitFor(() => expect(api.saveWeeklyAssessment).toHaveBeenCalledWith(9, expect.objectContaining({ expectedLatestVersion: 1, revisionReason: 'Bổ sung phản hồi' })))
    expect(api.saveWeeklyAssessment.mock.calls[0][1]).not.toHaveProperty('concurrencyToken')
  })
  it('defaults to the latest started week and offers a rubric picker when nothing exists yet', async () => {
    api.getWeeklyAssessmentHistory.mockResolvedValue({ items: [], page: 1, pageSize: 1, totalCount: 0, totalPages: 0 })
    mount()
    expect(await screen.findByText(/Tuần 2/)).toBeTruthy()
    expect(await screen.findByText('Chưa có bản chấm cho tuần này')).toBeTruthy()
    expect(await screen.findByText('Weekly rubric (v1)')).toBeTruthy()
  })

  it('creates the first draft version with expectedLatestVersion 0 and no concurrency token', async () => {
    api.getWeeklyAssessmentHistory.mockResolvedValue({ items: [], page: 1, pageSize: 1, totalCount: 0, totalPages: 0 })
    api.saveWeeklyAssessment.mockResolvedValue(draft)
    mount()
    await screen.findByText('Weekly rubric (v1)')
    fireEvent.change(screen.getByLabelText('Rubric áp dụng'), { target: { value: '34' } })
    const score = await screen.findByRole('spinbutton')
    fireEvent.change(score, { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo bản chấm' }))
    await waitFor(() => expect(api.saveWeeklyAssessment).toHaveBeenCalledWith(9, {
      studentId: 12, weekNumber: 2, rubricId: 34, expectedLatestVersion: 0,
      scores: [{ rubricCriterionId: 56, score: 8, comments: null }], comments: null,
    }))
    expect(await screen.findByText('Bản nháp')).toBeTruthy()
  })

  it('saves an edit to an existing draft with its current version and concurrency token', async () => {
    api.getWeeklyAssessmentHistory.mockResolvedValue({ items: [draft], page: 1, pageSize: 1, totalCount: 1, totalPages: 1 })
    api.saveWeeklyAssessment.mockResolvedValue({ ...draft, version: 2 })
    mount()
    const score = await screen.findByDisplayValue('8')
    fireEvent.change(score, { target: { value: '9' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }))
    await waitFor(() => expect(api.saveWeeklyAssessment).toHaveBeenCalledWith(9, {
      studentId: 12, weekNumber: 2, rubricId: 34, expectedLatestVersion: 1,
      scores: [{ rubricCriterionId: 56, score: 9, comments: null }], comments: 'Tốt', concurrencyToken: 'week-token-1',
    }))
  })

  it('submits using the assessment id and its concurrency token', async () => {
    api.getWeeklyAssessmentHistory.mockResolvedValue({ items: [draft], page: 1, pageSize: 1, totalCount: 1, totalPages: 1 })
    api.submitWeeklyAssessment.mockResolvedValue({ ...draft, status: 'SUBMITTED', submittedAt: '2026-09-16T00:00:00Z' })
    mount()
    await screen.findByDisplayValue('8')
    fireEvent.click(screen.getByRole('button', { name: 'Nộp điểm' }))
    await waitFor(() => expect(api.submitWeeklyAssessment).toHaveBeenCalledWith(501, 'week-token-1'))
    expect(await screen.findByText('Đã nộp')).toBeTruthy()
  })

  it('requires a non-empty revision reason before correcting a submitted version', async () => {
    const submitted: WeeklyAssessment = { ...draft, status: 'SUBMITTED', submittedAt: '2026-09-16T00:00:00Z', canEdit: true }
    api.getWeeklyAssessmentHistory.mockResolvedValue({ items: [submitted], page: 1, pageSize: 1, totalCount: 1, totalPages: 1 })
    mount()
    await screen.findByText('Đã nộp')
    const button = screen.getByRole('button', { name: 'Tạo chỉnh sửa (phiên bản mới)' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.change(screen.getByPlaceholderText('Lý do chỉnh sửa'), { target: { value: 'Sửa điểm sai' } })
    expect(button.disabled).toBe(false)
  })

  it('blocks editing a week that has not started yet', async () => {
    api.getWeeklyAssessmentHistory.mockResolvedValue({ items: [], page: 1, pageSize: 1, totalCount: 0, totalPages: 0 })
    mount()
    await screen.findByLabelText('Rubric áp dụng')
    const week = await screen.findByLabelText('Tuần') as HTMLSelectElement
    // The editor can be rendered before its busy=false effect reaches the parent.
    await waitFor(() => expect(week.disabled).toBe(false))
    fireEvent.change(week, { target: { value: '3' } })
    expect(await screen.findByText('Tuần này chưa tới, chưa thể chấm.')).toBeTruthy()
    expect(api.saveWeeklyAssessment).not.toHaveBeenCalled()
  })

  it('reloads history instead of replaying the mutation on a 409 conflict', async () => {
    api.getWeeklyAssessmentHistory.mockResolvedValue({ items: [draft], page: 1, pageSize: 1, totalCount: 1, totalPages: 1 })
    api.saveWeeklyAssessment.mockRejectedValue(new HttpError('stale', 409))
    mount()
    await screen.findByDisplayValue('8')
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }))
    await screen.findByRole('alert')
    await waitFor(() => expect(api.getWeeklyAssessmentHistory).toHaveBeenCalledTimes(2))
  })
})
