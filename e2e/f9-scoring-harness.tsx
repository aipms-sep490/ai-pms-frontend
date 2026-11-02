import { createRoot } from 'react-dom/client'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import '../src/index.css'
import { EvaluatorAssignmentRoute } from '../src/features/evaluations/components/EvaluatorAssignmentRoute'
import { EvaluatorAssignmentDetailPage } from '../src/features/evaluations/pages/EvaluatorAssignmentDetailPage'
import { AuthSessionContext } from '../src/features/auth/context/auth-session-context'
import type { AuthSessionContextValue } from '../src/features/auth/context/auth-session-context'

const session = {
  accessToken: 'fixture', tokenType: 'Bearer', expiresAtUtc: '', refreshToken: '', refreshTokenExpiresAtUtc: '',
  user: { id: 5, email: 'staff@example.test', fullName: 'Staff evaluator', roles: ['DEPARTMENT_STAFF', 'LECTURER'] },
}
const auth: AuthSessionContextValue = {
  session, status: 'authenticated', error: null,
  login: async () => session, refreshProfile: async () => {}, logout: () => {}, restoreSession: async () => {},
}

createRoot(document.getElementById('root')!).render(<AuthSessionContext.Provider value={auth}><RouterProvider router={createMemoryRouter([
  { element: <EvaluatorAssignmentRoute />, children: [{ path: '/evaluator/assignments/:assignmentId', element: <EvaluatorAssignmentDetailPage /> }] },
], { initialEntries: ['/evaluator/assignments/41'] })} /></AuthSessionContext.Provider>)
