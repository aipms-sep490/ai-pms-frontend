import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from './meetings.api'
import { HttpError } from '../http/http-client'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })
describe('Meetings HTTP contract', () => {
  it('sends the complete lifecycle to BE with the right verbs, payloads and authentication', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetch); localStorage.setItem('token', 'meeting-test-token')
    const signal = new AbortController().signal
    const schedule = { title: 'Họp tuần', agenda: null, startAt: '2026-09-23T02:00:00Z', endAt: null, location: null, onlineUrl: null }
    await api.getMeetings(2, { status: 'SCHEDULED', page: 2, from: schedule.startAt }, signal)
    await api.getMeeting(42, signal)
    await api.createMeeting(2, { ...schedule, participantUserIds: [9, 6] })
    await api.updateMeeting(42, schedule)
    await api.addMeetingParticipant(42, 10)
    fetch.mockResolvedValueOnce({ ok: true, status: 204 })
    await api.removeMeetingParticipant(42, 10)
    await api.updateMeetingNotes(42, { meetingNotes: 'Kết luận', attendances: [{ userId: 9, attendanceStatus: 'ATTENDED' }] })
    await api.completeMeeting(42)
    await api.addMeetingFeedback(42, 'Bổ sung kiểm thử')
    await api.cancelMeeting(43)
    expect(fetch.mock.calls.map(([url, options]) => [url, options.method])).toEqual([
      ['/api/v1/projects/2/meetings?page=2&pageSize=10&status=SCHEDULED&from=2026-09-23T02%3A00%3A00Z', 'GET'],
      ['/api/v1/meetings/42', 'GET'], ['/api/v1/projects/2/meetings', 'POST'], ['/api/v1/meetings/42', 'PUT'],
      ['/api/v1/meetings/42/participants', 'POST'], ['/api/v1/meetings/42/participants/10', 'DELETE'],
      ['/api/v1/meetings/42/notes', 'PUT'], ['/api/v1/meetings/42/complete', 'POST'],
      ['/api/v1/meetings/42/feedback', 'POST'], ['/api/v1/meetings/43/cancel', 'POST'],
    ])
    expect(fetch.mock.calls[0][1].signal).toBe(signal)
    expect(fetch.mock.calls[1][1].signal).toBe(signal)
    expect(JSON.parse(fetch.mock.calls[2][1].body).participantUserIds).toEqual([9, 6])
    expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual(schedule)
    expect(JSON.parse(fetch.mock.calls[4][1].body)).toEqual({ userId: 10, attendanceStatus: 'INVITED' })
    expect(JSON.parse(fetch.mock.calls[6][1].body)).toEqual({ meetingNotes: 'Kết luận', attendances: [{ userId: 9, attendanceStatus: 'ATTENDED' }] })
    expect(fetch.mock.calls[7][1].body).toBeUndefined()
    expect(JSON.parse(fetch.mock.calls[8][1].body)).toEqual({ feedbackText: 'Bổ sung kiểm thử' })
    expect(fetch.mock.calls.every(([, options]) => options.headers.Authorization === 'Bearer meeting-test-token')).toBe(true)
  })
  it('loads only roster and all active assignment pages, deduplicating user IDs', async () => {
    const response = (data: unknown) => ({ ok: true, status: 200, json: async () => data })
    const fetch = vi.fn().mockResolvedValueOnce(response({ members: [{ userId: 9, fullName: 'Khang', isLeader: true }] }))
      .mockResolvedValueOnce(response({ items: [{ supervisorUserId: 6, supervisorName: 'GVHD', endedAt: null }, { supervisorUserId: 7, supervisorName: 'Cũ', endedAt: '2026-01-01' }], totalPages: 2 }))
      .mockResolvedValueOnce(response({ items: [{ supervisorUserId: 6, supervisorName: 'GVHD', endedAt: null }, { supervisorUserId: 8, supervisorName: 'GVHD 2', endedAt: null }], totalPages: 2 }))
    vi.stubGlobal('fetch', fetch)
    expect((await api.getMeetingCandidates(2, 3)).candidates).toEqual([
      { userId: 9, fullName: 'Khang', role: 'Trưởng nhóm' }, { userId: 6, fullName: 'GVHD', role: 'Giảng viên hướng dẫn' }, { userId: 8, fullName: 'GVHD 2', role: 'Giảng viên hướng dẫn' },
    ])
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(['/api/v1/teams/3', '/api/v1/projects/2/supervisor-assignments?page=1&pageSize=100', '/api/v1/projects/2/supervisor-assignments?page=2&pageSize=100'])
  })
  it('propagates conflicts without automatically repeating a mutation', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ title: 'Conflict' }) })
    vi.stubGlobal('fetch', fetch)
    await expect(api.completeMeeting(42)).rejects.toBeInstanceOf(HttpError)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('continues with current supervisors when the roster endpoint denies access', async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ title: 'Forbidden' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ items: [{ supervisorUserId: 6, supervisorName: 'GVHD', endedAt: null }], totalPages: 1 }) })
    vi.stubGlobal('fetch', fetch)
    const result = await api.getMeetingCandidates(2, 3)
    expect(result.candidates).toEqual([{ userId: 6, fullName: 'GVHD', role: 'Giảng viên hướng dẫn' }])
    expect(result.notice).toContain('trưởng nhóm có thể thêm sinh viên sau')
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('does not disguise network failures as an empty roster', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('Offline'))
    vi.stubGlobal('fetch', fetch)
    await expect(api.getMeetingCandidates(2, 3)).rejects.toThrow('Offline')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
