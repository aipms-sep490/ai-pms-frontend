import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ChangeDiff } from './ChangeDiff'

afterEach(cleanup)

const rows = [
  { label: 'Ngày', before: '30/03/2026', after: '22/03/2026' },
  { label: 'Phòng', before: 'A612', after: 'A612' },
]

describe('ChangeDiff', () => {
  it('marks only changed rows as changed', () => {
    const { container } = render(<ChangeDiff rows={rows} />)
    expect(container.querySelectorAll('[data-changed="true"]')).toHaveLength(1)
  })

  it('renders a dash when there is no previous value', () => {
    render(<ChangeDiff rows={[{ label: 'Phòng', before: null, after: 'A201' }]} />)
    expect(screen.getByText('—')).toBeTruthy()
  })

  it('uses supplied group labels for versioned revisions', () => {
    render(<ChangeDiff rows={rows} beforeLabel="PHIÊN BẢN 2" afterLabel="ĐỀ XUẤT v3" />)
    expect(screen.getByText('PHIÊN BẢN 2')).toBeTruthy()
    expect(screen.getByText('ĐỀ XUẤT v3')).toBeTruthy()
  })

  it('preserves zero as an actual value', () => {
    render(<ChangeDiff rows={[{ label: 'Điểm', before: 0, after: 1 }]} />)
    expect(screen.getByText('0')).toBeTruthy()
  })
})
