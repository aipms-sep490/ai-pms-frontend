import { useEffect, useState } from 'react'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import { HttpError } from '../../services/http/http-client'
import { createCheckpoint, decideCheckpoint, getProjectCheckpoints } from './gates-api'
import type { CheckpointDecisionValue, ProjectCheckpoint } from './gates-types'

const decisionText: Record<string, string> = { MET: 'Đạt', AT_RISK: 'Rủi ro', NOT_MET: 'Chưa đạt', CANCELLED: 'Đã hủy' }
const decisionTone: Record<string, string> = {
  MET: 'border-status-success-border bg-status-success-bg text-status-success-text',
  AT_RISK: 'border-status-warning-border bg-status-warning-bg text-status-warning-text',
  NOT_MET: 'border-status-error-border bg-status-error-bg text-status-error-text',
  CANCELLED: 'border-hairline bg-slate-50 text-slate-600',
}
const describeDecision = (value: CheckpointDecisionValue) => decisionText[value] ?? value
const toneFor = (value: CheckpointDecisionValue) => decisionTone[value] ?? 'border-hairline bg-slate-50 text-slate-600'
const formatPlannedAt = (value: string) => new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })

function errorMessage(reason: unknown, forbidden: string): string {
  return reason instanceof HttpError && reason.status === 403 ? forbidden : 'Chưa tải được dữ liệu. Hãy thử lại.'
}

export function ProjectGatesPage() {
  const { project, actor, routeBase } = useExecutionAccess()
  const [checkpoints, setCheckpoints] = useState<ProjectCheckpoint[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newMajorId, setNewMajorId] = useState('')
  const [newPlannedAt, setNewPlannedAt] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(null)
    getProjectCheckpoints(project.id, 1, 50, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      setCheckpoints(result.items)
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return
      setError(errorMessage(reason, 'Bạn chưa có quyền xem các checkpoint của đồ án này.'))
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [project.id, revision])

  const reload = () => setRevision((value) => value + 1)

  async function submitCreate() {
    if (!newTitle.trim() || !newPlannedAt) return
    setCreating(true); setError(null)
    try {
      await createCheckpoint(project.id, { title: newTitle.trim(), majorId: newMajorId ? Number(newMajorId) : null, plannedAt: new Date(newPlannedAt).toISOString() })
      setNewTitle(''); setNewMajorId(''); setNewPlannedAt('')
      reload()
    } catch (reason) {
      setError(errorMessage(reason, 'Bạn chưa có quyền tạo checkpoint cho đồ án này.'))
    } finally {
      setCreating(false)
    }
  }

  return <WorkspacePage className="space-y-5" title="Checkpoint theo dõi tiến độ" eyebrow="Theo dõi, không chặn tiến độ"
    description="Kế hoạch theo dõi và kết luận từng giai đoạn. Quá hạn chưa có kết luận chỉ là cảnh báo rủi ro, không làm đồ án trượt.">
    {loading && <p role="status" className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-600">Đang tải checkpoint…</p>}
    {!loading && error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><span>{error}</span><button type="button" className="min-h-11 font-semibold underline" onClick={reload}>Tải lại</button></div>}

    {!loading && actor !== 'student' && <section className="space-y-3 rounded-xl border border-hairline bg-card p-5 shadow-xs">
      <h2 className="text-sm font-bold text-slate-900">Tạo checkpoint mới</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm text-slate-700">Tiêu đề<input className="mt-1 w-full rounded-lg border border-hairline p-2 text-sm" value={newTitle} disabled={creating} onChange={(event) => setNewTitle(event.target.value)} /></label>
        <label className="text-sm text-slate-700">Mã ngành (để trống nếu chung)<input type="number" className="mt-1 w-full rounded-lg border border-hairline p-2 text-sm" value={newMajorId} disabled={creating} onChange={(event) => setNewMajorId(event.target.value)} /></label>
        <label className="text-sm text-slate-700">Thời điểm dự kiến<input type="datetime-local" className="mt-1 w-full rounded-lg border border-hairline p-2 text-sm" value={newPlannedAt} disabled={creating} onChange={(event) => setNewPlannedAt(event.target.value)} /></label>
      </div>
      <button type="button" className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={creating || !newTitle.trim() || !newPlannedAt} onClick={() => void submitCreate()}>Tạo checkpoint</button>
    </section>}

    {!loading && !error && checkpoints && checkpoints.length === 0 && <p className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-600">Đồ án chưa có checkpoint theo dõi nào.</p>}
    {!loading && !error && checkpoints && checkpoints.length > 0 && <ol className="space-y-3">
      {checkpoints.map((checkpoint) => <CheckpointRow key={checkpoint.id} checkpoint={checkpoint} onChanged={(updated) => setCheckpoints((current) => current?.map((c) => c.id === updated.id ? updated : c) ?? null)} onConflict={reload} />)}
    </ol>}
    <p className="text-xs text-slate-400">Trang: {routeBase}</p>
  </WorkspacePage>
}

function CheckpointRow({ checkpoint, onChanged, onConflict }: {
  checkpoint: ProjectCheckpoint; onChanged: (updated: ProjectCheckpoint) => void; onConflict: () => void
}) {
  const [decision, setDecision] = useState<CheckpointDecisionValue>('MET')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [rowError, setRowError] = useState('')
  const latestDecision = checkpoint.decisions.at(-1)
  const unresolvedRisk = checkpoint.isOverdue && !checkpoint.decisions.some((d) => d.decision === 'MET' || d.decision === 'CANCELLED')

  async function submitDecision() {
    if (!reason.trim()) return
    setBusy(true); setRowError('')
    try {
      const updated = await decideCheckpoint(checkpoint.id, { concurrencyToken: checkpoint.concurrencyToken, decision, reason: reason.trim(), evidence: [] })
      onChanged(updated)
      setReason('')
    } catch (reason_) {
      if (reason_ instanceof HttpError && reason_.status === 409) { onConflict(); return }
      setRowError(reason_ instanceof HttpError && reason_.status === 403 ? 'Bạn chưa có quyền ghi kết luận cho checkpoint này.' : 'Không ghi được kết luận. Hãy thử lại.')
    } finally {
      setBusy(false)
    }
  }

  return <li className="rounded-xl border border-hairline bg-card p-5 shadow-xs">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-bold text-slate-950">{checkpoint.title}</h2>
        <p className="mt-1 text-xs text-slate-500">Dự kiến: {formatPlannedAt(checkpoint.plannedAt)}{checkpoint.majorId != null ? ` · Ngành #${checkpoint.majorId}` : ' · Chung'}</p>
      </div>
      {unresolvedRisk && <span className="shrink-0 rounded-full border border-status-warning-border bg-status-warning-bg px-2.5 py-1 text-xs font-semibold text-status-warning-text">Quá hạn, chưa kết luận</span>}
    </div>

    {checkpoint.decisions.length > 0 && <ul className="mt-4 space-y-2 border-t border-hairline pt-3">
      {checkpoint.decisions.map((d) => <li key={d.id} className="text-sm">
        <div className="flex flex-wrap items-center gap-2 text-slate-700">
          <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${toneFor(d.decision)}`}>{describeDecision(d.decision)}</span>
          <span className="text-xs text-slate-500">{new Date(d.decidedAt).toLocaleDateString('vi-VN')}</span>
        </div>
        {d.reason && <p className="mt-0.5 text-sm leading-6 text-slate-600">{d.reason}</p>}
      </li>)}
    </ul>}
    {checkpoint.decisions.length === 0 && <p className="mt-3 text-sm text-slate-500">Chưa có kết luận.</p>}

    {rowError && <p role="alert" className="mt-3 text-sm text-status-error-text">{rowError}</p>}

    {checkpoint.canManage && <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-hairline pt-3">
      <label className="text-sm text-slate-700">Kết luận<select className="mt-1 block rounded-lg border border-hairline p-2 text-sm" value={decision} disabled={busy} onChange={(event) => setDecision(event.target.value as CheckpointDecisionValue)}>
        <option value="MET">Đạt</option>
        <option value="AT_RISK">Rủi ro</option>
        <option value="NOT_MET">Chưa đạt</option>
        <option value="CANCELLED">Hủy</option>
      </select></label>
      <label className="flex-1 min-w-48 text-sm text-slate-700">Lý do<input className="mt-1 w-full rounded-lg border border-hairline p-2 text-sm" value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} /></label>
      <button type="button" className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={busy || !reason.trim()} onClick={() => void submitDecision()}>Ghi kết luận</button>
    </div>}
    {latestDecision?.decision === 'CANCELLED' && <p className="mt-2 text-xs text-slate-400">Checkpoint đã hủy; không thêm kết luận mới.</p>}
  </li>
}
