import { describe, expect, it } from 'vitest'
import { HttpError } from '../../services/http/http-client'
import { formatMeetingTime, meetingDate, mustRefreshAfterError, safeMeetingUrl, toMeetingInput, toMeetingUtc } from './meeting-utils'

describe('Meeting time and link boundaries', () => {
  it('round trips Vietnam wall time through UTC and zone-less SQL datetime2', () => {
    expect(toMeetingUtc('2026-09-23T09:30')).toBe('2026-09-23T02:30:00.000Z')
    expect(toMeetingInput('2026-09-23T02:30:00')).toBe('2026-09-23T09:30')
    expect(toMeetingInput('2026-09-23T09:30:00+07:00')).toBe('2026-09-23T09:30')
    expect(toMeetingInput(toMeetingUtc('2026-09-23T00:00'))).toBe('2026-09-23T00:00')
    expect(meetingDate('2026-09-22T17:00:00Z').toISOString()).toBe('2026-09-22T17:00:00.000Z')
  })
  it('handles empty and invalid dates without crashing the screen', () => {
    expect(toMeetingInput(null)).toBe('')
    expect(toMeetingInput('invalid')).toBe('')
    expect(formatMeetingTime('invalid')).toBe('Chưa rõ thời gian')
  })
  it.each(['javascript:alert(1)', 'data:text/html,hello', 'file:///tmp/test', 'https://user:secret@example.com', 'bad url', null])('rejects unsafe URL %s', (url) => {
    expect(safeMeetingUrl(url)).toBeNull()
  })
  it('accepts normal meeting links', () => {
    expect(safeMeetingUrl(' https://meet.google.com/abc-defg-hij ')).toBe('https://meet.google.com/abc-defg-hij')
  })
  it('requires authoritative refresh after conflicts and uncertain network results', () => {
    expect(mustRefreshAfterError(new HttpError('conflict', 409))).toBe(true)
    expect(mustRefreshAfterError(new TypeError('Failed to fetch'))).toBe(true)
    expect(mustRefreshAfterError(new HttpError('validation', 422))).toBe(false)
  })
})
