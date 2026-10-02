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
    <main className="mx-auto max-w-5xl space-y-6 pb-12">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-medium text-slate-600">Giảng viên hướng dẫn</p><h1 className="mt-1 text-2xl font-bold">Bàn làm việc</h1><p className="mt-1 text-sm text-slate-600">Theo dõi yêu cầu hướng dẫn và các đồ án được phân công cho bạn.</p></div>
        <Button variant="secondary" disabled={inbox.loading} onClick={() => void inbox.refresh()}>Tải lại</Button>
      </header>

      {inbox.error ? <section role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{inbox.error.message}</section> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-bold">Yêu cầu hướng dẫn</h2>
        {inbox.loading ? <p className="mt-3 text-sm text-slate-600">Đang tải yêu cầu…</p> : null}
        {!inbox.loading && inbox.requests.length === 0 ? <p className="mt-3 text-sm text-slate-600">Chưa có yêu cầu hướng dẫn.</p> : null}
        <ul className="mt-4 space-y-3">{inbox.requests.map((request) => {
          const project = inbox.projects?.[request.projectId]
          const team = project ? inbox.teams?.[project.teamId] : null
          return <li key={request.id} className="rounded-xl border border-slate-200 p-4 text-sm">
          <div className="flex flex-wrap justify-between gap-2"><strong>{project?.title ?? `Project #${request.projectId}`}{project?.code ? ` · ${project.code}` : ''}</strong><span>{request.status}</span></div>
          <p className="mt-1 text-xs text-slate-600">Ngày gửi: {new Date(request.requestedAt).toLocaleDateString('vi-VN')}</p>
          {team ? <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{team.name} · {team.code}</strong><span className="text-xs text-slate-500">{team.members.length} thành viên</span></div><ul className="mt-2 grid gap-2 sm:grid-cols-2">{team.members.map((member) => <li key={member.userId} className="text-xs text-slate-700"><span className="font-semibold text-slate-900">{member.fullName}</span>{member.isLeader ? ' · Trưởng nhóm' : ''}{member.majorId ? ` · Major #${member.majorId}` : ''}</li>)}</ul></div> : null}
          {request.requestMessage ? <p className="mt-2 rounded bg-slate-50 p-2">Lời nhắn của nhóm: {request.requestMessage}</p> : null}
          {request.responseMessage ? <p className="mt-2 rounded bg-slate-50 p-2">Phản hồi: {request.responseMessage}</p> : null}
          {request.status === 'PENDING' ? <div className="mt-3 space-y-2"><label className="block text-xs">Phản hồi (tùy chọn)<textarea className="mt-1 block w-full rounded border border-slate-300 p-2" value={responseByRequest[request.id] ?? ''} onChange={(event) => setResponseByRequest((current) => ({ ...current, [request.id]: event.target.value }))} /></label><div className="flex flex-wrap gap-2"><Button disabled={inbox.acceptPending !== null || inbox.rejectPending !== null} onClick={() => void decide(request.id, 'accept')}>Accept & assign</Button><Button variant="danger" disabled={inbox.acceptPending !== null || inbox.rejectPending !== null} onClick={() => void decide(request.id, 'reject')}>Reject</Button></div></div> : null}
        </li>})}</ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-bold">Yêu cầu thay đổi Trưởng nhóm</h2>
        <p className="mt-1 text-xs text-slate-500">Xem xét đề nghị từ các nhóm bạn đang hướng dẫn. Thành viên kế nhiệm phải đủ điều kiện tại thời điểm phê duyệt.</p>
        {leaderChangeRequests.length === 0 ? <p className="mt-3 text-sm text-slate-600">Chưa có đề nghị thay đổi Trưởng nhóm cần xử lý.</p> : null}
        <ul className="mt-4 space-y-3">
          {leaderChangeRequests.map((request) => {
            const team = inbox.teams?.[request.teamId]
            const current = team?.members.find((member) => member.userId === request.currentLeaderUserId)
            const target = team?.members.find((member) => member.userId === request.newLeaderUserId)
            return (
              <li key={request.id} className="rounded-xl border border-slate-200 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{team?.name ?? 'Team #' + request.teamId}</strong>
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">{request.status}</span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <p><span className="text-xs text-slate-500">Leader hiện tại</span><br/><b>{current?.fullName ?? '#' + request.currentLeaderUserId}</b></p>
                  <p><span className="text-xs text-slate-500">Leader đề xuất</span><br/><b>{target?.fullName ?? '#' + request.newLeaderUserId}</b>{target?.qualificationStatus ? ' · ' + target.qualificationStatus : ''}</p>
                </div>
                {request.requestMessage ? <p className="mt-2 rounded bg-slate-50 p-2 text-xs">Lý do: {request.requestMessage}</p> : null}
                <label className="mt-3 block text-xs">Phản hồi (tùy chọn)
                  <textarea
                    className="mt-1 block w-full rounded border border-slate-300 p-2"
                    value={leaderResponseByRequest[request.id] ?? ''}
                    onChange={(event) => setLeaderResponseByRequest((currentState) => ({ ...currentState, [request.id]: event.target.value }))}
                  />
                </label>
                <div className="mt-3 flex gap-2">
                  <Button onClick={() => void decideLeaderChange(request.id, 'approve')}>Approve Leader Change</Button>
                  <Button variant="danger" onClick={() => void decideLeaderChange(request.id, 'reject')}>Reject</Button>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-hairline bg-card p-5 shadow-xs sm:p-6" aria-labelledby="assigned-projects">
        <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Theo dõi / phản hồi</p><h2 id="assigned-projects" className="mt-1 text-lg font-bold">Dự án đang hướng dẫn</h2><p className="mt-1 text-sm text-slate-600">Chỉ mở không gian giám sát cho assignment primary còn hiệu lực và project `ACTIVE`.</p></div></div>
        {inbox.loading ? <p role="status" className="mt-4 text-sm text-slate-600">Đang tải đồ án được phân công…</p> : null}
        {!inbox.loading && inbox.assignments.length === 0 ? <p className="mt-4 text-sm text-slate-600">Chưa được phân công đồ án.</p> : null}
        <ul className="mt-4 grid gap-4 lg:grid-cols-2">{inbox.assignments.map((assignment) => {
          const project = inbox.projects?.[assignment.projectId]
          const isActive = project?.status?.replaceAll('_', '').toUpperCase() === 'ACTIVE'
          const canOpen = assignment.isPrimary && !assignment.endedAt && isActive
          return <li key={assignment.id} className="min-w-0 rounded-xl border border-hairline bg-canvas p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-semibold text-slate-900">{project?.title ?? `Project #${assignment.projectId}`}</h3><p className="mt-1 text-xs text-slate-600">{project?.code ?? `#${assignment.projectId}`} · {project?.teamName ?? 'Chưa tải được nhóm'}</p></div><span className="rounded-full border border-hairline bg-card px-2 py-1 text-xs font-semibold text-slate-700">{project?.status ?? 'Chưa tải trạng thái'}</span></div>
            <p className="mt-3 text-xs text-slate-600">{assignment.isPrimary ? 'GVHD chính' : 'GVHD phụ/mentor'} · phân công {assignment.assignedAt}{assignment.endedAt ? ` · kết thúc ${assignment.endedAt}` : ''}</p>
            {canOpen ? <ProjectSignals summary={projectSummaries[assignment.projectId]} /> : <p className="mt-4 rounded-lg border border-hairline bg-card p-3 text-xs text-slate-600">Không mở workspace: assignment hoặc trạng thái Project hiện không còn phù hợp.</p>}
            {canOpen ? <div className="mt-4 flex flex-wrap gap-3"><Link className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to={`/supervisor/projects/${assignment.projectId}/workspace`}>Mở không gian giám sát</Link><Link className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to={`/supervisor/projects/${assignment.projectId}/meetings`}>Xem lịch họp</Link></div> : null}
          </li>
        })}</ul>
      </section>
      {confirmationDialog}
    </main>
  )
}

function ProjectSignals({ summary }: { summary?: ReturnType<typeof useSupervisorProjectSummaries>[number] }) {
  if (!summary) return <p role="status" className="mt-4 text-xs text-slate-600">Đang tải tiến độ và lịch theo dữ liệu Backend…</p>
  return <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
    <Signal label="Tiến độ" resource={summary.progress} render={data => `${data.percentage}% · ${data.doneTasks}/${data.totalTasks} việc`} />
    <Signal label="Cần lưu ý" resource={summary.attention} render={data => `${data.overdue} quá hạn · ${data.blocked} vướng mắc`} />
    <Signal label="Lịch họp sắp tới" resource={summary.meetings} render={data => data.nextAt ? new Date(data.nextAt).toLocaleString('vi-VN') : 'Chưa có lịch họp sắp tới'} />
    <Signal label="Báo cáo tiến độ" resource={summary.reports} render={data => `${data.count} báo cáo`} />
  </dl>
}

function Signal<T>({ label, resource, render }: { label: string; resource: SupervisorProjectResource<T>; render: (data: T) => string }) {
  return <div className="min-w-0 rounded-lg border border-hairline bg-card p-3"><dt className="text-slate-600">{label}</dt><dd className="mt-1 break-words font-semibold text-slate-900">{resource.state === 'loading' ? 'Đang tải…' : resource.state === 'error' ? resource.message : render(resource.data)}</dd></div>
}
