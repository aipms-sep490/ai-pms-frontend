import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'

const api = vi.hoisted(() => ({
  getAllMyEvaluationAssignments: vi.fn(),
  getEvaluationAssignmentDetail: vi.fn(),
  getEvaluationAssignmentEvidence: vi.fn(),
  downloadEvaluationEvidenceFile: vi.fn(),
  getProjectEvaluations: vi.fn(),
  getEvaluationSchemes: vi.fn(),
  createEvaluationDraft: vi.fn(),
  saveEvaluationDraft: vi.fn(),
  finalizeEvaluation: vi.fn(),
  getProjectScoringWorkbench: vi.fn(),
  batchFinalizeEvaluations: vi.fn(),
}))

vi.mock('../../../services/api/evaluations.api', async importOriginal => ({
  ...await importOriginal<typeof import('../../../services/api/evaluations.api')>(),
  ...api,
}))
vi.mock('../../auth/context/useAuthSession', () => ({
  useAuthSession: () => ({ session: { user: { roles: ['LECTURER'] } } }),
}))

import { EvaluatorAssignmentRoute } from '../components/EvaluatorAssignmentRoute'
import { EvaluatorAssignmentDetailPage } from './EvaluatorAssignmentDetailPage'

const assignment = {
  id: 41, projectId: 9, evaluatorId: 5, rubricId: 7, projectPeriodId: 3, departmentId: 2,
  evaluationType: 'LECTURER' as const, status: 'ACTIVE' as const, assignedBy: 1,
  assignedAt: '2026-10-02T00:00:00Z', revokedAt: null, concurrencyToken: 'assign-tok',
  scope: 'COMMON' as const, majorId: null, studentId: null, componentId: 11, policyVersionId: 4,
  projectTitle: 'StudySpace IT×MKT', componentName: 'Bảo vệ chung', rubricName: 'Rubric Chung',
}

const draft = {
  id: 51, assignmentId: 41, projectId: 9, evaluatorId: 5, rubricId: 7, rubricName: 'Rubric Chung',
  rootRubricId: 7, rubricVersion: 1, evaluationType: 'LECTURER', status: 'DRAFT', comments: null,
  totalScore: 8.0, scoreScale: 10, calculationRule: 'POL_V4_DECIMAL', missingCriterionIds: [],
  missingRequiredCriterionIds: [], concurrencyToken: 'draft-tok-1',
  createdAt: '2026-10-02T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z', finalization: null,
  scores: [{
    rubricCriterionId: 12, name: 'Tích hợp INT-01', description: 'Kết nối sản phẩm và phễu MKT',
    weightPercent: 100, effectiveWeightPercent: 100, maxScore: 10, sortOrder: 1, isRequired: true,
    score: 8.0, comments: null,
  }],
}

const workbench = {
  projectId: 9, projectTitle: 'StudySpace IT×MKT', projectStatus: 'FINAL_SUBMISSION', failingComponentThreshold: 4.0,
  roster: [{
    studentId: 101, studentCode: 'SE260001', fullName: 'Nguyễn Văn A', majorId: 8, majorCode: 'IT', majorName: 'CNTT',
    isLeader: true, contributionPercent: 55.5, individualProcessScore: 8.75, individualProcessComplete: true,
    assignments: [],
  }],
  projectLevelAssignments: [{
    assignmentId: 41, evaluationId: 51, scope: 'COMMON', stage: 'DEFENSE', componentName: 'Bảo vệ chung',
    status: 'DRAFT', totalScore: 8.0, missingCriteriaCount: 0, evaluationConcurrencyToken: 'draft-tok-1',
  }],
}

const renderPage = () => render(
  <RouterProvider
    router={createMemoryRouter([
      { element: <EvaluatorAssignmentRoute />, children: [{ path: '/evaluator/assignments/:assignmentId', element: <EvaluatorAssignmentDetailPage /> }] },
    ], { initialEntries: ['/evaluator/assignments/41'] })}
  />,
)

beforeEach(() => {
  vi.clearAllMocks()
  api.getAllMyEvaluationAssignments.mockResolvedValue([assignment])
  api.getEvaluationAssignmentDetail.mockResolvedValue({ assignment, canScore: true, legacyReadOnly: false, denialReason: null })
  api.getEvaluationAssignmentEvidence.mockResolvedValue({
    assignmentId: 41, projectId: 9, scope: 'COMMON', majorId: null, studentId: null,
    finalSubmissionId: 15, submittedAt: '2026-10-02T00:00:00Z', itemCount: 1, isReadOnly: true, items: [],
  })
  api.getProjectEvaluations.mockResolvedValue({ items: [draft], page: 1, pageSize: 100, totalCount: 1 })
  api.getProjectScoringWorkbench.mockResolvedValue(workbench)
  api.saveEvaluationDraft.mockResolvedValue({ ...draft, concurrencyToken: 'draft-tok-2', totalScore: 3.5 })
  api.batchFinalizeEvaluations.mockResolvedValue({ projectId: 9, finalizedCount: 1, evaluations: [{ ...draft, status: 'FINALIZED' }] })
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('PR-P0-D Live Scoring Workbench', () => {
  it('syncs 0.25 slider with numeric score input and triggers red failing-floor warning under 4.00', async () => {
    renderPage()
    const slider = await screen.findByLabelText('Thanh kéo điểm Tích hợp INT-01') as HTMLInputElement
    const numberInput = screen.getByLabelText('Điểm Tích hợp INT-01') as HTMLInputElement

    fireEvent.change(slider, { target: { value: '3.5' } })
    expect(numberInput.value).toBe('3.5')
    expect(screen.getByText(/Cảnh báo điểm liệt/i)).toBeTruthy()
  })

  it('displays read-only 20% GVHD process score and contribution percent on the workbench tab', async () => {
    renderPage()
    const processTab = await screen.findByRole('tab', { name: /Điểm GVHD 20%/i })
    fireEvent.click(processTab)
    expect(await screen.findByText(/SE260001 · Nguyễn Văn A/)).toBeTruthy()
    expect(screen.getByText(/8\.75\/10|8,75\/10/)).toBeTruthy()
  })

  it('halts scoring and preserves local edits when save encounters 403 ASSIGNMENT_REVOKED', async () => {
    api.saveEvaluationDraft.mockRejectedValueOnce(new HttpError('Revoked', 403, { code: 'ASSIGNMENT_REVOKED', detail: 'Revoked' }))
    renderPage()
    const input = await screen.findByLabelText('Điểm Tích hợp INT-01') as HTMLInputElement
    fireEvent.change(input, { target: { value: '7.75' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))

    expect(await screen.findByText(/ASSIGNMENT_REVOKED/i)).toBeTruthy()
    expect(input.value).toBe('7.75')
    expect(input.disabled).toBe(true)
  })

  it('opens Impact Diff confirmation and calls batchFinalizeEvaluations for all draft sheets', async () => {
    renderPage()
    const batchBtn = await screen.findByRole('button', { name: /Chốt hàng loạt \(1\)/ })
    fireEvent.click(batchBtn)
    expect(await screen.findByText(/Impact Diff/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Chốt tất cả \(1\)/ }))
    await waitFor(() => expect(api.batchFinalizeEvaluations).toHaveBeenCalledWith(9, [{ evaluationId: 51, concurrencyToken: 'draft-tok-1' }]))
  })
})
