import { describe, expect, it } from 'vitest'
import { notificationTime } from './notification-copy'

describe('notification time in Vietnam', () => {
  it('treats bare server UTC and explicit UTC as the same Vietnam time', () => {
    const value = notificationTime('2026-10-24T00:21:00')
    expect(value).toBe(notificationTime('2026-10-24T00:21:00Z'))
    expect(value).toContain('07:21')
    expect(value).toContain('24/10/2026')
    expect(value).toBe(notificationTime('2026-10-24T07:21:00+07:00'))
  })

  it.each(['', 'not-a-timestamp'])('keeps the Vietnamese fallback for invalid time %j', value => {
    expect(notificationTime(value)).toBe('Thời gian chưa xác định')
  })
})
