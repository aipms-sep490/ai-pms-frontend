// Acceptance entry only, never imported by the production application.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import '../src/index.css'
import { AuthSessionContext } from '../src/features/auth/context/auth-session-context'
import type { LoginSession } from '../src/features/auth/types/auth.types'
import { StudentReviewTimelinePage } from '../src/features/review-gates/pages/StudentReviewTimelinePage'
import { AssignedGateReviewPage } from '../src/features/review-gates/pages/AssignedGateReviewPage'
import { ReviewGateGovernancePage } from '../src/features/review-gates/pages/ReviewGateGovernancePage'
import { httpPost } from '../src/services/http/http-client'

function Acceptance() {
  const params = new URLSearchParams(location.search)
  const view = params.get('view') || 'student'
  const [session, setSession] = useState<LoginSession | null>(() => {
    const saved = localStorage.getItem('review-gates-acceptance-session')
    return saved ? JSON.parse(saved) as LoginSession : null
  })
  const [error, setError] = useState('')
  return <MemoryRouter initialEntries={[`/project?projectId=${params.get('projectId') || '1'}`]}>
    <main className="mx-auto max-w-7xl p-3">
      <form className="mb-4 flex flex-wrap items-end gap-2" onSubmit={async event => {
        event.preventDefault()
        const fields = new FormData(event.currentTarget)
        try {
          const result = await httpPost<LoginSession>('/auth/login', { email: fields.get('email'), password: fields.get('password') }, { skipAuthRefresh: true })
          localStorage.setItem('token', result.accessToken)
          setSession(result); setError('')
        } catch { setError('Không thể đăng nhập tài khoản acceptance.') }
      }}>
        <label className="text-sm">Email<input className="block max-w-full border p-1" name="email" type="email" required /></label>
        <label className="text-sm">Mật khẩu<input className="block max-w-full border p-1" name="password" type="password" required /></label>
        <button type="submit" className="border p-2 text-sm">Đăng nhập acceptance</button>
        {session && <span role="status" className="text-sm">Đã đăng nhập: {session.user.email}</span>}
      </form>
      {error && <p role="alert">{error}</p>}
      <AuthSessionContext.Provider value={{ session, status: session ? 'authenticated' : 'unauthenticated', error: null,
        login: async () => { throw new Error('Use the acceptance login form') }, logout: () => { localStorage.removeItem('token'); setSession(null) }, refreshProfile: async () => {}, restoreSession: async () => {} }}>
        {session && <div key={session.user.id}>
          {view === 'reviewer' ? <AssignedGateReviewPage /> : view === 'governance' ? <ReviewGateGovernancePage /> : <StudentReviewTimelinePage />}
        </div>}
      </AuthSessionContext.Provider>
    </main>
  </MemoryRouter>
}
createRoot(document.getElementById('root')!).render(<Acceptance />)
