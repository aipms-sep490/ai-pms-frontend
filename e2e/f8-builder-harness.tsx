import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import '../src/index.css'
import { AuthSessionContext, type AuthSessionContextValue } from '../src/features/auth/context/auth-session-context'
import { RubricManagementPage } from '../src/features/evaluations/RubricManagementPage'

const auth: AuthSessionContextValue = { session: null, status: 'unauthenticated', error: null,
  login: async () => { throw new Error('Controlled fixture has no login') }, refreshProfile: async () => {}, restoreSession: async () => {}, logout: () => {} }
createRoot(document.getElementById('root')!).render(<AuthSessionContext.Provider value={auth}><MemoryRouter><RubricManagementPage /></MemoryRouter></AuthSessionContext.Provider>)
