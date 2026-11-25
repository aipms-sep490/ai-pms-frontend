import { useMemo, useState, type ReactNode } from 'react'
import { Button } from '../../../components/ui/Button'
import { FilterToolbar } from '../../../components/ui/FilterToolbar'
import { Pagination } from '../../../components/ui/Pagination'
import { useClientPagination } from '../../../components/ui/useClientPagination'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { Link } from 'react-router-dom'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { ReportBadge } from '../../reports/report-ui'
import { formatReportDate, type ProgressReport, type ReportStatus } from '../../reports/report-types'
import { useSupervisorProgressReview, type ProgressReviewResource } from '../hooks/useSupervisorProgressReview'

type StatusFilter = 'ALL' | ReportStatus
type TypeFilter = 'ALL' | 'WEEKLY' | 'MONTHLY'
type SortKey = 'newest' | 'oldest' | 'pending-first'

function reportTypeLabel(type?: string) {
  if (type === 'MONTHLY') return 'Báo cáo tháng'
  if (type === 'WEEKLY') return 'Báo cáo tuần'
  return 'Báo cáo tiến độ'
}

export function SupervisorProgressReviewPage() {
  const { project, routeBase } = useExecutionAccess()
  const review = useSupervisorProgressReview(project.id)
  const items = review.reports.state === 'ready' ? review.reports.data.items : []
  const reportCounts = review.reports.state === 'ready' ? countByStatus(items) : null

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  const [sortBy, setSortBy] = useState<SortKey>('newest')

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = items.filter((report) => {
      if (statusFilter !== 'ALL' && report.status !== statusFilter) return false
      if (typeFilter !== 'ALL' && report.reportType !== typeFilter) return false
      if (!q) return true
      return (report.summary ?? '').toLowerCase().includes(q)
        || (report.issuesAndRisks ?? '').toLowerCase().includes(q)
        || (report.submittedByName ?? '').toLowerCase().includes(q)
    })
    return [...list].sort((a, b) => {
      if (sortBy === 'pending-first') {
        const score = (s: ReportStatus) => (s === 'SUBMITTED' ? 0 : s === 'DRAFT' ? 1 : 2)
        const diff = score(a.status) - score(b.status)
        if (diff !== 0) return diff
      }
      const ta = Date.parse(a.periodEnd || a.periodStart) || 0
      const tb = Date.parse(b.periodEnd || b.periodStart) || 0
      return sortBy === 'oldest' ? ta - tb : tb - ta
    })
  }, [items, search, sortBy, statusFilter, typeFilter])

  const reportPager = useClientPagination(filteredReports, 10)

  const activeChips = [
    ...(search.trim() ? [{ id: 'search', label: 'Từ khóa', value: search.trim() }] : []),
    ...(statusFilter !== 'ALL' ? [{ id: 'status', label: 'Trạng thái', value: ({ SUBMITTED: 'Đã nộp', REVIEWED: 'Đã nhận xét', DRAFT: 'Bản nháp' })[statusFilter] }] : []),
    ...(typeFilter !== 'ALL' ? [{ id: 'type', label: 'Kỳ báo cáo', value: reportTypeLabel(typeFilter) }] : []),
  ]

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('ALL')
    setTypeFilter('ALL')
    setSortBy('newest')
  }

  return (
    <WorkspacePage
      size="wide"
      className="space-y-6"
      title="Theo dõi tiến độ và báo cáo"
      eyebrow={`Giám sát tiến độ · ${project.code}`}
      backTo={`${routeBase}/workspace`}
      backLabel="Tổng quan đồ án"
      description="Theo dõi kết quả thực hiện, những việc cần lưu ý và gửi phản hồi cho nhóm."
      action={<Button variant="secondary" size="sm" icon="refresh" aria-label="Làm mới dữ liệu" onClick={review.reload} />}
    >
      <section aria-labelledby="progress-overview">
        <h2 id="progress-overview" className="sr-only">Tổng quan tiến độ</h2>
        <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ResourceCard label="Tiến độ tổng quan" resource={review.summary} render={data => <><strong className="text-2xl text-ink">{data.progressPercentage}%</strong><p className="mt-2">{data.doneTasks}/{data.totalTasks} công việc · {data.completedMilestones}/{data.totalMilestones} mốc hoàn thành</p></>} />
          <ResourceCard label="Công việc cần lưu ý" resource={review.attention} render={data => <><strong className="text-2xl text-ink">{data.overdueTasks.length + data.blockedTasks.length}</strong><p className="mt-2">{data.overdueTasks.length} quá hạn · {data.blockedTasks.length} vướng mắc</p></>} />
          <ResourceCard label="Báo cáo theo kỳ" resource={review.reports} render={data => <><strong className="text-2xl text-ink">{data.totalCount}</strong><p className="mt-2">{reportCounts ? `${reportCounts.SUBMITTED} đã nộp · ${reportCounts.REVIEWED} đã có phản hồi trong trang đang xem` : 'Đang tổng hợp'}</p></>} />
        </div>
      </section>

      <section className="workspace-surface overflow-hidden" aria-labelledby="progress-report-list">
        <div className="flex flex-col gap-2 border-b border-hairline px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="progress-report-list" className="font-heading font-bold text-ink">Báo cáo tiến độ</h2>
            <p className="mt-1 text-sm text-ink-muted">Mở báo cáo để xem kết quả và gửi nhận xét cho nhóm.</p>
          </div>
          <Link className="inline-flex min-h-10 items-center text-xs font-semibold text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to={`${routeBase}/reports`}>Mở danh sách đầy đủ</Link>
        </div>

        {review.reports.state === 'ready' && items.length > 0 && (
          <FilterToolbar
            embedded
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Tìm tóm tắt, rủi ro hoặc người nộp…"
            searchLabel="Tìm báo cáo tiến độ"
            activeTab={statusFilter}
            onTabChange={(value) => setStatusFilter(value as StatusFilter)}
            tabsLabel="Lọc trạng thái báo cáo"
            tabs={[
              { value: 'ALL', label: 'Tất cả', count: items.length },
              { value: 'SUBMITTED', label: 'Chờ phản hồi', count: reportCounts?.SUBMITTED ?? 0 },
              { value: 'REVIEWED', label: 'Đã nhận xét', count: reportCounts?.REVIEWED ?? 0 },
              { value: 'DRAFT', label: 'Bản nháp', count: reportCounts?.DRAFT ?? 0 },
            ]}
            controls={
              <label className="ft-select-wrap">
                <span className="sr-only">Loại kỳ báo cáo</span>
                <select aria-label="Loại kỳ báo cáo" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)} className="ft-select">
                  <option value="ALL">Tuần &amp; tháng</option>
                  <option value="WEEKLY">Báo cáo tuần</option>
                  <option value="MONTHLY">Báo cáo tháng</option>
                </select>
              </label>
            }
            sort={{
              value: sortBy,
              onChange: (value) => setSortBy(value as SortKey),
              options: [
                { value: 'newest', label: 'Kỳ mới nhất' },
                { value: 'pending-first', label: 'Chờ phản hồi trước' },
                { value: 'oldest', label: 'Kỳ cũ nhất' },
              ],
            }}
            activeChips={activeChips}
            onRemoveChip={(id) => {
              if (id === 'search') setSearch('')
              if (id === 'status') setStatusFilter('ALL')
              if (id === 'type') setTypeFilter('ALL')
            }}
            onClearAll={clearFilters}
            hasActiveFilters={activeChips.length > 0}
            resultSummary={activeChips.length > 0 ? `Hiển thị ${filteredReports.length} / ${items.length} báo cáo` : undefined}
            pagination={reportPager.showPagination ? { page: reportPager.page, pages: reportPager.pages, total: reportPager.total, pageSize: reportPager.pageSize, onPage: reportPager.setPage } : undefined}
          />
        )}

        <ReportList resource={review.reports} filteredItems={filteredReports} pager={reportPager} onClearFilters={clearFilters} hasFilters={activeChips.length > 0} routeBase={routeBase} />
      </section>
    </WorkspacePage>
  )
}

function ResourceCard<T>({ label, resource, render }: { label: string; resource: ProgressReviewResource<T>; render: (data: T) => ReactNode }) {
  return <section className="flex h-full min-w-0 flex-col justify-between workspace-surface p-5"><h3 className="text-sm font-semibold text-ink">{label}</h3>{resource.state === 'loading' ? <p role="status" className="mt-3 text-sm text-ink-muted">Đang tải…</p> : resource.state === 'error' ? <p role="alert" className="mt-3 break-words text-sm text-status-error-text">{resource.message}</p> : <div className="mt-3 break-words text-sm leading-6 text-ink-muted">{render(resource.data)}</div>}</section>
}

function ReportList({ resource, filteredItems, pager, hasFilters, onClearFilters, routeBase }: {
  resource: ProgressReviewResource<{ items: ProgressReport[]; totalCount: number }>
  filteredItems: ProgressReport[]
  pager: ReturnType<typeof useClientPagination<ProgressReport>>
  hasFilters: boolean
  onClearFilters: () => void
  routeBase: string
}) {
  if (resource.state === 'loading') return <p role="status" className="p-5 text-sm text-ink-muted">Đang tải báo cáo tiến độ…</p>
  if (resource.state === 'error') return <p role="alert" className="p-5 text-sm text-status-error-text">{resource.message}</p>
  if (resource.data.items.length === 0) return <p className="p-5 text-sm text-ink-muted">Chưa có báo cáo tiến độ trong phạm vi dữ liệu hiện có.</p>
  if (filteredItems.length === 0 && hasFilters) {
    return (
      <div className="p-6 text-center text-sm text-ink-muted">
        <p>Không tìm thấy báo cáo khớp bộ lọc hiện tại.</p>
        <Button variant="secondary" className="mt-3" onClick={onClearFilters}>Xóa bộ lọc</Button>
      </div>
    )
  }
  return (
    <>
      <ul className="divide-y divide-hairline">
        {pager.paginatedItems.map(report => (
          <li key={report.id} className="p-5 transition-colors hover:bg-canvas/50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <ReportBadge status={report.status} />
                  <span className="rounded-full bg-primary-subtle px-2.5 py-0.5 text-xs font-semibold text-primary">{reportTypeLabel(report.reportType)}</span>
                  <span className="font-mono text-xs text-ink-muted">{formatReportDate(report.periodStart)} – {formatReportDate(report.periodEnd)}</span>
                </div>
                <h3 className="mt-2.5 break-words font-semibold text-ink">{report.summary || 'Chưa có tóm tắt tiến độ.'}</h3>
                <p className="mt-1.5 break-words text-sm leading-6 text-ink-muted"><span className="font-medium text-ink-soft">Khó khăn &amp; rủi ro:</span> {report.issuesAndRisks?.trim() || 'Chưa có nội dung.'}</p>
                <p className="mt-1.5 text-xs text-ink-muted">{report.status === 'DRAFT' ? 'Người tạo' : 'Người nộp'}: <strong className="text-ink-soft">{report.submittedByName}</strong> · {report.submittedAt ? submittedAt(report.submittedAt) : 'Chưa nộp'}</p>
              </div>
              <Link className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to={`${routeBase}/reports/${report.id}`}>{report.status === 'DRAFT' ? 'Xem báo cáo' : 'Đọc và phản hồi'}</Link>
            </div>
          </li>
        ))}
      </ul>
      {pager.showPagination && (
        <div className="border-t border-hairline px-5 py-3">
          <Pagination
            page={pager.page}
            pages={pager.pages}
            total={pager.total}
            pageSize={pager.pageSize}
            onPage={pager.setPage}
            onPageSizeChange={pager.setPageSize}
          />
        </div>
      )}
    </>
  )
}

function countByStatus(items: ProgressReport[]) { return items.reduce<Record<ReportStatus, number>>((counts, report) => ({ ...counts, [report.status]: counts[report.status] + 1 }), { DRAFT: 0, SUBMITTED: 0, REVIEWED: 0 }) }
function submittedAt(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) }
