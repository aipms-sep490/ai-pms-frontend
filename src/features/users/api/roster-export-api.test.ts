import { afterEach, expect, it, vi } from 'vitest'
import { exportTeamRoster, rosterContentType } from './roster-export-api'
import { HttpError } from '../../../services/http/http-client'

afterEach(() => vi.unstubAllGlobals())

it('downloads the server workbook with authentication and academic filters only', async () => {
  const blob = new Blob(['xlsx'], { type: rosterContentType })
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => blob })
  vi.stubGlobal('fetch', fetchMock)
  expect(await exportTeamRoster({ semesterId: 7, departmentId: 2, majorId: 4 }, 'admin-token')).toBe(blob)
  expect(fetchMock).toHaveBeenCalledWith('/api/v1/teams/export?semesterId=7&format=xlsx&departmentId=2&majorId=4', expect.objectContaining({ method: 'GET', headers: expect.objectContaining({ Authorization: 'Bearer admin-token' }) }))
})

it('omits optional filters to export all current team members in the semester', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(['xlsx'], { type: rosterContentType }) })
  vi.stubGlobal('fetch', fetchMock)
  await exportTeamRoster({ semesterId: 7 }, 'token')
  expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/teams/export?semesterId=7&format=xlsx')
})

it.each(['text/html', 'application/json', 'application/problem+json'])('rejects a successful response that is actually %s', async type => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(['error'], { type }) }))
  await expect(exportTeamRoster({ semesterId: 7 }, 'token')).rejects.toThrow('Invalid roster workbook response')
})

it('preserves the backend problem status and detail instead of downloading an error file', async () => {
  const problem = { title: 'Limit exceeded', detail: 'ROSTER_EXPORT_ROW_LIMIT_EXCEEDED', status: 422 }
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422, json: async () => problem }))
  await expect(exportTeamRoster({ semesterId: 7 }, 'token')).rejects.toEqual(new HttpError(problem.detail, 422, problem))
})
