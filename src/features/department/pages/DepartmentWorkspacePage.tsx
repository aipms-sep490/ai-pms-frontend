import { displayLabel } from '../../../components/ui/display-label'
import { DepartmentWorkflowGuide } from '../components/DepartmentWorkflowGuide'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAcademicWorkflow } from '../../../app/context/useAcademicWorkflow'
import { Button } from '../../../components/ui/Button'
import { useDepartmentSection as useSection, type Section } from '../hooks/useDepartmentSection'
import { projectStatusLabel } from '../../projects/utils/project-status'
import { HttpError } from '../../../services/http/http-client'
import { getPortfolioDashboard, type PortfolioDashboard } from '../../dashboard/api/dashboard-api'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { getReviewQueue, type ReviewQueuePage, type ReviewProjectSummary } from '../../projects/api/project-review-api'
import { list as listSupervisors, type Page as SupervisorPage, type Supervisor } from '../../supervisors/api/supervisor-api'

const emptyReviews = (data: ReviewQueuePage<ReviewProjectSummary>) => data.items.length === 0
const emptyPortfolio = (data: PortfolioDashboard) => data.projects.items.length === 0
const emptySupervisors = (data: SupervisorPage<Supervisor>) => data.items.length === 0

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
  const token = session?.accessToken
  const [portfolioPage, setPortfolioPage] = useState(1)
  const semesterId = academic.academic?.selectedSemester?.id
  useEffect(() => { setPortfolioPage(1) }, [semesterId])
  const reviewRead = useCallback(() => token ? getReviewQueue({ page: 1, pageSize: 5 }, token) : Promise.reject(new HttpError('Unauthenticated', 401)), [token])
  const portfolioRead = useCallback(() => getPortfolioDashboard('department', { page: portfolioPage, pageSize: 5, semesterId }), [portfolioPage, semesterId])
  const supervisorRead = useCallback(() => token ? listSupervisors(token, { page: 1, pageSize: 5 }) : Promise.reject(new HttpError('Unauthenticated', 401)), [token])
  const reviews = useSection<ReviewQueuePage<ReviewProjectSummary>>(reviewRead, emptyReviews)
  const portfolio = useSection<PortfolioDashboard>(portfolioRead, emptyPortfolio)
  const supervisors = useSection<SupervisorPage<Supervisor>>(supervisorRead, emptySupervisors)
  const periods = academic.academic?.periods ?? []
  const departmentName = academic.academic?.departments.map(department => department.name).join(', ') || 'Bộ môn hiện tại'
  const attention = useMemo(() => portfolio.data?.projects.items.filter((project) => project.pendingProgressReviews > 0 || (project.analysis?.progressSummary.blockedTasks ?? 0) > 0 || (project.analysis?.progressSummary.overdueTasks ?? 0) > 0) ?? [], [portfolio.data])

  return <WorkspacePage className="space-y-8" title="Quản lý đồ án bộ môn" eyebrow="Không gian bộ môn" description={`${departmentName}. Theo dõi danh mục đồ án, hồ sơ chờ thẩm định và nguồn lực hướng dẫn.`} action={
    <div className="flex flex-wrap items-center gap-2">
      <Link className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-subtle/50 px-3.5 text-xs font-semibold text-primary hover:bg-primary-subtle hover:border-primary transition-all" to="/department/projects/progress-matrix">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">view_timeline</span>
        Ma trận Tiến độ Gates
      </Link>
      <Link className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-white hover:bg-primary-hover shadow-2xs transition-all" to="/department/projects/review">
        Thẩm định đề cương
      </Link>
    </div>
  }>

    <DepartmentWorkflowGuide />

    {/* =========================================================================
        TIER 1: HÀNG ĐỢI TÁC VỤ CẦN XỬ LÝ NGAY (URGENT ACTION QUEUE)
        ========================================================================= */}
    <section id="action-queue" aria-labelledby="urgent-actions-heading" className="space-y-4 rounded-2xl border border-amber-200/70 bg-gradient-to-b from-amber-50/40 to-transparent p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-200/50 pb-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
            Khu vực 1: Tác vụ khẩn cấp
          </span>
          <h2 id="urgent-actions-heading" className="mt-1 font-heading text-xl font-bold text-ink">
            Hàng đợi tác vụ cần xử lý ngay (Urgent Action Queue)
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Tập trung các đề cương chờ duyệt và đồ án có tín hiệu nguy cơ trễ hạn hoặc bị chặn.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Sub-block A: Hồ sơ thẩm định đề cương gần nhất */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">fact_check</span>
              Đề cương chờ thẩm định
            </h3>
            <span className="text-xs font-semibold text-ink-muted">
              {reviews.data?.totalCount ?? 0} hồ sơ
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
                    <span className="shrink-0 rounded-full bg-canvas px-2 py-0.5 text-xs font-semibold text-ink-muted">
                      {projectStatusLabel(project.status)}
                    </span>
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

        {/* Sub-block B: Đồ án có tín hiệu cần xử lý (Attention Signals) */}
        <div id="attention" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-amber-700" aria-hidden="true">warning</span>
              Đồ án có tín hiệu cần chú ý
            </h3>
            {attention.length > 0 && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                {attention.length} đồ án
              </span>
            )}
          </div>

          <SectionState section={portfolio} onRetry={portfolio.refresh}>
            {attention.length ? (
              <div className="space-y-2.5">
                {attention.map((project) => (
                  <article key={project.id} className="rounded-xl border border-hairline bg-card p-4 transition-all hover:border-amber-300 hover:shadow-2xs">
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
                        className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-hairline px-3 text-xs font-semibold text-primary hover:border-primary hover:bg-primary-subtle shrink-0"
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
                Không có tín hiệu cần chú ý trong trang danh mục này.
              </div>
            )}
          </SectionState>

          {portfolio.data && portfolio.data.projects.totalPages > 1 && (
            <nav aria-label="Phân trang tín hiệu đồ án" className="flex items-center justify-between text-xs pt-2">
              <Button size="sm" variant="secondary" disabled={portfolioPage <= 1} onClick={() => setPortfolioPage(portfolioPage - 1)}>
                Trang trước
              </Button>
              <span className="text-ink-muted font-medium">Trang {portfolio.data.projects.page} / {portfolio.data.projects.totalPages}</span>
              <Button size="sm" variant="secondary" disabled={portfolioPage >= portfolio.data.projects.totalPages} onClick={() => setPortfolioPage(portfolioPage + 1)}>
                Trang sau
              </Button>
            </nav>
          )}
        </div>
      </div>
    </section>

    {/* =========================================================================
        TIER 2: GIÁM SÁT TIẾN TRÌNH & CỔNG THẨM ĐỊNH (PROGRESS MONITORING)
        ========================================================================= */}
    <section id="monitoring" aria-labelledby="monitoring-heading" className="space-y-4">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-status-info-bg px-2 py-0.5 text-xs font-bold text-status-info-text uppercase tracking-wider">
          Khu vực 2: Vận hành & Giám sát
        </span>
        <h2 id="monitoring-heading" className="mt-1 font-heading text-xl font-bold text-ink">
          Giám sát tiến độ học vụ & Cổng Thẩm định (Progress Monitoring)
        </h2>
        <p className="mt-1 text-xs text-ink-muted">
          Theo dõi tổng thể các đợt Review Gates, khối lượng đồ án bộ môn quản lý và đội ngũ giảng viên.
        </p>
      </div>

      {/* Spotlight Card: Ma trận Tiến độ Review Gates */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary-subtle/70 via-card to-card p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-xs shrink-0">
              <span className="material-symbols-outlined text-[26px]" aria-hidden="true">view_timeline</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">Ma trận Tiến độ Review Gates Toàn khóa</h3>
              <p className="mt-1 text-xs text-ink-muted max-w-xl">
                Bảng theo dõi trực quan trạng thái từng Cổng thẩm định của 100% đồ án trong kỳ học. Nhận biết tức thời đồ án đạt chuẩn, chờ nộp bài hoặc bị yêu cầu sửa đổi.
              </p>
            </div>
          </div>
          <Link
            to="/department/projects/progress-matrix"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-bold text-white hover:bg-primary-hover shadow-xs transition-all shrink-0 cursor-pointer"
          >
            Mở Ma trận Tiến độ
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* Core Operational Metrics */}
      <div className="workspace-metrics">
        <DepartmentMetric
          title="Chờ thẩm định"
          icon="fact_check"
          section={reviews}
          onRetry={reviews.refresh}
          value={reviews.data?.totalCount ?? 0}
          detail="Đề cương chờ bộ môn phê duyệt"
          href="/department/projects/review"
          action="Xem hồ sơ"
        />
        <DepartmentMetric
          title="Đồ án quản lý"
          icon="folder_managed"
          section={portfolio}
          onRetry={portfolio.refresh}
          value={portfolio.data?.summary.totalProjects ?? 0}
          detail="Trong danh mục bộ môn"
          href="/department/portfolio"
          action="Xem danh mục"
        />
        <DepartmentMetric
          title="Giảng viên"
          icon="supervisor_account"
          section={supervisors}
          onRetry={supervisors.refresh}
          value={supervisors.data?.totalCount ?? 0}
          detail="Hồ sơ trong danh bạ"
          href="/department/supervisors"
          action="Xem giảng viên"
        />
      </div>

      {/* Quick Monitoring Navigation Links */}
      <nav aria-label="Lối tắt giám sát bộ môn" className="grid overflow-hidden rounded-xl border border-hairline bg-card sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-hairline">
        <Link className="flex min-h-14 items-center gap-3 px-4 text-xs font-semibold text-ink-soft transition-colors hover:bg-primary-subtle hover:text-primary" to="/department/portfolio">
          <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">folder_managed</span>
          Danh mục đồ án
        </Link>
        <Link className="flex min-h-14 items-center gap-3 px-4 text-xs font-semibold text-ink-soft transition-colors hover:bg-primary-subtle hover:text-primary" to="/department/supervisors">
          <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">supervisor_account</span>
          Giảng viên hướng dẫn
        </Link>
        <Link className="flex min-h-14 items-center gap-3 px-4 text-xs font-semibold text-ink-soft transition-colors hover:bg-primary-subtle hover:text-primary" to="/department/topics">
          <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">lightbulb</span>
          Quản lý đề tài
        </Link>
        <Link className="flex min-h-14 items-center gap-3 px-4 text-xs font-semibold text-ink-soft transition-colors hover:bg-primary-subtle hover:text-primary" to="/department/student-qualifications">
          <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">verified</span>
          Xác minh điều kiện sinh viên
        </Link>
      </nav>
    </section>

    {/* =========================================================================
        TIER 3: CẤU HÌNH HỌC KỲ & QUY CHẾ (ACADEMIC CONFIGURATION)
        ========================================================================= */}
    <section id="configuration" aria-labelledby="academic-configuration-heading" className="space-y-4 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-6">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-tag-ai-bg px-2 py-0.5 text-xs font-bold text-tag-ai uppercase tracking-wider">
            Khu vực 3: Cấu hình & Quy chế
          </span>
          <h2 id="academic-configuration-heading" className="mt-1 font-heading text-xl font-bold text-ink">
            Kế hoạch học vụ & Chính sách đào tạo (Academic Configuration)
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Quản trị thời gian mở các kỳ đồ án, thiết lập mẫu Cổng thẩm định theo ngành và bộ tiêu chí Rubric.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sub-block A: Kỳ đồ án hiện tại */}
        <div id="periods" className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">date_range</span>
              Kỳ đồ án trong học kỳ
            </h3>
            <Link to="/academic/governance" className="text-xs font-semibold text-primary hover:underline">
              Quản lý học vụ →
            </Link>
          </div>

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
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                          period.isOpen
                            ? 'border-status-success-border bg-status-success-bg text-status-success-text'
                            : period.status === 'ACTIVE'
                            ? 'border-hairline bg-canvas text-ink-muted'
                            : 'border-status-info-border bg-status-info-bg text-status-info-text'
                        }`}
                      >
                        {period.isOpen ? 'Đang mở' : period.status === 'ACTIVE' ? 'Ngoài thời gian mở' : displayLabel(period.status)}
                      </span>
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

        {/* Sub-block B: Lối tắt cấu hình chính sách */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">rule_settings</span>
            Thiết lập chính sách
          </h3>
          <div className="rounded-xl border border-hairline bg-card p-4 flex flex-col gap-2">
            <Link className="flex items-center justify-between p-2 rounded-lg text-xs font-semibold text-ink hover:bg-canvas transition-colors" to="/academic/review-gates">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">rule_settings</span>
                Chính sách Review Gates
              </span>
              <span className="material-symbols-outlined text-[16px] text-slate-400" aria-hidden="true">arrow_forward</span>
            </Link>
            <Link className="flex items-center justify-between p-2 rounded-lg text-xs font-semibold text-ink hover:bg-canvas transition-colors" to="/academic">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">account_balance</span>
                Cấu trúc đào tạo
              </span>
              <span className="material-symbols-outlined text-[16px] text-slate-400" aria-hidden="true">arrow_forward</span>
            </Link>
            <Link className="flex items-center justify-between p-2 rounded-lg text-xs font-semibold text-ink hover:bg-canvas transition-colors" to="/academic/governance">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">date_range</span>
                Học kỳ và chính sách
              </span>
              <span className="material-symbols-outlined text-[16px] text-slate-400" aria-hidden="true">arrow_forward</span>
            </Link>
            <Link className="flex items-center justify-between p-2 rounded-lg text-xs font-semibold text-ink hover:bg-canvas transition-colors" to="/academic/rubrics">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">grading</span>
                Bộ tiêu chí Rubric
              </span>
              <span className="material-symbols-outlined text-[16px] text-slate-400" aria-hidden="true">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-hairline bg-primary-subtle/50 p-4" aria-label="Phạm vi thao tác">
        <div className="flex gap-3">
          <span className="material-symbols-outlined text-[20px] text-primary shrink-0" aria-hidden="true">verified_user</span>
          <div>
            <h4 className="font-bold text-ink text-xs">Quyền theo từng hồ sơ</h4>
            <p className="mt-0.5 text-xs leading-5 text-ink-muted">
              Thao tác đánh giá, phân công và công bố kết quả chỉ xuất hiện trong hồ sơ đồ án khi tài khoản có đủ quyền và dữ liệu đã sẵn sàng.
            </p>
          </div>
        </div>
      </div>
    </section>
  </WorkspacePage>
}

function DepartmentMetric({ title, icon, section, onRetry, value, detail, href, action }: { title: string; icon: string; section: Section<unknown>; onRetry: () => void; value: number; detail: string; href: string; action: string }) {
  const hasCount = section.state === 'success' || section.state === 'empty'
  return <section className="workspace-metric"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-ink-soft">{title}</h3><span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">{icon}</span></div>{hasCount ? <><p className="mt-4 font-mono text-3xl font-semibold text-ink">{value}</p><p className="mt-1 text-xs text-ink-muted">{detail}</p><Link className="workspace-action-link mt-3" to={href}>{action}<span className="material-symbols-outlined text-[17px]" aria-hidden="true">arrow_forward</span></Link></> : <SectionState section={section} onRetry={onRetry}><span /></SectionState>}</section>
}

function Signal({ label, value }: { label: string; value: number }) {
  return <span>{label}: <strong className="font-mono text-ink">{value}</strong></span>
}

function formatPeriodDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })
}

