import { Button } from '../../../components/ui/Button'
import { displayLabel } from '../../../components/ui/display-label'
import { FilterToolbar } from '../../../components/ui/FilterToolbar'
import { Pagination } from '../../../components/ui/Pagination'
import { humanizeWorkflowReason } from '../../../components/ui/workflow-action-gate'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { HealthPulseBadge } from '../../../components/ui/HealthPulseBadge'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { projectStatusLabel } from '../../projects/utils/project-status'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { getWorkspaceRole } from '../../auth/utils/role-access'
import { HttpError } from '../../../services/http/http-client'
import { exportPortfolio, exportPortfolioCsv, type PortfolioExportFormat, getPortfolioDashboard, type DashboardFilter, type DashboardProject, type PortfolioDashboard } from '../api/dashboard-api'
import { archiveProject } from '../../projects/api/archive-project'
import { getReviewActions } from '../../projects/api/project-review-api'
import { exportDepartmentResultsReconciliation } from '../../../services/api/project-results.api'
import { env } from '../../../app/config/env'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { departmentError } from '../../department/hooks/useDepartmentSection'
import { PageLoading } from '../../../components/ui/PageLoading'
import { DepartmentExecutiveBriefPanel } from '../../ai-suite/DepartmentExecutiveBriefPanel'

const statuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUIRED', 'REJECTED', 'APPROVED', 'SUPERVISOR_PENDING', 'ACTIVE', 'FINAL_SUBMISSION', 'COMPLETED', 'ARCHIVED']
type SortKey = 'default' | 'risk' | 'progress-asc' | 'title'
const riskRank: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }

export function PortfolioDashboardPage() {
  const { session } = useAuthSession()
  const role = getWorkspaceRole(session?.user)
  const scope = role === 'admin' ? 'admin' : 'department'
  const [filter, setFilter] = useState<DashboardFilter>({ page: 1, pageSize: 10 })
  const [riskFilter, setRiskFilter] = useState<string>('ALL')
  const [supervisorFilter, setSupervisorFilter] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<SortKey>('default')
  const [data, setData] = useState<PortfolioDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<PortfolioExportFormat>('csv')
  const [exportingResults, setExportingResults] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<DashboardProject | null>(null)
  const [archiveReason, setArchiveReason] = useState('')
  const [archivingId, setArchivingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const version = useRef(0), archiveLock = useRef(false), exportLock = useRef(false)
  const { confirmationDialog } = useActionConfirmation()

  const load = useCallback(async () => {
    const current = ++version.current
    setLoading(true); setData(null); setError(null)
    try { const result = await getPortfolioDashboard(scope, filter); if (current === version.current) setData(result) }
    catch (reason) { if (current === version.current) setError(departmentError(reason).message) }
    finally { if (current === version.current) setLoading(false) }
  }, [scope, filter])
  useEffect(() => { const requestVersion = version; void load(); return () => { requestVersion.current++ } }, [load])

  const handleSearchChange = useCallback((value: string) => {
    const trimmed = value.trim() || undefined
    setFilter((current) => {
      if (current.search === trimmed) return current
      const next: DashboardFilter = { ...current, page: 1 }
      if (trimmed) next.search = trimmed
      else delete next.search
      return next
    })
  }, [])

  const handleStatusChange = useCallback((status: string) => {
    setFilter((current) => {
      const next: DashboardFilter = { ...current, page: 1 }
      if (status) next.status = status
      else delete next.status
      return next
    })
  }, [])

  const download = async () => {
    if (exportLock.current) return
    exportLock.current = true
    setExporting(true); setNotice(null)
    try {
      const blob = exportFormat === 'csv' ? await exportPortfolioCsv(filter) : await exportPortfolio(filter, exportFormat)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `aipms-portfolio-${new Date().toISOString().slice(0, 10)}.${exportFormat}`
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      setError(null); setNotice(`Đã tạo tệp ${exportFormat.toUpperCase()} theo bộ lọc hiện tại.`)
    } catch (reason) {
      setError(reason instanceof HttpError && reason.status === 422 ? 'Danh sách xuất vượt giới hạn 10.000 đồ án. Hãy thu hẹp bộ lọc.' : departmentError(reason).message)
    } finally { exportLock.current = false; setExporting(false) }
  }

  const downloadResultsReconciliation = async (format: 'xlsx' | 'csv') => {
    if (exportingResults) return
    setExportingResults(true); setNotice(null); setError(null)
    try {
      const blob = await exportDepartmentResultsReconciliation({
        semesterId: filter.semesterId,
        majorId: filter.majorId,
        format,
        search: filter.search,
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `department-results-reconciliation.${format}`
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      setNotice(`Đã xuất bảng đối soát điểm toàn Khoa (.${format}) theo bộ lọc hiện tại.`)
    } catch (reason) {
      setError(departmentError(reason).message)
    } finally {
      setExportingResults(false)
    }
  }

  /** Lazily checks backend archive workflow action on click instead of firing N+1 requests on page mount. */
  const archive = async (project: DashboardProject) => {
    if (archiveLock.current || !session?.accessToken) return
    archiveLock.current = true
    const current = version.current
    setArchivingId(project.id); setNotice(null); setError(null)
    try {
      const actionsResult = await getReviewActions(project.id, session.accessToken)
      if (current !== version.current) return
      const archiveAction = actionsResult.actions.find(item => item.code === 'archive_project')
      if (!archiveAction?.allowed) {
        setError(archiveAction?.reasons?.length
          ? `Chưa thể lưu trữ ${project.code}: ${archiveAction.reasons.map(humanizeWorkflowReason).join(' ')}`
          : `Hệ thống không cho phép lưu trữ ${project.code} ở trạng thái hiện tại.`)
        return
      }
      setArchiveReason('')
      setArchiveTarget(project)
    } catch (reason) {
      setError(departmentError(reason).message)
    } finally { archiveLock.current = false; setArchivingId(null) }
  }

  const confirmArchive = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!archiveTarget || archiveLock.current) return
    archiveLock.current = true
    const target = archiveTarget
    setArchivingId(target.id); setNotice(null); setError(null)
    try {
      await archiveProject(target.id, archiveReason.trim() || null)
      setArchiveTarget(null)
      setArchiveReason('')
      await load()
      setNotice(`Đã lưu trữ đồ án ${target.code}; danh sách đã được tải lại từ hệ thống.`)
    } catch (reason) {
      setArchiveTarget(null)
      if (reason instanceof HttpError && reason.status === 409) {
        await load()
        const problemData = reason.problem as { blockingRequirements?: Array<{ message?: string; code?: string }> } | undefined
        const blockers = problemData?.blockingRequirements?.map(b => b.message || displayLabel(b.code)).filter(Boolean)
        setError(blockers?.length
          ? `Không thể lưu trữ ${target.code}: ${blockers.join(' · ')}`
          : 'Đồ án đã thay đổi hoặc chưa đáp ứng đủ điều kiện đóng lưu trữ. Danh sách đã được tải lại.')
      } else {
        setError(departmentError(reason).message)
      }
    } finally { archiveLock.current = false; setArchivingId(null) }
  }

  const supervisorOptions = useMemo(() => {
    const names = new Set<string>()
    for (const s of data?.summary.supervisors ?? []) {
      if (s.name) names.add(s.name)
    }
    for (const p of data?.projects.items ?? []) {
      if (p.supervisor?.name) names.add(p.supervisor.name)
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'vi'))
  }, [data?.projects.items, data?.summary.supervisors])

  const visibleProjects = useMemo(() => {
    const raw = data?.projects.items ?? []
    const list = raw.filter((project) => {
      if (riskFilter !== 'ALL' && (project.analysis?.riskLevel ?? 'NONE') !== riskFilter) return false
      if (supervisorFilter === 'UNASSIGNED' && project.supervisor?.name) return false
      if (supervisorFilter !== 'ALL' && supervisorFilter !== 'UNASSIGNED' && project.supervisor?.name !== supervisorFilter) return false
      return true
    })
    if (sortBy === 'risk') {
      return [...list].sort((a, b) => (riskRank[b.analysis?.riskLevel ?? ''] ?? 0) - (riskRank[a.analysis?.riskLevel ?? ''] ?? 0))
    }
    if (sortBy === 'progress-asc') {
      return [...list].sort((a, b) => (a.analysis?.progressSummary?.progressPercentage ?? 101) - (b.analysis?.progressSummary?.progressPercentage ?? 101))
    }
    if (sortBy === 'title') {
      return [...list].sort((a, b) => a.title.localeCompare(b.title, 'vi'))
    }
    return list
  }, [data?.projects.items, riskFilter, sortBy, supervisorFilter])

  const activeCount = data?.summary.projectStates.find(item => item.status === 'ACTIVE')?.count ?? 0
  const completedCount = data?.summary.projectStates.find(item => item.status === 'COMPLETED')?.count ?? 0
  const attentionRisks = useMemo(() => data?.summary.riskLevels.filter(item => item.status !== 'LOW').reduce((total, item) => total + item.count, 0) ?? 0, [data])

  const activeChips = [
    ...(filter.search ? [{ id: 'search', label: 'Từ khóa', value: filter.search }] : []),
    ...(filter.status ? [{ id: 'status', label: 'Trạng thái', value: projectStatusLabel(filter.status) }] : []),
    ...(filter.majorId ? [{ id: 'major', label: 'Ngành', value: data?.summary.majors.find(m => m.majorId === filter.majorId)?.code ?? 'Ngành đã chọn' }] : []),
    ...(riskFilter !== 'ALL' ? [{ id: 'risk', label: 'Rủi ro', value: displayLabel(riskFilter) }] : []),
    ...(supervisorFilter !== 'ALL' ? [{ id: 'supervisor', label: 'GVHD', value: supervisorFilter === 'UNASSIGNED' ? 'Chưa có GVHD' : supervisorFilter }] : []),
  ]

  function clearFilters() {
    setFilter({ page: 1, pageSize: 10 })
    setRiskFilter('ALL')
    setSupervisorFilter('ALL')
    setSortBy('default')
  }

  return (
    <WorkspacePage
      size="wide"
      className="space-y-6 pb-12"
      title="Danh mục đồ án"
      eyebrow={scope === 'admin' ? 'Tổng quan nền tảng' : 'Phạm vi bộ môn'}
      description="Theo dõi trạng thái, mức rủi ro và tiến độ các đồ án trong phạm vi được cấp."
      action={
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon="refresh"
            aria-label="Tải lại"
            disabled={loading}
            onClick={() => void load()}
          />
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink-soft">
            Định dạng xuất
            <select aria-label="Định dạng xuất" className="min-h-9 rounded-lg border border-hairline bg-card px-2.5 font-normal text-ink" value={exportFormat} disabled={exporting} onChange={event => setExportFormat(event.target.value as PortfolioExportFormat)}>
              <option value="csv">CSV</option>
              <option value="xlsx">Excel</option>
              <option value="pdf">PDF</option>
            </select>
          </label>
          <Button size="sm" icon="download" disabled={exporting || loading || !data} onClick={() => void download()}>
            {exporting ? 'Đang xuất…' : `Xuất ${exportFormat.toUpperCase()}`}
          </Button>
          {scope === 'department' && (
            <Button size="sm" variant="secondary" icon="table_view" disabled={exportingResults || loading || !data} onClick={() => void downloadResultsReconciliation(exportFormat === 'csv' ? 'csv' : 'xlsx')}>
              {exportingResults ? 'Đang xuất điểm…' : `Đối soát điểm (${exportFormat === 'csv' ? 'CSV' : 'XLSX'})`}
            </Button>
          )}
        </div>
      }
    >
      {confirmationDialog}
      {archiveTarget && (
        <form
          role="dialog"
          aria-modal="true"
          aria-label={`Xác nhận đưa vào Kho lưu trữ: ${archiveTarget.code}`}
          onSubmit={(e) => void confirmArchive(e)}
          className="rounded-xl border border-status-warning-border bg-status-warning-bg p-5 space-y-3 shadow-xs"
        >
          <h2 className="font-heading text-base font-semibold text-status-warning-text">Xác nhận đưa vào Kho lưu trữ: {archiveTarget.code}</h2>
          <p className="text-sm text-status-warning-text">
            {archiveTarget.title}. Sau khi lưu trữ, toàn bộ hồ sơ, minh chứng và bảng điểm sẽ chuyển sang chỉ đọc.
          </p>
          <label className="block text-sm font-medium text-ink">
            Ghi chú đóng lưu trữ (tùy chọn)
            <textarea
              maxLength={1000}
              rows={2}
              value={archiveReason}
              disabled={archivingId !== null}
              onChange={e => setArchiveReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-hairline bg-card p-2.5 text-sm text-ink"
              placeholder="Ví dụ: Đã hoàn tất công bố điểm và đóng đợt phúc khảo HK Fall 2026."
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={archivingId !== null} onClick={() => { setArchiveTarget(null); setArchiveReason('') }}>Hủy</Button>
            <Button type="submit" disabled={archivingId !== null}>{archivingId !== null ? 'Đang lưu trữ…' : 'Xác nhận lưu trữ'}</Button>
          </div>
        </form>
      )}
      {error && <div role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><p className="font-semibold">Không thể hoàn tất thao tác</p><p className="mt-1">{error}</p><button type="button" className="mt-2 min-h-11 font-semibold underline underline-offset-4" onClick={() => void load()}>Tải lại dữ liệu</button></div>}
      {notice && (
        <p role="status" className="flex items-start gap-2.5 rounded-lg border border-hairline border-l-4 border-l-status-success-text bg-card p-3.5 text-sm text-ink shadow-2xs">
          <span className="material-symbols-outlined mt-0.5 shrink-0 text-[18px] text-status-success-text" aria-hidden="true">check_circle</span>
          <span>{notice}</span>
        </p>
      )}
      {!loading && data && <>
        {scope !== 'admin' && <DepartmentExecutiveBriefPanel />}
        <section aria-label="Tóm tắt danh mục đồ án">
          <StatTileRow
            tiles={[
              { icon: 'folder_managed', label: 'Tổng đồ án', value: data.summary.totalProjects, hero: true },
              { icon: 'play_circle', label: 'Đang thực hiện', value: activeCount, tone: activeCount > 0 ? 'success' : 'neutral' },
              { icon: 'verified', label: 'Đã hoàn thành', value: completedCount },
              ...(env.aiAdvisoryEnabled ? [{ icon: 'warning', label: 'Cần chú ý theo rủi ro', value: attentionRisks, tone: (attentionRisks > 0 ? 'warning' : 'neutral') as 'warning' | 'neutral' }] : []),
            ]}
          />
        </section>
        <section className={`grid items-stretch gap-4 ${env.aiAdvisoryEnabled ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          <SummaryCard title="Theo trạng thái" items={data.summary.projectStates.map(item => ({ key: item.status, label: `${projectStatusLabel(item.status)}: ${item.count}`, active: filter.status === item.status, onClick: () => handleStatusChange(filter.status === item.status ? '' : item.status) }))} />
          {env.aiAdvisoryEnabled && <SummaryCard title="Theo rủi ro" items={data.summary.riskLevels.map(item => ({ key: item.status, label: `${displayLabel(item.status)}: ${item.count}`, active: riskFilter === item.status, onClick: () => setRiskFilter(riskFilter === item.status ? 'ALL' : item.status) }))} />}
          <SummaryCard title="Theo chuyên ngành" items={data.summary.majors.map(item => ({ key: String(item.majorId), label: `${item.code}: ${item.projectCount}`, active: filter.majorId === item.majorId, onClick: () => setFilter(c => ({ ...c, majorId: c.majorId === item.majorId ? undefined : item.majorId, page: 1 })) }))} />
        </section>
      </>}

      <FilterToolbar
        className="ft-bar--compact ft-bar--dense"
        search={filter.search ?? ''}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Tìm mã, tên đồ án…"
        searchLabel="Tìm đồ án"
        controls={
          <>
            <label className="ft-select-wrap" htmlFor="portfolio-status">
              <span className="sr-only">Trạng thái</span>
              <select id="portfolio-status" aria-label="Trạng thái" className="ft-select" value={filter.status ?? ''} onChange={event => handleStatusChange(event.target.value)}>
                <option value="">Mọi trạng thái</option>
                {statuses.map(status => <option key={status} value={status}>{projectStatusLabel(status)}</option>)}
              </select>
            </label>
            {env.aiAdvisoryEnabled && (
              <label className="ft-select-wrap">
                <span className="sr-only">Mức rủi ro</span>
                <select aria-label="Mức rủi ro" className="ft-select" value={riskFilter} onChange={e => setRiskFilter(e.target.value)}>
                  <option value="ALL">Mọi mức rủi ro</option>
                  <option value="CRITICAL">{displayLabel('CRITICAL')}</option>
                  <option value="HIGH">{displayLabel('HIGH')}</option>
                  <option value="MEDIUM">{displayLabel('MEDIUM')}</option>
                  <option value="LOW">{displayLabel('LOW')}</option>
                </select>
              </label>
            )}
            <label className="ft-select-wrap">
              <span className="sr-only">Giảng viên hướng dẫn</span>
              <select aria-label="Giảng viên hướng dẫn" className="ft-select" value={supervisorFilter} onChange={e => setSupervisorFilter(e.target.value)}>
                <option value="ALL">Tất cả GVHD</option>
                <option value="UNASSIGNED">Chưa có GVHD</option>
                {supervisorOptions.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
          </>
        }
        sort={{
          value: sortBy,
          onChange: (value) => setSortBy(value as SortKey),
          options: [
            { value: 'default', label: 'Mặc định' },
            { value: 'risk', label: 'Rủi ro cao nhất' },
            { value: 'progress-asc', label: 'Tiến độ thấp trước' },
            { value: 'title', label: 'Tên đồ án A–Z' },
          ],
        }}
        activeChips={activeChips}
        onRemoveChip={(id) => {
          if (id === 'search') handleSearchChange('')
          if (id === 'status') handleStatusChange('')
          if (id === 'major') setFilter(c => { const next = { ...c, page: 1 }; delete next.majorId; return next })
          if (id === 'risk') setRiskFilter('ALL')
          if (id === 'supervisor') setSupervisorFilter('ALL')
        }}
        onClearAll={clearFilters}
        hasActiveFilters={activeChips.length > 0 || sortBy !== 'default'}
        resultSummary={data ? `Hiển thị ${visibleProjects.length} / ${data.projects.totalCount} đồ án` : undefined}
        pagination={data && (data.projects.totalPages > 1 || data.projects.totalCount > data.projects.pageSize) ? { page: filter.page ?? 1, pages: data.projects.totalPages, total: data.projects.totalCount, pageSize: filter.pageSize ?? data.projects.pageSize, busy: loading, onPage: (page) => setFilter(current => ({ ...current, page })) } : undefined}
      />

      {loading && <PageLoading label="Đang tải danh mục đồ án…" />}
      {!loading && data && <>
        <section className="workspace-surface workspace-surface-padding">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-heading font-semibold text-ink">Danh sách đồ án</h2>
              <p className="mt-1 text-sm text-ink-muted">Dữ liệu tại {formatAsOf(data.asOfUtc)}. Hệ thống ghi nhận lịch sử xuất dữ liệu.</p>
            </div>
            <MajorChips majors={data.summary.majors} selected={filter.majorId} onSelect={majorId => setFilter(current => ({ ...current, majorId, page: 1 }))} />
          </div>
          {visibleProjects.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">Không có đồ án phù hợp với bộ lọc hiện tại.</p>
          ) : (
            <ul className="mt-4 divide-y divide-hairline">
              {visibleProjects.map(project => (
                <ProjectRow
                  readOnly={scope === 'admin'}
                  viewerDepartmentId={scope === 'department' ? data.departmentId : null}
                  key={project.id}
                  project={project}
                  archiving={archivingId !== null}
                  archivingThis={archivingId === project.id}
                  onArchive={() => void archive(project)}
                />
              ))}
            </ul>
          )}
        </section>
        {(data.projects.totalPages > 1 || data.projects.totalCount > data.projects.pageSize) && (
          <Pagination
            page={filter.page ?? 1}
            pages={data.projects.totalPages}
            total={data.projects.totalCount}
            pageSize={filter.pageSize ?? data.projects.pageSize}
            busy={loading}
            onPage={(page) => setFilter(current => ({ ...current, page }))}
            onPageSizeChange={(pageSize) => setFilter(current => ({ ...current, page: 1, pageSize }))}
          />
        )}
      </>}
    </WorkspacePage>
  )
}

function SummaryCard({ title, items }: { title: string; items: Array<{ key: string; label: string; active?: boolean; onClick?: () => void }> }) {
  return (
    <section className="workspace-summary flex h-full flex-col">
      <h2 className="font-heading text-sm font-semibold text-ink">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">Chưa có dữ liệu.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map(item => (
            <li key={item.key}>
              <button
                type="button"
                aria-pressed={item.active}
                onClick={item.onClick}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${item.active ? 'bg-primary text-white' : 'bg-primary-subtle text-primary hover:bg-primary/15'}`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function MajorChips({ majors, selected, onSelect }: { majors: PortfolioDashboard['summary']['majors']; selected?: number; onSelect: (majorId: number | undefined) => void }) {
  if (majors.length === 0) return null
  return (
    <div className="flex max-w-full flex-wrap gap-2" aria-label="Lọc theo chuyên ngành">
      <button type="button" aria-pressed={!selected} className={`min-h-10 rounded-lg border px-3 text-sm font-semibold transition-colors ${!selected ? 'border-primary bg-primary text-white shadow-2xs' : 'border-hairline bg-card text-primary hover:bg-primary-subtle'}`} onClick={() => onSelect(undefined)}>Tất cả ngành</button>
      {majors.map(major => (
        <button type="button" key={major.majorId} aria-pressed={selected === major.majorId} className={`min-h-10 rounded-lg border px-3 text-sm font-semibold transition-colors ${selected === major.majorId ? 'border-primary bg-primary text-white shadow-2xs' : 'border-hairline bg-card text-primary hover:bg-primary-subtle'}`} onClick={() => onSelect(major.majorId)}>{major.code}</button>
      ))}
    </div>
  )
}

function ProjectRow({ project, archiving, archivingThis, onArchive, readOnly = false, viewerDepartmentId = null }: { readOnly?: boolean; viewerDepartmentId?: number | null; project: DashboardProject; archiving: boolean; archivingThis: boolean; onArchive: () => void }) {
  const risk = project.analysis?.riskLevel
  const normalized = project.status.replaceAll('_', '').toUpperCase()
  const isParticipatingDepartment = !readOnly && viewerDepartmentId != null && project.departmentId != null && project.departmentId !== viewerDepartmentId
  const isLeadDepartment = !readOnly && viewerDepartmentId != null && project.departmentId != null && project.departmentId === viewerDepartmentId
  return (
    <li className="flex flex-wrap items-start justify-between gap-4 py-4 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{project.code} · {project.title}</p>
        <p className="mt-1 text-xs text-ink-muted">{project.departmentName ?? 'Chưa có khoa'} · {project.supervisor?.name ?? 'Chưa có GVHD'}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatusBadge
            tone={normalized === 'ACTIVE' || normalized === 'COMPLETED' ? 'success' : normalized === 'FINALSUBMISSION' ? 'info' : normalized === 'REJECTED' ? 'danger' : 'neutral'}
            label={projectStatusLabel(project.status)}
          />
          {isLeadDepartment && <StatusBadge tone="neutral" label="Khoa chủ trì" />}
          {isParticipatingDepartment && <StatusBadge tone="info" label="Khoa phối hợp" />}
          {(project.analysis?.healthPulseStatus || risk) && (
            <HealthPulseBadge
              healthPulseStatus={project.analysis?.healthPulseStatus}
              riskLevel={risk}
              signals={project.analysis?.healthPulseSignals}
            />
          )}
        </div>
      </div>
      {readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/admin/projects/${project.id}/evaluation-schemes`} className="inline-flex min-h-10 items-center rounded-lg border border-hairline bg-card px-3 text-xs font-semibold text-primary hover:bg-primary-subtle">Phương án đánh giá</Link>
          <Link to={`/admin/projects/${project.id}/result`} className="inline-flex min-h-10 items-center rounded-lg border border-hairline bg-card px-3 text-xs font-semibold text-primary hover:bg-primary-subtle">Kết quả</Link>
        </div>
      )}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/department/projects/review/${project.id}`} className="inline-flex min-h-10 items-center rounded-lg border border-primary bg-card px-3 text-xs font-semibold text-primary hover:bg-primary-subtle">Xem</Link>
          <Link to={`/department/projects/${project.id}/governance`} className="inline-flex min-h-10 items-center rounded-lg border border-hairline bg-card px-3 text-xs font-semibold text-ink-soft hover:border-primary hover:text-primary">Điều phối</Link>
          <Link to={`/department/projects/${project.id}/result`} className="inline-flex min-h-10 items-center rounded-lg border border-hairline bg-card px-3 text-xs font-semibold text-ink-soft hover:border-primary hover:text-primary">Kết quả</Link>
          <details className="relative">
            <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-1 rounded-lg border border-hairline bg-canvas px-3 text-xs font-semibold text-ink-soft hover:border-primary hover:text-primary">
              Thêm<span className="material-symbols-outlined text-[16px]" aria-hidden="true">expand_more</span>
            </summary>
            <div className="absolute right-0 z-20 mt-1 flex min-w-44 flex-col rounded-xl border border-hairline bg-card p-1.5 shadow-lg">
              <Link to={`/department/projects/${project.id}/evaluation-schemes`} className="rounded-lg px-3 py-2 text-xs font-semibold text-ink hover:bg-primary-subtle hover:text-primary">Phương án đánh giá</Link>
              <Link to={`/department/projects/${project.id}/defense`} className="rounded-lg px-3 py-2 text-xs font-semibold text-ink hover:bg-primary-subtle hover:text-primary">Hội đồng bảo vệ</Link>
              {project.status === 'FINAL_SUBMISSION' && <Link to={`/department/projects/${project.id}/evaluations`} className="rounded-lg px-3 py-2 text-xs font-semibold text-ink hover:bg-primary-subtle hover:text-primary">Người chấm</Link>}
              <Link to={`/department/projects/${project.id}/files`} className="rounded-lg px-3 py-2 text-xs font-semibold text-ink hover:bg-primary-subtle hover:text-primary">Tệp</Link>
              {env.aiAdvisoryEnabled && <Link to={`/department/projects/${project.id}/risk`} className="rounded-lg px-3 py-2 text-xs font-semibold text-ink hover:bg-primary-subtle hover:text-primary">Phân tích</Link>}
            </div>
          </details>
          {normalized === 'ARCHIVED' ? (
            <Link to={`/department/projects/${project.id}/archive-view`} className="inline-flex min-h-10 items-center rounded-lg border border-hairline bg-canvas px-3 text-xs font-semibold text-ink-soft hover:border-primary hover:text-primary">Hồ sơ lưu trữ</Link>
          ) : !isParticipatingDepartment ? (
            <button type="button" disabled={archiving} className="min-h-10 rounded-lg px-2.5 text-xs font-semibold text-status-error-text hover:bg-status-error-bg disabled:cursor-not-allowed disabled:opacity-50" onClick={onArchive}>
              {archivingThis ? 'Đang kiểm tra…' : 'Lưu trữ'}
            </button>
          ) : null}
        </div>
      )}
    </li>
  )
}

function formatAsOf(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(date) }
