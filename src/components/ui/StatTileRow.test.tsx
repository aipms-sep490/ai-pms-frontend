import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { StatTileRow } from './StatTileRow'

afterEach(cleanup)

describe('StatTileRow', () => {
  it('renders zero as a value and null as missing data', () => {
    render(<StatTileRow tiles={[{ icon: 'done', label: 'Đạt', value: 0 }, { icon: 'grade', label: 'GPA', value: null }]} />)
    expect(screen.getByText('0')).toBeTruthy()
    expect(screen.getByText('—')).toBeTruthy()
  })

  it('promotes only the first requested hero tile', () => {
    const { container } = render(<StatTileRow tiles={[{ icon: 'a', label: 'A', value: 1, hero: true }, { icon: 'b', label: 'B', value: 2, hero: true }]} />)
    expect(container.querySelectorAll('[data-hero="true"]')).toHaveLength(1)
  })

  it('renders no more than four tiles', () => {
    render(<StatTileRow tiles={Array.from({ length: 6 }, (_, index) => ({ icon: 'info', label: `Tile ${index}`, value: index }))} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    expect(screen.queryByText('Tile 5')).toBeNull()
  })

  it('keeps the supplied scope caption visible', () => {
    render(<StatTileRow tiles={[{ icon: 'folder', label: 'Đồ án', value: 3, caption: 'Các đồ án bạn hướng dẫn trong kỳ SP26' }]} />)
    expect(screen.getByText('Các đồ án bạn hướng dẫn trong kỳ SP26')).toBeTruthy()
  })

  it('supports interactive click handlers and active state', () => {
    let clicked = false
    render(<StatTileRow tiles={[{ icon: 'task', label: 'Quá hạn', value: 4, active: true, onClick: () => { clicked = true } }]} />)
    const btn = screen.getByRole('button', { name: /quá hạn/i })
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    btn.click()
    expect(clicked).toBe(true)
  })
})
