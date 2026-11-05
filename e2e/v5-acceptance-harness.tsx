// V5 E2E Acceptance Harness: renders real feature components with real Auth and Academic contexts.
import { useState, useEffect, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import '../src/index.css'
import { AuthSessionContext } from '../src/features/auth/context/auth-session-context'
import type { LoginSession } from '../src/features/auth/types/auth.types'
import { StudentJourneyContext, type StudentJourneyContextValue } from '../src/app/context/StudentJourneyContext'
import { ExecutionAccessProvider } from '../src/features/execution/context/ExecutionAccessProvider'
import { httpPost } from '../src/services/http/http-client'

// Feature pages
import { ChatPage } from '../src/features/chat/ChatPage'
import { ChatProvider } from '../src/features/chat/ChatProvider'
import { WeeklyAssessmentsPage } from '../src/features/weekly-assessments/WeeklyAssessmentsPage'
import { TaskBoardPage } from '../src/features/tasks/pages/TaskBoardPage'
import { MeetingsPage } from '../src/features/meetings/MeetingsPage'
import { ResultCorrectionsPage } from '../src/features/results/ResultCorrectionsPage'
import { WorkingAgreementWorkspace } from '../src/features/working-agreement/WorkingAgreementWorkspace'
import { ProjectDefensePage } from '../src/features/defense/ProjectDefensePage'
import { ProjectPeerEvaluationPage } from '../src/features/peer-eval/ProjectPeerEvaluationPage'
import { ColdChecklistPage } from '../src/features/cold-reports/ColdChecklistPage'
import { AcademicAssistantPage } from '../src/features/ai/AcademicAssistantPage'
import { MilestoneTemplatesPage } from '../src/features/milestones/MilestoneTemplatesPage'
import { OverviewPage } from '../src/app/pages/OverviewPage'
import { StudentReviewTimelinePage } from '../src/features/review-gates/pages/StudentReviewTimelinePage'

function Acceptance() {
  const params = new URLSearchParams(location.search)
  const view = params.get('view') || 'overview'
  const projectIdStr = params.get('projectId') || '1'
  const projectId = Number(projectIdStr)

  const [session, setSession] = useState<LoginSession | null>(() => {
    const saved = localStorage.getItem('v5-acceptance-session') || localStorage.getItem('review-gates-acceptance-session') || localStorage.getItem('ai-pms.auth-session')
    return saved ? (JSON.parse(saved) as LoginSession) : null
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (session?.accessToken) {
      localStorage.setItem('token', session.accessToken)
      localStorage.setItem('ai-pms.auth-session', JSON.stringify(session))
    }
  }, [session])

  const journeyValue: StudentJourneyContextValue = {
    journeyState: 'ACTIVE',
    profile: session ? ({ id: session.user.id, email: session.user.email, fullName: session.user.fullName, status: 'VERIFIED' } as any) : null,
    semester: { id: 1, code: 'E2E-2026', name: 'E2E Semester', status: 'ACTIVE' } as any,
    period: { id: 1, code: 'E2E-EVAL', status: 'ACTIVE' } as any,
    team: { id: 1, code: 'E2E-TEAM', name: 'E2E Team', members: [{ userId: session?.user.id ?? 1, isLeader: true }] } as any,
    project: { id: projectId, code: 'E2E-P', title: 'E2E Project Acceptance', status: 'ACTIVE', teamId: 1 } as any,
    assignments: [{ id: 1, isPrimary: true, endedAt: null }] as any,
    workflowContext: null,
    teamActions: null,
    projectActions: null,
    isLoading: false,
    error: null,
    refreshAll: async () => {},
    setSimulatedJourneyState: () => {},
  }

  const executionAccessValue = {
    project: { id: projectId, code: 'E2E-P', title: 'E2E Project Acceptance', status: 'ACTIVE', teamId: 1 } as any,
    team: { id: 1, code: 'E2E-TEAM', name: 'E2E Team', members: [{ id: 1, userId: session?.user.id ?? 1, isLeader: true, fullName: session?.user.fullName ?? 'Leader' }] } as any,
    supervisor: { id: 1, isPrimary: true, endedAt: null } as any,
    currentUserId: session?.user.id,
    actor: (session?.user.roles.some(r => r.toUpperCase() === 'LECTURER') ? 'supervisor' : 'student') as 'supervisor' | 'student',
    canManageStructure: true,
    executionCapabilities: { status: 'ready', get: () => ({ allowed: true }) } as any,
    routeBase: '/project',
  }

  function renderView() {
    switch (view) {
      case 'chat':
        return <ChatProvider><div className="p-4" data-testid="chat-container"><ChatPage /></div></ChatProvider>
      case 'tasks':
        return <div className="p-4" data-testid="tasks-container"><TaskBoardPage /></div>
      case 'meetings':
        return <div className="p-4" data-testid="meetings-container"><MeetingsPage /></div>
      case 'agreement':
        return <div className="p-4" data-testid="agreement-container"><WorkingAgreementWorkspace projectId={projectId} /></div>
      case 'peer-eval':
        return <div className="p-4" data-testid="peer-eval-container"><ProjectPeerEvaluationPage /></div>
      case 'weekly-assessments':
        return <div className="p-4" data-testid="weekly-assessments-container"><WeeklyAssessmentsPage /></div>
      case 'cold-reports':
        return <div className="p-4" data-testid="cold-reports-container"><ColdChecklistPage /></div>
      case 'defense':
        return <div className="p-4" data-testid="defense-container"><ProjectDefensePage /></div>
      case 'appeals':
      case 'corrections':
        return <div className="p-4" data-testid="appeals-container"><ResultCorrectionsPage /></div>
      case 'ai-assistant':
        return <div className="p-4" data-testid="ai-assistant-container"><AcademicAssistantPage /></div>
      case 'milestone-templates':
        return <div className="p-4" data-testid="milestone-templates-container"><MilestoneTemplatesPage /></div>
      case 'overview':
      case 'capabilities':
        return <div className="p-4" data-testid="overview-container"><OverviewPage /></div>
      case 'review-gates':
      default:
        return <div className="p-4" data-testid="review-gates-container"><StudentReviewTimelinePage /></div>
    }
  }

  return (
    <MemoryRouter initialEntries={[`/project?projectId=${projectId}`]}>
      <main className="mx-auto max-w-7xl p-3">
        <form
          className="mb-4 flex flex-wrap items-end gap-2 bg-gray-50 p-2 border rounded"
          onSubmit={async (event) => {
            event.preventDefault()
            const fields = new FormData(event.currentTarget)
            try {
              const result = await httpPost<LoginSession>(
                '/auth/login',
                { email: fields.get('email'), password: fields.get('password') },
                { skipAuthRefresh: true },
              )
              localStorage.setItem('token', result.accessToken)
              localStorage.setItem('v5-acceptance-session', JSON.stringify(result))
              localStorage.setItem('ai-pms.auth-session', JSON.stringify(result))
              setSession(result)
              setError('')
            } catch {
              setError('Không thể đăng nhập tài khoản v5 acceptance.')
            }
          }}
        >
          <label className="text-sm">
            Email
            <input className="block max-w-full border p-1 rounded" name="email" type="email" required />
          </label>
          <label className="text-sm">
            Mật khẩu
            <input className="block max-w-full border p-1 rounded" name="password" type="password" required />
          </label>
          <button type="submit" className="border px-3 py-1 rounded bg-blue-600 text-white text-sm">
            Đăng nhập acceptance
          </button>
          {session && (
            <span role="status" className="text-sm text-green-700 ml-2">
              Đã đăng nhập: {session.user.email} ({session.user.roles.join(', ')})
            </span>
          )}
        </form>
        {error && <p role="alert" className="text-red-600">{error}</p>}

        <AuthSessionContext.Provider
          value={{
            session,
            status: session ? 'authenticated' : 'unauthenticated',
            error: null,
            login: async () => { throw new Error('Use the acceptance login form') },
            logout: () => {
              localStorage.removeItem('token')
              localStorage.removeItem('v5-acceptance-session')
              setSession(null)
            },
            refreshProfile: async () => {},
            restoreSession: async () => {},
          }}
        >
          <StudentJourneyContext.Provider value={journeyValue}>
            <ExecutionAccessProvider value={executionAccessValue}>
              {session && renderView()}
            </ExecutionAccessProvider>
          </StudentJourneyContext.Provider>
        </AuthSessionContext.Provider>
      </main>
    </MemoryRouter>
  )
}

createRoot(document.getElementById('root')!).render(<Acceptance />)
