import { displayLabel } from '../../../components/ui/display-label'
import { DepartmentWorkflowGuide } from '../components/DepartmentWorkflowGuide'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAcademicWorkflow } from '../../../app/context/useAcademicWorkflow'
import { Button } from '../../../components/ui/Button'
import { BulkActionBar } from '../../../components/ui/BulkActionBar'
import { Pagination } from '../../../components/ui/Pagination'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../../components/ui/Table'
import { WorkspaceTabs } from '../../../components/ui/WorkspaceTabs'
import { useClientPagination } from '../../../components/ui/useClientPagination'
import type { BadgeTone } from '../../../components/ui/status-badge-tone'
import { useDepartmentSection as useSection, type Section } from '../hooks/useDepartmentSection'
import { projectStatusLabel } from '../../projects/utils/project-status'
import { HttpError } from '../../../services/http/http-client'
import { getPortfolioDashboard, type PortfolioDashboard } from '../../dashboard/api/dashboard-api'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { getReviewQueue, type ReviewQueuePage, type ReviewProjectSummary } from '../../projects/api/project-review-api'
import { list as listSupervisors, type Page as SupervisorPage, type Supervisor } from '../../supervisors/api/supervisor-api'
import { getDepartmentUrgentActions, type ActionAggregatorResponse } from '../../calendar/action-aggregators-api'

const emptyReviews = (data: ReviewQueuePage<ReviewProjectSummary>) => data.items.length === 0
const emptyPortfolio = (data: PortfolioDashboard) => data.projects.items.length === 0
const emptySupervisors = (data: SupervisorPage<Supervisor>) => data.items.length === 0
const emptyUrgent = (data: ActionAggregatorResponse) => data.totalCount === 0

function SectionState({ section, onRetry, children }: { section: Section<unknown>; onRetry: () => void; children: ReactNode }) {
  if (section.state === 'loading') return <p role="status" className="py-3 text-sm text-ink-muted">Đang tải dữ liệu…</p>
  if (!['success', 'empty'].includes(section.state)) return <section role="alert" className="rounded-xl border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-text"><p>{section.message}</p><Button className="mt-3" size="sm" variant="secondary" onClick={onRetry}>Thử lại</Button></section>
  if (section.state === 'empty') return <p className="rounded-xl border border-hairline bg-card p-4 text-sm text-ink-muted">Chưa có dữ liệu trong phạm vi bộ môn hiện tại.</p>
  return <>{children}</>
}

/** Department-only foundation. It composes published reads and never derives an academic decision. */
export function DepartmentWorkspacePage() {
  const { session } = useAuthSession()
  const academic = useAcademicWorkflow()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<'all' | 'queue' | 'portfolio' | 'periods'>('all')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const search = searchParams.get('q') ?? ''
  const status = searchParams.get('status') ?? ''
  const token = session?.accessToken
  const semesterId = academic.academic?.selectedSemester?.id
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
  const portfolioRead = useCallback(() => getPortfolioDashboard('department', { page: portfolioPage, pageSize: 5, semesterId, search: search || undefined, status: status || undefined }), [portfolioPage, semesterId, search, status])
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
  const portfolio = useSection<PortfolioDashboard>(portfolioRead, emptyPortfolio)
  const supervisors = useSection<SupervisorPage<Supervisor>>(supervisorRead, emptySupervisors)
  const periods = useMemo(() => academic.academic?.periods ?? [], [academic.academic?.periods])
  const departmentName = academic.academic?.departments.map(department => department.name).join(', ') || 'Bộ môn hiện tại'
  const attention = useMemo(() => portfolio.data?.projects.items.filter((project) => project.pendingProgressReviews > 0 || (project.analysis?.progressSummary.blockedTasks ?? 0) > 0 || (project.analysis?.progressSummary.overdueTasks ?? 0) > 0) ?? [], [portfolio.data])
  const attentionPagination = useClientPagination(attention, 8)
  const periodsPagination = useClientPagination(periods, 8)
  const visibleSelected = portfolio.data?.projects.items.filter(project => selectedIds.includes(project.id)) ?? []
  const statusOptions = [...(portfolio.data?.summary?.projectStates?.map(item => item.status) ?? [])]
  if (status && !statusOptions.includes(status)) statusOptions.push(status)
  function updateFilter(key: 'q' | 'status', value: string) {
    setSearchParams(previous => { const next = new URLSearchParams(previous); if (value) next.set(key, value); else next.delete(key); return next }, { replace: true })
    setPortfolioPage(1)
    setSelectedIds([])
  }
  function toggleProject(id: number) { setSelectedIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]) }

  return <WorkspacePage className="space-y-5" title="Quản lý đồ án bộ môn" eyebrow="Không gian bộ môn" description={`${departmentName}. Theo dõi danh mục đồ án, hồ sơ chờ thẩm định và nguồn lực hướng dẫn.`} action={
    <div className="flex flex-wrap items-center gap-2">
      <Link className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-primary/20 bg-primary-subtle px-3.5 text-xs font-semibold text-primary transition-all hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to="/department/projects/progress-matrix">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">view_timeline</span>
        Ma trận Tiến độ Gates
      </Link>
      <Link className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-white shadow-2xs transition-all hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to="/department/projects/review">
        Thẩm định đề cương
      </Link>
    </div>
  }>

    <StatTileRow tiles={[
      { icon: 'priority_high', label: 'Việc cần xử lý', value: urgent.data?.totalCount ?? null, caption: urgent.data?.hasMore ? 'Danh sách việc khẩn còn trang tiếp theo.' : 'Theo bộ môn trong phiên hiện tại.', hero: true },
      { icon: 'fact_check', label: 'Chờ thẩm định', value: reviews.data?.totalCount ?? null, tone: 'warning' },
      { icon: 'folder_managed', label: 'Đồ án quản lý', value: portfolio.data?.summary.totalProjects ?? null, tone: 'info' },
      { icon: 'supervisor_account', label: 'Giảng viên trong bộ môn', value: supervisors.data?.totalCount ?? null, tone: 'success' },
    ]} />

    <div className="space-y-3">
      <WorkspaceTabs
        activeId={activeTab}
        onChange={setActiveTab}
        ariaLabel="Điều hướng khu vực quản trị bộ môn"
        tabs={[
          { id: 'all', label: 'Tổng quan', icon: 'dashboard' },
          { id: 'queue', label: 'Việc cần xử lý', icon: 'bolt', count: urgent.data?.totalCount ?? reviews.data?.totalCount ?? null, badgeTone: (urgent.data?.totalCount ?? 0) > 0 ? 'warning' : 'default' },
          { id: 'portfolio', label: 'Danh mục đồ án', icon: 'folder_managed', count: portfolio.data?.summary.totalProjects ?? null },
          { id: 'periods', label: 'Kỳ đồ án & Quy chế', icon: 'tune', count: academic.status === 'ready' ? periods.length : null },
        ]}
      />
      <DepartmentWorkflowGuide />
    </div>

    {!departmentIds ? <p role="alert" className="rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">Chưa xác định được bộ môn từ phiên đăng nhập. Không truy vấn phạm vi khác.</p> : !['success', 'empty', 'loading'].includes(urgent.state) && <SectionState section={urgent} onRetry={urgent.refresh}><span /></SectionState>}
    {!['success', 'empty', 'loading'].includes(supervisors.state) && <SectionState section={supervisors} onRetry={supervisors.refresh}><span /></SectionState>}

    {(activeTab === 'all' || activeTab === 'queue') && (
      <section id="action-queue" aria-labelledby="urgent-actions-heading" className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
        {/* Sub-block A: Hồ sơ thẩm định đề cương gần nhất */}
        <div className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs xl:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
            <h2 id="urgent-actions-heading" className="flex items-center gap-2 text-sm font-bold text-ink">
              <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">fact_check</span>
              Đề cương chờ thẩm định
            </h2>
            <div className="flex items-center gap-2">
              <StatusBadge tone="info" label={`${reviews.data?.totalCount ?? '—'} hồ sơ`} />
              <Link to="/department/projects/review" className="workspace-action-link text-xs font-semibold">
                Hàng đợi →
              </Link>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <SectionState section={reviews} onRetry={reviews.refresh}>
              <div className="space-y-2.5">
                {reviews.data?.items.map((project) => (
                  <article key={project.id} className="rounded-xl border border-hairline bg-canvas/40 p-3.5 transition-all hover:border-primary/40 hover:bg-card hover:shadow-2xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-mono text-xs font-bold text-primary">{project.code}</p>
                          <StatusBadge tone={projectStatusTone(project.status)} label={projectStatusLabel(project.status)} />
                        </div>
                        <h3 className="mt-1 break-words text-sm font-semibold text-ink">{project.title}</h3>
                        <p className="mt-1 truncate text-xs text-ink-muted">
                          {project.teamName} · {project.majors.map((major) => major.majorCode).join(', ') || 'Chưa xác định ngành'}
                        </p>
                      </div>
                      <Link className="workspace-action-link shrink-0 self-center text-xs font-semibold" to={`/department/projects/review/${project.id}`}>
                        Xem thẩm định
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </SectionState>
          </div>
        </div>

        {/* Sub-block B: Đồ án có tín hiệu cần xử lý (Attention Signals) */}
        <div id="attention" className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs xl:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
              <span className="material-symbols-outlined text-[18px] text-status-warning-text" aria-hidden="true">warning</span>
              Đồ án có tín hiệu cần chú ý
            </h2>
            <StatusBadge tone={attention.length > 0 ? 'warning' : 'success'} label={`${attention.length} đồ án`} />
          </div>

          <div className="space-y-3 p-4 sm:p-5">
            <SectionState section={portfolio} onRetry={portfolio.refresh}>
              {attention.length ? (
                <div className="space-y-2.5">
                  {attentionPagination.paginatedItems.map((project) => (
                    <article key={project.id} className="rounded-xl border border-hairline bg-canvas/40 p-3.5 transition-all hover:border-status-warning-border hover:bg-card hover:shadow-2xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-ink">{project.code} · {project.title}</h3>
                          <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-ink-muted">
                            <Signal label="Báo cáo chờ duyệt" value={project.pendingProgressReviews} />
                            <Signal label="Bị chặn" value={project.analysis?.progressSummary.blockedTasks ?? 0} />
                            <Signal label="Quá hạn" value={project.analysis?.progressSummary.overdueTasks ?? 0} />
                          </div>
                        </div>
                        <Link
                          className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-hairline bg-card px-3 text-xs font-semibold text-primary transition-colors hover:border-primary hover:bg-primary-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          to={`/department/projects/${project.id}/governance`}
                        >
                          Mở hồ sơ
                        </Link>
                      </div>
                    </article>
                  ))}
                  {attentionPagination.showPagination && (
                    <Pagination
                      page={attentionPagination.page}
                      pages={attentionPagination.totalPages}
                      total={attentionPagination.total}
                      pageSize={attentionPagination.pageSize}
                      onPage={attentionPagination.setPage}
                    />
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-status-success-border bg-status-success-bg p-4 text-xs font-medium text-status-success-text">
                  <span className="material-symbols-outlined text-[18px] text-status-success-text" aria-hidden="true">check_circle</span>
                  Không có tín hiệu cần chú ý trong trang danh mục này.
                </div>
              )}
            </SectionState>
          </div>
        </div>
      </section>
    )}

    {(activeTab === 'all' || activeTab === 'portfolio') && (
      <section id="monitoring" aria-labelledby="portfolio-heading" className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-canvas/70 px-5 py-3.5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="portfolio-heading" className="font-heading text-base font-bold text-ink">Danh mục đồ án gần đây</h2>
              {portfolio.data && <StatusBadge tone="neutral" label={`${portfolio.data.projects.totalCount} đồ án`} />}
            </div>
            <p className="text-xs text-ink-muted">{departmentName} · {academic.academic?.selectedSemester?.name ?? 'Kỳ đang chọn'}</p>
          </div>
          <Link to="/department/portfolio" className="workspace-action-link text-xs font-semibold">Mở danh mục đầy đủ →</Link>
        </header>

        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-48 flex-1 text-xs font-semibold text-ink-soft">Tìm đồ án
              <input type="search" value={search} onChange={event => updateFilter('q', event.target.value)} placeholder="Mã hoặc tên đồ án…" className="mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" />
            </label>
            <label className="min-w-44 text-xs font-semibold text-ink-soft">Trạng thái
              <select value={status} onChange={event => updateFilter('status', event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <option value="">Tất cả trạng thái</option>
                {statusOptions.map(value => <option key={value} value={value}>{projectStatusLabel(value)}</option>)}
              </select>
            </label>
          </div>

          {portfolio.state === 'empty' ? (
            <p className="rounded-lg border border-hairline bg-canvas p-4 text-sm text-ink-muted">
              {search || status ? 'Không có đồ án khớp bộ lọc hiện tại.' : 'Chưa có đồ án trong phạm vi bộ môn hiện tại.'}
            </p>
          ) : portfolio.state === 'success' && portfolio.data ? (
            <>
              <BulkActionBar count={visibleSelected.length} noun="đồ án" blocked={visibleSelected.filter(project => project.status === 'ARCHIVED').map(project => ({ id: project.id, label: project.code, reason: 'Đã lưu trữ; chỉ có thể xem hồ sơ.' }))} onClear={() => setSelectedIds([])}>
                {visibleSelected.length === 1 ? <Link to={`/department/projects/${visibleSelected[0].id}/governance`} className="workspace-action-link">Mở hồ sơ đã chọn</Link> : <span className="text-xs text-ink-muted">Quyết định được xử lý trong từng hồ sơ.</span>}
              </BulkActionBar>
              <Table stack aria-label="Danh mục đồ án">
                <TableHead>
                  <TableRow head>
                    <TableHeaderCell>Chọn</TableHeaderCell>
                    <TableHeaderCell>Đồ án</TableHeaderCell>
                    <TableHeaderCell>Trạng thái</TableHeaderCell>
                    <TableHeaderCell>Mở hồ sơ</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {portfolio.data.projects.items.map(project => (
                    <TableRow key={project.id}>
                      <TableCell label="Chọn">
                        <input type="checkbox" aria-label={`Chọn ${project.code}`} checked={selectedIds.includes(project.id)} onChange={() => toggleProject(project.id)} />
                      </TableCell>
                      <TableCell label="Đồ án">
                        <strong className="block text-ink">{project.title}</strong>
                        <span className="font-mono text-xs text-ink-muted">{project.code} · {project.departmentName ?? departmentName}</span>
                      </TableCell>
                      <TableCell label="Trạng thái">
                        <StatusBadge tone={projectStatusTone(project.status)} label={projectStatusLabel(project.status)} />
                      </TableCell>
                      <TableCell label="Mở hồ sơ">
                        <Link to={`/department/projects/${project.id}/governance`} className="workspace-action-link">Xem hồ sơ</Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {portfolio.data.projects.totalPages > 1 ? (
                <Pagination
                  page={portfolio.data.projects.page}
                  pages={portfolio.data.projects.totalPages}
                  total={portfolio.data.projects.totalCount}
                  pageSize={portfolio.data.projects.pageSize}
                  onPage={(next) => { setSelectedIds([]); setPortfolioPage(next) }}
                />
              ) : (
                <p className="text-xs text-ink-muted">Hiển thị {portfolio.data.projects.items.length} trong {portfolio.data.projects.totalCount} đồ án</p>
              )}
            </>
          ) : <SectionState section={portfolio} onRetry={portfolio.refresh}><span /></SectionState>}
        </div>
      </section>
    )}

    {(activeTab === 'all' || activeTab === 'periods') && (
      <section id="configuration" aria-labelledby="periods-heading" className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
        {/* Kỳ đồ án hiện tại */}
        <section id="periods" className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs xl:col-span-8">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">date_range</span>
              <h2 id="periods-heading" className="text-sm font-bold text-ink">Kỳ đồ án trong học kỳ</h2>
              {academic.status === 'ready' && <StatusBadge tone="neutral" label={`${periods.length} kỳ`} />}
            </div>
            <Link to="/academic/governance" className="inline-flex min-h-9 items-center rounded-md px-2 text-xs font-semibold text-primary hover:bg-primary-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              Quản lý học vụ →
            </Link>
          </header>

          <div className="space-y-3 p-5">
            {academic.status === 'loading' || academic.status === 'idle' ? (
              <p role="status" className="rounded-xl border border-hairline bg-canvas p-4 text-xs text-ink-muted">
                Đang tải kỳ đồ án…
              </p>
            ) : academic.status === 'ready' ? (
              periods.length ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {periodsPagination.paginatedItems.map((period) => (
                      <article key={period.id} className="space-y-2 rounded-xl border border-hairline bg-canvas/40 p-4 transition-colors hover:border-primary/40 hover:bg-card">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-semibold uppercase text-primary">
                              {displayLabel(period.periodType)}
                            </p>
                            <h3 className="mt-0.5 text-sm font-bold text-ink">{period.name}</h3>
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
                  {periodsPagination.showPagination && (
                    <Pagination
                      page={periodsPagination.page}
                      pages={periodsPagination.totalPages}
                      total={periodsPagination.total}
                      pageSize={periodsPagination.pageSize}
                      onPage={periodsPagination.setPage}
                    />
                  )}
                </>
              ) : (
                <p className="rounded-xl border border-hairline bg-canvas p-4 text-xs text-ink-muted">
                  Chưa có kỳ đồ án trong học kỳ hiện tại.
                </p>
              )
            ) : (
              <p role="alert" className="rounded-xl border border-status-warning-border bg-status-warning-bg p-4 text-xs text-status-warning-text">
                Không thể tải thông tin kỳ đồ án. Các khu vực khác vẫn hoạt động bình thường.
              </p>
            )}
          </div>
        </section>

        {/* Điều hướng nhanh duy nhất (gộp không trùng lặp) + Ghi chú quyền */}
        <div className="space-y-4 xl:col-span-4">
          <section className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs">
            <header className="flex items-center gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
              <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">explore</span>
              <h2 className="text-sm font-bold text-ink">Điều hướng nhanh bộ môn</h2>
            </header>
            <nav aria-label="Điều hướng nhanh bộ môn" className="divide-y divide-hairline">
              <Link className="flex min-h-11 items-center justify-between gap-3 px-4 text-xs font-semibold text-ink-soft transition-colors hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary" to="/department/supervisors">
                <span className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">supervisor_account</span>
                  Giảng viên hướng dẫn
                </span>
                <span className="material-symbols-outlined text-[16px] text-ink-muted" aria-hidden="true">arrow_forward</span>
              </Link>
              <Link className="flex min-h-11 items-center justify-between gap-3 px-4 text-xs font-semibold text-ink-soft transition-colors hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary" to="/department/topics">
                <span className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">lightbulb</span>
                  Quản lý đề tài
                </span>
                <span className="material-symbols-outlined text-[16px] text-ink-muted" aria-hidden="true">arrow_forward</span>
              </Link>
              <Link className="flex min-h-11 items-center justify-between gap-3 px-4 text-xs font-semibold text-ink-soft transition-colors hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary" to="/department/student-qualifications">
                <span className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">verified</span>
                  Xác minh điều kiện sinh viên
                </span>
                <span className="material-symbols-outlined text-[16px] text-ink-muted" aria-hidden="true">arrow_forward</span>
              </Link>
              <Link className="flex min-h-11 items-center justify-between gap-3 px-4 text-xs font-semibold text-ink-soft transition-colors hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary" to="/academic/review-gates">
                <span className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">rule_settings</span>
                  Chính sách Review Gates
                </span>
                <span className="material-symbols-outlined text-[16px] text-ink-muted" aria-hidden="true">arrow_forward</span>
              </Link>
              <Link className="flex min-h-11 items-center justify-between gap-3 px-4 text-xs font-semibold text-ink-soft transition-colors hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary" to="/academic">
                <span className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">account_balance</span>
                  Cấu trúc đào tạo
                </span>
                <span className="material-symbols-outlined text-[16px] text-ink-muted" aria-hidden="true">arrow_forward</span>
              </Link>
              <Link className="flex min-h-11 items-center justify-between gap-3 px-4 text-xs font-semibold text-ink-soft transition-colors hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary" to="/academic/rubrics">
                <span className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">grading</span>
                  Bộ tiêu chí Rubric
                </span>
                <span className="material-symbols-outlined text-[16px] text-ink-muted" aria-hidden="true">arrow_forward</span>
              </Link>
            </nav>
          </section>

          <div className="rounded-xl border border-hairline bg-primary-subtle/50 p-4" aria-label="Phạm vi thao tác">
            <div className="flex gap-3">
              <span className="material-symbols-outlined shrink-0 text-[20px] text-primary" aria-hidden="true">verified_user</span>
              <div>
                <h3 className="text-xs font-bold text-ink">Quyền theo từng hồ sơ</h3>
                <p className="mt-0.5 text-xs leading-5 text-ink-muted">
                  Thao tác đánh giá, phân công và công bố kết quả chỉ xuất hiện trong hồ sơ đồ án khi tài khoản có đủ quyền và dữ liệu đã sẵn sàng.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    )}
  </WorkspacePage>
}

function projectStatusTone(status: string | null | undefined): BadgeTone {
  switch ((status ?? '').toUpperCase()) {
    case 'ACTIVE':
    case 'APPROVED':
    case 'COMPLETED':
      return 'success'
    case 'UNDER_REVIEW':
    case 'SUBMITTED':
    case 'REVISION_REQUIRED':
    case 'PENDING':
      return 'warning'
    case 'REJECTED':
    case 'CANCELLED':
      return 'danger'
    case 'ARCHIVED':
    case 'DRAFT':
      return 'neutral'
    default:
      return 'info'
  }
}

function Signal({ label, value }: { label: string; value: number }) {
  return <span>{label}: <strong className="font-mono text-ink">{value}</strong></span>
}

function formatPeriodDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })
}

