import { useEffect, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'
import { getSupervisorRecommendations, type SupervisorRecommendationItem, type SupervisorRecommendationRun } from '../api/supervisor-recommendation-api'

const scorePercent = (score: number) => `${Math.round(Math.max(0, Math.min(1, score)) * 100)}%`

/**
 * BE-18: advisory ranking of supervisors for a project. Read-only — picking a
 * suggestion only pre-selects a candidate; the student still sends the request
 * manually. AI never creates a request or an assignment (BR-60–63).
 */
export function SupervisorRecommendationPanel({ projectId, candidateIds, onPick }: {
  projectId: number
  /** Supervisor ids that are selectable in the current flow. */
  candidateIds?: ReadonlySet<number>
  onPick?: (supervisorId: number) => void
}) {
  const [run, setRun] = useState<SupervisorRecommendationRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    void getSupervisorRecommendations(projectId, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setRun(data); setError(false) } })
      .catch(reason => {
        if (controller.signal.aborted) return
        if (reason instanceof HttpError && reason.status === 404) { setRun(null); setError(false) }
        else setError(true)
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [projectId, revision])

  const retry = () => { setLoading(true); setError(false); setRun(null); setRevision(value => value + 1) }
  const items = run?.items ?? []

  return <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs">
    <h2 className="font-heading text-lg font-semibold text-slate-950">Gợi ý giảng viên hướng dẫn</h2>
    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Danh sách xếp hạng theo chuyên môn và năng lực tiếp nhận. Đây chỉ là gợi ý tham khảo; bạn vẫn tự chọn và gửi lời mời.</p>
    {loading && <p role="status" className="mt-4 text-sm text-slate-500">Đang tải gợi ý…</p>}
    {!loading && error && <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text"><span>Chưa tải được gợi ý giảng viên.</span><button type="button" className="min-h-11 font-semibold underline" onClick={retry}>Tải lại</button></div>}
    {!loading && !error && items.length === 0 && <p className="mt-4 text-sm text-slate-500">Chưa có gợi ý nào cho đồ án này.</p>}
    {!loading && !error && items.length > 0 && <ol className="mt-4 space-y-3">
      {items.map((item, index) => <RecommendationRow key={item.supervisorId} item={item} rank={index + 1}
        selectable={!candidateIds || candidateIds.has(item.supervisorId)} onPick={onPick} />)}
    </ol>}
  </section>
}

function RecommendationRow({ item, rank, selectable, onPick }: {
  item: SupervisorRecommendationItem; rank: number; selectable: boolean; onPick?: (supervisorId: number) => void
}) {
  return <li className="rounded-xl border border-hairline bg-card p-4 shadow-xs">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary-subtle text-xs font-bold text-primary">{rank}</span>
          <h3 className="text-base font-bold text-slate-950">{item.lecturerName}</h3>
        </div>
        {item.departmentName?.trim() && <p className="mt-1 text-xs text-slate-500">{item.departmentName}</p>}
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-1 text-xs font-semibold text-primary">Phù hợp {scorePercent(item.score)}</span>
        {typeof item.availableCapacity === 'number' && <span className="text-xs text-slate-500">Còn nhận {item.availableCapacity} nhóm</span>}
      </div>
    </div>
    {item.matchedExpertise.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">
      {item.matchedExpertise.map(tag => <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{tag}</span>)}
    </div>}
    {item.reasons.length > 0 && <ul className="mt-3 space-y-1 text-sm leading-6 text-slate-700">
      {item.reasons.map((reason, index) => <li key={index} className="flex gap-2"><span aria-hidden="true">•</span><span>{reason}</span></li>)}
    </ul>}
    {onPick && selectable && <button type="button" onClick={() => onPick(item.supervisorId)} className="mt-3 min-h-11 rounded-lg border border-primary px-4 text-sm font-semibold text-primary hover:bg-primary-subtle">Chọn giảng viên này</button>}
    {onPick && !selectable && <p className="mt-3 text-xs text-slate-400">Giảng viên này hiện không nằm trong danh sách có thể mời.</p>}
  </li>
}
