// Browser fixture only; never imported by the production entry. The runner intercepts every API request.
import { createRoot } from 'react-dom/client'
import '../src/index.css'
import { AuthSessionContext, type AuthSessionContextValue } from '../src/features/auth/context/auth-session-context'
import { DepartmentDocumentsPage } from '../src/features/department-documents/DepartmentDocumentsPage'

const fixtureAllowed = (window as Window & { __AIPMS_DOCUMENT_FIXTURE__?: boolean }).__AIPMS_DOCUMENT_FIXTURE__ === true
const auth: AuthSessionContextValue = {
  session: { accessToken: 'controlled-document-fixture', refreshToken: 'controlled-document-fixture', tokenType: 'Bearer',
    expiresAtUtc: '2099-01-01T00:00:00Z', refreshTokenExpiresAtUtc: '2099-01-01T00:00:00Z',
    user: { id: 2, fullName: 'Cán bộ bộ môn kiểm thử', email: 'fixture@example.test', roles: ['DEPARTMENT_STAFF'] } },
  status: 'authenticated', error: null,
  login: async () => { throw new Error('Controlled fixture has no real login') },
  refreshProfile: async () => {}, restoreSession: async () => {}, logout: () => {},
}

createRoot(document.getElementById('root')!).render(fixtureAllowed
  ? <AuthSessionContext.Provider value={auth}><main className="mx-auto max-w-7xl p-4 sm:p-6">
      <p role="status" className="mb-4 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm">
        Dữ liệu mô phỏng để kiểm tra giao diện; mọi API được chặn trong runner.
      </p>
      <DepartmentDocumentsPage manager />
    </main></AuthSessionContext.Provider>
  : <main className="p-6"><h1>Fixture tài liệu đã khóa</h1><p>Chỉ mở từ bài kiểm thử Playwright có HTTP intercept.</p></main>)
