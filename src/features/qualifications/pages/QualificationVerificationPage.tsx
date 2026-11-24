import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Pagination } from '../../../components/ui/Pagination'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import type { BadgeTone } from '../../../components/ui/status-badge-tone'
import { useQualificationQueue } from '../hooks/useQualificationQueue'

import { QualificationCertificateViewer } from '../components/QualificationCertificateViewer'
const statuses: Record<string, string> = { PENDING_VERIFICATION: 'Chờ xác minh', VERIFIED: 'Đã xác minh', REJECTED: 'Bị từ chối', EXPIRED: 'Đã hết hạn' }
const statusTone: Record<string, BadgeTone> = {
  PENDING_VERIFICATION: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'neutral',
}
function date(value?: string | null) {
  if (!value) return 'Chưa khai báo'
  const parsed = new Date(value)
  return Number.isNaN(parsed.valueOf()) ? 'Ngày chưa hợp lệ' : parsed.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
}

export function QualificationVerificationPage() {
  const queue = useQualificationQueue()
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const filterKey = `${queue.page}:${queue.search}:${queue.status}`
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [noticeState, setNoticeState] = useState<{ key: string; text: string } | null>(null)
  const notice = noticeState?.key === filterKey ? noticeState.text : null
  const setNotice = (text: string | null) => setNoticeState(text ? { key: filterKey, text } : null)
  const lock = useRef(false), errorSummary = useRef<HTMLDivElement>(null)
  useEffect(() => { if (queue.error) errorSummary.current?.focus() }, [queue.error])

  const trainingCompletedCount = queue.loading
    ? null
    : queue.items.filter(item => item.trainingStatus === 'TRAINING_COMPLETED').length
  const pendingTrainingCount = queue.loading
    ? null
    : queue.items.filter(item => item.trainingStatus !== 'TRAINING_COMPLETED').length
  const certificateAttachedCount = queue.loading
    ? null
    : queue.items.filter(item => Boolean(item.certificateFileId || item.certificateNumber)).length

  async function decide(id: number, token: string, reject: boolean) {
    if (lock.current) return
    lock.current = true; setPendingId(id); setNotice(null)
    try {
      const response = await requestConfirmation(reject
        ? { title: 'Từ chối xác minh', description: 'Nêu lý do để sinh viên biết cần bổ sung hoặc điều chỉnh thông tin nào.', confirmLabel: 'Từ chối xác minh', danger: true, reasonLabel: 'Lý do từ chối' }
        : { title: 'Xác minh điều kiện tham gia', description: 'Xác nhận đã kiểm tra thông tin đào tạo và chứng chỉ của sinh viên.', confirmLabel: 'Xác nhận đủ điều kiện' })
      if (response === null) return
      if (await queue.decide(id, token, reject ? response.trim() : undefined)) setNotice(reject ? 'Đã ghi nhận từ chối xác minh.' : 'Đã xác minh hồ sơ sinh viên.')
    } finally { lock.current = false; setPendingId(null) }
  }

  return <WorkspacePage className="space-y-5" title="Xác minh điều kiện tham gia đồ án" eyebrow="Điều kiện tham gia" description="Kiểm tra hồ sơ đào tạo và thông tin chứng chỉ của sinh viên thuộc bộ môn trước khi đăng ký đồ án.">
    <StatTileRow tiles={[
      { icon: 'assignment_ind', label: `Tổng hồ sơ (${statuses[queue.status] ?? 'Bộ lọc'})`, value: queue.loading ? null : queue.totalCount, caption: 'Trong bộ lọc trạng thái hiện tại.', hero: true },
      { icon: 'verified', label: 'Đã xong đào tạo', value: trainingCompletedCount, tone: 'success', caption: `Trong ${queue.items.length} hồ sơ trang này · đủ điều kiện duyệt.` },
      { icon: 'pending_actions', label: 'Chưa xong đào tạo', value: pendingTrainingCount, tone: pendingTrainingCount && pendingTrainingCount > 0 ? 'warning' : 'neutral', caption: 'Trong bộ lọc hiện tại · chưa thể xác minh.' },
      { icon: 'workspace_premium', label: 'Có thông tin chứng chỉ', value: certificateAttachedCount, tone: 'info', caption: 'Đã khai báo số hoặc tải tệp chứng chỉ.' },
    ]} />

    <section className="workspace-surface space-y-3 p-4 sm:p-5" aria-label="Lọc hồ sơ xác minh">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-56 flex-1 text-xs font-semibold text-ink-soft">Tìm sinh viên
          <input className="mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:bg-canvas disabled:text-ink-muted" value={queue.search} disabled={pendingId !== null} onChange={event => queue.setSearch(event.target.value)} placeholder="Tên hoặc mã sinh viên" />
        </label>
        <label className="min-w-48 text-xs font-semibold text-ink-soft">Trạng thái
          <select className="mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:bg-canvas disabled:text-ink-muted" value={queue.status} disabled={pendingId !== null} onChange={event => queue.setStatus(event.target.value)}>{Object.entries(statuses).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select>
        </label>
        <Button className="min-h-11 shrink-0" variant="secondary" icon="refresh" onClick={() => void queue.refresh()} disabled={queue.loading || pendingId !== null}>Tải lại</Button>
      </div>
      {queue.error && <div ref={errorSummary} tabIndex={-1} role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{queue.error}</div>}
      {notice && <p role="status" className="rounded-lg border border-status-success-border bg-status-success-bg p-3 text-sm text-status-success-text">{notice}</p>}
    </section>

    {queue.loading ? (
      <p role="status" className="workspace-surface p-5 text-sm text-ink-muted">Đang tải hồ sơ…</p>
    ) : !queue.error && queue.items.length === 0 ? (
      <p className="workspace-surface p-5 text-sm text-ink-muted">Không có hồ sơ phù hợp.</p>
    ) : (
      <ul className="space-y-3.5" aria-label="Hồ sơ sinh viên">
        {queue.items.map(item => (
          <li key={item.id} className="workspace-surface">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-canvas/70 px-5 py-3.5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="break-words font-heading text-base font-bold text-ink">{item.fullName}</h2>
                  <span className="rounded-md border border-hairline bg-card px-2 py-0.5 font-mono text-xs font-semibold text-ink-soft">
                    {item.studentCode ?? `Sinh viên #${item.userId}`}
                  </span>
                  <StatusBadge tone={statusTone[item.verificationStatus] ?? 'neutral'} label={statuses[item.verificationStatus] ?? item.verificationStatus} />
                </div>
              </div>
              {item.verificationStatus === 'PENDING_VERIFICATION' && (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span title={item.trainingStatus !== 'TRAINING_COMPLETED' ? 'Cần hoàn thành đào tạo trước khi xác minh.' : undefined}>
                    <Button size="sm" disabled={pendingId !== null || !item.concurrencyToken || item.trainingStatus !== 'TRAINING_COMPLETED'} onClick={() => void decide(item.id, item.concurrencyToken ?? '', false)}>
                      Xác minh
                    </Button>
                  </span>
                  <Button size="sm" variant="danger" disabled={pendingId !== null || !item.concurrencyToken} onClick={() => void decide(item.id, item.concurrencyToken ?? '', true)}>
                    Từ chối
                  </Button>
                </div>
              )}
            </header>

            <div className="space-y-3 p-5">
              <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-hairline bg-canvas p-3">
                  <dt className="text-xs text-ink-muted">Đào tạo</dt>
                  <dd className="mt-1">
                    <StatusBadge
                      tone={item.trainingStatus === 'TRAINING_COMPLETED' ? 'success' : 'warning'}
                      label={item.trainingStatus === 'TRAINING_COMPLETED' ? 'Đã hoàn thành' : 'Chưa hoàn thành'}
                    />
                  </dd>
                </div>
                <div className="rounded-xl border border-hairline bg-canvas p-3">
                  <dt className="text-xs text-ink-muted">Số chứng chỉ</dt>
                  <dd className="mt-1 break-all font-mono text-sm font-semibold text-ink">{item.certificateNumber ?? 'Chưa khai báo'}</dd>
                </div>
                <div className="rounded-xl border border-hairline bg-canvas p-3">
                  <dt className="text-xs text-ink-muted">Ngày cấp</dt>
                  <dd className="mt-1 font-medium tabular-nums text-ink">{date(item.issuedAt)}</dd>
                </div>
                <div className="rounded-xl border border-hairline bg-canvas p-3">
                  <dt className="text-xs text-ink-muted">Ngày hết hạn</dt>
                  <dd className="mt-1 font-medium tabular-nums text-ink">{date(item.expiresAt)}</dd>
                </div>
              </dl>

              {item.certificateFileId && <QualificationCertificateViewer key={`${item.id}:${item.concurrencyToken}:${item.certificateFileId}`} qualificationId={item.id} />}

              {item.verificationStatus === 'PENDING_VERIFICATION' && (!item.concurrencyToken || item.trainingStatus !== 'TRAINING_COMPLETED') && (
                <div className="flex flex-wrap gap-3 rounded-lg border border-status-warning-border bg-status-warning-bg px-3.5 py-2.5 text-xs font-medium text-status-warning-text">
                  {!item.concurrencyToken && <p>Hồ sơ chưa có phiên bản xác minh. Hãy tải lại; chưa thể quyết định.</p>}
                  {item.trainingStatus !== 'TRAINING_COMPLETED' && <p>Cần hoàn thành đào tạo trước khi xác minh.</p>}
                </div>
              )}

              {item.rejectionReason && <p className="break-words rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">Lý do từ chối: {item.rejectionReason}</p>}
              {item.verifiedAt && (
                <p className="text-xs text-ink-muted">
                  Đã xử lý ngày {date(item.verifiedAt)}
                  {((item as { verifiedByName?: string | null }).verifiedByName)
                    ? ` · Người xác minh: ${(item as { verifiedByName?: string | null }).verifiedByName}`
                    : item.verifiedBy != null
                      ? ` · Cán bộ xác minh (mã ${item.verifiedBy})`
                      : ''}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    )}

    {!queue.loading && !queue.error && queue.totalPages > 1 && (
      <Pagination
        page={queue.page}
        pages={queue.totalPages}
        total={queue.totalCount}
        pageSize={queue.pageSize}
        busy={queue.loading || pendingId !== null}
        onPage={queue.setPage}
      />
    )}
    {confirmationDialog}
  </WorkspacePage>
}
