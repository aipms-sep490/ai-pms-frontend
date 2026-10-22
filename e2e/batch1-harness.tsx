// Isolated acceptance entry: real pages, controlled HTTP; never imported by the app.
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import '../src/index.css'
import { AuthSessionContext } from '../src/features/auth/context/auth-session-context'
import { AcademicWorkflowContext } from '../src/app/context/academic-workflow-context'
import { ReviewGateGovernancePage } from '../src/features/review-gates/pages/ReviewGateGovernancePage'
import { StudentReviewTimelinePage } from '../src/features/review-gates/pages/StudentReviewTimelinePage'
import { CalendarAttentionPage } from '../src/features/calendar/CalendarAttentionPage'

const params = new URLSearchParams(location.search)
const actor = params.get('actor')
const role = actor === 'lecturer' ? 'LECTURER' : actor === 'department' ? 'DEPARTMENT_STAFF' : 'STUDENT'
const departmentIds = params.get('departments') === 'multiple' ? [1, 2] : [4]
const session = { accessToken: 'controlled-token', refreshToken: '', tokenType: 'Bearer', expiresAtUtc: '', refreshTokenExpiresAtUtc: '', user: { id: 1, email: 'controlled@example.test', fullName: 'Kiểm thử có kiểm soát', roles: [role] } }
const done = async () => {}
createRoot(document.getElementById('root')!).render(
  <MemoryRouter>
    <AuthSessionContext.Provider value={{ session, status: 'authenticated', error: null, login: async () => { throw new Error('Controlled HTTP only') }, logout: () => {}, refreshProfile: done, restoreSession: done }}>
      <AcademicWorkflowContext.Provider value={{ currentUser: session.user, workflowContext: null, academic: null, authorization: { roles: [role], permissions: [], departmentIds: role === 'DEPARTMENT_STAFF' ? departmentIds : [], majorIds: [] }, status: 'ready', error: null, errorKind: null, refresh: done }}>
        <main className="mx-auto min-w-0 max-w-7xl p-3">
          <p className="mb-3 text-sm text-ink-muted">Kiểm thử HTTP có kiểm soát · Không phải dữ liệu staging</p>
          {params.get('view') === 'builder' ? <ReviewGateGovernancePage /> : params.get('view') === 'calendar' ? <CalendarAttentionPage /> : <StudentReviewTimelinePage />}
        </main>
      </AcademicWorkflowContext.Provider>
    </AuthSessionContext.Provider>
  </MemoryRouter>,
)
