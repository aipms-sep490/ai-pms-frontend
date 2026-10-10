import { useMemo, useState } from 'react'
import { addDays, buildMonthMatrix, buildWeekDays, expandRecurrences, occurrencesOn, sameDay, ymd, type CalendarEvent } from './meeting-calendar'

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const MONTHS = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12']

interface MeetingCalendarProps {
  events: CalendarEvent[]
  /** Called with a 'YYYY-MM-DD' when a day cell is activated, to prefill the create form. */
  onPickDay: (iso: string) => void
  /** Overrides the starting month/week; defaults to today. Used by tests for a stable grid. */
  initialDate?: Date
}

/** Month/week calendar that lays out expanded meeting occurrences. Display only; no mutations. */
export function MeetingCalendar({ events, onPickDay, initialDate }: MeetingCalendarProps) {
  const [mode, setMode] = useState<'month' | 'week'>('month')
  const [anchor, setAnchor] = useState(() => initialDate ?? new Date())

  const range = useMemo(() => {
    if (mode === 'week') {
      const days = buildWeekDays(anchor)
      return { days, start: days[0], end: days[6] }
    }
    const matrix = buildMonthMatrix(anchor.getFullYear(), anchor.getMonth())
    const days = matrix.flat()
    return { days, matrix, start: days[0], end: days[days.length - 1] }
  }, [mode, anchor])

  const occurrences = useMemo(
    () => expandRecurrences(events, range.start, range.end),
    [events, range.start, range.end],
  )

  const [today] = useState(() => new Date())
  const step = mode === 'week' ? 7 : undefined
  const shiftMonth = (delta: number) => setAnchor(current => new Date(current.getFullYear(), current.getMonth() + delta, 1, 12))
  const goPrev = () => (step ? setAnchor(current => addDays(current, -step)) : shiftMonth(-1))
  const goNext = () => (step ? setAnchor(current => addDays(current, step)) : shiftMonth(1))
  const heading = mode === 'week'
    ? `Tuần ${ymd(range.start)} – ${ymd(range.end)}`
    : `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`

  const renderDay = (day: Date, muted: boolean) => {
    const items = occurrencesOn(occurrences, day)
    return (
      <button
        type="button"
        key={ymd(day)}
        className={`v5-cal-day${muted ? ' v5-cal-day--muted' : ''}${sameDay(day, today) ? ' v5-cal-day--today' : ''}`}
        aria-label={`${ymd(day)}, ${items.length} cuộc họp`}
        onClick={() => onPickDay(ymd(day))}
      >
        <span className="v5-cal-date">{day.getDate()}</span>
        <ul className="v5-cal-events">
          {items.slice(0, 3).map((item, index) => (
            <li key={`${item.id}:${index}`} className={item.cancelled ? 'v5-cal-event v5-cal-event--off' : 'v5-cal-event'}>
              <time dateTime={`${item.date}T${item.startTime}`}>{item.startTime}</time> {item.title}
              {item.recurring && <span aria-hidden="true"> ↻</span>}
            </li>
          ))}
          {items.length > 3 && <li className="v5-cal-more">+{items.length - 3} nữa</li>}
        </ul>
      </button>
    )
  }

  return (
    <section aria-label="Lịch cuộc họp fixture" className="v5-calendar">
      <div className="v5-controls v5-cal-toolbar">
        <div role="group" aria-label="Chế độ lịch">
          <button type="button" aria-pressed={mode === 'month'} onClick={() => setMode('month')}>Tháng</button>
          <button type="button" aria-pressed={mode === 'week'} onClick={() => setMode('week')}>Tuần</button>
        </div>
        <div role="group" aria-label="Điều hướng lịch">
          <button type="button" aria-label="Kỳ trước" onClick={goPrev}>←</button>
          <button type="button" onClick={() => setAnchor(new Date())}>Hôm nay</button>
          <button type="button" aria-label="Kỳ sau" onClick={goNext}>→</button>
        </div>
        <strong aria-live="polite">{heading}</strong>
      </div>
      <div className={mode === 'week' ? 'v5-cal-grid v5-cal-grid--week' : 'v5-cal-grid'} role="grid">
        {WEEKDAYS.map(label => (
          <div key={label} className="v5-cal-head" role="columnheader">{label}</div>
        ))}
        {mode === 'month'
          ? range.matrix!.flat().map(day => renderDay(day, day.getMonth() !== anchor.getMonth()))
          : range.days.map(day => renderDay(day, false))}
      </div>
      <p className="v5-cal-note">Các mục ↻ là lịch lặp fixture. Email nhắc lịch chưa gửi; cần BE delivery contract.</p>
    </section>
  )
}
