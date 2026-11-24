import { useEffect, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'
import { Pagination } from '../../../components/ui/Pagination'
import { useClientPagination } from '../../../components/ui/useClientPagination'
import { StatusBadge } from '../../../components/ui/StatusBadge'
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

function recommendationFailure(reason: unknown): string {
  if (reason instanceof HttpError) {
    if (reason.problem?.code === 'ACADEMIC_SCOPE_UNKNOWN') return 'Chưa thể xem gợi ý vì đồ án chưa có bản chốt phạm vi học thuật. Bạn vẫn có thể chọn giảng viên ở danh sách bên dưới.'
    if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.'
    if (reason.status === 403) return 'Bạn chưa có quyền xem gợi ý giảng viên cho vị trí này.'
  }
  return 'Chưa tải được gợi ý giảng viên. Thử tải lại để kiểm tra.'
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
  const [historyError, setHistoryError] = useState('')
  const [runError, setRunError] = useState('')
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
        setErrorMessage(recommendationFailure(reason))
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [projectId, assignmentType, majorId, revision])

  const retry = () => setRevision(value => value + 1)

  async function openHistory() {
    setHistoryOpen(true)
    setLoadingHistory(true)
    setHistoryRuns([])
    setHistoryError('')
    try {
      const res = await getSupervisorRecommendationHistory(projectId, 1, 20)
      setHistoryRuns(res.items)
    } catch (reason) {
      setHistoryError(recommendationFailure(reason))
    } finally {
      setLoadingHistory(false)
    }
  }

  async function loadRunDetail(runId: number) {
    setRunError('')
    try {
      const run = await getSupervisorRecommendationRun(projectId, runId)
      setSelectedRun(run)
    } catch (reason) {
      setRunError(recommendationFailure(reason))
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
      setSaveRunError(recommendationFailure(err))
    } finally {
      setSavingRun(false)
    }
  }

  const activeItems = selectedRun ? selectedRun.items : items
  const pagination = useClientPagination(activeItems, 6)

  return (
    <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-canvas/70 border-b border-hairline px-5 py-3.5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-base font-bold text-ink">Gợi ý giảng viên hướng dẫn</h2>
            {!loading && activeItems.length > 0 && <StatusBadge tone="info" label={`${activeItems.length} gợi ý`} />}
          </div>
          <p className="mt-0.5 max-w-3xl text-xs leading-5 text-ink-muted">Danh sách xếp hạng theo chuyên môn và năng lực tiếp nhận. Đây chỉ là gợi ý tham khảo; bạn vẫn tự chọn và gửi lời mời.</p>
        </div>
        <div className="flex items-center gap-3">
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

      <div className="p-5">
        {saveRunSuccess && <p role="status" className="mb-3 rounded-lg border border-status-success-border bg-status-success-bg p-2.5 text-xs text-status-success-text">{saveRunSuccess}</p>}
        {saveRunError && <p role="alert" className="mb-3 rounded-lg border border-status-error-border bg-status-error-bg p-2.5 text-xs text-status-error-text">{saveRunError}</p>}
        {runError && <p role="alert" className="mb-3 rounded-lg border border-status-error-border bg-status-error-bg p-2.5 text-xs text-status-error-text">{runError}</p>}

        {selectedRun && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-canvas p-3 border border-hairline">
            <p className="text-xs text-ink-soft">
              Đang xem kết quả lịch sử <strong>Lượt gợi ý #{selectedRun.id}</strong> (Tạo lúc: {new Date(selectedRun.createdAt).toLocaleString('vi-VN')})
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
          <div className="mb-4 rounded-lg border border-hairline bg-canvas p-3.5 space-y-2">
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
            {historyError && <p role="alert" className="text-xs text-status-error-text">{historyError}</p>}
            {!loadingHistory && !historyError && historyRuns.length === 0 && (
              <p className="text-xs text-ink-muted">Chưa có phiên gợi ý nào được lưu cho đồ án này.</p>
            )}
            {historyRuns.length > 0 && (
              <ul className="space-y-1.5">
                {historyRuns.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-xs rounded bg-card p-2 border border-hairline">
                    <span>
                      <strong>Lượt gợi ý #{r.id}</strong> · {r.assignmentType === 'DISCIPLINE_MENTOR' ? 'Mentor chuyên ngành' : r.assignmentType === 'PRIMARY' ? 'GVHD chính' : r.assignmentType}{r.majorId ? ` (Ngành #${r.majorId})` : ''} · {new Date(r.createdAt).toLocaleString('vi-VN')}
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

        {loading && !selectedRun && <p role="status" className="text-sm text-ink-muted">Đang tải gợi ý…</p>}
        {!loading && errorMessage && !selectedRun && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text"><span>{errorMessage}</span><button type="button" className="min-h-11 font-semibold underline" onClick={retry}>Tải lại</button></div>}
        {!loading && !errorMessage && activeItems.length === 0 && <p className="text-sm text-ink-muted">Chưa có gợi ý nào cho vị trí này.</p>}
        {!loading && !errorMessage && activeItems.length > 0 && (
          <>
            <ol className="space-y-3">
              {pagination.paginatedItems.map((item, index) => (
                <RecommendationRow
                  key={item.candidate.id}
                  item={item}
                  rank={(pagination.page - 1) * pagination.pageSize + index + 1}
                  selectable={!candidateIds || candidateIds.has(item.candidate.id)}
                  onPick={onPick}
                />
              ))}
            </ol>
            {pagination.showPagination && (
              <Pagination
                className="mt-4"
                page={pagination.page}
                pages={pagination.totalPages}
                total={pagination.total}
                pageSize={pagination.pageSize}
                onPage={pagination.setPage}
              />
            )}
          </>
        )}
      </div>
    </section>
  )
}

function RecommendationRow({ item, rank, selectable, onPick }: {
  item: SupervisorRecommendationItem; rank: number; selectable: boolean; onPick?: (supervisorId: number) => void
}) {
  const { candidate } = item
  return (
    <li className="rounded-xl border border-hairline bg-card p-4 shadow-xs transition-colors hover:border-line-strong">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary-subtle text-xs font-bold text-primary tabular-nums">{rank}</span>
            <h3 className="text-base font-bold text-ink">{candidate.fullName}</h3>
          </div>
          {candidate.departmentName?.trim() && <p className="mt-1 text-xs text-ink-muted">{candidate.departmentName}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-1 text-xs font-semibold text-primary tabular-nums">Phù hợp {scorePercent(item.score)}</span>
          <span className="text-xs text-ink-muted tabular-nums">Còn nhận {candidate.remainingSlots} nhóm</span>
        </div>
      </div>
      {item.matchedExpertise.length > 0
        ? <div className="mt-3 flex flex-wrap gap-1.5">
          {item.matchedExpertise.map(tag => <span key={tag} className="rounded-full border border-hairline bg-canvas px-2.5 py-0.5 text-xs text-ink-soft">{tag}</span>)}
        </div>
        : EXPERTISE_STATUS_LABEL[item.expertiseStatus] && <p className="mt-3 text-xs text-ink-muted">{EXPERTISE_STATUS_LABEL[item.expertiseStatus]}</p>}

      {/* Generation reasons & criteria */}
      {item.reasons.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-ink-muted">
          <span className="font-semibold text-ink-soft">Tiêu chí:</span>
          {item.reasons.map((r) => (
            <span key={r} className="rounded bg-canvas px-1.5 py-0.5 border border-hairline">{r}</span>
          ))}
        </div>
      )}

      {/* Current eligibility check vs generation time */}
      {item.currentlyEligible === false && (
        <div className="mt-2 flex items-start gap-1.5 rounded-md border border-status-error-border bg-status-error-bg p-2 text-xs text-status-error-text">
          <span className="material-symbols-outlined text-sm shrink-0" aria-hidden="true">warning</span>
          <div>
            <span className="font-semibold">Cảnh báo:</span> Giảng viên này hiện không còn đủ điều kiện tiếp nhận (đã thay đổi sau thời điểm gợi ý).
            {item.currentReasons.length > 0 && (
              <span className="block mt-0.5">Lý do: {item.currentReasons.join(', ')}</span>
            )}
          </div>
        </div>
      )}

      {onPick && selectable && <button type="button" onClick={() => onPick(candidate.id)} className="mt-3 min-h-11 rounded-lg border border-primary px-4 text-sm font-semibold text-primary hover:bg-primary-subtle">Chọn giảng viên này</button>}
      {onPick && !selectable && <p className="mt-3 text-xs text-ink-muted">Giảng viên này hiện không nằm trong danh sách có thể mời.</p>}
    </li>
  )
}
