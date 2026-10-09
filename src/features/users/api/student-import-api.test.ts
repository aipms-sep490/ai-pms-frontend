import { afterEach, expect, it, vi } from 'vitest'
import { commitStudentImport, previewStudentImport } from './student-import-api'
afterEach(() => vi.unstubAllGlobals())
it('sends file and selected major as multipart without setting content-type', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }); vi.stubGlobal('fetch', fetchMock)
  const file = new File(['headers'], 'students.csv'); await previewStudentImport(file, 7, 'token')
  expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/users/student-import/preview')
  const request = fetchMock.mock.calls[0][1]
  expect(request.headers.Authorization).toBe('Bearer token'); expect(request.headers['Content-Type']).toBeUndefined()
  expect(request.body.get('file')).toBe(file); expect(request.body.get('majorId')).toBe('7')
})
it('commits student rows without accepting roles or password options', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ created: 1 }) }); vi.stubGlobal('fetch', fetchMock)
  const rows = [{ rowNumber: 2, studentCode: '0001', fullName: 'Test', email: 'test@gmail.com', phone: null, curriculumCode: null }]
  await commitStudentImport(7, rows, 'token')
  expect(fetchMock).toHaveBeenCalledWith('/api/v1/users/student-import/commit', expect.objectContaining({ method: 'POST', body: JSON.stringify({ majorId: 7, rows }) }))
})
