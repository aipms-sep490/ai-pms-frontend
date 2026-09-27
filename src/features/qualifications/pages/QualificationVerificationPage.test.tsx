import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QualificationVerificationPage } from './QualificationVerificationPage'

const api = vi.hoisted(() => ({ getVerificationQueue: vi.fn(), verify: vi.fn(), reject: vi.fn() }))
vi.mock('../../../services/service-gateway', () => ({ services: { qualification: api } }))
beforeEach(() => {
  api.getVerificationQueue.mockResolvedValue({ items: [{ id: 12, fullName: 'Mai Anh', studentCode: 'SE123', trainingStatus: 'TRAINING_COMPLETED', verificationStatus: 'PENDING_VERIFICATION' }] })
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
    await waitFor(() => expect(api.reject).toHaveBeenCalledWith(12, 'Thiếu chứng chỉ'))
  })
  it('Escape cancels the decision without writing', async () => {
    render(<QualificationVerificationPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Xác minh' }))
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(api.verify).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
