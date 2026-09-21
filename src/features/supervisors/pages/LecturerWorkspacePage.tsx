import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { useSupervisorInbox } from '../hooks/useSupervisorInbox'

export function LecturerWorkspacePage() {
  const inbox = useSupervisorInbox()
  const leaderChangeRequests = inbox.leaderChangeRequests ?? []
  const [responseByRequest, setResponseByRequest] = useState<Record<number, string>>({})
  const [leaderResponseByRequest, setLeaderResponseByRequest] = useState<Record<number, string>>({})

  const decide = async (requestId: number, decision: 'accept' | 'reject') => {
    const request = inbox.requests.find((item) => item.id === requestId)
    if (!request) return
    if (!confirm(`Xác nhận ${decision === 'accept' ? 'nhận' : 'từ chối'} yêu cầu #${request.id}?`)) return
    await inbox.respond(request, decision, responseByRequest[request.id])
  }

  const decideLeaderChange = async (requestId: number, decision: 'approve' | 'reject') => {
    if (!confirm('Xác nhận ' + (decision === 'approve' ? 'phê duyệt' : 'từ chối') + ' yêu cầu thay đổi Trưởng nhóm #' + requestId + '?')) return
    await inbox.respondToLeaderChange(requestId, decision, leaderResponseByRequest[requestId])
  }

  if (inbox.error?.kind === 'authentication') return <p className="p-6"><Link to="/login">Đăng nhập lại để tiếp tục.</Link></p>
  return (
    <main className="mx-auto max-w-5xl space-y-6 pb-12">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Supervisor</p><h1 className="mt-1 text-2xl font-bold">Supervisor Inbox & Assignments</h1><p className="mt-1 text-sm text-slate-600">Backend chỉ trả các yêu cầu thuộc Supervisor đang đăng nhập.</p></div>
        <Button variant="secondary" disabled={inbox.loading} onClick={() => void inbox.refresh()}>Tải lại</Button>
      </header>

      {inbox.error ? <section role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{inbox.error.message}</section> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-bold">Yêu cầu hướng dẫn</h2>
        {inbox.loading ? <p className="mt-3 text-sm text-slate-600">Đang tải inbox…</p> : null}
        {!inbox.loading && inbox.requests.length === 0 ? <p className="mt-3 text-sm text-slate-600">Không có yêu cầu trong Inbox được Backend scope.</p> : null}
        <ul className="mt-4 space-y-3">{inbox.requests.map((request) => {
          const project = inbox.projects?.[request.projectId]
          const team = project ? inbox.teams?.[project.teamId] : null
          return <li key={request.id} className="rounded-xl border border-slate-200 p-4 text-sm">
          <div className="flex flex-wrap justify-between gap-2"><strong>{project?.title ?? `Project #${request.projectId}`}{project?.code ? ` · ${project.code}` : ''}</strong><span>{request.status}</span></div>
          <p className="mt-1 text-xs text-slate-600">Requested {request.requestedAt} · profile #{request.supervisorProfileId}</p>
          {team ? <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{team.name} · {team.code}</strong><span className="text-xs text-slate-500">{team.members.length} thành viên</span></div><ul className="mt-2 grid gap-2 sm:grid-cols-2">{team.members.map((member) => <li key={member.userId} className="text-xs text-slate-700"><span className="font-semibold text-slate-900">{member.fullName}</span>{member.isLeader ? ' · Trưởng nhóm' : ''}{member.majorId ? ` · Major #${member.majorId}` : ''}</li>)}</ul></div> : null}
          {request.requestMessage ? <p className="mt-2 rounded bg-slate-50 p-2">Student message: {request.requestMessage}</p> : null}
          {request.responseMessage ? <p className="mt-2 rounded bg-slate-50 p-2">Response: {request.responseMessage}</p> : null}
          {request.status === 'PENDING' ? <div className="mt-3 space-y-2"><label className="block text-xs">Phản hồi (tùy chọn)<textarea className="mt-1 block w-full rounded border border-slate-300 p-2" value={responseByRequest[request.id] ?? ''} onChange={(event) => setResponseByRequest((current) => ({ ...current, [request.id]: event.target.value }))} /></label><div className="flex flex-wrap gap-2"><Button disabled={inbox.acceptPending !== null || inbox.rejectPending !== null} onClick={() => void decide(request.id, 'accept')}>Accept & assign</Button><Button variant="danger" disabled={inbox.acceptPending !== null || inbox.rejectPending !== null} onClick={() => void decide(request.id, 'reject')}>Reject</Button></div></div> : null}
        </li>})}</ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-bold">Yêu cầu thay đổi Trưởng nhóm</h2>
        <p className="mt-1 text-xs text-slate-500">Chỉ yêu cầu của Project mà bạn đang là Mentor hiện tại được backend trả về. Việc Approve sẽ xác minh lại thành viên, academic scope và qualification trước khi đổi Leader.</p>
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

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-bold">Primary assignments</h2>
        {inbox.loading ? <p className="mt-3 text-sm text-slate-600">Đang tải assignments…</p> : null}
        {!inbox.loading && inbox.assignments.length === 0 ? <p className="mt-3 text-sm text-slate-600">Chưa có assignment.</p> : null}
        <ul className="mt-4 space-y-2">{inbox.assignments.map((assignment) => {
          const project = inbox.projects?.[assignment.projectId]
          const isActive = project?.status?.replaceAll('_', '').toUpperCase() === 'ACTIVE'
          return <li key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm"><span>{project?.title ?? `Project #${assignment.projectId}`} · {assignment.isPrimary ? 'Primary Supervisor' : 'Mentor/secondary'} · assigned {assignment.assignedAt}{assignment.endedAt ? ` · ended ${assignment.endedAt}` : ''}</span>{assignment.isPrimary && !assignment.endedAt && isActive ? <Link className="rounded-lg border border-emerald-300 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50" to={`/supervisor/projects/${assignment.projectId}/workspace`}>Mở Project ACTIVE</Link> : null}</li>
        })}</ul>
      </section>
    </main>
  )
}
