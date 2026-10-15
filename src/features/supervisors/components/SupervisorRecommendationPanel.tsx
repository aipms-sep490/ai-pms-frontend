import { useEffect, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'
import {
  createSupervisorRecommendationRun,
  getSupervisorRecommendationHistory,
  getSupervisorRecommendationRun,
  previewSupervisorRecommendations,
  type SupervisorRecommendationAssignmentType,
  type SupervisorRecommendationItem,
  type SupervisorRecommendationRun,
  type SupervisorRecommendationRunSummary,
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

  // History & run saving state
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyRuns, setHistoryRuns] = useState<SupervisorRecommendationRunSummary[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [selectedRun, setSelectedRun] = useState<SupervisorRecommendationRun | null>(null)
  const [savingRun, setSavingRun] = useState(false)
  const [saveRunSuccess, setSaveRunSuccess] = useState('')
  const [saveRunError, setSaveRunError] = useState('')

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

  async function openHistory() {
    setHistoryOpen(true)
    setLoadingHistory(true)
    try {
      const res = await getSupervisorRecommendationHistory(projectId, 1, 20)
      setHistoryRuns(res.items)
    } catch {
      setHistoryRuns([])
    } finally {
      setLoadingHistory(false)
    }
  }

  async function loadRunDetail(runId: number) {
    try {
      const run = await getSupervisorRecommendationRun(projectId, runId)
      setSelectedRun(run)
    } catch {
      // Keep current
    }
  }

  async function handleSaveRun() {
    setSavingRun(true)
    setSaveRunSuccess('')
    setSaveRunError('')
    try {
      const run = await createSupervisorRecommendationRun(projectId, { assignmentType, majorId })
      setSaveRunSuccess(`Đã lưu phiên gợi ý #${run.id} (${run.items.length} giảng viên).`)
      setSelectedRun(run)
    } catch (err) {
      setSaveRunError(err instanceof HttpError ? err.message : 'Không thể lưu phiên gợi ý.')
    } finally {
      setSavingRun(false)
    }
  }

  const activeItems = selectedRun ? selectedRun.items : items

  return <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 className="font-heading text-lg font-semibold text-ink">Gợi ý giảng viên hướng dẫn</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-muted">Danh sách xếp hạng theo chuyên môn và năng lực tiếp nhận. Đây chỉ là gợi ý tham khảo; bạn vẫn tự chọn và gửi lời mời.</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={savingRun || loading || items.length === 0}
          className="text-xs font-semibold text-primary underline underline-offset-4 disabled:opacity-50"
          onClick={() => void handleSaveRun()}
        >
          {savingRun ? 'Đang lưu…' : 'Lưu run hiện tại'}
        </button>
        <button
          type="button"
          className="text-xs font-semibold text-ink-muted hover:text-ink underline underline-offset-4"
          onClick={() => void openHistory()}
        >
          Lịch sử gợi ý
        </button>
      </div>
    </div>

    {saveRunSuccess && <p role="status" className="mt-2 text-xs text-status-success-text">{saveRunSuccess}</p>}
    {saveRunError && <p role="alert" className="mt-2 text-xs text-status-error-text">{saveRunError}</p>}

    {selectedRun && (
      <div className="mt-3 flex items-center justify-between rounded-lg bg-subtle p-3 border border-hairline">
        <p className="text-xs text-ink-soft">
          Đang xem kết quả lịch sử <strong>Run #{selectedRun.id}</strong> (Tạo lúc: {new Date(selectedRun.createdAt).toLocaleString('vi-VN')})
        </p>
        <button
          type="button"
          className="text-xs font-semibold text-primary underline"
          onClick={() => setSelectedRun(null)}
        >
          Quay lại gợi ý trực tiếp
        </button>
      </div>
    )}

    {historyOpen && (
      <div className="mt-3 rounded-lg border border-hairline bg-subtle p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-ink uppercase tracking-wide">Lịch sử các phiên gợi ý đã lưu</h3>
          <button
            type="button"
            className="text-xs text-ink-muted hover:underline"
            onClick={() => setHistoryOpen(false)}
          >
            Đóng
          </button>
        </div>
        {loadingHistory && <p className="text-xs text-ink-muted">Đang tải lịch sử…</p>}
        {!loadingHistory && historyRuns.length === 0 && (
          <p className="text-xs text-ink-muted">Chưa có phiên gợi ý nào được lưu cho đồ án này.</p>
        )}
        {historyRuns.length > 0 && (
          <ul className="space-y-1.5">
            {historyRuns.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-xs rounded bg-card p-2 border border-hairline">
                <span>
                  <strong>Run #{r.id}</strong> · {r.assignmentType}{r.majorId ? ` (Ngành #${r.majorId})` : ''} · {new Date(r.createdAt).toLocaleString('vi-VN')}
                </span>
                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={() => void loadRunDetail(r.id)}
                >
                  Xem ({r.itemCount} GV)
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )}

    {loading && !selectedRun && <p role="status" className="mt-4 text-sm text-ink-muted">Đang tải gợi ý…</p>}
    {!loading && errorMessage && !selectedRun && <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text"><span>{errorMessage}</span><button type="button" className="min-h-11 font-semibold underline" onClick={retry}>Tải lại</button></div>}
    {!loading && !errorMessage && activeItems.length === 0 && <p className="mt-4 text-sm text-ink-muted">Chưa có gợi ý nào cho vị trí này.</p>}
    {!loading && !errorMessage && activeItems.length > 0 && <ol className="mt-4 space-y-3">
      {activeItems.map((item, index) => <RecommendationRow key={item.candidate.id} item={item} rank={index + 1}
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

    {/* Generation reasons & criteria */}
    {item.reasons.length > 0 && (
      <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-ink-muted">
        <span className="font-semibold text-ink-soft">Tiêu chí:</span>
        {item.reasons.map((r) => (
          <span key={r} className="rounded bg-subtle px-1.5 py-0.5 border border-hairline">{r}</span>
        ))}
      </div>
    )}

    {/* Current eligibility check vs generation time */}
    {item.currentlyEligible === false && (
      <div className="mt-2 rounded-md border border-status-error-border bg-status-error-bg p-2 text-xs text-status-error-text">
        <span className="font-semibold">⚠️ Cảnh báo:</span> Giảng viên này hiện không còn đủ điều kiện tiếp nhận (đã thay đổi sau thời điểm gợi ý).
        {item.currentReasons.length > 0 && (
          <span className="block mt-0.5">Lý do: {item.currentReasons.join(', ')}</span>
        )}
      </div>
    )}

    {onPick && selectable && <button type="button" onClick={() => onPick(candidate.id)} className="mt-3 min-h-11 rounded-lg border border-primary px-4 text-sm font-semibold text-primary hover:bg-primary-subtle">Chọn giảng viên này</button>}
    {onPick && !selectable && <p className="mt-3 text-xs text-slate-400">Giảng viên này hiện không nằm trong danh sách có thể mời.</p>}
  </li>
}
