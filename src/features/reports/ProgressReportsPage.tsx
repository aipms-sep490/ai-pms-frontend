import { reportError } from './report-errors'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import * as api from '../../services/api/progress-reports.api'
import type { PagedResult } from '../../types/backend'
import { formatReportDate, reportStatusLabels, reportTypeLabels, type ProgressReport, type ReportStatus, type ReportType } from './report-types'
import { ReportBadge, ReportError, ReportLoading, ReportShell } from './report-ui'
import { Pagination, StatTileRow } from '../../components/ui'

export function ProgressReportsPage() {
  const { project, actor, routeBase, executionCapabilities } = useExecutionAccess()
  const canCreate = actor === 'student' && executionCapabilities?.get('create_progress_report').allowed === true
  return <ReportList key={project.id} projectId={project.id} projectTitle={project.title} actor={actor} routeBase={routeBase} canCreate={canCreate} />
}

function ReportList({ projectId, projectTitle, actor, routeBase, canCreate }: { projectId: number; projectTitle: string; actor: string; routeBase: string; canCreate: boolean }) {
  const [params, setParams] = useSearchParams()
  const rawStatus = params.get('status') ?? ''
  const rawType = params.get('reportType') ?? ''
  const status = Object.hasOwn(reportStatusLabels, rawStatus) ? rawStatus as ReportStatus : undefined
  const reportType = Object.hasOwn(reportTypeLabels, rawType) ? rawType as ReportType : undefined
  const rawPage = Number(params.get('page') ?? 1)
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1
  const [data, setData] = useState<PagedResult<ProgressReport> | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    api.getProgressReports(projectId, { status, reportType, page, pageSize: 10 }, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setData(result) })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reportError(reason)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [projectId, status, reportType, page, revision])

  function filter(key: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      if (value) next.set(key, value); else next.delete(key)
      if (key !== 'page') next.delete('page')
      return next
    })
  }

  const items = data?.items ?? []
  const submittedCount = data ? items.filter((item) => item.status === 'SUBMITTED').length : null
  const reviewedCount = data ? items.filter((item) => item.status === 'REVIEWED').length : null
  const draftCount = data ? items.filter((item) => item.status === 'DRAFT').length : null

  return <ReportShell title="Báo cáo tiến độ" projectTitle={projectTitle} backTo={`${routeBase}/workspace`}
    description={actor === 'student' ? 'Ghi lại kết quả, lên kế hoạch tiếp theo và trao đổi với giảng viên hướng dẫn.' : 'Theo dõi kết quả từng kỳ và gửi nhận xét để nhóm triển khai bước tiếp theo.'}
    action={canCreate && <Link className="report-button" to={`${routeBase}/reports/new`}>+ Tạo báo cáo</Link>}>
    <div className="mb-5">
      <StatTileRow
        tiles={[
          { icon: 'description', label: 'Tổng báo cáo', value: data ? data.totalCount : null, caption: 'Theo bộ lọc hiện tại của đồ án', hero: true },
          { icon: 'send', label: 'Đã nộp', value: submittedCount, caption: 'Đang chờ GVHD nhận xét trên trang này', tone: 'warning' },
          { icon: 'fact_check', label: 'Đã nhận xét', value: reviewedCount, caption: 'GVHD đã phản hồi trên trang này', tone: 'success' },
          { icon: 'edit_document', label: 'Bản nháp', value: draftCount, caption: 'Đang hoàn thiện trên trang này', tone: 'neutral' },
        ]}
      />
    </div>
    <ol className="report-steps mb-5" aria-label="Quy trình báo cáo">
      <li><span>01</span><div><strong>Soạn bản nháp</strong><small>Các thành viên cùng chuẩn bị</small></div></li>
      <li><span>02</span><div><strong>Trưởng nhóm nộp</strong><small>Nội dung được khóa sau khi nộp</small></div></li>
      <li><span>03</span><div><strong>GVHD nhận xét</strong><small>Cả nhóm xem phản hồi tại đây</small></div></li>
    </ol>
    <section className="report-panel" aria-label="Danh sách báo cáo">
      <div className="report-toolbar bg-canvas/70 border-b border-hairline px-5 py-3.5">
        <div className="report-filters flex-1">
          <label>Trạng thái<select value={status ?? ''} onChange={(event) => filter('status', event.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(reportStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>Loại báo cáo<select value={reportType ?? ''} onChange={(event) => filter('reportType', event.target.value)}><option value="">Tuần & tháng</option>{Object.entries(reportTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          {(status || reportType) && <button className="report-button report-button--secondary" type="button" onClick={() => setParams({})}>Xóa bộ lọc</button>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="report-button report-button--secondary" type="button" disabled={loading} onClick={() => setRevision((value) => value + 1)}>Làm mới</button>
        </div>
      </div>
      {loading ? <ReportLoading /> : error ? <ReportError message={error} retry={() => setRevision((value) => value + 1)} /> : data && <>
        <div className="report-list-heading bg-canvas/50 border-b border-hairline px-5 py-3">
          <div className="flex items-center gap-2">
            <h2>Lịch sử báo cáo</h2>
            <span className="rounded-full border border-hairline bg-card px-2 py-0.5 text-xs font-semibold text-ink-soft tabular-nums">{data.totalCount}</span>
          </div>
          <span>{data.totalCount} báo cáo{status || reportType ? ' phù hợp' : ''}</span>
        </div>
        {data.items.length === 0 ? <div className="report-empty"><span className="material-symbols-outlined" aria-hidden="true">description</span><h3>{status || reportType ? 'Chưa có báo cáo phù hợp' : 'Bắt đầu kỳ báo cáo đầu tiên'}</h3><p>{status || reportType ? 'Thử thay đổi bộ lọc để xem những báo cáo khác.' : 'Kết quả và phản hồi của từng kỳ sẽ được lưu lại tại đây.'}</p>{page > 1 && <button type="button" className="report-button report-button--secondary" onClick={() => filter('page', '1')}>Về trang đầu</button>}</div> : <ul className="report-list">
          {data.items.map((report) => <li key={report.id}><Link to={`${routeBase}/reports/${report.id}`} className="report-row">
            <div className="report-row-icon" aria-hidden="true"><span className="material-symbols-outlined">article</span></div>
            <div className="report-row-main">
              <div className="report-row-meta">
                <span className="workspace-kicker">{reportTypeLabels[report.reportType]}</span>
                <span>#{report.id}</span>
                <span className="text-xs font-normal text-ink-muted">· {report.status === 'DRAFT' ? 'Người tạo' : 'Người nộp'}: {report.submittedByName}</span>
              </div>
              <h3>{formatReportDate(report.periodStart)} – {formatReportDate(report.periodEnd)}</h3>
              <p>{report.summary}</p>
            </div>
            <div className="report-row-state"><ReportBadge status={report.status} />{report.isLate === true && <small className="report-late">Nộp trễ hạn</small>}</div>
          </Link></li>)}
        </ul>}
        {data.totalPages > 1 && (
          <div className="border-t border-hairline bg-canvas/50 px-5 py-3.5">
            <Pagination
              page={page}
              pages={data.totalPages}
              total={data.totalCount}
              pageSize={10}
              onPage={(nextPage) => filter('page', String(nextPage))}
            />
          </div>
        )}
      </>}
    </section>
  </ReportShell>
}
