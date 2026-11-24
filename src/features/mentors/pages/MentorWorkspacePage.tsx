import { SpotlightLink } from '../../../components/ui/SpotlightLink'
import { ButtonLink } from '../../../components/ui/ButtonLink'
import { projectStatusLabel } from '../../projects/utils/project-status'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { FilterToolbar } from '../../../components/ui/FilterToolbar'
import { Pagination } from '../../../components/ui/Pagination'
import { useClientPagination } from '../../../components/ui/useClientPagination'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { WorkspaceEmptyState } from '../../../components/ui/WorkspaceState'
import { ListLoading } from '../../../components/ui/ListLoading'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { env } from '../../../app/config/env'
import { HttpError } from '../../../services/http/http-client'
import { services } from '../../../services/service-gateway'
import type { ProjectDto, SupervisorAssignmentDto } from '../../../types/backend'
import { loadOwnSupervisorAssignments } from '../../supervisors/utils/loadOwnSupervisorAssignments'
import { useSupervisorProgressReview } from '../../supervisors/hooks/useSupervisorProgressReview'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { AuthSessionContext } from '../../auth/context/auth-session-context'
import { getAcademicHierarchy } from '../../academic/api/academic-api'
import type { AcademicHierarchyOrganization } from '../../academic/types/academic.types'
import { createAcademicNameResolver } from '../../projects/components/academic-name-resolver'

type AssignmentProject = { assignment: SupervisorAssignmentDto; project: ProjectDto | null; error: string | null }
type MentorStatusFilter = 'ALL' | 'ACTIVE' | 'READONLY' | 'OTHER'
type MentorSort = 'default' | 'title' | 'major'

const isMentor = (assignment: SupervisorAssignmentDto) => assignment.assignmentType === 'DISCIPLINE_MENTOR' && assignment.majorId != null && !assignment.endedAt
const normalizeStatus = (status?: string | null) => (status ?? '').replaceAll('_', '').toUpperCase()
const isReadableStage = (status?: string | null) => ['ACTIVE', 'FINALSUBMISSION', 'COMPLETED', 'ARCHIVED'].includes(normalizeStatus(status))

export function MentorWorkspacePage() {
  const [items, setItems] = useState<AssignmentProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [majorFilter, setMajorFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<MentorStatusFilter>('ALL')
  const [sortBy, setSortBy] = useState<MentorSort>('default')

  const authSession = useContext(AuthSessionContext)
  const token = authSession?.session?.accessToken
  const [hierarchy, setHierarchy] = useState<AcademicHierarchyOrganization[]>([])

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    getAcademicHierarchy(token, { search: '', includeInactive: true }, controller.signal)
      .then(result => { if (!controller.signal.aborted) setHierarchy(result) })
      .catch(() => { /* silent fallback */ })
    return () => controller.abort()
  }, [token])

  const academicResolver = useMemo(() => createAcademicNameResolver(hierarchy), [hierarchy])

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const assignments = (await loadOwnSupervisorAssignments({ status: 'ACTIVE' })).filter(isMentor)
      const resolved = await Promise.all(assignments.map(async assignment => {
        try { return { assignment, project: await services.project.getProject(assignment.projectId), error: null } }
        catch (reason) { return { assignment, project: null, error: reason instanceof HttpError && reason.status === 403 ? 'Hệ thống không cấp quyền đọc đồ án này.' : 'Không thể tải đồ án.' } }
      }))
      setItems(resolved)
    } catch (reason) {
      setItems([])
      setError(reason instanceof HttpError && reason.status === 403 ? 'Bạn chưa có quyền xem phân công hướng dẫn chuyên ngành.' : 'Chưa tải được phân công hướng dẫn chuyên ngành.')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const resolveMajorName = useCallback((assignment: SupervisorAssignmentDto, project: ProjectDto | null) => {
    if (!assignment.majorId) return 'Chưa xác định chuyên ngành'
    const fromProject = project?.majors?.find(m => m.majorId === assignment.majorId)?.majorName
    return fromProject || academicResolver.major(assignment.majorId)
  }, [academicResolver])

  const majorOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of items) {
      if (item.assignment.majorId != null) {
        map.set(String(item.assignment.majorId), resolveMajorName(item.assignment, item.project))
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'vi'))
  }, [items, resolveMajorName])

  const summary = useMemo(() => ({
    total: items.length,
    active: items.filter(i => normalizeStatus(i.project?.status) === 'ACTIVE').length,
    readonly: items.filter(i => ['FINALSUBMISSION', 'COMPLETED', 'ARCHIVED'].includes(normalizeStatus(i.project?.status))).length,
  }), [items])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = items.filter(({ assignment, project }) => {
      const normalized = normalizeStatus(project?.status)
      if (statusFilter === 'ACTIVE' && normalized !== 'ACTIVE') return false
      if (statusFilter === 'READONLY' && !['FINALSUBMISSION', 'COMPLETED', 'ARCHIVED'].includes(normalized)) return false
      if (statusFilter === 'OTHER' && ['ACTIVE', 'FINALSUBMISSION', 'COMPLETED', 'ARCHIVED'].includes(normalized)) return false
      if (majorFilter !== 'ALL' && String(assignment.majorId ?? '') !== majorFilter) return false
      if (!q) return true
      const majorName = resolveMajorName(assignment, project).toLowerCase()
      return (project?.title ?? '').toLowerCase().includes(q)
        || (project?.code ?? '').toLowerCase().includes(q)
        || majorName.includes(q)
    })

    if (sortBy === 'title') {
      return [...list].sort((a, b) => (a.project?.title ?? '').localeCompare(b.project?.title ?? '', 'vi'))
    }
    if (sortBy === 'major') {
      return [...list].sort((a, b) => resolveMajorName(a.assignment, a.project).localeCompare(resolveMajorName(b.assignment, b.project), 'vi'))
    }
    return list
  }, [items, majorFilter, resolveMajorName, search, sortBy, statusFilter])

  const pager = useClientPagination(filteredItems, 10)

  const activeChips = [
    ...(search.trim() ? [{ id: 'search', label: 'Từ khóa', value: search.trim() }] : []),
    ...(statusFilter !== 'ALL' ? [{ id: 'status', label: 'Giai đoạn', value: ({ ACTIVE: 'Đang thực hiện', READONLY: 'Bàn giao / Lưu trữ', OTHER: 'Giai đoạn khác' })[statusFilter] }] : []),
    ...(majorFilter !== 'ALL' ? [{ id: 'major', label: 'Chuyên ngành', value: majorOptions.find(([id]) => id === majorFilter)?.[1] ?? majorFilter }] : []),
  ]

  const clearFilters = () => {
    setSearch('')
    setMajorFilter('ALL')
    setStatusFilter('ALL')
    setSortBy('default')
  }

  return (
    <WorkspacePage
      size="wide"
      className="space-y-6 pb-12"
      title="Hướng dẫn chuyên ngành"
      eyebrow="Phân công chuyên ngành"
      description="Theo dõi công việc, báo cáo và tiến độ của các chuyên ngành bạn được phân công hướng dẫn."
      action={<Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại" disabled={loading} onClick={() => void load()} />}
    >
      {error && <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{error} <button type="button" onClick={() => void load()} className="ml-2 min-h-11 font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Thử lại</button></section>}
      {loading && <ListLoading label="Đang tải phân công hướng dẫn…" />}
      {!loading && !error && !items.length && <WorkspaceEmptyState title="Chưa có phân công hướng dẫn chuyên ngành" message="Bạn sẽ thấy đồ án ở đây khi được phân công hướng dẫn chuyên ngành." />}

      {!loading && items.length > 0 ? (
        <>
          <StatTileRow
            tiles={[
              { icon: 'hub', label: 'Phân công chuyên ngành', value: summary.total, hero: true },
              { icon: 'play_circle', label: 'Đang thực hiện', value: summary.active, tone: summary.active > 0 ? 'success' : 'neutral' },
              { icon: 'visibility', label: 'Bàn giao / Chỉ xem', value: summary.readonly },
            ]}
          />

          <div className="rounded-xl border border-primary/20 bg-primary-subtle p-4 text-xs leading-relaxed text-primary shadow-2xs">
            <strong>Thông tin điều phối Đồ án Liên ngành:</strong> Giảng viên hướng dẫn chuyên ngành (Discipline Mentor) theo dõi, đôn đốc và ký duyệt các nội dung công việc trong phạm vi chuyên môn được phân công. Tiến độ chung và đánh giá toàn diện do Giảng viên hướng dẫn chính (Primary Supervisor) và Hội đồng thẩm định quản trị.
          </div>

          <FilterToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Tìm theo mã, tên đồ án hoặc chuyên ngành…"
            searchLabel="Tìm đồ án hướng dẫn chuyên ngành"
            activeTab={statusFilter}
            onTabChange={(value) => setStatusFilter(value as MentorStatusFilter)}
            tabsLabel="Lọc theo giai đoạn đồ án"
            tabs={[
              { value: 'ALL', label: 'Tất cả', count: summary.total },
              { value: 'ACTIVE', label: 'Đang thực hiện', count: summary.active },
              { value: 'READONLY', label: 'Bàn giao / Lưu trữ', count: summary.readonly },
            ]}
            controls={
              majorOptions.length > 1 ? (
                <label className="ft-select-wrap">
                  <span className="sr-only">Chuyên ngành</span>
                  <select aria-label="Chuyên ngành" value={majorFilter} onChange={(e) => setMajorFilter(e.target.value)} className="ft-select">
                    <option value="ALL">Tất cả chuyên ngành</option>
                    {majorOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                  </select>
                </label>
              ) : undefined
            }
            sort={{
              value: sortBy,
              onChange: (value) => setSortBy(value as MentorSort),
              options: [
                { value: 'default', label: 'Mặc định' },
                { value: 'title', label: 'Tên đồ án A–Z' },
                { value: 'major', label: 'Chuyên ngành A–Z' },
              ],
            }}
            activeChips={activeChips}
            onRemoveChip={(id) => {
              if (id === 'search') setSearch('')
              if (id === 'status') setStatusFilter('ALL')
              if (id === 'major') setMajorFilter('ALL')
            }}
            onClearAll={clearFilters}
            hasActiveFilters={activeChips.length > 0}
            resultSummary={activeChips.length > 0 ? `Hiển thị ${filteredItems.length} / ${items.length} phân công` : undefined}
          />

          {filteredItems.length === 0 ? (
            <WorkspaceEmptyState
              title="Không tìm thấy phân công phù hợp"
              message="Thử điều chỉnh từ khóa hoặc xóa bộ lọc để xem toàn bộ đồ án được phân công."
              action={<Button variant="secondary" onClick={clearFilters}>Xóa bộ lọc</Button>}
            />
          ) : (
            <>
              <ul className="grid items-stretch gap-4 md:grid-cols-2">
                {pager.paginatedItems.map(({ assignment, project, error: projectError }) => {
                  const majorName = resolveMajorName(assignment, project)
                  const isInterdisciplinary = project?.academicScope?.projectMode === 'INTERDISCIPLINARY'
                  const normalized = normalizeStatus(project?.status)
                  const readable = isReadableStage(project?.status)
                  const isActiveStage = normalized === 'ACTIVE'
                  const base = `/mentor/projects/${assignment.projectId}/majors/${assignment.majorId}`
                  return (
                    <li key={assignment.id} className="flex h-full min-w-0 flex-col justify-between gap-4 workspace-surface p-5">
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                            Phân công: {majorName}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {isInterdisciplinary && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-tag-se/25 bg-tag-se-bg px-2.5 py-0.5 text-xs font-bold text-tag-se">
                                <span className="material-symbols-outlined text-sm" aria-hidden="true">hub</span>
                                Liên ngành
                              </span>
                            )}
                            {project?.status && (
                              <StatusBadge
                                tone={isActiveStage ? 'success' : readable ? 'neutral' : 'warning'}
                                label={projectStatusLabel(project.status)}
                              />
                            )}
                          </div>
                        </div>
                        <h2 className="mt-2 break-words font-heading text-lg font-bold text-ink">
                          {project?.title ?? 'Đồ án được phân công'}
                        </h2>
                        <p className="mt-1 font-mono text-xs text-ink-muted">
                          {[project?.code, project?.teamName].filter(Boolean).join(' · ') || 'Đồ án chuyên ngành'}
                        </p>
                      </div>

                      {projectError ? (
                        <p role="alert" className="text-sm text-status-error-text">{projectError}</p>
                      ) : !readable ? (
                        <p className="text-sm text-ink-muted">Đồ án hiện chưa bước vào giai đoạn thực hiện. Không gian theo dõi sẽ mở khi đồ án được kích hoạt.</p>
                      ) : (
                        <div className="space-y-2 border-t border-hairline pt-3">
                          {!isActiveStage && (
                            <p className="text-xs text-ink-muted">Đồ án đã chuyển qua giai đoạn bàn giao/hoàn thành — có thể mở ở chế độ chỉ xem.</p>
                          )}
                          <nav className="flex flex-wrap gap-2" aria-label="Chức năng hướng dẫn chuyên ngành">
                            <ButtonLink variant={isActiveStage ? 'primary' : 'secondary'} to={`${base}/workspace`}>
                              {isActiveStage ? 'Mở phạm vi theo dõi' : 'Xem phạm vi (Chỉ xem)'}
                            </ButtonLink>
                            <ButtonLink to={`${base}/tasks`}>Công việc</ButtonLink>
                            <ButtonLink to={`${base}/reports`}>Báo cáo tiến độ</ButtonLink>
                            <ButtonLink to={`${base}/meetings`}>Lịch họp</ButtonLink>
                            {env.gatesEnabled && <ButtonLink to={`${base}/checkpoints`}>Mốc kiểm soát</ButtonLink>}
                          </nav>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
              {pager.showPagination && (
                <Pagination
                  page={pager.page}
                  pages={pager.pages}
                  total={pager.total}
                  pageSize={pager.pageSize}
                  onPage={pager.setPage}
                  onPageSizeChange={pager.setPageSize}
                />
              )}
            </>
          )}
        </>
      ) : null}
    </WorkspacePage>
  )
}

export function MentorProjectWorkspacePage() {
  const access = useExecutionAccess()
  const progress = useSupervisorProgressReview(access.project.id)

  const mentorMajorName = access.supervisor?.majorId
    ? access.project.majors?.find(m => m.majorId === access.supervisor?.majorId)?.majorName ?? 'Hướng dẫn chuyên ngành'
    : 'Hướng dẫn chuyên ngành'

  const majorMembers = useMemo(() => {
    const all = access.team?.members ?? []
    if (!access.supervisor?.majorId) return all
    const scoped = all.filter((m) => m.majorId === access.supervisor?.majorId)
    return scoped.length > 0 ? scoped : all
  }, [access.supervisor?.majorId, access.team?.members])

  const summary = progress.summary.state === 'ready' ? progress.summary.data : null
  const attention = progress.attention.state === 'ready' ? progress.attention.data : null
  const reportsData = progress.reports.state === 'ready' ? progress.reports.data : null

  const areas: Array<[string, string, string, string]> = [
    ['tasks', 'checklist', 'Công việc theo phạm vi', 'Theo dõi phần việc trong chuyên ngành được phân công.'],
    ['reports', 'description', 'Báo cáo tiến độ', 'Theo dõi báo cáo định kỳ và phản hồi kết quả thực hiện của nhóm.'],
    ['meetings', 'groups', 'Cuộc họp & Phòng trực tuyến', 'Xem lịch trao đổi, tham gia phòng họp trực tuyến và biên bản.'],
    ['evidence', 'verified', 'Sổ minh chứng', 'Đối chiếu tài liệu và kết quả theo nguồn, chuyên ngành.'],
    ...(env.gatesEnabled ? [['checkpoints', 'flag', 'Mốc kiểm soát tiến độ', 'Theo dõi kế hoạch và kết luận từng giai đoạn.'] as [string, string, string, string]] : []),
  ]

  return (
    <WorkspacePage
      size="wide"
      className="space-y-6 pb-12"
      title={access.project.title}
      eyebrow={`Theo dõi theo chuyên ngành · ${mentorMajorName}`}
      description="Theo dõi tiến độ, công việc, báo cáo và minh chứng trong phạm vi chuyên ngành được phân công."
      action={<Button variant="secondary" size="sm" icon="refresh" aria-label="Làm mới dữ liệu" onClick={progress.reload} />}
    >
      <StatTileRow
        tiles={[
          {
            icon: 'donut_large',
            label: 'Tiến độ công việc',
            value: summary ? `${Number(summary.progressPercentage.toFixed(1)).toLocaleString('vi-VN')}%` : '—',
            hero: true,
            caption: summary ? `${summary.doneTasks}/${summary.totalTasks} việc · ${summary.completedMilestones}/${summary.totalMilestones} mốc` : 'Đang đồng bộ dữ liệu hệ thống…',
          },
          {
            icon: 'warning',
            label: 'Cần lưu ý',
            value: attention ? attention.overdueTasks.length + attention.blockedTasks.length : '—',
            tone: attention && (attention.overdueTasks.length + attention.blockedTasks.length) > 0 ? 'warning' : 'neutral',
            caption: attention ? `${attention.overdueTasks.length} quá hạn · ${attention.blockedTasks.length} vướng mắc` : 'Đang tải…',
          },
          {
            icon: 'article',
            label: 'Báo cáo tiến độ',
            value: reportsData ? reportsData.totalCount : '—',
            caption: reportsData ? `${reportsData.items.filter(r => r.status === 'SUBMITTED').length} chờ phản hồi` : 'Đang tải…',
          },
          {
            icon: 'group',
            label: 'Thành viên phạm vi',
            value: majorMembers.length,
            caption: access.team?.name ?? access.project.teamName ?? 'Nhóm đồ án',
          },
        ]}
      />

      <section className="grid items-stretch gap-4 lg:grid-cols-2">
        <div className="flex h-full flex-col justify-between gap-3 rounded-xl border border-hairline bg-card p-5 shadow-xs">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-heading text-base font-bold text-ink">Thành viên phụ trách ({mentorMajorName})</h2>
              <StatusBadge tone={access.readOnly ? 'neutral' : 'success'} label={access.readOnly ? 'Chế độ chỉ xem' : 'Đang hoạt động'} />
            </div>
            {majorMembers.length > 0 ? (
              <ul className="divide-y divide-hairline">
                {majorMembers.map((member) => (
                  <li key={member.userId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={member.fullName} toneSeed={member.userId} size="sm" shape="circle" />
                      <span className="truncate font-semibold text-ink">{member.fullName}</span>
                    </div>
                    {member.isLeader && <StatusBadge tone="info" label="Trưởng nhóm" />}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">Chưa có danh sách thành viên trong phạm vi chuyên ngành này.</p>
            )}
          </div>
        </div>

        <div className="flex h-full flex-col justify-between gap-3 rounded-xl border border-hairline bg-card p-5 shadow-xs">
          <div className="space-y-3">
            <h2 className="font-heading text-base font-bold text-ink">Phạm vi hướng dẫn chuyên ngành</h2>
            <p className="text-sm leading-6 text-ink-muted">
              Bạn theo dõi phần việc, báo cáo tiến độ, lịch họp và minh chứng thuộc chuyên ngành <strong className="text-ink-soft">{mentorMajorName}</strong>.
              Kế hoạch tổng thể và quyết định đánh giá cuối cùng do Giảng viên hướng dẫn chính và Hội đồng thẩm định quản trị.
            </p>
          </div>
          {attention && (attention.overdueTasks.length > 0 || attention.blockedTasks.length > 0) && (
            <div className="rounded-lg border border-hairline border-l-4 border-l-[var(--color-accent-amber)] bg-card p-3 text-xs text-ink-soft">
              <p className="font-semibold text-status-warning-text">Đồ án hiện có {attention.overdueTasks.length} việc quá hạn và {attention.blockedTasks.length} việc vướng mắc.</p>
              <Link to={`${access.routeBase}/tasks?overdue=true`} className="mt-1 inline-block font-bold text-primary underline">Kiểm tra danh sách công việc →</Link>
            </div>
          )}
        </div>
      </section>

      <nav className="workspace-launchpad grid items-stretch overflow-hidden workspace-surface sm:grid-cols-2" aria-label="Khu vực hướng dẫn chuyên ngành">
        {areas.map(([path, icon, title, description]) => (
          <SpotlightLink
            key={path}
            to={`${access.routeBase}/${path}`}
            className="flex h-full min-w-0 flex-col justify-between gap-2 border-b border-hairline p-5 hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary sm:border-r"
          >
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 font-semibold text-ink">
                <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">{icon}</span>
                <span className="break-words">{title}</span>
              </span>
              <span className="block break-words text-sm leading-6 text-ink-muted">{description}</span>
            </div>
            <span className="workspace-action-link mt-2">Xem chi tiết<span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></span>
          </SpotlightLink>
        ))}
      </nav>
    </WorkspacePage>
  )
}
