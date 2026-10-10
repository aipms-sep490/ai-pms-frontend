import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MeetingCalendar } from './MeetingCalendar'
import type { CalendarEvent } from './meeting-calendar'

const events: CalendarEvent[] = [
  { id: 1, title: 'Sync nhóm', start: '2026-10-12T09:00', end: '2026-10-12T10:00', recurrence: 'WEEKLY', until: '2026-10-26', cancelled: false },
]
afterEach(cleanup)

describe('MeetingCalendar fixture', () => {
  it('renders recurring occurrences and never claims email delivery', () => {
    render(<MeetingCalendar events={events} onPickDay={() => {}} initialDate={new Date(2026, 9, 10)} />)
    expect(screen.getAllByText('Sync nhóm').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Email nhắc lịch chưa gửi/)).toBeTruthy()
  })

  it('switches to the week view', () => {
    render(<MeetingCalendar events={events} onPickDay={() => {}} initialDate={new Date(2026, 9, 10)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tuần' }))
    expect((screen.getByRole('button', { name: 'Tuần' }) as HTMLButtonElement).getAttribute('aria-pressed')).toBe('true')
  })

  it('emits the picked day as an ISO date', () => {
    const onPickDay = vi.fn()
    render(<MeetingCalendar events={events} onPickDay={onPickDay} initialDate={new Date(2026, 9, 10)} />)
    fireEvent.click(screen.getByRole('button', { name: /^2026-10-12,/ }))
    expect(onPickDay).toHaveBeenCalledWith('2026-10-12')
  })
})
