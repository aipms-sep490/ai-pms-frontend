import { describe, expect, it } from 'vitest'
import { HttpError } from '../../services/http/http-client'
import {
  displayDescription,
  extractTaskId,
  formatMeetingTime,
  isPastVietnamDateTime,
  meetingDate,
  mustRefreshAfterError,
  safeMeetingUrl,
  toMeetingInput,
  toMeetingUtc,
  validCalendarDate,
} from './meeting-utils'

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
  it('rejects impossible calendar filter dates without blocking valid history dates', () => {
    expect(validCalendarDate('2024-02-29')).toBe(true)
    expect(validCalendarDate('2020-01-01')).toBe(true)
    expect(validCalendarDate('2026-02-30')).toBe(false)
    expect(validCalendarDate('2026-13-01')).toBe(false)
    expect(validCalendarDate(null)).toBe(false)
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

  it('extracts linked task ID and cleans display description', () => {
    expect(extractTaskId('[Task #123] Hoàn thành báo cáo')).toBe(123)
    expect(displayDescription('[Task #123] Hoàn thành báo cáo')).toBe('Hoàn thành báo cáo')

    expect(extractTaskId('<!--taskId:456--> Nội dung quan trọng')).toBe(456)
    expect(displayDescription('<!--taskId:456--> Nội dung quan trọng')).toBe('Nội dung quan trọng')

    expect(extractTaskId('[Task #789]')).toBe(789)
    expect(displayDescription('[Task #789]')).toBe('')

    expect(extractTaskId('Không có task liên kết')).toBeNull()
    expect(displayDescription('Không có task liên kết')).toBe('Không có task liên kết')

    expect(extractTaskId(null)).toBeNull()
    expect(displayDescription(null)).toBe('')
  })

  it('validates past and future dates in Vietnam timezone', () => {
    // Reference instant: 2026-11-18 10:00:00 UTC (17:00:00 VN)
    const fixedNow = Date.parse('2026-11-18T10:00:00.000Z')

    // Past in Vietnam time
    expect(isPastVietnamDateTime('2026-11-18T16:59', fixedNow)).toBe(true)
    expect(isPastVietnamDateTime('2026-11-16T12:00', fixedNow)).toBe(true)
    expect(isPastVietnamDateTime('2026-11-18T17:00', fixedNow)).toBe(true) // exact same minute

    // Future in Vietnam time
    expect(isPastVietnamDateTime('2026-11-18T17:01', fixedNow)).toBe(false)
    expect(isPastVietnamDateTime('2026-11-19T09:00', fixedNow)).toBe(false)

    // ISO string inputs
    expect(isPastVietnamDateTime('2026-11-18T09:59:00.000Z', fixedNow)).toBe(true)
    expect(isPastVietnamDateTime('2026-11-18T10:01:00.000Z', fixedNow)).toBe(false)

    // Empty or null
    expect(isPastVietnamDateTime(null, fixedNow)).toBe(false)
    expect(isPastVietnamDateTime('', fixedNow)).toBe(false)
  })
})
