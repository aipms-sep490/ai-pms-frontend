import { afterEach, expect, it, vi } from 'vitest'
import { verify, reject, uploadCertificate } from './student-qualifications.api'
import { getQualificationCertificate, downloadQualificationCertificate } from '../../features/qualifications/api/certificate-api'
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })
it('uploads and submits evidence atomically without a project or a JSON content type', async () => {
  const pending = { id: 12, verificationStatus: 'PENDING_VERIFICATION' }
  const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => pending }); vi.stubGlobal('fetch', fetch)
  const file = new File(['%PDF-1.4'], 'certificate.pdf', { type: 'application/pdf' })
  expect(await uploadCertificate({ file, certificateNumber: 'C-12', issuedAt: '2026-01-01T00:00:00Z' })).toEqual(pending)
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(fetch.mock.calls[0][0]).toBe('/api/v1/student-qualifications/me/certificate')
  const request = fetch.mock.calls[0][1]
  expect(request.headers['Content-Type']).toBeUndefined()
  expect(request.body.get('File')).toBe(file)
  expect(request.body.get('TrainingStatus')).toBe('TRAINING_COMPLETED')
  expect(request.body.get('QualificationType')).toBe('CAPSTONE_READINESS')
  expect(request.body.get('CertificateNumber')).toBe('C-12')
  expect(request.body.has('ProjectId')).toBe(false)
})
it('sends the displayed evidence token and uses only qualification-scoped file endpoints', async () => {
  localStorage.setItem('token', 'fixture-staff')
  const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}), blob: async () => new Blob(['fixture']) }); vi.stubGlobal('fetch', fetch)
  await verify(12, 'displayed-token'); await reject(12, 'Evidence incomplete', 'displayed-token')
  await getQualificationCertificate(12); await downloadQualificationCertificate(12)
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ expectedConcurrencyToken: 'displayed-token' })
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ reason: 'Evidence incomplete', expectedConcurrencyToken: 'displayed-token' })
  expect(fetch.mock.calls[2][0]).toBe('/api/v1/student-qualifications/12/certificate')
  expect(fetch.mock.calls[3][0]).toBe('/api/v1/student-qualifications/12/certificate/download')
  expect(fetch.mock.calls.every(([, options]) => options.headers.Authorization === 'Bearer fixture-staff')).toBe(true)
})
