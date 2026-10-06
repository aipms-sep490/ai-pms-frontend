import { WorkspacePage } from '../../../components/ui/WorkspacePage'
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
    if (error.status === 403) return { state: 'forbidden', message: 'Bạn chưa có quyền xem dữ liệu của bộ môn này.' }
    if ([404, 405, 501].includes(error.status)) return { state: 'unsupported', message: 'Khu vực này chưa sẵn sàng.' }
    if (error.status >= 500) return { state: 'unavailable', message: 'Dịch vụ hiện tạm thời không khả dụng.' }
  }
  return { state: 'error', message: 'Không thể tải dữ liệu. Vui lòng thử lại.' }
}

function useSection<T>(read: (() => Promise<T>) | null) {
  const [section, setSection] = useState<Section<T>>(loading)
  const refresh = useCallback(() => {
    if (!read) {
      setSection({ state: 'forbidden', data: null, message: 'Phiên làm việc của bộ môn không còn hợp lệ.' })
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
  if (section.state === 'loading') return <p role="status" className="py-3 text-sm text-slate-600">Đang tải dữ liệu…</p>
  if (section.state === 'forbidden' || section.state === 'unsupported' || section.state === 'unavailable' || section.state === 'error') return <section role="alert" className="rounded-xl border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-text"><p>{section.message}</p><Button className="mt-3" size="sm" variant="secondary" onClick={onRetry}>Thử lại</Button></section>
  if (section.state === 'empty') return <p className="rounded-xl border border-hairline bg-card p-4 text-sm text-slate-600">Chưa có dữ liệu trong phạm vi bộ môn hiện tại.</p>
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
  const departmentName = academic.academic?.departments[0]?.name ?? 'Bộ môn hiện tại'
  const attention = useMemo(() => portfolio.data?.projects.items.filter((project) => project.pendingProgressReviews > 0 || (project.analysis?.progressSummary.blockedTasks ?? 0) > 0 || (project.analysis?.progressSummary.overdueTasks ?? 0) > 0) ?? [], [portfolio.data])

  return <WorkspacePage className="space-y-7" title="Điều hành học vụ bộ môn" eyebrow="Không gian bộ môn" description={`${departmentName}. Theo dõi danh mục đồ án, hồ sơ chờ thẩm định và nguồn lực hướng dẫn.`} action={<Link className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover" to="/department/projects/review">Mở hàng đợi thẩm định</Link>}>

    <nav aria-label="Lối tắt bộ môn" className="grid overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
      <Link className="flex min-h-16 items-center gap-3 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-primary-subtle hover:text-primary" to="/department/portfolio"><span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">folder_managed</span>Danh mục đồ án</Link>
      <Link className="flex min-h-16 items-center gap-3 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-primary-subtle hover:text-primary" to="/department/projects/review"><span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">rule</span>Thẩm định đề cương</Link>
      <Link className="flex min-h-16 items-center gap-3 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-primary-subtle hover:text-primary" to="/department/supervisors"><span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">supervisor_account</span>Giảng viên hướng dẫn</Link>
      <a className="flex min-h-16 items-center gap-3 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-primary-subtle hover:text-primary" href="#periods"><span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">date_range</span>Kỳ đồ án</a>
    </nav>

    <section id="overview" aria-labelledby="department-overview-heading" className="space-y-3 scroll-mt-4">
      <div><p className="font-mono text-xs font-semibold uppercase tracking-[.11em] text-primary">Tổng quan</p><h2 id="department-overview-heading" className="mt-1 font-heading text-xl font-bold text-slate-950">Tình hình hiện tại</h2></div>
      <div className="grid gap-px overflow-hidden rounded-lg border border-hairline bg-hairline lg:grid-cols-3">
        <DepartmentMetric title="Chờ thẩm định" icon="fact_check" section={reviews} onRetry={reviews.refresh} value={reviews.data?.totalCount ?? 0} detail="Hồ sơ trong hàng đợi bộ môn" href="/department/projects/review" action="Xem hàng đợi" />
        <DepartmentMetric title="Đồ án quản lý" icon="folder_managed" section={portfolio} onRetry={portfolio.refresh} value={portfolio.data?.summary.totalProjects ?? 0} detail="Trong danh mục bộ môn" href="/department/portfolio" action="Xem danh mục" />
        <DepartmentMetric title="Giảng viên" icon="supervisor_account" section={supervisors} onRetry={supervisors.refresh} value={supervisors.data?.totalCount ?? 0} detail="Hồ sơ trong danh bạ" href="/department/supervisors" action="Xem giảng viên" />
      </div>
    </section>

    <section id="attention" aria-labelledby="department-attention-heading" className="space-y-3 scroll-mt-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="font-mono text-xs font-semibold uppercase tracking-[.11em] text-amber-700">Cần chú ý</p><h2 id="department-attention-heading" className="mt-1 font-heading text-xl font-bold text-slate-950">Đồ án có tín hiệu cần xử lý</h2><p className="mt-1 text-sm text-slate-600">Tổng hợp từ báo cáo chờ duyệt, công việc bị chặn và công việc quá hạn.</p></div>{attention.length > 0 && <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">{attention.length} đồ án</span>}</div><SectionState section={portfolio} onRetry={portfolio.refresh}>{attention.length ? <div className="overflow-hidden rounded-lg border border-hairline bg-white">{attention.map((project) => <article key={project.id} className="grid gap-4 border-b border-hairline p-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold text-slate-950">{project.code} · {project.title}</h3><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{statusLabel(project.status)}</span></div><div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600"><Signal label="Báo cáo chờ duyệt" value={project.pendingProgressReviews} /><Signal label="Bị chặn" value={project.analysis?.progressSummary.blockedTasks ?? 0} /><Signal label="Quá hạn" value={project.analysis?.progressSummary.overdueTasks ?? 0} /></div></div><Link className="inline-flex min-h-10 items-center justify-center rounded-md border border-hairline px-3 text-sm font-semibold text-primary hover:border-blue-300 hover:bg-primary-subtle" to={`/department/projects/review/${project.id}`}>Mở hồ sơ</Link></article>)}</div> : <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Không có đồ án cần chú ý trong dữ liệu hiện tại.</div>}</SectionState></section>

    <section aria-labelledby="department-operations-heading" className="space-y-3"><div><p className="font-mono text-xs font-semibold uppercase tracking-[.11em] text-primary">Thẩm định học vụ</p><h2 id="department-operations-heading" className="mt-1 font-heading text-xl font-bold text-slate-950">Hồ sơ thẩm định gần nhất</h2><p className="mt-1 text-sm text-slate-600">Mở từng hồ sơ để xem nhận xét và các thao tác dành cho tài khoản hiện tại.</p></div><SectionState section={reviews} onRetry={reviews.refresh}>{<div className="grid gap-3 md:grid-cols-2">{reviews.data?.items.map((project) => <article key={project.id} className="rounded-lg border border-hairline bg-card p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-mono text-[11px] font-semibold text-primary">{project.code}</p><h3 className="mt-1 truncate font-semibold text-slate-950">{project.title}</h3></div><span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{statusLabel(project.status)}</span></div><p className="mt-2 text-sm text-slate-600">{project.teamName} · {project.majors.map((major) => major.majorCode).join(', ') || 'Chưa xác định ngành'}</p><Link className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-primary hover:underline" to={`/department/projects/review/${project.id}`}>Xem thẩm định<span className="material-symbols-outlined text-[17px]" aria-hidden="true">arrow_forward</span></Link></article>)}</div>}</SectionState></section>

    <section id="periods" aria-labelledby="department-policy-heading" className="space-y-3 scroll-mt-4"><div><p className="font-mono text-xs font-semibold uppercase tracking-[.11em] text-primary">Kế hoạch học vụ</p><h2 id="department-policy-heading" className="mt-1 font-heading text-xl font-bold text-slate-950">Kỳ đồ án</h2><p className="mt-1 text-sm text-slate-600">Các giai đoạn đang được cấu hình trong học kỳ hiện tại.</p></div>{academic.status === 'loading' || academic.status === 'idle' ? <p role="status" className="rounded-lg border border-hairline bg-card p-4 text-sm text-slate-600">Đang tải kỳ đồ án…</p> : academic.status === 'ready' ? periods.length ? <div className="grid gap-3 md:grid-cols-2">{periods.map((period) => <article key={period.id} className="rounded-lg border border-hairline bg-card p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[11px] font-semibold uppercase text-primary">{period.periodType}</p><h3 className="mt-1 font-semibold text-slate-950">{period.name}</h3></div><span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${period.isOpen ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{period.isOpen ? 'Đang mở' : 'Đã đóng'}</span></div><p className="mt-3 font-mono text-[11px] leading-5 text-slate-500">{formatPeriodDate(period.startAtUtc)} → {formatPeriodDate(period.endAtUtc)}</p></article>)}</div> : <p className="rounded-lg border border-hairline bg-card p-4 text-sm text-slate-600">Chưa có kỳ đồ án trong học kỳ hiện tại.</p> : <p role="alert" className="rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-text">Không thể tải thông tin kỳ đồ án. Các khu vực khác vẫn hoạt động bình thường.</p>}</section>

    <section className="rounded-lg border border-blue-200 bg-blue-50 p-4 sm:p-5" aria-label="Phạm vi thao tác"><div className="flex gap-3"><span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">verified_user</span><div><h2 className="font-semibold text-blue-950">Quyền theo từng hồ sơ</h2><p className="mt-1 text-sm leading-6 text-blue-900">Thao tác đánh giá, phân công và công bố kết quả chỉ xuất hiện trong hồ sơ đồ án khi tài khoản có đủ quyền và dữ liệu đã sẵn sàng.</p></div></div></section>
  </WorkspacePage>
}

function DepartmentMetric({ title, icon, section, onRetry, value, detail, href, action }: { title: string; icon: string; section: Section<unknown>; onRetry: () => void; value: number; detail: string; href: string; action: string }) {
  const hasCount = section.state === 'success' || section.state === 'empty'
  return <section className="bg-white p-5"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-slate-700">{title}</h3><span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">{icon}</span></div>{hasCount ? <><p className="mt-4 font-mono text-3xl font-semibold text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p><Link className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-primary hover:underline" to={href}>{action}<span className="material-symbols-outlined text-[17px]" aria-hidden="true">arrow_forward</span></Link></> : <SectionState section={section} onRetry={onRetry}><span /></SectionState>}</section>
}

function Signal({ label, value }: { label: string; value: number }) {
  return <span>{label}: <strong className="font-mono text-slate-900">{value}</strong></span>
}

function statusLabel(value: string) {
  return ({ PENDING_REVIEW: 'Chờ thẩm định', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', ACTIVE: 'Đang thực hiện', COMPLETED: 'Hoàn tất', DRAFT: 'Bản nháp' } as Record<string, string>)[value] ?? value
}

function formatPeriodDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString('vi-VN')
}

