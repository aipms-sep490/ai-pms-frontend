import { formatMeetingTime } from '../../meetings/meeting-utils'
import './lecturer-workspace.css'
import { displayLabel } from '../../../components/ui/display-label'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { FilterToolbar } from '../../../components/ui/FilterToolbar'
import { ListLoading } from '../../../components/ui/ListLoading'
import { Modal } from '../../../components/ui/Modal'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { WorkspaceEmptyState } from '../../../components/ui/WorkspaceState'
import { useSupervisorInbox } from '../hooks/useSupervisorInbox'
import { useSupervisorProjectSummaries, type SupervisorProjectResource } from '../hooks/useSupervisorProjectSummaries'
import { projectStatusLabel } from '../../projects/utils/project-status'

type WorkspaceTab = 'projects' | 'requests' | 'leader-changes'
type ProjectStatusFilter = 'ALL' | 'ACTIVE' | 'FINALSUBMISSION' | 'COMPLETED' | 'OTHER'
type ProjectRoleFilter = 'ALL' | 'PRIMARY' | 'MENTOR' | 'CO'
type ProjectSort = 'default' | 'attention' | 'title'
type RequestStatusFilter = 'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED'

type PendingDecision =
  | { kind: 'supervision'; requestId: number; decision: 'accept' | 'reject'; title: string; subtitle: string }
  | { kind: 'leader-change'; requestId: number; decision: 'approve' | 'reject'; title: string; subtitle: string }

function formatVnDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
}

function statusTone(normalized?: string): 'success' | 'info' | 'warning' | 'neutral' {
  if (normalized === 'ACTIVE') return 'success'
  if (normalized === 'FINALSUBMISSION') return 'info'
  if (normalized === 'SUPERVISORPENDING' || normalized === 'UNDERREVIEW') return 'warning'
  return 'neutral'
}

export function LecturerWorkspacePage() {
  const inbox = useSupervisorInbox()
  const projectSummaries = useSupervisorProjectSummaries(inbox.assignments, inbox.projects ?? {})
  const assignedProjects = useMemo(
    () => [...new Set(inbox.assignments.map(item => item.projectId))]
      .map(projectId => inbox.assignments.filter(item => item.projectId === projectId)),
    [inbox.assignments],
  )
  const leaderChangeRequests = inbox.leaderChangeRequests ?? []

  const [tabOverride, setTabOverride] = useState<WorkspaceTab | null>(null)
  const defaultTab: WorkspaceTab = assignedProjects.length > 0 ? 'projects' : 'requests'
  const activeTab = tabOverride ?? defaultTab

  const [projectSearch, setProjectSearch] = useState('')
  const [projectStatus, setProjectStatus] = useState<ProjectStatusFilter>('ALL')
  const [projectRole, setProjectRole] = useState<ProjectRoleFilter>('ALL')
  const [projectSort, setProjectSort] = useState<ProjectSort>('default')

  const [requestSearch, setRequestSearch] = useState('')
  const [requestStatus, setRequestStatus] = useState<RequestStatusFilter>('ALL')

  const [pendingDecision, setPendingDecision] = useState<PendingDecision | null>(null)
  const [decisionNote, setDecisionNote] = useState('')

  const pendingRequestCount = useMemo(
    () => inbox.requests.filter((r) => r.status === 'PENDING').length,
    [inbox.requests],
  )

  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase()
    const list = assignedProjects.filter((assignments) => {
      const primary = assignments.find(item => item.isPrimary && !item.endedAt) ?? assignments.find(item => !item.endedAt) ?? assignments[0]
      const project = inbox.projects?.[primary.projectId]
      const team = project ? inbox.teams?.[project.teamId] : null
      const normalized = project?.status?.replaceAll('_', '').toUpperCase() ?? ''

      if (projectStatus === 'ACTIVE' && normalized !== 'ACTIVE') return false
      if (projectStatus === 'FINALSUBMISSION' && normalized !== 'FINALSUBMISSION') return false
      if (projectStatus === 'COMPLETED' && normalized !== 'COMPLETED' && normalized !== 'ARCHIVED') return false
      if (projectStatus === 'OTHER' && ['ACTIVE', 'FINALSUBMISSION', 'COMPLETED', 'ARCHIVED'].includes(normalized)) return false

      if (projectRole === 'PRIMARY' && !assignments.some(a => a.isPrimary)) return false
      if (projectRole === 'MENTOR' && !assignments.some(a => a.assignmentType === 'DISCIPLINE_MENTOR')) return false
      if (projectRole === 'CO' && !assignments.some(a => !a.isPrimary && a.assignmentType !== 'DISCIPLINE_MENTOR')) return false

      if (!q) return true
      return (project?.title ?? '').toLowerCase().includes(q)
        || (project?.code ?? '').toLowerCase().includes(q)
        || (team?.name ?? project?.teamName ?? '').toLowerCase().includes(q)
    })

    if (projectSort === 'title') {
      return [...list].sort((a, b) => {
        const pa = inbox.projects?.[a[0].projectId]?.title ?? ''
        const pb = inbox.projects?.[b[0].projectId]?.title ?? ''
        return pa.localeCompare(pb, 'vi')
      })
    }
    if (projectSort === 'attention') {
      return [...list].sort((a, b) => {
        const sa = projectSummaries[a[0].projectId]?.attention
        const sb = projectSummaries[b[0].projectId]?.attention
        const ca = sa?.state === 'ready' ? sa.data.overdue + sa.data.blocked : -1
        const cb = sb?.state === 'ready' ? sb.data.overdue + sb.data.blocked : -1
        return cb - ca
      })
    }
    return list
  }, [assignedProjects, inbox.projects, inbox.teams, projectRole, projectSearch, projectSort, projectStatus, projectSummaries])

  const filteredRequests = useMemo(() => {
    const q = requestSearch.trim().toLowerCase()
    return [...inbox.requests]
      .filter((req) => {
        if (requestStatus !== 'ALL' && req.status !== requestStatus) return false
        if (!q) return true
        const project = inbox.projects?.[req.projectId]
        const team = project ? inbox.teams?.[project.teamId] : null
        return (project?.title ?? '').toLowerCase().includes(q)
          || (project?.code ?? '').toLowerCase().includes(q)
          || (team?.name ?? '').toLowerCase().includes(q)
          || (req.requestMessage ?? '').toLowerCase().includes(q)
      })
      .sort((a, b) => Number(b.status === 'PENDING') - Number(a.status === 'PENDING'))
  }, [inbox.projects, inbox.requests, inbox.teams, requestSearch, requestStatus])

  const requestCounts = useMemo(() => {
    const c = { ALL: inbox.requests.length, PENDING: 0, ACCEPTED: 0, REJECTED: 0 }
    for (const r of inbox.requests) {
      if (r.status === 'PENDING') c.PENDING += 1
      else if (r.status === 'ACCEPTED' || r.status === 'APPROVED') c.ACCEPTED += 1
      else if (r.status === 'REJECTED') c.REJECTED += 1
    }
    return c
  }, [inbox.requests])

  const openSupervisionDecision = (requestId: number, decision: 'accept' | 'reject') => {
    const request = inbox.requests.find((item) => item.id === requestId)
    if (!request) return
    const project = inbox.projects?.[request.projectId]
    setDecisionNote('')
    setPendingDecision({
      kind: 'supervision',
      requestId,
      decision,
      title: decision === 'accept' ? 'Nhận hướng dẫn đồ án?' : 'Từ chối yêu cầu hướng dẫn?',
      subtitle: project?.title ?? 'Xác nhận quyết định đối với yêu cầu hướng dẫn này.',
    })
  }

  const openLeaderDecision = (requestId: number, decision: 'approve' | 'reject') => {
    const request = leaderChangeRequests.find((item) => item.id === requestId)
    const team = request ? inbox.teams?.[request.teamId] : null
    setDecisionNote('')
    setPendingDecision({
      kind: 'leader-change',
      requestId,
      decision,
      title: decision === 'approve' ? 'Chấp thuận thay đổi trưởng nhóm?' : 'Từ chối thay đổi trưởng nhóm?',
      subtitle: team ? `Nhóm ${team.name} — quyết định áp dụng ngay cho đề nghị đang xử lý.` : 'Quyết định này áp dụng cho đề nghị đang được xử lý.',
    })
  }

  const confirmDecision = async () => {
    if (!pendingDecision) return
    const note = decisionNote.trim() || undefined
    if (pendingDecision.kind === 'supervision') {
      const request = inbox.requests.find((item) => item.id === pendingDecision.requestId)
      if (!request) return
      const ok = await inbox.respond(request, pendingDecision.decision, note)
      if (ok !== false) setPendingDecision(null)
    } else {
      await inbox.respondToLeaderChange(pendingDecision.requestId, pendingDecision.decision, note)
      setPendingDecision(null)
    }
  }

  const decisionBusy = inbox.acceptPending !== null || inbox.rejectPending !== null

  const projectActiveChips = [
    ...(projectSearch.trim() ? [{ id: 'search', label: 'Từ khóa', value: projectSearch.trim() }] : []),
    ...(projectStatus !== 'ALL' ? [{ id: 'status', label: 'Trạng thái', value: ({ ACTIVE: 'Đang thực hiện', FINALSUBMISSION: 'Bàn giao cuối kỳ', COMPLETED: 'Đã hoàn thành', OTHER: 'Giai đoạn khác' })[projectStatus] }] : []),
    ...(projectRole !== 'ALL' ? [{ id: 'role', label: 'Vai trò', value: ({ PRIMARY: 'Hướng dẫn chính', MENTOR: 'Hướng dẫn chuyên ngành', CO: 'Đồng hướng dẫn' })[projectRole] }] : []),
  ]

  const requestActiveChips = [
    ...(requestSearch.trim() ? [{ id: 'search', label: 'Từ khóa', value: requestSearch.trim() }] : []),
    ...(requestStatus !== 'ALL' ? [{ id: 'status', label: 'Trạng thái', value: displayLabel(requestStatus) }] : []),
  ]

  if (inbox.error?.kind === 'authentication') return <p className="p-6"><Link to="/login">Đăng nhập lại để tiếp tục.</Link></p>

  return (
    <WorkspacePage
      size="wide"
      className="lecturer-workspace space-y-6"
      title="Hướng dẫn đồ án"
      eyebrow="Giảng viên hướng dẫn"
      description="Theo dõi tiến độ, góp ý cho nhóm và xử lý các đề nghị hướng dẫn."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/review/gate-assignments" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-hairline bg-card px-3.5 py-2 text-xs font-semibold text-ink-soft hover:border-primary hover:bg-primary-subtle hover:text-primary">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">fact_check</span>
            Cổng thẩm định
          </Link>
          <Link to="/evaluator/workspace" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-hairline bg-card px-3.5 py-2 text-xs font-semibold text-ink-soft hover:border-primary hover:bg-primary-subtle hover:text-primary">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">grading</span>
            Đánh giá đồ án
          </Link>
          <Button variant="secondary" icon="refresh" disabled={inbox.loading} onClick={() => void inbox.refresh()}>Tải lại</Button>
        </div>
      }
    >
      {inbox.error ? <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{inbox.error.message}</section> : null}

      <StatTileRow
        tiles={[
          { icon: 'folder_managed', label: 'Đồ án được phân công', value: assignedProjects.length, hero: true, caption: 'Tổng số đồ án trong phạm vi hướng dẫn.' },
          { icon: 'mail', label: 'Yêu cầu chờ phản hồi', value: pendingRequestCount, tone: pendingRequestCount > 0 ? 'warning' : 'neutral', caption: `${inbox.requests.length} tổng yêu cầu hướng dẫn.` },
          { icon: 'manage_accounts', label: 'Đề nghị đổi trưởng nhóm', value: leaderChangeRequests.length, tone: leaderChangeRequests.length > 0 ? 'warning' : 'neutral', caption: leaderChangeRequests.length > 0 ? 'Cần xem xét và phê duyệt.' : 'Không có đề nghị tồn đọng.' },
        ]}
      />

      <div role="tablist" aria-label="Khu vực làm việc giảng viên" className="flex flex-wrap items-center gap-2 border-b border-hairline pb-3">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'projects'}
          onClick={() => setTabOverride('projects')}
          className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'projects' ? 'bg-primary text-white shadow-xs' : 'border border-hairline bg-card text-ink-soft hover:border-primary hover:text-primary'}`}
        >
          <span>Đồ án đang hướng dẫn</span>
          <span className={`rounded-full px-2 py-0.5 font-mono text-xs font-bold ${activeTab === 'projects' ? 'bg-white/20 text-white' : 'bg-canvas text-ink-soft'}`}>{assignedProjects.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'requests'}
          onClick={() => setTabOverride('requests')}
          className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'requests' ? 'bg-primary text-white shadow-xs' : 'border border-hairline bg-card text-ink-soft hover:border-primary hover:text-primary'}`}
        >
          <span>Yêu cầu hướng dẫn</span>
          <span className={`rounded-full px-2 py-0.5 font-mono text-xs font-bold ${activeTab === 'requests' ? 'bg-white/20 text-white' : pendingRequestCount > 0 ? 'bg-status-warning-bg text-status-warning-text' : 'bg-canvas text-ink-soft'}`}>{inbox.requests.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'leader-changes'}
          onClick={() => setTabOverride('leader-changes')}
          className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'leader-changes' ? 'bg-primary text-white shadow-xs' : 'border border-hairline bg-card text-ink-soft hover:border-primary hover:text-primary'}`}
        >
          <span>Đề nghị đổi trưởng nhóm</span>
          <span className={`rounded-full px-2 py-0.5 font-mono text-xs font-bold ${activeTab === 'leader-changes' ? 'bg-white/20 text-white' : leaderChangeRequests.length > 0 ? 'bg-status-warning-bg text-status-warning-text' : 'bg-canvas text-ink-soft'}`}>{leaderChangeRequests.length}</span>
        </button>
      </div>

      {activeTab === 'projects' && (
        <section className="lecturer-projects space-y-4" aria-labelledby="assigned-projects">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="assigned-projects" className="text-lg font-bold text-ink">Đồ án đang hướng dẫn</h2>
              <p className="mt-1 text-sm text-ink-muted">Chọn công việc, báo cáo hoặc cuộc họp để tiếp tục hướng dẫn nhóm.</p>
            </div>
          </div>

          {assignedProjects.length > 0 && (
            <FilterToolbar
              search={projectSearch}
              onSearchChange={setProjectSearch}
              searchPlaceholder="Tìm theo mã, tên đồ án hoặc tên nhóm…"
              searchLabel="Tìm đồ án đang hướng dẫn"
              activeTab={projectStatus}
              onTabChange={(value) => setProjectStatus(value as ProjectStatusFilter)}
              tabsLabel="Lọc theo trạng thái đồ án"
              tabs={[
                { value: 'ALL', label: 'Tất cả', count: assignedProjects.length },
                { value: 'ACTIVE', label: 'Đang thực hiện' },
                { value: 'FINALSUBMISSION', label: 'Bàn giao cuối kỳ' },
                { value: 'COMPLETED', label: 'Hoàn thành / Lưu trữ' },
              ]}
              controls={
                <label className="ft-select-wrap">
                  <span className="sr-only">Vai trò hướng dẫn</span>
                  <select aria-label="Vai trò hướng dẫn" value={projectRole} onChange={(e) => setProjectRole(e.target.value as ProjectRoleFilter)} className="ft-select">
                    <option value="ALL">Mọi vai trò</option>
                    <option value="PRIMARY">Hướng dẫn chính</option>
                    <option value="MENTOR">Hướng dẫn chuyên ngành</option>
                    <option value="CO">Đồng hướng dẫn</option>
                  </select>
                </label>
              }
              sort={{
                value: projectSort,
                onChange: (value) => setProjectSort(value as ProjectSort),
                options: [
                  { value: 'default', label: 'Mặc định' },
                  { value: 'attention', label: 'Cần lưu ý nhất' },
                  { value: 'title', label: 'Tên đồ án A–Z' },
                ],
              }}
              activeChips={projectActiveChips}
              onRemoveChip={(id) => {
                if (id === 'search') setProjectSearch('')
                if (id === 'status') setProjectStatus('ALL')
                if (id === 'role') setProjectRole('ALL')
              }}
              onClearAll={() => { setProjectSearch(''); setProjectStatus('ALL'); setProjectRole('ALL'); setProjectSort('default') }}
              hasActiveFilters={projectActiveChips.length > 0}
              resultSummary={projectActiveChips.length > 0 ? `Hiển thị ${filteredProjects.length} / ${assignedProjects.length} đồ án` : undefined}
            />
          )}

          {inbox.loading ? <div className="mt-4"><ListLoading label="Đang tải đồ án được phân công…" /></div> : null}
          {!inbox.loading && inbox.assignments.length === 0 ? <p className="mt-4 text-sm text-ink-muted">Chưa được phân công đồ án.</p> : null}
          {!inbox.loading && assignedProjects.length > 0 && filteredProjects.length === 0 ? (
            <WorkspaceEmptyState
              title="Không có đồ án khớp bộ lọc"
              message="Thử đổi từ khóa hoặc xóa bộ lọc để xem toàn bộ đồ án được phân công."
              action={<Button variant="secondary" onClick={() => { setProjectSearch(''); setProjectStatus('ALL'); setProjectRole('ALL') }}>Xóa bộ lọc</Button>}
            />
          ) : null}

          <ul className="lecturer-project-list">{filteredProjects.map((assignments) => {
            const assignment = assignments.find(item => item.isPrimary && !item.endedAt) ?? assignments.find(item => !item.endedAt) ?? assignments[0]
            const project = inbox.projects?.[assignment.projectId]
            const team = project ? inbox.teams?.[project.teamId] : null
            const normalizedStatus = project?.status?.replaceAll('_', '').toUpperCase()
            const isOpenableStage = normalizedStatus === 'ACTIVE' || normalizedStatus === 'FINALSUBMISSION' || normalizedStatus === 'COMPLETED' || normalizedStatus === 'ARCHIVED'
            const canOpen = assignments.some(item => item.isPrimary && !item.endedAt) && isOpenableStage
            const mentorAssignments = assignments.filter(item => item.assignmentType === 'DISCIPLINE_MENTOR' && !item.endedAt && isOpenableStage && item.majorId)
            const assignedDateFormatted = formatVnDate(assignment.assignedAt)
            const endedDateFormatted = assignment.endedAt ? formatVnDate(assignment.endedAt) : ''
            return <li key={assignment.projectId} className="lecturer-project">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    {assignments.map(item => <span key={item.id} className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${item.isPrimary ? 'border-primary/20 bg-primary-subtle text-primary' : 'border-tag-se/25 bg-tag-se-bg text-tag-se'}`}>
                      {item.isPrimary ? 'Hướng dẫn chính' : item.assignmentType === 'DISCIPLINE_MENTOR' ? 'Hướng dẫn chuyên ngành' : 'Đồng hướng dẫn'}{item.endedAt ? ' · Đã kết thúc' : ''}
                    </span>)}
                    {project?.code && <span className="font-mono text-xs text-ink-muted">· {project.code}</span>}
                  </div>
                  <h3 className="break-words font-semibold text-ink text-lg">{project?.title ?? 'Đồ án được phân công'}</h3>
                  <p className="mt-1 text-xs text-ink-muted">Nhóm sinh viên: <strong className="text-ink-soft">{team?.name ?? project?.teamName ?? 'Chưa tải được nhóm'}</strong>{team ? ` · ${team.members.length} thành viên` : ''}</p>
                </div>
                <StatusBadge
                  tone={statusTone(normalizedStatus)}
                  label={normalizedStatus === 'ACTIVE' ? 'Đang thực hiện' : project?.status ? projectStatusLabel(project.status) : 'Chưa rõ'}
                />
              </div>
              <p className="mt-3 text-xs text-ink-muted">
                {assignments.length > 1 ? `${assignments.length} phạm vi hướng dẫn · ` : 'Phân công: '}{assignedDateFormatted}{endedDateFormatted && assignments.every(item => item.endedAt) ? ` · Kết thúc: ${endedDateFormatted}` : ''}
              </p>
              {team && team.members.length > 0 ? <details className="lecturer-roster">
                <summary>Thành viên nhóm được phân công</summary>
                <ul>{team.members.map(member => <li key={member.userId}>
                  <Avatar name={member.fullName} toneSeed={member.userId} size="xs" shape="circle" />
                  <span>{member.fullName}</span>{member.isLeader ? <span className="lecturer-roster-leader">Trưởng nhóm</span> : null}
                </li>)}</ul>
              </details> : null}
              {canOpen ? <ProjectSignals summary={projectSummaries[assignment.projectId]} /> : <p className="mt-4 text-sm text-ink-muted">{mentorAssignments.length ? 'Phân công đang hoạt động trong phạm vi chuyên ngành.' : !project ? 'Chưa tải được trạng thái đồ án. Hãy tải lại để kiểm tra trước khi mở.' : assignments.every(item => item.endedAt) ? 'Phân công hướng dẫn đã kết thúc.' : 'Đồ án đang ở giai đoạn chờ duyệt hoặc chưa bước vào giai đoạn thực hiện.'}</p>}
              {mentorAssignments.length > 0 ? <nav className="lecturer-project-actions" aria-label={`Hướng dẫn chuyên ngành đồ án ${project?.code ?? assignment.projectId}`}>{mentorAssignments.map(item => <Link key={item.id} className="lecturer-action lecturer-action-primary" to={`/mentor/projects/${assignment.projectId}/majors/${item.majorId}/workspace`}>Mở hướng dẫn chuyên ngành{mentorAssignments.length > 1 ? ` · ${project?.majors?.find(major => major.majorId === item.majorId)?.majorName ?? 'Chưa tải được tên ngành'}` : ''}</Link>)}</nav> : null}
              {canOpen ? <nav className="lecturer-project-actions" aria-label={`Chức năng đồ án ${project?.code ?? assignment.projectId}`}>
                <Link className="lecturer-action lecturer-action-primary" to={`/supervisor/projects/${assignment.projectId}/workspace`}>Tổng quan đồ án <span aria-hidden="true">→</span></Link>
                <Link className="lecturer-action" to={`/supervisor/projects/${assignment.projectId}/tasks`}>Công việc</Link>
                <Link className="lecturer-action" to={`/supervisor/projects/${assignment.projectId}/review-gates`}>Cổng kiểm duyệt</Link>
                <Link className="lecturer-action" to={`/supervisor/projects/${assignment.projectId}/reports`}>Báo cáo tiến độ</Link>
                <Link className="lecturer-action" to={`/supervisor/projects/${assignment.projectId}/meetings`}>Lịch họp</Link>
                <Link className="lecturer-action" to={`/supervisor/projects/${assignment.projectId}/deliverables`}>Hạng mục cần nộp</Link>
              </nav> : null}
            </li>
          })}</ul>
        </section>
      )}

      {activeTab === 'requests' && (
        <section className="lecturer-requests space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-ink">Yêu cầu hướng dẫn</h2>
              <p className="mt-1 text-sm text-ink-muted">Xem thông tin nhóm, chuyên ngành và xác nhận nhận hướng dẫn hoặc từ chối.</p>
            </div>
          </div>

          {inbox.requests.length > 0 && (
            <FilterToolbar
              embedded
              search={requestSearch}
              onSearchChange={setRequestSearch}
              searchPlaceholder="Tìm theo tên đề tài, nhóm hoặc lời nhắn…"
              searchLabel="Tìm yêu cầu hướng dẫn"
              activeTab={requestStatus}
              onTabChange={(value) => setRequestStatus(value as RequestStatusFilter)}
              tabsLabel="Lọc trạng thái yêu cầu hướng dẫn"
              tabs={[
                { value: 'ALL', label: 'Tất cả', count: requestCounts.ALL },
                { value: 'PENDING', label: 'Chờ xử lý', count: requestCounts.PENDING },
                { value: 'ACCEPTED', label: 'Đã chấp nhận', count: requestCounts.ACCEPTED },
                { value: 'REJECTED', label: 'Đã từ chối', count: requestCounts.REJECTED },
              ]}
              activeChips={requestActiveChips}
              onRemoveChip={(id) => { if (id === 'search') setRequestSearch(''); if (id === 'status') setRequestStatus('ALL') }}
              onClearAll={() => { setRequestSearch(''); setRequestStatus('ALL') }}
              hasActiveFilters={requestActiveChips.length > 0}
              resultSummary={requestActiveChips.length > 0 ? `Hiển thị ${filteredRequests.length} / ${inbox.requests.length} yêu cầu` : undefined}
            />
          )}

          {inbox.loading ? <div className="mt-3"><ListLoading label="Đang tải yêu cầu…" /></div> : null}
          {!inbox.loading && inbox.requests.length === 0 ? <p className="mt-3 text-sm text-ink-muted">Chưa có yêu cầu hướng dẫn.</p> : null}
          {!inbox.loading && inbox.requests.length > 0 && filteredRequests.length === 0 ? (
            <WorkspaceEmptyState
              title="Không tìm thấy yêu cầu phù hợp"
              message="Thử bỏ bộ lọc để xem toàn bộ yêu cầu hướng dẫn."
              action={<Button variant="secondary" onClick={() => { setRequestSearch(''); setRequestStatus('ALL') }}>Xóa bộ lọc</Button>}
            />
          ) : null}

          <ul className="divide-y divide-hairline">{filteredRequests.map((request) => {
            const project = inbox.projects?.[request.projectId]
            const team = project ? inbox.teams?.[project.teamId] : null
            const majorNames = new Map((project?.majors ?? []).map((major) => [major.majorId, major.majorName]))
            const isPending = request.status === 'PENDING'
            return <li key={request.id} className="lecturer-request text-sm">
              <details open={isPending} className="group">
                <summary className="lecturer-request-summary">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-primary text-base" aria-hidden="true">mail</span>
                      <strong className="text-ink">{project?.title ?? 'Đồ án gửi lời mời'}{project?.code ? ` · ${project.code}` : ''}</strong>
                    </div>
                    <StatusBadge
                      tone={isPending ? 'warning' : request.status === 'REJECTED' ? 'danger' : 'success'}
                      label={displayLabel(request.status)}
                    />
                  </div>
                </summary>
                <p className="mt-3 text-xs text-ink-muted">Ngày gửi: {formatVnDate(request.requestedAt)}</p>
                {team ? (
                  <div className="mt-3 lecturer-team rounded-r-md bg-canvas/60 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-ink">{team.name} · {team.code}</strong>
                      <span className="text-xs text-ink-muted">{team.members.length} thành viên</span>
                    </div>
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                      {team.members.map((member) => (
                        <li key={member.userId} className="flex items-center gap-2 text-xs text-ink-soft">
                          <Avatar name={member.fullName} toneSeed={member.userId} size="xs" shape="circle" />
                          <span>
                            <span className="font-semibold text-ink">{member.fullName}</span>
                            {member.isLeader ? ' · Trưởng nhóm' : ''}{member.majorId ? ` · ${majorNames.get(member.majorId) ?? 'Chưa tải được tên chuyên ngành'}` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {request.requestMessage ? <p className="mt-3 leading-relaxed text-ink-muted text-xs bg-card border border-hairline rounded-md p-2.5">Lời nhắn của nhóm: {request.requestMessage}</p> : null}
                {request.responseMessage ? <p className="mt-3 leading-relaxed text-ink-muted text-xs bg-status-success-bg border border-status-success-border rounded-md p-2.5">Phản hồi: {request.responseMessage}</p> : null}
                {isPending ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button disabled={decisionBusy} onClick={() => openSupervisionDecision(request.id, 'accept')}>Nhận hướng dẫn</Button>
                    <Button variant="danger" disabled={decisionBusy} onClick={() => openSupervisionDecision(request.id, 'reject')}>Từ chối</Button>
                  </div>
                ) : null}
              </details>
            </li>
          })}</ul>
        </section>
      )}

      {activeTab === 'leader-changes' && (
        <section className="lecturer-requests space-y-4">
          <div>
            <h2 className="text-lg font-bold text-ink">Đề nghị đổi trưởng nhóm</h2>
            <p className="mt-1 text-xs text-ink-muted">Xem xét đề nghị từ các nhóm bạn đang hướng dẫn. Thành viên kế nhiệm phải đủ điều kiện tại thời điểm phê duyệt.</p>
          </div>
          {leaderChangeRequests.length === 0 ? <p className="mt-3 text-sm text-ink-muted">Chưa có đề nghị đổi trưởng nhóm cần xử lý.</p> : null}
          <ul className="divide-y divide-hairline">
            {leaderChangeRequests.map((request) => {
              const team = inbox.teams?.[request.teamId]
              const current = team?.members.find((member) => member.userId === request.currentLeaderUserId)
              const target = team?.members.find((member) => member.userId === request.newLeaderUserId)
              return (
                <li key={request.id} className="py-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-ink">{team?.name ?? 'Nhóm sinh viên'}</strong>
                    <StatusBadge tone="warning" label={displayLabel(request.status)} />
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={current?.fullName ?? 'TN'} toneSeed={request.currentLeaderUserId} size="sm" shape="circle" />
                      <div>
                        <span className="block text-xs text-ink-muted">Trưởng nhóm hiện tại</span>
                        <b className="text-ink">{current?.fullName ?? 'Trưởng nhóm hiện tại'}</b>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={target?.fullName ?? 'TN'} toneSeed={request.newLeaderUserId} size="sm" shape="circle" />
                      <div>
                        <span className="block text-xs text-ink-muted">Trưởng nhóm đề xuất</span>
                        <b className="text-ink">{target?.fullName ?? 'Thành viên được đề xuất'}</b>
                        {target?.qualificationStatus ? <span className="text-xs text-ink-muted"> · {displayLabel(target.qualificationStatus)}</span> : null}
                      </div>
                    </div>
                  </div>
                  {request.requestMessage ? <p className="mt-3 rounded-md border border-hairline bg-canvas p-2.5 text-xs leading-relaxed text-ink-muted">Lý do: {request.requestMessage}</p> : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button disabled={decisionBusy} onClick={() => openLeaderDecision(request.id, 'approve')}>Chấp thuận đổi trưởng nhóm</Button>
                    <Button variant="danger" disabled={decisionBusy} onClick={() => openLeaderDecision(request.id, 'reject')}>Từ chối</Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {pendingDecision && (
        <Modal
          open
          busy={decisionBusy}
          title={pendingDecision.title}
          description={pendingDecision.subtitle}
          onClose={() => setPendingDecision(null)}
        >
          <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft">
              Phản hồi (tùy chọn)
              <textarea
                rows={3}
                value={decisionNote}
                disabled={decisionBusy}
                placeholder={pendingDecision.decision === 'reject' ? 'Nêu ngắn gọn lý do để nhóm nắm rõ…' : 'Lời nhắn gửi tới nhóm sinh viên (không bắt buộc)…'}
                onChange={(event) => setDecisionNote(event.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-line-strong bg-card p-3 text-sm font-normal normal-case tracking-normal text-ink focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline pt-4">
              <Button variant="secondary" disabled={decisionBusy} onClick={() => setPendingDecision(null)}>Hủy</Button>
              <Button
                variant={pendingDecision.decision === 'reject' ? 'danger' : 'primary'}
                disabled={decisionBusy}
                onClick={() => void confirmDecision()}
              >
                {pendingDecision.kind === 'supervision'
                  ? (pendingDecision.decision === 'accept' ? 'Nhận hướng dẫn' : 'Từ chối yêu cầu')
                  : (pendingDecision.decision === 'approve' ? 'Chấp thuận thay đổi' : 'Từ chối đề nghị')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </WorkspacePage>
  )
}

function ProjectSignals({ summary }: { summary?: ReturnType<typeof useSupervisorProjectSummaries>[number] }) {
  if (!summary) return <p role="status" className="mt-4 text-xs text-ink-muted">Đang tải tiến độ và lịch theo dữ liệu hệ thống…</p>
  return <dl className="lecturer-signals">
    <Signal label="Tiến độ" resource={summary.progress} render={data => `${data.percentage}% · ${data.doneTasks}/${data.totalTasks} việc`} />
    <Signal label="Cần lưu ý" resource={summary.attention} render={data => `${data.overdue} quá hạn · ${data.blocked} vướng mắc`} />
    <Signal label="Lịch họp sắp tới" resource={summary.meetings} render={data => data.nextAt ? formatMeetingTime(data.nextAt) : 'Chưa có lịch họp sắp tới'} />
    <Signal label="Báo cáo tiến độ" resource={summary.reports} render={data => `${data.count} báo cáo`} />
  </dl>
}

function Signal<T>({ label, resource, render }: { label: string; resource: SupervisorProjectResource<T>; render: (data: T) => string }) {
  return <div className="lecturer-signal"><dt className="text-ink-muted">{label}</dt><dd className="mt-1 break-words font-semibold text-ink">{resource.state === 'loading' ? 'Đang tải…' : resource.state === 'error' ? resource.message : render(resource.data)}</dd></div>
}
