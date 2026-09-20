import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { useStudentJourney } from '../../../app/context'
import { useSupervisorSelection } from '../hooks/useSupervisorSelection'

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

  if (journey.isLoading || selection.loading) return <p className="p-6">Đang tải supervisor workflow…</p>
  if (!journey.project) return <section className="p-6"><h1>Supervisor selection</h1><p>Chưa có Project trong phạm vi của bạn.</p></section>
  if (selection.error?.kind === 'authentication') return <p className="p-6"><Link to="/login">Đăng nhập lại để tiếp tục.</Link></p>

  return (
    <main className="mx-auto max-w-5xl space-y-6 pb-12">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Supervisor matching</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Chọn giảng viên hướng dẫn</h1>
        <p className="mt-2 text-sm text-slate-600">{journey.project.code} · {journey.project.title} · Backend status: {journey.project.status}</p>
        <p className="mt-1 text-xs text-slate-500">Danh sách này chỉ đến từ candidate API theo Project; không dùng Supervisor Directory chung.</p>
      </header>

      {selection.error ? <section role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{selection.error.message}<Button className="ml-3" size="sm" variant="secondary" onClick={() => void selection.refresh(true)}>Tải lại</Button></section> : null}

      {selection.activeAssignment ? <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="font-bold text-emerald-900">Đã có phân công hướng dẫn chính thức</h2>
        <p className="mt-1 text-sm text-emerald-800">{selection.activeAssignment.supervisorName} · assigned {selection.activeAssignment.assignedAt}</p>
        <p className="mt-1 text-xs text-emerald-700">Backend assignment #{selection.activeAssignment.id}; Project status được làm mới từ Backend.</p>
      </section> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900">Yêu cầu hướng dẫn</h2>
        {selection.requests.length ? <ul className="mt-3 space-y-3">{selection.requests.map((request) => <li key={request.id} className="rounded-lg border border-slate-200 p-3 text-sm">
          <strong>{request.status}</strong> · Supervisor profile #{request.supervisorProfileId} · sent {request.requestedAt}
          {request.requestMessage ? <p className="mt-1">Lời nhắn: {request.requestMessage}</p> : null}
          {request.responseMessage ? <p className="mt-1">Phản hồi: {request.responseMessage}</p> : null}
          {request.status === 'PENDING' && selection.isLeader ? <Button className="mt-2" size="sm" variant="danger" disabled={selection.cancelPending !== null} onClick={() => void selection.cancel(request)}>Hủy yêu cầu</Button> : null}
          {request.status === 'REJECTED' ? <p className="mt-2 text-xs text-slate-600">Bạn có thể chủ động chọn một candidate đủ điều kiện khác khi Backend vẫn cho phép.</p> : null}
        </li>)}</ul> : <p className="mt-2 text-sm text-slate-600">Chưa có yêu cầu supervisor.</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-end gap-3">
          <div><label htmlFor="candidate-search" className="block text-sm font-medium">Tìm candidate</label><input id="candidate-search" className="mt-1 rounded border border-slate-300 px-3 py-2" value={selection.query.search} onChange={(event) => selection.setQuery((current) => ({ ...current, search: event.target.value }))} /></div>
          <div><label htmlFor="candidate-expertise" className="block text-sm font-medium">Expertise</label><input id="candidate-expertise" className="mt-1 rounded border border-slate-300 px-3 py-2" value={selection.query.expertise} onChange={(event) => selection.setQuery((current) => ({ ...current, expertise: event.target.value }))} /></div>
          <Button size="sm" variant="secondary" disabled={selection.candidateLoading} onClick={() => void selection.applyFilters()}>Lọc từ Backend</Button>
        </div>
        {!selection.canSend && !selection.activeAssignment ? <p className="mt-4 text-sm text-slate-600">Backend chưa cho phép bạn gửi yêu cầu supervisor ở trạng thái hiện tại.</p> : null}
        {selection.canSend && selection.candidates.length === 0 ? <p className="mt-4 text-sm text-slate-600">Không có candidate đủ điều kiện theo Project và policy Backend.</p> : null}
        <ul className="mt-4 grid gap-3 md:grid-cols-2">{selection.candidates.map((candidate) => <li key={candidate.id} className="rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold">{candidate.fullName}</h3><p className="text-sm text-slate-600">{candidate.departmentName}</p>
          {candidate.bio ? <p className="mt-2 text-sm">{candidate.bio}</p> : null}
          <p className="mt-2 text-xs">Expertise: {candidate.expertise.map((item) => item.name).join(', ') || '—'}</p>
          <p className="mt-1 text-xs">Workload: {candidate.activeProjects} active · {candidate.remainingSlots} remaining of {candidate.semesterLimit}</p>
          <Button className="mt-3" size="sm" disabled={!selection.canSend || selection.sendRequestPending} onClick={() => setSelectedId(candidate.id)}>Chọn candidate</Button>
        </li>)}</ul>
      </section>

      {selected ? <form className="rounded-2xl border border-blue-200 bg-blue-50 p-6" onSubmit={(event) => void submit(event)}>
        <h2 className="font-bold text-blue-950">Gửi yêu cầu tới {selected.fullName}</h2>
        <label htmlFor="request-message" className="mt-3 block text-sm font-medium">Lời nhắn (tùy chọn)</label>
        <textarea id="request-message" className="mt-1 w-full rounded border border-slate-300 p-3" value={message} onChange={(event) => setMessage(event.target.value)} />
        <div className="mt-3 flex gap-2"><Button type="submit" disabled={selection.sendRequestPending}>Gửi yêu cầu</Button><Button type="button" variant="secondary" onClick={() => setSelectedId(null)}>Hủy</Button></div>
      </form> : null}
    </main>
  )
}
