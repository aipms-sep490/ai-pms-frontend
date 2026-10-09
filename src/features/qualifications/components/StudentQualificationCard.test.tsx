import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { StudentQualificationCard } from './StudentQualificationCard'
const api = vi.hoisted(() => ({ getMine: vi.fn(), uploadCertificate: vi.fn() }))
vi.mock('../../../services/service-gateway', () => ({ services: { qualification: api } }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
it('does not equate a verified certificate with team registration eligibility', async () => {
  api.getMine.mockResolvedValue({ verificationStatus: 'VERIFIED', trainingStatus: 'TRAINING_COMPLETED' })
  render(<StudentQualificationCard />)
  await screen.findByText('Đã xác minh')
  expect(screen.queryByText('ĐỦ ĐIỀU KIỆN')).toBeNull()
})
it('shows the pending readback and refreshes team context once after upload', async () => {
  api.getMine.mockResolvedValue(null)
  api.uploadCertificate.mockResolvedValue({ verificationStatus: 'PENDING_VERIFICATION', trainingStatus: 'TRAINING_COMPLETED', certificateNumber: 'C-12' })
  const refresh = vi.fn().mockResolvedValue(undefined)
  render(<StudentQualificationCard onSubmitted={refresh} />)
  const file = await screen.findByLabelText('Tệp chứng nhận')
  fireEvent.change(file, { target: { files: [new File(['%PDF-1.4'], 'certificate.pdf', { type: 'application/pdf' })] } })
  fireEvent.click(screen.getByRole('checkbox', { name: /Tôi đã hoàn thành/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Nộp chứng nhận' }))
  expect(await screen.findByText('Chờ xác minh')).toBeTruthy()
  expect(screen.getByText('C-12')).toBeTruthy()
  expect(refresh).toHaveBeenCalledTimes(1)
})
