import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAcademicWorkflow } from '../../../app/context/useAcademicWorkflow'
import { Button } from '../../../components/ui/Button'
import { HttpError } from '../../../services/http/http-client'
import { getPortfolioDashboard, type PortfolioDashboard } from '../../dashboard/api/dashboard-api'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { getReviewQueue, type ReviewQueuePage, type ReviewProjectSummary } from '../../projects/api/project-review-api'
import { list as listSupervisors, type Page as SupervisorPage, type Supervisor } from '../../supervisors/api/supervisor-api'

type LoadState = 'loading' | 'success' | 'empty' | 'forbidden' | 'unsupported' | 'unavailable' | 'error'
interface Section<T> { state: LoadState; data: T | null; message: string | null }
const loading = <T,>(): Section<T> => ({ state: 'loading', data: null, message: null })

function describeError(error: unknown): Pick<Section<never>, 'state' | 'message'> {
  if (error instanceof HttpError) {
    if (error.status === 403) return { state: 'forbidden', message: 'Backend không cấp Department scope cho dữ liệu này.' }
    if ([404, 405, 501].includes(error.status)) return { state: 'unsupported', message: 'Backend chưa công bố contract cho khu vực này.' }
    if (error.status >= 500) return { state: 'unavailable', message: 'Dịch vụ Backend hiện không khả dụng.' }
  }
  return { state: 'error', message: 'Không thể tải dữ liệu từ Backend.' }
}

function useSection<T>(read: (() => Promise<T>) | null) {
  const [section, setSection] = useState<Section<T>>(loading)
  const refresh = useCallback(() => {
    if (!read) {
      setSection({ state: 'forbidden', data: null, message: 'Cần phiên Department hợp lệ.' })
      return
    }
    let active = true
    setSection(loading())
    void read().then((data) => {
      if (!active) return
      const isEmpty = Array.isArray(data) ? data.length === 0 : 'items' in (data as object) && Array.isArray((data as { items?: unknown }).items) && (data as { items: unknown[] }).items.length === 0
      setSection({ state: isEmpty ? 'empty' : 'success', data, message: null })
    }).catch((error: unknown) => {
      if (active) setSection({ data: null, ...describeError(error) })
    })
    return () => { active = false }
  }, [read])

  useEffect(() => refresh(), [refresh])
  return { ...section, refresh }
}

function SectionState({ section, onRetry, children }: { section: Section<unknown>; onRetry: () => void; children: ReactNode }) {
  if (section.state === 'loading') return <p role="status" className="rounded-xl border border-hairline bg-card p-4 text-sm text-slate-600">Đang tải dữ liệu…</p>
  if (section.state === 'forbidden' || section.state === 'unsupported' || section.state === 'unavailable' || section.state === 'error') return <section role="alert" className="rounded-xl border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-text"><p>{section.message}</p><Button className="mt-3" size="sm" variant="secondary" onClick={onRetry}>Thử lại</Button></section>
  if (section.state === 'empty') return <p className="rounded-xl border border-hairline bg-card p-4 text-sm text-slate-600">Chưa có dữ liệu trong Department scope hiện tại.</p>
  return <>{children}</>
}

/** Department-only foundation. It composes published reads and never derives an academic decision. */
export function DepartmentWorkspacePage() {
  const { session } = useAuthSession()
  const academic = useAcademicWorkflow()
  const token = session?.accessToken
  const reviewRead = useCallback(() => token ? getReviewQueue({ page: 1, pageSize: 5 }, token) : Promise.reject(new HttpError('Unauthenticated', 401)), [token])
  const portfolioRead = useCallback(() => getPortfolioDashboard('department', { page: 1, pageSize: 5, semesterId: academic.academic?.selectedSemester?.id }), [academic.academic?.selectedSemester?.id])
  const supervisorRead = useCallback(() => token ? listSupervisors(token, { page: 1, pageSize: 5 }) : Promise.reject(new HttpError('Unauthenticated', 401)), [token])
  const reviews = useSection<ReviewQueuePage<ReviewProjectSummary>>(reviewRead)
  const portfolio = useSection<PortfolioDashboard>(portfolioRead)
  const supervisors = useSection<SupervisorPage<Supervisor>>(supervisorRead)
  const periods = academic.academic?.periods ?? []
  const departmentName = academic.academic?.departments[0]?.name ?? 'Department scope'
  const attention = useMemo(() => portfolio.data?.projects.items.filter((project) => project.pendingProgressReviews > 0 || (project.analysis?.progressSummary.blockedTasks ?? 0) > 0 || (project.analysis?.progressSummary.overdueTasks ?? 0) > 0) ?? [], [portfolio.data])

  return <main className="mx-auto max-w-6xl space-y-6 pb-12">
    <header className="rounded-2xl border border-hairline bg-card p-5 shadow-xs sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[.14em] text-primary">Department-only governance</p>
      <h1 className="mt-1 font-heading text-2xl font-bold text-slate-950">Department Academic Governance Workspace</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{departmentName}. Các quyết định thẩm định chỉ xuất hiện từ workflow action do Backend trả về; dữ liệu tổng hợp không tự tạo quyền hoặc academic readiness.</p>
    </header>

    <nav aria-label="Department workspace" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <a className="min-h-11 rounded-lg border border-hairline bg-card px-4 py-3 text-sm font-semibold text-primary hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href="#overview">Overview</a>
      <a className="min-h-11 rounded-lg border border-hairline bg-card px-4 py-3 text-sm font-semibold text-primary hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href="#attention">Needs Attention</a>
      <Link className="min-h-11 rounded-lg border border-hairline bg-card px-4 py-3 text-sm font-semibold text-primary hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to="/department/portfolio">Project Portfolio</Link>
      <Link className="min-h-11 rounded-lg border border-hairline bg-card px-4 py-3 text-sm font-semibold text-primary hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to="/department/projects/review">Academic Operations</Link>
      <Link className="min-h-11 rounded-lg border border-hairline bg-card px-4 py-3 text-sm font-semibold text-primary hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to="/department/supervisors">Supervisors</Link>
      <a className="min-h-11 rounded-lg border border-hairline bg-card px-4 py-3 text-sm font-semibold text-primary hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href="#evaluation">Evaluation / Audit</a>
    </nav>

    <section id="overview" aria-labelledby="department-overview-heading" className="space-y-3 scroll-mt-4">
      <div><h2 id="department-overview-heading" className="font-heading text-xl font-bold text-slate-950">Overview</h2><p className="mt-1 text-sm text-slate-600">Các nguồn được tải độc lập; lỗi ở một nguồn không che các nguồn khác.</p></div>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-hairline bg-card p-4 shadow-xs"><h3 className="font-semibold text-slate-950">Academic review queue</h3><SectionState section={reviews} onRetry={reviews.refresh}>{<><p className="mt-2 text-3xl font-bold text-slate-950">{reviews.data?.totalCount ?? 0}</p><p className="mt-1 text-sm text-slate-600">Project do Backend trả về trong Department scope.</p><Link className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline" to="/department/projects/review">Mở queue</Link></>}</SectionState></section>
        <section className="rounded-2xl border border-hairline bg-card p-4 shadow-xs"><h3 className="font-semibold text-slate-950">Project portfolio</h3><SectionState section={portfolio} onRetry={portfolio.refresh}>{<><p className="mt-2 text-3xl font-bold text-slate-950">{portfolio.data?.summary.totalProjects ?? 0}</p><p className="mt-1 text-sm text-slate-600">Portfolio do Backend scope theo Department.</p><Link className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline" to="/department/portfolio">Xem portfolio</Link></>}</SectionState></section>
        <section className="rounded-2xl border border-hairline bg-card p-4 shadow-xs"><h3 className="font-semibold text-slate-950">Supervisor directory</h3><SectionState section={supervisors} onRetry={supervisors.refresh}>{<><p className="mt-2 text-3xl font-bold text-slate-950">{supervisors.data?.totalCount ?? 0}</p><p className="mt-1 text-sm text-slate-600">Availability và expertise; không tự tính workload/capacity.</p><Link className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline" to="/department/supervisors">Xem giảng viên</Link></>}</SectionState></section>
      </div>
    </section>

    <section id="attention" aria-labelledby="department-attention-heading" className="space-y-3 scroll-mt-4"><div><h2 id="department-attention-heading" className="font-heading text-xl font-bold text-slate-950">Needs Attention</h2><p className="mt-1 text-sm text-slate-600">Chỉ là phép lọc presentation từ pending review, blocked và overdue count do Backend trả về.</p></div><SectionState section={portfolio} onRetry={portfolio.refresh}>{attention.length ? <div className="grid gap-3 md:grid-cols-2">{attention.map((project) => <article key={project.id} className="rounded-xl border border-hairline bg-card p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-slate-950">{project.code} · {project.title}</h3><span className="text-xs font-semibold text-slate-600">{project.status}</span></div><p className="mt-2 text-sm text-slate-600">Pending reports: {project.pendingProgressReviews} · Blocked: {project.analysis?.progressSummary.blockedTasks ?? '—'} · Overdue: {project.analysis?.progressSummary.overdueTasks ?? '—'}</p><Link className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline" to={`/department/projects/review/${project.id}`}>Mở academic record</Link></article>)}</div> : <p className="rounded-xl border border-hairline bg-card p-4 text-sm text-slate-600">Không có project có tín hiệu attention trong trang portfolio hiện tại.</p>}</SectionState></section>

    <section aria-labelledby="department-operations-heading" className="space-y-3"><div><h2 id="department-operations-heading" className="font-heading text-xl font-bold text-slate-950">Academic Operations</h2><p className="mt-1 text-sm text-slate-600">Lead và participating decision không được suy diễn ở đây: chi tiết review chỉ render action mà Backend công bố cho current submission/token.</p></div><SectionState section={reviews} onRetry={reviews.refresh}>{<div className="grid gap-3 md:grid-cols-2">{reviews.data?.items.map((project) => <article key={project.id} className="rounded-xl border border-hairline bg-card p-4"><h3 className="font-semibold text-slate-950">{project.code} · {project.title}</h3><p className="mt-1 text-sm text-slate-600">{project.teamName} · {project.status} · {project.majors.map((major) => major.majorCode).join(', ') || 'Chưa có major'}</p><Link className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline" to={`/department/projects/review/${project.id}`}>Mở review</Link></article>)}</div>}</SectionState></section>

    <section aria-labelledby="department-policy-heading" className="space-y-3"><div><h2 id="department-policy-heading" className="font-heading text-xl font-bold text-slate-950">Project period & policy</h2><p className="mt-1 text-sm text-slate-600">Đọc từ academic workflow context hiện có. Version policy, mode, team rule và linkage chi tiết chưa có Department read aggregate; không có mutation tại workspace này.</p></div>{academic.status === 'loading' || academic.status === 'idle' ? <p role="status" className="rounded-xl border border-hairline bg-card p-4 text-sm text-slate-600">Đang tải academic context…</p> : academic.status === 'ready' ? periods.length ? <div className="grid gap-3 md:grid-cols-2">{periods.map((period) => <article key={period.id} className="rounded-xl border border-hairline bg-card p-4"><h3 className="font-semibold text-slate-950">{period.name}</h3><p className="mt-1 text-sm text-slate-600">{period.periodType} · {period.status} · {period.isOpen ? 'Đang mở' : 'Không mở'}</p><p className="mt-1 break-words text-xs text-slate-500">{period.startAtUtc} → {period.endAtUtc}</p></article>)}</div> : <p className="rounded-xl border border-hairline bg-card p-4 text-sm text-slate-600">Không có Project Period trong academic context hiện tại.</p> : <p role="alert" className="rounded-xl border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-text">Không thể tải academic context; các khu vực khác vẫn hoạt động độc lập.</p>}</section>

    <section id="evaluation" aria-labelledby="department-evaluation-heading" className="space-y-3 scroll-mt-4"><div><h2 id="department-evaluation-heading" className="font-heading text-xl font-bold text-slate-950">Evaluation, final result & audit</h2><p className="mt-1 text-sm text-slate-600">Backend hiện chỉ có evaluation scheme/assignment/result theo project. Workspace không nhận aggregate nào để suy ra readiness, eligible evaluator hay publish permission; vì vậy không hiển thị CTA đánh giá/công bố.</p></div><div className="grid gap-3 md:grid-cols-3"><article className="rounded-xl border border-hairline bg-card p-4"><h3 className="font-semibold text-slate-950">Scheme scope</h3><p className="mt-2 text-sm text-slate-600">`COMMON`, `MAJOR_SPECIFIC`, `INDIVIDUAL` được giữ là khái niệm Backend project-scoped.</p></article><article className="rounded-xl border border-hairline bg-card p-4"><h3 className="font-semibold text-slate-950">Final submission / result</h3><p className="mt-2 text-sm text-slate-600">Không có Department aggregate/read contract để hiển thị readiness hoặc kết quả theo portfolio.</p></article><article className="rounded-xl border border-hairline bg-card p-4"><h3 className="font-semibold text-slate-950">Archive & AI</h3><p className="mt-2 text-sm text-slate-600">Archive remains read-only in this workspace. AI advisory không có quyền approve, assign hay publish.</p></article></div></section>
  </main>
}
