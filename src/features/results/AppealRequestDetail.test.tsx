import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AppealRequestDetail } from './AppealRequestDetail'
import { HttpError } from '../../services/http/http-client'
const api = vi.hoisted(() => ({ getCorrectionRequest: vi.fn(), getAppealHistory: vi.fn(), assignAppealReviewer: vi.fn(), getAppealReviewContext: vi.fn(), getAppealEvidence: vi.fn(), previewAppeal: vi.fn(), decideAppeal: vi.fn(), reviewAppeal: vi.fn() }))
vi.mock('./result-correction-api', () => api)
const row = { id: 7, projectId: 9, source: 'STUDENT_APPEAL', targetType: 'STUDENT', studentId: 88, resultVersion: 2, componentId: 6, scope: 'MAJOR_SPECIFIC', majorId: 3, status: 'PENDING', requestedBy: 88, reviewerId: null, reason: 'Yêu cầu xem lại', proposal: null, reviewReason: null, decisionReason: null, concurrencyToken: 'old', allowedActions: ['READ'], blockers: [], files: [] }
beforeEach(() => { vi.clearAllMocks(); api.getCorrectionRequest.mockResolvedValue(row); api.getAppealHistory.mockResolvedValue({ items: [], totalCount: 0 }); api.getAppealEvidence.mockResolvedValue([]) })
afterEach(cleanup)
const open = () => render(<AppealRequestDetail projectId={9} requestId={7} />)
it('renders mutations only when granted by server allowedActions', async () => {
  open(); await screen.findByText('Yêu cầu xem lại')
  expect(screen.queryByRole('button', { name: 'Giao reviewer' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Chấp nhận và công bố revision' })).toBeNull()
})
it('reloads a stale reviewer token, preserves the draft, and never replays the write', async () => {
  api.getCorrectionRequest.mockResolvedValue({ ...row, allowedActions: ['READ', 'ASSIGN_REVIEWER'] })
  api.assignAppealReviewer.mockImplementation(async () => { api.getCorrectionRequest.mockResolvedValue({ ...row, concurrencyToken: 'fresh', allowedActions: ['READ', 'ASSIGN_REVIEWER'] }); throw new HttpError('stale', 409) })
  open(); fireEvent.change(await screen.findByLabelText('ID reviewer'), { target: { value: '42' } }); fireEvent.click(screen.getByRole('button', { name: 'Giao reviewer' }))
  const ack = await screen.findByRole('button', { name: 'Tôi đã đối chiếu dữ liệu mới' }); await waitFor(() => expect((ack as HTMLButtonElement).disabled).toBe(false))
  expect((screen.getByLabelText('ID reviewer') as HTMLInputElement).value).toBe('42')
  expect(api.assignAppealReviewer).toHaveBeenCalledTimes(1)
  expect((screen.getByRole('button', { name: 'Giao reviewer' }) as HTMLButtonElement).disabled).toBe(true)
  api.assignAppealReviewer.mockResolvedValue({ ...row, concurrencyToken: 'new' }); fireEvent.click(ack); fireEvent.click(screen.getByRole('button', { name: 'Giao reviewer' }))
  await waitFor(() => expect(api.assignAppealReviewer).toHaveBeenLastCalledWith(9, 7, 'fresh', 42))
})
it('requires a new preview after reason changes and does not replay a stale decision', async () => {
  api.getCorrectionRequest.mockResolvedValue({ ...row, status: 'UNDER_REVIEW', allowedActions: ['READ', 'PREVIEW', 'ACCEPT', 'REJECT'] })
  api.previewAppeal.mockResolvedValue({ confirmationToken: 'preview', affectedResults: [{ studentId: 88, supersedesVersion: 2, version: 3, totalScore: 8 }] })
  api.decideAppeal.mockRejectedValue(new HttpError('stale', 409))
  open(); const reason = await screen.findByLabelText('Lý do review / quyết định')
  fireEvent.change(reason, { target: { value: 'Đã kiểm tra' } }); fireEvent.click(screen.getByRole('button', { name: 'Xem trước kết quả ảnh hưởng' })); await screen.findByText('Kết quả ảnh hưởng theo máy chủ')
  fireEvent.change(reason, { target: { value: 'Đã kiểm tra lại' } }); expect((screen.getByRole('button', { name: 'Chấp nhận và công bố revision' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Xem trước kết quả ảnh hưởng' })); await screen.findByText('Kết quả ảnh hưởng theo máy chủ'); fireEvent.click(screen.getByRole('button', { name: 'Chấp nhận và công bố revision' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận quyết định' }))
  await waitFor(() => expect(api.decideAppeal).toHaveBeenCalledTimes(1))
  expect(api.decideAppeal).toHaveBeenCalledWith(9, 7, { concurrencyToken: 'old', confirmationToken: 'preview', decision: 'ACCEPTED', reason: 'Đã kiểm tra lại' })
  await screen.findByRole('button', { name: 'Tôi đã đối chiếu dữ liệu mới' })
  expect(screen.queryByText('Kết quả ảnh hưởng theo máy chủ')).toBeNull()
  expect((screen.getByLabelText('Lý do review / quyết định') as HTMLTextAreaElement).value).toBe('Đã kiểm tra lại')
})
it('submits criterion amendments from the frozen review context, including zero', async () => {
  api.getCorrectionRequest.mockResolvedValue({ ...row, allowedActions: ['READ', 'REVIEW'] })
  api.getAppealReviewContext.mockResolvedValue({ calculationVersion: 'frozen-v1', evaluations: [{ id: 31, rubricName: 'Rubric IT', rubricVersion: 2, scores: [{ rubricCriterionId: 12, name: 'Kiểm chứng', score: 8, maxScore: 10 }] }], amendments: [] })
  api.reviewAppeal.mockResolvedValue(row)
  open(); fireEvent.click(await screen.findByRole('button', { name: 'Đọc hồ sơ review đã khóa' })); const input = await screen.findByLabelText('Điểm đính chính Kiểm chứng')
  fireEvent.change(input, { target: { value: '0' } }); fireEvent.change(screen.getByLabelText('Lý do tiêu chí Kiểm chứng'), { target: { value: 'Không có minh chứng' } }); fireEvent.change(screen.getByLabelText('Lý do review / quyết định'), { target: { value: 'Đã đọc hồ sơ' } }); fireEvent.change(screen.getByLabelText('Đề nghị'), { target: { value: 'AMEND' } }); fireEvent.click(screen.getByRole('button', { name: 'Lưu đề nghị review' }))
  await waitFor(() => expect(api.reviewAppeal).toHaveBeenCalledWith(9, 7, { concurrencyToken: 'old', proposal: 'AMEND', reason: 'Đã đọc hồ sơ', amendments: [{ evaluationId: 31, criterionId: 12, score: 0, reason: 'Không có minh chứng' }] }))
})
