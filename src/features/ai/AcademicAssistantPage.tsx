import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { StudentJourneyContext } from '../../app/context/StudentJourneyContext'
import { useAuthSession } from '../auth/context/useAuthSession'
import {
  deleteAssistantConversation,
  downloadAssistantConversation,
  listAssistantConversations,
  listAssistantProjects,
  updateAssistantConversation,
  type AssistantConversation,
  type AssistantDraft,
  type AssistantProjectOption,
} from './academic-ai-api'
import type { EvidenceReference } from './ai-api'
import { AcademicAssistantPanel } from './components/AcademicAssistantPanel'
import { AssistantSidebar } from './components/AssistantSidebar'
import { AssistantSourceInspector, type InspectedSource } from './components/AssistantSourceInspector'
import { Modal } from '../../components/ui/Modal'
import './assistant-dock.css'

export function AcademicAssistantPage() {
  const { session } = useAuthSession()
  const journey = useContext(StudentJourneyContext)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const urlProjectId = Number(searchParams.get('projectId')) || undefined
  const urlConvId = Number(searchParams.get('conversationId')) || undefined

  const [projects, setProjects] = useState<AssistantProjectOption[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(urlProjectId ?? journey?.project?.id)
  const [conversations, setConversations] = useState<AssistantConversation[]>([])
  const [convLoading, setConvLoading] = useState(false)
  const [moreHistory, setMoreHistory] = useState(false)
  const [search, setSearch] = useState('')
  const [activeConvId, setActiveConvId] = useState<number | null | undefined>(urlConvId)
  const [inspected, setInspected] = useState<InspectedSource | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<AssistantConversation | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const cancelDeleteRef = useRef<HTMLButtonElement>(null)

  const roles = (session?.user.roles ?? []).map(r => r.toUpperCase())
  const isStaffOrAdmin = roles.includes('DEPARTMENT_STAFF') || roles.includes('ADMIN')
  const isLecturer = roles.includes('LECTURER')
  const isStudent = roles.includes('STUDENT')

  useEffect(() => {
    const controller = new AbortController()
    setProjectsLoading(true)
    listAssistantProjects(controller.signal)
      .then(items => {
        if (!controller.signal.aborted) setProjects(items)
      })
      .catch(() => { /* optional project picker */ })
      .finally(() => { if (!controller.signal.aborted) setProjectsLoading(false) })
    return () => controller.abort()
  }, [session?.user.id])

  const refreshConversations = useCallback(async (more = false, searchText = search) => {
    setConvLoading(true)
    try {
      const beforeId = more ? conversations.at(-1)?.id : undefined
      const items = await listAssistantConversations(selectedProjectId, beforeId, undefined, searchText || undefined)
      setConversations(curr => more ? [...curr, ...items] : items)
      setMoreHistory(items.length >= 20)
    } catch {
      /* handled softly */
    } finally {
      setConvLoading(false)
    }
  }, [selectedProjectId, search, conversations])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshConversations(false, search)
    }, search ? 220 : 0)
    return () => window.clearTimeout(timer)
  }, [selectedProjectId, search])

  const syncUrl = (nextProjectId?: number, nextConvId?: number | null) => {
    const next = new URLSearchParams()
    if (nextProjectId) next.set('projectId', String(nextProjectId))
    if (nextConvId) next.set('conversationId', String(nextConvId))
    setSearchParams(next, { replace: true })
  }

  const handleSelectProject = (nextProjectId?: number) => {
    setSelectedProjectId(nextProjectId)
    setActiveConvId(null)
    setInspected(null)
    syncUrl(nextProjectId, null)
  }

  const handleNewChat = () => {
    setActiveConvId(null)
    setInspected(null)
    setMobileDrawerOpen(false)
    syncUrl(selectedProjectId, null)
  }

  const handleSelectConversation = (id: number) => {
    setActiveConvId(id)
    setInspected(null)
    setMobileDrawerOpen(false)
    syncUrl(selectedProjectId, id)
  }

  const handleConversationChange = (conv: AssistantConversation | null) => {
    if (!conv) return
    setActiveConvId(conv.id)
    syncUrl(selectedProjectId, conv.id)
    setConversations(curr => {
      const exists = curr.some(c => c.id === conv.id)
      const next = exists ? curr.map(c => c.id === conv.id ? { ...c, ...conv } : c) : [conv, ...curr]
      return next.sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)))
    })
  }

  const handleTogglePin = async (item: AssistantConversation) => {
    const updated = await updateAssistantConversation(item.id, { isPinned: !item.isPinned })
    setConversations(curr =>
      curr.map(c => c.id === item.id ? updated : c)
        .sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned))),
    )
  }

  const handleRename = async (item: AssistantConversation, title: string) => {
    const updated = await updateAssistantConversation(item.id, { title })
    setConversations(curr => curr.map(c => c.id === item.id ? updated : c))
  }

  const handleExportConversation = async (item: AssistantConversation, format: 'md' | 'docx' | 'pdf') => {
    const blob = await downloadAssistantConversation(item.id, format)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = `hoi-thoai-tro-ly-ai.${format}`
    document.body.appendChild(link); link.click(); link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const confirmDelete = async () => {
    if (!pendingDelete || deleteBusy) return
    setDeleteBusy(true); setDeleteError(null)
    try {
      await deleteAssistantConversation(pendingDelete.id)
      setConversations(curr => curr.filter(c => c.id !== pendingDelete.id))
      if (activeConvId === pendingDelete.id) {
        setActiveConvId(null)
        syncUrl(selectedProjectId, null)
      }
      setPendingDelete(null)
    } catch {
      setDeleteError('Chưa xóa được hội thoại. Vui lòng thử lại.')
    } finally {
      setDeleteBusy(false)
    }
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId)
  const routeBase = selectedProjectId
    ? (isStudent && journey?.project?.id === selectedProjectId
      ? '/project'
      : isLecturer
      ? `/supervisor/projects/${selectedProjectId}`
      : isStaffOrAdmin
      ? `/department/projects/${selectedProjectId}`
      : undefined)
    : undefined

  const canApplyProjectSetup = Boolean(
    selectedProjectId && (
      (isStudent && journey?.project?.id === selectedProjectId && journey?.team?.members.some(m => m.userId === session?.user.id && m.isLeader))
      || isLecturer
    ),
  )

  const handleUseDraft = (draft: AssistantDraft) => {
    if (!routeBase || !selectedProjectId) return
    const target = draft.kind === 'TASK' ? 'tasks' : draft.kind === 'WEEKLY_REPORT' ? 'reports/new' : draft.kind === 'MEETING_MINUTES' ? 'meetings' : 'meetings/new'
    navigate(`${routeBase}/${target}`, { state: { assistantDraft: { ...draft, projectId: selectedProjectId } } })
  }

  const handleOpenTarget = (target: string, resourceId?: number | null) => {
    if (!routeBase || !selectedProjectId) return
    const allowed = new Set(['tasks', 'milestones', 'meetings', 'reports', 'deliverables', 'cold-reports', 'timeline', 'final-submission', 'files', 'agreement'])
    if (!allowed.has(target)) return
    const supportsDetail = ['tasks', 'milestones', 'meetings', 'reports'].includes(target) && typeof resourceId === 'number' && Number.isSafeInteger(resourceId) && resourceId > 0
    navigate(`${routeBase}/${target}${supportsDetail ? `/${resourceId}` : ''}`)
  }

  const handleOpenEvidence = (evidence: EvidenceReference) => {
    const url = evidence.referenceUrl ?? ''
    const detail = url.match(/^\/api\/v1\/(tasks|milestones|meetings|progress-reports)\/(\d+)$/)
    if (detail) { handleOpenTarget(detail[1] === 'progress-reports' ? 'reports' : detail[1], Number(detail[2])); return }
    if (/^\/api\/v1\/deliverables\/\d+$/.test(url)) { handleOpenTarget('deliverables'); return }
    if (url.includes('/cold/')) { handleOpenTarget('cold-reports'); return }
    if (url.includes('/review-gates')) { handleOpenTarget('timeline'); return }
    if (url.includes('/evidence')) { handleOpenTarget('files'); return }
  }

  const activeConversationObj = conversations.find(c => c.id === activeConvId)

  return (
    <div className={`assistant-workspace${sidebarOpen ? '' : ' is-sidebar-collapsed'}${inspected ? ' has-inspector' : ''}`}>
      {pendingDelete && (
        <Modal
          open
          title="Xóa hội thoại?"
          description="Hội thoại sẽ bị xóa khỏi lịch sử của bạn."
          busy={deleteBusy}
          initialFocusRef={cancelDeleteRef}
          onClose={() => setPendingDelete(null)}
        >
          <p className="break-words rounded-xl border border-hairline bg-primary-subtle p-4 text-sm font-semibold text-ink">
            {pendingDelete.title}
          </p>
          {deleteError && <p role="alert" className="mt-3 text-sm text-status-error-text">{deleteError}</p>}
          <div className="app-modal__actions">
            <button ref={cancelDeleteRef} type="button" className="app-modal__button" disabled={deleteBusy} onClick={() => setPendingDelete(null)}>Hủy</button>
            <button type="button" className="app-modal__button app-modal__button--danger" disabled={deleteBusy} onClick={() => void confirmDelete()}>
              {deleteBusy ? 'Đang xóa…' : 'Xóa hội thoại'}
            </button>
          </div>
        </Modal>
      )}

      {mobileDrawerOpen && (
        <div className="assistant-workspace-backdrop" onClick={() => setMobileDrawerOpen(false)} aria-hidden="true" />
      )}

      <div className={`assistant-workspace-rail${mobileDrawerOpen ? ' is-mobile-open' : ''}`}>
        <AssistantSidebar
          conversations={conversations}
          activeConversationId={activeConvId}
          loading={convLoading}
          hasMore={moreHistory}
          search={search}
          onSearchChange={setSearch}
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
          onLoadMore={() => void refreshConversations(true, search)}
          onTogglePin={handleTogglePin}
          onRenameConversation={handleRename}
          onExportConversation={handleExportConversation}
          onRequestDelete={item => { setDeleteError(null); setPendingDelete(item) }}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={handleSelectProject}
          projectsLoading={projectsLoading}
        />
      </div>

      <div className="assistant-workspace-main">
        <header className="assistant-workspace-topbar">
          <div className="assistant-workspace-topbar-left">
            <button
              type="button"
              className="assistant-topbar-icon-btn is-desktop-toggle"
              aria-label={sidebarOpen ? 'Thu gọn danh sách hội thoại' : 'Mở danh sách hội thoại'}
              title={sidebarOpen ? 'Thu gọn danh sách' : 'Mở danh sách hội thoại'}
              onClick={() => setSidebarOpen(v => !v)}
            >
              <span className="material-symbols-outlined" aria-hidden="true">dock_to_right</span>
            </button>
            <button
              type="button"
              className="assistant-topbar-icon-btn is-mobile-toggle"
              aria-label="Mở danh sách hội thoại"
              onClick={() => setMobileDrawerOpen(v => !v)}
            >
              <span className="material-symbols-outlined" aria-hidden="true">menu</span>
            </button>
            <div className="min-w-0">
              <div className="assistant-workspace-title-row">
                <h1>{activeConversationObj?.title || 'Trợ lý AI-PMS'}</h1>
                <span className="assistant-scope-badge" title={selectedProject ? `${selectedProject.code} · ${selectedProject.title}` : 'Hỏi đáp học vụ chung'}>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {selectedProjectId ? 'folder_open' : 'school'}
                  </span>
                  <span className="assistant-scope-badge-text">
                    {selectedProject ? `${selectedProject.code} · ${selectedProject.title}` : 'Hỏi đáp học vụ chung'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="assistant-workspace-topbar-right">
            {activeConversationObj && (
              <button
                type="button"
                className="assistant-topbar-pill-btn"
                onClick={() => void handleExportConversation(activeConversationObj, 'docx')}
              >
                <span className="material-symbols-outlined" aria-hidden="true">download</span>
                <span>Xuất hội thoại</span>
              </button>
            )}
            <button type="button" className="assistant-topbar-pill-btn is-primary" onClick={handleNewChat}>
              <span className="material-symbols-outlined" aria-hidden="true">add</span>
              <span>Hội thoại mới</span>
            </button>
          </div>
        </header>

        <div className="assistant-workspace-body">
          <AcademicAssistantPanel
            key={selectedProjectId ?? 'general'}
            layout="fullscreen"
            dock
            projectId={selectedProjectId}
            pageContext={selectedProject ? `Đồ án ${selectedProject.code}` : 'Trợ lý AI toàn màn hình'}
            allowReportForm={routeBase === '/project'}
            canApplyProjectSetup={canApplyProjectSetup}
            canApplyRubricSetup={isStaffOrAdmin}
            academicSemesterId={journey?.semester?.id}
            userDisplayName={session?.user.fullName}
            userRoles={session?.user.roles}
            externalConversationId={activeConvId}
            onConversationChange={handleConversationChange}
            onInspectSource={setInspected}
            onUseDraft={routeBase && selectedProjectId ? handleUseDraft : undefined}
            onOpenEvidence={routeBase && selectedProjectId ? handleOpenEvidence : undefined}
            onOpenTarget={routeBase && selectedProjectId ? handleOpenTarget : undefined}
            onOpenRubrics={isStaffOrAdmin ? () => navigate('/academic/rubrics') : undefined}
          />
        </div>
      </div>

      {inspected && (
        <div className="assistant-workspace-inspector">
          <AssistantSourceInspector
            inspected={inspected}
            mode="sidepanel"
            onClose={() => setInspected(null)}
            onOpenEvidence={routeBase && selectedProjectId ? handleOpenEvidence : undefined}
          />
        </div>
      )}
    </div>
  )
}
