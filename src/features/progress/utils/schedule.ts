import type { TimelineMilestoneDto } from '../../../types/backend'
import { utcTimestamp } from '../../projects/utils/collaboration-workspace'

const DAY = 86400000
export function calendarDay(value?: string | null): number | null {
  if (!value) return null
  const timestamp = /^\d{4}-\d{2}-\d{2}$/.test(value) ? Date.parse(`${value}T00:00:00Z`) : utcTimestamp(value) + 7 * 3600000
  return Number.isFinite(timestamp) ? Math.floor(timestamp / DAY) : null
}
export function dayLabel(day: number, year = false) {
  const date = new Date(day * DAY)
  return `${String(date.getUTCDate()).padStart(2,'0')}/${String(date.getUTCMonth()+1).padStart(2,'0')}${year ? `/${date.getUTCFullYear()}` : ''}`
}
export function scheduleRange(milestones: TimelineMilestoneDto[]) {
  const dates = milestones.flatMap(milestone => [milestone.startDate, milestone.dueDate, ...milestone.tasks.flatMap(task => [task.startAt, task.dueAt])])
    .map(calendarDay).filter((value): value is number => value !== null)
  if (!dates.length) return null
  const start = Math.min(...dates) - 3
  const end = Math.max(Math.max(...dates) + 3, start + 13)
  return { start, end, days: end - start + 1 }
}
export function scheduleInterval(startValue: string | null | undefined, endValue: string | null | undefined, range: { start: number; days: number }) {
  const start = calendarDay(startValue); const end = calendarDay(endValue)
  if (start === null && end === null) return { state: 'undated' as const }
  if (start !== null && end !== null && end < start) return { state: 'invalid' as const }
  const first = start ?? end!
  const last = end ?? start!
  return { state: 'dated' as const, left: (first - range.start) / range.days * 100,
    width: (last - first + 1) / range.days * 100, point: start === null || end === null,
    label: start === null ? `Hạn: ${dayLabel(end!,true)}` : end === null ? `Bắt đầu: ${dayLabel(start,true)}` : `${dayLabel(start,true)} – ${dayLabel(end,true)}` }
}
export type ScheduleScale = 'month' | 'week' | 'day'

export interface ScheduleTick {
  day: number
  label: string
  subLabel?: string
  left: number
  isWeekend?: boolean
}

export function isWeekendDay(day: number): boolean {
  // 1970-01-01 was Thursday (index 0 = Thu, 1 = Fri, 2 = Sat, 3 = Sun).
  const mod = ((day % 7) + 7) % 7
  return mod === 2 || mod === 3
}

export function scheduleTicks(range: { start: number; end: number; days: number }, scale: ScheduleScale): ScheduleTick[] {
  const ticks: ScheduleTick[] = []
  if (scale === 'day') {
    for (let day = range.start; day <= range.end; day += 1) {
      const date = new Date(day * DAY)
      const weekdayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
      ticks.push({
        day,
        label: String(date.getUTCDate()).padStart(2, '0'),
        subLabel: date.getUTCDate() === 1 || day === range.start
          ? `T${date.getUTCMonth() + 1}`
          : weekdayNames[date.getUTCDay()],
        left: (day - range.start) / range.days * 100,
        isWeekend: isWeekendDay(day),
      })
    }
  } else if (scale === 'week') {
    // 1970-01-01 was Thursday; align ticks to Monday without locale-dependent week numbers.
    for (let day = range.start + ((4 - (range.start % 7) + 7) % 7); day <= range.end; day += 7) {
      ticks.push({ day, label: dayLabel(day), left: (day - range.start) / range.days * 100 })
    }
  } else {
    const first = new Date(range.start * DAY)
    for (let year = first.getUTCFullYear(), month = first.getUTCMonth();;) {
      const day = Math.max(range.start, Math.floor(Date.UTC(year, month, 1) / DAY))
      if (day > range.end) break
      ticks.push({ day, label: `Tháng ${month + 1}/${year}`, left: (day - range.start) / range.days * 100 })
      month++; if (month === 12) { month = 0; year++ }
    }
  }
  return ticks
}

export function weekendSpans(range: { start: number; end: number; days: number }): Array<{ day: number; left: number; width: number }> {
  const spans: Array<{ day: number; left: number; width: number }> = []
  for (let day = range.start; day <= range.end; day += 1) {
    if (isWeekendDay(day)) {
      spans.push({
        day,
        left: (day - range.start) / range.days * 100,
        width: 1 / range.days * 100,
      })
    }
  }
  return spans
}

export function shiftIsoDate(value: string | null | undefined, deltaDays: number): string {
  const baseDay = calendarDay(value) ?? Math.floor((Date.now() + 7 * 3600000) / DAY)
  const next = new Date((baseDay + deltaDays) * DAY)
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`
}
