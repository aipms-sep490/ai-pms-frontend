import { reportError } from './report-errors'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FilterToolbar } from '../../components/ui/FilterToolbar'
import type { FilterChipItem } from '../../components/ui/FilterChips'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import * as api from '../../services/api/progress-reports.api'
import type { PagedResult } from '../../types/backend'
import { formatReportDate, reportStatusLabels, reportTypeLabels, type ProgressReport, type ReportStatus, type ReportType } from './report-types'
import { ReportBadge, ReportError, ReportLoading, ReportShell } from './report-ui'
import { utcTimestamp } from '../projects/utils/collaboration-workspace'

type ReportSort = 'newest' | 'oldest'

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

  const [search, setSearch] = useState('')
  const [lateOnly, setLateOnly] = useState(false)
  const [sortBy, setSortBy] = useState<ReportSort>('newest')
  const [data, setData] = useState<PagedResult<ProgressReport> | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    api.getProgressReports(projectId, { status, reportType, page, pageSize: 10 }, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setData(result) })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reportError(reason)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [projectId, status, reportType, page, revision])

  function filter(key: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      if (value) next.set(key, value)
      else next.delete(key)
      if (key !== 'page') next.delete('page')
      return next
    })
  }

  function clearAll() {
    setSearch('')
    setLateOnly(false)
    setSortBy('newest')
    setParams({})
  }

  const visibleItems = useMemo(() => {
    const list = data?.items ?? []
    const needle = search.trim().toLowerCase()
    const filtered = list.filter((report) => {
      if (lateOnly && report.isLate !== true) return false
      if (!needle) return true
      const periodText = `${formatReportDate(report.periodStart)} – ${formatReportDate(report.periodEnd)}`.toLowerCase()
      return (
        report.summary.toLowerCase().includes(needle) ||
        report.submittedByName.toLowerCase().includes(needle) ||
        periodText.includes(needle)
      )
    })
    return [...filtered].sort((a, b) =>
      sortBy === 'oldest'
        ? utcTimestamp(a.periodStart) - utcTimestamp(b.periodStart)
        : utcTimestamp(b.periodStart) - utcTimestamp(a.periodStart),
    )
  }, [data, search, lateOnly, sortBy])

  const activeChips = useMemo<FilterChipItem[]>(() => {
    const chips: FilterChipItem[] = []
    if (status) chips.push({ id: 'status', label: 'Trạng thái', value: reportStatusLabels[status] })
    if (reportType) chips.push({ id: 'reportType', label: 'Loại', value: reportTypeLabels[reportType] })
    if (search.trim()) chips.push({ id: 'search', label: 'Từ khóa', value: search.trim() })
    if (lateOnly) chips.push({ id: 'lateOnly', label: 'Nộp hạn', value: 'Chỉ nộp trễ hạn' })
    return chips
  }, [status, reportType, search, lateOnly])

  const hasActiveFilters = activeChips.length > 0 || sortBy !== 'newest'

  return (
    <ReportShell
      title="Báo cáo tiến độ"
      projectTitle={projectTitle}
      backTo={actor === 'student' ? undefined : `${routeBase}/workspace`}
      description={actor === 'student' ? 'Ghi lại kết quả, lên kế hoạch tiếp theo và trao đổi với giảng viên hướng dẫn.' : 'Theo dõi kết quả từng kỳ và gửi nhận xét để nhóm triển khai bước tiếp theo.'}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <button className="report-button report-button--secondary" type="button" disabled={loading} onClick={() => setRevision((value) => value + 1)}>
            Làm mới
          </button>
          {canCreate && <Link className="report-button" to={`${routeBase}/reports/new`}>+ Tạo báo cáo</Link>}
        </div>
      }
    >
      <section className="report-panel" aria-label="Danh sách báo cáo">
        <FilterToolbar
          embedded
          tabs={[
            { value: '', label: 'Tất cả' },
            ...Object.entries(reportStatusLabels).map(([key, label]) => ({ value: key, label })),
          ]}
          activeTab={status ?? ''}
          onTabChange={(val) => filter('status', val)}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm theo tóm tắt, kỳ báo cáo hoặc người nộp…"
          controls={
            <>
              <select aria-label="Loại báo cáo" value={reportType ?? ''} onChange={(event) => filter('reportType', event.target.value)}>
                <option value="">Tuần & tháng</option>
                {Object.entries(reportTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
              <button
                type="button"
                className={`ft-btn ${lateOnly ? 'is-active' : ''}`}
                aria-pressed={lateOnly}
                onClick={() => setLateOnly(prev => !prev)}
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">schedule</span>
                <span>Nộp trễ</span>
              </button>
            </>
          }
          sort={{
            value: sortBy,
            onChange: (val) => setSortBy(val as ReportSort),
            options: [
              { value: 'newest', label: 'Kỳ mới nhất' },
              { value: 'oldest', label: 'Kỳ cũ nhất' },
            ],
          }}
          activeChips={activeChips}
          onRemoveChip={(id) => {
            if (id === 'search') setSearch('')
            else if (id === 'lateOnly') setLateOnly(false)
            else filter(id, '')
          }}
          hasActiveFilters={hasActiveFilters}
          onClearAll={clearAll}
          resultSummary={data ? `${visibleItems.length} / ${data.totalCount} báo cáo` : undefined}
        />

        {loading ? (
          <ReportLoading />
        ) : error ? (
          <ReportError message={error} retry={() => setRevision((value) => value + 1)} />
        ) : data && (
          <>
            <div className="report-list-heading"><h2>Lịch sử báo cáo</h2><span>{data.totalCount} báo cáo{hasActiveFilters ? ' phù hợp' : ''}</span></div>
            {visibleItems.length === 0 ? (
              <div className="report-empty">
                <span className="material-symbols-outlined" aria-hidden="true">description</span>
                <h3>{hasActiveFilters ? 'Chưa có báo cáo phù hợp' : 'Bắt đầu kỳ báo cáo đầu tiên'}</h3>
                <p>{hasActiveFilters ? 'Thử thay đổi bộ lọc để xem những báo cáo khác.' : 'Kết quả và phản hồi của từng kỳ sẽ được lưu lại tại đây.'}</p>
                {hasActiveFilters && <button type="button" className="report-button report-button--secondary mt-3" onClick={clearAll}>Xóa bộ lọc</button>}
                {page > 1 && <button type="button" className="report-button report-button--secondary mt-3" onClick={() => filter('page', '1')}>Về trang đầu</button>}
              </div>
            ) : (
              <ul className="report-list">
                {visibleItems.map((report) => (
                  <li key={report.id}>
                    <Link to={`${routeBase}/reports/${report.id}`} className="report-row">
                      <div className="report-row-icon" aria-hidden="true"><span className="material-symbols-outlined">article</span></div>
                      <div className="report-row-main">
                        <div className="report-row-meta"><span className="workspace-kicker">{reportTypeLabels[report.reportType]}</span></div>
                        <h3>{formatReportDate(report.periodStart)} – {formatReportDate(report.periodEnd)}</h3>
                        <p>{report.summary}</p>
                        <small>{report.status === 'DRAFT' ? 'Người tạo' : 'Người nộp'}: {report.submittedByName}</small>
                      </div>
                      <div className="report-row-state">
                        <ReportBadge status={report.status} />
                        {report.isLate === true && <small className="report-late">Nộp trễ hạn</small>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <nav className="report-pagination" aria-label="Phân trang báo cáo">
              <span>Trang {page} / {Math.max(1, data.totalPages)}</span>
              <div>
                <button type="button" className="report-button report-button--secondary" disabled={page <= 1} onClick={() => filter('page', String(page - 1))}>Trang trước</button>
                <button type="button" className="report-button report-button--secondary" disabled={page >= data.totalPages} onClick={() => filter('page', String(page + 1))}>Trang sau</button>
              </div>
            </nav>
          </>
        )}
      </section>
    </ReportShell>
  )
}
