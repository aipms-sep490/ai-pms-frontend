import { useEffect, useState } from 'react'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { useStudentJourney } from '../../app/context'
import { HttpError } from '../../services/http/http-client'
import { getMyPeerEvaluations, submitPeerEvaluations } from './peer-eval-api'
import type { MyPeerEvaluations } from './peer-eval-types'

const ratingLabels: Record<number, string> = { 1: 'Rất thấp', 2: 'Thấp', 3: 'Trung bình', 4: 'Tốt', 5: 'Rất tốt' }
const ratings = [1, 2, 3, 4, 5]

interface Teammate { userId: number; fullName: string }

export function ProjectPeerEvaluationPage() {
  const journey = useStudentJourney()
  const projectId = journey.project?.id
  const myId = journey.profile?.id
  const teammates: Teammate[] = (journey.team?.members ?? [])
    .filter(member => member.userId !== myId)
    .map(member => ({ userId: member.userId, fullName: member.fullName }))

  const [data, setData] = useState<MyPeerEvaluations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [form, setForm] = useState<Record<number, { rating: number; comment: string }>>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    const controller = new AbortController()
    void getMyPeerEvaluations(projectId, controller.signal).then(result => {
      if (controller.signal.aborted) return
      setData(result); setError(null)
    }).catch(reason => {
      if (controller.signal.aborted) return
      if (reason instanceof HttpError && reason.status === 404) { setData({ submitted: false, items: [] }); setError(null); return }
      setError(reason instanceof HttpError && reason.status === 403
        ? 'Bạn chưa có quyền đánh giá đồng đội trong đồ án này.'
        : 'Chưa tải được đánh giá đồng đội. Hãy thử lại.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [projectId, revision])

  const retry = () => { setLoading(true); setError(null); setData(null); setRevision(value => value + 1) }
  const setRating = (userId: number, rating: number) => setForm(prev => ({ ...prev, [userId]: { rating, comment: prev[userId]?.comment ?? '' } }))
  const setComment = (userId: number, comment: string) => setForm(prev => ({ ...prev, [userId]: { rating: prev[userId]?.rating ?? 0, comment } }))

  const submit = () => {
    if (!projectId) return
    const missing = teammates.some(mate => !form[mate.userId]?.rating)
    if (missing) { setFormError('Hãy đánh giá tất cả thành viên trước khi gửi.'); return }
    setSubmitting(true); setFormError(null)
    const items = teammates.map(mate => ({ evaluateeUserId: mate.userId, rating: form[mate.userId].rating, comment: form[mate.userId].comment.trim() || undefined }))
    void submitPeerEvaluations(projectId, items)
      .then(() => { setRevision(value => value + 1) })
      .catch(() => setFormError('Chưa gửi được đánh giá. Hãy thử lại.'))
      .finally(() => setSubmitting(false))
  }

  return <WorkspacePage className="space-y-5" title="Đánh giá đồng đội" eyebrow="Peer evaluation"
    description="Đánh giá đóng góp của các thành viên trong nhóm. Đây là minh chứng tham khảo cho giảng viên, không phải là điểm số.">
    {!projectId && <p className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-600">Không tìm thấy đồ án đang hoạt động để đánh giá đồng đội.</p>}
    {projectId && loading && <p role="status" className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-600">Đang tải…</p>}
    {projectId && !loading && error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><span>{error}</span><button type="button" className="min-h-11 font-semibold underline" onClick={retry}>Tải lại</button></div>}
    {projectId && !loading && !error && data && teammates.length === 0 && <p className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-600">Nhóm chưa có thành viên khác để đánh giá.</p>}

    {projectId && !loading && !error && data && teammates.length > 0 && data.submitted && <>
      <p className="flex items-center gap-2 rounded-lg border border-status-success-border bg-status-success-bg p-4 text-sm font-semibold text-status-success-text"><span className="material-symbols-outlined text-base" aria-hidden="true">task_alt</span>Bạn đã gửi đánh giá đồng đội.</p>
      <ul className="space-y-2">
        {data.items.map(item => <li key={item.evaluateeUserId} className="rounded-xl border border-hairline bg-card p-4 shadow-xs text-sm">
          <div className="flex items-center justify-between gap-2"><span className="font-semibold text-slate-900">{item.evaluateeName?.trim() || teammates.find(mate => mate.userId === item.evaluateeUserId)?.fullName || `Thành viên #${item.evaluateeUserId}`}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{ratingLabels[item.rating] ?? item.rating}</span></div>
          {item.comment?.trim() && <p className="mt-1 leading-6 text-slate-700">{item.comment}</p>}
        </li>)}
      </ul>
    </>}

    {projectId && !loading && !error && data && teammates.length > 0 && !data.submitted && <>
      <ul className="space-y-3">
        {teammates.map(mate => <li key={mate.userId} className="space-y-2 rounded-xl border border-hairline bg-card p-4 shadow-xs">
          <h2 className="text-base font-bold text-slate-950">{mate.fullName}</h2>
          <fieldset className="flex flex-wrap gap-2"><legend className="sr-only">Mức đóng góp của {mate.fullName}</legend>
            {ratings.map(value => {
              const active = form[mate.userId]?.rating === value
              return <button key={value} type="button" aria-pressed={active} onClick={() => setRating(mate.userId, value)}
                className={`min-h-11 rounded-lg border px-3 text-sm font-semibold ${active ? 'border-primary bg-primary text-white' : 'border-hairline bg-card text-slate-700'}`}>{value} · {ratingLabels[value]}</button>
            })}
          </fieldset>
          <label className="block text-sm text-slate-700">Nhận xét (tùy chọn)
            <textarea rows={2} value={form[mate.userId]?.comment ?? ''} onChange={event => setComment(mate.userId, event.target.value)} maxLength={1000}
              className="mt-1 w-full rounded-lg border border-hairline bg-card p-2 text-slate-950" placeholder="Ví dụ: chủ động nhận việc khó, bàn giao đúng hạn…" />
          </label>
        </li>)}
      </ul>
      {formError && <div role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{formError}</div>}
      <button type="button" onClick={submit} disabled={submitting} className="min-h-11 rounded-lg bg-primary px-5 font-semibold text-white disabled:opacity-60">{submitting ? 'Đang gửi…' : 'Gửi đánh giá'}</button>
    </>}
  </WorkspacePage>
}
