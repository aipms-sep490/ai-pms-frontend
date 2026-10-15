import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { EvaluatorAssignmentDetailPage } from './EvaluatorAssignmentDetailPage'
import { HttpError } from '../../../services/http/http-client'
import type { EvaluationAssignment, EvaluationDraft } from '../evaluation-types'
import type { EvaluationAssignmentDetail } from '../../../services/api/evaluations.api'

const mocks = vi.hoisted(() => ({
  getProjectEvaluations: vi.fn(),
  getEvaluationAssignmentEvidence: vi.fn(),
  createEvaluationDraft: vi.fn(),
  saveEvaluationDraft: vi.fn(),
  finalizeEvaluation: vi.fn(),
  context: null as { assignment: EvaluationAssignment; detail: EvaluationAssignmentDetail } | null,
}))

vi.mock('../../../services/api/evaluations.api', () => ({
  getProjectEvaluations: mocks.getProjectEvaluations,
  getEvaluationAssignmentEvidence: mocks.getEvaluationAssignmentEvidence,
  createEvaluationDraft: mocks.createEvaluationDraft,
  saveEvaluationDraft: mocks.saveEvaluationDraft,
  finalizeEvaluation: mocks.finalizeEvaluation,
}))
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
  useOutletContext: () => mocks.context,
}))

const assignment: EvaluationAssignment = {
  id: 1, projectId: 10, evaluatorId: 2, rubricId: 3, projectPeriodId: 4, departmentId: 5,
  evaluationType: 'SUPERVISOR', status: 'ACTIVE', assignedBy: 2, assignedAt: '2026-01-01T00:00:00Z', revokedAt: null, concurrencyToken: 'tok',
  scope: 'COMMON', majorId: null, studentId: null, componentId: null, policyVersionId: null,
}

function draftWith(overrides: Partial<EvaluationDraft> = {}): EvaluationDraft {
  return {
    id: 100, assignmentId: 1, projectId: 10, evaluatorId: 2, rubricId: 3, rubricName: 'Rubric chung', rootRubricId: 3, rubricVersion: 1,
    evaluationType: 'SUPERVISOR', status: 'DRAFT', comments: null, totalScore: null, scoreScale: 100, calculationRule: 'SUM',
    missingCriterionIds: [200], missingRequiredCriterionIds: [200], concurrencyToken: 'draft-tok', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    scores: [{ rubricCriterionId: 200, name: 'Chất lượng', description: null, weightPercent: 100, maxScore: 10, sortOrder: 1, isRequired: true, score: null, comments: null }],
    finalization: null,
    ...overrides,
  }
}

function detailWith(overrides: Partial<EvaluationAssignmentDetail> = {}): EvaluationAssignmentDetail {
  return { assignment, canScore: true, legacyReadOnly: false, denialReason: null, ...overrides }
}

afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.context = null })

function mount() {
  const router = createMemoryRouter([{ path: '/assignment', element: <EvaluatorAssignmentDetailPage /> }], { initialEntries: ['/assignment'] })
  return render(<RouterProvider router={router} />)
}

describe('EvaluatorAssignmentDetailPage', () => {
  it('shows the read-only banner and hides scoring controls when the server denies canScore', async () => {
    mocks.context = { assignment, detail: detailWith({ canScore: false, denialReason: 'LEGACY_SCOPE_UNKNOWN' }) }
    mocks.getProjectEvaluations.mockResolvedValue({ items: [draftWith()], total: 1 })
    mocks.getEvaluationAssignmentEvidence.mockResolvedValue({ assignmentId: 1, projectId: 10, scope: 'COMMON', majorId: null, studentId: null, finalSubmissionId: null, submittedAt: null, itemCount: 0, files: [] })
    mount()
    expect(await screen.findByText('Phân công chỉ đọc')).toBeTruthy()
    expect(screen.getByText(/phạm vi phân công cũ hoặc không xác định/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Yêu cầu chốt đánh giá' })).toBeNull()
  })

  it('creates a draft from the empty state and renders it', async () => {
    mocks.context = { assignment, detail: detailWith() }
    mocks.getProjectEvaluations.mockResolvedValue({ items: [], total: 0 })
    mocks.getEvaluationAssignmentEvidence.mockResolvedValue({ assignmentId: 1, projectId: 10, scope: 'COMMON', majorId: null, studentId: null, finalSubmissionId: null, submittedAt: null, itemCount: 0, files: [] })
    mocks.createEvaluationDraft.mockResolvedValue(draftWith())
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Tạo bản nháp đánh giá' }))
    await waitFor(() => expect(mocks.createEvaluationDraft).toHaveBeenCalledWith(1))
    expect(await screen.findByLabelText('Điểm Chất lượng')).toBeTruthy()
  })

  it('saves a draft and announces success as a status region, not an alert', async () => {
    mocks.context = { assignment, detail: detailWith() }
    mocks.getProjectEvaluations.mockResolvedValue({ items: [draftWith()], total: 1 })
    mocks.getEvaluationAssignmentEvidence.mockResolvedValue({ assignmentId: 1, projectId: 10, scope: 'COMMON', majorId: null, studentId: null, finalSubmissionId: null, submittedAt: null, itemCount: 0, files: [] })
    mocks.saveEvaluationDraft.mockResolvedValue(draftWith({ scores: [{ rubricCriterionId: 200, name: 'Chất lượng', description: null, weightPercent: 100, maxScore: 10, sortOrder: 1, isRequired: true, score: 8, comments: null }], missingCriterionIds: [], missingRequiredCriterionIds: [], totalScore: 8 }))
    mount()
    fireEvent.change(await screen.findByLabelText('Điểm Chất lượng'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await waitFor(() => expect(mocks.saveEvaluationDraft).toHaveBeenCalledWith(100, { concurrencyToken: 'draft-tok', comments: null, scores: [{ rubricCriterionId: 200, score: 8, comments: null }] }))
    expect(await screen.findByRole('status', { name: '' })).toBeTruthy()
    expect(screen.getByText('Đã lưu bản nháp theo dữ liệu máy chủ.')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows a danger alert with a working retry when the draft fails to load', async () => {
    mocks.context = { assignment, detail: detailWith() }
    mocks.getProjectEvaluations.mockRejectedValueOnce(new HttpError('Server error', 500)).mockResolvedValueOnce({ items: [draftWith()], total: 1 })
    mocks.getEvaluationAssignmentEvidence.mockResolvedValue({ assignmentId: 1, projectId: 10, scope: 'COMMON', majorId: null, studentId: null, finalSubmissionId: null, submittedAt: null, itemCount: 0, files: [] })
    mount()
    expect(await screen.findByText('Chưa tải được bản nháp đánh giá.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    await waitFor(() => expect(mocks.getProjectEvaluations).toHaveBeenCalledTimes(2))
    expect(await screen.findByLabelText('Điểm Chất lượng')).toBeTruthy()
  })
})
