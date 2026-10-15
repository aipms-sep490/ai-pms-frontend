import { useEffect, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { InlineAlert } from '../../../components/ui/InlineAlert'
import { HttpError } from '../../../services/http/http-client'
import {
  previewSupervisorRecommendations,
  type SupervisorRecommendationAssignmentType,
  type SupervisorRecommendationItem,
} from '../api/supervisor-recommendation-api'

const scorePercent = (score: number) => `${Math.round(Math.max(0, Math.min(1, score)) * 100)}%`

const EXPERTISE_STATUS_LABEL: Record<string, string> = {
  UNKNOWN: 'Giảng viên chưa khai báo chuyên môn.',
  NO_MATCH: 'Chuyên môn hiện khai báo không khớp ngành yêu cầu.',
}

/**
 * BE-18: advisory ranking of supervisors for a project, scoped to the assignment slot the leader
 * is currently filling (PRIMARY or a specific DISCIPLINE_MENTOR major). Read-only, unpersisted
 * preview — picking a suggestion only pre-selects a candidate; the student still sends the request
 * manually. AI never creates a request or an assignment (BR-60–63).
 */
export function SupervisorRecommendationPanel({ projectId, assignmentType = 'PRIMARY', majorId, candidateIds, onPick }: {
  projectId: number
  assignmentType?: SupervisorRecommendationAssignmentType
  /** Required for a DISCIPLINE_MENTOR slot; must stay unset for PRIMARY. */
  majorId?: number
  /** Supervisor profile ids that are selectable in the current flow. */
  candidateIds?: ReadonlySet<number>
  onPick?: (supervisorId: number) => void
}) {
  const [items, setItems] = useState<SupervisorRecommendationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setErrorMessage(null)
    void previewSupervisorRecommendations(projectId, { assignmentType, majorId }, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setItems(data.candidates.items); setErrorMessage(null) } })
      .catch(reason => {
        if (controller.signal.aborted) return
        setItems([])
        setErrorMessage(reason instanceof HttpError && reason.status === 403
          ? 'Bạn chưa có quyền xem gợi ý giảng viên cho vị trí này.'
          : 'Chưa tải được gợi ý giảng viên.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [projectId, assignmentType, majorId, revision])

  const retry = () => setRevision(value => value + 1)

  return <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs">
    <h2 className="font-heading text-lg font-semibold text-ink">Gợi ý giảng viên hướng dẫn</h2>
    <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-muted">Danh sách xếp hạng theo chuyên môn và năng lực tiếp nhận. Đây chỉ là gợi ý tham khảo; bạn vẫn tự chọn và gửi lời mời.</p>
    {loading && <p role="status" className="mt-4 text-sm text-ink-muted">Đang tải gợi ý…</p>}
    {!loading && errorMessage && <InlineAlert tone="danger" className="mt-4" onRetry={retry}>{errorMessage}</InlineAlert>}
    {!loading && !errorMessage && items.length === 0 && <p className="mt-4 text-sm text-ink-muted">Chưa có gợi ý nào cho vị trí này.</p>}
    {!loading && !errorMessage && items.length > 0 && <ol className="mt-4 space-y-3">
      {items.map((item, index) => <RecommendationRow key={item.candidate.id} item={item} rank={index + 1}
        selectable={!candidateIds || candidateIds.has(item.candidate.id)} onPick={onPick} />)}
    </ol>}
  </section>
}

function RecommendationRow({ item, rank, selectable, onPick }: {
  item: SupervisorRecommendationItem; rank: number; selectable: boolean; onPick?: (supervisorId: number) => void
}) {
  const { candidate } = item
  return <li className="rounded-xl border border-hairline bg-card p-4 shadow-xs">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary-subtle text-xs font-bold text-primary">{rank}</span>
          <h3 className="text-base font-bold text-ink">{candidate.fullName}</h3>
        </div>
        {candidate.departmentName?.trim() && <p className="mt-1 text-xs text-ink-muted">{candidate.departmentName}</p>}
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-1 text-xs font-semibold text-primary">Phù hợp {scorePercent(item.score)}</span>
        <span className="text-xs text-ink-muted">Còn nhận {candidate.remainingSlots} nhóm</span>
      </div>
    </div>
    {item.matchedExpertise.length > 0
      ? <div className="mt-3 flex flex-wrap gap-1.5">
        {item.matchedExpertise.map(tag => <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-ink-muted">{tag}</span>)}
      </div>
      : EXPERTISE_STATUS_LABEL[item.expertiseStatus] && <p className="mt-3 text-xs text-ink-muted">{EXPERTISE_STATUS_LABEL[item.expertiseStatus]}</p>}
    {onPick && selectable && <Button variant="outline" size="sm" className="mt-3" onClick={() => onPick(candidate.id)}>Chọn giảng viên này</Button>}
    {onPick && !selectable && <p className="mt-3 text-xs text-slate-400">Giảng viên này hiện không nằm trong danh sách có thể mời.</p>}
  </li>
}
