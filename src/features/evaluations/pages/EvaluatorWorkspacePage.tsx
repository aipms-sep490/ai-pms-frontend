import { readAllPages } from '../../../services/api/paged-read'
import { Button } from '../../../components/ui/Button'
import { FilterToolbar } from '../../../components/ui/FilterToolbar'
import { Pagination } from '../../../components/ui/Pagination'
import { useClientPagination } from '../../../components/ui/useClientPagination'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { dateTimeLabel } from '../../execution/execution-utils'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { ListLoading } from '../../../components/ui/ListLoading'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { WorkspaceEmptyState } from '../../../components/ui/WorkspaceState'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../../services/api/evaluations.api'
import { evaluationError } from '../evaluation-errors'
import { evaluationStageLabel, type EvaluationAssignment, type EvaluationDraft } from '../evaluation-types'
import { displayLabel } from '../../../components/ui/display-label'

type DraftState = { status: 'loading' | 'ready' | 'unavailable'; draft: EvaluationDraft | null }
type StatusFilter = 'all' | 'pending' | 'finalized' | 'unavailable'
type StageFilter = 'ALL' | 'ON_GOING' | 'COLD' | 'DEFENSE'
type ScopeFilter = 'ALL' | 'COMMON' | 'MAJOR_SPECIFIC' | 'INDIVIDUAL'
type SortKey = 'newest' | 'pending-first' | 'project-asc'

function scopeLabel(assignment: EvaluationAssignment): string {
  if (assignment.scope === 'COMMON') return 'Phạm vi chung của đồ án'
  if (assignment.scope === 'MAJOR_SPECIFIC') return assignment.majorName ?? 'Chưa tải được tên ngành'
  if (assignment.scope === 'INDIVIDUAL') return assignment.studentName ?? 'Chưa tải được tên sinh viên'
  return 'Phạm vi chưa được máy chủ xác nhận'
}

function draftLabel(draft: EvaluationDraft | null): string {
  if (!draft) return 'Chưa tạo bản nháp'
  return draft.status === 'FINALIZED' ? 'Đã chốt đánh giá' : 'Đang chấm bản nháp'
}

/** Operational landing. Counts are derived only from the active assignments and their returned drafts. */
export function EvaluatorWorkspacePage() {
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<StageFilter>('ALL')
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL')
  const [sortBy, setSortBy] = useState<SortKey>('newest')

  const [assignments, setAssignments] = useState<EvaluationAssignment[]>([])
  const [drafts, setDrafts] = useState<Record<number, DraftState>>({})
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading')

  const load = useCallback(async () => {
    setState('loading')
    try {
      const items = await api.getAllMyEvaluationAssignments()
      setAssignments(items)
      const projectIds = [...new Set(items.map((item) => item.projectId))]
      const rows = await Promise.all(projectIds.map(async (projectId) => {
        try { return [projectId, { status: 'ready' as const, items: (await readAllPages(pageNum => api.getProjectEvaluations(projectId, undefined, pageNum))) }] as const }
        catch { return [projectId, { status: 'unavailable' as const, items: [] as EvaluationDraft[] }] as const }
      }))
      const next: Record<number, DraftState> = {}
      for (const assignment of items) {
        const project = rows.find(([projectId]) => projectId === assignment.projectId)?.[1]
        next[assignment.id] = project?.status === 'ready'
          ? { status: 'ready', draft: project.items.find((draft) => draft.assignmentId === assignment.id) ?? null }
          : { status: 'unavailable', draft: null }
      }
      setDrafts(next)
      setState('ready')
    } catch {
      setState('unavailable')
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const hasUnavailable = useMemo(
    () => Object.values(drafts).some((row) => row.status === 'unavailable'),
    [drafts],
  )

  const summary = useMemo(() => ({
    active: assignments.length,
    projects: new Set(assignments.map(item => item.projectId)).size,
    drafts: Object.values(drafts).filter((row) => row.status === 'ready' && row.draft?.status === 'DRAFT').length,
    finalized: Object.values(drafts).filter((row) => row.status === 'ready' && row.draft?.status === 'FINALIZED').length,
    pending: assignments.filter((a) => drafts[a.id]?.status === 'ready' && drafts[a.id]?.draft?.status !== 'FINALIZED').length,
    unavailable: Object.values(drafts).filter((row) => row.status === 'unavailable').length,
  }), [assignments, drafts])

  const visibleAssignments = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = assignments.filter((assignment) => {
      const row = drafts[assignment.id]
      if (filter === 'finalized' && row?.draft?.status !== 'FINALIZED') return false
      if (filter === 'unavailable' && row?.status !== 'unavailable') return false
      if (filter === 'pending' && !(row?.status === 'ready' && row?.draft?.status !== 'FINALIZED')) return false

      if (stageFilter !== 'ALL' && assignment.stage !== stageFilter) return false
      if (scopeFilter !== 'ALL' && assignment.scope !== scopeFilter) return false

      if (!q) return true
      const rubricTitle = (assignment.rubricName ?? row?.draft?.rubricName ?? '').toLowerCase()
      return (assignment.projectTitle ?? '').toLowerCase().includes(q)
        || (assignment.componentName ?? '').toLowerCase().includes(q)
        || rubricTitle.includes(q)
        || scopeLabel(assignment).toLowerCase().includes(q)
    })

    return [...list].sort((a, b) => {
      if (sortBy === 'project-asc') {
        return (a.projectTitle ?? '').localeCompare(b.projectTitle ?? '', 'vi')
      }
      if (sortBy === 'pending-first') {
        const rank = (id: number) => drafts[id]?.draft?.status === 'FINALIZED' ? 2 : drafts[id]?.draft?.status === 'DRAFT' ? 0 : 1
        const diff = rank(a.id) - rank(b.id)
        if (diff !== 0) return diff
      }
      return (Date.parse(b.assignedAt) || 0) - (Date.parse(a.assignedAt) || 0)
    })
  }, [assignments, drafts, filter, scopeFilter, search, sortBy, stageFilter])

  const groupedAssignments = useMemo(() => Array.from(visibleAssignments.reduce((groups, assignment) => {
    const projectAssignments = groups.get(assignment.projectId) ?? []
    projectAssignments.push(assignment)
    groups.set(assignment.projectId, projectAssignments)
    return groups
  }, new Map<number, EvaluationAssignment[]>()).values()), [visibleAssignments])

  const groupPager = useClientPagination(groupedAssignments, 10)

  const activeChips = [
    ...(search.trim() ? [{ id: 'search', label: 'Từ khóa', value: search.trim() }] : []),
    ...(filter !== 'all' ? [{ id: 'status', label: 'Trạng thái', value: ({ pending: 'Chưa chốt', finalized: 'Đã chốt', unavailable: 'Chưa tải được trạng thái' })[filter] }] : []),
    ...(stageFilter !== 'ALL' ? [{ id: 'stage', label: 'Giai đoạn', value: evaluationStageLabel(stageFilter) }] : []),
    ...(scopeFilter !== 'ALL' ? [{ id: 'scope', label: 'Phạm vi', value: ({ COMMON: 'Chung của đồ án', MAJOR_SPECIFIC: 'Theo ngành', INDIVIDUAL: 'Cá nhân' })[scopeFilter] }] : []),
  ]

  const clearFilters = () => {
    setSearch('')
    setFilter('all')
    setStageFilter('ALL')
    setScopeFilter('ALL')
    setSortBy('newest')
    groupPager.setPage(1)
  }

  return (
    <WorkspacePage
      size="wide"
      title="Đánh giá đồ án"
      eyebrow="Đánh giá theo phân công"
      description="Theo dõi các lượt chấm được giao, lưu nhận xét và hoàn thiện đánh giá."
      className="evaluation-workspace space-y-6 pb-12"
      action={<Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại" disabled={state === 'loading'} onClick={() => void load()} />}
    >
      {state === 'loading' ? <ListLoading label="Đang tải phân công đánh giá…" /> : null}
      {state === 'unavailable' ? <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{evaluationError(null)} <button type="button" className="ml-2 min-h-11 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => void load()}>Tải lại</button></section> : null}

      {state === 'ready' ? <>
        <section aria-label="Tóm tắt phân công" className="role-metric-compact">
          <StatTileRow tiles={[
            { icon: 'assignment_ind', label: 'Phân công đang hiệu lực', value: summary.active, hero: true },
            { icon: 'groups', label: 'Đồ án được phân chấm', value: summary.projects },
            { icon: 'edit_note', label: 'Bản nháp đang chấm', value: summary.drafts, tone: summary.drafts > 0 ? 'warning' : 'neutral' },
            { icon: 'verified', label: 'Đã chốt', value: summary.finalized, tone: summary.finalized > 0 ? 'success' : 'neutral' },
          ]} />
        </section>

        {hasUnavailable ? <p role="status" className="rounded-lg border border-status-warning-border bg-status-warning-bg px-4 py-2.5 text-sm text-status-warning-text">Một số phân công chưa tải được trạng thái. Các số liệu bản nháp và đã chốt chỉ tính phần tải thành công.</p> : null}

        {assignments.length > 0 && (
          <FilterToolbar
            layout="stacked"
            search={search}
            onSearchChange={(val) => { setSearch(val); groupPager.setPage(1) }}
            searchPlaceholder="Tìm đồ án, bộ tiêu chí…"
            searchLabel="Tìm phân công đánh giá"
            activeTab={filter}
            onTabChange={(value) => { setFilter(value as StatusFilter); groupPager.setPage(1) }}
            tabsLabel="Lọc nhanh trạng thái đánh giá"
            tabs={[
              { value: 'all', label: 'Tất cả', count: summary.active },
              { value: 'pending', label: 'Chưa chốt', count: summary.pending },
              { value: 'finalized', label: 'Đã chốt', count: summary.finalized },
              ...(hasUnavailable ? [{ value: 'unavailable', label: 'Chưa tải trạng thái', count: summary.unavailable }] : []),
            ]}
            controls={
              <>
                <label className="ft-select-wrap">
                  <span className="sr-only">Trạng thái đánh giá</span>
                  <select
                    aria-label="Trạng thái đánh giá"
                    className="ft-select"
                    value={filter}
                    onChange={event => { setFilter(event.target.value as StatusFilter); groupPager.setPage(1) }}
                  >
                    <option value="all">Tất cả phân công</option>
                    <option value="pending">Chưa chốt</option>
                    <option value="finalized">Đã chốt</option>
                    {hasUnavailable && <option value="unavailable">Chưa tải được trạng thái</option>}
                  </select>
                </label>
                <label className="ft-select-wrap">
                  <span className="sr-only">Giai đoạn đánh giá</span>
                  <select aria-label="Giai đoạn đánh giá" className="ft-select" value={stageFilter} onChange={e => { setStageFilter(e.target.value as StageFilter); groupPager.setPage(1) }}>
                    <option value="ALL">Tất cả giai đoạn</option>
                    <option value="ON_GOING">{evaluationStageLabel('ON_GOING')}</option>
                    <option value="COLD">{evaluationStageLabel('COLD')}</option>
                    <option value="DEFENSE">{evaluationStageLabel('DEFENSE')}</option>
                  </select>
                </label>
                <label className="ft-select-wrap">
                  <span className="sr-only">Phạm vi chấm</span>
                  <select aria-label="Phạm vi chấm" className="ft-select" value={scopeFilter} onChange={e => { setScopeFilter(e.target.value as ScopeFilter); groupPager.setPage(1) }}>
                    <option value="ALL">Tất cả phạm vi</option>
                    <option value="COMMON">Chung của đồ án</option>
                    <option value="MAJOR_SPECIFIC">Theo ngành</option>
                    <option value="INDIVIDUAL">Cá nhân</option>
                  </select>
                </label>
              </>
            }
            sort={{
              value: sortBy,
              onChange: (value) => setSortBy(value as SortKey),
              options: [
                { value: 'newest', label: 'Mới phân công nhất' },
                { value: 'pending-first', label: 'Chưa chốt trước' },
                { value: 'project-asc', label: 'Tên đồ án A–Z' },
              ],
            }}
            activeChips={activeChips}
            onRemoveChip={(id) => {
              if (id === 'search') setSearch('')
              if (id === 'status') setFilter('all')
              if (id === 'stage') setStageFilter('ALL')
              if (id === 'scope') setScopeFilter('ALL')
              groupPager.setPage(1)
            }}
            onClearAll={clearFilters}
            hasActiveFilters={activeChips.length > 0}
            resultSummary={activeChips.length > 0 ? `Hiển thị ${visibleAssignments.length} / ${assignments.length} phân công` : undefined}
            pagination={groupPager.showPagination ? { page: groupPager.page, pages: groupPager.pages, total: groupPager.total, pageSize: groupPager.pageSize, onPage: groupPager.setPage } : undefined}
          />
        )}

        {!assignments.length ? <WorkspaceEmptyState title="Chưa có phân công đánh giá đang hiệu lực" message="Bạn sẽ thấy đồ án ở đây khi được phân công chấm." /> : null}
        {assignments.length > 0 && !visibleAssignments.length ? (
          <WorkspaceEmptyState
            title={filter === 'pending' && !search.trim() && stageFilter === 'ALL' && scopeFilter === 'ALL' && !hasUnavailable ? 'Đã chấm hết các phân công' : 'Không có phân công phù hợp'}
            message={filter === 'pending' && !search.trim() && stageFilter === 'ALL' && scopeFilter === 'ALL' && !hasUnavailable ? 'Tất cả phiếu chấm trong phạm vi hiện tại đã được chốt.' : 'Chọn tất cả để xem lại danh sách hoặc điều chỉnh bộ lọc hiện tại.'}
            action={activeChips.length > 0 ? <Button variant="secondary" onClick={clearFilters}>Xóa bộ lọc</Button> : undefined}
          />
        ) : null}

        <section className="space-y-5" aria-label="Danh sách phân công đánh giá">
          {groupPager.paginatedItems.map((projectAssignments) => <section key={projectAssignments[0].projectId} className="space-y-3" aria-label={projectAssignments[0].projectTitle ?? 'Đồ án được phân chấm'}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2">
              <h2 className="font-heading text-lg font-bold text-ink">{projectAssignments[0].projectTitle ?? 'Đồ án được phân chấm'}</h2>
              <span className="rounded-full bg-primary-subtle px-2.5 py-1 text-xs font-semibold text-primary">{projectAssignments.length} lượt chấm được giao</span>
            </div>
            <div className="grid items-stretch gap-3">
              {projectAssignments.map((assignment) => {
                const row = drafts[assignment.id]
                const isFinalized = row?.draft?.status === 'FINALIZED'
                const isDraft = row?.draft?.status === 'DRAFT'
                const rubricTitle = assignment.rubricName ?? row?.draft?.rubricName ?? 'Chưa tải được tên bộ tiêu chí'
                return <article key={assignment.id} className="grid h-full min-w-0 gap-4 rounded-xl border border-hairline bg-card p-5 transition-all hover:border-primary/40 hover:shadow-xs md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-tag-ai-bg px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-tag-ai">
                        {assignment.evaluationType === 'LECTURER' ? 'Hội đồng chấm' : displayLabel(assignment.evaluationType)}
                      </span>
                      <span className="inline-flex items-center rounded-md border border-tag-se/25 bg-tag-se-bg px-2 py-0.5 text-xs font-semibold text-tag-se">{evaluationStageLabel(assignment.stage)}</span>
                      <StatusBadge
                        tone={isFinalized ? 'success' : isDraft ? 'warning' : 'neutral'}
                        label={row?.status === 'unavailable' ? 'Chưa tải được trạng thái' : draftLabel(row?.draft ?? null)}
                      />
                    </div>
                    <h3 className="break-words font-semibold text-ink text-base">{assignment.componentName ?? scopeLabel(assignment)}</h3>
                    <dl className="mt-2 grid gap-x-6 gap-y-1.5 text-xs text-ink-muted sm:grid-cols-2">
                      <div><dt className="inline font-semibold text-ink-soft">Phạm vi chấm: </dt><dd className="inline">{scopeLabel(assignment)}</dd></div>
                      <div><dt className="inline font-semibold text-ink-soft">Bộ tiêu chí: </dt><dd className="inline">{rubricTitle}</dd></div>
                      <div><dt className="inline font-semibold text-ink-soft">Trạng thái: </dt><dd className="inline">{row?.status === 'unavailable' ? 'Chưa tải được trạng thái bản nháp' : draftLabel(row?.draft ?? null)}</dd></div>
                      <div><dt className="inline font-semibold text-ink-soft">Ngày phân công: </dt><dd className="inline">{dateTimeLabel(assignment.assignedAt)}</dd></div>
                    </dl>
                  </div>
                  <Link className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-xs font-bold transition-colors ${isFinalized ? 'border border-hairline bg-canvas text-ink hover:bg-canvas' : isDraft ? 'bg-primary text-white hover:bg-primary-hover shadow-xs' : 'border border-primary bg-card text-primary hover:bg-primary-subtle'}`} to={`/evaluator/assignments/${assignment.id}`}>{row?.status === 'unavailable' ? 'Xem phân công' : row?.draft?.status === 'FINALIZED' ? 'Xem đánh giá' : row?.draft ? 'Tiếp tục chấm' : 'Bắt đầu chấm'}</Link>
                </article>
              })}
            </div>
          </section>)}
        </section>

        {groupPager.showPagination && (
          <Pagination
            page={groupPager.page}
            pages={groupPager.pages}
            total={groupPager.total}
            pageSize={groupPager.pageSize}
            onPage={groupPager.setPage}
            onPageSizeChange={groupPager.setPageSize}
          />
        )}
      </> : null}
    </WorkspacePage>
  )
}
