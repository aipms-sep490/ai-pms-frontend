import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAcademicHierarchy, saveAcademicRecord, setAcademicRecordStatus } from './academic-api'

afterEach(() => vi.unstubAllGlobals())

function okJson(value: unknown) { return { ok: true, json: async () => value } }

describe('academic API contracts', () => {
  it('uses only documented hierarchy filters and bearer authorization', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson([]))
    vi.stubGlobal('fetch', fetchMock)
    await getAcademicHierarchy('token', { search: 'SE', organizationId: 1, includeInactive: true })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/academic/hierarchy?search=SE&organizationId=1&includeInactive=true',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) }),
    )
  })

  it('sends a major create payload with the owning department ID', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({ id: 1 }))
    vi.stubGlobal('fetch', fetchMock)
    await saveAcademicRecord({ kind: 'major', code: 'SWE', name: 'Software Engineering', description: '', departmentId: 10 }, 'token')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/academic/majors',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ code: 'SWE', name: 'Software Engineering', description: null, departmentId: 10 }) }),
    )
  })

  it('uses PATCH status rather than destructive deletion', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({ id: 10, isActive: false }))
    vi.stubGlobal('fetch', fetchMock)
    await setAcademicRecordStatus('department', 10, false, 'token')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/academic/departments/10/status',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ isActive: false }) }),
    )
  })
})
