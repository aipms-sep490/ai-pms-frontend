import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { useQualificationQueue } from '../hooks/useQualificationQueue'

import { QualificationCertificateViewer } from '../components/QualificationCertificateViewer'
const statuses: Record<string, string> = { PENDING_VERIFICATION: 'Chờ xác minh', VERIFIED: 'Đã xác minh', REJECTED: 'Bị từ chối', EXPIRED: 'Đã hết hạn' }
function date(value?: string | null) {
  if (!value) return 'Chưa khai báo'
  const parsed = new Date(value)
  return Number.isNaN(parsed.valueOf()) ? 'Ngày chưa hợp lệ' : parsed.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
}

export function QualificationVerificationPage() {
  const queue = useQualificationQueue()
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const [pendingId, setPendingId] = useState<number | null>(null), [notice, setNotice] = useState<string | null>(null)
  const lock = useRef(false), errorSummary = useRef<HTMLDivElement>(null)
  useEffect(() => { if (queue.error) errorSummary.current?.focus() }, [queue.error])
  useEffect(() => { setNotice(null) }, [queue.page, queue.search, queue.status])

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

  return <WorkspacePage title="Xác minh điều kiện tham gia đồ án" eyebrow="Điều kiện tham gia" description="Kiểm tra hồ sơ đào tạo và thông tin chứng chỉ của sinh viên thuộc bộ môn trước khi đăng ký đồ án.">
    <section className="workspace-surface space-y-4 p-4 sm:p-5" aria-label="Lọc hồ sơ xác minh">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-0 w-full text-sm font-medium sm:w-auto sm:flex-1">Tìm sinh viên<input className="mt-2 block min-h-11 w-full rounded-lg border border-hairline px-3" value={queue.search} disabled={pendingId !== null} onChange={event => queue.setSearch(event.target.value)} placeholder="Tên hoặc mã sinh viên" /></label>
        <label className="text-sm font-medium">Trạng thái<select className="mt-2 block min-h-11 max-w-full rounded-lg border border-hairline px-3" value={queue.status} disabled={pendingId !== null} onChange={event => queue.setStatus(event.target.value)}>{Object.entries(statuses).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
        <Button className="min-h-11" variant="secondary" onClick={() => void queue.refresh()} disabled={queue.loading || pendingId !== null}>Tải lại</Button>
      </div>
      {queue.error && <div ref={errorSummary} tabIndex={-1} role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{queue.error}</div>}
      {notice && <p role="status" className="text-sm text-status-success-text">{notice}</p>}
    </section>
    {queue.loading ? <p role="status" className="p-4 text-sm">Đang tải hồ sơ…</p> : !queue.error && queue.items.length === 0 ? <p className="workspace-surface p-5 text-sm text-slate-600">Không có hồ sơ phù hợp.</p> : <ul className="space-y-3" aria-label="Hồ sơ sinh viên">{queue.items.map(item => <li key={item.id} className="workspace-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words font-heading font-semibold">{item.fullName}</h2><p className="mt-1 font-mono text-xs text-slate-600">{item.studentCode ?? `Sinh viên #${item.userId}`}</p></div><span className="rounded-lg bg-primary-subtle px-3 py-2 text-sm text-primary">{statuses[item.verificationStatus] ?? item.verificationStatus}</span></div>
      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-slate-500">Đào tạo</dt><dd>{item.trainingStatus === 'TRAINING_COMPLETED' ? 'Đã hoàn thành' : 'Chưa hoàn thành'}</dd></div>
        <div><dt className="text-slate-500">Số chứng chỉ</dt><dd className="break-all">{item.certificateNumber ?? 'Chưa khai báo'}</dd></div>
        <div><dt className="text-slate-500">Ngày cấp</dt><dd>{date(item.issuedAt)}</dd></div>
        <div><dt className="text-slate-500">Ngày hết hạn</dt><dd>{date(item.expiresAt)}</dd></div>
      </dl>
      {item.certificateFileId && <QualificationCertificateViewer key={`${item.id}:${item.concurrencyToken}:${item.certificateFileId}`} qualificationId={item.id} />}
      {item.rejectionReason && <p className="mt-3 break-words text-sm text-status-error-text">Lý do từ chối: {item.rejectionReason}</p>}
      {item.verifiedAt && <p className="mt-3 text-sm text-slate-600">Đã xử lý ngày {date(item.verifiedAt)} · Người xác minh #{item.verifiedBy}</p>}
      {item.verificationStatus === 'PENDING_VERIFICATION' && <div className="mt-4 flex flex-wrap gap-3">
        <span title={item.trainingStatus !== 'TRAINING_COMPLETED' ? 'Cần hoàn thành đào tạo trước khi xác minh.' : undefined}><Button className="min-h-11" disabled={pendingId !== null || !item.concurrencyToken || item.trainingStatus !== 'TRAINING_COMPLETED'} onClick={() => void decide(item.id, item.concurrencyToken ?? '', false)}>Xác minh</Button></span>
        <Button className="min-h-11" variant="danger" disabled={pendingId !== null || !item.concurrencyToken} onClick={() => void decide(item.id, item.concurrencyToken ?? '', true)}>Từ chối</Button>
        {!item.concurrencyToken && <p className="self-center text-sm text-slate-600">Hồ sơ chưa có phiên bản xác minh. Hãy tải lại; chưa thể quyết định.</p>}{item.trainingStatus !== 'TRAINING_COMPLETED' && <p className="self-center text-sm text-slate-600">Cần hoàn thành đào tạo trước khi xác minh.</p>}
      </div>}
    </li>)}</ul>}
    {!queue.loading && !queue.error && <nav className="flex flex-wrap items-center justify-between gap-3 text-sm" aria-label="Phân trang hồ sơ xác minh"><Button className="min-h-11" variant="secondary" disabled={queue.page <= 1 || pendingId !== null} onClick={() => queue.setPage(queue.page - 1)}>Trang trước</Button><p>Trang {queue.page} / {queue.totalPages} · {queue.totalCount} hồ sơ</p><Button className="min-h-11" variant="secondary" disabled={queue.page >= queue.totalPages || pendingId !== null} onClick={() => queue.setPage(queue.page + 1)}>Trang sau</Button></nav>}
    {confirmationDialog}
  </WorkspacePage>
}
