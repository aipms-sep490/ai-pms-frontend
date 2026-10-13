import type { ProjectReviewHistoryPage } from '../api/project-review-api'

interface DepartmentDecisionHistoryProps {
  snapshots: ProjectReviewHistoryPage | null
  departmentName: (departmentId: number) => string
  onPageChange: (page: number) => void
}

export function DepartmentDecisionHistory({ snapshots, departmentName, onPageChange }: DepartmentDecisionHistoryProps) {
  const pageCount = snapshots ? Math.max(1, Math.ceil(snapshots.totalCount / snapshots.pageSize)) : 1
  return (
    <section aria-labelledby="department-decision-history-heading" className="rounded-xl border border-hairline bg-card p-4 shadow-sm">
      <h2 id="department-decision-history-heading" className="font-bold text-ink">Lịch sử thẩm định</h2>
      <p className="mt-1 text-sm text-ink-muted">Xem quyết định của các bộ môn theo từng lần nộp đề cương.</p>
      {!snapshots ? <p className="mt-3 text-sm text-ink-muted">Đang tải lịch sử thẩm định…</p> : snapshots.items.length === 0 ? <p className="mt-3 rounded-lg bg-canvas p-3 text-sm text-ink-muted">Chưa có lần nộp đề cương trước đó.</p> : <ol className="mt-4 space-y-3">{snapshots.items.map((snapshot) => <li key={snapshot.id} className="workspace-record-row"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-ink">Lần nộp #{snapshot.submissionNumber}</h3><time className="text-sm text-ink-muted" dateTime={snapshot.submittedAt}>{new Date(snapshot.submittedAt).toLocaleString('vi-VN')}</time></div><p className="mt-1 text-sm text-ink-muted">Phạm vi: {snapshot.evidence?.scope?.projectMode ?? 'Không có dữ liệu'} · Proposal {snapshot.proposalAvailable ? 'có lưu trong bản tổng hợp' : 'không còn khả dụng trong bản tổng hợp'}</p><ul className="mt-3 space-y-2" aria-label={`Quyết định của lần nộp ${snapshot.submissionNumber}`}>{snapshot.decisions.map((decision) => <li key={`${snapshot.id}-${decision.departmentId}`} className="rounded-md bg-canvas px-3 py-2 text-sm"><span className="font-medium text-ink">{departmentName(decision.departmentId)}</span>: {decision.decision}{decision.reason ? ` — ${decision.reason}` : ''}{decision.decidedAt ? <time className="ml-2 text-ink-muted" dateTime={decision.decidedAt}>{new Date(decision.decidedAt).toLocaleString('vi-VN')}</time> : null}</li>)}</ul></li>)}</ol>}
      {snapshots && pageCount > 1 && <nav className="mt-4 flex items-center justify-end gap-2" aria-label="Phân trang lịch sử thẩm định"><button type="button" onClick={() => onPageChange(snapshots.page - 1)} disabled={snapshots.page <= 1} className="min-h-11 rounded-md border border-line-strong px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">Trước</button><span className="text-sm text-ink-muted">Trang {snapshots.page}/{pageCount}</span><button type="button" onClick={() => onPageChange(snapshots.page + 1)} disabled={snapshots.page >= pageCount} className="min-h-11 rounded-md border border-line-strong px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">Sau</button></nav>}
    </section>
  )
}
