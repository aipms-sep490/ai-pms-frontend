import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { WorkspaceTabs } from './WorkspaceTabs'

afterEach(cleanup)

function TabsHarness() {
  const [active, setActive] = useState<'overview' | 'list' | 'settings'>('overview')
  return (
    <WorkspaceTabs
      activeId={active}
      onChange={setActive}
      tabs={[
        { id: 'overview', label: 'Tổng quan', icon: 'dashboard', count: 4 },
        { id: 'list', label: 'Danh sách', icon: 'list', count: 12, badgeTone: 'warning' },
        { id: 'settings', label: 'Cấu hình', icon: 'tune' },
      ]}
    />
  )
}

describe('WorkspaceTabs', () => {
  it('supports WAI-ARIA roving tabindex and Arrow/Home/End keyboard navigation', () => {
    render(<TabsHarness />)
    const overview = screen.getByRole('tab', { name: /Tổng quan/ })
    const list = screen.getByRole('tab', { name: /Danh sách/ })
    const settings = screen.getByRole('tab', { name: /Cấu hình/ })

    expect(overview.getAttribute('aria-selected')).toBe('true')
    expect(overview.tabIndex).toBe(0)
    expect(list.tabIndex).toBe(-1)
    expect(settings.tabIndex).toBe(-1)

    overview.focus()
    fireEvent.keyDown(overview, { key: 'ArrowRight' })
    expect(list.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(list)
    expect(list.tabIndex).toBe(0)
    expect(overview.tabIndex).toBe(-1)

    fireEvent.keyDown(list, { key: 'End' })
    expect(settings.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(settings)

    fireEvent.keyDown(settings, { key: 'ArrowRight' })
    expect(overview.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(overview)

    fireEvent.keyDown(overview, { key: 'ArrowLeft' })
    expect(settings.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(settings)

    fireEvent.keyDown(settings, { key: 'Home' })
    expect(overview.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(overview)
  })
})
