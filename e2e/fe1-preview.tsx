// Development-only harness. No production router, credentials or backend writes.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom'
import '../src/index.css'
import '../src/features/projects/pages/collaboration-workspace.css'
import '../src/features/execution/execution.css'
import { ExecutionAccessProvider } from '../src/features/execution/context/ExecutionAccessProvider'
import { TaskBoardPage } from '../src/features/tasks/pages/TaskBoardPage'
import { ProgressReportDetailPage } from '../src/features/reports/ProgressReportDetailPage'
import { TeamInvitationsPanel } from '../src/features/teams/components/TeamInvitationsPanel'
import type { ExecutionAccess } from '../src/features/execution/context/ExecutionAccessContext'
import { AuthSessionContext } from '../src/features/auth/context/auth-session-context'
import { ProfilePage } from '../src/features/auth/pages/ProfilePage'
import { updateMyProfile } from '../src/features/auth/api/auth-api'

const query = new URLSearchParams(location.search)
const scenario = query.get('scenario') || 'leader'
const view = query.get('view') || 'tasks'
const readOnly = scenario === 'readonly'
const denied = scenario === 'denied'
const paged = (items: unknown[]) => ({ items, totalCount: items.length, totalPages: 1, page: 1, pageSize: 100 })
const task = { id: 1, projectId: 9, milestoneId: 3, title: 'Kiểm thử luồng nhóm và báo cáo', description: 'Dữ liệu fixture trong bộ nhớ', status: 'TODO', priority: 'MEDIUM', assignees: [], concurrencyToken: 'fixture-task' }
const cycle = { id: 101, projectId: 9, reportType: 'WEEKLY', periodStart: '2026-10-19', periodEnd: '2026-10-25', deadline: '2099-10-27T23:59:59', latePolicy: 'BLOCK', concurrencyToken: 'fixture-cycle' }
let report = { id: 17, projectId: 9, submittedBy: 2, submittedByName: 'Leader thử nghiệm', reportType: 'WEEKLY', periodStart: cycle.periodStart, periodEnd: cycle.periodEnd, status: 'DRAFT', summary: 'Báo cáo thử nghiệm', feedbacks: [], concurrencyToken: 'fixture-report' }
let profile = { id: 2, fullName: 'Leader thử nghiệm', email: 'leader@example.test', roles: ['STUDENT'], phone: '0901234567', title: 'Sinh viên' }
const nativeFetch = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.origin)
  if (url.origin !== location.origin) throw new Error('External request blocked in FE1 fixture')
  if (!url.pathname.startsWith('/api/')) return nativeFetch(input, init)
  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
  if (scenario === 'error') return json({ title: 'Fixture service unavailable', status: 503 }, 503)
  const method = init?.method ?? 'GET'
  if (method !== 'GET' && denied) return json({ title: 'Forbidden', status: 403 }, 403)
  if (url.pathname.endsWith('/users/me/academic-profile')) return json({ status: 'VERIFIED', departmentName: 'Công nghệ thông tin', majorName: 'Kỹ thuật phần mềm' })
  if (url.pathname.endsWith('/users/me/profile')) { if (method === 'PUT') profile = { ...profile, ...JSON.parse(String(init?.body)) }; return json(profile) }
  if (url.pathname.endsWith('/tasks/project/9')) return json(paged([task]))
  if (url.pathname.endsWith('/milestones/project/9')) return json([{ id: 3, title: 'Kiểm thử', status: 'PLANNED' }])
  if (url.pathname.includes('reporting-cycles')) return json(paged([cycle]))
  if (url.pathname.endsWith('/progress-reports') && method === 'GET') return json(paged([]))
  if (url.pathname.endsWith('/progress-reports') && method === 'POST') { report = { ...report, ...JSON.parse(String(init?.body)) }; return json(report) }
  if (url.pathname.endsWith('/submit')) { report = { ...report, status: 'SUBMITTED' }; return json(report) }
  if (url.pathname.endsWith('/progress-reports/17')) return json(report)
  return json({ title: `Unconfigured fixture: ${url.pathname}`, status: 501 }, 501)
}

const access = {
  project: { id: 9, teamId: 12, title: 'Đồ án FE1 — dữ liệu kiểm thử', status: readOnly ? 'FINAL_SUBMISSION' : 'ACTIVE', majors: [] },
  team: { id: 12, members: [{ userId: 2, fullName: 'Leader thử nghiệm', isLeader: true }, { userId: 3, fullName: 'Thành viên chưa có task', isLeader: false }] },
  actor: readOnly ? 'supervisor' : 'student', currentUserId: 2, canManageStructure: !denied && !readOnly, readOnly,
  executionCapabilities: { status: 'ready', get: () => ({ state: denied ? 'denied' : 'allowed', allowed: !denied, reasons: [] }) },
  routeBase: '/project',
} as ExecutionAccess

export function Invitations() {
  const [sent, setSent] = useState([{ id: 1, teamId: 12, invitedUserId: 3, invitedBy: 2, status: 'PENDING', message: '<script>không thực thi</script>', createdAt: '2026-10-25T08:00:00', expiresAt: '2099-10-27T08:00:00', teamName: 'Nhóm FE1', invitedByName: 'Leader thử nghiệm', invitedUserName: 'Thành viên chưa có task' }])
  return <TeamInvitationsPanel sentInvitations={sent} receivedInvitations={[]} candidates={paged([])} candidateSearch="" candidateLoading={false} isLeader={!denied} rosterLocked={readOnly} onCandidateSearchChange={() => {}} onCandidatePageChange={() => {}} onRetryCandidates={() => {}} isMutationPending={() => false} onCancelInvitation={async id => setSent(items => items.map(item => item.id === id ? { ...item, status: 'CANCELLED' } : item))} onAcceptInvitation={async () => {}} onRejectInvitation={async () => {}} />
}
export function Shell() {
  const [user, setUser] = useState(profile)
  const session = { user, accessToken: 'fixture-only', refreshToken: 'fixture-only', tokenType: 'Bearer', expiresAtUtc: '2099-01-01T00:00:00Z', refreshTokenExpiresAtUtc: '2099-01-01T00:00:00Z' }
  const labels: Record<string, string> = { tasks: 'Công việc', report: 'Báo cáo', invitations: 'Lời mời', profile: 'Hồ sơ', leader: 'Leader', denied: 'Bị từ chối', readonly: 'GVHD chỉ xem', error: 'Lỗi dịch vụ' }
  return <main className="mx-auto max-w-6xl p-4"><aside className="mb-4 rounded-lg border p-4"><strong>FIXTURE · {labels[scenario]} · Không phải nghiệm thu BE thật</strong><p>Dữ liệu chỉ trong bộ nhớ; tải lại để đặt lại. Không cần đăng nhập, không ghi vào staging.</p><nav className="mt-3 flex flex-wrap gap-4">{['tasks', 'report', 'invitations', 'profile'].map(value => <a key={value} href={`?view=${value}&scenario=${scenario}`}>{labels[value]}</a>)}{['leader', 'denied', 'readonly', 'error'].map(value => <a key={value} href={`?view=${view}&scenario=${value}`}>{labels[value]}</a>)}</nav></aside><AuthSessionContext.Provider value={{ session, status: 'authenticated', error: null, login: async () => session, logout: () => {}, restoreSession: async () => {}, refreshProfile: async () => setUser({ ...profile }), updateProfile: async value => { const updated = await updateMyProfile(value); setUser(updated as typeof profile); return updated } }}><ExecutionAccessProvider value={access}><Outlet /></ExecutionAccessProvider></AuthSessionContext.Provider></main>
}
const router = createMemoryRouter([{ element: <Shell />, children: [{ path: '/project/tasks', element: <TaskBoardPage /> }, { path: '/project/reports/new', element: <ProgressReportDetailPage create /> }, { path: '/project/reports/:reportId', element: <ProgressReportDetailPage /> }, { path: '/project/invitations', element: <Invitations /> }, { path: '/project/profile', element: <ProfilePage /> }] }], { initialEntries: [view === 'report' ? '/project/reports/new' : `/project/${view}`] })
if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />)
