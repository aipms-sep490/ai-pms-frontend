import { useState } from 'react'
import type { PeriodDefenseRoomSchedulingConfig, StandbyPoolMember } from '../defense-v4-api'

const SINGLE_SLOTS = [
  '08:00–08:45', '08:45–09:30', '09:45–10:30', '10:30–11:15',
  '13:30–14:15', '14:15–15:00', '15:15–16:00', '16:00–16:45',
]
const INTER_SLOTS = [
  '08:00–09:00', '09:15–10:15', '10:15–11:15',
  '13:30–14:30', '14:45–15:45', '15:45–16:45',
]

export function DefenseRoomSchedulerV4Panel({
  config,
  standbyPool = [],
  onSaveConfig,
  onStandbySwap,
}: {
  config: PeriodDefenseRoomSchedulingConfig
  standbyPool?: StandbyPoolMember[]
  onSaveConfig: (next: { enableDefenseRoomScheduling: boolean; coldWindowEndAt: string | null; defenseBufferHours: number }) => Promise<void>
  onStandbySwap?: (input: { replacedUserId: number; replacementUserId: number; reason: string }) => Promise<void>
}) {
  const [enabled, setEnabled] = useState(config.enableDefenseRoomScheduling)
  const [coldEnd, setColdEnd] = useState(config.coldWindowEndAt ?? '')
  const [bufferHours, setBufferHours] = useState(config.defenseBufferHours)
  const [mode, setMode] = useState<'SINGLE' | 'INTERDISCIPLINARY'>('INTERDISCIPLINARY')
  const [replacedId, setReplacedId] = useState('')
  const [replacementId, setReplacementId] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const slots = mode === 'INTERDISCIPLINARY' ? INTER_SLOTS : SINGLE_SLOTS

  async function handleSave() {
    setBusy(true); setStatus('')
    try {
      await onSaveConfig({
        enableDefenseRoomScheduling: enabled,
        coldWindowEndAt: coldEnd.trim() ? coldEnd.trim() : null,
        defenseBufferHours: bufferHours,
      })
      setStatus('Đã cập nhật cấu hình chia phòng bảo vệ (tùy chọn).')
    } finally { setBusy(false) }
  }

  async function handleSwap() {
    if (!onStandbySwap || !replacedId || !replacementId || reason.trim().length < 5) return
    setBusy(true); setStatus('')
    try {
      await onStandbySwap({
        replacedUserId: Number(replacedId),
        replacementUserId: Number(replacementId),
        reason: reason.trim(),
      })
      setStatus('Đã thay thế giám khảo từ Standby Pool và thu hồi quyền chấm cũ.')
      setReason('')
    } finally { setBusy(false) }
  }

  return (
    <section className="space-y-4 rounded-xl border border-hairline bg-card p-4" aria-label="Tùy chọn chia phòng Defense V4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-ink">Chia thời gian &amp; phòng Defense (Tùy chọn Admin)</h2>
          <p className="text-xs text-ink-muted">
            Khi tắt, hệ thống vẫn cho phép chấm Cold/Defense, Finalize và Công bố điểm đầy đủ mà không yêu cầu lịch phòng.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
            aria-label="Bật module chia phòng Defense"
          />
          {enabled ? 'Đang bật' : 'Đang tắt (Non-blocking)'}
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-ink-soft">
          Mốc kết thúc cửa sổ chấm Cold (UTC ISO)
          <input
            type="text"
            className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-canvas px-3 text-sm"
            value={coldEnd}
            onChange={e => setColdEnd(e.target.value)}
            placeholder="2026-12-10T10:00:00Z"
          />
        </label>
        <label className="text-xs text-ink-soft">
          Buffer tối thiểu sau Cold (giờ)
          <input
            type="number"
            min={0}
            max={72}
            className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-canvas px-3 text-sm"
            value={bufferHours}
            onChange={e => setBufferHours(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            className={`min-h-11 rounded-lg border px-3 text-xs font-semibold ${mode === 'SINGLE' ? 'border-primary bg-primary-subtle text-primary' : 'border-hairline text-ink-soft'}`}
            onClick={() => setMode('SINGLE')}
          >
            Đơn ngành (45p · 8 ca/ngày)
          </button>
          <button
            type="button"
            className={`min-h-11 rounded-lg border px-3 text-xs font-semibold ${mode === 'INTERDISCIPLINARY' ? 'border-primary bg-primary-subtle text-primary' : 'border-hairline text-ink-soft'}`}
            onClick={() => setMode('INTERDISCIPLINARY')}
          >
            Liên ngành (60p · 6 ca/ngày)
          </button>
        </div>
        <button
          type="button"
          disabled={busy}
          className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
          onClick={() => void handleSave()}
        >
          Lưu cấu hình phòng
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {slots.map((slot, idx) => (
          <div key={slot} className="rounded-lg border border-hairline bg-canvas px-2.5 py-2 text-xs text-ink">
            <strong>Ca {idx + 1}:</strong> {slot}
          </div>
        ))}
      </div>

      {onStandbySwap && (
        <div className="space-y-2 rounded-lg border border-hairline bg-canvas p-3">
          <h3 className="text-xs font-bold text-ink">Thay thế giám khảo khẩn cấp (Standby Pool · 1 click)</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              aria-label="ID giám khảo bị thay"
              className="min-h-11 rounded border border-hairline bg-card px-2 text-xs"
              placeholder="ID GK cần thay"
              value={replacedId}
              onChange={e => setReplacedId(e.target.value)}
            />
            <select
              aria-label="Chọn giám khảo Standby"
              className="min-h-11 rounded border border-hairline bg-card px-2 text-xs"
              value={replacementId}
              onChange={e => setReplacementId(e.target.value)}
            >
              <option value="">Chọn GK dự phòng…</option>
              {standbyPool.map(member => (
                <option key={member.id} value={member.userId}>
                  {member.fullName} (#{member.userId})
                </option>
              ))}
            </select>
            <input
              aria-label="Lý do thay thế giám khảo"
              className="min-h-11 rounded border border-hairline bg-card px-2 text-xs"
              placeholder="Lý do (>= 5 ký tự)"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={busy || !replacedId || !replacementId || reason.trim().length < 5}
            className="min-h-11 rounded-lg border border-primary px-3 text-xs font-semibold text-primary disabled:opacity-50"
            onClick={() => void handleSwap()}
          >
            Thay thế &amp; thu hồi quyền chấm cũ
          </button>
        </div>
      )}

      {status && <p role="status" className="text-xs font-medium text-status-success-text">{status}</p>}
    </section>
  )
}
