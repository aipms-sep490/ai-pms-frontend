import { useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import type { AssistantConversation, AssistantDraft } from './academic-ai-api'
import type { EvidenceReference } from './ai-api'
import { env } from '../../app/config/env'
import { StudentJourneyContext } from '../../app/context/StudentJourneyContext'
import { useAuthSession } from '../auth/context/useAuthSession'
import { AcademicAssistantPanel } from './components/AcademicAssistantPanel'
import { ProjectProgressAnalysisPanel } from './components/ProjectProgressAnalysisPanel'
import { WorkflowAssistancePanel } from './components/WorkflowAssistancePanel'
import { assistantOpenEvent, chatDockExpandedEvent, chatDockStateRequestEvent, floatingPanelEvent } from './assistant-dock-events'
import './assistant-dock.css'

export function AssistantDock() {
  const { session } = useAuthSession()
  const journey = useContext(StudentJourneyContext)
  const { pathname, state } = useLocation()
  if (!env.academicAiAssistantEnabled || env.isMockMode || !session) return null
  if (pathname === '/academic/assistant') return null
  const roles = session.user.roles.map(role => role.toUpperCase())
  if (!roles.some(role => ['STUDENT', 'LECTURER', 'ADMIN', 'DEPARTMENT_STAFF'].includes(role))) return null
  const routeProject = pathname.match(/^\/(?:supervisor|mentor|department)\/projects\/(\d+)(?:\/|$)/)?.[1]
  const studentProject = /^\/project(?:\/|$)/.test(pathname) && !journey?.isLoading && !journey?.error ? journey?.project?.id : undefined
  const projectId = routeProject ? Number(routeProject) : studentProject
  const scopeKey = `${session.user.id}:${projectId ? journey?.semester?.id ?? 'none' : 'general'}:${projectId ?? 'general'}`
  const pageLabels: Record<string, string> = { tasks: 'Công việc', meetings: 'Cuộc họp', deliverables: 'Minh chứng bàn giao', overview: 'Tổng quan', milestones: 'Mốc tiến độ', evaluations: 'Chấm điểm', results: 'Kết quả', team: 'Nhóm', ai: 'Trợ lý và phân tích', workspace: 'Không gian làm việc', 'cold-reports': 'Chấm nguội', timeline: 'Review Gates', rubrics: 'Bộ tiêu chí' }
  const pageContext = pathname.split('/').map(part => pageLabels[part]).filter(Boolean).join(' / ') || 'Hỏi đáp chung'
  const routeBase = pathname.startsWith('/project/') ? '/project' : pathname.match(/^\/supervisor\/projects\/\d+/)?.[0]
  const workflowBase = routeBase ?? pathname.match(/^\/department\/projects\/\d+/)?.[0] ?? pathname.match(/^\/mentor\/projects\/\d+\/majors\/\d+/)?.[0]
  const isStudentLeader = Boolean(routeBase === '/project' && journey?.team?.members.some(member => member.userId === session.user.id && member.isLeader))
  const canApplyProjectSetup = Boolean(projectId && (isStudentLeader || pathname.startsWith('/supervisor/projects/')))
  const canApplyRubricSetup = roles.includes('DEPARTMENT_STAFF') || roles.includes('ADMIN')
  return createPortal(
    <SessionAssistantDock
      key={session.user.id}
      scopeKey={scopeKey}
      projectId={projectId}
      pageContext={pageContext}
      routeBase={routeBase}
      workflowBase={workflowBase}
      canApplyProjectSetup={canApplyProjectSetup}
      canApplyRubricSetup={canApplyRubricSetup}
      academicSemesterId={journey?.semester?.id}
      userDisplayName={session.user.fullName}
      userRoles={session.user.roles}
      autoOpen={state?.openAssistant === true}
    />,
    document.body,
  )
}

function SessionAssistantDock({
  scopeKey,
  projectId,
  autoOpen,
  pageContext,
  routeBase,
  workflowBase,
  canApplyProjectSetup,
  canApplyRubricSetup,
  academicSemesterId,
  userDisplayName,
  userRoles,
}: {
  scopeKey: string
  projectId?: number
  autoOpen: boolean
  pageContext: string
  routeBase?: string
  workflowBase?: string
  canApplyProjectSetup: boolean
  canApplyRubricSetup: boolean
  academicSemesterId?: number
  userDisplayName?: string
  userRoles?: readonly string[]
}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const fullPageChat = pathname === '/messages' || pathname.startsWith('/messages/')
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [chatExpanded, setChatExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [reset, setReset] = useState(0)
  const activeConversationRef = useRef<AssistantConversation | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const launcher = useRef<HTMLButtonElement>(null)

  const show = () => {
    setMounted(true)
    setOpen(true)
    setChatExpanded(false)
    window.dispatchEvent(new CustomEvent(floatingPanelEvent, { detail: 'assistant' }))
  }
  const hide = () => {
    setOpen(false)
    launcher.current?.focus()
  }

  const openFullScreen = () => {
    const params = new URLSearchParams()
    if (projectId) params.set('projectId', String(projectId))
    if (activeConversationRef.current?.id) params.set('conversationId', String(activeConversationRef.current.id))
    hide()
    navigate(`/academic/assistant${params.toString() ? `?${params}` : ''}`)
  }

  const useDraft = (draft: AssistantDraft) => {
    if (!routeBase || !projectId) return
    hide()
    const target = draft.kind === 'TASK' ? 'tasks' : draft.kind === 'WEEKLY_REPORT' ? 'reports/new' : draft.kind === 'MEETING_MINUTES' ? 'meetings' : 'meetings/new'
    navigate(`${routeBase}/${target}`, { state: { assistantDraft: { ...draft, projectId } } })
  }

  const openTarget = (target: string, resourceId?: number | null) => {
    const base = routeBase ?? workflowBase
    if (!base || !projectId) return
    const allowedTargets = new Set(['tasks', 'milestones', 'meetings', 'reports', 'deliverables', 'cold-reports', 'timeline', 'final-submission', 'files', 'agreement'])
    if (!allowedTargets.has(target)) return
    hide()
    const supportsDetail = ['tasks', 'milestones', 'meetings', 'reports'].includes(target) && typeof resourceId === 'number' && Number.isSafeInteger(resourceId) && resourceId > 0
    navigate(`${base}/${target}${supportsDetail ? `/${resourceId}` : ''}`)
  }

  const openEvidence = (evidence: EvidenceReference) => {
    const url = evidence.referenceUrl ?? ''
    const detail = url.match(/^\/api\/v1\/(tasks|milestones|meetings|progress-reports)\/(\d+)$/)
    if (detail) {
      openTarget(detail[1] === 'progress-reports' ? 'reports' : detail[1], Number(detail[2]))
      return
    }
    if (/^\/api\/v1\/deliverables\/\d+$/.test(url)) { openTarget('deliverables'); return }
    if (url.includes('/cold/')) { openTarget('cold-reports'); return }
    if (url.includes('/review-gates')) { openTarget('timeline'); return }
    if (url.includes('/evidence')) { openTarget('files'); return }
  }

  const openRubrics = () => { hide(); navigate('/academic/rubrics') }

  useEffect(() => { if (autoOpen) show() }, [autoOpen])

  // Global keyboard shortcut: Alt + A toggles the assistant dock
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        setOpen(prev => {
          if (prev) return false
          setMounted(true)
          setChatExpanded(false)
          window.dispatchEvent(new CustomEvent(floatingPanelEvent, { detail: 'assistant' }))
          return true
        })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const openChat = () => show()
    const otherPanel = (event: Event) => { if ((event as CustomEvent).detail !== 'assistant') setOpen(false) }
    const chatState = (event: Event) => setChatExpanded((event as CustomEvent).detail === true)
    window.addEventListener(assistantOpenEvent, openChat)
    window.addEventListener(floatingPanelEvent, otherPanel)
    window.addEventListener(chatDockExpandedEvent, chatState)
    window.dispatchEvent(new Event(chatDockStateRequestEvent))
    return () => {
      window.removeEventListener(assistantOpenEvent, openChat)
      window.removeEventListener(floatingPanelEvent, otherPanel)
      window.removeEventListener(chatDockExpandedEvent, chatState)
    }
  }, [])

  useEffect(() => {
    const panel = dialog.current
    if (!panel) return
    const media = window.matchMedia('(max-width: 700px)')
    const previous = document.body.style.overflow
    let locked = false
    const sync = () => {
      if (panel.open) panel.close()
      if (locked) { document.body.style.overflow = previous; locked = false }
      if (open) {
        if (media.matches) { panel.showModal(); document.body.style.overflow = 'hidden'; locked = true } else panel.show()
        panel.querySelector<HTMLTextAreaElement>('textarea')?.focus()
      }
    }
    sync(); media.addEventListener('change', sync)
    return () => { media.removeEventListener('change', sync); if (panel.open) panel.close(); if (locked) document.body.style.overflow = previous }
  }, [open])

  useEffect(() => {
    const viewport = window.visualViewport
    const resize = () => {
      dialog.current?.style.setProperty('--assistant-height', `${viewport?.height ?? window.innerHeight}px`)
      dialog.current?.style.setProperty('--assistant-top', `${viewport?.offsetTop ?? 0}px`)
    }
    resize(); viewport?.addEventListener('resize', resize); viewport?.addEventListener('scroll', resize)
    return () => { viewport?.removeEventListener('resize', resize); viewport?.removeEventListener('scroll', resize) }
  }, [])

  return (
    <div className="assistant-dock">
      <dialog
        ref={dialog}
        id="assistant-dock-dialog"
        aria-labelledby="assistant-dock-title"
        className={`assistant-dock-dialog${expanded ? ' is-expanded' : ''}`}
        onClose={() => setOpen(false)}
        onCancel={event => { if (event.target === event.currentTarget) { event.preventDefault(); hide() } }}
        onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); hide() } }}
      >
        <header className="assistant-dock-header">
          <span className="assistant-avatar material-symbols-outlined" aria-hidden="true">auto_awesome</span>
          <div className="assistant-dock-heading">
            <div className="assistant-dock-title-row">
              <h2 id="assistant-dock-title">Trợ lý AI</h2>
              <span className="assistant-brand-pill">AI-PMS</span>
            </div>
            <p>{projectId ? 'Phân tích đồ án · Đọc tệp & tự động setup' : 'Hỗ trợ học vụ · Đọc ảnh, tài liệu & đồ án'}</p>
          </div>
          <button type="button" aria-label="Mở toàn màn hình" title="Mở không gian AI toàn màn hình" onClick={openFullScreen}>
            <span className="material-symbols-outlined" aria-hidden="true">open_in_new</span>
          </button>
          <button
            type="button"
            className="assistant-expand-btn"
            aria-label={expanded ? 'Thu gọn khung trợ lý' : 'Mở rộng khung trợ lý'}
            title={expanded ? 'Thu gọn khung' : 'Mở rộng khung'}
            onClick={() => setExpanded(value => !value)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">{expanded ? 'close_fullscreen' : 'open_in_full'}</span>
          </button>
          <button type="button" aria-label="Cuộc trò chuyện mới" title="Cuộc trò chuyện mới" onClick={() => { activeConversationRef.current = null; setReset(value => value + 1) }}>
            <span className="material-symbols-outlined" aria-hidden="true">edit_square</span>
          </button>
          <button type="button" aria-label="Thu nhỏ trợ lý AI" title="Thu nhỏ" onClick={hide}>
            <span className="material-symbols-outlined" aria-hidden="true">remove</span>
          </button>
          <button type="button" aria-label="Đóng trợ lý AI" title="Đóng" onClick={hide}>
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </header>
        {mounted && (
          <AssistantDockContent
            key={scopeKey}
            projectId={projectId}
            reset={reset}
            workflowBase={workflowBase}
            onNavigate={path => { hide(); navigate(path) }}
            allowReportForm={routeBase === '/project'}
            canApplyProjectSetup={canApplyProjectSetup}
            canApplyRubricSetup={canApplyRubricSetup}
            academicSemesterId={academicSemesterId}
            userDisplayName={userDisplayName}
            userRoles={userRoles}
            onConversationChange={conv => { activeConversationRef.current = conv }}
            pageContext={pageContext}
            onUseDraft={routeBase && projectId ? useDraft : undefined}
            onOpenEvidence={(routeBase ?? workflowBase) && projectId ? openEvidence : undefined}
            onOpenTarget={(routeBase ?? workflowBase) && projectId ? openTarget : undefined}
            onOpenRubrics={canApplyRubricSetup ? openRubrics : undefined}
          />
        )}
      </dialog>
      {!chatExpanded && (!fullPageChat || open) && (
        <button
          ref={launcher}
          type="button"
          className="assistant-launcher"
          aria-label={open ? 'Thu nhỏ trợ lý AI' : 'Mở trợ lý AI'}
          aria-expanded={open}
          aria-controls="assistant-dock-dialog"
          title="Trợ lý AI (Alt + A)"
          onClick={open ? hide : show}
        >
          <span className="material-symbols-outlined" aria-hidden="true">{open ? 'expand_more' : 'auto_awesome'}</span>
          <span className="assistant-launcher-badge" aria-hidden="true">AI</span>
        </button>
      )}
    </div>
  )
}

function AssistantDockContent({
  projectId,
  reset,
  pageContext,
  allowReportForm,
  canApplyProjectSetup,
  canApplyRubricSetup,
  academicSemesterId,
  userDisplayName,
  userRoles,
  onConversationChange,
  onUseDraft,
  onOpenEvidence,
  onOpenTarget,
  onOpenRubrics,
  workflowBase,
  onNavigate,
}: {
  projectId?: number
  reset: number
  pageContext: string
  allowReportForm: boolean
  canApplyProjectSetup: boolean
  canApplyRubricSetup: boolean
  academicSemesterId?: number
  userDisplayName?: string
  userRoles?: readonly string[]
  onConversationChange?: (conv: AssistantConversation | null) => void
  workflowBase?: string
  onNavigate: (path: string) => void
  onUseDraft?: (draft: AssistantDraft) => void
  onOpenEvidence?: (evidence: EvidenceReference) => void
  onOpenTarget?: (target: string, resourceId?: number | null) => void
  onOpenRubrics?: () => void
}) {
  const [view, setView] = useState<'chat' | 'risk' | 'workflow'>('chat')
  const [riskOpened, setRiskOpened] = useState(false)
  const hasRisk = env.aiProgressRiskEnabled && !!projectId
  const showRisk = hasRisk && view === 'risk'
  const showWorkflow = !!projectId && view === 'workflow'
  useEffect(() => { setView('chat') }, [reset])

  return (
    <>
      {projectId && (
        <nav className="assistant-view-switch" aria-label="Chức năng trợ lý">
          <button type="button" aria-pressed={!showRisk && !showWorkflow} onClick={() => setView('chat')}>
            <span className="material-symbols-outlined" aria-hidden="true">chat_bubble</span>Trò chuyện
          </button>
          {hasRisk && (
            <button type="button" aria-pressed={showRisk} onClick={() => { setRiskOpened(true); setView('risk') }}>
              <span className="material-symbols-outlined" aria-hidden="true">monitoring</span>Rủi ro &amp; tiến độ
            </button>
          )}
          <button type="button" aria-pressed={showWorkflow} onClick={() => setView('workflow')}>
            <span className="material-symbols-outlined" aria-hidden="true">checklist</span>Hỗ trợ nghiệp vụ
          </button>
        </nav>
      )}
      <div className="assistant-chat-view" hidden={showRisk || showWorkflow}>
        <AcademicAssistantPanel
          allowReportForm={allowReportForm}
          canApplyProjectSetup={canApplyProjectSetup}
          canApplyRubricSetup={canApplyRubricSetup}
          academicSemesterId={academicSemesterId}
          userDisplayName={userDisplayName}
          userRoles={userRoles}
          onConversationChange={onConversationChange}
          key={reset}
          projectId={projectId}
          pageContext={pageContext}
          onUseDraft={onUseDraft}
          onOpenEvidence={onOpenEvidence}
          onOpenTarget={onOpenTarget}
          onOpenRubrics={onOpenRubrics}
          dock
        />
      </div>
      {hasRisk && riskOpened && (
        <div className="assistant-risk-view" hidden={!showRisk}>
          <ProjectProgressAnalysisPanel projectId={projectId!} dock />
        </div>
      )}
      {showWorkflow && (
        <WorkflowAssistancePanel projectId={projectId!} routeBase={workflowBase} onNavigate={onNavigate} onUseDraft={onUseDraft} />
      )}
    </>
  )
}
