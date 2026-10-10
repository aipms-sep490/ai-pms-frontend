import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ResultCorrectionPanel } from './ResultCorrectionPanel'
import { HttpError } from '../../services/http/http-client'

const mocks = vi.hoisted(() => ({ getResultCorrectionRequests: vi.fn(), submitResultCorrectionRequest: vi.fn() }))
vi.mock('./result-correction-api', () => ({
  getResultCorrectionRequests: mocks.getResultCorrectionRequests,
  submitResultCorrectionRequest: mocks.submitResultCorrectionRequest,
}))

afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('ResultCorrectionPanel', () => {
  it('submits a request when none is open and refetches', async () => {
    mocks.getResultCorrectionRequests
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 1, reason: 'Điểm chung chưa đúng trọng số.', status: 'PENDING', createdAt: '2026-10-09T03:00:00Z' }])
    mocks.submitResultCorrectionRequest.mockResolvedValue({})
    render(<ResultCorrectionPanel projectId={9} />)
    const textarea = await screen.findByPlaceholderText(/Nêu rõ phần điểm/)
    fireEvent.change(textarea, { target: { value: 'Điểm chung chưa đúng trọng số.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu phúc khảo' }))
    await waitFor(() => expect(mocks.submitResultCorrectionRequest).toHaveBeenCalledWith(9, 'Điểm chung chưa đúng trọng số.'))
    expect(await screen.findByText('Chờ xử lý')).toBeTruthy()
  })

  it('blocks a too-short reason', async () => {
    mocks.getResultCorrectionRequests.mockResolvedValue([])
    render(<ResultCorrectionPanel projectId={9} />)
    const textarea = await screen.findByPlaceholderText(/Nêu rõ phần điểm/)
    fireEvent.change(textarea, { target: { value: 'sai' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu phúc khảo' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(mocks.submitResultCorrectionRequest).not.toHaveBeenCalled()
  })

  it('hides the form while a request is open and shows the accepted version', async () => {
    mocks.getResultCorrectionRequests.mockResolvedValue([
      { id: 1, reason: 'Xem lại điểm cá nhân.', status: 'ACCEPTED', createdAt: '2026-10-09T03:00:00Z', responseNote: 'Đã điều chỉnh.', newResultVersion: 2 },
    ])
    render(<ResultCorrectionPanel projectId={9} />)
    expect(await screen.findByText('Đã chấp nhận')).toBeTruthy()
    expect(screen.getByText('Đã tạo kết quả phiên bản 2.')).toBeTruthy()
    // ACCEPTED is not open, so the form is available again
    expect(screen.getByRole('button', { name: 'Gửi yêu cầu phúc khảo' })).toBeTruthy()
  })

  it('prevents a new request while one is pending', async () => {
    mocks.getResultCorrectionRequests.mockResolvedValue([
      { id: 1, reason: 'Chờ xử lý.', status: 'PENDING', createdAt: '2026-10-09T03:00:00Z' },
    ])
    render(<ResultCorrectionPanel projectId={9} />)
    expect(await screen.findByText(/đang có một yêu cầu phúc khảo chờ xử lý/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Gửi yêu cầu phúc khảo' })).toBeNull()
  })

  it('treats a 404 as no requests', async () => {
    mocks.getResultCorrectionRequests.mockRejectedValue(new HttpError('none', 404))
    render(<ResultCorrectionPanel projectId={9} />)
    expect(await screen.findByRole('button', { name: 'Gửi yêu cầu phúc khảo' })).toBeTruthy()
  })
})
