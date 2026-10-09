import { Button } from '../../../components/ui/Button'
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

  return <WorkspacePage className="space-y-6" title="Theo dõi tiến độ và báo cáo" eyebrow={`Giám sát tiến độ · ${project.code}`} description="Theo dõi kết quả thực hiện, những việc cần lưu ý và gửi phản hồi cho nhóm." backTo={`${routeBase}/workspace`} action={<Button variant="secondary" icon="refresh" onClick={review.reload}>Làm mới dữ liệu</Button>}>


    <section aria-labelledby="progress-overview"><h2 id="progress-overview" className="sr-only">Tổng quan tiến độ</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><ResourceCard label="Tiến độ tổng quan" resource={review.summary} render={data => <><strong className="text-2xl text-slate-900">{data.progressPercentage}%</strong><p className="mt-2">{data.doneTasks}/{data.totalTasks} công việc · {data.completedMilestones}/{data.totalMilestones} mốc hoàn thành</p></>} /><ResourceCard label="Công việc cần lưu ý" resource={review.attention} render={data => <><strong className="text-2xl text-slate-900">{data.overdueTasks.length + data.blockedTasks.length}</strong><p className="mt-2">{data.overdueTasks.length} quá hạn · {data.blockedTasks.length} vướng mắc</p></>} /><ResourceCard label="Báo cáo theo kỳ" resource={review.reports} render={data => <><strong className="text-2xl text-slate-900">{data.totalCount}</strong><p className="mt-2">{reportCounts ? `${reportCounts.SUBMITTED} đã nộp · ${reportCounts.REVIEWED} đã có phản hồi trong trang đang xem` : 'Đang tổng hợp'}</p></>} /></div></section>

    <section className="workspace-surface" aria-labelledby="progress-report-list"><div className="flex flex-col gap-2 border-b border-hairline px-5 py-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="progress-report-list" className="font-bold text-slate-900">Báo cáo tiến độ</h2><p className="mt-1 text-sm text-slate-600">Mở báo cáo để xem kết quả và gửi nhận xét cho nhóm.</p></div><Link className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to={`${routeBase}/reports`}>Mở danh sách có bộ lọc</Link></div><ReportList resource={review.reports} routeBase={routeBase} /></section>
  </WorkspacePage>
}

function ResourceCard<T>({ label, resource, render }: { label: string; resource: ProgressReviewResource<T>; render: (data: T) => ReactNode }) {
  return <section className="min-w-0 workspace-surface p-5"><h3 className="text-sm font-semibold text-slate-900">{label}</h3>{resource.state === 'loading' ? <p role="status" className="mt-3 text-sm text-slate-600">Đang tải…</p> : resource.state === 'error' ? <p role="alert" className="mt-3 break-words text-sm text-status-error-text">{resource.message}</p> : <div className="mt-3 break-words text-sm leading-6 text-slate-600">{render(resource.data)}</div>}</section>
}

function ReportList({ resource, routeBase }: { resource: ProgressReviewResource<{ items: ProgressReport[]; totalCount: number }>; routeBase: string }) {
  if (resource.state === 'loading') return <p role="status" className="p-5 text-sm text-slate-600">Đang tải báo cáo tiến độ…</p>
  if (resource.state === 'error') return <p role="alert" className="p-5 text-sm text-status-error-text">{resource.message}</p>
  if (resource.data.items.length === 0) return <p className="p-5 text-sm text-slate-600">Chưa có báo cáo tiến độ trong phạm vi dữ liệu hiện có.</p>
  return <ul className="divide-y divide-hairline">{resource.data.items.map(report => <li key={report.id} className="p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><ReportBadge status={report.status} /><span className="text-xs text-slate-600">#{report.id} · {formatReportDate(report.periodStart)} – {formatReportDate(report.periodEnd)}</span></div><h3 className="mt-3 break-words font-semibold text-slate-900">{report.summary || 'Chưa có tóm tắt tiến độ.'}</h3><p className="mt-2 break-words text-sm leading-6 text-slate-600"><span className="font-medium text-slate-700">Khó khăn & rủi ro:</span> {report.issuesAndRisks?.trim() || 'Chưa có nội dung.'}</p><p className="mt-2 text-xs text-slate-600">{report.status === 'DRAFT' ? 'Người tạo' : 'Người nộp'}: {report.submittedByName} · {report.submittedAt ? submittedAt(report.submittedAt) : 'Chưa nộp'}</p></div><Link className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to={`${routeBase}/reports/${report.id}`}>{report.status === 'DRAFT' ? 'Xem báo cáo' : 'Đọc và phản hồi'}</Link></div></li>)}</ul>
}

function countByStatus(items: ProgressReport[]) { return items.reduce<Record<ReportStatus, number>>((counts, report) => ({ ...counts, [report.status]: counts[report.status] + 1 }), { DRAFT: 0, SUBMITTED: 0, REVIEWED: 0 }) }
function submittedAt(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN') }
