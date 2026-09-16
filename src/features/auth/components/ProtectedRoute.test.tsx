import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'

const auth = vi.hoisted(() => ({ useAuthSession: vi.fn() }))
vi.mock('../context/useAuthSession', () => auth)

function page(status: string, path = '/project/status/123') {
  auth.useAuthSession.mockReturnValue({ status, restoreSession: vi.fn() })
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>login</p>} />
        <Route path="*" element={<ProtectedRoute><p>protected workspace</p></ProtectedRoute>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('does not flash protected UI while restoring', () => {
    page('restoring')
    expect(screen.getByText('Đang khôi phục phiên đăng nhập…')).toBeDefined()
    expect(screen.queryByText('protected workspace')).toBeNull()
  })

  it('blocks anonymous navigation at login', () => {
    page('unauthenticated')
    expect(screen.getByText('login')).toBeDefined()
  })

  it('allows authenticated navigation', () => {
    page('authenticated')
    expect(screen.getByText('protected workspace')).toBeDefined()
  })
})
