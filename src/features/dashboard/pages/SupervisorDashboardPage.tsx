import { projectStatusLabel } from '../../projects/utils/project-status'
import { displayLabel } from '../../../components/ui/display-label'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { getSupervisorDashboard, type DashboardFilter, type DashboardProject, type SupervisorDashboard } from '../api/dashboard-api'
import { env } from '../../../app/config/env'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { Button } from '../../../components/ui/Button'
import { FilterToolbar } from '../../../components/ui/FilterToolbar'
import { PageLoading } from '../../../components/ui/PageLoading'
import { Pagination } from '../../../components/ui/Pagination'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { ActorDashboardCard } from '../components/ActorDashboardCard'
import { StatTileRow } from '../../../components/ui/StatTileRow'

const statuses = ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'FINAL_SUBMISSION', 'COMPLETED', 'ARCHIVED']
type SortKey = 'default' | 'risk' | 'pending' | 'progress-asc'

const riskOrder: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }

export function SupervisorDashboardPage() {
  const [data, setData] = useState<SupervisorDashboard | null>(null)
  const [filter, setFilter] = useState<DashboardFilter>({ page: 1, pageSize: 10 })
  const [onlyAttention, setOnlyAttention] = useState(false)
  const [riskFilter, setRiskFilter] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<SortKey>('default')
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

  const visibleProjects = useMemo(() => {
    const raw = data?.projects.items ?? []
    const list = raw.filter((p) => {
      if (riskFilter !== 'ALL' && (p.analysis?.riskLevel ?? 'NONE') !== riskFilter) return false
      if (onlyAttention) {
        return (
          p.pendingProgressReviews > 0
          || (p.analysis?.progressSummary?.overdueTasks ?? 0) > 0
          || (p.analysis?.progressSummary?.blockedTasks ?? 0) > 0
          || p.analysis?.riskLevel === 'HIGH'
          || p.analysis?.riskLevel === 'CRITICAL'
        )
      }
      return true
    })

    if (sortBy === 'risk') {
      return [...list].sort((a, b) => (riskOrder[b.analysis?.riskLevel ?? ''] ?? 0) - (riskOrder[a.analysis?.riskLevel ?? ''] ?? 0))
    }
    if (sortBy === 'pending') {
      return [...list].sort((a, b) => b.pendingProgressReviews - a.pendingProgressReviews)
    }
    if (sortBy === 'progress-asc') {
      return [...list].sort((a, b) => (a.analysis?.progressSummary?.progressPercentage ?? 101) - (b.analysis?.progressSummary?.progressPercentage ?? 101))
    }
    return list
  }, [data?.projects.items, onlyAttention, riskFilter, sortBy])

  const activeChips = [
    ...(filter.search ? [{ id: 'search', label: 'Từ khóa', value: filter.search }] : []),
    ...(filter.status ? [{ id: 'status', label: 'Trạng thái', value: projectStatusLabel(filter.status) }] : []),
    ...(riskFilter !== 'ALL' ? [{ id: 'risk', label: 'Rủi ro', value: displayLabel(riskFilter) }] : []),
    ...(onlyAttention ? [{ id: 'attention', label: 'Ưu tiên', value: 'Cần chú ý / Rủi ro cao' }] : []),
  ]

  function clearFilters() {
    setFilter({ page: 1, pageSize: 10 })
    setOnlyAttention(false)
    setRiskFilter('ALL')
    setSortBy('default')
  }

  return <WorkspacePage size="wide" className="mk-page-enter space-y-6" eyebrow="Không gian giảng viên" title="Tổng quan hướng dẫn" description="Theo dõi khối lượng hướng dẫn, báo cáo chờ phản hồi và các đồ án cần chú ý." action={<Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại" disabled={loading} onClick={() => void load()} />}>
    <ActorDashboardCard />

    {error && <div role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><p className="font-semibold">Chưa tải được tổng quan</p><p className="mt-1">{error}</p><button type="button" className="mt-2 min-h-11 font-semibold underline underline-offset-4" onClick={() => void load()}>Tải lại</button></div>}
    {loading && <PageLoading label="Đang tải tổng quan hướng dẫn…" />}
    {!loading && !error && data && <>
      <section aria-label="Chỉ số khối lượng" className="space-y-3">
        <StatTileRow tiles={[
          { icon: 'folder_managed', label: 'Đồ án được phân công', value: data.workload.assignedProjects, hero: true, caption: 'Phạm vi GVHD chính hiện tại.' },
          { icon: 'fact_check', label: 'Báo cáo chờ duyệt', value: data.pendingProgressReviews, tone: data.pendingProgressReviews > 0 ? 'warning' : 'neutral', caption: data.pendingProgressReviews > 0 ? 'Cần xem xét và gửi phản hồi.' : 'Không có báo cáo tồn đọng.' },
          { icon: 'event_busy', label: 'Công việc quá hạn', value: data.overdueTasks, tone: data.overdueTasks > 0 ? 'danger' : 'neutral', caption: data.overdueTasks > 0 ? 'Cần nhắc nhóm cập nhật tiến độ.' : 'Các công việc đang đúng hạn.' },
        ]} />
        <p className="rounded-lg border border-hairline bg-card px-4 py-3 text-sm text-ink-soft">Đồ án / hạn mức: <strong className="tabular-nums text-ink">{data.workload.profileMaxActiveProjects === null ? 'Chưa cấu hình' : `${data.workload.assignedProjects}/${data.workload.profileMaxActiveProjects}`}</strong>{!data.workload.hasProfile || !data.workload.isAvailable ? ' · Hồ sơ hướng dẫn hiện chưa sẵn sàng nhận thêm.' : ''}</p>
      </section>

      {(() => {
        const urgentProjects = data.projects.items.filter(
          p => p.pendingProgressReviews > 0 ||
               (p.analysis?.progressSummary?.overdueTasks ?? 0) > 0 ||
               (p.analysis?.progressSummary?.blockedTasks ?? 0) > 0 ||
               p.analysis?.riskLevel === 'HIGH' ||
               p.analysis?.riskLevel === 'CRITICAL'
        )
        if (!urgentProjects.length) return null
        return (
          <section aria-label="Hộp thư duyệt nhanh" className="rounded-xl border border-hairline border-l-4 border-l-warning-strong bg-card p-5 shadow-xs">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-hairline pb-3">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-status-warning-text text-xl" aria-hidden="true">
                  mark_email_unread
                </span>
                <div>
                  <h2 className="text-base font-bold text-ink">
                    Hộp thư duyệt nhanh &amp; Việc khẩn cấp
                  </h2>
                  <p className="text-xs text-ink-muted">
                    Có {urgentProjects.length} đồ án đang có báo cáo tiến độ chờ xác nhận hoặc công việc quá hạn/vướng mắc.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full border border-status-warning-border bg-status-warning-bg px-3 py-1 text-xs font-bold text-status-warning-text">
                {data.pendingProgressReviews} báo cáo chờ phản hồi
              </span>
            </div>

            <div className="mt-3 grid items-stretch gap-3 sm:grid-cols-2">
              {urgentProjects.map(proj => (
                <div
                  key={proj.id}
                  className="flex h-full flex-col justify-between rounded-lg border border-hairline bg-canvas/50 p-4 shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <strong className="font-mono text-sm font-bold text-ink">{proj.code}</strong>
                      {proj.pendingProgressReviews > 0 ? (
                        <StatusBadge tone="warning" label={`${proj.pendingProgressReviews} báo cáo chờ duyệt`} />
                      ) : proj.analysis?.riskLevel === 'HIGH' || proj.analysis?.riskLevel === 'CRITICAL' ? (
                        <StatusBadge tone="danger" label={`Rủi ro: ${displayLabel(proj.analysis.riskLevel)}`} />
                      ) : null}
                    </div>
                    <h3 className="mt-1 text-xs font-semibold text-ink line-clamp-1">{proj.title}</h3>
                    <p className="mt-1 text-xs text-ink-muted">
                      Bộ môn: {proj.departmentName ?? 'Chưa có bộ môn'}
                      {(proj.analysis?.progressSummary?.overdueTasks ?? 0) > 0 && (
                        <span className="ml-2 text-status-error-text font-semibold">
                          · {proj.analysis?.progressSummary?.overdueTasks} việc quá hạn
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-hairline pt-2.5">
                    <Link
                      to={`/supervisor/projects/${proj.id}/reports`}
                      className="inline-flex min-h-9 items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-bold text-white shadow-2xs hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <span className="material-symbols-outlined text-sm" aria-hidden="true">
                        assignment
                      </span>
                      Xem &amp; Duyệt báo cáo
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

            <p className="mt-3 text-xs text-ink-muted italic">
              * Nhận xét và xác nhận báo cáo của Giảng viên hướng dẫn ghi nhận sự đồng hành chuyên môn; thẩm định đạt cổng chính thức do Thẩm định viên độc lập phê duyệt.
            </p>
          </section>
        )
      })()}

      <section className="workspace-surface workspace-surface-padding mt-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading font-semibold text-ink">Đồ án phụ trách</h2>
            <p className="mt-1 text-sm text-ink-muted">Dữ liệu tại {formatAsOf(data.asOfUtc)}.</p>
          </div>
          <StatusCounts
            counts={data.projectStates}
            activeStatus={filter.status}
            onSelect={(st) => handleStatusChange(filter.status === st ? '' : st)}
          />
        </div>
        <FilterToolbar
          search={filter.search ?? ''}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Tìm theo mã hoặc tên đồ án…"
          searchLabel="Tìm đồ án"
          controls={
            <>
              <label className="ft-select-wrap" htmlFor="supervisor-dashboard-status">
                <span className="sr-only">Trạng thái</span>
                <select
                  id="supervisor-dashboard-status"
                  aria-label="Trạng thái"
                  value={filter.status ?? ''}
                  onChange={event => handleStatusChange(event.target.value)}
                  className="ft-select"
                >
                  <option value="">Tất cả trạng thái</option>
                  {statuses.map(status => <option key={status} value={status}>{projectStatusLabel(status)}</option>)}
                </select>
              </label>
              {env.aiAdvisoryEnabled && (
                <label className="ft-select-wrap">
                  <span className="sr-only">Mức rủi ro</span>
                  <select
                    aria-label="Mức rủi ro"
                    className="ft-select"
                    value={riskFilter}
                    onChange={(event) => setRiskFilter(event.target.value)}
                  >
                    <option value="ALL">Mọi mức rủi ro</option>
                    <option value="CRITICAL">{displayLabel('CRITICAL')}</option>
                    <option value="HIGH">{displayLabel('HIGH')}</option>
                    <option value="MEDIUM">{displayLabel('MEDIUM')}</option>
                    <option value="LOW">{displayLabel('LOW')}</option>
                  </select>
                </label>
              )}
              <button
                type="button"
                aria-pressed={onlyAttention}
                onClick={() => setOnlyAttention((v) => !v)}
                className={`ft-btn ${onlyAttention ? 'is-active' : ''}`}
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">priority_high</span>
                Cần chú ý
              </button>
            </>
          }
          sort={{
            value: sortBy,
            onChange: (value) => setSortBy(value as SortKey),
            options: [
              { value: 'default', label: 'Mặc định' },
              { value: 'pending', label: 'Nhiều báo cáo chờ duyệt' },
              { value: 'risk', label: 'Rủi ro cao nhất' },
              { value: 'progress-asc', label: 'Tiến độ thấp trước' },
            ],
          }}
          activeChips={activeChips}
          onRemoveChip={(id) => {
            if (id === 'search') handleSearchChange('')
            if (id === 'status') handleStatusChange('')
            if (id === 'risk') setRiskFilter('ALL')
            if (id === 'attention') setOnlyAttention(false)
          }}
          onClearAll={clearFilters}
          hasActiveFilters={activeChips.length > 0 || sortBy !== 'default'}
          resultSummary={`Hiển thị ${visibleProjects.length} / ${data.projects.totalCount} đồ án`}
          pagination={(data.projects.totalPages > 1 || data.projects.totalCount > data.projects.pageSize) ? { page: filter.page ?? 1, pages: data.projects.totalPages, total: data.projects.totalCount, pageSize: filter.pageSize ?? data.projects.pageSize, busy: loading, onPage: (page) => setFilter(current => ({ ...current, page })) } : undefined}
        />
        {visibleProjects.length === 0 ? (
          <p className="text-sm text-ink-muted">Không có đồ án phù hợp với bộ lọc hiện tại.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {visibleProjects.map(project => <ProjectRow key={project.id} project={project} />)}
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
}

function StatusCounts({ counts, activeStatus, onSelect }: { counts: SupervisorDashboard['projectStates']; activeStatus?: string; onSelect: (status: string) => void }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Phân bố trạng thái đồ án">
      {counts.map(item => {
        const selected = activeStatus === item.status
        return (
          <li key={item.status}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(item.status)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${selected ? 'border-primary bg-primary text-white' : 'border-primary/20 bg-primary-subtle text-primary hover:bg-primary/15'}`}
            >
              {displayLabel(item.status)}: {item.count}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function ProjectRow({ project }: { project: DashboardProject }) {
  const risk = project.analysis?.riskLevel
  const progressPct = project.analysis?.progressSummary?.progressPercentage
  const hasPending = project.pendingProgressReviews > 0
  const normalized = project.status.replaceAll('_', '').toUpperCase()
  return <li className="flex flex-wrap items-center justify-between gap-4 py-4 text-sm transition-colors hover:bg-canvas/50 rounded-lg px-3">
    <div className="min-w-0 flex-1">
      <p className="font-semibold text-ink text-base leading-snug">{project.code} · {project.title}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        <StatusBadge
          tone={normalized === 'ACTIVE' ? 'success' : normalized === 'FINALSUBMISSION' ? 'info' : 'neutral'}
          label={displayLabel(project.status)}
        />
        {env.aiAdvisoryEnabled && risk && (
          <StatusBadge
            tone={risk === 'HIGH' || risk === 'CRITICAL' ? 'danger' : risk === 'LOW' ? 'success' : 'warning'}
            label={`Rủi ro: ${displayLabel(risk)}`}
          />
        )}
        <span>Bộ môn: <strong className="text-ink-soft">{project.departmentName ?? 'Chưa có bộ môn'}</strong></span>
        {hasPending ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-status-warning-bg px-2 py-0.5 font-bold text-status-warning-text">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">pending_actions</span>
            {project.pendingProgressReviews} báo cáo chờ duyệt
          </span>
        ) : (
          <span className="text-ink-muted">· 0 báo cáo chờ duyệt</span>
        )}
      </div>
      {progressPct != null && (
        <div className="mt-2.5 flex items-center gap-3 max-w-xs">
          <div className="h-1.5 flex-1 rounded-full bg-canvas border border-hairline overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }} />
          </div>
          <span className="text-xs font-semibold tabular-nums text-ink-soft">{new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(progressPct)}% tiến độ</span>
        </div>
      )}
    </div>
    {normalized === 'ACTIVE' ? (
      <Link className="inline-flex min-h-11 items-center justify-center rounded-lg border border-primary bg-card px-4 text-xs font-bold text-primary hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors shadow-2xs" to={`/supervisor/projects/${project.id}/workspace`}>
        Mở không gian đồ án
      </Link>
    ) : normalized === 'FINALSUBMISSION' ? (
      <Link className="inline-flex min-h-11 items-center justify-center rounded-lg border border-hairline bg-card px-4 text-xs font-bold text-ink-soft hover:border-primary hover:text-primary hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors shadow-2xs" to={`/supervisor/projects/${project.id}/final-submission`}>
        Xem bàn giao cuối kỳ
      </Link>
    ) : normalized === 'COMPLETED' || normalized === 'ARCHIVED' ? (
      <Link className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-hairline bg-card px-4 text-xs font-semibold text-ink-soft hover:border-primary hover:text-primary hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors shadow-2xs" to={`/supervisor/projects/${project.id}/workspace`}>
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">visibility</span>
        Xem hồ sơ (Chỉ xem)
      </Link>
    ) : null}
  </li>
}

function formatAsOf(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(date) }
