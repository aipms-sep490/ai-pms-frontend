import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import '../../src/index.css'
import { AuthSessionContext, type AuthSessionContextValue } from '../../src/features/auth/context/auth-session-context'
import { RubricManagementPage } from '../../src/features/evaluations/RubricManagementPage'

const auth: AuthSessionContextValue = {
  session: null, status: 'unauthenticated', error: null,
  login: async () => { throw new Error('Fixture does not log in') }, logout: async () => {}, refreshProfile: async () => {}, restoreSession: async () => {},
}
createRoot(document.getElementById('root')!).render(<AuthSessionContext.Provider value={auth}>
  <MemoryRouter><main className="mx-auto max-w-6xl p-4 sm:p-8"><p className="mb-4 text-xs text-slate-600">Rubric fixture · API mô phỏng</p><RubricManagementPage /></main></MemoryRouter>
</AuthSessionContext.Provider>)
