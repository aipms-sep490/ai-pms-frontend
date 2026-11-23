import { useEffect, useMemo, useRef, useState } from 'react'
import { PageLoading } from '../../components/ui/PageLoading'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { useStudentJourney } from '../../app/context'
import { HttpError } from '../../services/http/http-client'
import { getMyPeerEvaluation, getPeerRounds, savePeerEvaluationDraft, submitPeerEvaluation } from './peer-eval-api'
import type { MyPeerEvaluation, PeerRosterMember, PeerRound } from './peer-eval-types'

import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { ActionVerdict } from '../../components/ui/ActionVerdict'
import { EntityIdentityStrip } from '../../components/ui/EntityIdentityStrip'
import { Modal } from '../../components/ui/Modal'
import { WorkspaceEmptyState } from '../../components/ui/WorkspaceState'
import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { PeerRoundPicker } from './PeerRoundPicker'
import { collaborationDate } from '../student-collaboration/collaboration-ui'

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
  const ratedCount = roster.filter(member => form[member.userId]?.rating).length
  const progressPct = roster.length > 0 ? Math.round((ratedCount / roster.length) * 100) : 0

  return <WorkspacePage
    className="space-y-5"
    title="Đánh giá đồng đội"
    eyebrow="Phối hợp nhóm"
    description="Ghi nhận đóng góp cụ thể và công bằng của từng thành viên. Đây là minh chứng tham khảo cho giảng viên, không tự cộng vào điểm chính thức."
    action={projectId ? (
      <div className="flex flex-wrap items-center gap-2">
        {selectedRound && (
          <Button variant="ghost" disabled={loading || savingDraft || submitting || !!recovery} onClick={() => void selectRound(null)}>
            Về đợt đang mở
          </Button>
        )}
        <Button variant="outline" icon="history" disabled={loading || savingDraft || submitting || !!recovery} onClick={() => setHistoryOpen(true)} aria-expanded={historyOpen}>
          Xem các đợt trước
        </Button>
      </div>
    ) : undefined}
  >
    {confirmationDialog}
    {projectId && <EntityIdentityStrip chips={[{ icon: 'folder', label: 'Đồ án', value: journey.project?.title || 'Đồ án hiện tại' }, ...(journey.project?.code ? [{ icon: 'tag', label: 'Mã đồ án', value: journey.project.code }] : [])]} />}
    {historyOpen && projectId && !loading && !savingDraft && !submitting && !recovery && (
      <Modal open drawer title="Các đợt đánh giá đồng đội" description="Chọn một đợt trước đó để xem lại bài đánh giá bạn đã gửi." onClose={() => setHistoryOpen(false)}>
        <PeerRoundPicker projectId={projectId} userId={myId} onPick={value => { setHistoryOpen(false); void selectRound(value) }} />
      </Modal>
    )}
    {!loading && round && (
      <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink">{round.title}</h2>
            <p className="mt-0.5 text-xs text-ink-muted">Hạn gửi: {collaborationDate(round.closesAt)}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tabular-nums text-ink">{ratedCount}/{roster.length} thành viên đã được đánh giá.</span>
            <StatusBadge tone={submitted ? 'success' : round.canSubmit ? 'info' : 'neutral'} label={submitted ? 'Đã gửi' : round.canSubmit ? 'Đang mở' : 'Đã đóng'} />
          </div>
        </div>
        {roster.length > 0 && (
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-canvas" aria-hidden="true">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${submitted ? 100 : progressPct}%` }} />
          </div>
        )}
      </section>
    )}
    {recovery && <div role="alert" className="rounded-xl border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-text">Nội dung chưa lưu vẫn được giữ riêng để bạn đối chiếu. <details className="mt-2"><summary className="cursor-pointer font-semibold text-ink">Xem nội dung chưa lưu</summary>{Object.entries(recovery).map(([id, value]) => <p key={id} className="mt-1 text-xs text-ink-soft">{roster.find(mate => mate.userId === Number(id))?.fullName ?? 'Thành viên nhóm'}: {value.rating}/5 · {value.comment}</p>)}</details><div className="mt-3 flex flex-wrap gap-2"><Button disabled={loading || !round?.canSubmit} onClick={() => { setForm(Object.fromEntries(roster.map(member => [member.userId, recovery[member.userId] ?? form[member.userId] ?? { rating: 0, comment: '' }]))); setRecovery(null) }}>Khôi phục bản nháp để đối chiếu</Button><Button variant="outline" disabled={loading} onClick={() => setRecovery(null)}>Giữ dữ liệu máy chủ</Button></div></div>}
    {!projectId && <p className="rounded-lg border border-hairline bg-card p-5 text-sm text-ink-muted">Không tìm thấy đồ án đang hoạt động để đánh giá đồng đội.</p>}
    {projectId && loading && <PageLoading label="Đang tải đánh giá đồng đội…" />}
    {projectId && !loading && error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><span>{error}</span><button type="button" className="min-h-11 font-semibold underline" onClick={retry}>Tải lại</button></div>}
    {projectId && !loading && !error && myEval?.status === 'NO_OPEN_ROUND' && <WorkspaceEmptyState title="Hiện không có đợt đánh giá đồng đội nào đang mở." message="Chưa có đợt đánh giá đồng đội nào đang mở cho đồ án này." />}
    {projectId && !loading && !error && round && roster.length === 0 && <p className="rounded-lg border border-hairline bg-card p-5 text-sm text-ink-muted">Nhóm chưa có thành viên khác để đánh giá.</p>}

    {projectId && !loading && !error && round && roster.length > 0 && submitted && <>
      <p className="flex items-center gap-2 rounded-lg border border-status-success-border bg-status-success-bg p-4 text-sm font-semibold text-status-success-text"><span className="material-symbols-outlined text-base" aria-hidden="true">task_alt</span>Bạn đã gửi đánh giá đồng đội cho đợt "{round.title}".</p>
      <ul className="space-y-3">
        {(myEval?.submission?.items ?? []).map(item => {
          const mateName = roster.find(mate => mate.userId === item.targetUserId)?.fullName || 'Thành viên nhóm'
          return (
            <li key={item.targetUserId} className="rounded-xl border border-hairline bg-card p-4 shadow-xs text-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={mateName} size="sm" />
                  <span className="font-semibold text-ink">{mateName}</span>
                </div>
                <StatusBadge tone="neutral" label={ratingLabels[item.rating] ?? String(item.rating)} />
              </div>
              {item.comment?.trim() && <p className="mt-2 leading-6 text-ink-soft">{item.comment}</p>}
            </li>
          )
        })}
      </ul>
    </>}

    {projectId && !loading && !error && round && roster.length > 0 && !submitted && <>
      {!round.canSubmit && (
        <ActionVerdict
          actions={[{
            code: 'SUBMIT_PEER_EVALUATION',
            allowed: round.canSubmit,
            reasons: round.reasons.map(code => ROUND_BLOCKED_MESSAGES[code] || code),
          }]}
          actionCode="SUBMIT_PEER_EVALUATION"
          status="ready"
          okLabel="Đủ điều kiện gửi đánh giá"
          blockedLabel="Chưa thể gửi đánh giá"
        />
      )}
      <ul className="space-y-3">
        {roster.map(mate => <li key={mate.userId} className="space-y-3 rounded-xl border border-hairline bg-card p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <Avatar name={mate.fullName} size="sm" />
            <h2 className="text-base font-bold text-ink">{mate.fullName}</h2>
          </div>
          <fieldset className="flex flex-wrap gap-2" disabled={!round.canSubmit || savingDraft || submitting || !!recovery}><legend className="sr-only">Mức đóng góp của {mate.fullName}</legend>
            {ratings.map(value => {
              const active = form[mate.userId]?.rating === value
              return <button key={value} type="button" aria-pressed={active} onClick={() => setRating(mate.userId, value)}
                className={`min-h-11 rounded-lg border px-3 text-sm font-semibold transition-colors ${active ? 'border-primary bg-primary text-white' : 'border-hairline bg-card text-ink-soft hover:border-primary hover:bg-primary-subtle hover:text-primary'}`}>{value} · {ratingLabels[value]}</button>
            })}
          </fieldset>
          <label className="block text-sm text-ink-soft">Nhận xét (tùy chọn)
            <textarea rows={2} value={form[mate.userId]?.comment ?? ''} onChange={event => setComment(mate.userId, event.target.value)} maxLength={2000} disabled={!round.canSubmit || savingDraft || submitting || !!recovery}
              className="mt-1 w-full rounded-lg border border-hairline bg-card p-2.5 text-ink focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 disabled:bg-canvas disabled:text-ink-muted" placeholder="Ví dụ: chủ động nhận việc khó, bàn giao đúng hạn…" />
          </label>
        </li>)}
      </ul>
      {formError && <div role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{formError}</div>}
      {round.canSubmit && <div className="flex flex-wrap gap-3">
        <button type="button" onClick={saveDraft} disabled={savingDraft || submitting || !!recovery} className="min-h-11 rounded-lg border border-primary bg-card px-5 font-semibold text-primary transition-colors hover:bg-primary-subtle disabled:opacity-60">{savingDraft ? 'Đang lưu…' : 'Lưu nháp'}</button>
        <button type="button" onClick={submit} disabled={submitting || savingDraft || !!recovery} className="min-h-11 rounded-lg bg-primary px-5 font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60">{submitting ? 'Đang gửi…' : 'Gửi đánh giá'}</button>
      </div>}
    </>}
  </WorkspacePage>
}
