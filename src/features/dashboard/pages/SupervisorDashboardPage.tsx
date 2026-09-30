import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { getSupervisorDashboard, type DashboardFilter, type DashboardProject, type SupervisorDashboard } from '../api/dashboard-api'
import { env } from '../../../app/config/env'

const statuses = ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'FINAL_SUBMISSION', 'COMPLETED', 'ARCHIVED']

export function SupervisorDashboardPage() {
  const [data, setData] = useState<SupervisorDashboard | null>(null)
  const [filter, setFilter] = useState<DashboardFilter>({ page: 1, pageSize: 20 })
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await getSupervisorDashboard(filter))
      setError(null)
    } catch (reason) {
      setError(reason instanceof HttpError && reason.status === 403
        ? 'Backend không cấp quyền xem dashboard GVHD này.'
        : 'Không thể tải dashboard GVHD. Hãy thử lại.')
    } finally { setLoading(false) }
  }, [filter])

  useEffect(() => { void load() }, [load])

  const applyFilter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFilter(current => ({ ...current, search: searchInput.trim() || undefined, page: 1 }))
  }

  return <main className="mx-auto max-w-6xl space-y-5 pb-12">
    <header className="space-y-1"><p className="font-mono text-xs font-semibold uppercase tracking-wide text-primary">Supervisor workspace</p><h1 className="font-heading text-2xl font-bold text-slate-950">Tổng quan GVHD</h1><p className="max-w-3xl text-sm leading-6 text-slate-600">Khối lượng, deadline và phạm vi đồ án đều do Backend xác định theo phân công hiện tại.</p></header>
    <form className="flex flex-wrap gap-3 rounded-xl border border-hairline bg-card p-4 shadow-xs" onSubmit={applyFilter}>
      <label className="flex min-w-52 flex-1 flex-col gap-1 text-sm font-medium text-slate-800" htmlFor="supervisor-dashboard-search">Tìm đồ án<input id="supervisor-dashboard-search" value={searchInput} onChange={event => setSearchInput(event.target.value)} className="min-h-11 rounded-lg border border-hairline bg-card px-3 text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" placeholder="Mã hoặc tên đồ án" /></label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-800" htmlFor="supervisor-dashboard-status">Trạng thái<select id="supervisor-dashboard-status" value={filter.status ?? ''} onChange={event => setFilter(current => ({ ...current, status: event.target.value || undefined, page: 1 }))} className="min-h-11 rounded-lg border border-hairline bg-card px-3 text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><option value="">Tất cả</option>{statuses.map(status => <option key={status} value={status}>{status}</option>)}</select></label>
      <button type="submit" className="min-h-11 self-end rounded-lg border border-hairline px-4 text-sm font-semibold text-primary hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Áp dụng</button>
    </form>
    {error && <div role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><p className="font-semibold">Không thể tải dashboard</p><p className="mt-1">{error}</p><button type="button" className="mt-2 min-h-11 font-semibold underline underline-offset-4" onClick={() => void load()}>Tải lại</button></div>}
    {loading && <p role="status" className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-700">Đang tải dashboard…</p>}
    {!loading && data && <>
      <section aria-label="Chỉ số khối lượng" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Đồ án được phân công" value={data.workload.assignedProjects} /><Metric label="Báo cáo chờ duyệt" value={data.pendingProgressReviews} tone={data.pendingProgressReviews > 0 ? 'warning' : 'neutral'} /><Metric label="Task quá hạn" value={data.overdueTasks} tone={data.overdueTasks > 0 ? 'error' : 'neutral'} /><Metric label="Sức chứa" value={data.workload.profileMaxActiveProjects === null ? 'Chưa cấu hình' : `${data.workload.assignedProjects}/${data.workload.profileMaxActiveProjects}`} tone={!data.workload.hasProfile || !data.workload.isAvailable ? 'warning' : 'success'} /></section>
      <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-heading font-semibold text-slate-950">Đồ án phụ trách</h2><p className="mt-1 text-sm text-slate-600">Dữ liệu tại {formatAsOf(data.asOfUtc)}.</p></div><StatusCounts counts={data.projectStates} /></div>{data.projects.items.length === 0 ? <p className="mt-4 text-sm text-slate-600">Không có đồ án phù hợp với bộ lọc hiện tại.</p> : <ul className="mt-4 divide-y divide-hairline">{data.projects.items.map(project => <ProjectRow key={project.id} project={project} />)}</ul>}</section>
      <Pagination page={filter.page ?? 1} totalPages={data.projects.totalPages} disabled={loading} onChange={page => setFilter(current => ({ ...current, page }))} />
    </>}
  </main>
}

function Metric({ label, value, tone = 'neutral' }: { label: string; value: number | string; tone?: 'neutral' | 'success' | 'warning' | 'error' }) {
  const tones = { neutral: 'border-hairline', success: 'border-status-success-border', warning: 'border-status-warning-border', error: 'border-status-error-border' }
  return <div className={`rounded-xl border bg-card p-4 shadow-xs ${tones[tone]}`}><p className="text-xs font-medium text-slate-600">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums text-slate-950">{value}</p></div>
}

function StatusCounts({ counts }: { counts: SupervisorDashboard['projectStates'] }) {
  return <ul className="flex flex-wrap gap-2" aria-label="Phân bố trạng thái đồ án">{counts.map(item => <li key={item.status} className="rounded-full bg-primary-subtle px-2.5 py-1 text-xs font-medium text-primary">{item.status}: {item.count}</li>)}</ul>
}

function ProjectRow({ project }: { project: DashboardProject }) {
  const risk = project.analysis?.riskLevel
  return <li className="flex flex-wrap items-start justify-between gap-3 py-4 text-sm"><div className="min-w-0"><p className="font-semibold text-slate-950">{project.code} · {project.title}</p><p className="mt-1 text-slate-600">{project.departmentName ?? 'Chưa có khoa'} · {project.pendingProgressReviews} báo cáo chờ duyệt</p><div className="mt-2 flex flex-wrap gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{project.status}</span>{env.aiAdvisoryEnabled && risk && <span className={risk === 'HIGH' ? 'rounded-full bg-status-error-bg px-2 py-1 text-xs font-medium text-status-error-text' : 'rounded-full bg-status-warning-bg px-2 py-1 text-xs font-medium text-status-warning-text'}>Rủi ro: {risk}</span>}</div></div>{project.status === 'ACTIVE' && <Link className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 hover:text-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to={`/supervisor/projects/${project.id}/workspace`}>Mở workspace</Link>}</li>
}

function Pagination({ page, totalPages, disabled, onChange }: { page: number; totalPages: number; disabled: boolean; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null
  return <nav aria-label="Trang đồ án phụ trách" className="flex items-center justify-between gap-3 text-sm"><button type="button" disabled={disabled || page <= 1} className="min-h-11 rounded-lg border border-hairline px-4 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50" onClick={() => onChange(page - 1)}>Trang trước</button><span className="tabular-nums text-slate-600">Trang {page} / {totalPages}</span><button type="button" disabled={disabled || page >= totalPages} className="min-h-11 rounded-lg border border-hairline px-4 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50" onClick={() => onChange(page + 1)}>Trang sau</button></nav>
}

function formatAsOf(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date) }
