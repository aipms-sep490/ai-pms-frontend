import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { HttpError } from '../../services/http/http-client'

const api = vi.hoisted(() => ({ getAllMyEvaluationAssignments: vi.fn(), getEvaluationAssignmentDetail: vi.fn(), getEvaluationAssignmentEvidence: vi.fn(), getProjectEvaluations: vi.fn(), createEvaluationDraft: vi.fn(), saveEvaluationDraft: vi.fn(), finalizeEvaluation: vi.fn() }))
vi.mock('../../services/api/evaluations.api', () => api)

import { EvaluatorAssignmentRoute } from './components/EvaluatorAssignmentRoute'
import { EvaluatorWorkspacePage } from './pages/EvaluatorWorkspacePage'
import { EvaluatorAssignmentDetailPage } from './pages/EvaluatorAssignmentDetailPage'

const assignment = { id: 41, projectId: 9, evaluatorId: 5, rubricId: 7, projectPeriodId: 3, departmentId: 2, evaluationType: 'LECTURER' as const, status: 'ACTIVE' as const, assignedBy: 1, assignedAt: '2026-10-02T00:00:00Z', revokedAt: null, concurrencyToken: 'assignment-token', scope: 'MAJOR_SPECIFIC' as const, majorId: 8, studentId: null, componentId: 11, policyVersionId: 4 }
const draft = { id: 51, assignmentId: 41, projectId: 9, evaluatorId: 5, rubricId: 7, rubricName: 'Rubric hệ thống', rootRubricId: 7, rubricVersion: 2, evaluationType: 'LECTURER', status: 'DRAFT', comments: null, totalScore: null, scoreScale: 10, calculationRule: 'WEIGHTED_10', missingCriterionIds: [12], missingRequiredCriterionIds: [12], concurrencyToken: 'draft-token', createdAt: '2026-10-02T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z', finalization: null, scores: [{ rubricCriterionId: 12, name: 'Phân tích', description: 'Căn cứ rõ ràng', weightPercent: 100, maxScore: 10, sortOrder: 1, isRequired: true, score: null, comments: null }] }
const page = (path = '/evaluator/assignments/41') => render(<RouterProvider router={createMemoryRouter([
  { path: '/evaluator/workspace', element: <EvaluatorWorkspacePage /> },
  { element: <EvaluatorAssignmentRoute />, children: [{ path: '/evaluator/assignments/:assignmentId', element: <EvaluatorAssignmentDetailPage /> }] },
], { initialEntries: [path] })} />)

beforeEach(() => {
  vi.clearAllMocks()
  api.getAllMyEvaluationAssignments.mockResolvedValue([assignment])
  api.getEvaluationAssignmentDetail.mockResolvedValue({ assignment, canScore: true, legacyReadOnly: false, denialReason: null })
  api.getEvaluationAssignmentEvidence.mockResolvedValue({ assignmentId: 41, projectId: 9, scope: 'MAJOR_SPECIFIC', majorId: 8, studentId: null, finalSubmissionId: 15, submittedAt: '2026-10-02T00:00:00Z', itemCount: 2, isReadOnly: true })
  api.getProjectEvaluations.mockResolvedValue({ items: [draft], page: 1, pageSize: 100, totalCount: 1 })
})
afterEach(cleanup)

describe('Evaluator Workspace Phase 5', () => {
  it('does not classify an unavailable draft as a new or pending evaluation', async () => {
    api.getProjectEvaluations.mockRejectedValue(new Error('offline'))
    page('/evaluator/workspace')
    expect(await screen.findByRole('link', { name: 'Xem phân công' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Bắt đầu chấm' })).toBeNull()
    fireEvent.change(screen.getByLabelText('Trạng thái đánh giá'), { target: { value: 'pending' } })
    expect(screen.queryByRole('link', { name: 'Xem phân công' })).toBeNull()
    fireEvent.change(screen.getByLabelText('Trạng thái đánh giá'), { target: { value: 'unavailable' } })
    expect(screen.getByRole('link', { name: 'Xem phân công' })).toBeTruthy()
  })
  it('filters completed assignments and makes the next scoring action explicit', async () => {
    page('/evaluator/workspace')
    expect(await screen.findByRole('link', { name: 'Tiếp tục chấm' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Trạng thái đánh giá'), { target: { value: 'finalized' } })
    expect(screen.queryByRole('link', { name: 'Tiếp tục chấm' })).toBeNull()
    expect(screen.getByText(/Không có phân công phù hợp/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Trạng thái đánh giá'), { target: { value: 'all' } })
    expect(screen.getByRole('link', { name: 'Tiếp tục chấm' })).toBeTruthy()
  })
  it('requires saving changed scores before finalization and protects the return link', async () => {
    const complete = { ...draft, totalScore: 8, missingCriterionIds: [], missingRequiredCriterionIds: [], scores: [{ ...draft.scores[0], score: 8 }] }
    api.getProjectEvaluations.mockResolvedValue({ items: [complete] })
    page()
    fireEvent.change(await screen.findByLabelText('Điểm Phân tích'), { target: { value: '9' } })
    expect((screen.getByRole('button', { name: 'Yêu cầu chốt đánh giá' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('link', { name: 'Quay lại' }))
    expect(await screen.findByRole('button', { name: 'Ở lại' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ở lại' }))
    expect((screen.getByLabelText('Điểm Phân tích') as HTMLInputElement).value).toBe('9')
    api.saveEvaluationDraft.mockResolvedValue({ ...complete, totalScore: 9, scores: [{ ...draft.scores[0], score: 9 }] })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await waitFor(() => expect((screen.getByRole('button', { name: 'Yêu cầu chốt đánh giá' }) as HTMLButtonElement).disabled).toBe(false))
    expect(api.finalizeEvaluation).not.toHaveBeenCalled()
  })
  it('blocks finalization with incomplete criteria and links the locked package in the current project', async () => {
    page()
    await screen.findByLabelText('Điểm Phân tích')
    expect((screen.getByRole('button', { name: 'Yêu cầu chốt đánh giá' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('link', { name: 'Xem gói bàn giao đã khóa' }).getAttribute('href')).toBe('/evaluator/projects/9/final-submission')
  })
  it('renders persisted COMMON, MAJOR_SPECIFIC and INDIVIDUAL assignments without a target-switch control', async () => {
    api.getAllMyEvaluationAssignments.mockResolvedValue([assignment, { ...assignment, id: 42, scope: 'COMMON', majorId: null, studentId: null }, { ...assignment, id: 43, scope: 'INDIVIDUAL', majorId: 8, studentId: 99 }])
    api.getProjectEvaluations.mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 })
    page('/evaluator/workspace')
    expect(await screen.findByText(/Ngành được phân công #8/)).toBeTruthy()
    expect(screen.getByText('Phạm vi chung của đồ án')).toBeTruthy()
    expect(screen.getByText(/Sinh viên được phân công #99/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /đổi ngành|đổi sinh viên/i })).toBeNull()
  })

  it('keeps lecturer-only, supervisor-only, and mentor-only users out when no evaluator assignment is persisted', async () => {
    api.getAllMyEvaluationAssignments.mockResolvedValue([])
    page('/evaluator/workspace')
    expect(await screen.findByText('Chưa có phân công đánh giá đang hiệu lực')).toBeTruthy()
    expect(screen.getByText(/khi được phân công chấm/)).toBeTruthy()
  })

  it('fails closed for a foreign or revoked assignment id', async () => {
    api.getEvaluationAssignmentDetail.mockRejectedValue(new HttpError('denied', 404))
    page()
    expect(await screen.findByText(/không còn hiệu lực hoặc không thuộc phạm vi/)).toBeTruthy()
    expect(screen.queryByText('Chấm điểm theo phạm vi được phân công')).toBeNull()
  })

  it('treats a backend 403 as a denied direct route, not lecturer evaluator authority', async () => {
    api.getEvaluationAssignmentDetail.mockRejectedValue(new HttpError('denied', 403))
    page()
    expect(await screen.findByText(/Đường dẫn không cấp quyền đánh giá/)).toBeTruthy()
  })

  it('isolates a draft/rubric read failure after the assignment guard has succeeded', async () => {
    api.getProjectEvaluations.mockRejectedValue(new Error('offline'))
    page()
    expect(await screen.findByText(/Chưa tải được bản nháp đánh giá/)).toBeTruthy()
    expect(screen.getByText('Phân công #41')).toBeTruthy()
  })

  it('creates a draft only for the guarded assignment and uses leaf criteria for saving', async () => {
    api.getProjectEvaluations.mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 })
    api.createEvaluationDraft.mockResolvedValue(draft)
    page()
    fireEvent.click(await screen.findByRole('button', { name: 'Tạo bản nháp đánh giá' }))
    await screen.findByLabelText('Điểm Phân tích')
    fireEvent.change(screen.getByLabelText('Điểm Phân tích'), { target: { value: '8.5' } })
    api.saveEvaluationDraft.mockResolvedValue({ ...draft, totalScore: 8.5, missingCriterionIds: [], missingRequiredCriterionIds: [] })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await waitFor(() => expect(api.saveEvaluationDraft).toHaveBeenCalledWith(51, { concurrencyToken: 'draft-token', comments: null, scores: [{ rubricCriterionId: 12, score: 8.5, comments: null }] }))
  })

  it('keeps typed draft values when a stale save reloads authoritative data', async () => {
    api.saveEvaluationDraft.mockRejectedValue(new HttpError('stale', 409))
    page()
    const score = await screen.findByLabelText('Điểm Phân tích') as HTMLInputElement
    fireEvent.change(score, { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await screen.findByText(/đã thay đổi/)
    expect((screen.getByLabelText('Điểm Phân tích') as HTMLInputElement).value).toBe('7')
    expect(api.getProjectEvaluations.mock.calls.length).toBeGreaterThan(1)
  })

  it('uses the application confirmation before requesting backend finalization', async () => {
    api.getProjectEvaluations.mockResolvedValue({ items: [{ ...draft, totalScore: 8, missingCriterionIds: [], missingRequiredCriterionIds: [], scores: [{ ...draft.scores[0], score: 8 }] }] })
    api.finalizeEvaluation.mockResolvedValue({ ...draft, status: 'FINALIZED', totalScore: 8, missingCriterionIds: [], missingRequiredCriterionIds: [], finalization: { finalizedBy: 5, finalizedAt: '2026-10-02T01:00:00Z', evidence: { finalSubmissionId: 1, artifactCount: 1, fileCount: 1 } } })
    page()
    fireEvent.click(await screen.findByRole('button', { name: 'Yêu cầu chốt đánh giá' }))
    const confirmations = await screen.findAllByRole('button', { name: 'Yêu cầu chốt đánh giá' })
    fireEvent.click(confirmations.at(-1)!)
    await waitFor(() => expect(api.finalizeEvaluation).toHaveBeenCalledWith(51, 'draft-token'))
    expect(await screen.findByText(/Đánh giá đã chốt/)).toBeTruthy()
  })

  it('renders finalized evaluations read-only and renders only server-scoped evidence metadata', async () => {
    api.getProjectEvaluations.mockResolvedValue({ items: [{ ...draft, status: 'FINALIZED', totalScore: 9, missingCriterionIds: [], missingRequiredCriterionIds: [], finalization: { finalizedBy: 5, finalizedAt: '2026-10-02T01:00:00Z', evidence: { finalSubmissionId: 1, artifactCount: 1, fileCount: 1 } } }], page: 1, pageSize: 100, totalCount: 1 })
    page()
    const score = await screen.findByLabelText('Điểm Phân tích') as HTMLInputElement
    expect(score.disabled).toBe(true)
    expect(screen.queryByRole('button', { name: 'Yêu cầu chốt đánh giá' })).toBeNull()
    expect(screen.getByText(/Số hạng mục bàn giao: 2/)).toBeTruthy()
    expect(screen.getByText(/Thông tin bàn giao dưới đây chỉ để đối chiếu/)).toBeTruthy()
    expect(screen.getByText(/Kết quả chính thức được bộ môn công bố sau khi hoàn tất đánh giá/)).toBeTruthy()
  })

  it('uses the direct assignment contract and hides scoring mutations when Backend marks it read-only', async () => {
    api.getEvaluationAssignmentDetail.mockResolvedValue({ assignment, canScore: false, legacyReadOnly: true, denialReason: 'LEGACY_SCOPE_UNKNOWN' })
    page()
    expect(await screen.findByText(/phạm vi phân công cũ hoặc không xác định/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Lưu bản nháp' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Yêu cầu chốt đánh giá' })).toBeNull()
    expect(api.getEvaluationAssignmentDetail).toHaveBeenCalledWith(41, expect.any(AbortSignal))
  })
})
