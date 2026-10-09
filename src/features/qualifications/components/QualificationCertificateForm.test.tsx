import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QualificationCertificateForm } from './QualificationCertificateForm'
import { HttpError } from '../../../services/http/http-client'
const api = vi.hoisted(() => ({ uploadCertificate: vi.fn() }))
vi.mock('../../../services/service-gateway', () => ({ services: { qualification: api } }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
function fill(file = new File(['%PDF-1.4'], 'certificate.pdf', { type: 'application/pdf' })) {
  fireEvent.change(screen.getByLabelText('Tệp chứng nhận'), { target: { files: [file] } })
  const completed = screen.getByRole('checkbox', { name: /Tôi đã hoàn thành/ }) as HTMLInputElement
  if (!completed.checked) fireEvent.click(completed)
}
it('submits once, waits for BE and exposes the returned pending qualification', async () => {
  let finish!: (value: unknown) => void
  api.uploadCertificate.mockReturnValue(new Promise(resolve => { finish = resolve }))
  const submitted = vi.fn()
  render(<QualificationCertificateForm onSubmitted={submitted} />); fill()
  fireEvent.click(screen.getByRole('button', { name: 'Nộp chứng nhận' }))
  fireEvent.submit(screen.getByRole('button', { name: 'Đang nộp…' }).closest('form')!)
  expect(api.uploadCertificate).toHaveBeenCalledTimes(1); expect(submitted).not.toHaveBeenCalled()
  const pending = { verificationStatus: 'PENDING_VERIFICATION' }
  finish(pending)
  await vi.waitFor(() => expect(submitted).toHaveBeenCalledWith(pending))
})
it('rejects unsupported files without sending and preserves the file after a server failure', async () => {
  render(<QualificationCertificateForm onSubmitted={vi.fn()} />)
  fill(new File(['script'], 'bad.svg', { type: 'image/svg+xml' }))
  fireEvent.click(screen.getByRole('button', { name: 'Nộp chứng nhận' }))
  expect(screen.getByRole('alert').textContent).toContain('PDF, PNG hoặc JPEG'); expect(api.uploadCertificate).not.toHaveBeenCalled()
  fill(); api.uploadCertificate.mockRejectedValue(new HttpError('Invalid', 422))
  fireEvent.click(screen.getByRole('button', { name: 'Nộp chứng nhận' }))
  await vi.waitFor(() => expect(screen.getByRole('alert').textContent).toContain('chấp nhận'))
  expect((screen.getByLabelText('Tệp chứng nhận') as HTMLInputElement).files?.[0].name).toBe('certificate.pdf')
})
