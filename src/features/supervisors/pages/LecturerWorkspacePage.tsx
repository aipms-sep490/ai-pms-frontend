import { formatMeetingTime } from '../../meetings/meeting-utils'
import './lecturer-workspace.css'
import { displayLabel } from '../../../components/ui/display-label'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { useSupervisorInbox } from '../hooks/useSupervisorInbox'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { useSupervisorProjectSummaries, type SupervisorProjectResource } from '../hooks/useSupervisorProjectSummaries'

export function LecturerWorkspacePage() {
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const inbox = useSupervisorInbox()
  const projectSummaries = useSupervisorProjectSummaries(inbox.assignments, inbox.projects ?? {})
  const leaderChangeRequests = inbox.leaderChangeRequests ?? []
  const [responseByRequest, setResponseByRequest] = useState<Record<number, string>>({})
  const [leaderResponseByRequest, setLeaderResponseByRequest] = useState<Record<number, string>>({})

  const decide = async (requestId: number, decision: 'accept' | 'reject') => {
    const request = inbox.requests.find((item) => item.id === requestId)
    if (!request) return
    if (await requestConfirmation({ title: decision === 'accept' ? 'Nhận hướng dẫn đồ án?' : 'Từ chối hướng dẫn?', description: inbox.projects?.[request.projectId]?.title ?? 'Xác nhận quyết định đối với yêu cầu hướng dẫn này.', confirmLabel: decision === 'accept' ? 'Nhận hướng dẫn' : 'Từ chối yêu cầu', danger: decision === 'reject' }) === null) return
    await inbox.respond(request, decision, responseByRequest[request.id])
  }

  const decideLeaderChange = async (requestId: number, decision: 'approve' | 'reject') => {
    if (await requestConfirmation({ title: decision === 'approve' ? 'Chấp thuận thay đổi trưởng nhóm?' : 'Từ chối thay đổi trưởng nhóm?', description: 'Quyết định này áp dụng cho đề nghị đang được xử lý.', confirmLabel: decision === 'approve' ? 'Chấp thuận thay đổi' : 'Từ chối đề nghị', danger: decision === 'reject' }) === null) return
    await inbox.respondToLeaderChange(requestId, decision, leaderResponseByRequest[requestId])
  }

  if (inbox.error?.kind === 'authentication') return <p className="p-6"><Link to="/login">Đăng nhập lại để tiếp tục.</Link></p>
  return (
    <WorkspacePage className="lecturer-workspace space-y-6" title="Hướng dẫn đồ án" eyebrow="Giảng viên hướng dẫn" description="Theo dõi tiến độ, góp ý cho nhóm và xử lý các đề nghị hướng dẫn." action={<Button variant="secondary" icon="refresh" disabled={inbox.loading} onClick={() => void inbox.refresh()}>Tải lại</Button>}>

      {inbox.error ? <section role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{inbox.error.message}</section> : null}

      <section className="lecturer-projects" aria-labelledby="assigned-projects">
        <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 id="assigned-projects" className="mt-1 text-lg font-bold">Đồ án đang hướng dẫn</h2><p className="mt-1 text-sm text-ink-muted">Chọn công việc, báo cáo hoặc cuộc họp để tiếp tục hướng dẫn nhóm.</p></div></div>
        {inbox.loading ? <p role="status" className="mt-4 text-sm text-ink-muted">Đang tải đồ án được phân công…</p> : null}
        {!inbox.loading && inbox.assignments.length === 0 ? <p className="mt-4 text-sm text-ink-muted">Chưa được phân công đồ án.</p> : null}
        <ul className="lecturer-project-list">{inbox.assignments.map((assignment) => {
          const project = inbox.projects?.[assignment.projectId]
          const isActive = project?.status?.replaceAll('_', '').toUpperCase() === 'ACTIVE'
          const canOpen = assignment.isPrimary && !assignment.endedAt && isActive
          const isMentor = assignment.assignmentType === 'DISCIPLINE_MENTOR'
          const canOpenMentor = isMentor && !assignment.endedAt && isActive && Boolean(assignment.majorId)
          const assignedDateFormatted = assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleDateString('vi-VN') : '—'
          const endedDateFormatted = assignment.endedAt ? new Date(assignment.endedAt).toLocaleDateString('vi-VN') : ''
          return <li key={assignment.id} className="lecturer-project">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${assignment.isPrimary ? 'bg-primary/15 text-primary' : 'bg-blue-100 text-blue-800'}`}>
                    {assignment.isPrimary ? 'Hướng dẫn chính' : isMentor ? 'Hướng dẫn chuyên ngành' : 'Đồng hướng dẫn'}
                  </span>
                  <span className="text-xs text-ink-muted">· {project?.code ?? `#${assignment.projectId}`}</span>
                </div>
                <h3 className="break-words font-semibold text-ink text-lg">{project?.title ?? `Đồ án #${assignment.projectId}`}</h3>
                <p className="mt-1 text-xs text-ink-muted">Nhóm sinh viên: <strong className="text-ink-soft">{project?.teamName ?? 'Chưa tải được nhóm'}</strong></p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${project?.status === 'ACTIVE' ? 'border-status-success-border bg-status-success-bg text-status-success-text' : 'border-hairline bg-card text-ink-soft'}`}>
                {project?.status === 'ACTIVE' ? 'Đang thực hiện' : displayLabel(project?.status)}
              </span>
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              Phân công: {assignedDateFormatted}{endedDateFormatted ? ` · Kết thúc: ${endedDateFormatted}` : ''}
            </p>
            {canOpen ? <ProjectSignals summary={projectSummaries[assignment.projectId]} /> : <p className="mt-4 text-sm text-ink-muted">{canOpenMentor ? 'Phân công đang hoạt động trong phạm vi chuyên ngành.' : 'Phân công đã kết thúc hoặc đồ án không còn trong giai đoạn thực hiện.'}</p>}
            {canOpenMentor ? <nav className="lecturer-project-actions" aria-label={`Hướng dẫn chuyên ngành đồ án ${project?.code ?? assignment.projectId}`}><Link className="lecturer-action lecturer-action-primary" to={`/mentor/projects/${assignment.projectId}/majors/${assignment.majorId}/workspace`}>Mở hướng dẫn chuyên ngành</Link></nav> : null}
            {canOpen ? <nav className="lecturer-project-actions" aria-label={`Chức năng đồ án ${project?.code ?? assignment.projectId}`}>
              <Link className="lecturer-action lecturer-action-primary" to={`/supervisor/projects/${assignment.projectId}/workspace`}>Tổng quan đồ án <span aria-hidden="true">→</span></Link>
              <Link className="lecturer-action" to={`/supervisor/projects/${assignment.projectId}/tasks`}>Công việc</Link>
              <Link className="lecturer-action" to={`/supervisor/projects/${assignment.projectId}/review-gates`}>Tiến trình Gates</Link>
              <Link className="lecturer-action" to={`/supervisor/projects/${assignment.projectId}/reports`}>Báo cáo tiến độ</Link>
              <Link className="lecturer-action" to={`/supervisor/projects/${assignment.projectId}/meetings`}>Lịch họp</Link>
              <Link className="lecturer-action" to={`/supervisor/projects/${assignment.projectId}/deliverables`}>Hạng mục cần nộp</Link>
            </nav> : null}
          </li>
        })}</ul>
      </section>

      <section className="lecturer-requests">
        <h2 className="text-lg font-bold">Yêu cầu hướng dẫn</h2>
        {inbox.loading ? <p className="mt-3 text-sm text-ink-muted">Đang tải yêu cầu…</p> : null}
        {!inbox.loading && inbox.requests.length === 0 ? <p className="mt-3 text-sm text-ink-muted">Chưa có yêu cầu hướng dẫn.</p> : null}
        <ul className="mt-4 space-y-3">{[...inbox.requests].sort((a, b) => Number(b.status === 'PENDING') - Number(a.status === 'PENDING')).map((request) => {
          const project = inbox.projects?.[request.projectId]
          const team = project ? inbox.teams?.[project.teamId] : null
          const majorNames = new Map((project?.majors ?? []).map((major) => [major.majorId, major.majorName]))
          const isPending = request.status === 'PENDING'
          return <li key={request.id} className="lecturer-request text-sm rounded-lg p-3 transition-colors">
            <details open={isPending} className="group">
              <summary className="lecturer-request-summary cursor-pointer">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm" aria-hidden="true">mail</span>
                    <strong>{project?.title ?? `Đồ án #${request.projectId}`}{project?.code ? ` · ${project.code}` : ''}</strong>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isPending ? 'bg-amber-100 text-amber-800' : 'bg-canvas text-ink-soft'}`}>
                    {displayLabel(request.status)}
                  </span>
                </div>
              </summary>
              <p className="mt-3 text-xs text-ink-muted">Ngày gửi: {new Date(request.requestedAt).toLocaleDateString('vi-VN')}</p>
              {team ? (
                <div className="mt-4 lecturer-team rounded-r-md bg-canvas/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>{team.name} · {team.code}</strong>
                    <span className="text-xs text-ink-muted">{team.members.length} thành viên</span>
                  </div>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {team.members.map((member) => (
                      <li key={member.userId} className="text-xs text-ink-soft">
                        <span className="font-semibold text-ink">{member.fullName}</span>
                        {member.isLeader ? ' · Trưởng nhóm' : ''}{member.majorId ? ` · ${majorNames.get(member.majorId) ?? 'Chưa tải được tên chuyên ngành'}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {request.requestMessage ? <p className="mt-3 leading-relaxed text-ink-muted text-xs bg-card border border-hairline rounded-md p-2.5">Lời nhắn của nhóm: {request.requestMessage}</p> : null}
              {request.responseMessage ? <p className="mt-3 leading-relaxed text-ink-muted text-xs bg-emerald-50/50 border border-emerald-100 rounded-md p-2.5">Phản hồi: {request.responseMessage}</p> : null}
              {request.status === 'PENDING' ? (
                <div className="mt-3 space-y-2">
                  <label className="block text-xs font-medium text-ink-soft">
                    Phản hồi (tùy chọn)
                    <textarea className="mt-1 block w-full rounded-md border border-line-strong p-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" rows={2} value={responseByRequest[request.id] ?? ''} onChange={(event) => setResponseByRequest((current) => ({ ...current, [request.id]: event.target.value }))} />
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button disabled={inbox.acceptPending !== null || inbox.rejectPending !== null} onClick={() => void decide(request.id, 'accept')}>Nhận hướng dẫn</Button>
                    <Button variant="danger" disabled={inbox.acceptPending !== null || inbox.rejectPending !== null} onClick={() => void decide(request.id, 'reject')}>Từ chối</Button>
                  </div>
                </div>
              ) : null}
            </details>
          </li>
        })}</ul>
      </section>

      <section className="lecturer-requests">
        <h2 className="text-lg font-bold">Đề nghị đổi trưởng nhóm</h2>
        <p className="mt-1 text-xs text-ink-muted">Xem xét đề nghị từ các nhóm bạn đang hướng dẫn. Thành viên kế nhiệm phải đủ điều kiện tại thời điểm phê duyệt.</p>
        {leaderChangeRequests.length === 0 ? <p className="mt-3 text-sm text-ink-muted">Chưa có đề nghị đổi trưởng nhóm cần xử lý.</p> : null}
        <ul className="mt-4 space-y-3">
          {leaderChangeRequests.map((request) => {
            const team = inbox.teams?.[request.teamId]
            const current = team?.members.find((member) => member.userId === request.currentLeaderUserId)
            const target = team?.members.find((member) => member.userId === request.newLeaderUserId)
            return (
              <li key={request.id} className="border-b border-hairline py-4 text-sm last:border-b-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{team?.name ?? 'Nhóm #' + request.teamId}</strong>
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">{displayLabel(request.status)}</span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <p><span className="text-xs text-ink-muted">Trưởng nhóm hiện tại</span><br/><b>{current?.fullName ?? '#' + request.currentLeaderUserId}</b></p>
                  <p><span className="text-xs text-ink-muted">Trưởng nhóm đề xuất</span><br/><b>{target?.fullName ?? '#' + request.newLeaderUserId}</b>{target?.qualificationStatus ? ' · ' + displayLabel(target.qualificationStatus) : ''}</p>
                </div>
                {request.requestMessage ? <p className="mt-3 leading-relaxed text-ink-muted text-xs">Lý do: {request.requestMessage}</p> : null}
                <label className="mt-3 block text-xs">Phản hồi (tùy chọn)
                  <textarea
                    className="mt-1 block w-full rounded border border-line-strong p-2"
                    value={leaderResponseByRequest[request.id] ?? ''}
                    onChange={(event) => setLeaderResponseByRequest((currentState) => ({ ...currentState, [request.id]: event.target.value }))}
                  />
                </label>
                <div className="mt-3 flex gap-2">
                  <Button onClick={() => void decideLeaderChange(request.id, 'approve')}>Chấp thuận đổi trưởng nhóm</Button>
                  <Button variant="danger" onClick={() => void decideLeaderChange(request.id, 'reject')}>Từ chối</Button>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {confirmationDialog}
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

