import { createRoot } from 'react-dom/client'
import { AuthSessionContext, type AuthSessionContextValue } from '../../src/features/auth/context/auth-session-context'
import { TourProvider } from '../../src/features/onboarding/TourProvider'
import { TourLauncher } from '../../src/features/onboarding/TourLauncher'

const session: NonNullable<AuthSessionContextValue['session']> = {
  accessToken: 'fixture', tokenType: 'Bearer', expiresAtUtc: '2027-01-01T00:00:00Z',
  refreshToken: 'fixture', refreshTokenExpiresAtUtc: '2027-01-08T00:00:00Z',
  user: { id: 101, email: 'student@example.test', fullName: 'Student', roles: ['STUDENT'] },
}
const auth: AuthSessionContextValue = {
  session, status: 'authenticated', error: null,
  login: async () => session, refreshProfile: async () => {}, logout: async () => {}, restoreSession: async () => {},
}

createRoot(document.getElementById('root')!).render(
  <AuthSessionContext.Provider value={auth}>
    <TourProvider>
      <div style={{ padding: 24 }}><aside data-tour="sidebar" style={{ minHeight: 200, width: 160, background: '#f3f6fa' }}>Menu</aside><TourLauncher /></div>
    </TourProvider>
  </AuthSessionContext.Provider>,
)
