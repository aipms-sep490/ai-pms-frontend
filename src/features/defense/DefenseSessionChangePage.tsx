import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { useAuthSession } from '../auth/context/useAuthSession'
import { HttpError } from '../../services/http/http-client'
import {
  createDefenseChangeRequest, getDefenseSession, getSessionChangeRooms,
  getSessionDefenseChangeRequests, withdrawDefenseChangeRequest,
} from './defense-api'
import type { DefenseChangeRequestDto, RoomDto } from './defense-api'
import type { DefenseSession } from './defense-types'

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
  const valid = mayRequest && !pending && roomId && date && chosenSlot && details.trim()
    && details.length <= 2000 && (!evidenceUrl || evidenceUrl.startsWith('/api/v1/files/') || /^https:\/\//i.test(evidenceUrl))

  const submit = async () => {
    if (!valid || !chosenSlot) return
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
    return <WorkspacePage title="Phiên bảo vệ"><p role="alert">Mã phiên bảo vệ không hợp lệ.</p></WorkspacePage>

  return <WorkspacePage title="Phiên bảo vệ & yêu cầu đổi lịch" eyebrow={`Phiên #${sessionId}`}
    description="Lịch chính thức được đọc từ hệ thống. Chủ tọa và thư ký có thể đề xuất đổi phòng hoặc ca trước khi phiên kết thúc.">
    <div className="space-y-5">
      {loading && <p role="status" className="text-sm">Đang tải phiên bảo vệ…</p>}
      {error && <div role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{error} <button type="button" onClick={reload} className="min-h-11 font-semibold underline">Tải lại</button></div>}
      {defense && <section className="rounded-2xl border border-hairline bg-surface p-4 shadow-xs">
        <h2 className="font-bold">Lịch hiện tại · {defense.status === 'SCHEDULED' ? 'Đã lên lịch' : 'Đã hủy'}</h2>
        <p className="mt-2 text-sm">Đồ án #{defense.projectId} · {localTime(defense.startAt)} – {localTime(defense.endAt)}</p>
        <p className="text-sm">Phòng: {defense.room}</p>
      </section>}
      {defense && !loading && !officer && !error && <p className="rounded-xl border border-hairline bg-canvas p-4 text-sm text-ink-muted">Bạn chỉ có quyền xem lịch. Chỉ chủ tọa hoặc thư ký của hội đồng được gửi yêu cầu đổi lịch.</p>}
      {officer && !loading && <section className="rounded-2xl border border-hairline bg-surface p-4 shadow-xs">
        <h2 className="font-bold">Yêu cầu đổi lịch</h2>
        {pending && <div className="mt-3 rounded-xl border border-hairline bg-canvas p-3 text-sm">
          <p>Đang chờ xử lý: phòng #{pending.desiredRoomId} · {localTime(pending.desiredStartAt)}</p>
          <p className="mt-1">Lý do: {pending.reasonDetails}</p>
          {pending.requesterId === login?.user.id && <button type="button" disabled={busy}
            onClick={() => void withdraw(pending)} className="mt-2 min-h-11 rounded-lg border border-hairline px-3 font-semibold disabled:opacity-50">Rút yêu cầu</button>}
        </div>}
        {!mayRequest && <p className="mt-3 text-sm text-ink-muted">Chỉ có thể đề xuất khi phiên còn hiệu lực và chưa kết thúc.</p>}
        {mayRequest && !pending && rooms.length === 0 && <p className="mt-3 text-sm text-ink-muted">Chưa có phòng hoạt động đủ sức chứa cho nhóm, hội đồng và chỗ dự phòng.</p>}
        {mayRequest && !pending && <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">Phòng đề xuất
            <select value={roomId} onChange={event => setRoomId(event.target.value)} disabled={busy} className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-2">
              <option value="">Chọn phòng</option>{rooms.map(room => <option key={room.id} value={room.id}>{room.code} · {room.building} · tầng {room.floor} · {room.capacity} chỗ</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">Ngày đề xuất
            <input type="date" value={date} onChange={event => setDate(event.target.value)} disabled={busy} className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-2" />
          </label>
          <label className="text-sm font-semibold">Ca đề xuất
            <select value={slot} onChange={event => setSlot(event.target.value)} disabled={busy} className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-2">
              <option value="">Chọn ca</option>{slots.map(([start, end], index) => <option key={start} value={index + 1}>Ca {index + 1} · {start}–{end}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">Loại lý do
            <select value={category} onChange={event => setCategory(event.target.value as typeof category)} disabled={busy} className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-2">
              {categories.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold sm:col-span-2">Lý do chi tiết
            <textarea value={details} maxLength={2000} onChange={event => setDetails(event.target.value)} disabled={busy} className="mt-1 min-h-24 w-full rounded-lg border border-hairline p-2" />
          </label>
          <label className="text-sm font-semibold sm:col-span-2">Đường dẫn minh chứng (nếu có, HTTPS hoặc tệp AIPMS)
            <input type="url" value={evidenceUrl} onChange={event => setEvidenceUrl(event.target.value)} disabled={busy} className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-2" />
          </label>
          <button type="button" disabled={busy || !valid} onClick={() => void submit()}
            className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">Gửi yêu cầu đổi lịch</button>
        </div>}
        {requests.filter(row => row.status !== 'PENDING').length > 0 && <div className="mt-4 text-sm">
          <h3 className="font-semibold">Lịch sử yêu cầu</h3>
          <ul className="mt-1 space-y-1">{requests.filter(row => row.status !== 'PENDING').map(row => <li key={row.id}>#{row.id} · {requestStatus[row.status] ?? row.status} · {localTime(row.createdAt)}</li>)}</ul>
        </div>}
      </section>}
      {success && <p role="status" className="rounded-xl border border-hairline bg-canvas p-3 text-sm text-status-success-text">{success}</p>}
    </div>
  </WorkspacePage>
}
