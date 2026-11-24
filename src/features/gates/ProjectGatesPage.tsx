import { useEffect, useState } from 'react'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { Pagination } from '../../components/ui/Pagination'
import { StatTileRow } from '../../components/ui/StatTileRow'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type { BadgeTone } from '../../components/ui/status-badge-tone'
import { useClientPagination } from '../../components/ui/useClientPagination'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import { HttpError } from '../../services/http/http-client'
import { createCheckpoint, decideCheckpoint, getProjectCheckpoints } from './gates-api'
import type { CheckpointDecisionValue, ProjectCheckpoint } from './gates-types'

const decisionText: Record<string, string> = { MET: 'Đạt', AT_RISK: 'Rủi ro', NOT_MET: 'Chưa đạt', CANCELLED: 'Đã hủy' }
const decisionBadgeTone: Record<string, BadgeTone> = {
  MET: 'success',
  AT_RISK: 'warning',
  NOT_MET: 'danger',
  CANCELLED: 'neutral',
}
const describeDecision = (value: CheckpointDecisionValue) => decisionText[value] ?? value
const badgeToneFor = (value: CheckpointDecisionValue): BadgeTone => decisionBadgeTone[value] ?? 'neutral'
const formatPlannedAt = (value: string) => new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })

function errorMessage(reason: unknown, forbidden: string): string {
  return reason instanceof HttpError && reason.status === 403 ? forbidden : 'Chưa tải được dữ liệu. Hãy thử lại.'
}

export function ProjectGatesPage() {
  const { project, actor } = useExecutionAccess()
  const majorNameById = new Map((project.majors ?? []).map((m) => [m.majorId, m.majorName]))
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

  const items = checkpoints ?? []
  const pagination = useClientPagination(items, 8)
  const metCount = items.filter((c) => c.decisions.at(-1)?.decision === 'MET').length
  const riskCount = items.filter(
    (c) =>
      (c.isOverdue && !c.decisions.some((d) => d.decision === 'MET' || d.decision === 'CANCELLED')) ||
      c.decisions.at(-1)?.decision === 'AT_RISK' ||
      c.decisions.at(-1)?.decision === 'NOT_MET',
  ).length
  const undecidedCount = items.filter((c) => c.decisions.length === 0).length

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

  const canCreate = !loading && actor !== 'student'

  return (
    <WorkspacePage
      className="space-y-5"
      title="Checkpoint theo dõi tiến độ"
      eyebrow="Theo dõi, không chặn tiến độ"
      description="Kế hoạch theo dõi và kết luận từng giai đoạn. Quá hạn chưa có kết luận chỉ là cảnh báo rủi ro, không làm đồ án trượt."
    >
      {loading && <p role="status" className="rounded-xl border border-hairline bg-card p-5 text-sm text-ink-muted">Đang tải checkpoint…</p>}
      {!loading && error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">
          <span>{error}</span>
          <button type="button" className="min-h-11 font-semibold underline" onClick={reload}>Tải lại</button>
        </div>
      )}

      {!loading && !error && checkpoints && (
        <StatTileRow
          tiles={[
            {
              icon: 'flag',
              label: 'Tổng checkpoint',
              value: items.length,
              caption: 'Mốc theo dõi tiến độ của đồ án',
              hero: true,
            },
            {
              icon: 'check_circle',
              label: 'Đã hoàn thành',
              value: metCount,
              tone: metCount > 0 ? 'success' : 'neutral',
              caption: 'Ghi nhận kết luận đạt yêu cầu',
            },
            {
              icon: 'warning',
              label: 'Cảnh báo rủi ro',
              value: riskCount,
              tone: riskCount > 0 ? 'warning' : 'neutral',
              caption: 'Quá hạn hoặc đang cần lưu ý',
            },
            {
              icon: 'pending',
              label: 'Đang chờ đánh giá',
              value: undecidedCount,
              tone: 'info',
              caption: 'Chưa ghi nhận kết luận mới nhất',
            },
          ]}
        />
      )}

      {!loading && (
        <div className={canCreate ? 'grid grid-cols-1 gap-5 xl:grid-cols-12 items-start' : 'space-y-4'}>
          {/* Left column (8 cols when canCreate, full width for student): Checkpoints list */}
          <div className={canCreate ? 'xl:col-span-8 space-y-4' : 'space-y-4'}>
            {!error && checkpoints && checkpoints.length === 0 && (
              <p className="rounded-xl border border-hairline bg-card p-5 text-sm text-ink-muted">Đồ án chưa có checkpoint theo dõi nào.</p>
            )}
            {!error && checkpoints && checkpoints.length > 0 && (
              <>
                <ol className="space-y-4">
                  {pagination.paginatedItems.map((checkpoint) => (
                    <CheckpointRow
                      key={checkpoint.id}
                      checkpoint={checkpoint}
                      majorName={checkpoint.majorId != null ? (majorNameById.get(checkpoint.majorId) ?? `Chuyên ngành #${checkpoint.majorId}`) : null}
                      onChanged={(updated) => setCheckpoints((current) => current?.map((c) => c.id === updated.id ? updated : c) ?? null)}
                      onConflict={reload}
                    />
                  ))}
                </ol>
                {pagination.showPagination && (
                  <Pagination
                    page={pagination.page}
                    pages={pagination.totalPages}
                    total={pagination.total}
                    pageSize={pagination.pageSize}
                    pageSizeOptions={[8, 16, 30]}
                    onPage={pagination.setPage}
                    onPageSizeChange={pagination.setPageSize}
                  />
                )}
              </>
            )}
          </div>

          {/* Right Bento column (4 cols): Create Checkpoint Form */}
          {canCreate && (
            <section className="xl:col-span-4 overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
              <div className="flex items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
                <h2 className="text-sm font-bold text-ink">Tạo checkpoint mới</h2>
                <StatusBadge tone="info" label="Kế hoạch" />
              </div>
              <div className="p-5 space-y-3.5">
                <label className="block text-sm font-medium text-ink-soft">
                  Tiêu đề
                  <input
                    className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                    value={newTitle}
                    disabled={creating}
                    onChange={(event) => setNewTitle(event.target.value)}
                  />
                </label>
                <label className="block text-sm font-medium text-ink-soft">
                  Mã ngành (để trống nếu chung)
                  <input
                    type="number"
                    className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                    value={newMajorId}
                    disabled={creating}
                    onChange={(event) => setNewMajorId(event.target.value)}
                  />
                </label>
                <label className="block text-sm font-medium text-ink-soft">
                  Thời điểm dự kiến
                  <input
                    type="datetime-local"
                    className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                    value={newPlannedAt}
                    disabled={creating}
                    onChange={(event) => setNewPlannedAt(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
                  disabled={creating || !newTitle.trim() || !newPlannedAt}
                  onClick={() => void submitCreate()}
                >
                  Tạo checkpoint
                </button>
              </div>
            </section>
          )}
        </div>
      )}
    </WorkspacePage>
  )
}

function CheckpointRow({ checkpoint, majorName, onChanged, onConflict }: {
  checkpoint: ProjectCheckpoint; majorName: string | null; onChanged: (updated: ProjectCheckpoint) => void; onConflict: () => void
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

  return (
    <li className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3 bg-canvas/70 border-b border-hairline px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-ink">{checkpoint.title}</h2>
          <p className="mt-0.5 text-xs text-ink-muted">Dự kiến: {formatPlannedAt(checkpoint.plannedAt)}{majorName ? ` · ${majorName}` : ' · Chung'}</p>
        </div>
        {unresolvedRisk && (
          <StatusBadge tone="warning" label="Quá hạn, chưa kết luận" />
        )}
      </div>

      <div className="p-5">
        {checkpoint.decisions.length > 0 && (
          <ul className="space-y-2.5">
            {checkpoint.decisions.map((d) => (
              <li key={d.id} className="rounded-lg border border-hairline bg-canvas/50 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-ink-soft">
                  <StatusBadge tone={badgeToneFor(d.decision)} label={describeDecision(d.decision)} />
                  <span className="text-xs text-ink-muted">{new Date(d.decidedAt).toLocaleDateString('vi-VN')}</span>
                </div>
                {d.reason && <p className="mt-1 text-sm leading-6 text-ink-muted">{d.reason}</p>}
                {d.evidence && d.evidence.length > 0 && (
                  <p className="mt-1 text-xs text-ink-muted">
                    Minh chứng đã review: {d.evidence.map((e) => `#${e.evidenceId} (Review #${e.reviewId})`).join(', ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        {checkpoint.decisions.length === 0 && <p className="text-sm text-ink-muted">Chưa có kết luận.</p>}

        {rowError && <p role="alert" className="mt-3 text-sm text-status-error-text">{rowError}</p>}

        {checkpoint.canManage && (
          <div className="mt-4 space-y-3 border-t border-hairline pt-4">
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-sm text-ink-soft">
                Kết luận
                <select className="mt-1 block min-h-11 rounded-lg border border-hairline bg-card px-3 py-2 text-sm text-ink" value={decision} disabled={busy} onChange={(event) => setDecision(event.target.value as CheckpointDecisionValue)}>
                  <option value="MET">Đạt</option>
                  <option value="AT_RISK">Rủi ro</option>
                  <option value="NOT_MET">Chưa đạt</option>
                  <option value="CANCELLED">Hủy</option>
                </select>
              </label>
              <label className="flex-1 min-w-48 text-sm text-ink-soft">
                Lý do
                <input className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm text-ink" value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} />
              </label>
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
                <div key={idx} className="flex flex-wrap items-center gap-2">
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
              <button
                type="button"
                className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
                disabled={busy || !reason.trim()}
                onClick={() => void submitDecision()}
              >
                Ghi kết luận
              </button>
            </div>
          </div>
        )}
        {latestDecision?.decision === 'CANCELLED' && <p className="mt-2 text-xs text-ink-muted">Checkpoint đã hủy; không thêm kết luận mới.</p>}
      </div>
    </li>
  )
}
