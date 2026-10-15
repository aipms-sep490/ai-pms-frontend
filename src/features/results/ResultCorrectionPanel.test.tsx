import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StudentAppealPanel } from './ResultCorrectionPanel'
import { HttpError } from '../../services/http/http-client'
const mocks = vi.hoisted(() => ({ getResultCorrectionRequests: vi.fn(), getAppealWindows: vi.fn(), submitResultCorrectionRequest: vi.fn(), getStudentResult: vi.fn() }))
vi.mock('./result-correction-api', () => mocks)
vi.mock('../../services/api/project-results.api', () => ({ getStudentResult: mocks.getStudentResult }))
vi.mock('./AppealRequestDetail', () => ({ AppealRequestDetail: ({ requestId }: { requestId: number }) => <p>Chi tiết yêu cầu {requestId}</p> }))
vi.mock('./ResultHistoryPanel', () => ({ ResultHistoryPanel: () => <p>Lịch sử kết quả</p> }))
const published = { projectId: 9, studentId: 88, version: 2, breakdown: { components: [{ componentId: 6, name: 'Chấm ngành', scope: 'MAJOR_SPECIFIC', stage: 'COLD', weightPercent: 50 }] } }
const window = { id: 5, policyId: 4, status: 'OPEN', closesAt: '2026-12-01T00:00:00Z', targets: [{ targetType: 'STUDENT', studentId: 88, resultVersion: 2 }] }
const page = { items: [], totalCount: 0, page: 1, pageSize: 20 }
beforeEach(() => { vi.clearAllMocks(); mocks.getResultCorrectionRequests.mockResolvedValue(page); mocks.getAppealWindows.mockResolvedValue({ ...page, items: [window], totalCount: 1 }); mocks.getStudentResult.mockResolvedValue(published) })
afterEach(cleanup)
const renderPanel = () => render(<StudentAppealPanel projectId={9} studentId={88} />)
async function fill() { await screen.findByText('Chưa có yêu cầu phúc khảo.'); fireEvent.change(screen.getByLabelText('Đợt phúc khảo'), { target: { value: '5' } }); fireEvent.change(screen.getByLabelText('Thành phần kết quả'), { target: { value: '6' } }); fireEvent.change(screen.getByLabelText('Lý do phúc khảo'), { target: { value: 'Đối chiếu minh chứng đã khóa.' } }) }
it('submits an explicit own-student component/version/window, never a reason-only request', async () => {
  mocks.submitResultCorrectionRequest.mockResolvedValue({ id: 7 }); renderPanel(); await fill(); fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu phúc khảo' }));
  await waitFor(() => expect(mocks.submitResultCorrectionRequest).toHaveBeenCalledWith(9, { source: 'STUDENT_APPEAL', policyId: 4, windowId: 5, targetType: 'STUDENT', studentId: 88, resultVersion: 2, componentId: 6, reason: 'Đối chiếu minh chứng đã khóa.' }))
  expect(await screen.findByText('Chi tiết yêu cầu 7')).toBeTruthy()
})
it('does not offer another student or stale result version from a window', async () => {
  mocks.getAppealWindows.mockResolvedValue({ ...page, items: [{ ...window, targets: [{ targetType: 'STUDENT', studentId: 99, resultVersion: 2 }, { targetType: 'STUDENT', studentId: 88, resultVersion: 1 }] }], totalCount: 1 }); renderPanel();
  expect(await screen.findByText('Chưa có đợt phúc khảo đang mở cho phiên bản kết quả của bạn.')).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Gửi yêu cầu phúc khảo' }) as HTMLButtonElement).disabled).toBe(true)
})
it('retains the reason after 409, refreshes, and requires explicit acknowledgement without replay', async () => {
  mocks.submitResultCorrectionRequest.mockRejectedValue(new HttpError('stale', 409)); renderPanel(); await fill(); fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu phúc khảo' }));
  const acknowledge = await screen.findByRole('button', { name: 'Tôi đã đối chiếu dữ liệu mới' }); await waitFor(() => expect((acknowledge as HTMLButtonElement).disabled).toBe(false))
  expect((screen.getByLabelText('Lý do phúc khảo') as HTMLTextAreaElement).value).toBe('Đối chiếu minh chứng đã khóa.')
  expect(mocks.submitResultCorrectionRequest).toHaveBeenCalledTimes(1)
  expect((screen.getByRole('button', { name: 'Gửi yêu cầu phúc khảo' }) as HTMLButtonElement).closest('fieldset')?.disabled).toBe(true)
})
it('treats unavailable appeal routes as unavailable, not an empty writable feature', async () => {
  mocks.getResultCorrectionRequests.mockRejectedValue(new HttpError('disabled', 404)); renderPanel(); expect(await screen.findByRole('alert')).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Gửi yêu cầu phúc khảo' })).toBeNull()
})
it('uses server counts to request the next page', async () => {
  mocks.getResultCorrectionRequests.mockResolvedValue({ ...page, totalCount: 21 }); renderPanel(); await screen.findByText('Chưa có yêu cầu phúc khảo.'); fireEvent.click(screen.getByRole('button', { name: 'Trang sau' })); await waitFor(() => expect(mocks.getResultCorrectionRequests).toHaveBeenCalledWith(9, 2, expect.any(AbortSignal)))
})
