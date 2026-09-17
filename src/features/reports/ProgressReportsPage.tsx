import { reportError } from './report-errors'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import * as api from '../../services/api/progress-reports.api'
import type { PagedResult } from '../../types/backend'
import { formatReportDate, reportStatusLabels, reportTypeLabels, type ProgressReport, type ReportStatus, type ReportType } from './report-types'
import { ReportBadge, ReportError, ReportLoading, ReportShell } from './report-ui'

export function ProgressReportsPage() {
  const { project, actor, routeBase } = useExecutionAccess()
  return <ReportList key={project.id} projectId={project.id} projectTitle={project.title} actor={actor} routeBase={routeBase} />
}

function ReportList({ projectId, projectTitle, actor, routeBase }: { projectId: number; projectTitle: string; actor: string; routeBase: string }) {
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

  return <ReportShell title="Báo cáo tiến độ" projectTitle={projectTitle} backTo={`${routeBase}/workspace`}
    description={actor === 'student' ? 'Ghi lại kết quả, lên kế hoạch tiếp theo và trao đổi với giảng viên hướng dẫn.' : 'Theo dõi kết quả từng kỳ và gửi nhận xét để nhóm triển khai bước tiếp theo.'}
    action={actor === 'student' && <Link className="report-button" to={`${routeBase}/reports/new`}>+ Tạo báo cáo</Link>}>
    <ol className="report-steps" aria-label="Quy trình báo cáo">
      <li><span>01</span><div><strong>Soạn bản nháp</strong><small>Các thành viên cùng chuẩn bị</small></div></li>
      <li><span>02</span><div><strong>Trưởng nhóm nộp</strong><small>Nội dung được khóa sau khi nộp</small></div></li>
      <li><span>03</span><div><strong>GVHD nhận xét</strong><small>Cả nhóm xem phản hồi tại đây</small></div></li>
    </ol>
    <section className="report-panel" aria-label="Danh sách báo cáo">
      <div className="report-toolbar">
        <div className="report-filters">
          <label>Trạng thái<select value={status ?? ''} onChange={(event) => filter('status', event.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(reportStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>Loại báo cáo<select value={reportType ?? ''} onChange={(event) => filter('reportType', event.target.value)}><option value="">Tuần & tháng</option>{Object.entries(reportTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        </div>
        <button className="report-button report-button--secondary" type="button" disabled={loading} onClick={() => setRevision((value) => value + 1)}>Làm mới</button>
      </div>
      {loading ? <ReportLoading /> : error ? <ReportError message={error} retry={() => setRevision((value) => value + 1)} /> : data && <>
        <div className="report-list-heading"><h2>Lịch sử báo cáo</h2><span>{data.totalCount} báo cáo{status || reportType ? ' phù hợp' : ''}</span></div>
        {data.items.length === 0 ? <div className="report-empty"><span className="material-symbols-outlined" aria-hidden="true">description</span><h3>{status || reportType ? 'Chưa có báo cáo phù hợp' : 'Bắt đầu kỳ báo cáo đầu tiên'}</h3><p>{status || reportType ? 'Thử thay đổi bộ lọc để xem những báo cáo khác.' : 'Kết quả và phản hồi của từng kỳ sẽ được lưu lại tại đây.'}</p>{page > 1 && <button className="report-button report-button--secondary" onClick={() => filter('page', '1')}>Về trang đầu</button>}</div> : <ul className="report-list">
          {data.items.map((report) => <li key={report.id}><Link to={`${routeBase}/reports/${report.id}`} className="report-row">
            <div className="report-row-icon" aria-hidden="true"><span className="material-symbols-outlined">article</span></div>
            <div className="report-row-main"><div className="report-row-meta"><span>{reportTypeLabels[report.reportType]}</span><span>#{report.id}</span></div><h3>{formatReportDate(report.periodStart)} – {formatReportDate(report.periodEnd)}</h3><p>{report.summary}</p><small>{report.status === 'DRAFT' ? 'Người tạo' : 'Người nộp'}: {report.submittedByName}</small></div>
            <div className="report-row-state"><ReportBadge status={report.status} />{report.isLate === true && <small className="report-late">Nộp trễ hạn</small>}<span className="report-open">Xem báo cáo →</span></div>
          </Link></li>)}
        </ul>}
        <nav className="report-pagination" aria-label="Phân trang báo cáo"><span>Trang {page} / {Math.max(1, data.totalPages)}</span><div><button className="report-button report-button--secondary" disabled={page <= 1} onClick={() => filter('page', String(page - 1))}>Trang trước</button><button className="report-button report-button--secondary" disabled={page >= data.totalPages} onClick={() => filter('page', String(page + 1))}>Trang sau</button></div></nav>
      </>}
    </section>
  </ReportShell>
}
