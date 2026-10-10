/** Pure calendar math for the meeting fixture. No backend DTOs, no timezone library. */
export type Recurrence = 'NONE' | 'WEEKLY' | 'BIWEEKLY'

export interface CalendarEvent {
  id: number
  title: string
  /** Local 'YYYY-MM-DDTHH:mm' from a datetime-local input. */
  start: string
  end: string
  recurrence: Recurrence
  /** Inclusive 'YYYY-MM-DD' last occurrence for recurring events; ignored when NONE. */
  until?: string
  cancelled: boolean
}

export interface CalendarOccurrence {
  id: number
  title: string
  /** 'YYYY-MM-DD' of this occurrence. */
  date: string
  startTime: string
  endTime: string
  recurring: boolean
  cancelled: boolean
}

const MS_PER_DAY = 86_400_000

/** Parse 'YYYY-MM-DD' as a local date at noon to stay clear of DST edges. */
export function parseDay(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

export function ymd(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function addDays(date: Date, amount: number): Date {
  return new Date(date.getTime() + amount * MS_PER_DAY)
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Monday-based start of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)
  const weekday = (copy.getDay() + 6) % 7
  return addDays(copy, -weekday)
}

/** Six Monday-based weeks covering the month, including spill-over days. */
export function buildMonthMatrix(year: number, month: number): Date[][] {
  const first = startOfWeek(new Date(year, month, 1, 12))
  const weeks: Date[][] = []
  for (let week = 0; week < 6; week += 1) {
    weeks.push(Array.from({ length: 7 }, (_, day) => addDays(first, week * 7 + day)))
  }
  return weeks
}

export function buildWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor)
  return Array.from({ length: 7 }, (_, day) => addDays(start, day))
}

/** Expand recurring meetings into dated occurrences within [rangeStart, rangeEnd] inclusive. */
export function expandRecurrences(events: CalendarEvent[], rangeStart: Date, rangeEnd: Date): CalendarOccurrence[] {
  const occurrences: CalendarOccurrence[] = []
  for (const event of events) {
    const datePart = event.start.slice(0, 10)
    const timePart = event.start.slice(11, 16) || '00:00'
    const endTime = event.end.slice(11, 16) || timePart
    if (!datePart) continue
    const step = event.recurrence === 'WEEKLY' ? 7 : event.recurrence === 'BIWEEKLY' ? 14 : 0
    const base = parseDay(datePart)
    const until = event.recurrence === 'NONE' || !event.until ? base : parseDay(event.until)
    // Cap the loop so a far-future `until` cannot run away; the grid is at most 42 days.
    for (let cursor = base, guard = 0; cursor.getTime() <= until.getTime() && guard < 400; guard += 1) {
      if (cursor.getTime() >= rangeStart.getTime() - MS_PER_DAY && cursor.getTime() <= rangeEnd.getTime() + MS_PER_DAY) {
        occurrences.push({
          id: event.id,
          title: event.title,
          date: ymd(cursor),
          startTime: timePart,
          endTime,
          recurring: step > 0,
          cancelled: event.cancelled,
        })
      }
      if (step === 0) break
      cursor = addDays(cursor, step)
    }
  }
  return occurrences.sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)))
}

export function occurrencesOn(occurrences: CalendarOccurrence[], date: Date): CalendarOccurrence[] {
  const key = ymd(date)
  return occurrences.filter(item => item.date === key)
}
