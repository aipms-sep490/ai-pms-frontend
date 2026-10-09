import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '../../../services/http/http-client'
import { QualificationVerificationPage } from './QualificationVerificationPage'

const api = vi.hoisted(() => ({ getVerificationQueue: vi.fn(), verify: vi.fn(), reject: vi.fn() }))
vi.mock('../../../services/service-gateway', () => ({ services: { qualification: api } }))
beforeEach(() => {
  api.getVerificationQueue.mockResolvedValue({ items: [{ id: 12, fullName: 'Mai Anh', studentCode: 'SE123', trainingStatus: 'TRAINING_COMPLETED', concurrencyToken: 'reviewed-evidence-token', verificationStatus: 'PENDING_VERIFICATION' }] })
  api.verify.mockResolvedValue({}); api.reject.mockResolvedValue({})
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('Qualification confirmation', () => {
  it('cancels without writing to BE', async () => {
    render(<QualificationVerificationPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Xác minh' }))
    const dialog = screen.getByRole('dialog', { name: 'Xác minh điều kiện tham gia' })
    expect(api.verify).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }))
    expect(api.verify).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('sends a trimmed reason only after in-app confirmation', async () => {
    render(<QualificationVerificationPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Từ chối' }))
    const dialog = screen.getByRole('dialog', { name: 'Từ chối xác minh' })
    const submit = within(dialog).getByRole('button', { name: 'Từ chối xác minh' }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    fireEvent.change(within(dialog).getByLabelText('Lý do từ chối'), { target: { value: '  Thiếu chứng chỉ  ' } })
    fireEvent.click(submit)
    await waitFor(() => expect(api.reject).toHaveBeenCalledWith(12, 'Thiếu chứng chỉ', 'reviewed-evidence-token'))
  })
  it('Escape cancels the decision without writing', async () => {
    render(<QualificationVerificationPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Xác minh' }))
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(api.verify).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

it('uses server pagination and resets to the first page after filtering', async () => {
  api.getVerificationQueue.mockResolvedValue({ items: [{ id: 12, fullName: 'Mai Anh', verificationStatus: 'VERIFIED' }], totalCount: 42 })
  render(<QualificationVerificationPage />)
  await screen.findByText('Mai Anh')
  fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
  await waitFor(() => expect(api.getVerificationQueue).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, pageSize: 20 })))
  fireEvent.change(screen.getByLabelText('Tìm sinh viên'), { target: { value: 'Mai' } })
  await waitFor(() => expect(api.getVerificationQueue).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: 'Mai' })))
})
it('reloads after a conflict without retrying a verification', async () => {
  api.verify.mockRejectedValue(new HttpError('Already processed', 409))
  render(<QualificationVerificationPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'Xác minh' }))
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đủ điều kiện' }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('thay đổi'))
  expect(api.verify).toHaveBeenCalledTimes(1)
  expect(api.getVerificationQueue).toHaveBeenCalledTimes(2)
})
it('shows evidence metadata and blocks verification before training is complete', async () => {
  api.getVerificationQueue.mockResolvedValue({ items: [{ id: 12, fullName: 'Mai Anh', trainingStatus: 'PENDING_TRAINING', concurrencyToken: 'reviewed-evidence-token', verificationStatus: 'PENDING_VERIFICATION', certificateNumber: 'CERT-12', issuedAt: '2026-09-01T00:00:00Z', expiresAt: '2027-09-01T00:00:00Z' }], totalCount: 1 })
  render(<QualificationVerificationPage />)
  expect(await screen.findByText('CERT-12')).toBeDefined()
  expect((screen.getByRole('button', { name: 'Xác minh' }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.getByText('Cần hoàn thành đào tạo trước khi xác minh.')).toBeDefined()
})
