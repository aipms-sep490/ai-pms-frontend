import { afterEach, expect, it, vi } from 'vitest'
import { verify, reject } from './student-qualifications.api'
import { getQualificationCertificate, downloadQualificationCertificate } from '../../features/qualifications/api/certificate-api'
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })
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
