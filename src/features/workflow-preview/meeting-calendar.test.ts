import { describe, expect, it } from 'vitest'
import { addDays, buildMonthMatrix, buildWeekDays, expandRecurrences, occurrencesOn, parseDay, startOfWeek, ymd, type CalendarEvent } from './meeting-calendar'

const base: CalendarEvent = { id: 1, title: 'Weekly sync', start: '2026-10-05T14:00', end: '2026-10-05T15:00', recurrence: 'NONE', cancelled: false }

describe('meeting calendar math', () => {
  it('builds a Monday-based six-week month matrix covering spill-over days', () => {
    const matrix = buildMonthMatrix(2026, 9) // October 2026
    expect(matrix).toHaveLength(6)
    expect(matrix[0]).toHaveLength(7)
    expect(matrix[0][0].getDay()).toBe(1) // Monday
    // October 1 2026 is a Thursday, so the grid starts on Monday Sep 28.
    expect(ymd(matrix[0][0])).toBe('2026-09-28')
  })

  it('returns seven Monday-based days for a week view', () => {
    const days = buildWeekDays(parseDay('2026-10-08'))
    expect(days).toHaveLength(7)
    expect(ymd(days[0])).toBe('2026-10-05')
    expect(ymd(days[6])).toBe('2026-10-11')
  })

  it('keeps a non-recurring meeting as a single occurrence', () => {
    const range = { start: parseDay('2026-10-01'), end: parseDay('2026-10-31') }
    const result = expandRecurrences([base], range.start, range.end)
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-10-05')
    expect(result[0].recurring).toBe(false)
  })

  it('expands weekly meetings up to the inclusive until date and clips to range', () => {
    const weekly: CalendarEvent = { ...base, recurrence: 'WEEKLY', until: '2026-10-26' }
    const result = expandRecurrences([weekly], parseDay('2026-10-01'), parseDay('2026-10-31'))
    expect(result.map(item => item.date)).toEqual(['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'])
    expect(result.every(item => item.recurring)).toBe(true)
  })

  it('steps biweekly and filters occurrences outside the visible range', () => {
    const biweekly: CalendarEvent = { ...base, recurrence: 'BIWEEKLY', until: '2026-12-31' }
    const result = expandRecurrences([biweekly], parseDay('2026-11-01'), parseDay('2026-11-30'))
    expect(result.map(item => item.date)).toEqual(['2026-11-02', '2026-11-16', '2026-11-30'])
  })

  it('groups occurrences onto a given day', () => {
    const weekly: CalendarEvent = { ...base, recurrence: 'WEEKLY', until: '2026-10-19' }
    const result = expandRecurrences([weekly], parseDay('2026-10-01'), parseDay('2026-10-31'))
    expect(occurrencesOn(result, parseDay('2026-10-12'))).toHaveLength(1)
    expect(occurrencesOn(result, parseDay('2026-10-13'))).toHaveLength(0)
  })

  it('has consistent day helpers', () => {
    expect(ymd(addDays(parseDay('2026-10-31'), 1))).toBe('2026-11-01')
    expect(startOfWeek(parseDay('2026-10-11')).getDay()).toBe(1)
  })
})
