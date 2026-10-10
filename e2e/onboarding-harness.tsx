// Browser-only fixture. Vite's production entry does not import this file.
// It mounts the REAL onboarding provider/overlay/launcher against the same
// data-tour anchors the app shell exposes, so the tour engine, spotlight,
// keyboard flow and persistence are exercised in a real browser. No API calls.
import { createRoot } from 'react-dom/client'
import '../src/index.css'
import { AuthSessionContext, type AuthSessionContextValue } from '../src/features/auth/context/auth-session-context'
import type { LoginSession } from '../src/features/auth/types/auth.types'
import { TourProvider } from '../src/features/onboarding/TourProvider'
import { TourLauncher } from '../src/features/onboarding/TourLauncher'

const params = new URLSearchParams(location.search)
const role = (params.get('role') ?? 'student').toUpperCase()

const session: LoginSession = {
  accessToken: 'synthetic-browser-fixture', refreshToken: 'synthetic-browser-fixture', tokenType: 'Bearer',
  expiresAtUtc: '2099-01-01T00:00:00Z', refreshTokenExpiresAtUtc: '2099-01-01T00:00:00Z',
  user: { id: 777, email: 'fixture@example.test', fullName: 'Người dùng thử nghiệm', roles: [role] },
}
const auth: AuthSessionContextValue = {
  session, status: 'authenticated', error: null,
  login: async () => { throw new Error('Fixture has no real login') },
  refreshProfile: async () => {}, restoreSession: async () => {}, logout: () => {},
}

createRoot(document.getElementById('root')!).render(
  <AuthSessionContext.Provider value={auth}>
    <TourProvider>
      <div style={{ minHeight: '100vh', display: 'flex' }}>
        <aside data-tour="sidebar" aria-label="Menu điều hướng chính" style={{ width: 240, borderRight: '1px solid var(--color-hairline)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#fff' }}>
          <nav style={{ padding: 12 }}>
            <a data-tour="sidebar-primary" href="#primary" style={{ display: 'block', padding: '8px 10px', borderRadius: 8, background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', fontWeight: 600 }}>Mục chính</a>
          </nav>
          <div data-tour="profile" style={{ padding: 12, borderTop: '1px solid var(--color-hairline)' }}>Tài khoản</div>
        </aside>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <header style={{ height: 48, borderBottom: '1px solid var(--color-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: '#fff' }}>
            <nav data-tour="breadcrumb" aria-label="Đường dẫn điều hướng breadcrumb">AI-PMS / Thử nghiệm</nav>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button data-tour="quick-nav" type="button" aria-label="Tìm chức năng">Tìm</button>
              <TourLauncher />
              <button data-tour="notifications" type="button" aria-label="Thông báo">Thông báo</button>
            </div>
          </header>
          <main style={{ flex: 1, padding: 24 }} id="primary"><h1>Không gian làm việc thử nghiệm</h1></main>
        </div>
      </div>
    </TourProvider>
  </AuthSessionContext.Provider>,
)
