import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearUploadPolicyCache, getUploadPolicy, uploadPolicyLabel, validateUploadFile, type UploadPolicy } from './upload-policies.api'

vi.mock('../../app/config/env', () => ({ env: { apiBaseUrl: '/api/v1' } }))

const policy: UploadPolicy = { parentType: 'REVIEW_GATE_EVIDENCE', maxBytes: 22 * 1_048_576, maxBytesLabel: '22 MiB',
  allowedMimeTypes: ['application/pdf', 'image/png'], allowedExtensions: ['.pdf', '.png'], maxFilesPerRequest: 1, requiresVersionAnchor: true }
const file = (name: string, size: number) => { const value = new File(['x'], name); Object.defineProperty(value, 'size', { value: size }); return value }

beforeEach(() => { clearUploadPolicyCache() })
afterEach(() => { vi.unstubAllGlobals(); clearUploadPolicyCache() })

describe('upload policy from BE', () => {
  it('accepts a 21 MiB PDF under a 22 MiB policy and blocks a 10 MiB PDF under a 6 MiB policy', () => {
    expect(validateUploadFile(file('report.pdf', 21 * 1_048_576), policy)).toBeNull()
    expect(validateUploadFile(file('report.pdf', 10 * 1_048_576), { ...policy, maxBytes: 6 * 1_048_576, maxBytesLabel: '6 MiB' })).toContain('6 MiB')
    expect(validateUploadFile(file('report.exe', 1), policy)).toContain('PDF, PNG')
    expect(uploadPolicyLabel(policy)).toBe('PDF, PNG · tối đa 22 MiB')
  })

  it('does not block when policy is unavailable', () => {
    expect(validateUploadFile(file('unknown.bin', 100_000_000), null)).toBeNull()
  })

  it('fetches once per page session and retries after failure', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json([policy]))
    vi.stubGlobal('fetch', fetch)
    expect(await getUploadPolicy(policy.parentType)).toEqual(policy)
    expect(await getUploadPolicy(policy.parentType)).toEqual(policy)
    expect(fetch).toHaveBeenCalledTimes(1)
    clearUploadPolicyCache()
    fetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(Response.json([policy]))
    await expect(getUploadPolicy(policy.parentType)).rejects.toThrow('offline')
    expect(await getUploadPolicy(policy.parentType)).toEqual(policy)
  })
})
