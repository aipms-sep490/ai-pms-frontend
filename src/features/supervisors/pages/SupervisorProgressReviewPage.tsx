import { Button } from '../../../components/ui/Button'
import { Pagination } from '../../../components/ui/Pagination'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useClientPagination } from '../../../components/ui/useClientPagination'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { ReportBadge } from '../../reports/report-ui'
import { formatReportDate, type ProgressReport, type ReportStatus } from '../../reports/report-types'
import { useSupervisorProgressReview, type ProgressReviewResource } from '../hooks/useSupervisorProgressReview'

export function SupervisorProgressReviewPage() {
  const { project, routeBase } = useExecutionAccess()
  const review = useSupervisorProgressReview(project.id)
  const reportCounts = review.reports.state === 'ready' ? countByStatus(review.reports.data.items) : null
  const attentionTotal = review.attention.state === 'ready'
    ? review.attention.data.overdueTasks.length + review.attention.data.blockedTasks.length
    : null

  return (
    <WorkspacePage
      className="space-y-5"
      title="Theo dõi tiến độ và báo cáo"
      eyebrow={`Giám sát tiến độ · ${project.code}`}
      description="Theo dõi kết quả thực hiện, những việc cần lưu ý và gửi phản hồi cho nhóm."
      backTo={`${routeBase}/workspace`}
      action={<Button variant="secondary" icon="refresh" onClick={review.reload}>Làm mới dữ liệu</Button>}
    >
      <StatTileRow
        tiles={[
          {
            icon: 'trending_up',
            label: 'Tỷ lệ hoàn thành (%)',
            value: review.summary.state === 'ready' ? review.summary.data.progressPercentage : null,
            caption: review.summary.state === 'ready'
              ? `${review.summary.data.doneTasks}/${review.summary.data.totalTasks} công việc hoàn tất`
              : 'Đang tổng hợp dữ liệu tiến độ',
            hero: true,
          },
          {
            icon: 'flag',
            label: 'Mốc đã hoàn thành',
            value: review.summary.state === 'ready' ? review.summary.data.completedMilestones : null,
            tone: 'info',
            caption: review.summary.state === 'ready'
              ? `Trên tổng ${review.summary.data.totalMilestones} mốc kế hoạch`
              : 'Theo dõi lộ trình mốc',
          },
          {
            icon: 'warning',
            label: 'Cảnh báo công việc',
            value: attentionTotal,
            tone: attentionTotal && attentionTotal > 0 ? 'warning' : 'success',
            caption: 'Công việc trễ hạn hoặc đang gặp vướng mắc',
          },
          {
            icon: 'description',
            label: 'Báo cáo tiến độ',
            value: review.reports.state === 'ready' ? review.reports.data.totalCount : null,
            tone: 'neutral',
            caption: reportCounts ? `${reportCounts.SUBMITTED} chờ phản hồi · ${reportCounts.REVIEWED} đã duyệt` : 'Tổng hợp báo cáo theo kỳ',
          },
        ]}
      />

      {/* Bento 2-column layout: Left 4 cols (Chi tiết tổng quan) | Right 8 cols (Danh sách báo cáo có phân trang) */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-start">
        <section className="xl:col-span-4 space-y-4" aria-labelledby="progress-overview">
          <h2 id="progress-overview" className="sr-only">Tổng quan tiến độ</h2>
          <ResourceCard
            label="Tiến độ tổng quan"
            resource={review.summary}
            render={data => (
              <>
                <strong className="text-2xl font-bold tabular-nums text-ink">{data.progressPercentage}%</strong>
                <p className="mt-1.5">{data.doneTasks}/{data.totalTasks} công việc · {data.completedMilestones}/{data.totalMilestones} mốc hoàn thành</p>
              </>
            )}
          />
          <ResourceCard
            label="Công việc cần lưu ý"
            resource={review.attention}
            render={data => (
              <>
                <strong className="text-2xl font-bold tabular-nums text-ink">{data.overdueTasks.length + data.blockedTasks.length}</strong>
                <p className="mt-1.5">{data.overdueTasks.length} quá hạn · {data.blockedTasks.length} vướng mắc</p>
              </>
            )}
          />
          <ResourceCard
            label="Báo cáo theo kỳ"
            resource={review.reports}
            render={data => (
              <>
                <strong className="text-2xl font-bold tabular-nums text-ink">{data.totalCount}</strong>
                <p className="mt-1.5">{reportCounts ? `${reportCounts.SUBMITTED} đã nộp · ${reportCounts.REVIEWED} đã có phản hồi trong trang đang xem` : 'Đang tổng hợp'}</p>
              </>
            )}
          />
        </section>

        <section className="xl:col-span-8 overflow-hidden rounded-xl border border-hairline bg-card shadow-xs" aria-labelledby="progress-report-list">
          <div className="flex flex-col gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 id="progress-report-list" className="text-base font-bold text-ink">Báo cáo tiến độ</h2>
                {review.reports.state === 'ready' && <StatusBadge tone="info" label={`${review.reports.data.totalCount} báo cáo`} />}
              </div>
              <p className="mt-0.5 text-xs text-ink-muted">Mở báo cáo để xem kết quả và gửi nhận xét cho nhóm.</p>
            </div>
            <Link
              className="inline-flex min-h-10 shrink-0 items-center text-xs font-semibold text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              to={`${routeBase}/reports`}
            >
              Mở danh sách có bộ lọc
            </Link>
          </div>
          <ReportList resource={review.reports} routeBase={routeBase} />
        </section>
      </div>
    </WorkspacePage>
  )
}

function ResourceCard<T>({ label, resource, render }: { label: string; resource: ProgressReviewResource<T>; render: (data: T) => ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
      <div className="bg-canvas/70 border-b border-hairline px-5 py-3">
        <h3 className="text-sm font-bold text-ink">{label}</h3>
      </div>
      <div className="p-5">
        {resource.state === 'loading' ? (
          <p role="status" className="text-sm text-ink-muted">Đang tải…</p>
        ) : resource.state === 'error' ? (
          <p role="alert" className="break-words text-sm text-status-error-text">{resource.message}</p>
        ) : (
          <div className="break-words text-sm leading-6 text-ink-muted">{render(resource.data)}</div>
        )}
      </div>
    </section>
  )
}

function ReportList({ resource, routeBase }: { resource: ProgressReviewResource<{ items: ProgressReport[]; totalCount: number }>; routeBase: string }) {
  const items = resource.state === 'ready' ? resource.data.items : []
  const pagination = useClientPagination(items, 8)

  if (resource.state === 'loading') return <p role="status" className="p-5 text-sm text-ink-muted">Đang tải báo cáo tiến độ…</p>
  if (resource.state === 'error') return <p role="alert" className="p-5 text-sm text-status-error-text">{resource.message}</p>
  if (items.length === 0) return <p className="p-5 text-sm text-ink-muted">Chưa có báo cáo tiến độ trong phạm vi dữ liệu hiện có.</p>

  return (
    <div>
      <ul className="divide-y divide-hairline">
        {pagination.paginatedItems.map(report => (
          <li key={report.id} className="p-5 transition-colors hover:bg-canvas/40">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <ReportBadge status={report.status} />
                  <span className="text-xs font-mono text-ink-muted">#{report.id} · {formatReportDate(report.periodStart)} – {formatReportDate(report.periodEnd)}</span>
                </div>
                <h3 className="mt-2.5 break-words font-semibold text-ink">{report.summary || 'Chưa có tóm tắt tiến độ.'}</h3>
                <p className="mt-1.5 break-words text-sm leading-6 text-ink-muted">
                  <span className="font-medium text-ink-soft">Khó khăn & rủi ro:</span> {report.issuesAndRisks?.trim() || 'Chưa có nội dung.'}
                </p>
                <p className="mt-1.5 text-xs text-ink-muted">
                  {report.status === 'DRAFT' ? 'Người tạo' : 'Người nộp'}: {report.submittedByName} · {report.submittedAt ? submittedAt(report.submittedAt) : 'Chưa nộp'}
                </p>
              </div>
              <Link
                className="inline-flex min-h-10 shrink-0 items-center rounded-lg border border-primary/25 bg-primary-subtle px-3.5 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                to={`${routeBase}/reports/${report.id}`}
              >
                {report.status === 'DRAFT' ? 'Xem báo cáo' : 'Đọc và phản hồi'}
              </Link>
            </div>
          </li>
        ))}
      </ul>
      {pagination.showPagination ? (
        <div className="border-t border-hairline px-5 py-3">
          <Pagination
            page={pagination.page}
            pages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
            pageSizeOptions={[8, 16, 30]}
            onPage={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </div>
      ) : null}
    </div>
  )
}

function countByStatus(items: ProgressReport[]) {
  return items.reduce<Record<ReportStatus, number>>((counts, report) => ({ ...counts, [report.status]: counts[report.status] + 1 }), { DRAFT: 0, SUBMITTED: 0, REVIEWED: 0 })
}
function submittedAt(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN')
}
