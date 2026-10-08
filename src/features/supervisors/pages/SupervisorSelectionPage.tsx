import { dateTimeLabel } from '../../execution/execution-utils'
import { displayLabel } from '../../../components/ui/display-label'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { useStudentJourney } from '../../../app/context'
import { useSupervisorSelection } from '../hooks/useSupervisorSelection'
import { projectStatusLabel } from '../../projects/utils/project-status'

export function SupervisorSelectionPage() {
  const journey = useStudentJourney()
  const selection = useSupervisorSelection({
    project: journey.project,
    team: journey.team,
    profile: journey.profile,
    actions: journey.projectActions,
    refreshAll: journey.refreshAll,
  })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const selected = selection.candidates.find((candidate) => candidate.id === selectedId) ?? null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected) return
    const sent = await selection.send(selected, message)
    if (sent) { setSelectedId(null); setMessage('') }
  }

  if (journey.isLoading || selection.loading) return <p className="p-6">Đang tải quy trình chọn giảng viên hướng dẫn…</p>
  if (!journey.project) return <section className="p-6"><h1>Chọn giảng viên hướng dẫn</h1><p>Bạn chưa có đồ án để thực hiện bước này.</p></section>
  if (selection.error?.kind === 'authentication') return <p className="p-6"><Link to="/login">Đăng nhập lại để tiếp tục.</Link></p>

  return (
    <main className="workspace-page mk-page-enter mx-auto max-w-5xl space-y-6 pb-12">
      <header className="border-b border-hairline pb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Định hướng đồ án</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{selection.activeAssignment ? 'Giảng viên hướng dẫn' : 'Chọn giảng viên hướng dẫn'}</h1>
        <p className="mt-2 text-sm text-slate-600">{journey.project.code} · {journey.project.title} · {projectStatusLabel(journey.project.status)}</p>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{selection.activeAssignment ? 'Xem phân công hiện tại và lịch sử yêu cầu hướng dẫn của nhóm.' : 'Tìm giảng viên phù hợp với chuyên môn của đồ án và gửi lời mời từ tài khoản trưởng nhóm.'}</p>
      </header>

      {selection.error ? <section role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{selection.error.message}<Button className="ml-3" size="sm" variant="secondary" onClick={() => void selection.refresh(true)}>Tải lại</Button></section> : null}

      {selection.activeAssignment ? <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="font-bold text-emerald-900">Đã có phân công hướng dẫn chính thức</h2>
        <p className="mt-1 text-sm text-emerald-800">{selection.activeAssignment.supervisorName} · phân công lúc {dateTimeLabel(selection.activeAssignment.assignedAt)}</p>
      </section> : null}

      <section className="border-b border-hairline pb-6">
        <h2 className="text-lg font-bold text-slate-900">Yêu cầu hướng dẫn</h2>
        {selection.requests.length ? <ul className="mt-3 divide-y divide-hairline">{selection.requests.map((request) => <li key={request.id} className="py-3 text-sm">
          <strong>{displayLabel(request.status)}</strong> · {selection.assignments.find(item => item.supervisorProfileId === request.supervisorProfileId)?.supervisorName ?? selection.candidates.find(item => item.id === request.supervisorProfileId)?.fullName ?? `Giảng viên #${request.supervisorProfileId}`} · gửi lúc {dateTimeLabel(request.requestedAt)}
          {request.requestMessage ? <p className="mt-1">Lời nhắn: {request.requestMessage}</p> : null}
          {request.responseMessage ? <p className="mt-1">Phản hồi: {request.responseMessage}</p> : null}
          {request.status === 'PENDING' && selection.isLeader ? <Button className="mt-2" size="sm" variant="danger" disabled={selection.cancelPending !== null} onClick={() => void selection.cancel(request)}>Hủy yêu cầu</Button> : null}
          {request.status === 'REJECTED' ? <p className="mt-2 text-xs text-slate-600">Bạn có thể chọn một giảng viên phù hợp khác.</p> : null}
        </li>)}</ul> : <p className="mt-2 text-sm text-slate-600">Chưa có yêu cầu hướng dẫn.</p>}
      </section>

      {(!selection.activeAssignment || selection.canSend) && <section className="workspace-surface workspace-surface-padding">
        <div className="flex flex-wrap items-end gap-3">
          <div><label htmlFor="candidate-search" className="block text-sm font-medium">Tìm giảng viên</label><input id="candidate-search" className="mt-1 rounded border border-slate-300 px-3 py-2" value={selection.query.search} onChange={(event) => selection.setQuery((current) => ({ ...current, search: event.target.value }))} /></div>
          <div><label htmlFor="candidate-expertise" className="block text-sm font-medium">Chuyên môn</label><input id="candidate-expertise" className="mt-1 rounded border border-slate-300 px-3 py-2" value={selection.query.expertise} onChange={(event) => selection.setQuery((current) => ({ ...current, expertise: event.target.value }))} /></div>
          <Button size="sm" variant="secondary" disabled={selection.candidateLoading} onClick={() => void selection.applyFilters()}>Lọc danh sách</Button>
        </div>
        {!selection.canSend && !selection.activeAssignment ? <p className="mt-4 text-sm text-slate-600">Bạn chưa thể gửi yêu cầu hướng dẫn ở trạng thái hiện tại.</p> : null}
        {selection.canSend && selection.candidates.length === 0 ? <p className="mt-4 text-sm text-slate-600">Không có giảng viên phù hợp với điều kiện của đồ án.</p> : null}
        <ul className="mt-4 divide-y divide-hairline border-t border-hairline">{selection.candidates.map((candidate) => <li key={candidate.id} className="grid gap-2 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0"><h3 className="font-semibold">{candidate.fullName}</h3><p className="text-sm text-slate-600">{candidate.departmentName}</p>
          {candidate.bio ? <p className="mt-2 text-sm">{candidate.bio}</p> : null}
          <p className="mt-2 text-xs">Chuyên môn: {candidate.expertise.map((item) => item.name).join(', ') || 'Chưa cập nhật'}</p>
          <p className="mt-1 text-xs">Đang hướng dẫn {candidate.activeProjects} đồ án · còn {candidate.remainingSlots}/{candidate.semesterLimit} vị trí</p>
          </div><Button className="mt-3 md:mt-0" size="sm" disabled={!selection.canSend || selection.sendRequestPending} onClick={() => setSelectedId(candidate.id)}>Chọn giảng viên</Button>
        </li>)}</ul>
      </section>}

      {selected ? <form className="workspace-surface workspace-surface-padding" onSubmit={(event) => void submit(event)}>
        <h2 className="font-bold text-slate-900">Gửi yêu cầu tới {selected.fullName}</h2>
        <label htmlFor="request-message" className="mt-3 block text-sm font-medium">Lời nhắn (tùy chọn)</label>
        <textarea id="request-message" className="mt-1 w-full rounded border border-slate-300 p-3" value={message} onChange={(event) => setMessage(event.target.value)} />
        <div className="mt-3 flex gap-2"><Button type="submit" disabled={selection.sendRequestPending}>Gửi yêu cầu</Button><Button type="button" variant="secondary" onClick={() => setSelectedId(null)}>Hủy</Button></div>
      </form> : null}
    </main>
  )
}
