import { useEffect, useMemo, useRef, useState } from 'react'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import * as api from '../../services/api/weekly.api'
import type { Rubric, RubricCriterion, WeeklyAssessment, WeeklyAssessmentWeek } from '../../services/api/weekly.api'
import type { EvaluationScoreInput } from '../evaluations/evaluation-types'
import { formatCalendarDate, formatWeeklyDateTime } from './weekly-types'
import { weeklyError, weeklyNeedsAuthoritativeRefresh } from './weekly-errors'
import { WeeklyBadge, WeeklyError, WeeklyLoading, WeeklyShell } from './weekly-ui'
import { formatScore } from '../../components/ui/format'
import { getTeam } from '../../services/api/teams.api'
import { WeeklyAssessmentHistory } from './WeeklyAssessmentHistory'
import { Button } from '../../components/ui/Button'
import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { CollaborationIntro } from '../student-collaboration/collaboration-ui'

type ScoreEdit = { score: string; comments: string }
type EditableCriterion = { rubricCriterionId: number; name: string; description: string | null; maxScore: number }

function leafCriteria(criteria: RubricCriterion[]): RubricCriterion[] {
  const parentIds = new Set(criteria.map((c) => c.parentId).filter((id): id is number => id != null))
  return criteria.filter((c) => !parentIds.has(c.id)).sort((a, b) => a.sortOrder - b.sortOrder)
}

export function WeeklyAssessmentsPage() {
  const { project, team, routeBase } = useExecutionAccess()
  const [members, setMembers] = useState(team?.members ?? [])
  const [error, setError] = useState(''), [loading, setLoading] = useState(!team), [retry, setRetry] = useState(0)
  useEffect(() => {
    if (team) { setMembers(team.members); setLoading(false); return }
    let alive = true; setLoading(true); setError(''); setMembers([])
    void getTeam(project.teamId).then(result => { if (alive) setMembers(result.members) })
      .catch(() => { if (alive) setError('Chưa tải được thành viên của nhóm. Không thể chọn sinh viên để chấm.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [project.id, project.teamId, team, retry])
  if (loading) return <WeeklyLoading />
  if (error) return <WeeklyError message={error} retry={() => setRetry(value => value + 1)} />
  return <WeeklyAssessmentsBody key={project.id} projectId={project.id} projectTitle={project.title} routeBase={routeBase} members={members} />
}

function WeeklyAssessmentsBody({ projectId, projectTitle, routeBase, members }: {
  projectId: number; projectTitle: string; routeBase: string
  members: { userId: number; fullName: string }[]
}) {
  const [weeks, setWeeks] = useState<WeeklyAssessmentWeek[] | null>(null)
  const [weeksError, setWeeksError] = useState('')
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(members[0]?.userId ?? null)
  const [editorState, setEditorState] = useState({ dirty: false, busy: false })
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  async function changeSelection(change: () => void) {
    if (editorState.busy) return
    if (editorState.dirty && await requestConfirmation({ title: 'Chuyển bản chấm?', description: 'Điểm hoặc nhận xét chưa lưu sẽ bị bỏ. Quay lại để lưu trước nếu cần.', confirmLabel: 'Bỏ thay đổi và chuyển' }) === null) return
    setEditorState({ dirty: false, busy: false }); change()
  }

  useEffect(() => {
    const controller = new AbortController()
    setWeeksError('')
    api.getWeeklyAssessmentWeeks(projectId, controller.signal)
      .then((calendar) => {
        if (controller.signal.aborted) return
        setWeeks(calendar.weeks)
        const started = [...calendar.weeks].reverse().find((week) => week.hasStarted)
        setSelectedWeek((started ?? calendar.weeks.at(-1))?.weekNumber ?? null)
      })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setWeeksError(weeklyError(reason)) })
    return () => controller.abort()
  }, [projectId])

  return <WeeklyShell title="Điểm cá nhân theo tuần" projectTitle={projectTitle} backTo={`${routeBase}/workspace`}
    description="Chấm tham khảo hằng tuần cho từng sinh viên. Không tự cộng vào kết quả học phần chính thức.">
    {confirmationDialog}
    <CollaborationIntro icon="insights" title="Phản hồi nhỏ, tiến bộ mỗi tuần">Điểm theo dõi chỉ để tham khảo. Giữ lại từng phiên bản nhận xét để sinh viên nhìn thấy tiến bộ của mình, không cộng vào kết quả chính thức.</CollaborationIntro>
    {weeksError ? <WeeklyError message={weeksError} /> : !weeks ? <WeeklyLoading /> : <>
      <div className="weekly-toolbar">
        <label>Tuần<select value={selectedWeek ?? ''} disabled={editorState.busy} onChange={(event) => { const value = Number(event.target.value); void changeSelection(() => setSelectedWeek(value)) }}>
          {weeks.map((week) => <option key={week.weekNumber} value={week.weekNumber}>
            Tuần {week.weekNumber} ({formatCalendarDate(week.startDate)}–{formatCalendarDate(week.endDate)}){!week.hasStarted ? ' • Chưa tới' : ''}
          </option>)}
        </select></label>
        <label>Sinh viên<select value={selectedStudentId ?? ''} disabled={editorState.busy} onChange={(event) => { const value = Number(event.target.value); void changeSelection(() => setSelectedStudentId(value)) }}>
          {members.map((member) => <option key={member.userId} value={member.userId}>{member.fullName}</option>)}
        </select></label>
      </div>
      <div className="weekly-members-strip mt-3 flex flex-wrap gap-2" aria-label="Chọn nhanh sinh viên">
        {members.map((member) => (
          <button
            key={member.userId}
            type="button"
            disabled={editorState.busy}
            onClick={() => void changeSelection(() => setSelectedStudentId(member.userId))}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
              selectedStudentId === member.userId
                ? 'bg-primary text-white shadow-xs'
                : 'border border-hairline bg-card text-ink-soft hover:border-primary/50 hover:bg-slate-50'
            }`}
          >
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${selectedStudentId === member.userId ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>
              {member.fullName.trim().charAt(0).toUpperCase()}
            </span>
            {member.fullName}
          </button>
        ))}
      </div>
      {selectedWeek != null && selectedStudentId != null && (() => {
        const week = weeks.find((w) => w.weekNumber === selectedWeek)
        return <WeeklyAssessmentEditor key={`${selectedStudentId}:${selectedWeek}`} projectId={projectId} weekNumber={selectedWeek} studentId={selectedStudentId} hasStarted={week?.hasStarted ?? false} onEditorState={setEditorState} />
      })()}
    </>}
  </WeeklyShell>
}

function WeeklyAssessmentEditor({ projectId, weekNumber, studentId, hasStarted, onEditorState }: {
  projectId: number; weekNumber: number; studentId: number; hasStarted: boolean; onEditorState: (state: { dirty: boolean; busy: boolean }) => void
}) {
  const [assessment, setAssessment] = useState<WeeklyAssessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [historyFailed, setHistoryFailed] = useState(false)
  const [revision, setRevision] = useState(0)
  const [rubrics, setRubrics] = useState<Rubric[] | null>(null)
  const [selectedRubricId, setSelectedRubricId] = useState<number | null>(null)
  const [edits, setEdits] = useState<Record<number, ScoreEdit>>({})
  const [comments, setComments] = useState('')
  const [revisionReason, setRevisionReason] = useState('')
  const [busy, setBusy] = useState(false)
  const mutation = useRef(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [recovery, setRecovery] = useState<{ edits: Record<number, ScoreEdit>; comments: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(''); setHistoryFailed(false); setAssessment(null); setRubrics(null); setSelectedRubricId(null)
    api.getWeeklyAssessmentHistory(projectId, { studentId, weekNumber }, 1, 1, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        const current = result.items[0] ?? null
        if (current && (current.projectId !== projectId || current.studentId !== studentId || current.weekNumber !== weekNumber)) throw new Error('Weekly assessment scope mismatch')
        setAssessment(current)
        setComments(current?.comments ?? '')
        if (current) {
          const seeded: Record<number, ScoreEdit> = {}
          current.scores.forEach((s) => { seeded[s.rubricCriterionId] = { score: s.score != null ? String(s.score) : '', comments: s.comments ?? '' } })
          setEdits(seeded)
        } else {
          setEdits({})
        }
      })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setHistoryFailed(true); setError(weeklyError(reason)) } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [projectId, studentId, weekNumber, revision])

  useEffect(() => {
    if (assessment || rubrics) return
    const controller = new AbortController()
    api.getWeeklyAssessmentRubrics(projectId, 1, 50, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setRubrics(result.items) })
      .catch(() => { if (!controller.signal.aborted) setRubrics([]) })
    return () => controller.abort()
  }, [projectId, assessment, rubrics])

  const selectedRubric = rubrics?.find((r) => r.id === selectedRubricId) ?? null
  const dirty = Boolean(recovery || revisionReason || (!assessment && selectedRubricId) || comments !== (assessment?.comments ?? '') || Object.entries(edits).some(([id, value]) => {
    const saved = assessment?.scores.find(score => score.rubricCriterionId === Number(id))
    return value.score !== (saved?.score == null ? '' : String(saved.score)) || value.comments !== (saved?.comments ?? '')
  }))
  useEffect(() => { onEditorState({ dirty, busy: busy || loading }) }, [dirty, busy, loading, onEditorState])
  const draftCriteria: EditableCriterion[] = useMemo(() => {
    if (assessment) return assessment.scores.map((s) => ({ rubricCriterionId: s.rubricCriterionId, name: s.name, description: s.description, maxScore: s.maxScore }))
    if (selectedRubric) return leafCriteria(selectedRubric.criteria).map((c) => ({ rubricCriterionId: c.id, name: c.name, description: c.description, maxScore: c.maxScore ?? 10 }))
    return []
  }, [assessment, selectedRubric])

  function updateEdit(criterionId: number, patch: Partial<ScoreEdit>) {
    setEdits((current) => ({ ...current, [criterionId]: { ...(current[criterionId] ?? { score: '', comments: '' }), ...patch } }))
  }

  function buildScores(): EvaluationScoreInput[] {
    return draftCriteria
      .filter((c) => edits[c.rubricCriterionId]?.score.trim())
      .map((c) => ({ rubricCriterionId: c.rubricCriterionId, score: Number(edits[c.rubricCriterionId].score), comments: edits[c.rubricCriterionId]?.comments.trim() || null }))
  }

  async function run(action: () => Promise<WeeklyAssessment>) {
    if (mutation.current) return
    mutation.current = true
    setBusy(true); setError('')
    try {
      const result = await action()
      setAssessment(result)
      setComments(result.comments ?? '')
      setEdits(Object.fromEntries(result.scores.map(score => [score.rubricCriterionId, { score: score.score == null ? '' : String(score.score), comments: score.comments ?? '' }])))
      setRecovery(null)
      setRevisionReason('')
    } catch (reason) {
      setError(weeklyError(reason))
      if (weeklyNeedsAuthoritativeRefresh(reason)) { setRecovery({ edits, comments }); setRevision((v) => v + 1) }
    } finally {
      setBusy(false)
      mutation.current = false
    }
  }

  function createDraft() {
    if (!selectedRubricId) return
    void run(() => api.saveWeeklyAssessment(projectId, { studentId, weekNumber, rubricId: selectedRubricId, expectedLatestVersion: 0, scores: buildScores(), comments: comments.trim() || null }))
  }
  function saveDraft() {
    if (!assessment) return
    void run(() => api.saveWeeklyAssessment(projectId, { studentId, weekNumber, rubricId: assessment.rubricId, expectedLatestVersion: assessment.version, scores: buildScores(), comments: comments.trim() || null, concurrencyToken: assessment.concurrencyToken }))
  }
  function submit() {
    if (!assessment) return
    const changed = comments !== (assessment.comments ?? '') || assessment.scores.some(score =>
      (edits[score.rubricCriterionId]?.score ?? '') !== (score.score == null ? '' : String(score.score))
      || (edits[score.rubricCriterionId]?.comments ?? '') !== (score.comments ?? ''))
    void run(async () => {
      const saved = changed ? await api.saveWeeklyAssessment(projectId, { studentId, weekNumber, rubricId: assessment.rubricId,
        expectedLatestVersion: assessment.version, scores: buildScores(), comments: comments.trim() || null, concurrencyToken: assessment.concurrencyToken }) : assessment
      // Retain the fresh token even when the following submit request fails.
      setAssessment(saved)
      return api.submitWeeklyAssessment(saved.id, saved.concurrencyToken)
    })
  }
  function createCorrection() {
    if (!assessment || !revisionReason.trim()) return
    void run(() => api.saveWeeklyAssessment(projectId, { studentId, weekNumber, rubricId: assessment.rubricId, expectedLatestVersion: assessment.version, scores: buildScores(), comments: comments.trim() || null, revisionReason: revisionReason.trim() }))
  }

  if (loading) return <WeeklyLoading />
  if (historyFailed) return <WeeklyError message={error} retry={() => setRevision(value => value + 1)} />
  if (!hasStarted) return <div className="weekly-notice weekly-notice--error">Tuần này chưa tới, chưa thể chấm.</div>

  const isDraft = assessment?.status === 'DRAFT'
  const isSubmitted = assessment?.status === 'SUBMITTED'
  const canRevise = Boolean(assessment && (isSubmitted || isDraft && !assessment.canEdit))
  const canEditNow = !recovery && ((!assessment && selectedRubricId != null) || (isDraft && assessment?.canEdit))

  return <div className="weekly-panel">
    <div className="weekly-panel-heading">
      <h2>{assessment ? `${assessment.rubricName} (v${assessment.version})` : 'Chưa có bản chấm cho tuần này'}</h2>
      {assessment && <WeeklyBadge status={assessment.status} />}
    </div>
    {error && <div style={{ padding: '0 24px', marginTop: 12 }}><WeeklyError message={error} /></div>}
    {recovery && <div className="collab collab-card"><p className="collab-note">Bản mới nhất đã được tải lại. Nội dung chưa lưu của bạn được giữ riêng, chưa ghi đè dữ liệu.</p><details><summary>Xem nội dung chưa lưu</summary>{Object.entries(recovery.edits).map(([id, value]) => <p key={id}>Tiêu chí #{id}: {value.score || 'Chưa chấm'} · {value.comments}</p>)}<p>{recovery.comments}</p></details><div className="collab-actions">{assessment?.canEdit && <Button onClick={() => { setEdits(Object.fromEntries(assessment.scores.map(score => [score.rubricCriterionId, recovery.edits[score.rubricCriterionId] ?? { score: score.score == null ? '' : String(score.score), comments: score.comments ?? '' }]))); setComments(recovery.comments); setRecovery(null) }}>Khôi phục vào bản nháp mới nhất</Button>}<Button variant="outline" onClick={() => setRecovery(null)}>Giữ dữ liệu máy chủ</Button></div></div>}

    {!assessment && <div style={{ padding: '16px 24px' }}>
      <label>Rubric áp dụng<select value={selectedRubricId ?? ''} onChange={(event) => setSelectedRubricId(Number(event.target.value) || null)} disabled={!rubrics}>
        <option value="">— Chọn rubric —</option>
        {rubrics?.map((rubric) => <option key={rubric.id} value={rubric.id}>{rubric.name} (v{rubric.version})</option>)}
      </select></label>
    </div>}

    {draftCriteria.length > 0 && <table className="weekly-criteria">
      <thead><tr><th>Tiêu chí</th><th>Điểm (tối đa)</th><th>Nhận xét</th></tr></thead>
      <tbody>
        {draftCriteria.map((criterion) => <tr key={criterion.rubricCriterionId}>
          <td className="weekly-criteria-name">{criterion.name}{criterion.description && <small>{criterion.description}</small>}</td>
          <td>{canEditNow ? <input type="number" min={0} max={criterion.maxScore} step="0.01" disabled={busy}
            aria-label={`Điểm ${criterion.name}`} value={edits[criterion.rubricCriterionId]?.score ?? ''}
            onChange={(event) => updateEdit(criterion.rubricCriterionId, { score: event.target.value })} /> : <span>{edits[criterion.rubricCriterionId]?.score || '—'}</span>} / {criterion.maxScore}</td>
          <td>{canEditNow ? <input type="text" maxLength={2000} aria-label={`Nhận xét ${criterion.name}`} disabled={busy}
            value={edits[criterion.rubricCriterionId]?.comments ?? ''}
            onChange={(event) => updateEdit(criterion.rubricCriterionId, { comments: event.target.value })} /> : (edits[criterion.rubricCriterionId]?.comments || '')}</td>
        </tr>)}
      </tbody>
    </table>}

    {draftCriteria.length > 0 && <div style={{ padding: '12px 24px' }}>
      <label>Nhận xét chung<textarea maxLength={2000} value={comments} disabled={!canEditNow || busy} onChange={(event) => setComments(event.target.value)} /></label>
    </div>}

    {assessment?.totalScore != null && <div style={{ padding: '0 24px 12px' }}><strong>Tổng điểm tham khảo: {formatScore(assessment.totalScore)}</strong></div>}
    {assessment?.submittedAt && <div style={{ padding: '0 24px 12px' }}><small>Đã nộp: {formatWeeklyDateTime(assessment.submittedAt)}</small></div>}

    <div className="weekly-actions">
      <span />
      <div style={{ display: 'flex', gap: 8 }}>
        {!assessment && <button className="weekly-button" type="button" disabled={busy || !!recovery || !selectedRubricId} onClick={createDraft}>Tạo bản chấm</button>}
        {isDraft && assessment?.canEdit && <>
          <button className="weekly-button weekly-button--secondary" type="button" disabled={busy || !!recovery} onClick={saveDraft}>Lưu nháp</button>
          <button className="weekly-button" type="button" disabled={busy || !!recovery || !assessment.canSubmit} onClick={submit}>Nộp điểm</button>
        </>}
        {canRevise && <>
          <input type="text" maxLength={1000} aria-label="Lý do chỉnh sửa" placeholder="Lý do chỉnh sửa" value={revisionReason} disabled={busy} onChange={(event) => setRevisionReason(event.target.value)} />
          <button className="weekly-button weekly-button--secondary" type="button" disabled={busy || !!recovery || !revisionReason.trim()} onClick={createCorrection}>Tạo chỉnh sửa (phiên bản mới)</button>
        </>}
      </div>
    </div>
    <div className="collab-card"><Button variant="ghost" icon="history" aria-expanded={historyOpen} onClick={() => setHistoryOpen(value => !value)}>Xem lịch sử phiên bản</Button>{historyOpen && <WeeklyAssessmentHistory key={`${revision}:${assessment?.concurrencyToken}`} projectId={projectId} studentId={studentId} weekNumber={weekNumber} />}</div>
  </div>
}
