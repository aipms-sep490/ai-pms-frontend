import { projectStatusLabel } from '../../projects/utils/project-status'
import { displayLabel } from '../../../components/ui/display-label'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { getSupervisorDashboard, type DashboardFilter, type DashboardProject, type SupervisorDashboard } from '../api/dashboard-api'
import { env } from '../../../app/config/env'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { Button } from '../../../components/ui/Button'
import { PageLoading } from '../../../components/ui/PageLoading'
import { ActorDashboardCard } from '../components/ActorDashboardCard'

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

  return <WorkspacePage className="mk-page-enter space-y-6" eyebrow="Không gian giảng viên" title="Tổng quan hướng dẫn" description="Theo dõi khối lượng hướng dẫn, báo cáo chờ phản hồi và các đồ án cần chú ý." action={<Button variant="outline" icon="refresh" disabled={loading} onClick={() => void load()}>Tải lại</Button>}>
    <ActorDashboardCard />
    <form className="workspace-surface flex flex-wrap gap-4 p-6" onSubmit={applyFilter}>
      <label className="flex min-w-52 flex-1 flex-col gap-1 text-sm font-medium text-ink-soft" htmlFor="supervisor-dashboard-search">Tìm đồ án<input id="supervisor-dashboard-search" value={searchInput} onChange={event => setSearchInput(event.target.value)} className="min-h-11 rounded-lg border border-hairline bg-card px-3 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" placeholder="Mã hoặc tên đồ án" /></label>
      <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft" htmlFor="supervisor-dashboard-status">Trạng thái<select id="supervisor-dashboard-status" value={filter.status ?? ''} onChange={event => setFilter(current => ({ ...current, status: event.target.value || undefined, page: 1 }))} className="min-h-11 rounded-lg border border-hairline bg-card px-3 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><option value="">Tất cả</option>{statuses.map(status => <option key={status} value={status}>{projectStatusLabel(status)}</option>)}</select></label>
      <button type="submit" className="min-h-11 self-end rounded-lg border border-hairline px-4 text-sm font-semibold text-primary hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Áp dụng</button>
    </form>
    {error && <div role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><p className="font-semibold">Chưa tải được tổng quan</p><p className="mt-1">{error}</p><button type="button" className="mt-2 min-h-11 font-semibold underline underline-offset-4" onClick={() => void load()}>Tải lại</button></div>}
    {loading && <PageLoading label="Đang tải tổng quan hướng dẫn…" />}
    {!loading && !error && data && <>
      <section aria-label="Chỉ số khối lượng" className="workspace-metrics"><Metric label="Đồ án được phân công" value={data.workload.assignedProjects} /><Metric label="Báo cáo chờ duyệt" value={data.pendingProgressReviews} tone={data.pendingProgressReviews > 0 ? 'warning' : 'neutral'} /><Metric label="Công việc quá hạn" value={data.overdueTasks} tone={data.overdueTasks > 0 ? 'error' : 'neutral'} /><Metric label="Đồ án / hạn mức" value={data.workload.profileMaxActiveProjects === null ? 'Chưa cấu hình' : `${data.workload.assignedProjects}/${data.workload.profileMaxActiveProjects}`} tone={!data.workload.hasProfile || !data.workload.isAvailable ? 'warning' : 'success'} /></section>

      {/* Quick Action Inbox (P1.1) */}
      {(() => {
        const urgentProjects = data.projects.items.filter(
          p => p.pendingProgressReviews > 0 ||
               (p.analysis?.progressSummary?.overdueTasks ?? 0) > 0 ||
               (p.analysis?.progressSummary?.blockedTasks ?? 0) > 0 ||
               p.analysis?.riskLevel === 'HIGH'
        )
        if (!urgentProjects.length) return null
        return (
          <section aria-label="Hộp thư duyệt nhanh" className="rounded-xl border border-warning-strong bg-status-warning-bg/70 p-5 shadow-xs">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-status-warning-border/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-status-warning-text text-xl" aria-hidden="true">
                  mark_email_unread
                </span>
                <div>
                  <h2 className="text-base font-bold text-status-warning-text">
                    Hộp thư duyệt nhanh & Việc khẩn cấp (Action Inbox)
                  </h2>
                  <p className="text-xs text-status-warning-text">
                    Có {urgentProjects.length} đồ án đang có báo cáo tiến độ chờ xác nhận hoặc công việc quá hạn/vướng mắc.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full bg-status-warning-bg px-3 py-1 text-xs font-bold text-status-warning-text">
                {data.pendingProgressReviews} báo cáo chờ phản hồi
              </span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {urgentProjects.map(proj => (
                <div
                  key={proj.id}
                  className="flex flex-col justify-between rounded-lg border border-status-warning-border bg-card p-4 shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-sm font-bold text-ink">{proj.code}</strong>
                      {proj.pendingProgressReviews > 0 ? (
                        <span className="rounded-md bg-status-warning-bg px-2 py-0.5 text-xs font-bold text-status-warning-text border border-warning-strong">
                          {proj.pendingProgressReviews} báo cáo chờ duyệt
                        </span>
                      ) : proj.analysis?.riskLevel === 'HIGH' ? (
                        <span className="rounded-md bg-status-error-bg px-2 py-0.5 text-xs font-bold text-danger-text border border-status-error-border">
                          Rủi ro cao
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-1 text-xs font-semibold text-ink line-clamp-1">{proj.title}</h3>
                    <p className="mt-1 text-xs text-ink-muted">
                      Bộ môn: {proj.departmentName ?? 'Chưa có bộ môn'}
                      {(proj.analysis?.progressSummary?.overdueTasks ?? 0) > 0 && (
                        <span className="ml-2 text-danger-text font-semibold">
                          · {proj.analysis?.progressSummary?.overdueTasks} việc quá hạn
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5">
                    <Link
                      to={`/supervisor/projects/${proj.id}/reports`}
                      className="inline-flex min-h-9 items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-bold text-white shadow-2xs hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <span className="material-symbols-outlined text-sm" aria-hidden="true">
                        assignment
                      </span>
                      Xem & Duyệt báo cáo
                    </Link>
                    <Link
                      to={`/supervisor/projects/${proj.id}/workspace`}
                      className="inline-flex min-h-9 items-center gap-1 rounded-md border border-hairline bg-card px-2.5 py-1 text-xs font-semibold text-ink-soft hover:bg-canvas"
                    >
                      Vào không gian
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-3 text-xs text-status-warning-text italic">
              * Nhận xét và xác nhận báo cáo của Giảng viên hướng dẫn ghi nhận sự đồng hành chuyên môn; thẩm định đạt cổng chính thức do Thẩm định viên (Reviewer) độc lập phê duyệt.
            </p>
          </section>
        )
      })()}

      <section className="workspace-surface workspace-surface-padding mt-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-heading font-semibold text-ink">Đồ án phụ trách</h2><p className="mt-1 text-sm text-ink-muted">Dữ liệu tại {formatAsOf(data.asOfUtc)}.</p></div><StatusCounts counts={data.projectStates} /></div>{data.projects.items.length === 0 ? <p className="mt-4 text-sm text-ink-muted">Không có đồ án phù hợp với bộ lọc hiện tại.</p> : <ul className="mt-4 divide-y divide-hairline">{data.projects.items.map(project => <ProjectRow key={project.id} project={project} />)}</ul>}</section>
      <Pagination page={filter.page ?? 1} totalPages={data.projects.totalPages} disabled={loading} onChange={page => setFilter(current => ({ ...current, page }))} />
    </>}
  </WorkspacePage>
}

function Metric({ label, value, tone = 'neutral' }: { label: string; value: number | string; tone?: 'neutral' | 'success' | 'warning' | 'error' }) {
  const tones = { neutral: 'border-hairline', success: 'border-status-success-border bg-status-success-bg', warning: 'border-status-warning-border bg-status-warning-bg', error: 'border-status-error-border bg-status-error-bg' }
  return <div className={`workspace-metric rounded-xl border p-4 ${tones[tone]}`}><p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p><p className="mt-2 text-2xl font-bold tabular-nums text-ink">{value}</p></div>
}

function StatusCounts({ counts }: { counts: SupervisorDashboard['projectStates'] }) {
  return <ul className="flex flex-wrap gap-2" aria-label="Phân bố trạng thái đồ án">{counts.map(item => <li key={item.status} className="rounded-full bg-primary-subtle px-2.5 py-1 text-xs font-medium text-primary">{displayLabel(item.status)}: {item.count}</li>)}</ul>
}

function ProjectRow({ project }: { project: DashboardProject }) {
  const risk = project.analysis?.riskLevel
  const progressPct = project.analysis?.progressSummary?.progressPercentage
  const hasPending = project.pendingProgressReviews > 0
  return <li className="flex flex-wrap items-center justify-between gap-4 py-4 text-sm transition-colors hover:bg-canvas/50 rounded-lg px-3">
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-ink text-base">{project.code} · {project.title}</p>
        <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-ink-soft">{displayLabel(project.status)}</span>
        {env.aiAdvisoryEnabled && risk && <span className={risk === 'HIGH' ? 'rounded-full bg-status-error-bg px-2 py-0.5 text-xs font-semibold text-status-error-text' : 'rounded-full bg-status-warning-bg px-2 py-0.5 text-xs font-semibold text-status-warning-text'}>Rủi ro: {displayLabel(risk)}</span>}
      </div>
      <p className="mt-1.5 text-xs text-ink-muted">
        Bộ môn: <strong className="text-ink-soft">{project.departmentName ?? 'Chưa có bộ môn'}</strong>
        {hasPending ? <span className="ml-3 inline-flex items-center rounded-md bg-status-warning-bg px-2 py-0.5 font-bold text-status-warning-text">⚠️ {project.pendingProgressReviews} báo cáo chờ duyệt</span> : <span className="ml-3 text-ink-muted">0 báo cáo chờ duyệt</span>}
      </p>
      {progressPct != null && (
        <div className="mt-2.5 flex items-center gap-3 max-w-xs">
          <div className="h-1.5 flex-1 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }} />
          </div>
          <span className="text-xs font-semibold tabular-nums text-ink-soft">{progressPct}% tiến độ</span>
        </div>
      )}
    </div>
    {project.status === 'ACTIVE' && (
      <Link className="inline-flex min-h-10 items-center justify-center rounded-lg border border-primary bg-card px-4 text-xs font-bold text-primary hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors shadow-2xs" to={`/supervisor/projects/${project.id}/workspace`}>
        Mở không gian đồ án
      </Link>
    )}
  </li>
}

function Pagination({ page, totalPages, disabled, onChange }: { page: number; totalPages: number; disabled: boolean; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null
  return <nav aria-label="Trang đồ án phụ trách" className="flex items-center justify-between gap-3 text-sm"><button type="button" disabled={disabled || page <= 1} className="min-h-11 rounded-lg border border-hairline px-4 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50" onClick={() => onChange(page - 1)}>Trang trước</button><span className="tabular-nums text-ink-muted">Trang {page} / {totalPages}</span><button type="button" disabled={disabled || page >= totalPages} className="min-h-11 rounded-lg border border-hairline px-4 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50" onClick={() => onChange(page + 1)}>Trang sau</button></nav>
}

function formatAsOf(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date) }
