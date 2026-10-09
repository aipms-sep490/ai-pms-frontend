import { afterEach, expect, it, vi } from 'vitest'
import { commitCurriculum, curriculumCommitRows, previewCurriculum, type CurriculumPreviewRow } from './curriculum-import-api'

const row: CurriculumPreviewRow = { rowNumber: 2, studentCode: 'DE0001', userId: 7, fullName: 'Test Student', currentCurriculumCode: null, curriculumCode: 'BIT_SE', expectedConcurrencyToken: 'version-1', status: 'UPDATE', errors: [] }
afterEach(() => vi.unstubAllGlobals())

it('sends a multipart file with authentication and lets the browser set the boundary', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ rows: [row], canCommit: true }) })
  vi.stubGlobal('fetch', fetchMock)
  const file = new File(['MSSV,Khung\nDE0001,BIT_SE'], 'curriculum.csv')
  await previewCurriculum(file, 'token')
  const [path, request] = fetchMock.mock.calls[0]
  expect(path).toBe('/api/v1/users/curriculum-import/preview')
  expect(request.method).toBe('POST')
  expect(request.body.get('file')).toBe(file)
  expect(request.headers.Authorization).toBe('Bearer token')
  expect(request.headers['Content-Type']).toBeUndefined()
})

it('commits only update/unchanged rows with the exact preview tokens', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ updated: 1, unchanged: 1 }) })
  vi.stubGlobal('fetch', fetchMock)
  const rows = curriculumCommitRows({ canCommit: true, rows: [row, { ...row, userId: 8, studentCode: 'DE0002', status: 'UNCHANGED', expectedConcurrencyToken: 'version-2' }, { ...row, status: 'SKIPPED', curriculumCode: '' }] })!
  await commitCurriculum(rows, 'token')
  expect(fetchMock).toHaveBeenCalledWith('/api/v1/users/curriculum-import/commit', expect.objectContaining({ method: 'POST', body: JSON.stringify({ rows: [
    { userId: 7, studentCode: 'DE0001', curriculumCode: 'BIT_SE', expectedConcurrencyToken: 'version-1' },
    { userId: 8, studentCode: 'DE0002', curriculumCode: 'BIT_SE', expectedConcurrencyToken: 'version-2' },
  ] }) }))
})

it.each([{ status: 'ERROR' }, { status: 'UNKNOWN' }, { expectedConcurrencyToken: null }, { userId: null }, { errors: ['DUPLICATE_STUDENT_CODE'] }, { curriculumCode: '' }])('fails closed on invalid preview rows %j', patch => {
  expect(curriculumCommitRows({ canCommit: true, rows: [row, { ...row, ...patch }] })).toBeNull()
})

it('respects server denial and rejects empty or skipped-only batches', () => {
  expect(curriculumCommitRows({ canCommit: false, rows: [row] })).toBeNull()
  expect(curriculumCommitRows({ canCommit: true, rows: [] })).toBeNull()
  expect(curriculumCommitRows({ canCommit: true, rows: [{ ...row, status: 'SKIPPED' }] })).toBeNull()
})
