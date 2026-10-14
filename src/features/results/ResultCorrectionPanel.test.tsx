import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ResultCorrectionPanel } from './ResultCorrectionPanel'
import type { ResultComponentScore } from './result-types'

const mocks = vi.hoisted(() => ({
  getAppealPolicy: vi.fn(),
  getAppealWindows: vi.fn(),
  getCorrectionRequests: vi.fn(),
  createCorrectionRequest: vi.fn(),
  uploadCorrectionRequestFile: vi.fn(),
}))
vi.mock('./result-correction-api', async () => {
  const actual = await vi.importActual<typeof import('./result-correction-api')>('./result-correction-api')
  return {
    ...actual,
    getAppealPolicy: mocks.getAppealPolicy, getAppealWindows: mocks.getAppealWindows,
    getCorrectionRequests: mocks.getCorrectionRequests, createCorrectionRequest: mocks.createCorrectionRequest,
    uploadCorrectionRequestFile: mocks.uploadCorrectionRequestFile,
  }
})

const components: ResultComponentScore[] = [
  { componentId: 1, name: 'Chấm điểm COMMON', scope: 'COMMON', weightPercent: 50, score: 8, requiredEvaluators: 2, finalizedEvaluators: 2 },
]
const render_ = () => render(<ResultCorrectionPanel projectId={9} studentId={7} resultVersion={1} components={components} />)
const page = <T,>(items: T[]) => ({ items, page: 1, pageSize: 50, totalCount: items.length })
const policy = { id: 5, projectId: 9, version: 1, approvalReference: 'QĐ 123/2026', recordedBy: 1, recordedAt: '2026-10-01T00:00:00Z' }
const openWindow = {
  id: 2, policyId: 5, status: 'OPEN', opensAt: '2026-10-01T00:00:00Z', closesAt: '2026-12-01T00:00:00Z', concurrencyToken: 'w1',
  targets: [{ targetType: 'STUDENT', studentId: 7, resultVersion: 1 }],
}

afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('ResultCorrectionPanel', () => {
  it('shows a plain message when no appeal policy has been recorded, without offering a form', async () => {
    mocks.getAppealPolicy.mockResolvedValue(null)
    mocks.getAppealWindows.mockResolvedValue(page([]))
    mocks.getCorrectionRequests.mockResolvedValue(page([]))
    render_()
    expect(await screen.findByText('Phúc khảo chưa được kích hoạt cho đồ án này.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Gửi yêu cầu phúc khảo' })).toBeNull()
  })

  it('shows no-open-window state when the policy exists but no window targets this student+version', async () => {
    mocks.getAppealPolicy.mockResolvedValue(policy)
    mocks.getAppealWindows.mockResolvedValue(page([]))
    mocks.getCorrectionRequests.mockResolvedValue(page([]))
    render_()
    expect(await screen.findByText('Hiện không có đợt phúc khảo nào đang mở cho kết quả phiên bản 1 của bạn.')).toBeTruthy()
  })

  it('requires a component and a reason before submitting', async () => {
    mocks.getAppealPolicy.mockResolvedValue(policy)
    mocks.getAppealWindows.mockResolvedValue(page([openWindow]))
    mocks.getCorrectionRequests.mockResolvedValue(page([]))
    render_()
    await screen.findByRole('button', { name: 'Gửi yêu cầu phúc khảo' })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu phúc khảo' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Hãy chọn phần điểm')
    expect(mocks.createCorrectionRequest).not.toHaveBeenCalled()
  })

  it('submits against the matched window/policy with the chosen component and reason', async () => {
    mocks.getAppealPolicy.mockResolvedValue(policy)
    mocks.getAppealWindows.mockResolvedValue(page([openWindow]))
    mocks.getCorrectionRequests.mockResolvedValue(page([]))
    mocks.createCorrectionRequest.mockResolvedValue({})
    render_()
    const select = await screen.findByLabelText('Phần điểm muốn phúc khảo')
    fireEvent.change(select, { target: { value: '1' } })
    fireEvent.change(screen.getByPlaceholderText('Nêu rõ phần điểm bạn muốn xem lại và lý do.'), { target: { value: 'Điểm chưa phản ánh đúng đóng góp.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu phúc khảo' }))
    await waitFor(() => expect(mocks.createCorrectionRequest).toHaveBeenCalledWith(9, {
      policyId: 5, windowId: 2, studentId: 7, resultVersion: 1, componentId: 1, reason: 'Điểm chưa phản ánh đúng đóng góp.',
    }))
  })

  it('blocks a new submission while a request for this version is pending or under review', async () => {
    mocks.getAppealPolicy.mockResolvedValue(policy)
    mocks.getAppealWindows.mockResolvedValue(page([openWindow]))
    mocks.getCorrectionRequests.mockResolvedValue(page([{
      id: 3, projectId: 9, source: 'STUDENT_APPEAL', targetType: 'STUDENT', studentId: 7, resultVersion: 1, componentId: 1,
      scope: 'COMMON', majorId: null, status: 'PENDING', requestedBy: 7, reviewerId: null, reason: 'Lý do.', proposal: null,
      reviewReason: null, decisionReason: null, concurrencyToken: 'r1', allowedActions: ['READ'], blockers: [], files: [],
    }]))
    render_()
    expect(await screen.findByText('Bạn đang có một yêu cầu phúc khảo chờ xử lý cho phiên bản này. Vui lòng chờ kết quả trước khi gửi yêu cầu mới.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Gửi yêu cầu phúc khảo' })).toBeNull()
  })

  it('shows reviewer proposal/decision and only offers upload when the backend allows it', async () => {
    mocks.getAppealPolicy.mockResolvedValue(policy)
    mocks.getAppealWindows.mockResolvedValue(page([openWindow]))
    mocks.getCorrectionRequests.mockResolvedValue(page([{
      id: 4, projectId: 9, source: 'STUDENT_APPEAL', targetType: 'STUDENT', studentId: 7, resultVersion: 1, componentId: 1,
      scope: 'COMMON', majorId: null, status: 'ACCEPTED', requestedBy: 7, reviewerId: 11, reason: 'Lý do.', proposal: 'AMEND',
      reviewReason: 'Điểm thiếu minh chứng.', decisionReason: 'Đồng ý điều chỉnh.', concurrencyToken: 'r2',
      allowedActions: ['READ'], blockers: [], files: [],
    }]))
    render_()
    expect(await screen.findByText('Đề xuất của người thẩm định:')).toBeTruthy()
    expect(screen.getByText(/Điểm thiếu minh chứng/)).toBeTruthy()
    expect(screen.getByText('Quyết định:')).toBeTruthy()
    expect(screen.getByText(/Đồng ý điều chỉnh/)).toBeTruthy()
    expect(screen.queryByText('Đính kèm minh chứng')).toBeNull()
  })
})
