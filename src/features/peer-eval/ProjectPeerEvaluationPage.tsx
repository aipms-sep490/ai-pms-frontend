import { useEffect, useMemo, useRef, useState } from 'react'
import { PageLoading } from '../../components/ui/PageLoading'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { useStudentJourney } from '../../app/context'
import { HttpError } from '../../services/http/http-client'
import { getMyPeerEvaluation, getPeerRounds, savePeerEvaluationDraft, submitPeerEvaluation } from './peer-eval-api'
import type { MyPeerEvaluation, PeerRosterMember, PeerRound } from './peer-eval-types'

import { Button } from '../../components/ui/Button'
import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { PeerRoundPicker } from './PeerRoundPicker'
import { CollaborationIntro, collaborationDate } from '../student-collaboration/collaboration-ui'

const ratingLabels: Record<number, string> = { 1: 'Rất thấp', 2: 'Thấp', 3: 'Trung bình', 4: 'Tốt', 5: 'Rất tốt' }
const ratings = [1, 2, 3, 4, 5]

/** Reasons the backend attaches to a round that blocks the current actor's submission. */
const ROUND_BLOCKED_MESSAGES: Record<string, string> = {
  PEER_PROJECT_READ_ONLY: 'Đồ án hiện không ở trạng thái cho phép chỉnh sửa.',
  PEER_ROUND_NOT_OPEN: 'Đợt đánh giá này hiện không mở.',
  PEER_ROSTER_CHANGED: 'Danh sách nhóm vừa thay đổi so với lúc mở đợt đánh giá. Hãy chờ GVHD mở đợt mới.',
}

export function ProjectPeerEvaluationPage() {
  const journey = useStudentJourney()
  const projectId = journey.project?.id
  const myId = journey.profile?.id

  const [myEval, setMyEval] = useState<MyPeerEvaluation | null>(null)
  const [round, setRound] = useState<PeerRound | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [form, setForm] = useState<Record<number, { rating: number; comment: string }>>({})
  const [savingDraft, setSavingDraft] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [selectedRound, setSelectedRound] = useState<PeerRound | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [recovery, setRecovery] = useState<typeof form | null>(null)
  const mutation = useRef(false)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()

  async function selectRound(next: PeerRound | null) {
    if (mutation.current || loading || recovery) return
    const saved = myEval?.submission?.items ?? []
    const dirty = myEval?.status !== 'SUBMITTED' && Object.entries(form).some(([id, value]) => {
      const previous = saved.find(item => item.targetUserId === Number(id))
      return value.rating !== (previous?.rating ?? 0) || value.comment !== (previous?.comment ?? '')
    })
    if (dirty && await requestConfirmation({ title: 'Chuyển đợt đánh giá?', description: 'Nội dung chưa lưu sẽ bị bỏ. Chọn quay lại nếu bạn muốn lưu bản nháp trước.', confirmLabel: 'Bỏ thay đổi và chuyển' }) === null) return
    setSelectedRound(next); setRecovery(null); setFormError(null); setHistoryOpen(false)
  }

  useEffect(() => {
    if (!projectId) return
    const controller = new AbortController()
    setLoading(true)
    void getMyPeerEvaluation(projectId, selectedRound?.id, controller.signal).then(async mine => {
      if (controller.signal.aborted) return
      if (mine.roundId == null) { setMyEval(mine); setRound(null); setError(null); return }
      const rounds = await getPeerRounds(projectId, 1, 50, controller.signal)
      if (controller.signal.aborted) return
      const matched = rounds.items.find(item => item.id === mine.roundId) ?? (selectedRound?.id === mine.roundId ? selectedRound : null)
      setMyEval(mine); setRound(matched); setError(null)
      if (!matched) setError('Không tìm thấy thông tin đợt đánh giá hiện tại. Hãy thử lại.')
      const existing = mine.submission?.items
      if (existing) {
        const next: Record<number, { rating: number; comment: string }> = {}
        for (const rating of existing) next[rating.targetUserId] = { rating: rating.rating, comment: rating.comment ?? '' }
        setForm(next)
      } else setForm({})
    }).catch(reason => {
      if (controller.signal.aborted) return
      setError(reason instanceof HttpError && reason.status === 403
        ? 'Bạn chưa có quyền đánh giá đồng đội trong đồ án này.'
        : 'Chưa tải được đánh giá đồng đội. Hãy thử lại.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [projectId, revision, selectedRound])

  const retry = () => { setLoading(true); setError(null); setMyEval(null); setRound(null); setRevision(value => value + 1) }

  const roster: PeerRosterMember[] = useMemo(
    () => (round?.roster ?? []).filter(member => member.userId !== myId),
    [round, myId],
  )

  const setRating = (userId: number, rating: number) => setForm(prev => ({ ...prev, [userId]: { rating, comment: prev[userId]?.comment ?? '' } }))
  const setComment = (userId: number, comment: string) => setForm(prev => ({ ...prev, [userId]: { rating: prev[userId]?.rating ?? 0, comment } }))

  const buildItems = (onlyRated: boolean) => roster
    .filter(mate => !onlyRated || form[mate.userId]?.rating)
    .map(mate => ({ targetUserId: mate.userId, rating: form[mate.userId]?.rating ?? 0, comment: form[mate.userId]?.comment.trim() || undefined }))
    .filter(item => !onlyRated || item.rating > 0)

  const currentToken = myEval?.submission?.concurrencyToken

  const handleStaleOrReload = (reason: unknown) => {
    if (reason instanceof HttpError && reason.status === 409) {
      setRecovery(form)
      setFormError('Thông tin vừa thay đổi. Đã tải lại bản mới nhất, hãy kiểm tra lại.')
      setRevision(value => value + 1)
      return true
    }
    return false
  }

  const saveDraft = () => {
    if (!projectId || !round?.canSubmit || recovery || mutation.current) return
    mutation.current = true
    setSavingDraft(true); setFormError(null)
    void savePeerEvaluationDraft(projectId, round.id, buildItems(true), currentToken)
      .then(() => setRevision(value => value + 1))
      .catch(reason => { if (!handleStaleOrReload(reason)) setFormError('Chưa lưu được bản nháp. Hãy thử lại.') })
      .finally(() => { mutation.current = false; setSavingDraft(false) })
  }

  const submit = () => {
    if (!projectId || !round?.canSubmit || recovery || mutation.current) return
    const missing = roster.some(mate => !form[mate.userId]?.rating)
    if (missing) { setFormError('Hãy đánh giá tất cả thành viên trước khi gửi.'); return }
    mutation.current = true
    setSubmitting(true); setFormError(null)
    void savePeerEvaluationDraft(projectId, round.id, buildItems(false), currentToken)
      .then(saved => { setMyEval({ roundId: round.id, status: 'DRAFT', submission: saved }); return submitPeerEvaluation(projectId, round.id, saved.concurrencyToken) })
      .then(() => setRevision(value => value + 1))
      .catch(reason => { if (!handleStaleOrReload(reason)) setFormError('Chưa gửi được đánh giá. Hãy thử lại.') })
      .finally(() => { mutation.current = false; setSubmitting(false) })
  }

  const submitted = myEval?.status === 'SUBMITTED'
  const blockedReason = round?.reasons.map(code => ROUND_BLOCKED_MESSAGES[code]).find(Boolean)

  return <WorkspacePage className="space-y-5 collab" title="Đánh giá đồng đội" eyebrow="Peer evaluation"
    description="Đánh giá đóng góp của các thành viên trong nhóm. Đây là minh chứng tham khảo cho giảng viên, không phải là điểm số.">
    {confirmationDialog}
    <CollaborationIntro icon="diversity_3" title="Ghi nhận đóng góp, cùng tiến bộ">Chia sẻ nhận xét cụ thể và công bằng. Bạn chỉ đọc được bài mình gửi; phản hồi không được tự cộng vào điểm chính thức.</CollaborationIntro>
    {projectId && <div className="collab-actions"><Button variant="outline" icon="history" disabled={loading || savingDraft || submitting || !!recovery} onClick={() => setHistoryOpen(value => !value)} aria-expanded={historyOpen}>Xem các đợt trước</Button>{selectedRound && <Button variant="ghost" disabled={loading || savingDraft || submitting || !!recovery} onClick={() => void selectRound(null)}>Về đợt đang mở</Button>}</div>}
    {historyOpen && projectId && !loading && !savingDraft && !submitting && !recovery && <PeerRoundPicker projectId={projectId} userId={myId} onPick={value => void selectRound(value)} />}
    {!loading && round && <div className="collab-card"><div className="collab-row"><h2>{round.title}</h2><span className="collab-muted">Hạn gửi: {collaborationDate(round.closesAt)}</span></div><p className="collab-muted">{roster.filter(member => form[member.userId]?.rating).length}/{roster.length} thành viên đã được đánh giá.</p></div>}
    {recovery && <div role="alert" className="collab-note">Nội dung chưa lưu vẫn được giữ riêng để bạn đối chiếu. <details><summary>Xem nội dung chưa lưu</summary>{Object.entries(recovery).map(([id, value]) => <p key={id}>Thành viên #{id}: {value.rating}/5 · {value.comment}</p>)}</details><div className="collab-actions"><Button disabled={loading || !round?.canSubmit} onClick={() => { setForm(Object.fromEntries(roster.map(member => [member.userId, recovery[member.userId] ?? form[member.userId] ?? { rating: 0, comment: '' }]))); setRecovery(null) }}>Khôi phục bản nháp để đối chiếu</Button><Button variant="outline" disabled={loading} onClick={() => setRecovery(null)}>Giữ dữ liệu máy chủ</Button></div></div>}
    {!projectId && <p className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-600">Không tìm thấy đồ án đang hoạt động để đánh giá đồng đội.</p>}
    {projectId && loading && <PageLoading label="Đang tải đánh giá đồng đội…" />}
    {projectId && !loading && error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><span>{error}</span><button type="button" className="min-h-11 font-semibold underline" onClick={retry}>Tải lại</button></div>}
    {projectId && !loading && !error && myEval?.status === 'NO_OPEN_ROUND' && <p className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-600">Hiện không có đợt đánh giá đồng đội nào đang mở.</p>}
    {projectId && !loading && !error && round && roster.length === 0 && <p className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-600">Nhóm chưa có thành viên khác để đánh giá.</p>}

    {projectId && !loading && !error && round && roster.length > 0 && submitted && <>
      <p className="flex items-center gap-2 rounded-lg border border-status-success-border bg-status-success-bg p-4 text-sm font-semibold text-status-success-text"><span className="material-symbols-outlined text-base" aria-hidden="true">task_alt</span>Bạn đã gửi đánh giá đồng đội cho đợt "{round.title}".</p>
      <ul className="space-y-2">
        {(myEval?.submission?.items ?? []).map(item => <li key={item.targetUserId} className="rounded-xl border border-hairline bg-card p-4 shadow-xs text-sm">
          <div className="flex items-center justify-between gap-2"><span className="font-semibold text-slate-900">{roster.find(mate => mate.userId === item.targetUserId)?.fullName || `Thành viên #${item.targetUserId}`}</span><StatusBadge tone="neutral" label={ratingLabels[item.rating] ?? String(item.rating)} /></div>
          {item.comment?.trim() && <p className="mt-1 leading-6 text-slate-700">{item.comment}</p>}
        </li>)}
      </ul>
    </>}

    {projectId && !loading && !error && round && roster.length > 0 && !submitted && <>
      {!round.canSubmit && blockedReason && <div role="status" className="rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-text">{blockedReason}</div>}
      <ul className="space-y-3">
        {roster.map(mate => <li key={mate.userId} className="space-y-2 rounded-xl border border-hairline bg-card p-4 shadow-xs">
          <h2 className="text-base font-bold text-slate-950">{mate.fullName}</h2>
          <fieldset className="flex flex-wrap gap-2" disabled={!round.canSubmit || savingDraft || submitting || !!recovery}><legend className="sr-only">Mức đóng góp của {mate.fullName}</legend>
            {ratings.map(value => {
              const active = form[mate.userId]?.rating === value
              return <button key={value} type="button" aria-pressed={active} onClick={() => setRating(mate.userId, value)}
                className={`min-h-11 rounded-lg border px-3 text-sm font-semibold ${active ? 'border-primary bg-primary text-white' : 'border-hairline bg-card text-slate-700'}`}>{value} · {ratingLabels[value]}</button>
            })}
          </fieldset>
          <label className="block text-sm text-slate-700">Nhận xét (tùy chọn)
            <textarea rows={2} value={form[mate.userId]?.comment ?? ''} onChange={event => setComment(mate.userId, event.target.value)} maxLength={2000} disabled={!round.canSubmit || savingDraft || submitting || !!recovery}
              className="mt-1 w-full rounded-lg border border-hairline bg-card p-2 text-slate-950" placeholder="Ví dụ: chủ động nhận việc khó, bàn giao đúng hạn…" />
          </label>
        </li>)}
      </ul>
      {formError && <div role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{formError}</div>}
      {round.canSubmit && <div className="flex flex-wrap gap-3">
        <button type="button" onClick={saveDraft} disabled={savingDraft || submitting || !!recovery} className="min-h-11 rounded-lg border border-primary px-5 font-semibold text-primary disabled:opacity-60">{savingDraft ? 'Đang lưu…' : 'Lưu nháp'}</button>
        <button type="button" onClick={submit} disabled={submitting || savingDraft || !!recovery} className="min-h-11 rounded-lg bg-primary px-5 font-semibold text-white disabled:opacity-60">{submitting ? 'Đang gửi…' : 'Gửi đánh giá'}</button>
      </div>}
    </>}
  </WorkspacePage>
}
