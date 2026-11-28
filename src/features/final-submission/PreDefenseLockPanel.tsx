import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { InlineAlert } from '../../components/ui/InlineAlert'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { HttpError } from '../../services/http/http-client'
import * as checklistApi from '../review-gates/api/project-checklists-api'
import { ProjectChecklistPanel } from '../review-gates/components/ProjectChecklistPanel'

interface PreDefenseLockPanelProps {
  projectId: number
  mode: 'supervisor' | 'department'
  onChanged?: () => void
}

function formatLockError(reason: unknown, fallback: string): string {
  if (reason instanceof HttpError) {
    const code = reason.problem?.code ?? reason.problem?.errorCode
    if (code === 'GATE_3_NOT_PASSED') return 'Chưa thể khóa hồ sơ: Cổng Gate 3 (và các cổng chặn bảo vệ) chưa đạt PASSED.'
    if (code === 'EVALUATION_ALREADY_STARTED') return 'Không thể mở lại hồ sơ: Đồ án đã phát sinh phân công chấm hoặc phiếu đánh giá.'
    if (code === 'COLD_PACKAGE_INCOMPLETE') return 'Hồ sơ chấm nguội (Cold) chưa hoàn tất đủ các mục bắt buộc.'
    if (code === 'STALE_CONCURRENCY_TOKEN') return 'Trạng thái hồ sơ vừa thay đổi. Dữ liệu đã được làm mới, vui lòng kiểm tra lại.'
    if (code === 'ADMIN_NOT_ACADEMIC_AUTHORITY' || reason.status === 403) return 'Chỉ GVHD Chính (bước ký duyệt) hoặc Giáo vụ Khoa chủ trì (Force-Lock / Reopen) mới có quyền thực hiện thao tác này.'
    if (reason.problem?.detail) return reason.problem.detail
  }
  return fallback
}

const statusMeta: Record<checklistApi.PreDefenseLockStatusDto['lockWorkflowStatus'], { label: string; tone: 'neutral' | 'warning' | 'success' }> = {
  OPEN: { label: 'Đang soạn nháp (OPEN)', tone: 'neutral' },
  PENDING_SUPERVISOR_LOCK: { label: 'Chờ GVHD ký khóa (PENDING_SUPERVISOR_LOCK)', tone: 'warning' },
  LOCKED: { label: 'Đã khóa Final + Cold (LOCKED)', tone: 'success' },
}

export function PreDefenseLockPanel({ projectId, mode, onChanged }: PreDefenseLockPanelProps) {
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const [status, setStatus] = useState<checklistApi.PreDefenseLockStatusDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const next = await checklistApi.getPreDefenseLockStatus(projectId)
      setStatus(next)
      setError(null)
    } catch (err) {
      if (err instanceof HttpError && (err.status === 404 || err.status === 403)) {
        setStatus(null)
        setError(null)
      } else {
        setError(formatLockError(err, 'Chưa tải được trạng thái khóa hồ sơ Tiền-Defense.'))
      }
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void load() }, [load])

  const handleSupervisorDecision = async (decision: 'LOCK' | 'RETURN_TO_OPEN') => {
    if (!status) return
    if (decision === 'RETURN_TO_OPEN' && !notes.trim()) {
      setError('Vui lòng nhập ghi chú lý do khi trả hồ sơ về cho nhóm chỉnh sửa.')
      return
    }
    if (decision === 'LOCK') {
      const confirmed = await requestConfirmation({
        title: 'Ký khóa đồng thời Final & Cold?',
        description: 'Thao tác này sẽ đóng băng toàn bộ tệp gói nộp cuối (Final Submission) và hồ sơ chấm nguội (Cold Package) trong 1 giao dịch nguyên tử, chuyển đồ án sang trạng thái FINAL_SUBMISSION.',
        confirmLabel: 'Xác nhận ký khóa',
      })
      if (confirmed === null) return
    }
    setBusy(true); setError(null); setNotice(null)
    try {
      const updated = await checklistApi.supervisorDecideFinalLock(projectId, {
        decision,
        notes: notes.trim() || undefined,
        concurrencyToken: status.draftConcurrencyToken ?? undefined,
      })
      setStatus(updated)
      setNotes('')
      setNotice(decision === 'LOCK'
        ? 'Đã ký khóa thành công gói Final & Cold. Đồ án đã chuyển sang trạng thái FINAL_SUBMISSION.'
        : 'Đã trả hồ sơ bàn giao về trạng thái OPEN kèm ghi chú cho nhóm chỉnh sửa.')
      onChanged?.()
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) await load()
      setError(formatLockError(err, 'Không thể xử lý quyết định khóa hồ sơ.'))
    } finally {
      setBusy(false)
    }
  }

  const handleForceLock = async () => {
    if (!status) return
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do bắt buộc trước khi thực hiện Khóa cưỡng chế (Force-Lock).')
      return
    }
    const confirmed = await requestConfirmation({
      title: 'Khóa cưỡng chế hồ sơ (Force-Lock)?',
      description: 'Chỉ dùng khi quá hạn hoặc GVHD vắng mặt. Hệ thống sẽ đóng băng Final + Cold, ghi nhận người khóa cưỡng chế và lưu vết Audit Log.',
      confirmLabel: 'Xác nhận Force-Lock',
      danger: true,
    })
    if (confirmed === null) return
    setBusy(true); setError(null); setNotice(null)
    try {
      const updated = await checklistApi.forceLockFinal(projectId, reason.trim(), status.draftConcurrencyToken ?? undefined)
      setStatus(updated)
      setReason('')
      setNotice('Đã thực hiện Khóa cưỡng chế (Force-Lock) thành công cho gói Final & Cold.')
      onChanged?.()
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) await load()
      setError(formatLockError(err, 'Không thể thực hiện Force-Lock.'))
    } finally {
      setBusy(false)
    }
  }

  const handleReopen = async () => {
    if (!status) return
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do bắt buộc khi mở lại hồ sơ bàn giao (Reopen).')
      return
    }
    const confirmed = await requestConfirmation({
      title: 'Mở lại hồ sơ bàn giao (Reopen)?',
      description: 'Chỉ thực hiện được khi chưa phát sinh bất kỳ phân công chấm hoặc phiếu chấm nào. Đồ án sẽ quay về trạng thái ACTIVE và bản nháp về OPEN.',
      confirmLabel: 'Xác nhận mở lại',
      danger: true,
    })
    if (confirmed === null) return
    setBusy(true); setError(null); setNotice(null)
    try {
      const updated = await checklistApi.reopenFinalLock(projectId, {
        reason: reason.trim(),
        concurrencyToken: status.draftConcurrencyToken ?? undefined,
      })
      setStatus(updated)
      setReason('')
      setNotice('Đã mở lại hồ sơ bàn giao (ACTIVE / OPEN) và gửi thông báo cho nhóm & GVHD.')
      onChanged?.()
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) await load()
      setError(formatLockError(err, 'Không thể mở lại hồ sơ bàn giao.'))
    } finally {
      setBusy(false)
    }
  }

  if (loading || !status) return null
  const badge = statusMeta[status.lockWorkflowStatus] ?? statusMeta.OPEN

  return (
    <div className="space-y-4">
      {confirmationDialog}
      <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-4" aria-label="Quy trình khóa hồ sơ Tiền-Defense 2 bước">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-ink">
              {mode === 'supervisor' ? 'Phê duyệt khóa hồ sơ Tiền-Defense (Bước 2 · GVHD Chính)' : 'Điều hành khóa hồ sơ Tiền-Defense (Khoa chủ trì)'}
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Quy trình 2 bước hợp nhất Final Submission &amp; Cold Package trong một giao dịch nguyên tử.
            </p>
          </div>
          <StatusBadge tone={badge.tone} label={badge.label} />
        </div>

        {status.coldManifestSha256 && (
          <p className="rounded-lg border border-hairline bg-canvas px-3 py-2 font-mono text-xs text-ink-soft break-all">
            <strong>ColdManifest SHA-256:</strong> {status.coldManifestSha256}
          </p>
        )}
        {status.forceLockReason && (
          <p className="rounded-lg border border-status-warning-border bg-status-warning-bg px-3 py-2 text-xs text-status-warning-text">
            <strong>Khóa cưỡng chế bởi Khoa:</strong> {status.forceLockReason}
          </p>
        )}

        {error && <InlineAlert tone="error">{error}</InlineAlert>}
        {notice && <InlineAlert tone="success">{notice}</InlineAlert>}

        {mode === 'supervisor' && status.lockWorkflowStatus === 'PENDING_SUPERVISOR_LOCK' && (
          <div className="space-y-3 rounded-lg border border-primary/25 bg-primary-subtle/30 p-4">
            <p className="text-sm text-ink">
              Trưởng nhóm đã gửi yêu cầu khóa hồ sơ bàn giao cuối &amp; chấm nguội. Hãy kiểm tra các tệp minh chứng và Review Checklist G3 trước khi ký khóa.
            </p>
            <label className="block text-xs font-semibold text-ink-soft">
              Ghi chú của GVHD (bắt buộc nếu Trả về chỉnh sửa)
              <textarea
                rows={2}
                value={notes}
                disabled={busy}
                onChange={e => setNotes(e.target.value)}
                placeholder="Nhập nhận xét kiểm tra hồ sơ hoặc nội dung nhóm cần bổ sung..."
                className="mt-1 w-full rounded-lg border border-hairline bg-card p-2.5 text-sm font-normal text-ink"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => void handleSupervisorDecision('LOCK')}>
                {busy ? 'Đang xử lý…' : 'Ký khóa Final & Cold'}
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => void handleSupervisorDecision('RETURN_TO_OPEN')}>
                Trả về nhóm chỉnh sửa
              </Button>
            </div>
          </div>
        )}

        {mode === 'supervisor' && status.lockWorkflowStatus === 'OPEN' && (
          <p className="text-xs text-ink-muted">
            Nhóm đang soạn bản nháp bàn giao. Sau khi Trưởng nhóm bấm <strong>Gửi duyệt khóa cho GVHD</strong>, hộp phê duyệt Bước 2 sẽ mở tại đây.
          </p>
        )}

        {mode === 'department' && (
          <div className="space-y-3 rounded-lg border border-hairline bg-canvas/50 p-4">
            <label className="block text-xs font-semibold text-ink-soft">
              Lý do nghiệp vụ (bắt buộc cho Force-Lock / Reopen)
              <input
                type="text"
                value={reason}
                disabled={busy}
                onChange={e => setReason(e.target.value)}
                placeholder={status.lockWorkflowStatus === 'LOCKED'
                  ? 'Ví dụ: Nhóm nộp nhầm bản cũ, chưa phát sinh phiếu chấm...'
                  : 'Ví dụ: Quá hạn nộp cuối hoặc GVHD vắng mặt, khóa để kịp chấm nguội...'}
                className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {status.lockWorkflowStatus !== 'LOCKED' ? (
                <Button variant="danger" disabled={busy} onClick={() => void handleForceLock()}>
                  {busy ? 'Đang khóa…' : 'Khóa cưỡng chế (Force-Lock)'}
                </Button>
              ) : (
                <Button variant="secondary" disabled={busy} onClick={() => void handleReopen()}>
                  {busy ? 'Đang mở lại…' : 'Mở lại hồ sơ (Reopen)'}
                </Button>
              )}
            </div>
          </div>
        )}
      </section>

      {mode === 'supervisor' && (
        <ProjectChecklistPanel projectId={projectId} gateCode="G3" hideOnNotFound />
      )}
    </div>
  )
}
