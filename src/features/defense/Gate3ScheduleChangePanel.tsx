import { useState } from 'react'
import { HttpError } from '../../services/http/http-client'
import { changeGate3Schedule, getGate3Schedules } from './room-planner-api'
import type { ReviewGate3ScheduleDto, RoomDto } from './room-planner-api'

const slots = [
  ['08:00', '09:15'], ['09:30', '10:45'], ['11:00', '12:15'],
  ['13:30', '14:45'], ['15:00', '16:15'], ['16:30', '17:45'],
] as const

export function Gate3ScheduleChangePanel({ periodId, schedule, rooms, onChanged, onClose }: {
  periodId: number
  schedule: ReviewGate3ScheduleDto
  rooms: RoomDto[]
  onChanged: () => void
  onClose: () => void
}) {
  const [roomId, setRoomId] = useState(String(schedule.roomId))
  const [date, setDate] = useState(new Date(schedule.startAt).toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }))
  const [slot, setSlot] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [unverified, setUnverified] = useState(false)
  const chosenSlot = slots[Number(slot) - 1]
  const valid = Number(roomId) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date) && chosenSlot && reason.trim() && reason.length <= 2000

  const save = async () => {
    if (!valid || !chosenSlot) return
    setBusy(true); setError('')
    let sent = false
    try {
      await changeGate3Schedule(periodId, schedule.gateInstanceId, {
        roomId: Number(roomId), startAt: `${date}T${chosenSlot[0]}:00+07:00`,
        endAt: `${date}T${chosenSlot[1]}:00+07:00`, reason: reason.trim(),
        concurrencyToken: schedule.concurrencyToken,
      })
      sent = true
      const rows = await getGate3Schedules(periodId)
      const persisted = rows.find(row => row.gateInstanceId === schedule.gateInstanceId)
      if (!persisted || persisted.roomId !== Number(roomId)
        || Date.parse(persisted.startAt) !== Date.parse(`${date}T${chosenSlot[0]}:00+07:00`)
        || Date.parse(persisted.endAt) !== Date.parse(`${date}T${chosenSlot[1]}:00+07:00`))
        throw new Error('Schedule readback mismatch')
      onChanged()
      onClose()
    } catch (failure) {
      if (sent) {
        setUnverified(true)
        setError('Đã gửi thay đổi nhưng chưa xác minh được lịch. Tải lại lịch trước khi thao tác tiếp.')
      } else if (failure instanceof HttpError) {
        if (failure.status === 403) setError('Bạn không có quyền đổi lịch Gate 3 của nhóm này.')
        else if (failure.status === 409) setError('Lịch hoặc điều kiện đã thay đổi. Tải lại lịch trước khi thử lại.')
        else if (failure.status === 400 || failure.status === 422) setError('Phòng, ca, cửa sổ Gate hoặc lý do chưa hợp lệ.')
        else setError('Chưa đổi được lịch. Hãy kiểm tra kết nối và thử lại.')
      } else setError('Chưa đổi được lịch. Hãy kiểm tra kết nối và thử lại.')
    } finally { setBusy(false) }
  }

  return <section aria-label={`Đổi lịch Gate 3 đồ án ${schedule.projectId}`} className="rounded-xl border border-hairline bg-canvas p-4">
    <h3 className="font-semibold">Đổi lịch Gate 3 · Đồ án #{schedule.projectId}</h3>
    <p className="mt-1 text-sm text-ink-muted">Chỉ đổi trước khi phiên bắt đầu. BE kiểm tra phòng, người đánh giá, cửa sổ Gate và ngày làm việc.</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">Phòng mới
        <select value={roomId} onChange={event => setRoomId(event.target.value)} disabled={busy} className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-2">
          {rooms.filter(room => room.status === 'ACTIVE' && [2, 3, 4].includes(room.floor)).map(room =>
            <option key={room.id} value={room.id}>{room.code} · {room.building} · tầng {room.floor}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold">Ngày mới
        <input type="date" value={date} onChange={event => setDate(event.target.value)} disabled={busy} className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-2" />
      </label>
      <label className="text-sm font-semibold">Ca mới
        <select value={slot} onChange={event => setSlot(event.target.value)} disabled={busy} className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-2">
          <option value="">Chọn ca</option>{slots.map(([start, end], index) => <option key={start} value={index + 1}>Ca {index + 1} · {start}–{end}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold sm:col-span-2">Lý do đổi lịch
        <textarea value={reason} maxLength={2000} onChange={event => setReason(event.target.value)} disabled={busy} className="mt-1 min-h-20 w-full rounded-lg border border-hairline p-2" />
      </label>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-status-error-text">{error}</p>}
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" disabled={busy || unverified || !valid} onClick={() => void save()} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">Xác nhận đổi lịch</button>
      {unverified && <button type="button" onClick={() => { onChanged(); onClose() }} className="min-h-11 rounded-lg border border-hairline px-4 text-sm font-semibold">Tải lại lịch</button>}
      <button type="button" disabled={busy} onClick={onClose} className="min-h-11 rounded-lg border border-hairline px-4 text-sm font-semibold">Đóng</button>
    </div>
  </section>
}
