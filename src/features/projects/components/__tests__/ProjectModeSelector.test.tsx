import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ProjectModeSelector } from '../ProjectModeSelector'

afterEach(() => {
  cleanup()
})

describe('ProjectModeSelector', () => {
  it('renders single-major as the selected mode', () => {
    const onSelect = vi.fn()
    render(<ProjectModeSelector selectedMode="SINGLE_MAJOR" onSelectMode={onSelect} />)

    expect(screen.getByText('Đơn ngành (Single Major)')).toBeDefined()
    expect(screen.getByText('MỘT CHUYÊN NGÀNH')).toBeDefined()
    expect(screen.getAllByRole('radio')[0]).toHaveProperty('checked', true)
  })

  it('allows interdisciplinary mode when the team scope is not locked', () => {
    const onSelect = vi.fn()
    render(<ProjectModeSelector selectedMode="SINGLE_MAJOR" onSelectMode={onSelect} />)

    fireEvent.click(screen.getAllByRole('radio')[1])
    expect(onSelect).toHaveBeenCalledWith('INTERDISCIPLINARY')
  })

  it('locks both modes after the team academic scope is configured', () => {
    render(<ProjectModeSelector selectedMode="INTERDISCIPLINARY" onSelectMode={vi.fn()} disabled />)
    expect(screen.getAllByRole('radio').every((radio) => (radio as HTMLInputElement).disabled)).toBe(true)
  })
})
