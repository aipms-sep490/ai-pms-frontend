import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AppealManagementPanel } from './AppealManagementPanel'
import { HttpError } from '../../services/http/http-client'
const api = vi.hoisted(() => ({ getAppealPolicy: vi.fn(), getAppealWindows: vi.fn(), recordAppealPolicy: vi.fn(), openAppealWindow: vi.fn(), submitResultCorrectionRequest: vi.fn(), getEvaluationSchemes: vi.fn(), getProjectResult: vi.fn(), getStudentResult: vi.fn() }))
vi.mock('./result-correction-api', () => api)
vi.mock('../../services/api/evaluations.api', () => ({ getEvaluationSchemes: api.getEvaluationSchemes }))
vi.mock('../../services/api/project-results.api', () => ({ getProjectResult: api.getProjectResult, getStudentResult: api.getStudentResult }))
beforeEach(() => {
  vi.clearAllMocks(); api.getAppealPolicy.mockResolvedValue({ id: 4, version: 3, approvalReference: 'Actual approval supplied by staff' }); api.getAppealWindows.mockResolvedValue({ items: [], totalCount: 0 })
  api.getEvaluationSchemes.mockResolvedValue([{ status: 'PUBLISHED', students: [{ studentId: 88 }] }])
  api.getStudentResult.mockResolvedValue({ projectId: 9, studentId: 88, version: 2, totalScore: 8, outcome: 'PASS', breakdown: { components: [{ componentId: 6, name: 'Chấm ngành', scope: 'MAJOR_SPECIFIC', stage: 'COLD', weightPercent: 50 }] } })
})
afterEach(cleanup)
it('creates staff correction against a selected published target with no student window', async () => {
  api.submitResultCorrectionRequest.mockResolvedValue({ id: 7 }); const onCreated = vi.fn()
  render(<AppealManagementPanel projectId={9} onCreated={onCreated} />)
  const target = await screen.findByLabelText('Đối tượng'); fireEvent.change(target, { target: { value: '88' } }); fireEvent.click(screen.getByRole('button', { name: 'Đọc phiên bản kết quả hiện tại' }))
  await screen.findByText('v2 · 8 · PASS'); fireEvent.change(screen.getByLabelText('Thành phần đính chính'), { target: { value: '6' } }); fireEvent.change(screen.getByLabelText('Lý do đính chính'), { target: { value: 'Đối chiếu bản nộp đã khóa' } }); fireEvent.click(screen.getByRole('button', { name: 'Tạo yêu cầu đính chính' }))
  await waitFor(() => expect(api.submitResultCorrectionRequest).toHaveBeenCalledWith(9, { source: 'STAFF_CORRECTION', policyId: 4, windowId: null, targetType: 'STUDENT', studentId: 88, resultVersion: 2, componentId: 6, reason: 'Đối chiếu bản nộp đã khóa' }))
  expect(onCreated).toHaveBeenCalledWith(7)
})
it('keeps the approval draft on policy conflict and requires a fresh explicit acknowledgement', async () => {
  api.recordAppealPolicy.mockRejectedValue(new HttpError('changed', 409))
  render(<AppealManagementPanel projectId={9} onCreated={() => {}} />)
  const reference = await screen.findByLabelText('Nguồn phê duyệt học thuật có thật'); fireEvent.change(reference, { target: { value: 'Approval reference under review' } }); fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận phiên bản chính sách' }))
  const ack = await screen.findByRole('button', { name: 'Tôi đã đối chiếu cấu hình mới' }); await waitFor(() => expect((ack as HTMLButtonElement).disabled).toBe(false))
  expect(api.recordAppealPolicy).toHaveBeenCalledExactlyOnceWith(9, 3, 'Approval reference under review')
  expect((screen.getByLabelText('Nguồn phê duyệt học thuật có thật') as HTMLInputElement).value).toBe('Approval reference under review')
  expect((screen.getByRole('button', { name: 'Ghi nhận phiên bản chính sách' }) as HTMLButtonElement).disabled).toBe(true)
})
