import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthSessionContext, type AuthSessionContextValue } from '../context/auth-session-context'
import { HomeRedirect, RoleRoute } from './RoleRoute'

afterEach(cleanup)

function renderRoutes(roles: string[], initialPath: string) {
  const auth: AuthSessionContextValue = {
    session: { accessToken: 'test', tokenType: 'Bearer', expiresAtUtc: '', refreshToken: '', refreshTokenExpiresAtUtc: '', user: { id: 1, email: 'test@fe.edu.vn', fullName: 'Test', roles } },
    status: 'authenticated', error: null, login: async () => { throw new Error('unused') }, logout: () => {}, refreshProfile: async () => {},
  }
  render(<AuthSessionContext.Provider value={auth}>
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route element={<RoleRoute allowed={['student']} />}><Route path="/project/workspace" element={<p>Student workspace</p>} /></Route>
        <Route element={<RoleRoute allowed={['department']} />}><Route path="/department/projects/review" element={<p>Department review</p>} /></Route>
        <Route element={<RoleRoute allowed={['lecturer']} />}><Route path="/supervisor/workspace" element={<p>Lecturer workspace</p>} /></Route>
      </Routes>
    </MemoryRouter>
  </AuthSessionContext.Provider>)
}

describe('role route', () => {
  it('redirects department staff away from the student workspace', () => {
    renderRoutes(['DEPARTMENT_STAFF'], '/project/workspace')
    expect(screen.getByText('Department review')).toBeDefined()
    expect(screen.queryByText('Student workspace')).toBeNull()
  })

  it('redirects a lecturer away from the department review page', () => {
    renderRoutes(['LECTURER'], '/department/projects/review')
    expect(screen.getByText('Lecturer workspace')).toBeDefined()
  })

  it('resolves the root path from backend roles', () => {
    renderRoutes(['STUDENT'], '/')
    expect(screen.getByText('Student workspace')).toBeDefined()
  })
})
