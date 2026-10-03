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
        try { return [projectId, { status: 'ready' as const, items: (await api.getProjectEvaluations(projectId)).items }] as const }
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

  return <main className="mx-auto max-w-6xl space-y-6 pb-12">
    <header className="rounded-xl border border-hairline bg-card p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[.14em] text-primary">Đánh giá theo phân công</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">Không gian làm việc Evaluator</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Mỗi phân công xác định phạm vi đồ án, ngành hoặc sinh viên. Máy chủ xác nhận quyền xem, lưu bản nháp và chốt điểm ở từng thao tác.</p>
    </header>

    {state === 'loading' ? <p role="status" className="rounded-xl border border-hairline bg-card p-4 text-sm text-slate-600">Đang tải phân công đánh giá…</p> : null}
    {state === 'unavailable' ? <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{evaluationError(null)} <button type="button" className="ml-2 min-h-11 font-semibold underline" onClick={() => void load()}>Tải lại</button></section> : null}

    {state === 'ready' ? <>
      <section aria-label="Tóm tắt phân công" className="grid gap-3 sm:grid-cols-3">
        <Summary label="Phân công đang hiệu lực" value={summary.active} />
        <Summary label="Bản nháp đang chấm" value={summary.drafts} />
        <Summary label="Đã chốt" value={summary.finalized} />
      </section>
      <p className="text-sm text-slate-600">Máy chủ chưa cung cấp aggregate “sẵn sàng chốt” hoặc hạn chấm theo từng phân công. Điều kiện chốt được kiểm tra lại khi gửi yêu cầu.</p>
      {!assignments.length ? <section className="rounded-xl border border-hairline bg-card p-5 text-sm text-slate-700"><h2 className="font-semibold text-slate-900">Chưa có phân công đánh giá đang hiệu lực</h2><p className="mt-1">Vai trò giảng viên, hướng dẫn hoặc mentor không tự tạo quyền evaluator.</p></section> : null}
      <section className="space-y-3" aria-label="Danh sách phân công đánh giá">
        {assignments.map((assignment) => {
          const row = drafts[assignment.id]
          return <article key={assignment.id} className="grid min-w-0 gap-4 rounded-xl border border-hairline bg-card p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0">
              <h2 className="break-words font-semibold text-slate-900">Đồ án #{assignment.projectId} · Thành phần #{assignment.componentId ?? '—'}</h2>
              <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm text-slate-600 sm:grid-cols-2"><div><dt className="inline font-medium text-slate-700">Phạm vi: </dt><dd className="inline">{scopeLabel(assignment)}</dd></div><div><dt className="inline font-medium text-slate-700">Rubric: </dt><dd className="inline">#{assignment.rubricId}</dd></div><div><dt className="inline font-medium text-slate-700">Trạng thái: </dt><dd className="inline">{row?.status === 'unavailable' ? 'Chưa tải được trạng thái bản nháp' : draftLabel(row?.draft ?? null)}</dd></div><div><dt className="inline font-medium text-slate-700">Phân công: </dt><dd className="inline">{new Date(assignment.assignedAt).toLocaleString('vi-VN')}</dd></div></dl>
            </div>
            <Link to={`/evaluator/assignments/${assignment.id}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-primary px-4 text-sm font-semibold text-primary hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Mở phân công</Link>
          </article>
        })}
      </section>
    </> : null}
  </main>
}

function Summary({ label, value }: { label: string; value: number }) {
  return <section className="rounded-xl border border-hairline bg-card p-4"><p className="text-sm text-slate-600">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p></section>
}
