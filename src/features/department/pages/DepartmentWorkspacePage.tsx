import { displayLabel } from '../../../components/ui/display-label'
import { DepartmentWorkflowGuide } from '../components/DepartmentWorkflowGuide'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAcademicWorkflow } from '../../../app/context/useAcademicWorkflow'
import { Button } from '../../../components/ui/Button'
import { BulkActionBar } from '../../../components/ui/BulkActionBar'
import { FilterToolbar } from '../../../components/ui/FilterToolbar'
import { ListLoading } from '../../../components/ui/ListLoading'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../../components/ui/Table'
import { useDepartmentSection as useSection, type Section } from '../hooks/useDepartmentSection'
import { projectStatusLabel } from '../../projects/utils/project-status'
import { HttpError } from '../../../services/http/http-client'
import { getPortfolioDashboard, type PortfolioDashboard } from '../../dashboard/api/dashboard-api'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { getReviewQueue, type ReviewQueuePage, type ReviewProjectSummary } from '../../projects/api/project-review-api'
import { list as listSupervisors, type Page as SupervisorPage, type Supervisor } from '../../supervisors/api/supervisor-api'
import { getDepartmentUrgentActions, type ActionAggregatorResponse } from '../../calendar/action-aggregators-api'
import { DepartmentExecutiveBriefPanel } from '../../ai-suite/DepartmentExecutiveBriefPanel'
import { getPreSemesterReadiness, type PreSemesterReadiness } from '../api/pre-semester-api'

const emptyReviews = (data: ReviewQueuePage<ReviewProjectSummary>) => data.items.length === 0
const emptyPortfolio = (data: PortfolioDashboard) => data.projects.items.length === 0
const emptySupervisors = (data: SupervisorPage<Supervisor>) => data.items.length === 0
const emptyUrgent = (data: ActionAggregatorResponse) => data.totalCount === 0

function statusTone(status: string): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
  const s = status.replaceAll('_', '').toUpperCase()
  if (s === 'ACTIVE' || s === 'APPROVED' || s === 'COMPLETED') return 'success'
  if (s === 'FINALSUBMISSION') return 'info'
  if (s === 'REJECTED') return 'danger'
  if (s === 'SUBMITTED' || s === 'UNDERREVIEW' || s === 'REVISIONREQUIRED' || s === 'SUPERVISORPENDING') return 'warning'
  return 'neutral'
}

function SectionState({ section, onRetry, children }: { section: Section<unknown>; onRetry: () => void; children: ReactNode }) {
  if (section.state === 'loading') return <ListLoading label="Đang tải dữ liệu…" />
  if (!['success', 'empty'].includes(section.state)) return <section role="alert" className="rounded-xl border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-text"><p>{section.message}</p><Button className="mt-3" size="sm" variant="secondary" onClick={onRetry}>Thử lại</Button></section>
  if (section.state === 'empty') return <p className="rounded-xl border border-hairline bg-card p-4 text-sm text-ink-muted">Chưa có dữ liệu trong phạm vi bộ môn hiện tại.</p>
  return <>{children}</>
}

/** Department-only foundation. It composes published reads and never derives an academic decision. */
export function DepartmentWorkspacePage() {
  const { session } = useAuthSession()
  const academic = useAcademicWorkflow()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [preSemReadiness, setPreSemReadiness] = useState<PreSemesterReadiness | null>(null)
  const search = searchParams.get('q') ?? ''
  const status = searchParams.get('status') ?? ''

  // Debounce backend queries when typing while keeping URL state synchronized immediately.
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  const isFirstSearch = useRef(true)
  useEffect(() => {
    if (isFirstSearch.current) {
      isFirstSearch.current = false
      setDebouncedSearch(search)
      return
    }
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250)
    return () => window.clearTimeout(timer)
  }, [search])

  const token = session?.accessToken
  const semesterId = academic.academic?.selectedSemester?.id
  useEffect(() => {
    if (!token) return
    let active = true
    void getPreSemesterReadiness(semesterId)
      .then(data => { if (active) setPreSemReadiness(data) })
      .catch(() => { if (active) setPreSemReadiness(null) })
    return () => { active = false }
  }, [token, semesterId])
  const [pageState, setPageState] = useState<{ semesterId: number | undefined; page: number }>({ semesterId, page: 1 })
  const portfolioPage = pageState.semesterId === semesterId ? pageState.page : 1
  const setPortfolioPage = (page: number) => setPageState({ semesterId, page })
  const departmentIds = (academic.academic?.departments ?? []).map(department => department.id).filter(id => Number.isSafeInteger(id) && id > 0).join(',')
  const urgentRead = useCallback(async (): Promise<ActionAggregatorResponse> => {
    const ids = departmentIds.split(',').map(Number).filter(id => id > 0)
    if (!ids.length) throw new Error('Department scope unavailable')
    const results = await Promise.all(ids.map(id => getDepartmentUrgentActions(id)))
    return { asOfUtc: results[0].asOfUtc, totalCount: results.reduce((sum, result) => sum + result.totalCount, 0), hasMore: results.some(result => result.hasMore), items: results.flatMap(result => result.items) }
  }, [departmentIds])
  const reviewRead = useCallback(() => token ? getReviewQueue({ page: 1, pageSize: 5 }, token) : Promise.reject(new HttpError('Unauthenticated', 401)), [token])
  const attentionRead = useCallback(() => getPortfolioDashboard('department', { page: 1, pageSize: 20, semesterId }), [semesterId])
  const portfolioRead = useCallback(() => getPortfolioDashboard('department', { page: portfolioPage, pageSize: 5, semesterId, search: debouncedSearch.trim() || undefined, status: status || undefined }), [portfolioPage, semesterId, debouncedSearch, status])
  const supervisorRead = useCallback(async (): Promise<SupervisorPage<Supervisor>> => {
    if (!token) throw new HttpError('Unauthenticated', 401)
    const ids = departmentIds.split(',').map(Number).filter(id => id > 0)
    if (!ids.length) throw new Error('Department scope unavailable')
    const results = await Promise.all(ids.map(departmentId => listSupervisors(token, { departmentId, page: 1, pageSize: 5 })))
    return {
      items: results.flatMap(result => result.items).slice(0, 5),
      page: 1,
      pageSize: 5,
      totalCount: results.reduce((total, result) => total + result.totalCount, 0),
    }
  }, [departmentIds, token])
  const reviews = useSection<ReviewQueuePage<ReviewProjectSummary>>(reviewRead, emptyReviews)
  const urgent = useSection<ActionAggregatorResponse>(urgentRead, emptyUrgent)
  const attentionPortfolio = useSection<PortfolioDashboard>(attentionRead, emptyPortfolio)
  const portfolio = useSection<PortfolioDashboard>(portfolioRead, emptyPortfolio)
  const supervisors = useSection<SupervisorPage<Supervisor>>(supervisorRead, emptySupervisors)
  const periods = academic.academic?.periods ?? []
  const departmentName = academic.academic?.departments.map(department => department.name).join(', ') || 'Bộ môn hiện tại'
  const attention = useMemo(() => attentionPortfolio.data?.projects.items.filter((project) => project.pendingProgressReviews > 0 || (project.analysis?.progressSummary.blockedTasks ?? 0) > 0 || (project.analysis?.progressSummary.overdueTasks ?? 0) > 0).slice(0, 5) ?? [], [attentionPortfolio.data])
  const visibleSelected = portfolio.data?.projects.items.filter(project => selectedIds.includes(project.id)) ?? []
  const statusOptions = [...(portfolio.data?.summary?.projectStates?.map(item => item.status) ?? [])]
  if (status && !statusOptions.includes(status)) statusOptions.push(status)

  function updateFilter(key: 'q' | 'status', value: string) {
    setSearchParams(previous => { const next = new URLSearchParams(previous); if (value) next.set(key, value); else next.delete(key); return next }, { replace: true })
    setPortfolioPage(1)
    setSelectedIds([])
  }
  function clearMiniFilters() {
    setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete('q'); next.delete('status'); return next }, { replace: true })
    setPortfolioPage(1)
    setSelectedIds([])
  }
  function toggleProject(id: number) { setSelectedIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]) }

  const miniActiveChips = [
    ...(search.trim() ? [{ id: 'q', label: 'Từ khóa', value: search.trim() }] : []),
    ...(status ? [{ id: 'status', label: 'Trạng thái', value: projectStatusLabel(status) }] : []),
  ]

  return (
    <WorkspacePage
      size="wide"
      className="space-y-8"
      title="Quản lý đồ án bộ môn"
      eyebrow="Không gian bộ môn"
      description={`${departmentName}. Theo dõi danh mục đồ án, hồ sơ chờ thẩm định và nguồn lực hướng dẫn.`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Link className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-primary/20 bg-primary-subtle px-3.5 text-xs font-semibold text-primary transition-all hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to="/department/projects/progress-matrix">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">view_timeline</span>
            Ma trận tiến độ kiểm duyệt
          </Link>
          <Link className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-white shadow-2xs transition-all hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to="/department/projects/review">
            Thẩm định đề cương
          </Link>
        </div>
      }
    >
      <DepartmentWorkflowGuide />

      {preSemReadiness && preSemReadiness.readyCount < preSemReadiness.totalRelevantCount && (
        <section
          aria-label="Chuẩn bị đầu kỳ"
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/25 bg-primary-subtle/50 px-5 py-4"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Chuẩn bị đầu kỳ · {preSemReadiness.semesterName} ({preSemReadiness.semesterCode})
            </p>
            <p className="text-sm font-semibold text-ink">
              Đã hoàn thiện {preSemReadiness.readyCount}/{preSemReadiness.totalRelevantCount} hạng mục đầu kỳ — bạn có thể kế thừa nhanh từ kỳ trước hoặc dùng AI soạn bản nháp.
            </p>
          </div>
          <Link
            to="/department/pre-semester-setup"
            className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-4 text-xs font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">rocket_launch</span>
            Mở Trung tâm Chuẩn bị Đầu kỳ
          </Link>
        </section>
      )}

      <div className="role-metric-compact"><StatTileRow tiles={[
        { icon: 'priority_high', label: 'Việc cần xử lý', value: urgent.data?.totalCount ?? null, caption: urgent.data?.hasMore ? 'Danh sách việc khẩn còn trang tiếp theo.' : 'Theo bộ môn trong phiên hiện tại.', hero: true },
        { icon: 'fact_check', label: 'Chờ thẩm định', value: reviews.data?.totalCount ?? null, tone: (reviews.data?.totalCount ?? 0) > 0 ? 'warning' : 'neutral' },
        { icon: 'folder_managed', label: 'Đồ án quản lý', value: portfolio.data?.summary.totalProjects ?? null },
        { icon: 'supervisor_account', label: 'Giảng viên trong bộ môn', value: supervisors.data?.totalCount ?? null },
      ]} /></div>

      <nav aria-label="Đi tới khu vực bộ môn" className="flex flex-wrap gap-2 text-xs font-semibold">
        <a className="inline-flex min-h-10 items-center rounded-lg border border-status-warning-border bg-status-warning-bg px-3.5 text-status-warning-text transition-colors hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href="#action-queue">Việc cần xử lý</a>
        <a className="inline-flex min-h-10 items-center rounded-lg border border-hairline bg-card px-3.5 text-ink-soft transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href="#monitoring">Theo dõi tiến độ</a>
        <a className="inline-flex min-h-10 items-center rounded-lg border border-hairline bg-card px-3.5 text-ink-soft transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href="#configuration">Cấu hình học vụ</a>
      </nav>

      {!departmentIds ? <p role="alert" className="rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">Chưa xác định được bộ môn từ phiên đăng nhập. Không truy vấn phạm vi khác.</p> : !['success', 'empty', 'loading'].includes(urgent.state) && <SectionState section={urgent} onRetry={urgent.refresh}><span /></SectionState>}
      {!['success', 'empty', 'loading'].includes(supervisors.state) && <SectionState section={supervisors} onRetry={supervisors.refresh}><span /></SectionState>}

      <DepartmentExecutiveBriefPanel
        departmentId={academic.academic?.departments?.[0]?.id}
        semesterId={semesterId}
        routePrefix="/department"
      />

      {/* TIER 1: URGENT ACTION QUEUE */}
      <section id="action-queue" aria-labelledby="urgent-actions-heading" className="space-y-4 rounded-2xl border border-status-warning-border/70 bg-gradient-to-b from-status-warning-bg/40 to-transparent p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-status-warning-border/50 pb-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-status-warning-bg px-2 py-0.5 text-xs font-bold text-status-warning-text uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-status-warning-text motion-safe:animate-pulse" />
              Khu vực 1: Tác vụ khẩn cấp
            </span>
            <h2 id="urgent-actions-heading" className="mt-1 font-heading text-xl font-bold text-ink">
              Việc cần xử lý
            </h2>
            <p className="mt-1 text-xs text-ink-muted">
              Tập trung các đề cương chờ duyệt và đồ án có tín hiệu nguy cơ trễ hạn hoặc bị chặn.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">fact_check</span>
                Đề cương chờ thẩm định
              </h3>
              <span className="text-xs font-semibold text-ink-muted">
                {reviews.data?.totalCount ?? '—'} hồ sơ
              </span>
            </div>

            <SectionState section={reviews} onRetry={reviews.refresh}>
              <div className="space-y-2.5">
                {reviews.data?.items.map((project) => (
                  <article key={project.id} className="rounded-xl border border-hairline bg-card p-4 transition-all hover:border-primary/40 hover:shadow-2xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-bold text-primary">{project.code}</p>
                        <h4 className="mt-1 break-words font-semibold text-ink text-sm">{project.title}</h4>
                      </div>
                      <StatusBadge tone={statusTone(project.status)} label={projectStatusLabel(project.status)} />
                    </div>
                    <p className="mt-2 text-xs text-ink-muted truncate">
                      {project.teamName} · {project.majors.map((major) => major.majorCode).join(', ') || 'Chưa xác định ngành'}
                    </p>
                    <div className="mt-3 flex justify-end">
                      <Link className="workspace-action-link text-xs font-semibold" to={`/department/projects/review/${project.id}`}>
                        Xem thẩm định
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </SectionState>
          </div>

          <div id="attention" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-status-warning-text" aria-hidden="true">warning</span>
                Đồ án có tín hiệu cần chú ý
              </h3>
              {attention.length > 0 && (
                <StatusBadge tone="warning" label={`${attention.length} đồ án`} />
              )}
            </div>

            <SectionState section={attentionPortfolio} onRetry={attentionPortfolio.refresh}>
              {attention.length ? (
                <div className="space-y-2.5">
                  {attention.map((project) => (
                    <article key={project.id} className="rounded-xl border border-hairline bg-card p-4 transition-all hover:border-status-warning-border hover:shadow-2xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="truncate font-semibold text-ink text-sm">{project.code} · {project.title}</h4>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-muted">
                            <Signal label="Báo cáo chờ duyệt" value={project.pendingProgressReviews} />
                            <Signal label="Bị chặn" value={project.analysis?.progressSummary.blockedTasks ?? 0} />
                            <Signal label="Quá hạn" value={project.analysis?.progressSummary.overdueTasks ?? 0} />
                          </div>
                        </div>
                        <Link
                          className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-hairline px-3 text-xs font-semibold text-primary transition-colors hover:border-primary hover:bg-primary-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          to={`/department/projects/${project.id}/governance`}
                        >
                          Mở hồ sơ
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-status-success-border bg-status-success-bg p-4 text-xs font-medium text-status-success-text flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-status-success-text" aria-hidden="true">check_circle</span>
                  Không có đồ án nào có tín hiệu cần chú ý ở thời điểm hiện tại.
                </div>
              )}
            </SectionState>
          </div>
        </div>
      </section>

      {/* TIER 2: PROGRESS MONITORING */}
      <section id="monitoring" aria-labelledby="monitoring-heading" className="space-y-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary-subtle px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
            Khu vực 2: Vận hành &amp; Giám sát
          </span>
          <h2 id="monitoring-heading" className="mt-1 font-heading text-xl font-bold text-ink">
            Giám sát tiến độ và danh mục đồ án
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Theo dõi khối lượng đồ án bộ môn quản lý, đội ngũ giảng viên và đề tài đang triển khai.
          </p>
        </div>

        <section aria-labelledby="portfolio-heading" className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
            <div>
              <h3 id="portfolio-heading" className="font-heading text-base font-semibold text-ink">Danh mục đồ án gần đây</h3>
              <p className="text-sm text-ink-muted">{departmentName} · {academic.academic?.selectedSemester?.name ?? 'Kỳ đang chọn'}</p>
            </div>
            <Link to="/department/portfolio" className="workspace-action-link">Mở danh mục đầy đủ →</Link>
          </div>

          <FilterToolbar
            embedded
            debounceMs={0}
            search={search}
            onSearchChange={(val) => updateFilter('q', val)}
            searchPlaceholder="Mã hoặc tên đồ án…"
            searchLabel="Tìm đồ án"
            controls={
              <label className="ft-select-wrap">
                <span className="sr-only">Trạng thái</span>
                <select aria-label="Trạng thái" value={status} onChange={event => updateFilter('status', event.target.value)} className="ft-select">
                  <option value="">Tất cả trạng thái</option>
                  {statusOptions.map(value => <option key={value} value={value}>{projectStatusLabel(value)}</option>)}
                </select>
              </label>
            }
            activeChips={miniActiveChips}
            onRemoveChip={(id) => updateFilter(id as 'q' | 'status', '')}
            onClearAll={clearMiniFilters}
            hasActiveFilters={miniActiveChips.length > 0}
          />

          <div className="p-4 sm:p-5">
            {portfolio.state === 'empty' ? <p className="rounded-lg bg-canvas p-4 text-sm text-ink-muted">{search || status ? 'Không có đồ án khớp bộ lọc hiện tại.' : 'Chưa có đồ án trong phạm vi bộ môn hiện tại.'}</p> : portfolio.state === 'success' && portfolio.data ? <>
              <BulkActionBar
                count={visibleSelected.length}
                noun="đồ án"
                blocked={visibleSelected.filter(project => project.status === 'ARCHIVED').map(project => ({ id: project.id, label: project.code, reason: 'Đã lưu trữ; chỉ có thể xem hồ sơ.' }))}
                onClear={() => setSelectedIds([])}
              >
                {visibleSelected.length === 1 ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <Link to={`/department/projects/${visibleSelected[0].id}/governance`} className="workspace-action-link">Điều phối đồ án</Link>
                    <Link to={`/department/projects/${visibleSelected[0].id}/result`} className="workspace-action-link">Xem kết quả</Link>
                  </div>
                ) : (
                  <Link to="/department/portfolio" className="workspace-action-link">Mở toàn bộ danh mục để thao tác chi tiết →</Link>
                )}
              </BulkActionBar>
              <Table stack aria-label="Danh mục đồ án">
                <TableHead><TableRow head><TableHeaderCell>Chọn</TableHeaderCell><TableHeaderCell>Đồ án</TableHeaderCell><TableHeaderCell>Trạng thái</TableHeaderCell><TableHeaderCell>Mở hồ sơ</TableHeaderCell></TableRow></TableHead>
                <TableBody>{portfolio.data.projects.items.map(project => <TableRow key={project.id}><TableCell label="Chọn"><input type="checkbox" aria-label={`Chọn ${project.code}`} checked={selectedIds.includes(project.id)} onChange={() => toggleProject(project.id)} /></TableCell><TableCell label="Đồ án"><strong className="block text-ink">{project.title}</strong><span className="font-mono text-xs text-ink-muted">{project.code} · {project.departmentName ?? departmentName}</span></TableCell><TableCell label="Trạng thái"><StatusBadge tone={statusTone(project.status)} label={projectStatusLabel(project.status)} /></TableCell><TableCell label="Mở hồ sơ"><Link to={`/department/projects/${project.id}/governance`} className="workspace-action-link">Xem hồ sơ</Link></TableCell></TableRow>)}</TableBody>
              </Table>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-ink-muted">Hiển thị {portfolio.data.projects.items.length} trong {portfolio.data.projects.totalCount} đồ án</p>
                {portfolio.data.projects.totalPages > 1 && (
                  <nav aria-label="Phân trang danh mục đồ án" className="flex items-center gap-3 text-xs">
                    <Button size="sm" variant="secondary" disabled={portfolioPage <= 1} onClick={() => { setSelectedIds([]); setPortfolioPage(portfolioPage - 1) }}>Trang trước</Button>
                    <span className="font-medium text-ink-muted">Trang {portfolio.data.projects.page} / {portfolio.data.projects.totalPages}</span>
                    <Button size="sm" variant="secondary" disabled={portfolioPage >= portfolio.data.projects.totalPages} onClick={() => { setSelectedIds([]); setPortfolioPage(portfolioPage + 1) }}>Trang sau</Button>
                  </nav>
                )}
              </div>
            </> : <SectionState section={portfolio} onRetry={portfolio.refresh}><span /></SectionState>}
          </div>
        </section>

        <nav aria-label="Lối tắt giám sát bộ môn" className="grid overflow-hidden rounded-xl border border-hairline bg-card sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-hairline">
          <Link className="flex min-h-14 items-center gap-3 px-4 text-xs font-semibold text-ink-soft transition-colors hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary" to="/department/supervisors">
            <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">supervisor_account</span>
            Giảng viên hướng dẫn
          </Link>
          <Link className="flex min-h-14 items-center gap-3 px-4 text-xs font-semibold text-ink-soft transition-colors hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary" to="/department/topics">
            <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">lightbulb</span>
            Quản lý đề tài
          </Link>
          <Link className="flex min-h-14 items-center gap-3 px-4 text-xs font-semibold text-ink-soft transition-colors hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary" to="/department/student-qualifications">
            <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">verified</span>
            Xác minh điều kiện sinh viên
          </Link>
          <Link className="flex min-h-14 items-center gap-3 px-4 text-xs font-semibold text-ink-soft transition-colors hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary" to="/department/projects/archived">
            <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">inventory_2</span>
            Kho lưu trữ đồ án
          </Link>
        </nav>
      </section>

      {/* TIER 3: ACADEMIC CONFIGURATION */}
      <section id="configuration" aria-labelledby="academic-configuration-heading" className="space-y-4 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-tag-ai-bg px-2 py-0.5 text-xs font-bold text-tag-ai uppercase tracking-wider">
              Khu vực 3: Cấu hình &amp; Quy chế
            </span>
            <h2 id="academic-configuration-heading" className="mt-1 font-heading text-xl font-bold text-ink">
              Kế hoạch học vụ và chính sách đào tạo
            </h2>
            <p className="mt-1 text-xs text-ink-muted">
              Quản trị thời gian mở các kỳ đồ án, thiết lập mẫu cổng kiểm duyệt theo ngành và bộ tiêu chí đánh giá.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div id="periods" className="space-y-3 lg:col-span-2">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">date_range</span>
              Kỳ đồ án trong học kỳ
            </h3>

            {academic.status === 'loading' || academic.status === 'idle' ? (
              <p role="status" className="rounded-xl border border-hairline bg-card p-4 text-xs text-ink-muted">
                Đang tải kỳ đồ án…
              </p>
            ) : academic.status === 'ready' ? (
              periods.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {periods.map((period) => (
                    <article key={period.id} className="rounded-xl border border-hairline bg-card p-4 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-mono text-xs font-semibold uppercase text-primary">
                            {displayLabel(period.periodType)}
                          </p>
                          <h4 className="mt-0.5 font-bold text-ink text-sm">{period.name}</h4>
                        </div>
                        <StatusBadge
                          tone={period.isOpen ? 'success' : period.status === 'ACTIVE' ? 'neutral' : 'info'}
                          label={period.isOpen ? 'Đang mở' : period.status === 'ACTIVE' ? 'Ngoài thời gian mở' : displayLabel(period.status)}
                        />
                      </div>
                      <p className="font-mono text-xs text-ink-muted">
                        {formatPeriodDate(period.startAtUtc)} → {formatPeriodDate(period.endAtUtc)}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-hairline bg-card p-4 text-xs text-ink-muted">
                  Chưa có kỳ đồ án trong học kỳ hiện tại.
                </p>
              )
            ) : (
              <p role="alert" className="rounded-xl border border-status-warning-border bg-status-warning-bg p-4 text-xs text-status-warning-text">
                Không thể tải thông tin kỳ đồ án. Các khu vực khác vẫn hoạt động bình thường.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">rule_settings</span>
              Thiết lập chính sách
            </h3>
            <div className="rounded-xl border border-hairline bg-card p-3 flex flex-col gap-1.5">
              <Link className="flex min-h-11 items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to="/academic/review-gates">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">rule_settings</span>
                  Chính sách cổng kiểm duyệt
                </span>
                <span className="material-symbols-outlined text-[16px] text-ink-muted" aria-hidden="true">arrow_forward</span>
              </Link>
              <Link className="flex min-h-11 items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to="/academic">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">account_balance</span>
                  Cấu trúc đào tạo
                </span>
                <span className="material-symbols-outlined text-[16px] text-ink-muted" aria-hidden="true">arrow_forward</span>
              </Link>
              <Link className="flex min-h-11 items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to="/academic/governance">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">date_range</span>
                  Học kỳ và chính sách
                </span>
                <span className="material-symbols-outlined text-[16px] text-ink-muted" aria-hidden="true">arrow_forward</span>
              </Link>
              <Link className="flex min-h-11 items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to="/academic/rubrics">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">grading</span>
                  Bộ tiêu chí đánh giá
                </span>
                <span className="material-symbols-outlined text-[16px] text-ink-muted" aria-hidden="true">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </WorkspacePage>
  )
}

function Signal({ label, value }: { label: string; value: number }) {
  return <span>{label}: <strong className="font-mono text-ink">{value}</strong></span>
}

function formatPeriodDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })
}
