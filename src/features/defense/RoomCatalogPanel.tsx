import { useState } from 'react'
import { HttpError } from '../../services/http/http-client'
import { createRoom, deactivateRoom, getRooms, updateRoom } from './defense-api'
import type { RoomDto, SaveRoomRequest } from './defense-api'

type Draft = { code: string; building: string; floor: string; capacity: string; status: string }
const blank: Draft = { code: '', building: '', floor: '2', capacity: '30', status: 'ACTIVE' }
const statusLabel: Record<string, string> = { ACTIVE: 'Hoạt động', MAINTENANCE: 'Bảo trì', INACTIVE: 'Ngừng dùng' }
const fromRoom = (room: RoomDto): Draft => ({ code: room.code, building: room.building,
  floor: String(room.floor), capacity: String(room.capacity), status: room.status })

function errorText(reason: unknown): string {
  if (reason instanceof HttpError) {
    if (reason.status === 403) return 'Bạn không có quyền quản lý danh mục phòng.'
    if (reason.status === 409) return 'Phòng hoặc lịch đã thay đổi. Tải lại danh mục trước khi sửa.'
    if (reason.status === 400 || reason.status === 422) return 'Kiểm tra mã, tòa nhà, tầng, sức chứa và trạng thái phòng.'
  }
  return 'Chưa lưu được phòng. Hãy kiểm tra kết nối và thử lại.'
}

export function RoomCatalogPanel({ rooms, onChanged }: { rooms: RoomDto[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<RoomDto | null>(null)
  const [draft, setDraft] = useState<Draft>(blank)
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const choose = (room: RoomDto | null) => {
    setEditing(room); setDraft(room ? fromRoom(room) : blank)
    setError(''); setSuccess(''); setUncertain(false); setConfirmId(null)
  }
  const valid = draft.code.trim().length > 0 && draft.code.trim().length <= 50
    && draft.building.trim().length > 0 && draft.building.trim().length <= 50
    && Number.isInteger(Number(draft.floor)) && Number(draft.floor) >= 0 && Number(draft.floor) <= 100
    && Number.isInteger(Number(draft.capacity)) && Number(draft.capacity) >= 1 && Number(draft.capacity) <= 10000
  const save = async () => {
    if (!valid || uncertain) return
    setBusy(true); setError(''); setSuccess('')
    let sent = false
    try {
      const input: SaveRoomRequest = { code: draft.code.trim(), building: draft.building.trim(),
        floor: Number(draft.floor), capacity: Number(draft.capacity), status: draft.status,
        concurrencyToken: editing?.concurrencyToken }
      const result = editing ? await updateRoom(editing.id, input) : await createRoom(input)
      sent = true
      const persisted = (await getRooms()).find(room => room.id === result.id)
      if (!persisted || persisted.code !== result.code || persisted.building !== result.building
        || persisted.floor !== result.floor || persisted.capacity !== result.capacity
        || persisted.status !== result.status) throw new Error('Room readback mismatch')
      choose(null); onChanged(); setSuccess(`Đã xác minh phòng ${persisted.code} trong danh mục.`)
    } catch (reason) {
      if (sent) { setUncertain(true); setError('Đã gửi thay đổi nhưng chưa xác minh được danh mục. Tải lại trước khi thao tác tiếp.') }
      else setError(errorText(reason))
    } finally { setBusy(false) }
  }
  const deactivate = async (room: RoomDto) => {
    setBusy(true); setError(''); setSuccess('')
    let sent = false
    try {
      await deactivateRoom(room.id, room.concurrencyToken)
      sent = true
      const persisted = (await getRooms()).find(row => row.id === room.id)
      if (!persisted || persisted.status !== 'INACTIVE') throw new Error('Room readback mismatch')
      setConfirmId(null); onChanged(); setSuccess(`Đã xác minh phòng ${room.code} ngừng dùng.`)
    } catch (reason) {
      if (sent) { setUncertain(true); setError('Đã gửi lệnh ngừng dùng nhưng chưa xác minh được. Tải lại danh mục.') }
      else setError(errorText(reason))
    } finally { setBusy(false) }
  }

  return <section aria-label="Quản lý danh mục phòng" className="rounded-2xl border border-hairline bg-surface p-4 shadow-xs">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold">Danh mục phòng</h2>
      <button type="button" onClick={() => setOpen(value => !value)} className="min-h-11 rounded-lg border border-hairline px-3 text-sm font-semibold text-primary">
        {open ? 'Thu gọn' : 'Quản lý phòng'}
      </button>
    </div>
    <p className="mt-1 text-sm text-ink-muted">Chỉ phòng hoạt động ở tầng 2–4 được chọn cho lần tự xếp lịch. Dữ liệu vị trí vật lý chưa có trong danh mục.</p>
    {success && <p role="status" className="mt-3 text-sm text-status-success-text">{success}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-status-error-text">{error}</p>}
    {uncertain && <button type="button" onClick={() => { onChanged(); setUncertain(false); setConfirmId(null); choose(null) }} className="mt-2 min-h-11 font-semibold text-primary underline">Tải lại danh mục</button>}
    {open && <div className="mt-4 space-y-4">
      <div className="max-h-56 overflow-auto rounded-xl border border-hairline">
        {rooms.length === 0 ? <p className="p-3 text-sm text-ink-muted">Chưa có phòng.</p> : rooms.map(room => <div key={room.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline p-3 text-sm last:border-b-0">
          <span><strong>{room.code}</strong> · {room.building} · tầng {room.floor} · {room.capacity} chỗ · {statusLabel[room.status] ?? room.status}</span>
          <span className="flex flex-wrap gap-2">
            <button type="button" disabled={busy || uncertain} onClick={() => choose(room)} className="min-h-11 font-semibold text-primary underline">Sửa</button>
            {room.status !== 'INACTIVE' && (confirmId === room.id
              ? <><button type="button" disabled={busy || uncertain} onClick={() => void deactivate(room)} className="min-h-11 font-semibold text-status-error-text underline">Xác nhận ngừng dùng</button>
                <button type="button" onClick={() => setConfirmId(null)} className="min-h-11 underline">Hủy</button></>
              : <button type="button" disabled={busy || uncertain} onClick={() => setConfirmId(room.id)} className="min-h-11 font-semibold text-status-error-text underline">Ngừng dùng</button>)}
          </span>
        </div>)}
      </div>
      <div className="rounded-xl border border-hairline bg-canvas p-3">
        <div className="flex items-center justify-between"><h3 className="font-semibold">{editing ? `Sửa phòng ${editing.code}` : 'Tạo phòng'}</h3>
          {editing && <button type="button" onClick={() => choose(null)} className="min-h-11 text-sm font-semibold text-primary underline">Tạo phòng mới</button>}</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {([['code', 'Mã phòng'], ['building', 'Tòa nhà'], ['floor', 'Tầng'], ['capacity', 'Sức chứa']] as const).map(([key, label]) =>
            <label key={key} className="text-sm font-semibold">{label}
              <input type={key === 'floor' || key === 'capacity' ? 'number' : 'text'} value={draft[key]} disabled={busy || uncertain}
                onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))}
                className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-2" />
            </label>)}
          <label className="text-sm font-semibold">Trạng thái
            <select value={draft.status} disabled={busy || uncertain} onChange={event => setDraft(current => ({ ...current, status: event.target.value }))}
              className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-2">
              <option value="ACTIVE">Hoạt động</option><option value="MAINTENANCE">Bảo trì</option><option value="INACTIVE">Ngừng dùng</option>
            </select>
          </label>
        </div>
        <button type="button" onClick={() => void save()} disabled={busy || uncertain || !valid}
          className="mt-3 min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">{editing ? 'Lưu phòng' : 'Tạo phòng'}</button>
      </div>
    </div>}
  </section>
}
