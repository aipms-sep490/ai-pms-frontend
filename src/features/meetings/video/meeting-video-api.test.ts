import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { HttpError } from '../../../services/http/http-client'
import {
  endMeetingVideo,
  getMeetingVideoPresence,
  getMeetingVideoSession,
  joinMeetingVideo,
  startMeetingVideo,
} from './meeting-video-api'
import { meetingVideoError } from './meeting-video-errors'
import type {
  MeetingVideoCapabilities,
  MeetingVideoJoinResponse,
  MeetingVideoJoinWindow,
  MeetingVideoPresenceSummary,
  MeetingVideoResource,
  MeetingVideoSession,
} from './meeting-video.types'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

describe('Video Meeting transport contract', () => {
  it('uses only the frozen endpoint paths and explicit verbs', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetch)
    const signal = new AbortController().signal
    await getMeetingVideoSession(42, signal)
    await startMeetingVideo(42)
    await joinMeetingVideo(42)
    await endMeetingVideo(42)
    await getMeetingVideoPresence(42, signal)

    expect(fetch.mock.calls.map(([url, options]) => [url, options.method])).toEqual([
      ['/api/v1/meetings/42/video/session', 'GET'],
      ['/api/v1/meetings/42/video/start', 'POST'],
      ['/api/v1/meetings/42/video/join', 'POST'],
      ['/api/v1/meetings/42/video/end', 'POST'],
      ['/api/v1/meetings/42/video/presence', 'GET'],
    ])
    expect(fetch.mock.calls[0][1].signal).toBe(signal)
    expect(fetch.mock.calls[4][1].signal).toBe(signal)
    expect(fetch.mock.calls[2][1].body).toBeUndefined()
    expect(fetch.mock.calls[2][1].headers['Content-Type']).toBeUndefined()
  })

  it('does not persist a join access token', async () => {
    const response = { accessToken: 'short-lived-token' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => response }))
    await joinMeetingVideo(42)
    expect(localStorage.getItem('meetingVideoToken')).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('keeps provider-independent DTO nullability explicit', () => {
    expectTypeOf<MeetingVideoResource['session']>().toEqualTypeOf<MeetingVideoSession | null>()
    expectTypeOf<MeetingVideoResource['capabilities']>().toEqualTypeOf<MeetingVideoCapabilities>()
    expectTypeOf<MeetingVideoResource['joinWindow']>().toEqualTypeOf<MeetingVideoJoinWindow | null>()
    expectTypeOf<MeetingVideoSession['startedAt']>().toEqualTypeOf<string | null>()
    expectTypeOf<MeetingVideoSession['endedAt']>().toEqualTypeOf<string | null>()
    expectTypeOf<MeetingVideoSession['activeParticipantCount']>().toEqualTypeOf<number | null>()
    expectTypeOf<MeetingVideoJoinResponse['accessToken']>().toEqualTypeOf<string>()
    expectTypeOf<MeetingVideoPresenceSummary['participants'][number]['firstJoinedAt']>().toEqualTypeOf<string | null>()
    expectTypeOf<MeetingVideoPresenceSummary['participants'][number]['lastLeftAt']>().toEqualTypeOf<string | null>()
  })
})

describe('Video Meeting error mapping', () => {
  it.each([
    'VIDEO_NOT_ENABLED', 'VIDEO_SESSION_NOT_STARTED', 'VIDEO_SESSION_ALREADY_ACTIVE', 'VIDEO_SESSION_ENDED', 'VIDEO_SESSION_FAILED',
    'PROJECT_NOT_ACTIVE', 'MEETING_NOT_SCHEDULED', 'MEETING_PARTICIPANT_REQUIRED', 'VIDEO_START_FORBIDDEN', 'VIDEO_JOIN_FORBIDDEN',
    'VIDEO_END_FORBIDDEN', 'VIDEO_JOIN_TOO_EARLY', 'VIDEO_JOIN_WINDOW_CLOSED', 'VIDEO_PROVIDER_UNAVAILABLE', 'VIDEO_PROVIDER_TIMEOUT',
    'VIDEO_RECORDING_NOT_ENABLED', 'VIDEO_RECORDING_FORBIDDEN',
  ])('maps the stable %s code without reading backend detail', (code) => {
    const error = new HttpError('untrusted backend detail', 403, { code, detail: 'untrusted backend detail' })
    expect(meetingVideoError(error)).not.toContain('untrusted backend detail')
  })

  it('uses a safe message for unknown errors', () => {
    expect(meetingVideoError(new HttpError('detail', 400, { code: 'UNRECOGNIZED' }))).toBe('Không thể thực hiện thao tác Video. Hãy thử lại hoặc liên hệ quản trị viên.')
  })
})
