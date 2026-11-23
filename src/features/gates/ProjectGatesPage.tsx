import { useEffect, useMemo, useState } from 'react'
import { FilterToolbar } from '../../components/ui/FilterToolbar'
import { ListLoading } from '../../components/ui/ListLoading'
import { Modal } from '../../components/ui/Modal'
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
  CANCELLED: 'border-hairline bg-canvas text-ink-muted',
}
const describeDecision = (value: CheckpointDecisionValue) => decisionText[value] ?? value
const toneFor = (value: CheckpointDecisionValue) => decisionTone[value] ?? 'border-hairline bg-canvas text-ink-muted'
const formatPlannedAt = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })

function errorMessage(reason: unknown, forbidden: string): string {
  return reason instanceof HttpError && reason.status === 403 ? forbidden : 'Chưa tải được dữ liệu. Hãy thử lại.'
}

export function ProjectGatesPage() {
  const { project, actor } = useExecutionAccess()
  const projectMajors = project.majors ?? []
  const majorNameMap = Object.fromEntries(projectMajors.map((m) => [m.majorId, m.majorName]))
  const [checkpoints, setCheckpoints] = useState<ProjectCheckpoint[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newMajorId, setNewMajorId] = useState('')
  const [newPlannedAt, setNewPlannedAt] = useState('')
  const [statusTab, setStatusTab] = useState('')
  const [majorFilter, setMajorFilter] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'planned_asc' | 'planned_desc'>('planned_asc')

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
      setNewTitle(''); setNewMajorId(''); setNewPlannedAt(''); setCreateOpen(false)
      reload()
    } catch (reason) {
      setError(errorMessage(reason, 'Bạn chưa có quyền tạo checkpoint cho đồ án này.'))
    } finally {
      setCreating(false)
    }
  }

  const filteredCheckpoints = useMemo(() => {
    const items = checkpoints ?? []
    const q = search.trim().toLowerCase()
    const list = items.filter((cp) => {
      const latest = cp.decisions.at(-1)?.decision
      const unresolvedRisk = cp.isOverdue && !cp.decisions.some((d) => d.decision === 'MET' || d.decision === 'CANCELLED')
      if (statusTab === 'OVERDUE' && !unresolvedRisk) return false
      if (statusTab === 'PENDING' && cp.decisions.length > 0) return false
      if (statusTab && statusTab !== 'OVERDUE' && statusTab !== 'PENDING' && latest !== statusTab) return false
      if (majorFilter === 'COMMON' && cp.majorId != null) return false
      if (majorFilter && majorFilter !== 'COMMON' && String(cp.majorId ?? '') !== majorFilter) return false
      if (q) {
        const hay = `${cp.title} ${cp.decisions.map(d => d.reason ?? '').join(' ')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    return [...list].sort((a, b) => {
      const diff = new Date(a.plannedAt).getTime() - new Date(b.plannedAt).getTime()
      return sortBy === 'planned_desc' ? -diff : diff
    })
  }, [checkpoints, statusTab, majorFilter, search, sortBy])

  const hasFilters = Boolean(statusTab || majorFilter || search.trim() || sortBy !== 'planned_asc')
  const clearFilters = () => { setStatusTab(''); setMajorFilter(''); setSearch(''); setSortBy('planned_asc') }

  return <WorkspacePage
    size="wide"
    className="space-y-5"
    title="Mốc kiểm soát tiến độ"
    eyebrow="Theo dõi, không chặn tiến độ"
    description="Kế hoạch theo dõi và kết luận từng giai đoạn. Quá hạn chưa có kết luận chỉ là cảnh báo rủi ro, không làm đồ án trượt."
    action={
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={loading} onClick={reload} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-hairline bg-card px-3.5 text-sm font-semibold text-ink-soft transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary disabled:opacity-50">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">refresh</span>
          Làm mới
        </button>
        {actor !== 'student' && (
          <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
            Tạo checkpoint mới
          </button>
        )}
      </div>
    }
  >
    {loading && <ListLoading label="Đang tải mốc kiểm soát tiến độ…" />}
    {!loading && error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><span>{error}</span><button type="button" className="min-h-11 font-semibold underline" onClick={reload}>Tải lại</button></div>}

    {createOpen && actor !== 'student' && (
      <Modal open title="Tạo checkpoint mới" description="Thêm mốc kiểm soát để theo dõi tiến độ định kỳ của nhóm." busy={creating} onClose={() => setCreateOpen(false)}>
        <div className="space-y-4">
          <label className="block text-sm font-medium text-ink-soft">Tiêu đề<input autoFocus className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 font-normal text-sm text-ink" value={newTitle} disabled={creating} onChange={(event) => setNewTitle(event.target.value)} /></label>
          <label className="block text-sm font-medium text-ink-soft">Chuyên ngành áp dụng
            <select className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 font-normal text-sm text-ink" value={newMajorId} disabled={creating} onChange={(event) => setNewMajorId(event.target.value)}>
              <option value="">Chung (cả đồ án)</option>
              {projectMajors.map((major) => (
                <option key={major.majorId} value={major.majorId}>{major.majorName}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-ink-soft">Thời điểm dự kiến<input type="datetime-local" className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 font-normal text-sm text-ink" value={newPlannedAt} disabled={creating} onChange={(event) => setNewPlannedAt(event.target.value)} /></label>
          <div className="app-modal__actions">
            <button type="button" className="app-modal__button" disabled={creating} onClick={() => setCreateOpen(false)}>Hủy</button>
            <button type="button" className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50" disabled={creating || !newTitle.trim() || !newPlannedAt} onClick={() => void submitCreate()}>{creating ? 'Đang tạo…' : 'Tạo checkpoint'}</button>
          </div>
        </div>
      </Modal>
    )}

    {!loading && !error && checkpoints && checkpoints.length === 0 && <p className="rounded-lg border border-hairline bg-card p-5 text-sm text-ink-muted">Đồ án chưa có checkpoint theo dõi nào.</p>}
    {!loading && !error && checkpoints && checkpoints.length > 0 && (
      <>
        <FilterToolbar
          tabs={[
            { value: '', label: 'Tất cả', count: checkpoints.length },
            { value: 'PENDING', label: 'Chưa kết luận' },
            { value: 'OVERDUE', label: 'Quá hạn' },
            { value: 'MET', label: 'Đạt' },
            { value: 'AT_RISK', label: 'Rủi ro' },
            { value: 'NOT_MET', label: 'Chưa đạt' },
          ]}
          activeTab={statusTab}
          onTabChange={setStatusTab}
          search={search}
          onSearchChange={setSearch}
          searchLabel="Tìm checkpoint"
          searchPlaceholder="Tìm theo tiêu đề hoặc lý do kết luận…"
          controls={projectMajors.length > 1 ? (
            <select aria-label="Chuyên ngành" value={majorFilter} onChange={(e) => setMajorFilter(e.target.value)}>
              <option value="">Tất cả phạm vi</option>
              <option value="COMMON">Chung (cả đồ án)</option>
              {projectMajors.map((major) => <option key={major.majorId} value={String(major.majorId)}>{major.majorName}</option>)}
            </select>
          ) : undefined}
          sort={{
            value: sortBy,
            onChange: (val) => setSortBy(val as 'planned_asc' | 'planned_desc'),
            options: [
              { value: 'planned_asc', label: 'Thời điểm tăng dần' },
              { value: 'planned_desc', label: 'Thời điểm giảm dần' },
            ],
          }}
          hasActiveFilters={hasFilters}
          onClearAll={clearFilters}
          resultSummary={`${filteredCheckpoints.length} / ${checkpoints.length} checkpoint`}
        />
        {filteredCheckpoints.length === 0 ? (
          <div className="rounded-xl border border-hairline bg-card p-6 text-center text-sm text-ink-muted">
            <p>Không có checkpoint nào phù hợp bộ lọc hiện tại.</p>
            <button type="button" className="mt-2 font-semibold text-primary underline" onClick={clearFilters}>Xóa bộ lọc</button>
          </div>
        ) : (
          <ol className="space-y-3">
            {filteredCheckpoints.map((checkpoint) => <CheckpointRow key={checkpoint.id} checkpoint={checkpoint} majorNameMap={majorNameMap} onChanged={(updated) => setCheckpoints((current) => current?.map((c) => c.id === updated.id ? updated : c) ?? null)} onConflict={reload} />)}
          </ol>
        )}
      </>
    )}
  </WorkspacePage>
}

function CheckpointRow({ checkpoint, majorNameMap, onChanged, onConflict }: {
  checkpoint: ProjectCheckpoint; majorNameMap: Record<number, string>; onChanged: (updated: ProjectCheckpoint) => void; onConflict: () => void
}) {
  const [decision, setDecision] = useState<CheckpointDecisionValue>('MET')
  const [reason, setReason] = useState('')
  const [evidenceRows, setEvidenceRows] = useState<{ evidenceId: string; reviewId: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [rowError, setRowError] = useState('')
  const latestDecision = checkpoint.decisions.at(-1)
  const unresolvedRisk = checkpoint.isOverdue && !checkpoint.decisions.some((d) => d.decision === 'MET' || d.decision === 'CANCELLED')

  function addEvidenceRow() {
    setEvidenceRows((curr) => [...curr, { evidenceId: '', reviewId: '' }])
  }
  function updateEvidenceRow(index: number, patch: { evidenceId?: string; reviewId?: string }) {
    setEvidenceRows((curr) => curr.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }
  function removeEvidenceRow(index: number) {
    setEvidenceRows((curr) => curr.filter((_, i) => i !== index))
  }

  async function submitDecision() {
    if (!reason.trim()) return

    const parsedEvidence = evidenceRows
      .map((r) => ({ evidenceId: Number(r.evidenceId), reviewId: Number(r.reviewId) }))
      .filter((e) => e.evidenceId > 0 && e.reviewId > 0)

    const requiresEvidence = checkpoint.blocksAcademicWorkflow || !checkpoint.trackingOnly
    if (decision === 'MET' && requiresEvidence && parsedEvidence.length === 0) {
      setRowError('Kết luận "Đạt" cho checkpoint bắt buộc phải đính kèm ít nhất một minh chứng đã được review.')
      return
    }

    setBusy(true); setRowError('')
    try {
      const updated = await decideCheckpoint(checkpoint.id, {
        concurrencyToken: checkpoint.concurrencyToken,
        decision,
        reason: reason.trim(),
        evidence: parsedEvidence,
      })
      onChanged(updated)
      setReason('')
      setEvidenceRows([])
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
        <h2 className="text-base font-bold text-ink">{checkpoint.title}</h2>
        <p className="mt-1 text-xs text-ink-muted">Dự kiến: {formatPlannedAt(checkpoint.plannedAt)} · {checkpoint.majorName ?? (checkpoint.majorId != null ? majorNameMap[checkpoint.majorId] ?? 'Theo chuyên ngành' : 'Chung')}</p>
      </div>
      {unresolvedRisk && <span className="shrink-0 rounded-full border border-status-warning-border bg-status-warning-bg px-2.5 py-1 text-xs font-semibold text-status-warning-text">Quá hạn, chưa kết luận</span>}
    </div>

    {checkpoint.decisions.length > 0 && <ul className="mt-4 space-y-2 border-t border-hairline pt-3">
      {checkpoint.decisions.map((d) => <li key={d.id} className="text-sm">
        <div className="flex flex-wrap items-center gap-2 text-ink-soft">
          <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${toneFor(d.decision)}`}>{describeDecision(d.decision)}</span>
          <span className="text-xs text-ink-muted">{new Date(d.decidedAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}{d.decidedByName ? ` · ${d.decidedByName}` : ''}</span>
        </div>
        {d.reason && <p className="mt-0.5 text-sm leading-6 text-ink-muted">{d.reason}</p>}
        {d.evidence && d.evidence.length > 0 && (
          <p className="mt-1 text-xs text-ink-muted">
            Đã đối chiếu {d.evidence.length} minh chứng được duyệt
          </p>
        )}
      </li>)}
    </ul>}
    {checkpoint.decisions.length === 0 && <p className="mt-3 text-sm text-ink-muted">Chưa có kết luận.</p>}

    {rowError && <p role="alert" className="mt-3 text-sm text-status-error-text">{rowError}</p>}

    {checkpoint.canManage && <div className="mt-4 space-y-3 border-t border-hairline pt-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm text-ink-soft">Kết luận<select className="mt-1 block min-h-11 rounded-lg border border-hairline bg-card px-3 py-2 text-sm text-ink" value={decision} disabled={busy} onChange={(event) => setDecision(event.target.value as CheckpointDecisionValue)}>
          <option value="MET">Đạt</option>
          <option value="AT_RISK">Rủi ro</option>
          <option value="NOT_MET">Chưa đạt</option>
          <option value="CANCELLED">Hủy</option>
        </select></label>
        <label className="flex-1 min-w-48 text-sm text-ink-soft">Lý do<input className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm text-ink" value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} /></label>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-soft">
            Minh chứng đính kèm {decision === 'MET' ? '(Bắt buộc cho Đạt)' : '(Tùy chọn)'}
          </span>
          <button
            type="button"
            className="text-xs font-semibold text-primary hover:underline"
            disabled={busy}
            onClick={addEvidenceRow}
          >
            + Thêm minh chứng
          </button>
        </div>
        {evidenceRows.map((ev, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Evidence ID"
              className="min-h-10 w-32 rounded-lg border border-hairline bg-card px-2.5 py-1.5 text-xs text-ink"
              value={ev.evidenceId}
              disabled={busy}
              onChange={(e) => updateEvidenceRow(idx, { evidenceId: e.target.value })}
            />
            <input
              type="number"
              placeholder="Review ID"
              className="min-h-10 w-32 rounded-lg border border-hairline bg-card px-2.5 py-1.5 text-xs text-ink"
              value={ev.reviewId}
              disabled={busy}
              onChange={(e) => updateEvidenceRow(idx, { reviewId: e.target.value })}
            />
            <button
              type="button"
              className="text-xs text-status-error-text hover:underline"
              disabled={busy}
              onClick={() => removeEvidenceRow(idx)}
            >
              Xóa
            </button>
          </div>
        ))}
      </div>

      <div className="pt-1">
        <button type="button" className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50" disabled={busy || !reason.trim()} onClick={() => void submitDecision()}>Ghi kết luận</button>
      </div>
    </div>}
    {latestDecision?.decision === 'CANCELLED' && <p className="mt-2 text-xs text-ink-muted">Mốc kiểm soát đã hủy; không thêm kết luận mới.</p>}
  </li>
}
