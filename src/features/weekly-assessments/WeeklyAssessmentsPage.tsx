import { useEffect, useMemo, useState } from 'react'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import * as api from '../../services/api/weekly.api'
import type { Rubric, RubricCriterion, WeeklyAssessment, WeeklyAssessmentWeek } from '../../services/api/weekly.api'
import type { EvaluationScoreInput } from '../evaluations/evaluation-types'
import { formatCalendarDate, formatWeeklyDateTime } from './weekly-types'
import { weeklyError, weeklyNeedsAuthoritativeRefresh } from './weekly-errors'
import { WeeklyBadge, WeeklyError, WeeklyLoading, WeeklyShell } from './weekly-ui'

type ScoreEdit = { score: string; comments: string }
type EditableCriterion = { rubricCriterionId: number; name: string; description: string | null; maxScore: number }

function leafCriteria(criteria: RubricCriterion[]): RubricCriterion[] {
  const parentIds = new Set(criteria.map((c) => c.parentId).filter((id): id is number => id != null))
  return criteria.filter((c) => !parentIds.has(c.id)).sort((a, b) => a.sortOrder - b.sortOrder)
}

export function WeeklyAssessmentsPage() {
  const { project, team, routeBase } = useExecutionAccess()
  const members = team?.members ?? []
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
    <div className="weekly-demo-notice">Đây là chấm theo dõi (demo), chỉ hiển thị cho GVHD và sinh viên liên quan — không ảnh hưởng StudentResult chính thức.</div>
    {weeksError ? <WeeklyError message={weeksError} /> : !weeks ? <WeeklyLoading /> : <>
      <div className="weekly-toolbar">
        <label>Tuần<select value={selectedWeek ?? ''} onChange={(event) => setSelectedWeek(Number(event.target.value))}>
          {weeks.map((week) => <option key={week.weekNumber} value={week.weekNumber}>
            Tuần {week.weekNumber} ({formatCalendarDate(week.startDate)}–{formatCalendarDate(week.endDate)}){!week.hasStarted ? ' • Chưa tới' : ''}
          </option>)}
        </select></label>
        <label>Sinh viên<select value={selectedStudentId ?? ''} onChange={(event) => setSelectedStudentId(Number(event.target.value))}>
          {members.map((member) => <option key={member.userId} value={member.userId}>{member.fullName}</option>)}
        </select></label>
      </div>
      {selectedWeek != null && selectedStudentId != null && (() => {
        const week = weeks.find((w) => w.weekNumber === selectedWeek)
        return <WeeklyAssessmentEditor projectId={projectId} weekNumber={selectedWeek} studentId={selectedStudentId} hasStarted={week?.hasStarted ?? false} />
      })()}
    </>}
  </WeeklyShell>
}

function WeeklyAssessmentEditor({ projectId, weekNumber, studentId, hasStarted }: {
  projectId: number; weekNumber: number; studentId: number; hasStarted: boolean
}) {
  const [assessment, setAssessment] = useState<WeeklyAssessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [rubrics, setRubrics] = useState<Rubric[] | null>(null)
  const [selectedRubricId, setSelectedRubricId] = useState<number | null>(null)
  const [edits, setEdits] = useState<Record<number, ScoreEdit>>({})
  const [comments, setComments] = useState('')
  const [revisionReason, setRevisionReason] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(''); setAssessment(null); setRubrics(null); setSelectedRubricId(null)
    api.getWeeklyAssessmentHistory(projectId, { studentId, weekNumber }, 1, 1, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        const current = result.items[0] ?? null
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
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(weeklyError(reason)) })
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
    setBusy(true); setError('')
    try {
      const result = await action()
      setAssessment(result)
      setComments(result.comments ?? '')
    } catch (reason) {
      setError(weeklyError(reason))
      if (weeklyNeedsAuthoritativeRefresh(reason)) setRevision((v) => v + 1)
    } finally {
      setBusy(false)
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
    void run(() => api.submitWeeklyAssessment(assessment.id, assessment.concurrencyToken))
  }
  function createCorrection() {
    if (!assessment || !revisionReason.trim()) return
    void run(() => api.saveWeeklyAssessment(projectId, { studentId, weekNumber, rubricId: assessment.rubricId, expectedLatestVersion: assessment.version, scores: buildScores(), comments: comments.trim() || null, revisionReason: revisionReason.trim() }))
  }

  if (loading) return <WeeklyLoading />
  if (!hasStarted) return <div className="weekly-notice weekly-notice--error">Tuần này chưa tới, chưa thể chấm.</div>

  const isDraft = assessment?.status === 'DRAFT'
  const isSubmitted = assessment?.status === 'SUBMITTED'
  const canEditNow = (!assessment && selectedRubricId != null) || (isDraft && assessment?.canEdit) || (isSubmitted && assessment?.canEdit)

  return <div className="weekly-panel">
    <div className="weekly-panel-heading">
      <h2>{assessment ? `${assessment.rubricName} (v${assessment.version})` : 'Chưa có bản chấm cho tuần này'}</h2>
      {assessment && <WeeklyBadge status={assessment.status} />}
    </div>
    {error && <div style={{ padding: '0 24px', marginTop: 12 }}><WeeklyError message={error} /></div>}

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
            value={edits[criterion.rubricCriterionId]?.score ?? ''}
            onChange={(event) => updateEdit(criterion.rubricCriterionId, { score: event.target.value })} /> : <span>{edits[criterion.rubricCriterionId]?.score || '—'}</span>} / {criterion.maxScore}</td>
          <td>{canEditNow ? <input type="text" disabled={busy}
            value={edits[criterion.rubricCriterionId]?.comments ?? ''}
            onChange={(event) => updateEdit(criterion.rubricCriterionId, { comments: event.target.value })} /> : (edits[criterion.rubricCriterionId]?.comments || '')}</td>
        </tr>)}
      </tbody>
    </table>}

    {draftCriteria.length > 0 && <div style={{ padding: '12px 24px' }}>
      <label>Nhận xét chung<textarea value={comments} disabled={!canEditNow || busy} onChange={(event) => setComments(event.target.value)} /></label>
    </div>}

    {assessment?.totalScore != null && <div style={{ padding: '0 24px 12px' }}><strong>Tổng điểm tham khảo: {assessment.totalScore}</strong></div>}
    {assessment?.submittedAt && <div style={{ padding: '0 24px 12px' }}><small>Đã nộp: {formatWeeklyDateTime(assessment.submittedAt)}</small></div>}

    <div className="weekly-actions">
      <span />
      <div style={{ display: 'flex', gap: 8 }}>
        {!assessment && <button className="weekly-button" type="button" disabled={busy || !selectedRubricId} onClick={createDraft}>Tạo bản chấm</button>}
        {isDraft && assessment?.canEdit && <>
          <button className="weekly-button weekly-button--secondary" type="button" disabled={busy} onClick={saveDraft}>Lưu nháp</button>
          <button className="weekly-button" type="button" disabled={busy || !assessment.canSubmit} onClick={submit}>Nộp điểm</button>
        </>}
        {isSubmitted && assessment?.canEdit && <>
          <input type="text" placeholder="Lý do chỉnh sửa" value={revisionReason} disabled={busy} onChange={(event) => setRevisionReason(event.target.value)} />
          <button className="weekly-button weekly-button--secondary" type="button" disabled={busy || !revisionReason.trim()} onClick={createCorrection}>Tạo chỉnh sửa (phiên bản mới)</button>
        </>}
      </div>
    </div>
  </div>
}
