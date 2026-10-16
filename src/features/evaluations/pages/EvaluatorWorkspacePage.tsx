import { readAllPages } from '../../../services/api/paged-read'
import { Button } from '../../../components/ui/Button'
import { dateTimeLabel } from '../../execution/execution-utils'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { ListLoading } from '../../../components/ui/ListLoading'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../../services/api/evaluations.api'
import { evaluationError } from '../evaluation-errors'
import type { EvaluationAssignment, EvaluationDraft } from '../evaluation-types'

type DraftState = { status: 'loading' | 'ready' | 'unavailable'; draft: EvaluationDraft | null }

function scopeLabel(assignment: EvaluationAssignment): string {
  if (assignment.scope === 'COMMON') return 'Phạm vi chung của đồ án'
  if (assignment.scope === 'MAJOR_SPECIFIC') return `Ngành được phân công #${assignment.majorId ?? '—'}`
  if (assignment.scope === 'INDIVIDUAL') return `Sinh viên được phân công #${assignment.studentId ?? '—'}`
  return 'Phạm vi chưa được máy chủ xác nhận'
}

function draftLabel(draft: EvaluationDraft | null): string {
  if (!draft) return 'Chưa tạo bản nháp'
  return draft.status === 'FINALIZED' ? 'Đã chốt đánh giá' : 'Đang chấm bản nháp'
}

/** Operational landing. Counts are derived only from the active assignments and their returned drafts. */
export function EvaluatorWorkspacePage() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'finalized' | 'unavailable'>('all')
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

  const visibleAssignments = assignments.filter(assignment => filter === 'all' || (filter === 'finalized' ? drafts[assignment.id]?.draft?.status === 'FINALIZED' : filter === 'unavailable' ? drafts[assignment.id]?.status === 'unavailable' : drafts[assignment.id]?.status === 'ready' && drafts[assignment.id]?.draft?.status !== 'FINALIZED'))

  return <WorkspacePage title="Đánh giá đồ án" eyebrow="Đánh giá theo phân công" description="Theo dõi các lượt chấm được giao, lưu nhận xét và hoàn thiện đánh giá." className="evaluation-workspace space-y-6 pb-12" action={<Button variant="secondary" icon="refresh" disabled={state === 'loading'} onClick={() => void load()}>Tải lại</Button>}>
    {state === 'loading' ? <ListLoading label="Đang tải phân công đánh giá…" /> : null}
    {state === 'unavailable' ? <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{evaluationError(null)} <button type="button" className="ml-2 min-h-11 font-semibold underline" onClick={() => void load()}>Tải lại</button></section> : null}

    {state === 'ready' ? <>
      <section aria-label="Tóm tắt phân công" className="workspace-metrics">
        <Summary label="Phân công đang hiệu lực" value={summary.active} />
        <Summary label="Bản nháp đang chấm" value={summary.drafts} />
        <Summary label="Đã chốt" value={summary.finalized} />
      </section>
      {Object.values(drafts).some(row => row.status === 'unavailable') ? <p role="status" className="text-sm text-status-warning-text">Một số phân công chưa tải được trạng thái. Các số liệu bản nháp và đã chốt chỉ tính phần tải thành công.</p> : null}
      <div className="flex flex-wrap items-end justify-between gap-3"><p className="text-sm text-ink-muted">Mở từng phân công để đối chiếu bàn giao, nhập điểm và lưu nhận xét.</p><label className="text-sm font-semibold text-ink-soft">Trạng thái đánh giá<select className="mt-1 block min-h-10 rounded-lg border border-hairline bg-card px-3" value={filter} onChange={event => setFilter(event.target.value as typeof filter)}><option value="all">Tất cả phân công</option><option value="pending">Chưa chốt</option><option value="finalized">Đã chốt</option><option value="unavailable">Chưa tải được trạng thái</option></select></label></div>
      {!assignments.length ? <section className="rounded-xl border border-hairline bg-card p-5 text-sm text-ink-soft"><h2 className="font-semibold text-ink">Chưa có phân công đánh giá đang hiệu lực</h2><p className="mt-1">Bạn sẽ thấy đồ án ở đây khi được phân công chấm.</p></section> : null}
      {assignments.length > 0 && !visibleAssignments.length ? <p role="status" className="workspace-surface p-5 text-sm text-ink-muted">Không có phân công phù hợp với bộ lọc. Chọn tất cả để xem lại danh sách.</p> : null}
      <section className="space-y-3" aria-label="Danh sách phân công đánh giá">
        {visibleAssignments.map((assignment) => {
          const row = drafts[assignment.id]
          const isFinalized = row?.draft?.status === 'FINALIZED'
          const isDraft = row?.draft?.status === 'DRAFT'
          const rubricTitle = row?.draft?.rubricName ? `${row.draft.rubricName} (v${row.draft.rubricVersion})` : `Bộ tiêu chí #${assignment.rubricId}`
          return <article key={assignment.id} className="grid min-w-0 gap-4 rounded-xl border border-hairline bg-card p-5 transition-all hover:border-primary/40 hover:shadow-xs md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-purple-700">
                  {assignment.evaluationType === 'LECTURER' ? 'Hội đồng chấm' : assignment.evaluationType}
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${isFinalized ? 'bg-status-success-bg text-status-success-text' : isDraft ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                  {row?.status === 'unavailable' ? 'Chưa tải được trạng thái' : draftLabel(row?.draft ?? null)}
                </span>
              </div>
              <h2 className="break-words font-semibold text-ink text-base">Đồ án #{assignment.projectId} · Thành phần #{assignment.componentId ?? '—'}</h2>
              <dl className="mt-2 grid gap-x-6 gap-y-1.5 text-xs text-ink-muted sm:grid-cols-2">
                <div><dt className="inline font-semibold text-ink-soft">Phạm vi chấm: </dt><dd className="inline">{scopeLabel(assignment)}</dd></div>
                <div><dt className="inline font-semibold text-ink-soft">Bộ tiêu chí: </dt><dd className="inline">{rubricTitle}</dd></div>
                <div><dt className="inline font-semibold text-ink-soft">Trạng thái: </dt><dd className="inline">{row?.status === 'unavailable' ? 'Chưa tải được trạng thái bản nháp' : draftLabel(row?.draft ?? null)}</dd></div>
                <div><dt className="inline font-semibold text-ink-soft">Ngày phân công: </dt><dd className="inline">{dateTimeLabel(assignment.assignedAt)}</dd></div>
              </dl>
            </div>
            <Link className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-xs font-bold transition-colors ${isFinalized ? 'border border-hairline bg-slate-50 text-ink hover:bg-slate-100' : isDraft ? 'bg-primary text-white hover:bg-primary-hover shadow-xs' : 'border border-primary bg-card text-primary hover:bg-primary-subtle'}`} to={`/evaluator/assignments/${assignment.id}`}>{row?.status === 'unavailable' ? 'Xem phân công' : row?.draft?.status === 'FINALIZED' ? 'Xem đánh giá' : row?.draft ? 'Tiếp tục chấm' : 'Bắt đầu chấm'}</Link>
          </article>
        })}
      </section>
    </> : null}
  </WorkspacePage>
}

function Summary({ label, value }: { label: string; value: number }) {
  return <section className="workspace-metric"><p className="text-sm text-ink-muted">{label}</p><p className="mt-1 text-2xl font-bold text-ink">{value}</p></section>
}
