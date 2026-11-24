import { projectStatusLabel } from '../../projects/utils/project-status'
import { displayLabel } from '../../../components/ui/display-label'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { getSupervisorDashboard, type DashboardFilter, type DashboardProject, type SupervisorDashboard } from '../api/dashboard-api'
import { env } from '../../../app/config/env'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { Button } from '../../../components/ui/Button'
import { PageLoading } from '../../../components/ui/PageLoading'
import { Pagination } from '../../../components/ui/Pagination'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useClientPagination } from '../../../components/ui/useClientPagination'
import { ActorDashboardCard } from '../components/ActorDashboardCard'
import { StatTileRow } from '../../../components/ui/StatTileRow'

const statuses = ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'FINAL_SUBMISSION', 'COMPLETED', 'ARCHIVED']

export function SupervisorDashboardPage() {
  const [data, setData] = useState<SupervisorDashboard | null>(null)
  const [filter, setFilter] = useState<DashboardFilter>({ page: 1, pageSize: 20 })
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const request = useRef(0)

  const load = useCallback(async () => {
    const current = ++request.current
    setLoading(true); setError(null)
    try {
      const result = await getSupervisorDashboard(filter)
      if (request.current === current) setData(result)
    } catch (reason) {
      if (request.current !== current) return
      setData(null)
      setError(reason instanceof HttpError && reason.status === 403
        ? 'Bạn chưa có quyền xem tổng quan hướng dẫn này.'
        : 'Chưa tải được tổng quan hướng dẫn. Hãy thử lại.')
    } finally { if (request.current === current) setLoading(false) }
  }, [filter])

  useEffect(() => {
    const pending = request
    void load()
    return () => { pending.current++ }
  }, [load])

  const applyFilter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFilter(current => ({ ...current, search: searchInput.trim() || undefined, page: 1 }))
  }

  const urgentProjects = useMemo(
    () => (data?.projects.items ?? []).filter(
      p => p.pendingProgressReviews > 0 ||
        (p.analysis?.progressSummary?.overdueTasks ?? 0) > 0 ||
        (p.analysis?.progressSummary?.blockedTasks ?? 0) > 0 ||
        p.analysis?.riskLevel === 'HIGH',
    ),
    [data],
  )
  const urgentPagination = useClientPagination(urgentProjects, 6)

  return <WorkspacePage className="mk-page-enter space-y-5" eyebrow="Không gian giảng viên" title="Tổng quan hướng dẫn" description="Theo dõi khối lượng hướng dẫn, báo cáo chờ phản hồi và các đồ án cần chú ý." action={<Button variant="outline" icon="refresh" disabled={loading} onClick={() => void load()}>Tải lại</Button>}>
    {error && <div role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><p className="font-semibold">Chưa tải được tổng quan</p><p className="mt-1">{error}</p><button type="button" className="mt-2 min-h-11 font-semibold underline underline-offset-4" onClick={() => void load()}>Tải lại</button></div>}
    {loading && <PageLoading label="Đang tải tổng quan hướng dẫn…" />}
    {!loading && !error && data && <>
      <section aria-label="Chỉ số khối lượng">
        <StatTileRow tiles={[
          {
            icon: 'folder_managed',
            label: 'Đồ án được phân công',
            value: data.workload.assignedProjects,
            hero: true,
            caption: data.workload.profileMaxActiveProjects === null
              ? 'Hạn mức hướng dẫn chưa cấu hình.'
              : `Đang hướng dẫn ${data.workload.assignedProjects}/${data.workload.profileMaxActiveProjects} hạn mức.`,
          },
          {
            icon: 'fact_check',
            label: 'Báo cáo chờ duyệt',
            value: data.pendingProgressReviews,
            tone: data.pendingProgressReviews > 0 ? 'warning' : 'neutral',
            caption: data.pendingProgressReviews > 0 ? 'Cần phản hồi tiến độ nhóm.' : 'Không có báo cáo tồn đọng.',
          },
          {
            icon: 'event_busy',
            label: 'Công việc quá hạn',
            value: data.overdueTasks,
            tone: data.overdueTasks > 0 ? 'danger' : 'neutral',
            caption: 'Trong các đồ án đang phụ trách.',
          },
          {
            icon: 'speed',
            label: 'Hạn mức hướng dẫn',
            value: data.workload.profileMaxActiveProjects,
            tone: !data.workload.hasProfile || !data.workload.isAvailable ? 'warning' : 'info',
            caption: data.workload.profileMaxActiveProjects === null
              ? 'Chưa cấu hình hạn mức.'
              : !data.workload.hasProfile || !data.workload.isAvailable
                ? 'Hồ sơ hiện chưa sẵn sàng nhận thêm.'
                : `Còn trống ${Math.max(0, data.workload.profileMaxActiveProjects - data.workload.assignedProjects)} suất nhận nhóm.`,
          },
        ]} />
      </section>

      {/* Quick Action Inbox (P1.1) with client pagination when > 6 items */}
      {urgentProjects.length > 0 && (
        <section aria-label="Hộp thư duyệt nhanh" className="overflow-hidden rounded-xl border border-status-warning-border bg-card shadow-xs">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-status-warning-border bg-status-warning-bg px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-status-warning-text text-xl" aria-hidden="true">
                mark_email_unread
              </span>
              <div>
                <h2 className="font-heading text-sm font-bold text-status-warning-text">
                  Hộp thư duyệt nhanh &amp; Việc khẩn cấp (Action Inbox)
                </h2>
                <p className="text-xs text-status-warning-text">
                  Có {urgentProjects.length} đồ án đang có báo cáo tiến độ chờ xác nhận hoặc công việc quá hạn/vướng mắc.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center rounded-full border border-status-warning-border bg-card px-3 py-1 text-xs font-bold tabular-nums text-status-warning-text">
              {data.pendingProgressReviews} báo cáo chờ phản hồi
            </span>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {urgentPagination.paginatedItems.map(proj => (
                <div
                  key={proj.id}
                  className="flex flex-col justify-between rounded-xl border border-hairline bg-canvas/50 p-4 shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <strong className="font-mono text-sm font-bold text-ink">{proj.code}</strong>
                      {proj.pendingProgressReviews > 0 ? (
                        <StatusBadge tone="warning" label={`${proj.pendingProgressReviews} báo cáo chờ duyệt`} />
                      ) : proj.analysis?.riskLevel === 'HIGH' ? (
                        <StatusBadge tone="danger" label="Rủi ro cao" />
                      ) : null}
                    </div>
                    <h3 className="mt-1.5 text-sm font-semibold text-ink line-clamp-1">{proj.title}</h3>
                    <p className="mt-1 text-xs text-ink-muted">
                      Bộ môn: {proj.departmentName ?? 'Chưa có bộ môn'}
                      {(proj.analysis?.progressSummary?.overdueTasks ?? 0) > 0 && (
                        <span className="ml-2 text-status-error-text font-semibold tabular-nums">
                          · {proj.analysis?.progressSummary?.overdueTasks} việc quá hạn
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-hairline pt-2.5">
                    <Link
                      to={`/supervisor/projects/${proj.id}/reports`}
                      className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-primary px-3 py-1 text-xs font-bold text-white shadow-2xs hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <span className="material-symbols-outlined text-sm" aria-hidden="true">
                        assignment
                      </span>
                      Xem &amp; Duyệt báo cáo
                    </Link>
                    <Link
                      to={`/supervisor/projects/${proj.id}/workspace`}
                      className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-hairline bg-card px-2.5 py-1 text-xs font-semibold text-ink-soft hover:border-primary/40 hover:text-primary"
                    >
                      Vào không gian
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {urgentPagination.showPagination && (
              <Pagination
                page={urgentPagination.page}
                pages={urgentPagination.totalPages}
                total={urgentPagination.total}
                pageSize={urgentPagination.pageSize}
                onPage={urgentPagination.setPage}
              />
            )}

            <p className="text-xs text-ink-muted italic">
              * Nhận xét và xác nhận báo cáo của Giảng viên hướng dẫn ghi nhận sự đồng hành chuyên môn; thẩm định đạt cổng chính thức do Thẩm định viên (Reviewer) độc lập phê duyệt.
            </p>
          </div>
        </section>
      )}
    </>}

    <form className="workspace-surface flex flex-wrap items-end gap-3 p-4" onSubmit={applyFilter}>
      <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs font-semibold text-ink-soft" htmlFor="supervisor-dashboard-search">Tìm đồ án<input id="supervisor-dashboard-search" value={searchInput} onChange={event => setSearchInput(event.target.value)} className="min-h-11 rounded-lg border border-line-strong bg-card px-3 text-sm font-normal text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" placeholder="Mã hoặc tên đồ án" /></label>
      <label className="flex min-w-44 flex-col gap-1 text-xs font-semibold text-ink-soft" htmlFor="supervisor-dashboard-status">Trạng thái<select id="supervisor-dashboard-status" value={filter.status ?? ''} onChange={event => setFilter(current => ({ ...current, status: event.target.value || undefined, page: 1 }))} className="min-h-11 rounded-lg border border-line-strong bg-card px-3 text-sm font-normal text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><option value="">Tất cả</option>{statuses.map(status => <option key={status} value={status}>{projectStatusLabel(status)}</option>)}</select></label>
      <button type="submit" className="min-h-11 rounded-lg border border-primary/30 bg-primary-subtle px-4 text-sm font-semibold text-primary hover:bg-primary hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Áp dụng</button>
      {(filter.search || filter.status) && (
        <button type="button" onClick={() => { setSearchInput(''); setFilter({ page: 1, pageSize: 20 }) }} className="min-h-11 rounded-lg border border-hairline bg-card px-3.5 text-sm font-semibold text-ink-soft hover:bg-canvas">Đặt lại</button>
      )}
    </form>

    {!loading && !error && data && <>
      <section className="workspace-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-canvas/70 px-5 py-3.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">school</span>
              <h2 className="font-heading text-sm font-bold text-ink">Đồ án phụ trách</h2>
              <span className="inline-flex items-center rounded-full border border-hairline bg-card px-2.5 py-0.5 text-xs font-bold tabular-nums text-ink-soft">
                {data.projects.totalCount}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink-muted">Dữ liệu tại {formatAsOf(data.asOfUtc)}.</p>
          </div>
          <StatusCounts counts={data.projectStates} />
        </div>
        <div className="px-5 py-2">
          {data.projects.items.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">Không có đồ án phù hợp với bộ lọc hiện tại.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {data.projects.items.map(project => <ProjectRow key={project.id} project={project} />)}
            </ul>
          )}
        </div>
      </section>

      {data.projects.totalPages > 1 && (
        <Pagination
          page={filter.page ?? 1}
          pages={data.projects.totalPages}
          total={data.projects.totalCount}
          pageSize={data.projects.pageSize}
          busy={loading}
          onPage={page => setFilter(current => ({ ...current, page }))}
        />
      )}
    </>}
    <ActorDashboardCard />
  </WorkspacePage>
}

function StatusCounts({ counts }: { counts: SupervisorDashboard['projectStates'] }) {
  return <ul className="flex flex-wrap gap-2" aria-label="Phân bố trạng thái đồ án">{counts.map(item => <li key={item.status} className="rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-1 text-xs font-semibold tabular-nums text-primary">{displayLabel(item.status)}: {item.count}</li>)}</ul>
}

function ProjectRow({ project }: { project: DashboardProject }) {
  const risk = project.analysis?.riskLevel
  const progressPct = project.analysis?.progressSummary?.progressPercentage
  const hasPending = project.pendingProgressReviews > 0
  return <li className="flex flex-wrap items-center justify-between gap-4 py-4 text-sm transition-colors hover:bg-canvas/50 rounded-lg px-2">
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-ink text-base">{project.code} · {project.title}</p>
        <StatusBadge status={project.status} tone="neutral" label={displayLabel(project.status)} />
        {env.aiAdvisoryEnabled && risk && <StatusBadge tone={risk === 'HIGH' ? 'danger' : 'warning'} label={`Rủi ro: ${displayLabel(risk)}`} />}
      </div>
      <p className="mt-1.5 text-xs text-ink-muted">
        Bộ môn: <strong className="text-ink-soft">{project.departmentName ?? 'Chưa có bộ môn'}</strong>
        {hasPending ? <span className="ml-3 inline-flex items-center rounded-md bg-status-warning-bg px-2 py-0.5 font-bold text-status-warning-text">Chờ duyệt: {project.pendingProgressReviews} báo cáo</span> : <span className="ml-3 text-ink-muted">0 báo cáo chờ duyệt</span>}
      </p>
      {progressPct != null && (
        <div className="mt-2.5 flex items-center gap-3 max-w-xs">
          <div className="h-1.5 flex-1 rounded-full bg-canvas border border-hairline overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }} />
          </div>
          <span className="text-xs font-semibold tabular-nums text-ink-soft">{progressPct}% tiến độ</span>
        </div>
      )}
    </div>
    {project.status === 'ACTIVE' && (
      <Link className="inline-flex min-h-11 items-center justify-center rounded-lg border border-primary bg-card px-4 text-xs font-bold text-primary hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors shadow-2xs" to={`/supervisor/projects/${project.id}/workspace`}>
        Mở không gian đồ án
      </Link>
    )}
  </li>
}

function formatAsOf(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date) }
