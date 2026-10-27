import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthSessionContext, type AuthSessionContextValue } from '../auth/context/auth-session-context'
import { EvaluatorAssignmentManagementPage } from './EvaluatorAssignmentManagementPage'
import { projectCapabilities } from '../../test/project-capabilities'
import { HttpError } from '../../services/http/http-client'

const capabilitiesApi = vi.hoisted(() => ({ getMyCapabilities: vi.fn() }))
vi.mock('../capabilities/capabilities-api', async () => ({ ...await vi.importActual<typeof import('../capabilities/capabilities-api')>('../capabilities/capabilities-api'), ...capabilitiesApi }))

const api = vi.hoisted(() => ({
  getProject: vi.fn(), getProjectPeriods: vi.fn(), getProjectEvaluationAssignments: vi.fn(), getTeam: vi.fn(),
  assignEvaluator: vi.fn(), revokeEvaluator: vi.fn(), getEligibleEvaluators: vi.fn(), getEvaluationSchemes: vi.fn(),
}))
const namesApi = vi.hoisted(() => ({ getReviewDetail: vi.fn() }))
vi.mock('../projects/api/project-review-api', () => namesApi)
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
  capabilitiesApi.getMyCapabilities.mockResolvedValue(projectCapabilities(2))
  api.getProject.mockResolvedValue({ id: 2, teamId: 10 })
  api.getProjectPeriods.mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 })
  api.getProjectEvaluationAssignments.mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 })
  api.getEligibleEvaluators.mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 })
  api.getEvaluationSchemes.mockResolvedValue([])
  namesApi.getReviewDetail.mockResolvedValue({ latestSubmission: { evidence: { members: [] } } })
})
afterEach(cleanup)

function individualFixture() {
  api.getProjectPeriods.mockResolvedValue({ items: [{ id: 7, name: 'Đợt bảo vệ', periodType: 'EVALUATION', status: 'ACTIVE' }], page: 1, pageSize: 100, totalCount: 1 })
  api.getEvaluationSchemes.mockResolvedValue([{ id: 31, projectPeriodId: 7, status: 'PUBLISHED', name: 'Scheme', version: 1, students: [{ studentId: 9, majorId: 101, departmentId: 1 }, { studentId: 10, majorId: 101, departmentId: 1 }], components: [{ id: 42, name: 'Cá nhân', scope: 'INDIVIDUAL', majorId: 101, rubricId: 4, projectWeightPercent: 0, studentWeightPercent: 100, requiredEvaluators: 1 }] }])
}

async function selectIndividual() {
  fireEvent.change(await screen.findByLabelText('Đợt đánh giá'), { target: { value: '7' } })
  fireEvent.change(screen.getByLabelText('Thành phần đánh giá'), { target: { value: '42' } })
  return screen.getByLabelText('Sinh viên (giữ Ctrl để chọn nhiều)') as HTMLSelectElement
}

it('blocks individual choice while names load and distinguishes duplicate names and missing major names', async () => {
  individualFixture()
  let finish!: (value: unknown) => void
  namesApi.getReviewDetail.mockReturnValue(new Promise(resolve => { finish = resolve }))
  renderPage(); const select = await selectIndividual()
  expect(select.disabled).toBe(true)
  expect(screen.getByText(/Đang tải tên sinh viên/)).toBeDefined()
  finish({ latestSubmission: { evidence: { members: [{ userId: 9, fullName: 'Tên giống nhau' }, { userId: 10, fullName: 'Tên giống nhau' }] } } })
  await waitFor(() => expect(select.disabled).toBe(false))
  expect(screen.getByRole('option', { name: 'Sinh viên #9 · Tên giống nhau · Ngành #101' })).toBeDefined()
  expect(screen.getByRole('option', { name: 'Sinh viên #10 · Tên giống nhau · Ngành #101' })).toBeDefined()
  expect(api.assignEvaluator).not.toHaveBeenCalled()
})

it('keeps scoped unique IDs usable after a name read fails, then retries that read', async () => {
  individualFixture()
  namesApi.getReviewDetail.mockRejectedValueOnce(new HttpError('PRIVATE', 403)).mockResolvedValueOnce({ latestSubmission: { evidence: { members: [{ userId: 9, fullName: 'Đã tải lại' }] } } })
  renderPage(); const select = await selectIndividual()
  await screen.findByRole('alert')
  expect(select.disabled).toBe(false)
  expect(screen.getByRole('option', { name: 'Sinh viên #9 · Ngành #101' })).toBeDefined()
  expect(screen.getByRole('option', { name: 'Sinh viên #10 · Ngành #101' })).toBeDefined()
  fireEvent.click(screen.getByRole('button', { name: 'Thử tải lại tên sinh viên' }))
  await screen.findByRole('option', { name: 'Sinh viên #9 · Đã tải lại · Ngành #101' })
  expect(namesApi.getReviewDetail).toHaveBeenCalledTimes(2)
  expect(api.assignEvaluator).not.toHaveBeenCalled()
})

it('keeps each individual roster in its frozen major while distinguishing unnamed majors', async () => {
  individualFixture()
  const scheme = (await api.getEvaluationSchemes())[0]
  scheme.students.push({ studentId: 11, majorId: 102, departmentId: 1 })
  scheme.components.push({ ...scheme.components[0], id: 43, majorId: 102 })
  renderPage(); await selectIndividual()
  expect(screen.getByRole('option', { name: /Cá nhân.*Ngành #101/ })).toBeDefined()
  expect(screen.getByRole('option', { name: /Cá nhân.*Ngành #102/ })).toBeDefined()
  expect(screen.queryByRole('option', { name: 'Sinh viên #11 · Ngành #102' })).toBeNull()
  fireEvent.change(screen.getByLabelText('Thành phần đánh giá'), { target: { value: '43' } })
  expect(screen.getByRole('option', { name: 'Sinh viên #11 · Ngành #102' })).toBeDefined()
  expect(screen.queryByRole('option', { name: 'Sinh viên #9 · Ngành #101' })).toBeNull()
  expect(api.assignEvaluator).not.toHaveBeenCalled()
})

describe('EvaluatorAssignmentManagementPage', () => {
  it.each(['denied', 'unavailable'])('reads assignments without write or candidate access when capabilities are %s', async state => {
    if (state === 'denied') capabilitiesApi.getMyCapabilities.mockResolvedValue(projectCapabilities(2, false))
    else capabilitiesApi.getMyCapabilities.mockRejectedValue(new HttpError('Unavailable', 503))
    api.getProjectEvaluationAssignments.mockResolvedValue({ items: [{ id: 8, evaluatorId: 6, projectPeriodId: 7, rubricId: 4, departmentId: 1, evaluationType: 'LECTURER', status: 'ACTIVE', assignedAt: '2026-10-09', concurrencyToken: 't' }], page: 1, totalCount: 1 })
    renderPage()
    await screen.findByText(/Giảng viên được phân công/)
    expect(screen.queryByRole('heading', { name: 'Phân công mới' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Thu hồi' })).toBeNull()
    expect(api.getEligibleEvaluators).not.toHaveBeenCalled()
    expect(api.assignEvaluator).not.toHaveBeenCalled()
    expect(api.revokeEvaluator).not.toHaveBeenCalled()
  })
  it('loads scoped evaluation periods without requiring access to the student team', async () => {
    api.getTeam.mockRejectedValue(new Error('403'))
    renderPage()

    expect(await screen.findByText('Chưa có đợt đánh giá thuộc phạm vi quản lý của bạn.')).toBeDefined()
    expect(screen.getByText('Chưa có người chấm phù hợp với bộ lọc này.')).toBeDefined()
    expect(api.getProjectPeriods).toHaveBeenCalledWith('department-token', { search: '', periodType: 'EVALUATION' }, undefined, 1)
    expect(api.getProjectEvaluationAssignments).toHaveBeenCalledWith(2, undefined, undefined, 1)
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
    fireEvent.change(screen.getByLabelText('Thành phần đánh giá'), { target: { value: '42' } })
    await waitFor(() => expect(api.getEligibleEvaluators).toHaveBeenCalledWith(2, 7, { componentId: 42, scope: 'COMMON', majorId: null, studentId: null }, 1, 100, expect.any(AbortSignal)))
    fireEvent.change(screen.getByLabelText('Người chấm'), { target: { value: '6' } })
    fireEvent.click(screen.getByRole('button', { name: 'Phân công người chấm' }))
    await waitFor(() => expect(api.assignEvaluator).toHaveBeenCalledWith(2, { evaluatorId: 6, projectPeriodId: 7, evaluationType: 'LECTURER', componentId: 42, scope: 'COMMON', majorId: null, studentId: null }))
  })

  it('warns when a required component of the selected period lacks enough active evaluators', async () => {
    api.getProjectPeriods.mockResolvedValue({ items: [{ id: 7, name: 'Đợt bảo vệ', semesterName: 'Fall 2026', periodType: 'EVALUATION', status: 'ACTIVE', rubricId: 4 }], page: 1, pageSize: 100, totalCount: 1 })
    api.getEvaluationSchemes.mockResolvedValue([{ id: 31, rootId: 31, version: 1, projectId: 2, projectPeriodId: 7, name: 'Scheme Fall', status: 'PUBLISHED', passThreshold: 5, concurrencyToken: 'scheme-token', policyVersionId: 6, calculationRule: 'RULE', students: [], components: [{ id: 42, name: 'Chuyên ngành Marketing', scope: 'MAJOR_SPECIFIC', majorId: 9, rubricId: 4, projectWeightPercent: 50, studentWeightPercent: 30, requiredEvaluators: 2 }] }])
    api.getProjectEvaluationAssignments.mockResolvedValue({ items: [{ id: 8, projectId: 2, evaluatorId: 6, rubricId: 4, projectPeriodId: 7, departmentId: 1, evaluationType: 'LECTURER', status: 'ACTIVE', assignedBy: 3, assignedAt: '2026-09-28T00:00:00Z', revokedAt: null, concurrencyToken: 't', scope: 'MAJOR_SPECIFIC', majorId: 9, studentId: null, componentId: 42, policyVersionId: 6 }], page: 1, pageSize: 100, totalCount: 1 })
    renderPage()
    fireEvent.change(await screen.findByLabelText('Đợt đánh giá'), { target: { value: '7' } })
    expect(await screen.findByText('Độ phủ người chấm theo thành phần')).toBeTruthy()
    expect(screen.getByText('1/2 người chấm')).toBeTruthy()
  })
})
