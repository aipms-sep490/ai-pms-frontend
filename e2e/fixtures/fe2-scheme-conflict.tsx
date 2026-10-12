// Test-only entry: production page with intercepted API, not app authorization acceptance.
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '../../src/index.css'
import { AuthSessionContext, type AuthSessionContextValue } from '../../src/features/auth/context/auth-session-context'
import { EvaluationSchemeManagementPage } from '../../src/features/evaluations/EvaluationSchemeManagementPage'

const auth: AuthSessionContextValue = {
  session: {
    accessToken: 'fixture-only', tokenType: 'Bearer', expiresAtUtc: '', refreshToken: '', refreshTokenExpiresAtUtc: '',
    user: { id: 3, fullName: 'Department fixture', email: 'fixture@example.test', roles: ['DEPARTMENT_STAFF'] },
  },
  status: 'authenticated', error: null,
  login: async () => { throw new Error('Fixture does not log in') }, logout: async () => {}, refreshProfile: async () => {}, restoreSession: async () => {},
}
createRoot(document.getElementById('root')!).render(<AuthSessionContext.Provider value={auth}>
  <MemoryRouter initialEntries={['/department/projects/2/evaluation-schemes']}>
    <main className="mx-auto max-w-6xl p-4 sm:p-8"><p className="mb-4 text-xs text-slate-600">FE2 component fixture · API mô phỏng · Không chứng nhận BE thật</p>
      <Routes><Route path="/department/projects/:projectId/evaluation-schemes" element={<EvaluationSchemeManagementPage />} /></Routes>
    </main>
  </MemoryRouter>
</AuthSessionContext.Provider>)
