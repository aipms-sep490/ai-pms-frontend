import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { BackLink } from './BackLink'

const originalState = window.history.state
afterEach(() => { cleanup(); window.history.replaceState(originalState, '') })

function mount(entries: string[], index?: number) {
  window.history.replaceState(index === undefined ? {} : { idx: index }, '')
  const router = createMemoryRouter([
    { path: '/reports', element: <h1>Danh sách báo cáo</h1> },
    { path: '/notifications', element: <h1>Thông báo trước đó</h1> },
    { path: '/detail', element: <BackLink fallback="/reports">Quay lại</BackLink> },
  ], { initialEntries: entries, initialIndex: entries.length - 1 })
  render(<RouterProvider router={router} />)
  return router
}

describe('BackLink', () => {
  it('returns to the actual previous page instead of the fixed fallback', async () => {
    mount(['/notifications', '/detail'], 1)
    fireEvent.click(screen.getByRole('link', { name: 'Quay lại' }))
    expect(await screen.findByRole('heading', { name: 'Thông báo trước đó' })).toBeTruthy()
  })

  it.each([0, undefined])('uses an in-app fallback for a direct entry (index %s)', async index => {
    const router = mount(['/detail'], index)
    fireEvent.click(screen.getByRole('link', { name: 'Quay lại' }))
    expect(await screen.findByRole('heading', { name: 'Danh sách báo cáo' })).toBeTruthy()
    expect(router.state.historyAction).toBe('REPLACE')
  })

  it('preserves opening the fallback in a new tab', () => {
    const router = mount(['/notifications', '/detail'], 1)
    const link = screen.getByRole('link', { name: 'Quay lại' })
    expect(link.getAttribute('href')).toBe('/reports')
    fireEvent.click(link, { ctrlKey: true })
    expect(router.state.location.pathname).toBe('/detail')
  })
})
