import { readAllPages } from '../../../services/api/paged-read'
import { Button } from '../../../components/ui/Button'
import { dateTimeLabel } from '../../execution/execution-utils'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { ListLoading } from '../../../components/ui/ListLoading'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { displayLabel } from '../../../components/ui/display-label'
import { Pagination } from '../../../components/ui/Pagination'
import { useClientPagination } from '../../../components/ui/useClientPagination'
import { WorkspaceEmptyState } from '../../../components/ui/WorkspaceState'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../../services/api/evaluations.api'
import { evaluationError } from '../evaluation-errors'
import { evaluationStageLabel, type EvaluationAssignment, type EvaluationDraft } from '../evaluation-types'

type DraftState = { status: 'loading' | 'ready' | 'unavailable'; draft: EvaluationDraft | null }

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
  const [filter, setFilter] = useState<'all' | 'pending' | 'finalized' | 'unavailable'>('all')
  const [search, setSearch] = useState('')
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
        try { return [projectId, { status: 'ready' as const, items: (await readAllPages(page => api.getProjectEvaluations(projectId, undefined, page))) }] as const }
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
  const summary = useMemo(() => ({
    active: assignments.length,
    drafts: Object.values(drafts).filter((row) => row.status === 'ready' && row.draft?.status === 'DRAFT').length,
    finalized: Object.values(drafts).filter((row) => row.status === 'ready' && row.draft?.status === 'FINALIZED').length,
  }), [assignments, drafts])

  const visibleAssignments = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return assignments.filter(assignment => {
      const matchesStatus = filter === 'all' || (filter === 'finalized'
        ? drafts[assignment.id]?.draft?.status === 'FINALIZED'
        : filter === 'unavailable'
          ? drafts[assignment.id]?.status === 'unavailable'
          : drafts[assignment.id]?.status === 'ready' && drafts[assignment.id]?.draft?.status !== 'FINALIZED')
      if (!matchesStatus) return false
      if (!keyword) return true
      const title = (assignment.projectTitle ?? `Đồ án #${assignment.projectId}`).toLowerCase()
      const component = (assignment.componentName ?? '').toLowerCase()
      const scope = scopeLabel(assignment).toLowerCase()
      return title.includes(keyword) || component.includes(keyword) || scope.includes(keyword)
    })
  }, [assignments, drafts, filter, search])

  const groupedAssignments = useMemo(() => Array.from(visibleAssignments.reduce((groups, assignment) => {
    const projectAssignments = groups.get(assignment.projectId) ?? []
    projectAssignments.push(assignment)
    groups.set(assignment.projectId, projectAssignments)
    return groups
  }, new Map<number, EvaluationAssignment[]>()).values()), [visibleAssignments])

  const groupPagination = useClientPagination(groupedAssignments, 8)

  return <WorkspacePage title="Đánh giá đồ án" eyebrow="Đánh giá theo phân công" description="Theo dõi các lượt chấm được giao, lưu nhận xét và hoàn thiện đánh giá." className="evaluation-workspace space-y-5 pb-10" action={<Button variant="secondary" icon="refresh" disabled={state === 'loading'} onClick={() => void load()}>Tải lại</Button>}>
    {state === 'loading' ? <ListLoading label="Đang tải phân công đánh giá…" /> : null}
    {state === 'unavailable' ? <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{evaluationError(null)} <button type="button" className="ml-2 min-h-11 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => void load()}>Tải lại</button></section> : null}

    {state === 'ready' ? <>
      <section aria-label="Tóm tắt phân công">
        <StatTileRow tiles={[
          { icon: 'assignment_ind', label: 'Phân công đang hiệu lực', value: summary.active, hero: true },
          { icon: 'groups', label: 'Đồ án được phân chấm', value: new Set(assignments.map(item => item.projectId)).size, tone: 'info' },
          { icon: 'edit_note', label: 'Bản nháp đang chấm', value: summary.drafts, tone: summary.drafts > 0 ? 'warning' : 'neutral' },
          { icon: 'verified', label: 'Đã chốt', value: summary.finalized, tone: 'success' },
        ]} />
      </section>
      {Object.values(drafts).some(row => row.status === 'unavailable') ? <p role="status" className="text-sm text-status-warning-text">Một số phân công chưa tải được trạng thái. Các số liệu bản nháp và đã chốt chỉ tính phần tải thành công.</p> : null}
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-hairline bg-card px-4 py-3 shadow-xs">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold text-ink-soft">Trạng thái đánh giá<select className="mt-1 block min-h-11 rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink" value={filter} onChange={event => setFilter(event.target.value as typeof filter)}><option value="all">Tất cả phân công</option><option value="pending">Chưa chốt</option><option value="finalized">Đã chốt</option><option value="unavailable">Chưa tải được trạng thái</option></select></label>
          <label className="text-xs font-semibold text-ink-soft">Tìm đồ án hoặc thành phần<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tên đồ án, thành phần, phạm vi…" className="mt-1 block min-h-11 w-64 max-w-full rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink placeholder:text-ink-muted" /></label>
        </div>
        <p className="text-xs text-ink-muted">Hiển thị <strong className="tabular-nums text-ink">{groupedAssignments.length}</strong> đồ án · <strong className="tabular-nums text-ink">{visibleAssignments.length}</strong> lượt chấm</p>
      </div>
      {!assignments.length ? <WorkspaceEmptyState title="Chưa có phân công đánh giá đang hiệu lực" message="Bạn sẽ thấy đồ án ở đây khi được phân công chấm." /> : null}
      {assignments.length > 0 && !visibleAssignments.length ? <WorkspaceEmptyState title={filter === 'pending' && !search.trim() && !Object.values(drafts).some(row => row.status === 'unavailable') ? 'Đã chấm hết các phân công' : 'Không có phân công phù hợp'} message={filter === 'pending' && !search.trim() && !Object.values(drafts).some(row => row.status === 'unavailable') ? 'Tất cả phiếu chấm trong phạm vi hiện tại đã được chốt.' : 'Chọn tất cả để xem lại danh sách hoặc kiểm tra các phân công chưa tải được trạng thái.'} /> : null}
      <section className="space-y-5" aria-label="Danh sách phân công đánh giá">
        {groupPagination.paginatedItems.map((projectAssignments) => <section key={projectAssignments[0].projectId} className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs" aria-label={projectAssignments[0].projectTitle ?? `Đồ án #${projectAssignments[0].projectId}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">folder_open</span>
              <h2 className="font-heading text-base font-bold text-ink">{projectAssignments[0].projectTitle ?? `Đồ án #${projectAssignments[0].projectId}`}</h2>
            </div>
            <span className="rounded-full bg-primary-subtle px-2.5 py-1 text-xs font-semibold tabular-nums text-primary">{projectAssignments.length} lượt chấm được giao</span>
          </div>
          <div className="divide-y divide-hairline">
        {projectAssignments.map((assignment) => {
          const row = drafts[assignment.id]
          const isFinalized = row?.draft?.status === 'FINALIZED'
          const isDraft = row?.draft?.status === 'DRAFT'
          const rubricTitle = assignment.rubricName ?? row?.draft?.rubricName ?? 'Chưa tải được tên bộ tiêu chí'
          return <article key={assignment.id} className="grid min-w-0 gap-4 p-5 transition-colors hover:bg-canvas/40 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <StatusBadge
                  tone="info"
                  label={assignment.evaluationType === 'LECTURER' ? 'Hội đồng chấm' : displayLabel(assignment.evaluationType)}
                />
                <StatusBadge tone="neutral" label={evaluationStageLabel(assignment.stage)} />
                <StatusBadge
                  tone={row?.status === 'unavailable' ? 'danger' : isFinalized ? 'success' : isDraft ? 'warning' : 'neutral'}
                  label={row?.status === 'unavailable' ? 'Chưa tải được trạng thái' : draftLabel(row?.draft ?? null)}
                />
              </div>
              <h3 className="break-words text-base font-semibold text-ink">{assignment.componentName ?? scopeLabel(assignment)}</h3>
              <dl className="mt-2 grid gap-x-6 gap-y-1.5 text-xs text-ink-muted sm:grid-cols-2">
                <div><dt className="inline font-semibold text-ink-soft">Phạm vi chấm: </dt><dd className="inline">{scopeLabel(assignment)}</dd></div>
                <div><dt className="inline font-semibold text-ink-soft">Bộ tiêu chí: </dt><dd className="inline">{rubricTitle}</dd></div>
                <div><dt className="inline font-semibold text-ink-soft">Ngày phân công: </dt><dd className="inline">{dateTimeLabel(assignment.assignedAt)}</dd></div>
              </dl>
            </div>
            <Link className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-xs font-bold transition-colors ${isFinalized ? 'border border-hairline bg-canvas text-ink hover:bg-card' : isDraft ? 'bg-primary text-white shadow-xs hover:bg-primary-hover' : 'border border-primary bg-card text-primary hover:bg-primary-subtle'}`} to={`/evaluator/assignments/${assignment.id}`}>{row?.status === 'unavailable' ? 'Xem phân công' : row?.draft?.status === 'FINALIZED' ? 'Xem đánh giá' : row?.draft ? 'Tiếp tục chấm' : 'Bắt đầu chấm'}</Link>
          </article>
        })}
          </div>
        </section>)}
        {groupPagination.showPagination && (
          <Pagination
            page={groupPagination.page}
            pages={groupPagination.totalPages}
            total={groupPagination.total}
            pageSize={groupPagination.pageSize}
            pageSizeOptions={[8, 16, 30]}
            onPage={groupPagination.setPage}
            onPageSizeChange={groupPagination.setPageSize}
          />
        )}
      </section>
    </> : null}
  </WorkspacePage>
}
