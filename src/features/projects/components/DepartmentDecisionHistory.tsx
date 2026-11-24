import { dateTimeLabel } from '../../execution/execution-utils'
import { displayLabel } from '../../../components/ui/display-label'
import { Pagination } from '../../../components/ui'
import type { ProjectReviewHistoryPage } from '../api/project-review-api'

interface DepartmentDecisionHistoryProps {
  snapshots: ProjectReviewHistoryPage | null
  departmentName: (departmentId: number) => string
  onPageChange: (page: number) => void
}

export function DepartmentDecisionHistory({ snapshots, departmentName, onPageChange }: DepartmentDecisionHistoryProps) {
  const pageCount = snapshots ? Math.max(1, Math.ceil(snapshots.totalCount / snapshots.pageSize)) : 1
  return (
    <section aria-labelledby="department-decision-history-heading" className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
        <div>
          <h2 id="department-decision-history-heading" className="text-base font-bold text-ink">Lịch sử thẩm định</h2>
          <p className="mt-0.5 text-xs text-ink-muted">Quyết định của các bộ môn theo từng lần nộp đề cương.</p>
        </div>
        {snapshots && (
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-primary">
            {snapshots.totalCount}
          </span>
        )}
      </div>
      <div className="p-5">
        {!snapshots ? (
          <p className="text-sm text-ink-muted">Đang tải lịch sử thẩm định…</p>
        ) : snapshots.items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-hairline bg-canvas p-4 text-sm text-ink-muted">Chưa có lần nộp đề cương trước đó.</p>
        ) : (
          <ol className="space-y-3">
            {snapshots.items.map((snapshot) => (
              <li key={snapshot.id} className="workspace-record-row">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-ink">Lần nộp #{snapshot.submissionNumber}</h3>
                  <time className="font-mono text-xs text-ink-muted" dateTime={snapshot.submittedAt}>{dateTimeLabel(snapshot.submittedAt)}</time>
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  Phạm vi: {snapshot.evidence?.scope?.projectMode ? displayLabel(snapshot.evidence.scope.projectMode) : 'Không có dữ liệu'} · Đề cương {snapshot.proposalAvailable ? 'có lưu trong bản tổng hợp' : 'không còn khả dụng trong bản tổng hợp'}
                </p>
                <ul className="mt-3 space-y-2" aria-label={`Quyết định của lần nộp ${snapshot.submissionNumber}`}>
                  {snapshot.decisions.map((decision) => (
                    <li key={`${snapshot.id}-${decision.departmentId}`} className="rounded-md border border-hairline bg-canvas px-3 py-2 text-xs">
                      <span className="font-semibold text-ink">{departmentName(decision.departmentId)}</span>: {displayLabel(decision.decision)}
                      {decision.reason ? ` — ${decision.reason}` : ''}
                      {decision.decidedAt ? <time className="ml-2 font-mono text-ink-muted" dateTime={decision.decidedAt}>{dateTimeLabel(decision.decidedAt)}</time> : null}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
        {snapshots && pageCount > 1 && (
          <div className="mt-4 border-t border-hairline pt-3">
            <Pagination
              page={snapshots.page}
              pages={pageCount}
              total={snapshots.totalCount}
              pageSize={snapshots.pageSize}
              onPage={onPageChange}
            />
          </div>
        )}
      </div>
    </section>
  )
}
