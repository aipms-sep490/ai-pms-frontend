import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuthSession } from '../auth/context/useAuthSession'
import { HttpError } from '../../services/http/http-client'
import {
  createDefenseChangeRequest, getDefenseSession, getSessionChangeRooms,
  getSessionDefenseChangeRequests, withdrawDefenseChangeRequest,
} from './defense-api'
import type { DefenseChangeRequestDto, RoomDto } from './defense-api'
import type { DefenseSession } from './defense-types'
import { isFutureOfficeSlot, todayVietnam } from './future-office-slot'
import { InlineAlert } from '../../components/ui/InlineAlert'

const slots = [
  ['08:00', '09:15'], ['09:30', '10:45'], ['11:00', '12:15'],
  ['13:30', '14:45'], ['15:00', '16:15'], ['16:30', '17:45'],
] as const
const categories = [
  ['ROOM_FACILITY_ISSUE', 'Sự cố cơ sở vật chất'],
  ['SCHEDULE_CLASH', 'Xung đột lịch'],
  ['SPECIAL_REQUIREMENT', 'Yêu cầu đặc biệt'],
  ['OTHER', 'Lý do khác'],
] as const
const localTime = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
const requestStatus: Record<string, string> = { PENDING: 'Đang chờ', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', WITHDRAWN: 'Đã rút' }
const nextDayVietnam = () => new Date(Date.now() + 86400000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' })

function errorText(reason: unknown): string {
  if (reason instanceof HttpError) {
    if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.'
    if (reason.status === 403) return 'Bạn không có quyền xem hoặc đổi lịch phiên bảo vệ này.'
    if (reason.status === 404) return 'Không tìm thấy phiên bảo vệ.'
    if (reason.status === 409) return 'Lịch hoặc yêu cầu vừa thay đổi. Tải lại trước khi thao tác tiếp.'
    if (reason.status === 400 || reason.status === 422) return 'Phòng, ca hoặc lý do chưa hợp lệ. Hãy kiểm tra dữ liệu.'
  }
  return 'Chưa hoàn thành thao tác. Hãy kiểm tra kết nối và thử lại.'
}

export function DefenseSessionChangePage() {
  const sessionId = Number(useParams().sessionId)
  const { session: login } = useAuthSession()
  const [defense, setDefense] = useState<DefenseSession | null>(null)
  const [requests, setRequests] = useState<DefenseChangeRequestDto[]>([])
  const [rooms, setRooms] = useState<RoomDto[]>([])
  const [officer, setOfficer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [revision, setRevision] = useState(0)
  const [roomId, setRoomId] = useState('')
  const [date, setDate] = useState(nextDayVietnam)
  const [slot, setSlot] = useState('')
  const [category, setCategory] = useState<(typeof categories)[number][0]>('ROOM_FACILITY_ISSUE')
  const [details, setDetails] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!Number.isSafeInteger(sessionId) || sessionId < 1) return
    const controller = new AbortController()
    ;(async () => {
      try {
        const row = await getDefenseSession(sessionId, controller.signal)
        if (controller.signal.aborted) return
        setDefense(row)
        try {
          const [history, options] = await Promise.all([
            getSessionDefenseChangeRequests(sessionId, controller.signal), getSessionChangeRooms(sessionId, controller.signal),
          ])
          if (controller.signal.aborted) return
          setRequests(history); setRooms(options); setOfficer(true); setError('')
        } catch (reason) {
          if (controller.signal.aborted) return
          setOfficer(false); setRequests([]); setRooms([])
          if (!(reason instanceof HttpError && reason.status === 403)) setError(errorText(reason))
        }
      } catch (reason) { if (!controller.signal.aborted) { setDefense(null); setError(errorText(reason)) } }
      finally { if (!controller.signal.aborted) setLoading(false) }
    })()
    return () => controller.abort()
  }, [sessionId, revision])

  const reload = () => { setLoading(true); setError(''); setSuccess(''); setRevision(value => value + 1) }
  const pending = requests.find(row => row.status === 'PENDING')
  const mayRequest = officer && defense?.status === 'SCHEDULED' && Date.parse(defense.endAt) > now
  const chosenSlot = slots[Number(slot) - 1]
  const valid = mayRequest && !pending && roomId && date && chosenSlot && isFutureOfficeSlot(date, chosenSlot[0], now) && details.trim()
    && details.length <= 2000 && (!evidenceUrl || evidenceUrl.startsWith('/api/v1/files/') || /^https:\/\//i.test(evidenceUrl))

  const submit = async () => {
    if (!valid || !chosenSlot) return
    if (!isFutureOfficeSlot(date, chosenSlot[0])) { setError('Ca đã qua. Hãy chọn ngày và ca khác.'); return }
    setBusy(true); setError(''); setSuccess('')
    try {
      const created = await createDefenseChangeRequest(sessionId, {
        desiredRoomId: Number(roomId), desiredStartAt: `${date}T${chosenSlot[0]}:00+07:00`,
        desiredEndAt: `${date}T${chosenSlot[1]}:00+07:00`, reasonCategory: category,
        reasonDetails: details.trim(), evidenceFileUrl: evidenceUrl.trim() || null,
      })
      const history = await getSessionDefenseChangeRequests(sessionId)
      if (!history.some(row => row.id === created.id && row.status === 'PENDING')) throw new Error('Request readback mismatch')
      setRequests(history); setSuccess('Đã xác minh yêu cầu đổi lịch đang chờ xử lý.')
    } catch (reason) {
      setError(reason instanceof HttpError ? errorText(reason) : 'Đã gửi yêu cầu nhưng chưa xác minh được. Hãy tải lại trước khi gửi lần nữa.')
      if (!(reason instanceof HttpError)) setOfficer(false)
    } finally { setBusy(false) }
  }

  const withdraw = async (request: DefenseChangeRequestDto) => {
    setBusy(true); setError(''); setSuccess('')
    try {
      await withdrawDefenseChangeRequest(request.id, request.concurrencyToken)
      const history = await getSessionDefenseChangeRequests(sessionId)
      if (!history.some(row => row.id === request.id && row.status === 'WITHDRAWN')) throw new Error('Withdrawal readback mismatch')
      setRequests(history); setSuccess('Đã xác minh yêu cầu được rút.')
    } catch (reason) {
      setError(reason instanceof HttpError ? errorText(reason) : 'Đã gửi lệnh rút nhưng chưa xác minh được. Hãy tải lại.')
      if (!(reason instanceof HttpError)) setOfficer(false)
    } finally { setBusy(false) }
  }

  if (!Number.isSafeInteger(sessionId) || sessionId < 1)
    return <WorkspacePage title="Phiên bảo vệ"><p role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">Mã phiên bảo vệ không hợp lệ.</p></WorkspacePage>

  return <WorkspacePage
    size="standard"
    title="Phiên bảo vệ & yêu cầu đổi lịch"
    eyebrow={defense?.projectCode ?? 'Điều chỉnh lịch bảo vệ'}
    description="Lịch chính thức được đọc từ hệ thống. Chủ tọa và thư ký có thể đề xuất đổi phòng hoặc ca trước khi phiên kết thúc."
    action={<Button variant="secondary" icon="refresh" disabled={loading || busy} onClick={reload}>Tải lại</Button>}
  >
    <div className="space-y-5">
      {loading && <p role="status" className="text-sm text-ink-muted">Đang tải phiên bảo vệ…</p>}
      {error && <InlineAlert tone="error">{error} <button type="button" onClick={reload} className="min-h-11 font-semibold underline">Tải lại</button></InlineAlert>}
      {defense && <section className="rounded-2xl border border-hairline bg-card p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-base font-bold text-ink">Lịch hiện tại</h2>
          <StatusBadge tone={defense.status === 'SCHEDULED' ? 'success' : 'danger'} label={defense.status === 'SCHEDULED' ? 'Đã lên lịch' : 'Đã hủy'} />
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Đồ án</dt>
            <dd className="mt-1 font-semibold text-ink">{defense.projectCode ? `${defense.projectCode}${defense.projectTitle ? ` · ${defense.projectTitle}` : ''}` : defense.projectTitle || 'Phiên bảo vệ'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Thời gian (giờ VN)</dt>
            <dd className="mt-1 font-medium text-ink-soft">{localTime(defense.startAt)} – {localTime(defense.endAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Phòng bảo vệ</dt>
            <dd className="mt-1 font-semibold text-ink">Phòng: {defense.room}</dd>
          </div>
        </dl>
      </section>}
      {defense && !loading && !officer && !error && <p className="rounded-xl border border-hairline bg-canvas p-4 text-sm text-ink-muted">Bạn chỉ có quyền xem lịch. Chỉ chủ tọa hoặc thư ký của hội đồng được gửi yêu cầu đổi lịch.</p>}
      {officer && !loading && <section className="rounded-2xl border border-hairline bg-card p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
          <div>
            <h2 className="font-heading text-base font-bold text-ink">Đề xuất đổi phòng / ca bảo vệ</h2>
            <p className="text-xs text-ink-muted">Chỉ chọn các phòng đang hoạt động và đủ sức chứa cho hội đồng và nhóm.</p>
          </div>
          {pending && <StatusBadge tone="warning" label="Đang có yêu cầu chờ duyệt" />}
        </div>
        {pending && <div className="rounded-xl border border-status-warning-border bg-status-warning-bg/60 p-4 text-sm space-y-2">
          <p className="font-semibold text-ink">Đang chờ xử lý: {pending.desiredRoomCode ?? rooms.find(room => room.id === pending.desiredRoomId)?.code ?? 'Phòng đề xuất'} · {localTime(pending.desiredStartAt)}</p>
          <p className="text-xs text-ink-soft">Lý do: {pending.reasonDetails}</p>
          {pending.requesterId === login?.user.id && <Button variant="secondary" size="sm" disabled={busy} onClick={() => void withdraw(pending)}>Rút yêu cầu</Button>}
        </div>}
        {!mayRequest && <p className="text-sm text-ink-muted">Chỉ có thể đề xuất khi phiên còn hiệu lực và chưa kết thúc.</p>}
        {mayRequest && !pending && rooms.length === 0 && <p className="text-sm text-ink-muted">Chưa có phòng hoạt động đủ sức chứa cho nhóm, hội đồng và chỗ dự phòng.</p>}
        {mayRequest && !pending && <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-ink-soft">Phòng đề xuất
            <select value={roomId} onChange={event => setRoomId(event.target.value)} disabled={busy} className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-card px-3 font-normal text-ink">
              <option value="">Chọn phòng</option>{rooms.map(room => <option key={room.id} value={room.id}>{room.code} · {room.building} · tầng {room.floor} · {room.capacity} chỗ</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-ink-soft">Ngày đề xuất
            <input type="date" min={todayVietnam(now)} value={date} onChange={event => setDate(event.target.value)} disabled={busy} className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-card px-3 font-normal text-ink" />
          </label>
          <label className="text-sm font-semibold text-ink-soft">Ca đề xuất
            <select value={slot} onChange={event => setSlot(event.target.value)} disabled={busy} className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-card px-3 font-normal text-ink">
              <option value="">Chọn ca</option>{slots.map(([start, end], index) => <option key={start} value={index + 1}>Ca {index + 1} · {start}–{end}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-ink-soft">Loại lý do
            <select value={category} onChange={event => setCategory(event.target.value as typeof category)} disabled={busy} className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-card px-3 font-normal text-ink">
              {categories.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-ink-soft sm:col-span-2">Lý do chi tiết
            <textarea value={details} maxLength={2000} onChange={event => setDetails(event.target.value)} disabled={busy} className="mt-1 min-h-24 w-full rounded-lg border border-line-strong bg-card p-3 font-normal text-ink" />
          </label>
          <label className="text-sm font-semibold text-ink-soft sm:col-span-2">Đường dẫn minh chứng (nếu có, HTTPS hoặc tệp AIPMS)
            <input type="url" value={evidenceUrl} onChange={event => setEvidenceUrl(event.target.value)} disabled={busy} className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-card px-3 font-normal text-ink" />
          </label>
          <div className="sm:col-span-2 flex justify-end border-t border-hairline pt-4">
            <Button type="button" disabled={busy || !valid} onClick={() => void submit()}>Gửi yêu cầu đổi lịch</Button>
          </div>
        </div>}
        {requests.filter(row => row.status !== 'PENDING').length > 0 && <div className="border-t border-hairline pt-4 text-sm">
          <h3 className="font-semibold text-ink">Lịch sử yêu cầu</h3>
          <ul className="mt-2 divide-y divide-hairline">
            {requests.filter(row => row.status !== 'PENDING').map(row => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    tone={row.status === 'APPROVED' ? 'success' : row.status === 'REJECTED' ? 'danger' : 'neutral'}
                    label={requestStatus[row.status] ?? row.status}
                  />
                  <span className="font-semibold text-ink">{row.desiredRoomCode ?? rooms.find(r => r.id === row.desiredRoomId)?.code ?? 'Phòng đề xuất'}</span>
                </div>
                <span className="font-mono text-ink-muted">{localTime(row.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>}
      </section>}
      {success && <InlineAlert tone="success">{success}</InlineAlert>}
    </div>
  </WorkspacePage>
}
