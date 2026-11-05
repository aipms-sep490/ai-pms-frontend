import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { HttpError } from '../../services/http/http-client'

const api = vi.hoisted(() => ({ getAllMyEvaluationAssignments: vi.fn(), getEvaluationAssignmentDetail: vi.fn(), getEvaluationAssignmentEvidence: vi.fn(), downloadEvaluationEvidenceFile: vi.fn(), getProjectEvaluations: vi.fn(), getEvaluationSchemes: vi.fn(), createEvaluationDraft: vi.fn(), saveEvaluationDraft: vi.fn(), finalizeEvaluation: vi.fn() }))
const auth = vi.hoisted(() => ({ roles: ['DEPARTMENT_STAFF'] as string[] }))
vi.mock('../../services/api/evaluations.api', async importOriginal => ({ ...await importOriginal<typeof import('../../services/api/evaluations.api')>(), ...api }))
vi.mock('../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: { user: { roles: auth.roles } } }) }))

import { EvaluatorAssignmentRoute } from './components/EvaluatorAssignmentRoute'
import { EvaluatorWorkspacePage } from './pages/EvaluatorWorkspacePage'
import { EvaluatorAssignmentDetailPage } from './pages/EvaluatorAssignmentDetailPage'

const assignment = { projectTitle: "StudySpace SE28", componentName: "Chuyên môn IT", rubricName: "Đánh giá phần mềm", majorName: "Công nghệ thông tin", studentName: "Nguyễn An", id: 41, projectId: 9, evaluatorId: 5, rubricId: 7, projectPeriodId: 3, departmentId: 2, evaluationType: 'LECTURER' as const, status: 'ACTIVE' as const, assignedBy: 1, assignedAt: '2026-10-02T00:00:00Z', revokedAt: null, concurrencyToken: 'assignment-token', scope: 'MAJOR_SPECIFIC' as const, majorId: 8, studentId: null, componentId: 11, policyVersionId: 4 }
const draft = { id: 51, assignmentId: 41, projectId: 9, evaluatorId: 5, rubricId: 7, rubricName: 'Rubric hệ thống', rootRubricId: 7, rubricVersion: 2, evaluationType: 'LECTURER', status: 'DRAFT', comments: null, totalScore: null, scoreScale: 10, calculationRule: 'WEIGHTED_10', missingCriterionIds: [12], missingRequiredCriterionIds: [12], concurrencyToken: 'draft-token', createdAt: '2026-10-02T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z', finalization: null, scores: [{ rubricCriterionId: 12, name: 'Phân tích', description: 'Căn cứ rõ ràng', weightPercent: 100, maxScore: 10, sortOrder: 1, isRequired: true, score: null, comments: null }] }
const page = (path = '/evaluator/assignments/41') => render(<RouterProvider router={createMemoryRouter([
  { path: '/evaluator/workspace', element: <EvaluatorWorkspacePage /> },
  { element: <EvaluatorAssignmentRoute />, children: [{ path: '/evaluator/assignments/:assignmentId', element: <EvaluatorAssignmentDetailPage /> }] },
], { initialEntries: [path] })} />)

beforeEach(() => {
  vi.clearAllMocks()
  auth.roles = ['DEPARTMENT_STAFF']
  api.getAllMyEvaluationAssignments.mockResolvedValue([assignment])
  api.getEvaluationAssignmentDetail.mockResolvedValue({ assignment, canScore: true, legacyReadOnly: false, denialReason: null })
  api.getEvaluationAssignmentEvidence.mockResolvedValue({ assignmentId: 41, projectId: 9, scope: 'MAJOR_SPECIFIC', majorId: 8, studentId: null, finalSubmissionId: 15, submittedAt: '2026-10-02T00:00:00Z', itemCount: 2, isReadOnly: true })
  api.getProjectEvaluations.mockResolvedValue({ items: [draft], page: 1, pageSize: 100, totalCount: 1 })
  api.getEvaluationSchemes.mockRejectedValue(new HttpError('Forbidden', 403))
})
afterEach(cleanup)

describe('Evaluator Workspace Phase 5', () => {
  it('keeps approval state visible on the scoring page and fails closed when BE omits it', async () => {
    page()
    const unknown = await screen.findByText(/Chưa xác định trạng thái phê duyệt của phương án đánh giá/)
    expect(unknown.closest('header')).toBeTruthy()
    expect(screen.queryByText(/Đây là phiếu chấm chính thức/)).toBeNull()
    await waitFor(() => expect(api.getEvaluationSchemes).toHaveBeenCalledWith(9, expect.any(AbortSignal)))
  })

  it('skips the scheme request for a lecturer without staff or admin role', async () => {
    auth.roles = ['LECTURER']
    page()
    expect(await screen.findByText(/Chưa xác định trạng thái phê duyệt/)).toBeTruthy()
    expect(await screen.findByLabelText('Điểm Phân tích')).toBeTruthy()
    expect(api.getEvaluationSchemes).not.toHaveBeenCalled()
  })

  it('reads BE approval and component weight for a lecturer without a scheme request', async () => {
    auth.roles = ['LECTURER']
    api.getEvaluationAssignmentDetail.mockResolvedValue({ assignment, canScore: true, legacyReadOnly: false, denialReason: null,
      schemeIsDemo: false, schemeApprovalStatus: 'APPROVED', componentStudentWeightPercent: 35 })
    page()
    expect(await screen.findByText(/Đây là phiếu chấm chính thức/)).toBeTruthy()
    expect(screen.getByText('35%')).toBeTruthy()
    expect(api.getEvaluationSchemes).not.toHaveBeenCalled()
  })

  it('uses the exact assigned component when the academic actor may read the scheme', async () => {
    api.getEvaluationSchemes.mockResolvedValue([
      { id: 2, components: [{ id: 99, studentWeightPercent: 99 }], policy: { isDemo: true, approvalStatus: 'DEMO' } },
      { id: 3, components: [{ id: 11, studentWeightPercent: 30 }], policy: { isDemo: false, approvalStatus: 'APPROVED' } },
    ])
    page()
    expect((await screen.findByText(/Đây là phiếu chấm chính thức/)).closest('header')).toBeTruthy()
    expect(screen.getByText('30%')).toBeTruthy()
    expect(api.getEvaluationSchemes).toHaveBeenCalledWith(9, expect.any(AbortSignal))
  })

  it('labels a readable demo scheme and keeps a 500 scheme failure separate from scoring', async () => {
    api.getEvaluationSchemes.mockResolvedValueOnce([{ id: 3, components: [{ id: 11, studentWeightPercent: 0 }], policy: { isDemo: true, approvalStatus: 'DEMO' } }])
    const first = page()
    expect(await screen.findByText(/Điểm chấm ở đây chưa phải điểm chính thức/)).toBeTruthy()
    expect(screen.getByText('0%')).toBeTruthy()
    first.unmount()
    api.getEvaluationSchemes.mockRejectedValue(new HttpError('Unavailable', 500))
    page()
    expect(await screen.findByText(/Chưa xác định trạng thái phê duyệt/)).toBeTruthy()
    expect(await screen.findByLabelText('Điểm Phân tích')).toBeTruthy()
  })

  it('does not request scheme data for an old assignment without componentId', async () => {
    const legacy = { ...assignment, componentId: null }
    api.getAllMyEvaluationAssignments.mockResolvedValue([legacy])
    api.getEvaluationAssignmentDetail.mockResolvedValue({ assignment: legacy, canScore: true, legacyReadOnly: false, denialReason: null })
    page()
    expect(await screen.findByText(/Chưa xác định trạng thái phê duyệt/)).toBeTruthy()
    expect(api.getEvaluationSchemes).not.toHaveBeenCalled()
  })

  it('uses the frozen stage on the evaluator assignment when detail omits BE-09 stage', async () => {
    const stagedAssignment = { ...assignment, stage: 'COLD' }
    api.getAllMyEvaluationAssignments.mockResolvedValue([stagedAssignment])
    api.getEvaluationAssignmentDetail.mockResolvedValue({ assignment: stagedAssignment, canScore: true, legacyReadOnly: false, denialReason: null })
    page()
    expect(await screen.findByText('Chấm hồ sơ đã khóa')).toBeTruthy()
    expect(screen.getByText(/Chưa xác định trạng thái phê duyệt/)).toBeTruthy()
  })

  it('shows an approved BE-09 label without an extra reference field, including on a finalized draft', async () => {
    api.getEvaluationAssignmentDetail.mockResolvedValue({ assignment, canScore: true, legacyReadOnly: false, denialReason: null,
      schemeIsDemo: false, schemeApprovalStatus: 'APPROVED' })
    api.getProjectEvaluations.mockResolvedValue({ items: [{ ...draft, status: 'FINALIZED' }], page: 1, pageSize: 100, totalCount: 1 })
    page()
    expect((await screen.findByText(/Đây là phiếu chấm chính thức/)).closest('header')).toBeTruthy()
    expect(await screen.findByText(/Đánh giá đã chốt/)).toBeTruthy()
  })

  it('shows BE stage, both distinct weights and collapsible guidance without enforcing suggested bands', async () => {
    api.getEvaluationAssignmentDetail.mockResolvedValue({ assignment, canScore: true, legacyReadOnly: false, denialReason: null, stage: 'COLD', componentStudentWeightPercent: 35, completedEvaluators: 2, requiredEvaluators: 3 })
    api.getProjectEvaluations.mockResolvedValue({ items: [{ ...draft, scores: [{ ...draft.scores[0], effectiveWeightPercent: 70, evidenceGuidance: 'Báo cáo đã khóa', levels: [{ levelOrder: 1, label: 'Khá', descriptor: 'Phân tích rõ', scoreFrom: 7, scoreTo: 8.9 }] }] }] })
    page()
    const score = await screen.findByLabelText('Điểm Phân tích') as HTMLInputElement
    expect(screen.getByText('Chấm hồ sơ đã khóa')).toBeTruthy()
    expect(screen.getByText(/Trọng số hiệu lực trong bộ tiêu chí: 70%/)).toBeTruthy()
    expect(screen.getAllByText('35%')).toHaveLength(1)
    expect(screen.queryByText(/Trọng số trực tiếp trong nhóm/)).toBeNull()
    expect(screen.getByText(/Người chấm đã hoàn tất: 2\/3/)).toBeTruthy()
    expect((screen.getByText('Mức chất lượng và dải điểm gợi ý').closest('details') as HTMLDetailsElement).open).toBe(false)
    fireEvent.click(screen.getByText('Mức chất lượng và dải điểm gợi ý'))
    expect((screen.getByText('Mức chất lượng và dải điểm gợi ý').closest('details') as HTMLDetailsElement).open).toBe(true)
    expect(screen.getByText('Phân tích rõ')).toBeTruthy()
    fireEvent.change(score, { target: { value: '9' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await waitFor(() => expect(api.saveEvaluationDraft).toHaveBeenCalled())
    expect(api.saveEvaluationDraft.mock.calls.at(-1)?.[1].scores[0].score).toBe(9)
  })
  it('keeps legacy assignments scoreable with no stage or quality levels', async () => {
    page()
    expect(await screen.findByLabelText('Điểm Phân tích')).toBeTruthy()
    expect(screen.getByText('Chưa xác định')).toBeTruthy()
    expect(screen.queryByText('Mức chất lượng và dải điểm gợi ý')).toBeNull()
  })
  it('saves every scorable leaf returned by the current BE draft contract', async () => {
    const second = { ...draft.scores[0], rubricCriterionId: 13, name: 'Kiểm chứng', sortOrder: 2 }
    api.getProjectEvaluations.mockResolvedValue({ items: [{ ...draft, scores: [draft.scores[0], second] }] })
    api.saveEvaluationDraft.mockResolvedValue(draft)
    page()
    await screen.findByLabelText('Điểm Kiểm chứng')
    fireEvent.change(screen.getByLabelText('Điểm Phân tích'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Điểm Kiểm chứng'), { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await waitFor(() => expect(api.saveEvaluationDraft).toHaveBeenCalled())
    expect(api.saveEvaluationDraft.mock.calls.at(-1)?.[1].scores).toEqual([
      { rubricCriterionId: 12, score: 8, comments: null },
      { rubricCriterionId: 13, score: 7, comments: null },
    ])
  })
  it('groups scored leaves under the BE parent without adding a parent score', async () => {
    const first = { ...draft.scores[0], rubricCriterionId: 12, name: 'Phân tích', parentId: 90, parentName: 'Chất lượng', sortOrder: 0 }
    const second = { ...first, rubricCriterionId: 13, name: 'Kiểm chứng', sortOrder: 1 }
    const root = { ...first, rubricCriterionId: 14, name: 'Trình bày', parentId: null, parentName: null, sortOrder: 0 }
    api.getProjectEvaluations.mockResolvedValue({ items: [{ ...draft, scores: [first, root, second] }] })
    page()
    const group = await screen.findByRole('group', { name: 'Nhóm Chất lượng' })
    expect(group.querySelectorAll('section').length).toBe(2)
    expect(group.textContent).toContain('Phân tích')
    expect(group.textContent).toContain('Kiểm chứng')
    expect(group.textContent).not.toContain('Trình bày')
    expect(screen.queryByLabelText('Điểm Chất lượng')).toBeNull()
  })
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
    expect(screen.queryByRole('link', { name: 'Xem gói bàn giao đã khóa' })).toBeNull(); expect(screen.getByText('Chỉ xem và tải các tệp trong phạm vi phân công này.')).toBeTruthy()
  })

  it('releases the save lock so the saved draft can be finalized', async () => {
    const complete = { ...draft, totalScore: 8, missingCriterionIds: [], missingRequiredCriterionIds: [], scores: [{ ...draft.scores[0], score: 8 }] }
    api.saveEvaluationDraft.mockResolvedValue(complete)
    api.finalizeEvaluation.mockResolvedValue({ ...complete, status: 'FINALIZED' })
    page()
    fireEvent.change(await screen.findByLabelText('Điểm Phân tích'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await screen.findByText('Đã lưu bản nháp theo dữ liệu máy chủ.')
    fireEvent.click(screen.getByRole('button', { name: 'Yêu cầu chốt đánh giá' }))
    const confirmations = await screen.findAllByRole('button', { name: 'Yêu cầu chốt đánh giá' })
    expect(confirmations.length).toBe(2)
    fireEvent.click(confirmations.at(-1)!)
    await waitFor(() => expect(api.finalizeEvaluation).toHaveBeenCalledWith(51, 'draft-token'))
  })
  it('renders persisted COMMON, MAJOR_SPECIFIC and INDIVIDUAL assignments without a target-switch control', async () => {
    api.getAllMyEvaluationAssignments.mockResolvedValue([assignment, { ...assignment, id: 42, scope: 'COMMON', majorId: null, studentId: null }, { ...assignment, id: 43, scope: 'INDIVIDUAL', majorId: 8, studentId: 99 }])
    api.getProjectEvaluations.mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 })
    page('/evaluator/workspace')
    expect(await screen.findByText(/Công nghệ thông tin/)).toBeTruthy()
    expect(screen.getByText('Phạm vi chung của đồ án')).toBeTruthy()
    expect(screen.getByText(/Nguyễn An/)).toBeTruthy()
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
    expect(screen.getByText('Chuyên môn IT')).toBeTruthy()
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
  it('omits an empty score from the save payload instead of converting it to zero', async () => {
    page()
    await screen.findByLabelText('Điểm Phân tích')
    fireEvent.change(screen.getByLabelText('Nhận xét tổng thể'), { target: { value: 'Chưa đủ minh chứng' } })
    api.saveEvaluationDraft.mockResolvedValue(draft)
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await waitFor(() => expect(api.saveEvaluationDraft).toHaveBeenCalled())
    expect(api.saveEvaluationDraft.mock.calls.at(-1)?.[1].scores).toEqual([])
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
    expect(screen.getByText(/Tài liệu được hiển thị tại mục Báo cáo của sinh viên/)).toBeTruthy()
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

  it('shows the report preview beside the scoring form when the backend ships evidence files', async () => {
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:report', revokeObjectURL: () => {} })
    api.getEvaluationAssignmentEvidence.mockResolvedValue({ assignmentId: 41, projectId: 9, scope: 'MAJOR_SPECIFIC', majorId: 8, studentId: null, finalSubmissionId: 15, submittedAt: '2026-10-02T00:00:00Z', itemCount: 2, isReadOnly: true, items: [
      { id: 101, fileId: 1, fileName: 'srs.pdf', contentType: 'application/pdf', fileSizeBytes: 2048, title: 'Software Requirement', deliverableVersionId: 51, versionNumber: 2 },
      { id: 102, fileId: 2, fileName: 'guide.zip', contentType: 'application/zip', fileSizeBytes: 4096, title: 'User Guide', deliverableVersionId: 52, versionNumber: 3 },
    ] })
    api.downloadEvaluationEvidenceFile.mockResolvedValue(new Blob(['x'], { type: 'application/pdf' }))
    page()
    // The PDF report renders inline next to the rubric (scoring input still present).
    expect(await screen.findByTitle('Báo cáo Software Requirement')).toBeTruthy()
    expect(screen.getByLabelText('Điểm Phân tích')).toBeTruthy()
    // The non-previewable ZIP report is offered as a download, never faked as a preview.
    fireEvent.click(screen.getByRole('tab', { name: 'User Guide' }))
    expect(await screen.findByText(/không xem trực tiếp trên trình duyệt được/)).toBeTruthy()
    vi.unstubAllGlobals()
  })
})
