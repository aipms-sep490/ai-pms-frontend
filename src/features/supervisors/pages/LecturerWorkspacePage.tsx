import { formatMeetingTime } from '../../meetings/meeting-utils'
import './lecturer-workspace.css'
import { displayLabel } from '../../../components/ui/display-label'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Pagination } from '../../../components/ui/Pagination'
import { useClientPagination } from '../../../components/ui/useClientPagination'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { useSupervisorInbox } from '../hooks/useSupervisorInbox'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { useSupervisorProjectSummaries, type SupervisorProjectResource } from '../hooks/useSupervisorProjectSummaries'

export function LecturerWorkspacePage() {
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const inbox = useSupervisorInbox()
  const projectSummaries = useSupervisorProjectSummaries(inbox.assignments, inbox.projects ?? {})
  const assignedProjects = useMemo(
    () =>
      [...new Set(inbox.assignments.map((item) => item.projectId))].map((projectId) =>
        inbox.assignments.filter((item) => item.projectId === projectId),
      ),
    [inbox.assignments],
  )
  const sortedRequests = useMemo(
    () => [...inbox.requests].sort((a, b) => Number(b.status === 'PENDING') - Number(a.status === 'PENDING')),
    [inbox.requests],
  )
  const leaderChangeRequests = inbox.leaderChangeRequests ?? []
  const [responseByRequest, setResponseByRequest] = useState<Record<number, string>>({})
  const [leaderResponseByRequest, setLeaderResponseByRequest] = useState<Record<number, string>>({})
  const [projectSearch, setProjectSearch] = useState('')
  const [projectStatusFilter, setProjectStatusFilter] = useState<'ALL' | 'ACTIVE' | 'OTHER'>('ALL')

  const filteredAssignedProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase()
    return assignedProjects.filter((group) => {
      const projectId = group[0].projectId
      const project = inbox.projects?.[projectId]
      const team = project ? inbox.teams?.[project.teamId] : null
      const isActive = project?.status?.replaceAll('_', '').toUpperCase() === 'ACTIVE' && group.some((item) => !item.endedAt)
      if (projectStatusFilter === 'ACTIVE' && !isActive) return false
      if (projectStatusFilter === 'OTHER' && isActive) return false
      if (!q) return true
      return (
        (project?.title ?? '').toLowerCase().includes(q) ||
        (project?.code ?? '').toLowerCase().includes(q) ||
        (team?.name ?? project?.teamName ?? '').toLowerCase().includes(q) ||
        String(projectId).includes(q)
      )
    })
  }, [assignedProjects, inbox.projects, inbox.teams, projectSearch, projectStatusFilter])

  const projectsPagination = useClientPagination(filteredAssignedProjects, 8)
  const requestsPagination = useClientPagination(sortedRequests, 6)
  const leaderPagination = useClientPagination(leaderChangeRequests, 6)

  const pendingRequestsCount = inbox.requests.filter((item) => item.status === 'PENDING').length
  const disciplineScopeCount = inbox.assignments.filter(
    (item) => item.assignmentType === 'DISCIPLINE_MENTOR' && !item.endedAt,
  ).length
  const activeProjectsCount = assignedProjects.filter((group) => {
    const project = inbox.projects?.[group[0].projectId]
    return project?.status?.replaceAll('_', '').toUpperCase() === 'ACTIVE' && group.some((item) => !item.endedAt)
  }).length

  const decide = async (requestId: number, decision: 'accept' | 'reject') => {
    const request = inbox.requests.find((item) => item.id === requestId)
    if (!request) return
    if (
      (await requestConfirmation({
        title: decision === 'accept' ? 'Nhận hướng dẫn đồ án?' : 'Từ chối hướng dẫn?',
        description: inbox.projects?.[request.projectId]?.title ?? 'Xác nhận quyết định đối với yêu cầu hướng dẫn này.',
        confirmLabel: decision === 'accept' ? 'Nhận hướng dẫn' : 'Từ chối yêu cầu',
        danger: decision === 'reject',
      })) === null
    )
      return
    await inbox.respond(request, decision, responseByRequest[request.id])
  }

  const decideLeaderChange = async (requestId: number, decision: 'approve' | 'reject') => {
    if (
      (await requestConfirmation({
        title: decision === 'approve' ? 'Chấp thuận thay đổi trưởng nhóm?' : 'Từ chối thay đổi trưởng nhóm?',
        description: 'Quyết định này áp dụng cho đề nghị đang được xử lý.',
        confirmLabel: decision === 'approve' ? 'Chấp thuận thay đổi' : 'Từ chối đề nghị',
        danger: decision === 'reject',
      })) === null
    )
      return
    await inbox.respondToLeaderChange(requestId, decision, leaderResponseByRequest[requestId])
  }

  if (inbox.error?.kind === 'authentication') {
    return (
      <p className="p-6">
        <Link to="/login">Đăng nhập lại để tiếp tục.</Link>
      </p>
    )
  }

  return (
    <WorkspacePage
      className="lecturer-workspace space-y-5"
      title="Hướng dẫn đồ án"
      eyebrow="Giảng viên hướng dẫn"
      description="Theo dõi tiến độ, góp ý cho nhóm và xử lý các đề nghị hướng dẫn."
      action={
        <Button variant="secondary" icon="refresh" disabled={inbox.loading} onClick={() => void inbox.refresh()}>
          Tải lại
        </Button>
      }
    >
      {inbox.error ? (
        <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">
          {inbox.error.message}
        </section>
      ) : null}

      <StatTileRow
        tiles={[
          {
            icon: 'school',
            label: 'Đồ án đang hướng dẫn',
            value: assignedProjects.length,
            caption: `${activeProjectsCount} đồ án đang ở giai đoạn thực hiện`,
            hero: true,
          },
          {
            icon: 'mail',
            label: 'Yêu cầu chờ duyệt',
            value: pendingRequestsCount,
            tone: pendingRequestsCount > 0 ? 'warning' : 'neutral',
            caption: `Trên tổng ${inbox.requests.length} lời mời đã nhận`,
          },
          {
            icon: 'manage_accounts',
            label: 'Đề nghị đổi trưởng nhóm',
            value: leaderChangeRequests.length,
            tone: leaderChangeRequests.length > 0 ? 'info' : 'neutral',
            caption: 'Cần xét duyệt điều kiện kế nhiệm',
          },
          {
            icon: 'hub',
            label: 'Phạm vi chuyên ngành',
            value: disciplineScopeCount,
            tone: disciplineScopeCount > 0 ? 'success' : 'neutral',
            caption: 'Phân công Discipline Mentor đang hiệu lực',
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-start">
        {/* Cột trái (8 cột): Danh sách đồ án đang hướng dẫn */}
        <section
          className="lecturer-projects xl:col-span-8 overflow-hidden rounded-xl border border-hairline bg-card shadow-xs"
          aria-labelledby="assigned-projects"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
            <div>
              <h2 id="assigned-projects" className="text-base font-bold text-ink">
                Đồ án đang hướng dẫn
              </h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Chọn công việc, báo cáo hoặc cuộc họp để tiếp tục hướng dẫn nhóm.
              </p>
            </div>
            <StatusBadge
              tone="info"
              label={
                projectSearch.trim() || projectStatusFilter !== 'ALL'
                  ? `${filteredAssignedProjects.length}/${assignedProjects.length} đồ án`
                  : `${assignedProjects.length} đồ án`
              }
            />
          </div>

          <div className="p-5">
            {inbox.loading ? (
              <p role="status" className="text-sm text-ink-muted">
                Đang tải đồ án được phân công…
              </p>
            ) : null}
            {!inbox.loading && inbox.assignments.length === 0 ? (
              <p className="text-sm text-ink-muted">Chưa được phân công đồ án.</p>
            ) : null}

            {!inbox.loading && assignedProjects.length > 0 ? (
              <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-hairline bg-canvas/70 p-3">
                <div className="min-w-[200px] flex-1">
                  <label htmlFor="lecturer-project-search" className="block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    Tìm đồ án
                  </label>
                  <input
                    id="lecturer-project-search"
                    type="search"
                    aria-label="Tìm đồ án hướng dẫn"
                    placeholder="Tên đồ án, mã đồ án hoặc tên nhóm…"
                    value={projectSearch}
                    onChange={(event) => setProjectSearch(event.target.value)}
                    className="mt-1 min-h-10 w-full rounded-lg border border-hairline bg-card px-3 py-1.5 text-sm text-ink focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="w-full sm:w-52">
                  <label htmlFor="lecturer-project-status" className="block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    Trạng thái
                  </label>
                  <select
                    id="lecturer-project-status"
                    aria-label="Lọc trạng thái đồ án"
                    value={projectStatusFilter}
                    onChange={(event) => setProjectStatusFilter(event.target.value as 'ALL' | 'ACTIVE' | 'OTHER')}
                    className="mt-1 min-h-10 w-full rounded-lg border border-hairline bg-card px-3 py-1.5 text-sm text-ink focus:border-primary focus:outline-none"
                  >
                    <option value="ALL">Tất cả đồ án</option>
                    <option value="ACTIVE">Đang thực hiện</option>
                    <option value="OTHER">Chưa mở / Đã kết thúc</option>
                  </select>
                </div>
                {(projectSearch.trim() || projectStatusFilter !== 'ALL') ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="min-h-10 shrink-0"
                    onClick={() => { setProjectSearch(''); setProjectStatusFilter('ALL') }}
                  >
                    Đặt lại
                  </Button>
                ) : null}
              </div>
            ) : null}

            {!inbox.loading && assignedProjects.length > 0 && filteredAssignedProjects.length === 0 ? (
              <p className="rounded-lg border border-hairline bg-canvas/50 p-4 text-sm text-ink-muted">
                Không có đồ án nào khớp từ khóa hoặc trạng thái đã chọn.
              </p>
            ) : null}

            <ul className="lecturer-project-list">
              {projectsPagination.paginatedItems.map((assignments) => {
                const assignment =
                  assignments.find((item) => item.isPrimary && !item.endedAt) ??
                  assignments.find((item) => !item.endedAt) ??
                  assignments[0]
                const project = inbox.projects?.[assignment.projectId]
                const team = project ? inbox.teams?.[project.teamId] : null
                const isActive = project?.status?.replaceAll('_', '').toUpperCase() === 'ACTIVE'
                const canOpen = assignments.some((item) => item.isPrimary && !item.endedAt) && isActive
                const mentorAssignments = assignments.filter(
                  (item) => item.assignmentType === 'DISCIPLINE_MENTOR' && !item.endedAt && isActive && item.majorId,
                )
                const assignedDateFormatted = assignment.assignedAt
                  ? new Date(assignment.assignedAt).toLocaleDateString('vi-VN')
                  : '—'
                const endedDateFormatted = assignment.endedAt
                  ? new Date(assignment.endedAt).toLocaleDateString('vi-VN')
                  : ''
                return (
                  <li key={assignment.projectId} className="lecturer-project">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          {assignments.map((item) => (
                            <span
                              key={item.id}
                              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                                item.isPrimary
                                  ? 'border-primary/20 bg-primary-subtle text-primary'
                                  : 'border-tag-se/25 bg-tag-se-bg text-tag-se'
                              }`}
                            >
                              {item.isPrimary
                                ? 'Hướng dẫn chính'
                                : item.assignmentType === 'DISCIPLINE_MENTOR'
                                  ? 'Hướng dẫn chuyên ngành'
                                  : 'Đồng hướng dẫn'}
                              {item.endedAt ? ' · Đã kết thúc' : ''}
                            </span>
                          ))}
                          <span className="text-xs font-mono text-ink-muted">
                            · {project?.code ?? `#${assignment.projectId}`}
                          </span>
                        </div>
                        <h3 className="break-words font-semibold text-ink">{project?.title ?? `Đồ án #${assignment.projectId}`}</h3>
                        <p className="mt-1 text-xs text-ink-muted">
                          Nhóm sinh viên:{' '}
                          <strong className="text-ink-soft">{team?.name ?? project?.teamName ?? 'Chưa tải được nhóm'}</strong>
                          {team ? ` · ${team.members.length} thành viên` : ''}
                        </p>
                      </div>
                      <StatusBadge
                        tone={project?.status === 'ACTIVE' ? 'success' : 'neutral'}
                        label={project?.status === 'ACTIVE' ? 'Đang thực hiện' : displayLabel(project?.status)}
                      />
                    </div>
                    <p className="mt-3 text-xs text-ink-muted">
                      {assignments.length > 1 ? `${assignments.length} phạm vi hướng dẫn · ` : 'Phân công: '}
                      {assignedDateFormatted}
                      {endedDateFormatted && assignments.every((item) => item.endedAt)
                        ? ` · Kết thúc: ${endedDateFormatted}`
                        : ''}
                    </p>
                    {team && team.members.length > 0 ? (
                      <details className="lecturer-roster">
                        <summary>Thành viên nhóm được phân công</summary>
                        <ul>
                          {team.members.map((member) => (
                            <li key={member.userId}>
                              <span>{member.fullName}</span>
                              {member.isLeader ? <span className="lecturer-roster-leader">Trưởng nhóm</span> : null}
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                    {canOpen ? (
                      <ProjectSignals summary={projectSummaries[assignment.projectId]} />
                    ) : (
                      <p className="mt-3 text-sm text-ink-muted">
                        {mentorAssignments.length
                          ? 'Phân công đang hoạt động trong phạm vi chuyên ngành.'
                          : !project
                            ? 'Chưa tải được trạng thái đồ án. Hãy tải lại để kiểm tra trước khi mở.'
                            : assignments.every((item) => item.endedAt)
                              ? 'Phân công hướng dẫn đã kết thúc.'
                              : 'Đồ án chưa ở giai đoạn thực hiện.'}
                      </p>
                    )}
                    {mentorAssignments.length > 0 ? (
                      <nav
                        className="lecturer-project-actions"
                        aria-label={`Hướng dẫn chuyên ngành đồ án ${project?.code ?? assignment.projectId}`}
                      >
                        {mentorAssignments.map((item) => (
                          <Link
                            key={item.id}
                            className="lecturer-action lecturer-action-primary"
                            to={`/mentor/projects/${assignment.projectId}/majors/${item.majorId}/workspace`}
                          >
                            Mở hướng dẫn chuyên ngành
                            {mentorAssignments.length > 1
                              ? ` · ${project?.majors?.find((major) => major.majorId === item.majorId)?.majorName ?? 'Chưa tải được tên ngành'}`
                              : ''}
                          </Link>
                        ))}
                      </nav>
                    ) : null}
                    {canOpen ? (
                      <nav
                        className="lecturer-project-actions"
                        aria-label={`Chức năng đồ án ${project?.code ?? assignment.projectId}`}
                      >
                        <Link
                          className="lecturer-action lecturer-action-primary"
                          to={`/supervisor/projects/${assignment.projectId}/workspace`}
                        >
                          Tổng quan đồ án <span aria-hidden="true">→</span>
                        </Link>
                        <Link className="lecturer-action" to={`/supervisor/projects/${assignment.projectId}/tasks`}>
                          Công việc
                        </Link>
                        <Link className="lecturer-action" to={`/supervisor/projects/${assignment.projectId}/review-gates`}>
                          Tiến trình Gates
                        </Link>
                        <Link className="lecturer-action" to={`/supervisor/projects/${assignment.projectId}/reports`}>
                          Báo cáo tiến độ
                        </Link>
                        <Link className="lecturer-action" to={`/supervisor/projects/${assignment.projectId}/meetings`}>
                          Lịch họp
                        </Link>
                        <Link className="lecturer-action" to={`/supervisor/projects/${assignment.projectId}/deliverables`}>
                          Hạng mục cần nộp
                        </Link>
                      </nav>
                    ) : null}
                  </li>
                )
              })}
            </ul>

            {projectsPagination.showPagination ? (
              <Pagination
                className="mt-4"
                page={projectsPagination.page}
                pages={projectsPagination.totalPages}
                total={projectsPagination.total}
                pageSize={projectsPagination.pageSize}
                pageSizeOptions={[8, 16, 30]}
                onPage={projectsPagination.setPage}
                onPageSizeChange={projectsPagination.setPageSize}
              />
            ) : null}
          </div>
        </section>

        {/* Cột phải (4 cột): Yêu cầu hướng dẫn & Đề nghị đổi trưởng nhóm */}
        <div className="xl:col-span-4 space-y-5">
          <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
              <h2 className="text-base font-bold text-ink">Yêu cầu hướng dẫn</h2>
              <StatusBadge
                tone={pendingRequestsCount > 0 ? 'warning' : 'neutral'}
                label={pendingRequestsCount > 0 ? `${pendingRequestsCount} chờ duyệt` : `${inbox.requests.length}`}
              />
            </div>

            <div className="p-4">
              {inbox.loading ? <p className="text-sm text-ink-muted">Đang tải yêu cầu…</p> : null}
              {!inbox.loading && inbox.requests.length === 0 ? (
                <p className="text-sm text-ink-muted">Chưa có yêu cầu hướng dẫn.</p>
              ) : null}
              {requestsPagination.paginatedItems.length > 0 ? (
                <ul className="space-y-2">
                  {requestsPagination.paginatedItems.map((request) => {
                    const project = inbox.projects?.[request.projectId]
                    const team = project ? inbox.teams?.[project.teamId] : null
                    const majorNames = new Map((project?.majors ?? []).map((major) => [major.majorId, major.majorName]))
                    const isPending = request.status === 'PENDING'
                    return (
                      <li key={request.id} className="lecturer-request text-sm">
                        <details open={isPending} className="group">
                          <summary className="lecturer-request-summary cursor-pointer">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="material-symbols-outlined text-primary text-sm" aria-hidden="true">
                                  mail
                                </span>
                                <strong className="truncate">
                                  {project?.title ?? `Đồ án #${request.projectId}`}
                                  {project?.code ? ` · ${project.code}` : ''}
                                </strong>
                              </div>
                              <StatusBadge
                                tone={isPending ? 'warning' : request.status === 'ACCEPTED' ? 'success' : 'neutral'}
                                label={displayLabel(request.status)}
                              />
                            </div>
                          </summary>
                          <p className="mt-2.5 text-xs text-ink-muted">
                            Ngày gửi: {new Date(request.requestedAt).toLocaleDateString('vi-VN')}
                          </p>
                          {team ? (
                            <div className="mt-3 lecturer-team rounded-r-md bg-canvas/70 p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <strong>
                                  {team.name} · {team.code}
                                </strong>
                                <span className="text-xs text-ink-muted">{team.members.length} thành viên</span>
                              </div>
                              <ul className="mt-2 grid gap-1.5">
                                {team.members.map((member) => (
                                  <li key={member.userId} className="text-xs text-ink-soft">
                                    <span className="font-semibold text-ink">{member.fullName}</span>
                                    {member.isLeader ? ' · Trưởng nhóm' : ''}
                                    {member.majorId
                                      ? ` · ${majorNames.get(member.majorId) ?? 'Chưa tải được tên chuyên ngành'}`
                                      : ''}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {request.requestMessage ? (
                            <p className="mt-2.5 leading-relaxed text-ink-muted text-xs bg-card border border-hairline rounded-md p-2.5">
                              Lời nhắn của nhóm: {request.requestMessage}
                            </p>
                          ) : null}
                          {request.responseMessage ? (
                            <p className="mt-2.5 leading-relaxed text-status-success-text text-xs bg-status-success-bg border border-status-success-border rounded-md p-2.5">
                              Phản hồi: {request.responseMessage}
                            </p>
                          ) : null}
                          {request.status === 'PENDING' ? (
                            <div className="mt-3 space-y-2">
                              <label className="block text-xs font-medium text-ink-soft">
                                Phản hồi (tùy chọn)
                                <textarea
                                  className="mt-1 block w-full rounded-md border border-line-strong p-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                  rows={2}
                                  value={responseByRequest[request.id] ?? ''}
                                  onChange={(event) =>
                                    setResponseByRequest((current) => ({ ...current, [request.id]: event.target.value }))
                                  }
                                />
                              </label>
                              <div className="flex flex-wrap gap-2 pt-1">
                                <Button
                                  size="sm"
                                  disabled={inbox.acceptPending !== null || inbox.rejectPending !== null}
                                  onClick={() => void decide(request.id, 'accept')}
                                >
                                  Nhận hướng dẫn
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  disabled={inbox.acceptPending !== null || inbox.rejectPending !== null}
                                  onClick={() => void decide(request.id, 'reject')}
                                >
                                  Từ chối
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </details>
                      </li>
                    )
                  })}
                </ul>
              ) : null}

              {requestsPagination.showPagination ? (
                <Pagination
                  className="mt-3"
                  page={requestsPagination.page}
                  pages={requestsPagination.totalPages}
                  total={requestsPagination.total}
                  pageSize={requestsPagination.pageSize}
                  onPage={requestsPagination.setPage}
                />
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
              <div>
                <h2 className="text-base font-bold text-ink">Đề nghị đổi trưởng nhóm</h2>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Thành viên kế nhiệm phải đủ điều kiện tại thời điểm phê duyệt.
                </p>
              </div>
              <StatusBadge
                tone={leaderChangeRequests.length > 0 ? 'info' : 'neutral'}
                label={`${leaderChangeRequests.length}`}
              />
            </div>

            <div className="p-4">
              {leaderChangeRequests.length === 0 ? (
                <p className="text-sm text-ink-muted">Chưa có đề nghị đổi trưởng nhóm cần xử lý.</p>
              ) : (
                <ul className="divide-y divide-hairline">
                  {leaderPagination.paginatedItems.map((request) => {
                    const team = inbox.teams?.[request.teamId]
                    const current = team?.members.find((member) => member.userId === request.currentLeaderUserId)
                    const target = team?.members.find((member) => member.userId === request.newLeaderUserId)
                    return (
                      <li key={request.id} className="py-3.5 text-sm first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <strong className="text-ink">{team?.name ?? 'Nhóm #' + request.teamId}</strong>
                          <StatusBadge tone="warning" label={displayLabel(request.status)} />
                        </div>
                        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                          <p>
                            <span className="text-xs text-ink-muted">Trưởng nhóm hiện tại</span>
                            <br />
                            <b>{current?.fullName ?? '#' + request.currentLeaderUserId}</b>
                          </p>
                          <p>
                            <span className="text-xs text-ink-muted">Trưởng nhóm đề xuất</span>
                            <br />
                            <b>{target?.fullName ?? '#' + request.newLeaderUserId}</b>
                            {target?.qualificationStatus ? ' · ' + displayLabel(target.qualificationStatus) : ''}
                          </p>
                        </div>
                        {request.requestMessage ? (
                          <p className="mt-2.5 leading-relaxed text-ink-muted text-xs">Lý do: {request.requestMessage}</p>
                        ) : null}
                        <label className="mt-2.5 block text-xs font-medium text-ink-soft">
                          Phản hồi (tùy chọn)
                          <textarea
                            className="mt-1 block w-full rounded-md border border-line-strong p-2 text-sm"
                            rows={2}
                            value={leaderResponseByRequest[request.id] ?? ''}
                            onChange={(event) =>
                              setLeaderResponseByRequest((currentState) => ({
                                ...currentState,
                                [request.id]: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => void decideLeaderChange(request.id, 'approve')}>
                            Chấp thuận đổi trưởng nhóm
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => void decideLeaderChange(request.id, 'reject')}>
                            Từ chối
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              {leaderPagination.showPagination ? (
                <Pagination
                  className="mt-3"
                  page={leaderPagination.page}
                  pages={leaderPagination.totalPages}
                  total={leaderPagination.total}
                  pageSize={leaderPagination.pageSize}
                  onPage={leaderPagination.setPage}
                />
              ) : null}
            </div>
          </section>
        </div>
      </div>

      {confirmationDialog}
    </WorkspacePage>
  )
}

function ProjectSignals({ summary }: { summary?: ReturnType<typeof useSupervisorProjectSummaries>[number] }) {
  if (!summary) {
    return (
      <p role="status" className="mt-3 text-xs text-ink-muted">
        Đang tải tiến độ và lịch theo dữ liệu hệ thống…
      </p>
    )
  }
  return (
    <dl className="lecturer-signals">
      <Signal
        label="Tiến độ"
        resource={summary.progress}
        render={(data) => `${data.percentage}% · ${data.doneTasks}/${data.totalTasks} việc`}
      />
      <Signal
        label="Cần lưu ý"
        resource={summary.attention}
        render={(data) => `${data.overdue} quá hạn · ${data.blocked} vướng mắc`}
      />
      <Signal
        label="Lịch họp sắp tới"
        resource={summary.meetings}
        render={(data) => (data.nextAt ? formatMeetingTime(data.nextAt) : 'Chưa có lịch họp sắp tới')}
      />
      <Signal label="Báo cáo tiến độ" resource={summary.reports} render={(data) => `${data.count} báo cáo`} />
    </dl>
  )
}

function Signal<T>({
  label,
  resource,
  render,
}: {
  label: string
  resource: SupervisorProjectResource<T>
  render: (data: T) => string
}) {
  return (
    <div className="lecturer-signal">
      <dt className="text-xs font-medium text-ink-muted">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-ink">
        {resource.state === 'loading' ? 'Đang tải…' : resource.state === 'error' ? resource.message : render(resource.data)}
      </dd>
    </div>
  )
}
