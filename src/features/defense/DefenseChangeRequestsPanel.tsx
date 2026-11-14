import { useEffect, useState } from 'react'
import { HttpError } from '../../services/http/http-client'
import { decideDefenseChangeRequest, getPeriodDefenseChangeRequests, getPeriodDefenseSessions } from './defense-api'
import type { DefenseChangeRequestDto, PeriodDefenseSessionDto } from './defense-api'
import type { RoomDto } from './room-planner-api'

function message(reason: unknown): string {
  if (reason instanceof HttpError) {
    if (reason.status === 403) return 'Bạn không có quyền xử lý yêu cầu đổi lịch trong kỳ này.'
    if (reason.status === 409) return 'Yêu cầu hoặc lịch đã thay đổi. Tải lại trước khi quyết định.'
    if (reason.status === 400 || reason.status === 422) return reason.problem?.detail || 'Thông tin quyết định chưa hợp lệ.'
  }
  return 'Chưa tải hoặc xử lý được yêu cầu đổi lịch. Hãy thử lại.'
}

const formatTime = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
const categoryLabel: Record<string, string> = { ROOM_FACILITY_ISSUE: 'Sự cố cơ sở vật chất',
  SCHEDULE_CLASH: 'Xung đột lịch', SPECIAL_REQUIREMENT: 'Yêu cầu đặc biệt', OTHER: 'Lý do khác' }

export function DefenseChangeRequestsPanel({ periodId, rooms, onScheduleChanged }: {
  periodId: number
  rooms: RoomDto[]
  onScheduleChanged: () => void
}) {
  const [requests, setRequests] = useState<DefenseChangeRequestDto[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getPeriodDefenseChangeRequests(periodId, 'PENDING', controller.signal)
      .then(rows => { if (!controller.signal.aborted) { setRequests(rows); setError('') } })
      .catch(reason => { if (!controller.signal.aborted) { setRequests([]); setError(message(reason)) } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [periodId, revision])

  const reload = () => { setRequests([]); setLoading(true); setError(''); setSuccess(''); setRevision(value => value + 1) }
  const decide = async (request: DefenseChangeRequestDto, decision: 'APPROVED' | 'REJECTED') => {
    setBusyId(request.id); setError(''); setSuccess('')
    try {
      await decideDefenseChangeRequest(request.id, {
        decision, reviewNote: notes[request.id]?.trim() || undefined, concurrencyToken: request.concurrencyToken,
      })
      const all = await getPeriodDefenseChangeRequests(periodId)
      const persisted = all.find(row => row.id === request.id)
      if (!persisted || persisted.status !== decision) throw new Error('Decision readback mismatch')
      if (decision === 'APPROVED') {
        const sessions: PeriodDefenseSessionDto[] = await getPeriodDefenseSessions(periodId)
        const session = sessions.find(row => row.id === request.defenseSessionId)
        if (!session || session.status !== 'SCHEDULED' || session.roomId !== request.desiredRoomId
          || Date.parse(session.startAt) !== Date.parse(request.desiredStartAt)
          || Date.parse(session.endAt) !== Date.parse(request.desiredEndAt)) throw new Error('Schedule readback mismatch')
        onScheduleChanged()
      }
      setRequests(all.filter(row => row.status === 'PENDING'))
      setSuccess(decision === 'APPROVED' ? 'Đã xác minh lịch bảo vệ mới.' : 'Đã xác minh quyết định từ chối.')
    } catch (reason) {
      setError(reason instanceof HttpError ? message(reason) : 'Đã gửi quyết định nhưng chưa xác minh được kết quả. Tải lại trước khi thao tác tiếp.')
      setRequests([])
    } finally { setBusyId(null) }
  }

  return <section aria-label="Yêu cầu đổi lịch bảo vệ" className="rounded-2xl border border-hairline bg-surface p-4 shadow-xs">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold">Yêu cầu đổi lịch bảo vệ · Gate 4</h2>
      <button type="button" onClick={reload} disabled={busyId !== null}
        className="min-h-11 rounded-lg border border-hairline px-3 text-sm font-semibold text-primary disabled:opacity-50">Tải lại yêu cầu</button>
    </div>
    {loading && <p role="status" className="mt-3 text-sm text-ink-muted">Đang tải yêu cầu đổi lịch…</p>}
    {error && <p role="alert" className="mt-3 text-sm text-status-error-text">{error}</p>}
    {success && <p role="status" className="mt-3 text-sm text-status-success-text">{success}</p>}
    {!loading && !error && requests.length === 0 && <p className="mt-3 text-sm text-ink-muted">Không có yêu cầu đang chờ trong phạm vi của bạn.</p>}
    {!loading && requests.map(request => <article key={request.id} className="mt-3 rounded-xl border border-hairline p-4">
      <h3 className="font-semibold">Phiên bảo vệ #{request.defenseSessionId} · Yêu cầu #{request.id}</h3>
      <p className="mt-1 text-sm text-ink-muted">Phòng hiện tại #{request.currentRoomId} · {formatTime(request.currentStartAt)}</p>
      <p className="text-sm">Đề xuất: {rooms.find(room => room.id === request.desiredRoomId)?.code ?? `Phòng #${request.desiredRoomId}`} · {formatTime(request.desiredStartAt)} – {formatTime(request.desiredEndAt)}</p>
      <p className="mt-2 text-sm"><strong>Lý do:</strong> {categoryLabel[request.reasonCategory] ?? request.reasonCategory} · {request.reasonDetails}</p>
      {request.evidenceFileUrl && <p className="mt-1 break-all text-sm">Minh chứng: {request.evidenceFileUrl}</p>}
      <label className="mt-3 block text-sm font-semibold">Ghi chú xử lý
        <textarea value={notes[request.id] ?? ''} maxLength={2000} disabled={busyId !== null}
          onChange={event => setNotes(current => ({ ...current, [request.id]: event.target.value }))}
          className="mt-1 min-h-20 w-full rounded-lg border border-hairline p-2" />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => void decide(request, 'APPROVED')} disabled={busyId !== null}
          className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">Duyệt đổi lịch</button>
        <button type="button" onClick={() => void decide(request, 'REJECTED')} disabled={busyId !== null}
          className="min-h-11 rounded-lg border border-hairline px-4 text-sm font-semibold disabled:opacity-50">Từ chối</button>
      </div>
    </article>)}
  </section>
}
