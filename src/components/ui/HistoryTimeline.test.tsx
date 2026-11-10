import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { HistoryTimeline } from './HistoryTimeline'

afterEach(cleanup)

describe('HistoryTimeline', () => {
  it('renders the newest event first with its actor and time', () => {
    render(<HistoryTimeline items={[
      { at: '2026-03-18T09:00:00Z', actor: 'Mai', action: 'Tạo yêu cầu' },
      { at: '2026-03-20T09:00:00Z', actor: 'An', action: 'Duyệt yêu cầu' },
    ]} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText('Duyệt yêu cầu')).toBeTruthy()
    expect(within(items[0]).getByText('An')).toBeTruthy()
    expect(within(items[0]).getByText('An').closest('li')?.querySelector('time')?.getAttribute('dateTime')).toBe('2026-03-20T09:00:00Z')
  })

  it('omits the note block when no note was supplied', () => {
    const { container } = render(<HistoryTimeline items={[{ at: '2026-03-20T09:00:00Z', actor: 'An', action: 'Duyệt yêu cầu' }]} />)
    expect(container.querySelector('[data-history-note]')).toBeNull()
  })

  it('shows the specified empty message for an empty history', () => {
    render(<HistoryTimeline items={[]} emptyLabel="Chưa có lịch sử xử lý." />)
    expect(screen.getByRole('status').textContent).toBe('Chưa có lịch sử xử lý.')
  })
})
