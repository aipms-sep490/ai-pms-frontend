import { useCallback, useEffect, useState } from 'react'
import * as api from '../../../services/api/evaluations.api'
import { HttpError } from '../../../services/http/http-client'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'

interface Props {
  projectId: number
  gateInstances: Array<{ id: number; gateNumber: number; title: string }>
}

export function IndividualProcessScoringPanel({ projectId, gateInstances }: Props) {
  const [data, setData] = useState<api.ProjectIndividualProcessScores | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [staleConflict, setStaleConflict] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, { score: string; comments: string }>>({})
  const [mentorNotes, setMentorNotes] = useState<Record<string, string>>({})
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setStaleConflict(false)
    try {
      const res = await api.getProjectIndividualProcessScores(projectId)
      setData(res)
      const nextDrafts: Record<string, { score: string; comments: string }> = {}
      const nextMentorNotes: Record<string, string> = {}
      for (const s of res.students) {
        for (const g of s.gateScores) {
          const key = `${g.gateInstanceId}:${s.studentId}`
          nextDrafts[key] = {
            score: g.score != null ? String(g.score) : '',
            comments: g.comments ?? '',
          }
          nextMentorNotes[key] = g.mentorReferenceNotes ?? ''
        }
      }
      setDrafts(nextDrafts)
      setMentorNotes(nextMentorNotes)
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 403) {
        const code = reason.problem?.code ?? reason.problem?.errorCode
        setError(code === 'RESULT_NOT_PUBLISHED'
          ? 'Điểm 20% cá nhân quá trình đang được ẩn cho đến khi bộ môn công bố kết quả chính thức.'
          : 'Bạn không có quyền truy cập điểm 20% quá trình của đồ án này.')
      } else {
        setError('Không thể tải bảng điểm 20% cá nhân quá trình (POL-03).')
      }
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void load() }, [load])

  const isMentor = data?.viewerRole === 'DISCIPLINE_MENTOR'

  async function handleSave(gateInstanceId: number, studentId: number, existing?: api.GateIndividualProcessScoreItem) {
    const key = `${gateInstanceId}:${studentId}`
    const draft = drafts[key]
    const parsed = Number(draft?.score)
    if (!draft || draft.score.trim() === '' || !Number.isFinite(parsed) || parsed < 0 || parsed > 10) {
      setError('Điểm phải nằm trong khoảng 0.00 – 10.00.')
      return
    }
    setBusyKey(key)
    setError(null)
    setNotice(null)
    setStaleConflict(false)
    try {
      await api.saveIndividualProcessScore(projectId, gateInstanceId, studentId, {
        score: Math.round(parsed * 100) / 100,
        comments: draft.comments || null,
        concurrencyToken: existing?.concurrencyToken ?? null,
      })
      setNotice('Đã lưu bản nháp điểm quá trình 20%.')
      await load()
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) {
        const code = reason.problem?.code ?? reason.problem?.errorCode
        if (code === 'STALE_CONCURRENCY_TOKEN') setStaleConflict(true)
      }
      setError(reason instanceof HttpError ? (reason.problem?.detail ?? 'Không thể lưu điểm nháp.') : 'Không thể lưu điểm nháp.')
    } finally {
      setBusyKey(null)
    }
  }

  async function handleSaveMentorNote(gateInstanceId: number, studentId: number, existing?: api.GateIndividualProcessScoreItem) {
    const key = `${gateInstanceId}:${studentId}`
    const noteText = (mentorNotes[key] ?? existing?.mentorReferenceNotes ?? '').trim()
    if (!noteText) {
      setError('Vui lòng nhập nhận xét tham khảo trước khi lưu.')
      return
    }
    setBusyKey(key)
    setError(null)
    setNotice(null)
    setStaleConflict(false)
    try {
      await api.saveIndividualProcessMentorNote(projectId, gateInstanceId, studentId, {
        mentorReferenceNotes: noteText,
        concurrencyToken: existing?.concurrencyToken ?? null,
      })
      setNotice('Đã lưu nhận xét tham khảo gửi GVHD Chính.')
      await load()
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) {
        const code = reason.problem?.code ?? reason.problem?.errorCode
        if (code === 'STALE_CONCURRENCY_TOKEN') setStaleConflict(true)
      }
      setError(reason instanceof HttpError ? (reason.problem?.detail ?? 'Không thể lưu nhận xét tham khảo của Mentor.') : 'Không thể lưu nhận xét tham khảo của Mentor.')
    } finally {
      setBusyKey(null)
    }
  }

  async function handleFinalize(gateNumber: number, studentName: string, gateInstanceId: number, studentId: number, existing: api.GateIndividualProcessScoreItem) {
    if (existing.score == null) {
      setError('Vui lòng nhập và lưu điểm nháp (0.00 – 10.00) trước khi chốt Gate.')
      return
    }
    const confirmed = await requestConfirmation({
      title: `Chốt điểm G${gateNumber} cho ${studentName}?`,
      description: `Điểm đã chốt (${existing.score.toFixed(2)}/10) là bất biến theo quy chế POL-03 và không thể sửa sau khi xác nhận.`,
      confirmLabel: `Chốt điểm G${gateNumber}`,
    })
    if (confirmed === null) return

    const key = `${gateInstanceId}:${studentId}`
    setBusyKey(key)
    setError(null)
    setNotice(null)
    setStaleConflict(false)
    try {
      await api.finalizeIndividualProcessScore(projectId, gateInstanceId, studentId, existing.concurrencyToken)
      setNotice(`Đã chốt bất biến điểm G${gateNumber} cho ${studentName}.`)
      await load()
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) {
        const code = reason.problem?.code ?? reason.problem?.errorCode
        if (code === 'STALE_CONCURRENCY_TOKEN') setStaleConflict(true)
      }
      setError(reason instanceof HttpError ? (reason.problem?.detail ?? 'Không thể chốt điểm Gate.') : 'Không thể chốt điểm Gate.')
    } finally {
      setBusyKey(null)
    }
  }

  if (loading) return <p role="status" className="text-sm text-ink-muted">Đang tải điểm 20% cá nhân quá trình…</p>
  if (error && !data) return <div role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{error}</div>
  if (!data) return null

  return (
    <section className="rounded-xl border border-hairline bg-card p-4 space-y-4" aria-label="Điểm 20% Cá nhân Quá trình (POL-03)">
      {confirmationDialog}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-ink">
            {isMentor ? 'Nhận xét Quá trình Tham khảo (G1–G3 · Mentor chuyên ngành)' : 'Điểm Cá nhân Quá trình (20% · POL-03)'}
          </h3>
          <p className="text-xs text-ink-muted">
            {isMentor
              ? 'Mentor nhập nhận xét tham khảo cho sinh viên thuộc chuyên ngành phụ trách (có thể lưu trước khi GVHD Chính nhập điểm). Điểm số 20% do GVHD Chính quyết định và chốt.'
              : `GVHD Chính chấm tích lũy qua các Gate: ${data.gateWeights.map(w => `G${w.gateNumber} (${w.weightPercent}%)`).join(' + ')}${!data.canEdit ? ' · Chế độ chỉ đọc' : ''}`}
          </p>
        </div>
        <StatusBadge tone={data.canEdit ? 'info' : isMentor ? 'warning' : 'neutral'} label={data.viewerRole} />
      </div>
      {notice && (
        <div role="status" className="rounded-lg border border-status-success-border bg-status-success-bg p-3 text-xs font-semibold text-status-success-text">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text space-y-2">
          <p>{error}</p>
          {staleConflict && (
            <Button size="sm" variant="secondary" onClick={() => void load()}>
              Tải lại phiên bản mới nhất
            </Button>
          )}
        </div>
      )}
      <div className="space-y-3">
        {data.students.map(student => (
          <div key={student.studentId} className="rounded-lg border border-hairline bg-canvas p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-sm text-ink">{student.studentName}</strong>
              <StatusBadge
                tone={student.isComplete ? 'success' : 'warning'}
                label={student.cumulativeScore != null ? `Tích lũy 20%: ${student.cumulativeScore.toFixed(2)}/10` : 'Chưa đủ điểm chốt G1–G3'}
              />
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {gateInstances.map(gate => {
                const existing = student.gateScores.find(g => g.gateInstanceId === gate.id)
                const key = `${gate.id}:${student.studentId}`
                const draft = drafts[key] ?? { score: existing?.score != null ? String(existing.score) : '', comments: existing?.comments ?? '' }
                const mentorDraft = mentorNotes[key] ?? existing?.mentorReferenceNotes ?? ''
                const locked = existing?.status === 'FINALIZED'
                const primaryDisabled = !data.canEdit || locked || busyKey === key
                return (
                  <div key={gate.id} className="rounded-lg border border-hairline bg-card p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">G{gate.gateNumber} · {gate.title}</span>
                      {existing && (
                        <StatusBadge
                          tone={locked ? 'success' : existing.score == null ? 'neutral' : 'warning'}
                          label={locked ? 'Đã chốt' : existing.score == null ? 'Chờ chấm' : 'Nháp'}
                        />
                      )}
                    </div>
                    {!isMentor && (
                      <>
                        <label className="block">
                          <span className="text-ink-muted">Điểm (0–10)</span>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.25"
                            aria-label={`Điểm G${gate.gateNumber} ${student.studentName}`}
                            disabled={primaryDisabled}
                            value={draft.score}
                            onChange={e => setDrafts(prev => ({ ...prev, [key]: { ...draft, score: e.target.value } }))}
                            className="mt-1 min-h-9 w-full rounded border border-line-strong px-2 disabled:bg-slate-100"
                          />
                        </label>
                        <label className="block">
                          <span className="text-ink-muted">Nhận xét GVHD</span>
                          <input
                            type="text"
                            aria-label={`Nhận xét G${gate.gateNumber} ${student.studentName}`}
                            disabled={primaryDisabled}
                            value={draft.comments}
                            onChange={e => setDrafts(prev => ({ ...prev, [key]: { ...draft, comments: e.target.value } }))}
                            className="mt-1 min-h-9 w-full rounded border border-line-strong px-2 disabled:bg-slate-100"
                          />
                        </label>
                        {existing?.mentorReferenceNotes && (
                          <p className="rounded bg-canvas p-2 text-ink-soft"><strong>Tham chiếu Mentor:</strong> {existing.mentorReferenceNotes}</p>
                        )}
                        {data.canEdit && !locked && (
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="secondary" disabled={busyKey === key} onClick={() => void handleSave(gate.id, student.studentId, existing)}>Lưu nháp</Button>
                            {existing && existing.score != null && (
                              <Button size="sm" disabled={busyKey === key} onClick={() => void handleFinalize(gate.gateNumber, student.studentName, gate.id, student.studentId, existing)}>
                                Chốt G{gate.gateNumber}
                              </Button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    {isMentor && (
                      <div className="space-y-2">
                        {existing?.score != null && (
                          <p className="text-ink-soft">Điểm GVHD Chính: <strong>{existing.score.toFixed(2)}/10</strong> ({locked ? 'Đã chốt' : 'Nháp'})</p>
                        )}
                        <label className="block">
                          <span className="text-ink-muted">Nhận xét tham khảo gửi GVHD Chính</span>
                          <textarea
                            rows={3}
                            aria-label={`Nhận xét Mentor G${gate.gateNumber} ${student.studentName}`}
                            disabled={locked || busyKey === key}
                            value={mentorDraft}
                            onChange={e => setMentorNotes(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder="Đánh giá mức độ đóng góp chuyên ngành của sinh viên tại Gate này..."
                            className="mt-1 w-full rounded border border-line-strong p-2 text-xs text-ink disabled:bg-slate-100"
                          />
                        </label>
                        {!locked && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busyKey === key}
                            onClick={() => void handleSaveMentorNote(gate.id, student.studentId, existing)}
                          >
                            Lưu nhận xét tham khảo
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
