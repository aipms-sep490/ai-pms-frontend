import { expect, it } from 'vitest'
import { isFutureOfficeSlot, todayVietnam } from './future-office-slot'

it('uses Vietnam calendar day and blocks a past office slot, including earlier today', () => {
  const now = Date.parse('2026-11-15T10:00:00+07:00')
  expect(todayVietnam(now)).toBe('2026-11-15')
  expect(isFutureOfficeSlot('2026-11-14', '16:30', now)).toBe(false)
  expect(isFutureOfficeSlot('2026-11-15', '09:30', now)).toBe(false)
  expect(isFutureOfficeSlot('2026-11-15', '11:00', now)).toBe(true)
  expect(isFutureOfficeSlot('2026-11-16', '08:00', now)).toBe(true)
  expect(isFutureOfficeSlot('not-a-date', '08:00', now)).toBe(false)
  expect(isFutureOfficeSlot('2026-11-31', '08:00', now)).toBe(false)
})
