import { dateTimeLabel } from '../../execution/execution-utils'
import { displayLabel } from '../../../components/ui/display-label'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { useStudentJourney } from '../../../app/context'
import { useSupervisorSelection, type SupervisorAssignmentType } from '../hooks/useSupervisorSelection'
import { projectStatusLabel } from '../../projects/utils/project-status'
import { SupervisorRecommendationPanel } from '../components/SupervisorRecommendationPanel'
import { env } from '../../../app/config/env'
import { PageLoading } from '../../../components/ui/PageLoading'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { BadgeTone } from '../../../components/ui/status-badge-tone'

interface Slot { key: string; type: SupervisorAssignmentType; majorId?: number; label: string }

/** PENDING/ACCEPTED/REJECTED/CANCELLED/EXPIRED/RELEASED per SupervisorRequestDto.status — ACCEPTED
 * is the only terminal success; REJECTED needs the leader's attention; CANCELLED/EXPIRED/RELEASED
 * are all closed-without-action, shown as neutral so they read as history, not as a pending task. */
function requestStatusTone(status: string): BadgeTone {
  switch (status.toUpperCase()) {
    case 'ACCEPTED': return 'success'
    case 'PENDING': return 'warning'
    case 'REJECTED': return 'danger'
    default: return 'neutral'
  }
}

function slotLabel(assignmentType: string | undefined, majorId: number | null | undefined, majorName: (id: number) => string): string {
  return assignmentType === 'DISCIPLINE_MENTOR' ? `Mentor — ${majorId != null ? majorName(majorId) : 'ngành'}` : 'GVHD chính'
}

export function SupervisorSelectionPage() {
  const journey = useStudentJourney()
  const selection = useSupervisorSelection({
    project: journey.project,
    team: journey.team,
    profile: journey.profile,
    actions: journey.projectActions,
    refreshAll: journey.refreshAll,
  })
  const majorName = (majorId: number) => journey.project?.majors.find((item) => item.majorId === majorId)?.majorName ?? `#${majorId}`
  const slotOptions: Slot[] = [
    ...(!selection.activeAssignment && selection.canSend ? [{ key: 'PRIMARY', type: 'PRIMARY' as const, label: 'GVHD chính' }] : []),
    ...selection.missingMentorMajorIds.map((majorId) => ({ key: `MENTOR-${majorId}`, type: 'DISCIPLINE_MENTOR' as const, majorId, label: `Mentor — ${majorName(majorId)}` })),
  ]
  const [slotKey, setSlotKey] = useState<string | null>(null)
  const activeSlot = slotOptions.find((option) => option.key === slotKey) ?? slotOptions[0] ?? null

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [message, setMessage] = useState('')
  const selected = selection.candidates.find((candidate) => candidate.id === selectedId) ?? null

  const choose = (candidateId: number) => { setSelectedId(candidateId); setSelectedSlot(activeSlot) }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected || !selectedSlot) return
    const sent = await selection.send(selected, message, selectedSlot.type, selectedSlot.majorId)
    if (sent) { setSelectedId(null); setSelectedSlot(null); setMessage('') }
  }

  if (journey.isLoading || selection.loading) return <div className="p-6"><PageLoading label="Đang tải quy trình chọn giảng viên hướng dẫn…" /></div>
  if (!journey.project) return <section className="p-6"><h1>Chọn giảng viên hướng dẫn</h1><p>Bạn chưa có đồ án để thực hiện bước này.</p></section>
  if (selection.error?.kind === 'authentication') return <p className="p-6"><Link to="/login">Đăng nhập lại để tiếp tục.</Link></p>

  return (
    <main className="workspace-page mk-page-enter mx-auto max-w-5xl space-y-6 pb-12">
      <header className="border-b border-hairline pb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Định hướng đồ án</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{selection.activeAssignment ? 'Giảng viên hướng dẫn' : 'Chọn giảng viên hướng dẫn'}</h1>
        <p className="mt-2 text-sm text-slate-600">{journey.project.code} · {journey.project.title} · {projectStatusLabel(journey.project.status)}</p>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{selection.activeAssignment
          ? (selection.missingMentorMajorIds.length > 0 ? 'Đã có GVHD chính. Mời thêm Mentor cho các ngành liên quan còn thiếu xác nhận.' : 'Xem phân công hiện tại và lịch sử yêu cầu hướng dẫn của nhóm.')
          : 'Bạn có thể mời GVHD chính và Mentor từng ngành (nếu đồ án liên ngành) ngay khi đề cương còn là bản nháp — không cần chờ Bộ môn duyệt. Tìm giảng viên phù hợp và gửi lời mời từ tài khoản trưởng nhóm.'}</p>
      </header>

      {selection.error ? <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{selection.error.message}<Button className="ml-3" size="sm" variant="secondary" onClick={() => void selection.refresh(true)}>Tải lại</Button></section> : null}

      {selection.activeAssignment ? <section className="rounded-2xl border border-status-success-border bg-status-success-bg p-6">
        <h2 className="font-bold text-status-success-text">Đã có phân công hướng dẫn chính thức</h2>
        <p className="mt-1 text-sm text-status-success-text">{selection.activeAssignment.supervisorName} · phân công lúc {dateTimeLabel(selection.activeAssignment.assignedAt)}</p>
      </section> : null}

      <section className="border-b border-hairline pb-6">
        <h2 className="text-lg font-bold text-slate-900">Yêu cầu hướng dẫn</h2>
        {selection.requests.length ? <ul className="mt-3 divide-y divide-hairline">{selection.requests.map((request) => <li key={request.id} className="py-3 text-sm">
          <StatusBadge tone={requestStatusTone(request.status)} label={displayLabel(request.status)} /> · <span className="font-semibold">{slotLabel(request.assignmentType, request.majorId, majorName)}</span> · {selection.assignments.find(item => item.supervisorProfileId === request.supervisorProfileId)?.supervisorName ?? selection.candidates.find(item => item.id === request.supervisorProfileId)?.fullName ?? `Giảng viên #${request.supervisorProfileId}`} · gửi lúc {dateTimeLabel(request.requestedAt)}
          {request.status === 'PENDING' && request.expiresAt ? <span className="text-xs text-slate-500"> · hết hạn lúc {dateTimeLabel(request.expiresAt)}</span> : null}
          {request.requestMessage ? <p className="mt-1">Lời nhắn: {request.requestMessage}</p> : null}
          {request.responseMessage ? <p className="mt-1">Phản hồi: {request.responseMessage}</p> : null}
          {request.status === 'PENDING' && selection.isLeader ? <Button className="mt-2" size="sm" variant="danger" disabled={selection.cancelPending !== null} onClick={() => void selection.cancel(request)}>Hủy yêu cầu</Button> : null}
          {request.status === 'REJECTED' ? <p className="mt-2 text-xs text-slate-600">Bạn có thể chọn một giảng viên phù hợp khác.</p> : null}
          {request.status === 'EXPIRED' ? <p className="mt-2 text-xs text-slate-600">Lời mời đã quá hạn phản hồi. Bạn có thể gửi lại cho vị trí này.</p> : null}
        </li>)}</ul> : <p className="mt-2 text-sm text-slate-600">Chưa có yêu cầu hướng dẫn.</p>}
      </section>

      {env.supervisorRecommendationEnabled && selection.canSend && journey.project && <SupervisorRecommendationPanel
        projectId={journey.project.id}
        candidateIds={new Set(selection.candidates.map(candidate => candidate.id))}
        onPick={id => choose(id)} />}

      {(!selection.activeAssignment || selection.missingMentorMajorIds.length > 0) && <section className="workspace-surface workspace-surface-padding">
        {slotOptions.length === 0 ? <p className="text-sm text-slate-600">Bạn chưa thể gửi yêu cầu hướng dẫn ở trạng thái hiện tại.</p> : <>
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">Mời cho vị trí</p>
            {slotOptions.length > 1 ? <div className="flex flex-wrap items-center gap-2">
              {slotOptions.map((option) => <button key={option.key} type="button" aria-pressed={activeSlot?.key === option.key}
                onClick={() => setSlotKey(option.key)}
                className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${activeSlot?.key === option.key ? 'border-primary bg-primary text-white' : 'border-hairline bg-card text-slate-700'}`}>
                {option.label}
              </button>)}
            </div> : <p className="text-sm font-semibold text-slate-900">{activeSlot?.label}</p>}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div><label htmlFor="candidate-search" className="block text-sm font-medium">Tìm giảng viên</label><input id="candidate-search" className="mt-1 rounded border border-slate-300 px-3 py-2" value={selection.query.search} onChange={(event) => selection.setQuery((current) => ({ ...current, search: event.target.value }))} /></div>
            <div><label htmlFor="candidate-expertise" className="block text-sm font-medium">Chuyên môn</label><input id="candidate-expertise" className="mt-1 rounded border border-slate-300 px-3 py-2" value={selection.query.expertise} onChange={(event) => selection.setQuery((current) => ({ ...current, expertise: event.target.value }))} /></div>
            <Button size="sm" variant="secondary" disabled={selection.candidateLoading} onClick={() => void selection.applyFilters()}>Lọc danh sách</Button>
          </div>
          {selection.candidates.length === 0 ? <p className="mt-4 text-sm text-slate-600">Không có giảng viên phù hợp với điều kiện của đồ án.</p> : null}
          <ul className="mt-4 divide-y divide-hairline border-t border-hairline">{selection.candidates.map((candidate) => <li key={candidate.id} className="grid gap-2 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0"><h3 className="font-semibold">{candidate.fullName}</h3><p className="text-sm text-slate-600">{candidate.departmentName}</p>
            {candidate.bio ? <p className="mt-2 text-sm">{candidate.bio}</p> : null}
            <p className="mt-2 text-xs">Chuyên môn: {candidate.expertise.map((item) => item.name).join(', ') || 'Chưa cập nhật'}</p>
            <p className="mt-1 text-xs">Đang hướng dẫn {candidate.activeProjects} đồ án · còn {candidate.remainingSlots}/{candidate.semesterLimit} vị trí</p>
            </div><Button className="mt-3 md:mt-0" size="sm" disabled={!activeSlot || selection.sendRequestPending} onClick={() => choose(candidate.id)}>{slotOptions.length > 1 ? `Chọn cho ${activeSlot?.label}` : 'Chọn giảng viên'}</Button>
          </li>)}</ul>
        </>}
      </section>}

      {selected && selectedSlot ? <form className="workspace-surface workspace-surface-padding" onSubmit={(event) => void submit(event)}>
        <h2 className="font-bold text-slate-900">Gửi yêu cầu tới {selected.fullName} · {selectedSlot.label}</h2>
        <label htmlFor="request-message" className="mt-3 block text-sm font-medium">Lời nhắn (tùy chọn)</label>
        <textarea id="request-message" className="mt-1 w-full rounded border border-slate-300 p-3" value={message} onChange={(event) => setMessage(event.target.value)} />
        <div className="mt-3 flex gap-2"><Button type="submit" disabled={selection.sendRequestPending}>Gửi yêu cầu</Button><Button type="button" variant="secondary" onClick={() => { setSelectedId(null); setSelectedSlot(null) }}>Hủy</Button></div>
      </form> : null}
    </main>
  )
}
