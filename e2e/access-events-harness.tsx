import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import '../src/index.css'
import '../src/features/users/pages/admin-workspace.css'
import { AuthSessionContext } from '../src/features/auth/context/auth-session-context'
import { AccessEventsPanel } from '../src/features/users/components/AccessEventsPanel'

const session = {
  accessToken: 'controlled-admin-token', refreshToken: '', tokenType: 'Bearer',
  expiresAtUtc: '', refreshTokenExpiresAtUtc: '',
  user: { id: 1, email: 'admin@example.test', fullName: 'Controlled Admin', roles: ['ADMIN'] },
}
const done = async () => {}
createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={['/admin/access?tab=access']}>
    <AuthSessionContext.Provider value={{ session, status: 'authenticated', error: null,
      login: async () => { throw new Error('Controlled HTTP only') }, logout: () => {},
      refreshProfile: done, restoreSession: done }}>
      <main className="admin-workspace mx-auto max-w-7xl p-3"><AccessEventsPanel /></main>
    </AuthSessionContext.Provider>
  </MemoryRouter>,
)
