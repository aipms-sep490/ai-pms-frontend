import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthSessionContext, type AuthSessionContextValue } from '../auth/context/auth-session-context'
import { EvaluatorAssignmentManagementPage } from './EvaluatorAssignmentManagementPage'

const api = vi.hoisted(() => ({
  getProject: vi.fn(), getProjectPeriods: vi.fn(), getProjectEvaluationAssignments: vi.fn(), getTeam: vi.fn(),
  assignEvaluator: vi.fn(), revokeEvaluator: vi.fn(), getEligibleEvaluators: vi.fn(), getEvaluationSchemes: vi.fn(),
}))
vi.mock('../../services/api/projects.api', () => ({ getProject: api.getProject }))
vi.mock('../academic/api/governance-api', () => ({ getProjectPeriods: api.getProjectPeriods }))
vi.mock('../../services/api/evaluations.api', () => ({
  getProjectEvaluationAssignments: api.getProjectEvaluationAssignments,
  assignEvaluator: api.assignEvaluator, revokeEvaluator: api.revokeEvaluator, getEligibleEvaluators: api.getEligibleEvaluators, getEvaluationSchemes: api.getEvaluationSchemes,
}))
vi.mock('../../services/api/teams.api', () => ({ getTeam: api.getTeam }))

const auth: AuthSessionContextValue = {
  session: {
    accessToken: 'department-token', tokenType: 'Bearer', expiresAtUtc: '', refreshToken: '', refreshTokenExpiresAtUtc: '',
    user: { id: 3, fullName: 'Department user', email: 'department@example.test', roles: ['DEPARTMENT_STAFF'] },
  },
  status: 'authenticated', error: null,
  login: async () => { throw new Error('unused') }, logout: async () => {}, refreshProfile: async () => {}, restoreSession: async () => {},
}

function renderPage(path = '/department/projects/2/evaluators') {
  return render(<AuthSessionContext.Provider value={auth}>
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/department/projects/:projectId/evaluators" element={<EvaluatorAssignmentManagementPage />} /><Route path="/department/projects/:projectId/evaluations" element={<EvaluatorAssignmentManagementPage />} /></Routes>
    </MemoryRouter>
  </AuthSessionContext.Provider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  api.getProject.mockResolvedValue({ id: 2, teamId: 10 })
  api.getProjectPeriods.mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 })
  api.getProjectEvaluationAssignments.mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 })
  api.getEligibleEvaluators.mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 })
  api.getEvaluationSchemes.mockResolvedValue([])
})
afterEach(cleanup)

describe('EvaluatorAssignmentManagementPage', () => {
  it('loads scoped evaluation periods without requiring access to the student team', async () => {
    api.getTeam.mockRejectedValue(new Error('403'))
    renderPage()

    expect(await screen.findByText('Chưa có đợt EVALUATION trong phạm vi học vụ.')).toBeDefined()
    expect(screen.getByText('Chưa có evaluator phù hợp với bộ lọc này.')).toBeDefined()
    expect(api.getProjectPeriods).toHaveBeenCalledWith('department-token', { search: '', periodType: 'EVALUATION' })
    expect(api.getProjectEvaluationAssignments).toHaveBeenCalledWith(2)
    await waitFor(() => expect(api.getTeam).not.toHaveBeenCalled())
  })

  it('keeps the requested evaluations route and confirms a revoke with the loaded token', async () => {
    api.getProjectEvaluationAssignments.mockResolvedValue({ items: [{ id: 8, projectId: 2, evaluatorId: 6, rubricId: 4, projectPeriodId: 7, departmentId: 1, evaluationType: 'LECTURER', status: 'ACTIVE', assignedBy: 3, assignedAt: '2026-09-28T00:00:00Z', revokedAt: null, concurrencyToken: 'latest-token' }], page: 1, pageSize: 100, totalCount: 1 })
    api.revokeEvaluator.mockResolvedValue({ id: 8, status: 'REVOKED' })
    renderPage('/department/projects/2/evaluations')

    fireEvent.click(await screen.findByRole('button', { name: 'Thu hồi' }))
    expect(screen.getByLabelText('Lý do thu hồi')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Lý do thu hồi'), { target: { value: 'Đổi hội đồng' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận thu hồi' }))

    await waitFor(() => expect(api.revokeEvaluator).toHaveBeenCalledWith(8, 'latest-token', 'Đổi hội đồng'))
  })
  it('assigns only an evaluator returned for the selected published component target', async () => {
    api.getProjectPeriods.mockResolvedValue({ items: [{ id: 7, name: 'Đợt bảo vệ', semesterName: 'Fall 2026', periodType: 'EVALUATION', status: 'ACTIVE', rubricId: 4 }], page: 1, pageSize: 100, totalCount: 1 })
    api.getEvaluationSchemes.mockResolvedValue([{ id: 31, rootId: 31, version: 1, projectId: 2, projectPeriodId: 7, name: 'Scheme Fall', status: 'PUBLISHED', passThreshold: 5, concurrencyToken: 'scheme-token', policyVersionId: 6, calculationRule: 'RULE', students: [], components: [{ id: 42, name: 'Common', scope: 'COMMON', majorId: null, rubricId: 4, projectWeightPercent: 100, studentWeightPercent: 0, requiredEvaluators: 1 }] }])
    api.getEligibleEvaluators.mockResolvedValue({ items: [{ userId: 6, displayName: 'GV Trần', departmentId: 1, departmentName: 'SE', evaluationTypes: ['LECTURER'] }], page: 1, pageSize: 100, totalCount: 1 })
    api.assignEvaluator.mockResolvedValue({ id: 8 })
    renderPage()
    fireEvent.change(await screen.findByLabelText('Đợt đánh giá'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Scheme component'), { target: { value: '42' } })
    await waitFor(() => expect(api.getEligibleEvaluators).toHaveBeenCalledWith(2, 7, { componentId: 42, scope: 'COMMON', majorId: null, studentId: null }, 1, 100, expect.any(AbortSignal)))
    fireEvent.change(screen.getByLabelText('Evaluator'), { target: { value: '6' } })
    fireEvent.click(screen.getByRole('button', { name: 'Phân công evaluator' }))
    await waitFor(() => expect(api.assignEvaluator).toHaveBeenCalledWith(2, { evaluatorId: 6, projectPeriodId: 7, evaluationType: 'LECTURER', componentId: 42, scope: 'COMMON', majorId: null, studentId: null }))
  })
})
