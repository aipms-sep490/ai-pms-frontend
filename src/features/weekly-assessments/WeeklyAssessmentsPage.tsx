import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../components/ui/Table'
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
import { ActionVerdict } from '../../components/ui/ActionVerdict'
import { Avatar } from '../../components/ui/Avatar'
import { WorkspaceEmptyState } from '../../components/ui/WorkspaceState'
import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { ExIcon } from '../execution/execution-ui'

type ScoreEdit = { score: string; comments: string }
type EditableCriterion = { rubricCriterionId: number; name: string; description: string | null; maxScore: number }

function leafCriteria(criteria: RubricCriterion[]): RubricCriterion[] {
  const parentIds = new Set(criteria.map((c) => c.parentId).filter((id): id is number => id != null))
  return criteria.filter((c) => !parentIds.has(c.id)).sort((a, b) => a.sortOrder - b.sortOrder)
}

export function WeeklyAssessmentsPage() {
  const { project, team, routeBase, actor, currentUserId } = useExecutionAccess()
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
  return <WeeklyAssessmentsBody key={project.id} projectId={project.id} projectCode={project.code} projectTitle={project.title} routeBase={routeBase} members={members} actor={actor} currentUserId={currentUserId} />
}

function WeeklyAssessmentsBody({ projectId, projectCode, projectTitle, routeBase, members, actor, currentUserId }: {
  projectId: number; projectCode?: string | null; projectTitle: string; routeBase: string
  members: { userId: number; fullName: string }[]
  actor?: 'student' | 'supervisor' | 'mentor'
  currentUserId?: number
}) {
  const [weeks, setWeeks] = useState<WeeklyAssessmentWeek[] | null>(null)
  const [weeksError, setWeeksError] = useState('')
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const isStudent = actor === 'student'
  const studentSelfId = isStudent && currentUserId && members.some(m => m.userId === currentUserId) ? currentUserId : null
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(studentSelfId ?? members[0]?.userId ?? null)
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
        const fallback = (started ?? calendar.weeks.at(-1))?.weekNumber ?? null
        setSelectedWeek((current) =>
          current != null && calendar.weeks.some((w) => w.weekNumber === current) ? current : fallback,
        )
      })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setWeeksError(weeklyError(reason)) })
    return () => controller.abort()
  }, [projectId, refreshTick])

  const selectedIndex = weeks ? weeks.findIndex((w) => w.weekNumber === selectedWeek) : -1
  const prevWeek = selectedIndex > 0 && weeks ? weeks[selectedIndex - 1] : null
  const nextWeek = selectedIndex >= 0 && weeks && selectedIndex < weeks.length - 1 ? weeks[selectedIndex + 1] : null
  const activeMember = members.find(m => m.userId === selectedStudentId)
  const eyebrowTitle = projectCode ? `${projectCode} · ${projectTitle}` : projectTitle

  return <WeeklyShell title="Nhận xét tiến độ tuần (Tham khảo · Không tính điểm)" projectTitle={eyebrowTitle} backTo={isStudent ? undefined : `${routeBase}/workspace`}
    description={isStudent
      ? 'Tùy chọn — 0% điểm chính thức; điểm quá trình 20% được chốt theo Gate G1–G3. Theo dõi nhận xét tiến độ hằng tuần từ Giảng viên hướng dẫn để cải thiện đồ án.'
      : 'Tùy chọn — 0% điểm chính thức; điểm quá trình 20% được chốt theo Gate G1–G3. Ghi nhận xét tham khảo hằng tuần để đối chiếu khi chốt điểm G1–G3.'}
    action={
      <button
        type="button"
        className="ex-button ex-button-icon"
        aria-label="Làm mới"
        title="Làm mới"
        disabled={editorState.busy}
        onClick={() => void changeSelection(() => setRefreshTick(value => value + 1))}
      >
        <ExIcon name="refresh" />
      </button>
    }>
    {confirmationDialog}
    {weeksError ? <WeeklyError message={weeksError} retry={() => setRefreshTick(value => value + 1)} /> : !weeks ? <WeeklyLoading /> : weeks.length === 0 ? <WorkspaceEmptyState title="Chưa có tuần đánh giá" message="Hệ thống chưa tạo lịch tuần đánh giá cho đồ án này." /> : <>
      <div className="weekly-toolbar">
        <div className="weekly-toolbar-row">
          <div className="weekly-stepper">
            <button
              type="button"
              className="weekly-button weekly-button--secondary"
              disabled={editorState.busy || !prevWeek}
              onClick={() => prevWeek && void changeSelection(() => setSelectedWeek(prevWeek.weekNumber))}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_left</span>
              Tuần trước
            </button>
            <select
              aria-label="Tuần"
              className="weekly-week-select"
              value={selectedWeek ?? ''}
              disabled={editorState.busy}
              onChange={(event) => { const value = Number(event.target.value); void changeSelection(() => setSelectedWeek(value)) }}
            >
              {weeks.map((week) => <option key={week.weekNumber} value={week.weekNumber}>
                Tuần {week.weekNumber} ({formatCalendarDate(week.startDate)}–{formatCalendarDate(week.endDate)}){!week.hasStarted ? ' • Chưa tới' : ''}
              </option>)}
            </select>
            <button
              type="button"
              className="weekly-button weekly-button--secondary"
              disabled={editorState.busy || !nextWeek}
              onClick={() => nextWeek && void changeSelection(() => setSelectedWeek(nextWeek.weekNumber))}
            >
              Tuần sau
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_right</span>
            </button>
          </div>
          {isStudent ? (
            <div className="weekly-student-chip">
              <Avatar name={activeMember?.fullName ?? 'Sinh viên'} size="xs" shape="circle" />
              <span className="text-xs text-ink-muted">Sinh viên:</span>
              <span className="text-xs font-semibold text-ink">{activeMember?.fullName ?? 'Sinh viên'}</span>
            </div>
          ) : (
            <label className="weekly-inline-picker">
              <span>Sinh viên</span>
              <select value={selectedStudentId ?? ''} disabled={editorState.busy} onChange={(event) => { const value = Number(event.target.value); void changeSelection(() => setSelectedStudentId(value)) }}>
                {members.map((member) => <option key={member.userId} value={member.userId}>{member.fullName}</option>)}
              </select>
            </label>
          )}
        </div>
        {weeks.length > 1 && (
          <div className="weekly-pills-bar">
            <span className="weekly-pills-label">Chọn nhanh:</span>
            <div className="weekly-week-pills" role="navigation" aria-label="Chọn nhanh tuần">
              {weeks.map((week) => {
                const active = week.weekNumber === selectedWeek
                return (
                  <button
                    key={week.weekNumber}
                    type="button"
                    disabled={editorState.busy}
                    aria-current={active ? 'page' : undefined}
                    title={`Tuần ${week.weekNumber} (${formatCalendarDate(week.startDate)}–${formatCalendarDate(week.endDate)})`}
                    className={`weekly-week-pill${active ? ' weekly-week-pill--active' : ''}${!week.hasStarted ? ' weekly-week-pill--future' : ''}`}
                    onClick={() => void changeSelection(() => setSelectedWeek(week.weekNumber))}
                  >
                    T{week.weekNumber}
                  </button>
                )
              })}
            </div>
            {selectedWeek != null && (
              <span className="weekly-pills-counter">{selectedWeek} / {weeks.length} tuần</span>
            )}
          </div>
        )}
      </div>
      {selectedWeek != null && selectedStudentId != null && (() => {
        const week = weeks.find((w) => w.weekNumber === selectedWeek)
        return (
          <WeeklyAssessmentEditor
            key={`${selectedStudentId}:${selectedWeek}`}
            projectId={projectId}
            weekNumber={selectedWeek}
            studentId={selectedStudentId}
            hasStarted={week?.hasStarted ?? false}
            isStudent={isStudent}
            refreshTick={refreshTick}
            onSelectPrevWeek={prevWeek ? () => void changeSelection(() => setSelectedWeek(prevWeek.weekNumber)) : undefined}
            onEditorState={setEditorState}
          />
        )
      })()}
    </>}
  </WeeklyShell>
}

function WeeklyAssessmentEditor({ projectId, weekNumber, studentId, hasStarted, isStudent, refreshTick = 0, onSelectPrevWeek, onEditorState }: {
  projectId: number; weekNumber: number; studentId: number; hasStarted: boolean; isStudent?: boolean; refreshTick?: number; onSelectPrevWeek?: () => void; onEditorState: (state: { dirty: boolean; busy: boolean }) => void
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
  }, [projectId, studentId, weekNumber, revision, refreshTick])

  useEffect(() => {
    if (isStudent || assessment || rubrics) return
    const controller = new AbortController()
    api.getWeeklyAssessmentRubrics(projectId, 1, 50, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setRubrics(result.items) })
      .catch(() => { if (!controller.signal.aborted) setRubrics([]) })
    return () => controller.abort()
  }, [isStudent, projectId, assessment, rubrics])

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
  if (!hasStarted) return <div className="weekly-notice weekly-notice--error">{isStudent ? 'Tuần này chưa bắt đầu. Đánh giá sẽ được cập nhật khi kết thúc tuần học.' : 'Tuần này chưa tới, chưa thể chấm.'}</div>

  const isDraft = assessment?.status === 'DRAFT'
  const isSubmitted = assessment?.status === 'SUBMITTED'
  const canRevise = !isStudent && Boolean(assessment && (isSubmitted || isDraft && !assessment.canEdit))
  const canEditNow = !isStudent && !recovery && ((!assessment && selectedRubricId != null) || (isDraft && assessment?.canEdit))

  return <div className="weekly-panel">
    <div className="weekly-panel-heading">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2>{assessment ? `${assessment.rubricName} (v${assessment.version})` : 'Chưa có bản chấm cho tuần này'}</h2>
        {assessment && <WeeklyBadge status={assessment.status} />}
      </div>
      <Button variant="outline" size="sm" icon="history" aria-expanded={historyOpen} onClick={() => setHistoryOpen(value => !value)}>
        Xem lịch sử phiên bản
      </Button>
    </div>
    {!isStudent && assessment && <div className="mt-3 px-6"><ActionVerdict actions={[{ code: 'SUBMIT_WEEKLY_ASSESSMENT', allowed: assessment.canSubmit, reasons: !assessment.canSubmit ? (isSubmitted ? ['Bản chấm tuần này đã nộp.'] : !assessment.canEdit ? ['Bản chấm bị khóa hoặc không được phép chỉnh sửa.'] : ['Chưa đủ điều kiện nộp điểm tuần này.']) : [] }]} actionCode="SUBMIT_WEEKLY_ASSESSMENT" status="ready" okLabel="Đủ điều kiện nộp điểm đánh giá tuần" blockedLabel="Chưa thể nộp điểm đánh giá tuần" /></div>}
    {error && <div className="mt-3 px-6"><WeeklyError message={error} /></div>}
    {recovery && <div className="mx-6 my-3 rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-sm"><p className="font-medium text-status-warning-text">Bản mới nhất đã được tải lại. Nội dung chưa lưu của bạn được giữ riêng, chưa ghi đè dữ liệu.</p><details className="mt-2"><summary className="cursor-pointer font-semibold text-ink">Xem nội dung chưa lưu</summary>{Object.entries(recovery.edits).map(([id, value]) => <p key={id} className="mt-1 text-xs text-ink-soft">{draftCriteria.find(c => c.rubricCriterionId === Number(id))?.name ?? 'Tiêu chí'}: {value.score || 'Chưa chấm'} · {value.comments}</p>)}<p className="mt-1 text-xs text-ink-soft">{recovery.comments}</p></details><div className="mt-3 flex flex-wrap gap-2">{assessment?.canEdit && <Button onClick={() => { setEdits(Object.fromEntries(assessment.scores.map(score => [score.rubricCriterionId, recovery.edits[score.rubricCriterionId] ?? { score: score.score == null ? '' : String(score.score), comments: score.comments ?? '' }]))); setComments(recovery.comments); setRecovery(null) }}>Khôi phục vào bản nháp mới nhất</Button>}<Button variant="outline" onClick={() => setRecovery(null)}>Giữ dữ liệu máy chủ</Button></div></div>}

    {!assessment && !isStudent && <div className="px-6 py-4">
      <label>Rubric áp dụng<select value={selectedRubricId ?? ''} onChange={(event) => setSelectedRubricId(Number(event.target.value) || null)} disabled={!rubrics}>
        <option value="">— Chọn bộ tiêu chí —</option>
        {rubrics?.map((rubric) => <option key={rubric.id} value={rubric.id}>{rubric.name} (v{rubric.version})</option>)}
      </select></label>
    </div>}

    {!assessment && isStudent && (
      <div className="weekly-student-empty">
        <span className="weekly-student-empty-icon" aria-hidden="true">
          <span className="material-symbols-outlined text-[22px]">rate_review</span>
        </span>
        <p className="weekly-student-empty-title">Giảng viên hướng dẫn chưa nộp bản đánh giá cho tuần này.</p>
        <p className="weekly-student-empty-desc">Nhận xét và điểm tham khảo sẽ hiển thị tại đây ngay khi được công bố.</p>
        {onSelectPrevWeek && (
          <button type="button" className="weekly-button weekly-button--secondary mt-1" onClick={onSelectPrevWeek}>
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
            Xem tuần trước
          </button>
        )}
      </div>
    )}
    {draftCriteria.length > 0 && <Table stack className="weekly-criteria">
      <TableHead><TableRow head><TableHeaderCell>Tiêu chí</TableHeaderCell><TableHeaderCell>Điểm (tối đa)</TableHeaderCell><TableHeaderCell>Nhận xét</TableHeaderCell></TableRow></TableHead>
      <TableBody>
        {draftCriteria.map((criterion) => <TableRow key={criterion.rubricCriterionId}>
          <TableCell label="Tiêu chí" className="weekly-criteria-name">{criterion.name}{criterion.description && <small>{criterion.description}</small>}</TableCell>
          <TableCell label="Điểm (tối đa)">{canEditNow ? <input type="number" min={0} max={criterion.maxScore} step="0.01" disabled={busy}
            aria-label={`Điểm ${criterion.name}`} value={edits[criterion.rubricCriterionId]?.score ?? ''}
            onChange={(event) => updateEdit(criterion.rubricCriterionId, { score: event.target.value })} /> : <span className="font-semibold tabular-nums">{edits[criterion.rubricCriterionId]?.score || '—'}</span>} / {criterion.maxScore}</TableCell>
          <TableCell label="Nhận xét">{canEditNow ? <input type="text" maxLength={2000} aria-label={`Nhận xét ${criterion.name}`} disabled={busy}
            value={edits[criterion.rubricCriterionId]?.comments ?? ''}
            onChange={(event) => updateEdit(criterion.rubricCriterionId, { comments: event.target.value })} /> : (edits[criterion.rubricCriterionId]?.comments || '—')}</TableCell>
        </TableRow>)}
      </TableBody>
    </Table>}

    {draftCriteria.length > 0 && <div className="px-6 py-4">
      {canEditNow ? (
        <label>Nhận xét chung<textarea maxLength={2000} value={comments} disabled={busy} onChange={(event) => setComments(event.target.value)} /></label>
      ) : (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Nhận xét chung</p>
          <p className="weekly-prose-comment">{comments.trim() || 'Chưa có nhận xét chung.'}</p>
        </div>
      )}
    </div>}

    {assessment?.totalScore != null && <div className="px-6 pb-3 text-sm text-ink"><strong>Tổng điểm tham khảo: {formatScore(assessment.totalScore)}</strong></div>}
    {assessment?.submittedAt && <div className="px-6 pb-3 text-xs text-ink-muted"><small>Đã nộp: {formatWeeklyDateTime(assessment.submittedAt)}</small></div>}

    {!isStudent && <div className="weekly-actions">
      <span />
      <div className="flex flex-wrap items-center gap-2">
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
    </div>}
    {historyOpen && (
      <div className="weekly-history-bar">
        <WeeklyAssessmentHistory key={`${revision}:${refreshTick}:${assessment?.concurrencyToken}`} projectId={projectId} studentId={studentId} weekNumber={weekNumber} />
      </div>
    )}
  </div>
}
