import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { HttpError } from '../../../services/http/http-client'
import { QualificationCertificateViewer } from './QualificationCertificateViewer'
const api = vi.hoisted(() => ({ getQualificationCertificate: vi.fn(), downloadQualificationCertificate: vi.fn() }))
vi.mock('../api/certificate-api', () => api)
const metadata = { qualificationId: 12, fileId: 5, fileName: 'Certificate.pdf', contentType: 'application/pdf', sizeBytes: 2048, checksumSha256: null }
beforeEach(() => { api.getQualificationCertificate.mockResolvedValue(metadata); api.downloadQualificationCertificate.mockResolvedValue(new Blob(['fixture'])) })
afterEach(() => { cleanup(); vi.clearAllMocks() })
it('distinguishes forbidden certificate access and provides retry without a public URL', async () => {
  api.getQualificationCertificate.mockRejectedValue(new HttpError('Forbidden', 403)); render(<QualificationCertificateViewer qualificationId={12} />)
  fireEvent.click(screen.getByRole('button', { name: 'Xem chứng chỉ' })); expect((await screen.findByRole('alert')).textContent).toContain('chưa có quyền')
  expect(api.downloadQualificationCertificate).not.toHaveBeenCalled()
})
it('rejects a changed certificate reference before downloading', async () => {
  render(<QualificationCertificateViewer qualificationId={12} />); fireEvent.click(screen.getByRole('button', { name: 'Xem chứng chỉ' })); await screen.findByText('Certificate.pdf')
  api.getQualificationCertificate.mockResolvedValue({ ...metadata, fileId: 6 }); fireEvent.click(screen.getByRole('button', { name: 'Tải chứng chỉ' }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('đã thay đổi')); expect(api.downloadQualificationCertificate).not.toHaveBeenCalled()
})
