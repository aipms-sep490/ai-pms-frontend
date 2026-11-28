import { readAllPages } from '../../../services/api/paged-read'
import { UnsavedChangesNotice } from '../../../components/ui/UnsavedChangesNotice'
import { dateTimeLabel } from '../../execution/execution-utils'
import './evaluator-detail.css'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import * as api from '../../../services/api/evaluations.api'
import { HttpError } from '../../../services/http/http-client'
import { evaluationError, isAssignmentRevoked, isConflict } from '../evaluation-errors'
import { evaluationStageLabel, type EvaluationDraft, type EvaluationScore } from '../evaluation-types'
import { CriterionLevelPanel } from '../components/CriterionLevelPanel'
import { ScoringGuideDrawer } from '../components/ScoringGuideDrawer'
import type { EvaluationAssignmentEvidence } from '../../../services/api/evaluations.api'
import { useEvaluatorAssignment } from '../hooks/useEvaluatorAssignment'
import { ReportPreviewPanel } from './ReportPreviewPanel'
import { formatCount, formatPercent, formatScore } from '../../../components/ui/format'
import { InlineAlert } from '../../../components/ui/InlineAlert'
import { evaluatorApprovalLabel } from '../evaluator-approval'
import { useAssignmentSchemeContext } from '../hooks/useAssignmentSchemeContext'
import { EntityIdentityStrip } from '../../../components/ui/EntityIdentityStrip'
import { LiveScoringToolbar, type AutoSaveStatus } from './LiveScoringToolbar'
import {
  collectBatchDraftTargets,
  computeLivePreviewScore,
  scopeDescription,
  scoreGroups,
  valuesFor,
  type FieldValues,
} from './evaluator-scoring-helpers'
import { RubricGradingCopilotPanel } from '../../ai-suite/EvaluationAiPanels'

export function EvaluatorAssignmentDetailPage() {
  const { assignment, detail } = useEvaluatorAssignment()
  const schemeContext = useAssignmentSchemeContext(assignment.projectId, assignment.componentId)
  const [draft, setDraft] = useState<EvaluationDraft | null>(null)
  const [values, setValues] = useState<FieldValues>({})
  const [overallComment, setOverallComment] = useState('')
  const [state, setState] = useState<'loading' | 'empty' | 'ready' | 'unavailable'>('loading')
  const [busy, setBusy] = useState(false)
  const [conflicted, setConflicted] = useState(false), [permissionLost, setPermissionLost] = useState(false)
  const mutationLock = useRef(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<number, string>>({})
  const [evidence, setEvidence] = useState<EvaluationAssignmentEvidence | null>(null)
  const [evidenceState, setEvidenceState] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [workbench, setWorkbench] = useState<api.ProjectScoringWorkbench | null>(null)
  const [workbenchTab, setWorkbenchTab] = useState<'scoring' | 'process20'>('scoring')
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle')
  const [onlyMissing, setOnlyMissing] = useState(false)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()

  const loadWorkbench = useCallback(async (signal?: AbortSignal) => {
    try {
      const wb = await api.getProjectScoringWorkbench(assignment.projectId, signal)
      if (!signal?.aborted) setWorkbench(wb)
    } catch {
      // Optional enrichment panel; keep primary scoring flow unaffected if unavailable.
    }
  }, [assignment.projectId])

  const load = useCallback(async (preserveLocal = false) => {
    setState('loading')
    try {
      const result = await readAllPages(page => api.getProjectEvaluations(assignment.projectId, undefined, page))
      const next = result.find((item) => item.assignmentId === assignment.id) ?? null
      setDraft(next)
      if (next && !preserveLocal) { setValues(valuesFor(next)); setOverallComment(next.comments ?? ''); setFieldErrors({}) }
      setState(next ? 'ready' : 'empty')
    } catch (reason) {
      setErrorMessage(evaluationError(reason))
      setState('unavailable')
    }
  }, [assignment.id, assignment.projectId])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const controller = new AbortController()
    void loadWorkbench(controller.signal)
    return () => controller.abort()
  }, [loadWorkbench])
  useEffect(() => {
    let active = true
    setEvidence(null); setEvidenceState('loading')
    void api.getEvaluationAssignmentEvidence(assignment.id).then((result) => {
      if (!active) return
      setEvidence(result); setEvidenceState('ready')
    }).catch(() => { if (active) setEvidenceState('unavailable') })
    return () => { active = false }
  }, [assignment.id])

  const scoringAllowed = detail.canScore && !detail.legacyReadOnly && !permissionLost && assignment.status === 'ACTIVE'
  const dirty = Boolean(draft && (overallComment.trim() !== (draft.comments ?? '').trim() || draft.scores.some(criterion => {
    const row = values[criterion.rubricCriterionId]
    const raw = row?.score.trim() ?? ''
    const score = raw === '' ? null : Number(raw)
    return score !== criterion.score || (row?.comments.trim() ?? '') !== (criterion.comments ?? '').trim()
  })))
  const canFinalize = Boolean(scoringAllowed && !conflicted && draft?.status === 'DRAFT' && !dirty && draft.totalScore !== null && draft.missingCriterionIds.length === 0)

  const updateCriterion = (criterion: EvaluationScore, patch: Partial<FieldValues[number]>) => {
    setValues((current) => ({ ...current, [criterion.rubricCriterionId]: { ...(current[criterion.rubricCriterionId] ?? { score: '', comments: '' }), ...patch } }))
    setFieldErrors((current) => { const next = { ...current }; delete next[criterion.rubricCriterionId]; return next })
    setAutoSaveStatus('scheduled')
  }

  const livePreviewScore = useMemo(() => computeLivePreviewScore(draft, values), [draft, values])
  const failingFloor = workbench?.failingComponentThreshold ?? 4
  const isFailingFloorAlert = livePreviewScore !== null && livePreviewScore < failingFloor
  const batchTargets = useMemo(() => collectBatchDraftTargets(workbench), [workbench])

  async function startDraft() {
    if (!scoringAllowed || mutationLock.current || conflicted) return
    mutationLock.current = true
    setBusy(true); setNotice(null); setErrorMessage(null)
    try {
      const next = await api.createEvaluationDraft(assignment.id)
      setDraft(next); setValues(valuesFor(next)); setOverallComment(next.comments ?? ''); setState('ready')
    } catch (reason) {
      setErrorMessage(evaluationError(reason))
      if (isConflict(reason) || (reason instanceof HttpError && reason.status === 403)) await load(true)
    } finally { mutationLock.current = false; setBusy(false) }
  }

  const saveDraftInternal = useCallback(async (silent: boolean) => {
    if (!scoringAllowed || !draft || mutationLock.current || conflicted || permissionLost) return
    const errors: Record<number, string> = {}
    for (const criterion of draft.scores) {
      const raw = values[criterion.rubricCriterionId]?.score.trim() ?? ''
      if (!raw) continue
      const score = Number(raw)
      if (!Number.isFinite(score) || score < 0 || score > criterion.maxScore) {
        errors[criterion.rubricCriterionId] = `Nhập điểm từ 0 đến ${criterion.maxScore}.`
      }
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    mutationLock.current = true
    const scores = draft.scores.flatMap((criterion) => {
      const row = values[criterion.rubricCriterionId]
      const raw = row?.score.trim() ?? ''
      return raw ? [{ rubricCriterionId: criterion.rubricCriterionId, score: Number(raw), comments: row?.comments.trim() || null }] : []
    })
    if (silent) {
      setAutoSaveStatus('saving')
    } else {
      setBusy(true); setNotice(null); setErrorMessage(null)
    }
    try {
      const next = await api.saveEvaluationDraft(draft.id, { concurrencyToken: draft.concurrencyToken, comments: overallComment.trim() || null, scores })
      setDraft(next); setValues(valuesFor(next)); setOverallComment(next.comments ?? '')
      setAutoSaveStatus('saved')
      if (!silent) setNotice('Đã lưu bản nháp theo dữ liệu máy chủ.')
      void loadWorkbench()
    } catch (reason) {
      setAutoSaveStatus('paused')
      if (isConflict(reason)) { setConflicted(true); await load(true) }
      if (reason instanceof HttpError && (reason.status === 403 || reason.status === 404)) {
        setPermissionLost(true)
        setEvidence(null)
        if (!isAssignmentRevoked(reason)) setDraft(null)
      }
      setErrorMessage(evaluationError(reason))
    } finally {
      mutationLock.current = false
      if (!silent) setBusy(false)
    }
  }, [conflicted, draft, load, loadWorkbench, overallComment, permissionLost, scoringAllowed, values])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await saveDraftInternal(false)
  }

  // Debounced 2s auto-save for Live Scoring Workbench; halts immediately on 403/409/network failure while preserving local edits.
  useEffect(() => {
    if (!scoringAllowed || draft?.status !== 'DRAFT' || !dirty || conflicted || permissionLost || busy || autoSaveStatus === 'paused') return
    const timer = window.setTimeout(() => {
      void saveDraftInternal(true)
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [autoSaveStatus, busy, conflicted, dirty, draft?.status, permissionLost, saveDraftInternal, scoringAllowed])

  async function batchFinalizeAll() {
    if (!workbench || busy || mutationLock.current || batchTargets.length === 0) return
    const missingAny = batchTargets.some(t => t.missingCriteriaCount > 0)
    mutationLock.current = true; setBusy(true)
    const impactLines = batchTargets.map(t => `• Phiếu #${t.evaluationId} (${t.componentName ?? t.scope}): ${t.totalScore == null ? 'Chưa đủ điểm' : `${formatScore(t.totalScore)}/10`}`).join('\n')
    const confirmed = await requestConfirmation({
      title: `Chốt hàng loạt ${batchTargets.length} phiếu đánh giá?`,
      description: `Impact Diff — Các phiếu sau sẽ khóa vĩnh viễn không thể sửa:\n${impactLines}${missingAny ? '\nLưu ý: Phiếu còn thiếu tiêu chí sẽ bị máy chủ từ chối 422 INCOMPLETE_SCORES và giữ nguyên toàn bộ.' : ''}`,
      confirmLabel: `Chốt tất cả (${batchTargets.length})`,
      danger: true,
    })
    if (confirmed === null) { mutationLock.current = false; setBusy(false); return }
    setNotice(null); setErrorMessage(null)
    try {
      const result = await api.batchFinalizeEvaluations(
        assignment.projectId,
        batchTargets.map(t => ({ evaluationId: t.evaluationId!, concurrencyToken: t.evaluationConcurrencyToken! })),
      )
      setNotice(`Đã chốt thành công ${result.finalizedCount} phiếu đánh giá theo quy chuẩn N6.`)
      await load(false)
      await loadWorkbench()
    } catch (reason) {
      if (isConflict(reason)) { setConflicted(true); await load(true) }
      if (reason instanceof HttpError && (reason.status === 403 || reason.status === 404)) setPermissionLost(true)
      setErrorMessage(evaluationError(reason))
    } finally {
      mutationLock.current = false; setBusy(false)
    }
  }

  async function finalize() {
    if (!canFinalize || !draft || busy || mutationLock.current) return
    mutationLock.current = true; setBusy(true)
    const confirmed = await requestConfirmation({ title: 'Chốt đánh giá?', description: 'Chốt bản điểm đã lưu. Sau khi chốt, bạn không thể sửa điểm hoặc nhận xét. Hệ thống kiểm tra lại phân công và thời hạn đánh giá.', confirmLabel: 'Yêu cầu chốt đánh giá', danger: true })
    if (confirmed === null) { mutationLock.current = false; setBusy(false); return }
    setBusy(true); setNotice(null); setErrorMessage(null)
    try {
      const next = await api.finalizeEvaluation(draft.id, draft.concurrencyToken)
      setDraft(next); setValues(valuesFor(next)); setOverallComment(next.comments ?? ''); setNotice('Máy chủ đã chốt đánh giá.')
    } catch (reason) {
      if (isConflict(reason)) { setConflicted(true); await load(true) }
      if (reason instanceof HttpError && (reason.status === 403 || reason.status === 404)) {
        setPermissionLost(true)
        setEvidence(null)
        if (!isAssignmentRevoked(reason)) setDraft(null)
      }
      setErrorMessage(evaluationError(reason))
    } finally { mutationLock.current = false; setBusy(false) }
  }

  const editable = draft?.status === 'DRAFT'
  const previewFiles = api.evaluationEvidenceFiles(evidence)
  const hasPreview = evidenceState === 'ready' && previewFiles.length > 0
  const rubricSummary = useMemo(() => draft ? `${draft.rubricName} · phiên bản ${draft.rubricVersion}` : `${assignment.rubricName ?? 'Chưa tải được tên bộ tiêu chí'} · phiên bản chưa tải`, [assignment.rubricName, draft])
  const approval = evaluatorApprovalLabel({
    isDemo: detail.schemeIsDemo ?? (schemeContext.state === 'ready' ? schemeContext.policy?.isDemo : undefined),
    approvalStatus: detail.schemeApprovalStatus ?? (schemeContext.state === 'ready' ? schemeContext.policy?.approvalStatus : undefined),
  })
  const sheetWeight = detail.componentStudentWeightPercent ?? (schemeContext.state === 'ready' ? schemeContext.component?.studentWeightPercent : null)

  const liveProgress = useMemo(() => {
    if (!draft) return { scoredCount: 0, totalCount: 0, missingCount: 0, estimatedScore: null as number | null }
    let scoredCount = 0
    for (const c of draft.scores) {
      const raw = (values[c.rubricCriterionId]?.score ?? '').trim()
      if (raw !== '' && Number.isFinite(Number(raw))) scoredCount += 1
    }
    return {
      scoredCount,
      totalCount: draft.scores.length,
      missingCount: draft.scores.length - scoredCount,
      estimatedScore: livePreviewScore,
    }
  }, [draft, livePreviewScore, values])

  const visibleGroups = useMemo(() => {
    if (!draft) return []
    const groups = scoreGroups(draft.scores)
    if (!onlyMissing) return groups
    return groups
      .map((g) => ({
        ...g,
        scores: g.scores.filter((c) => (values[c.rubricCriterionId]?.score ?? '').trim() === ''),
      }))
      .filter((g) => g.scores.length > 0)
  }, [draft, onlyMissing, values])

  return <WorkspacePage size="wide" title="Chấm điểm theo phạm vi được phân công" eyebrow={assignment.componentName ?? 'Bài chấm được phân công'} description="Đối chiếu minh chứng, ghi điểm và nhận xét cho từng tiêu chí." backTo="/evaluator/workspace" className="evaluation-workspace evaluator-detail space-y-5 pb-12" identity={<EntityIdentityStrip chips={[
    { icon: 'folder_open', label: 'Đồ án', value: assignment.projectTitle ?? 'Đồ án được phân công' },
    { icon: 'grading', label: 'Bộ tiêu chí của phiếu chấm', value: rubricSummary },
    { icon: 'event_note', label: 'Giai đoạn', value: evaluationStageLabel(detail.stage ?? assignment.stage ?? evidence?.stage) },
    { icon: 'person_pin', label: 'Phạm vi', value: scopeDescription(assignment.scope, assignment.majorName, assignment.studentName) },
  ]} />}>
    <header className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-muted">
          <dl><div><dt className="inline font-semibold text-ink-soft">Tỷ trọng phiếu này trong điểm sinh viên: </dt><dd className="inline font-semibold text-ink">{sheetWeight == null ? 'Chưa có dữ liệu' : formatPercent(sheetWeight)}</dd></div></dl>
          {detail.completedEvaluators != null && detail.requiredEvaluators != null ? (
            <p role="status" className="text-xs text-ink-muted">
              Người chấm đã hoàn tất: {detail.completedEvaluators}/{detail.requiredEvaluators}. Thiếu phiếu thì kết quả ở trạng thái chờ, không phải 0.
            </p>
          ) : null}
        </div>
        <ScoringGuideDrawer />
      </div>
      <InlineAlert tone={approval.tone}>{approval.text}</InlineAlert>
    </header>

    {notice ? (
      <section role="status" className="flex items-center gap-2.5 rounded-xl border border-hairline border-l-4 border-l-status-success-text bg-card p-4 text-sm text-ink shadow-xs">
        <span className="material-symbols-outlined text-[18px] text-status-success-text" aria-hidden="true">check_circle</span>
        <span>{notice}</span>
      </section>
    ) : null}
    {errorMessage ? <section role="alert" className="rounded-xl border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-text">{errorMessage}</section> : null}
    {conflicted && <section role="alert" className="workspace-surface p-4"><p>Điểm nháp được giữ để đối chiếu. Hãy kiểm tra dữ liệu máy chủ vừa tải trước khi lưu/chốt lại.</p><button type="button" disabled={busy || state !== 'ready'} className="min-h-11 text-primary underline" onClick={() => setConflicted(false)}>Tôi đã đối chiếu bản điểm mới</button></section>}
    <div className="evaluator-cold-layout">
      {hasPreview ? <aside className="evaluator-cold-aside"><ReportPreviewPanel assignmentId={assignment.id} files={previewFiles} /></aside> : null}
      <div className="evaluator-cold-main">
        <section className="rounded-xl border border-hairline bg-card p-5"><h2 className="font-semibold text-ink">Tóm tắt gói bàn giao</h2>{evidenceState === 'loading' ? <p role="status" className="mt-1 text-sm leading-6 text-ink-muted">Đang tải thông tin gói bàn giao theo phân công…</p> : null}{evidenceState === 'unavailable' ? <p role="alert" className="mt-1 text-sm leading-6 text-status-warning-text">Chưa tải được thông tin gói bàn giao theo phân công. Các phần chấm điểm khác vẫn giữ nguyên.</p> : null}{evidenceState === 'ready' && evidence ? <div className="mt-2 grid gap-x-6 gap-y-1 text-sm leading-6 text-ink-muted sm:grid-cols-2"><p>Giai đoạn: {evaluationStageLabel(evidence.stage)}</p>{evidence.stage === 'COLD' ? <p>Gói báo cáo: {evidence.coldPackageId ? 'Đã khóa' : 'Chưa có'}</p> : null}<p>Gói bàn giao: {evidence.finalSubmissionId ? 'Bản nộp đã khóa của đồ án' : 'Chưa có'}</p><p>Thời điểm nộp: {evidence.submittedAt ? dateTimeLabel(evidence.submittedAt) : 'Chưa có'}</p><p>Số hạng mục bàn giao: {evidence.itemCount}</p>{evidence.itemCount === 0 ? <p role="status" className="sm:col-span-2 text-status-warning-text">Không có tài liệu trong gói đã khóa khớp phạm vi bài chấm này. Minh chứng ngành/cá nhân phải được khai báo đúng ngành và sinh viên trước khi khóa gói. Liên hệ khoa để kiểm tra bộ bàn giao; tài liệu chung không tự trở thành minh chứng cá nhân.</p> : <p className="sm:col-span-2 text-xs">Tài liệu được hiển thị tại mục Báo cáo của sinh viên, có thể xem trước hoặc tải xuống.</p>}</div> : null}<p className="mt-2 text-xs text-ink-muted">Chỉ xem và tải các tệp trong phạm vi phân công này.</p></section>
        {state === 'loading' ? <p role="status" className="rounded-xl border border-hairline bg-card p-4 text-sm text-ink-muted">Đang tải bản nháp và tiêu chí chấm…</p> : null}
        {state === 'unavailable' ? <section className="rounded-xl border border-status-error-border bg-status-error-bg p-5 text-sm text-status-error-text">Chưa tải được bản nháp đánh giá. <button type="button" className="min-h-11 font-semibold underline" onClick={() => void load(true)}>Tải lại</button></section> : null}
        {!scoringAllowed ? <section role="alert" className="rounded-xl border border-status-warning-border bg-status-warning-bg p-5 text-sm text-status-warning-text"><h2 className="font-semibold">Phân công chỉ đọc</h2><p className="mt-1 leading-6">{permissionLost ? 'Phân công đã bị thu hồi hoặc không còn quyền chấm; biểu mẫu đã khóa để bảo toàn bản nháp bạn vừa nhập.' : detail.denialReason === 'LEGACY_SCOPE_UNKNOWN' ? 'Hệ thống đánh dấu phạm vi phân công cũ hoặc không xác định; không có thao tác chấm điểm.' : 'Hệ thống không cấp quyền chấm điểm cho phân công này. Các thao tác tạo, lưu và chốt được ẩn.'}</p></section> : null}
        {state === 'empty' ? <section className="rounded-xl border border-hairline bg-card p-5"><h2 className="font-semibold text-ink">Chưa có bản nháp đánh giá</h2><p className="mt-1 text-sm leading-6 text-ink-muted">Bạn có thể yêu cầu máy chủ tạo bản nháp cho đúng phân công này. Máy chủ sẽ kiểm tra cửa sổ đánh giá, gói bàn giao đã khóa và phạm vi hiện tại.</p>{scoringAllowed ? <button type="button" disabled={busy} onClick={() => void startDraft()} className="mt-4 min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang tạo…' : 'Tạo bản nháp đánh giá'}</button> : null}</section> : null}

        {state === 'ready' && draft ? <>
          <LiveScoringToolbar
            draft={draft}
            values={values}
            livePreviewScore={livePreviewScore}
            failingFloor={failingFloor}
            isFailingFloorAlert={isFailingFloorAlert}
            isInterdisciplinaryCommonDefense={
              workbench?.calculationFormula === 'POL_INTER_40_40_20'
              && assignment.scope === 'COMMON'
              && (detail.stage ?? assignment.stage ?? evidence?.stage) === 'DEFENSE'
            }
            autoSaveStatus={autoSaveStatus}
            dirty={dirty}
            busy={busy}
            conflicted={conflicted}
            scoringAllowed={scoringAllowed}
            editable={Boolean(editable)}
            workbench={workbench}
            batchDraftCount={batchTargets.length}
            workbenchTab={workbenchTab}
            onWorkbenchTabChange={setWorkbenchTab}
            onBatchFinalizeAll={() => void batchFinalizeAll()}
          />

          <div className="evaluator-sticky-scorebar">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Tiến trình:</span>
              <span className="rounded-full bg-canvas px-2.5 py-0.5 font-mono text-xs font-bold text-ink">
                {liveProgress.scoredCount} / {liveProgress.totalCount} tiêu chí
              </span>
              {liveProgress.missingCount === 0 ? (
                <span className="rounded-full bg-status-success-bg px-2.5 py-0.5 text-xs font-semibold text-status-success-text">Đã chấm đủ</span>
              ) : (
                <span className="rounded-full bg-status-warning-bg px-2.5 py-0.5 text-xs font-semibold text-status-warning-text">
                  Thiếu {liveProgress.missingCount} tiêu chí
                </span>
              )}
              <span className="rounded-full border border-primary/25 bg-primary-subtle px-2.5 py-0.5 font-mono text-xs font-bold text-primary">
                Tạm tính: {liveProgress.estimatedScore === null ? '—' : `${formatScore(liveProgress.estimatedScore)} / ${formatScore(draft.scoreScale)}`}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {liveProgress.missingCount > 0 && (
                <button
                  type="button"
                  aria-pressed={onlyMissing}
                  onClick={() => setOnlyMissing((v) => !v)}
                  className={`inline-flex min-h-9 items-center gap-1 rounded-lg border px-3 text-xs font-semibold transition-colors ${onlyMissing ? 'border-primary bg-primary-subtle text-primary' : 'border-hairline bg-card text-ink-soft hover:border-primary hover:text-primary'}`}
                >
                  <span className="material-symbols-outlined text-[15px]" aria-hidden="true">filter_alt</span>
                  Chỉ hiện tiêu chí chưa chấm
                </button>
              )}
              {scoringAllowed && editable ? (
                <button
                  type="submit"
                  form="evaluator-scoring-form"
                  disabled={busy || conflicted}
                  aria-label="Lưu nhanh tiến trình"
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-primary bg-card px-3.5 text-xs font-semibold text-primary shadow-xs hover:bg-primary-subtle disabled:opacity-50"
                >
                  {busy ? 'Đang lưu…' : 'Lưu nhanh'}
                </button>
              ) : null}
            </div>
          </div>

          {scoringAllowed && editable ? (
            <RubricGradingCopilotPanel
              assignmentId={assignment.id}
              disabled={busy || conflicted}
              onApplyCriterionComment={(rubricCriterionId, suggestedComment) => {
                const target = draft.scores.find((s) => s.rubricCriterionId === rubricCriterionId)
                if (target) updateCriterion(target, { comments: suggestedComment })
              }}
              onApplyAllComments={(suggestions, overallSummary) => {
                setValues((current) => {
                  const next = { ...current }
                  for (const s of suggestions) {
                    if (draft.scores.some((c) => c.rubricCriterionId === s.rubricCriterionId)) {
                      next[s.rubricCriterionId] = {
                        score: next[s.rubricCriterionId]?.score ?? '',
                        comments: s.suggestedComment,
                      }
                    }
                  }
                  return next
                })
                if (!overallComment.trim() && overallSummary) setOverallComment(overallSummary)
              }}
            />
          ) : null}

          <form id="evaluator-scoring-form" className="evaluator-scoring-form" onSubmit={(event) => void save(event)} noValidate>
            {onlyMissing && visibleGroups.length === 0 ? (
              <section className="p-6 text-center text-sm text-ink-muted">
                <p className="font-semibold text-status-success-text">Tất cả tiêu chí đã có điểm.</p>
                <button type="button" className="mt-2 text-xs font-semibold text-primary underline" onClick={() => setOnlyMissing(false)}>Hiện lại toàn bộ tiêu chí</button>
              </section>
            ) : visibleGroups.map(group => <div key={group.key} role={group.parentId == null ? undefined : 'group'} aria-label={group.parentId == null ? undefined : `Nhóm ${group.parentName ?? 'tiêu chí'}`} className={group.parentId == null ? '' : 'evaluator-criterion-group'}>
              {group.parentId != null && <div className="evaluator-criterion-group-header"><h2 className="font-heading text-sm font-bold text-ink">{group.parentName ?? 'Nhóm tiêu chí'}</h2></div>}
              {group.scores.map(criterion => <section key={criterion.rubricCriterionId} className="evaluator-criterion-item p-5">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]"><div className="min-w-0"><h3 className="break-words font-semibold text-ink">{criterion.criterionCode ? `${criterion.criterionCode} · ` : ''}{criterion.name}{criterion.isRequired ? <span aria-label="bắt buộc" className="ml-1 text-status-error-text">*</span> : null}</h3><p className="mt-1 break-words text-sm leading-6 text-ink-muted">{criterion.description || 'Không có mô tả.'} · Trọng số hiệu lực trong bộ tiêu chí: {formatPercent(criterion.effectiveWeightPercent ?? criterion.weightPercent)} · tối đa {formatScore(criterion.maxScore)}</p></div><label className="text-sm font-semibold text-ink-soft">Điểm<input aria-label={`Điểm ${criterion.name}`} aria-describedby={fieldErrors[criterion.rubricCriterionId] ? `score-error-${criterion.rubricCriterionId}` : undefined} value={values[criterion.rubricCriterionId]?.score ?? ''} onChange={(event) => updateCriterion(criterion, { score: event.target.value })} disabled={!scoringAllowed || !editable || busy} inputMode="decimal" type="number" min="0" max={criterion.maxScore} step="0.01" className="mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 font-normal text-ink disabled:cursor-not-allowed disabled:opacity-50" />{(values[criterion.rubricCriterionId]?.score ?? '') === '' && <span className="mt-1 block text-xs font-normal text-ink-muted">— Chưa chấm</span>}</label></div>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    aria-label={`Thanh kéo điểm ${criterion.name}`}
                    min={0}
                    max={criterion.maxScore}
                    step={0.25}
                    value={values[criterion.rubricCriterionId]?.score === '' || values[criterion.rubricCriterionId]?.score === undefined ? 0 : Number(values[criterion.rubricCriterionId]?.score)}
                    onChange={(event) => updateCriterion(criterion, { score: event.target.value })}
                    disabled={!scoringAllowed || !editable || busy}
                    className="h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <span className="w-16 shrink-0 text-right text-xs font-semibold text-ink-muted">Bước 0.25</span>
                </div>

                {criterion.evidenceGuidance ? (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary-subtle/50 p-2.5 text-xs text-ink-soft">
                    <span className="inline-flex shrink-0 rounded bg-primary px-1.5 py-0.5 font-bold uppercase tracking-wide text-white text-xs">Minh chứng gợi ý</span>
                    <span className="leading-relaxed">{criterion.evidenceGuidance}</span>
                  </div>
                ) : null}
                {criterion.learningOutcome ? <p className="mt-1 text-sm text-ink-muted">Chuẩn đầu ra: {criterion.learningOutcome}</p> : null}
                <CriterionLevelPanel
                  levels={criterion.levels}
                  currentScore={values[criterion.rubricCriterionId]?.score}
                  onSelectScore={scoringAllowed && editable && !busy ? (score) => updateCriterion(criterion, { score: String(score) }) : undefined}
                  disabled={!scoringAllowed || !editable || busy}
                />
                {fieldErrors[criterion.rubricCriterionId] ? <p id={`score-error-${criterion.rubricCriterionId}`} className="mt-2 text-sm text-status-error-text">{fieldErrors[criterion.rubricCriterionId]}</p> : null}
                <label className="mt-3 block text-sm font-semibold text-ink-soft">Nhận xét tiêu chí<textarea aria-label={`Nhận xét ${criterion.name}`} value={values[criterion.rubricCriterionId]?.comments ?? ''} onChange={(event) => updateCriterion(criterion, { comments: event.target.value })} disabled={!scoringAllowed || !editable || busy} maxLength={2000} className="mt-1 block min-h-24 w-full rounded-lg border border-hairline bg-card px-3 py-2 font-normal text-ink disabled:cursor-not-allowed disabled:opacity-50" /></label>
              </section>)}
            </div>)}
            <section className="p-5"><label className="block text-sm font-semibold text-ink-soft">Nhận xét tổng thể<textarea aria-label="Nhận xét tổng thể" value={overallComment} onChange={(event) => setOverallComment(event.target.value)} disabled={!scoringAllowed || !editable || busy} maxLength={10000} className="mt-1 block min-h-28 w-full rounded-lg border border-hairline bg-card px-3 py-2 font-normal text-ink disabled:cursor-not-allowed disabled:opacity-50" /></label>{scoringAllowed && editable ? <button type="submit" disabled={busy || conflicted} className="mt-4 min-h-11 rounded-lg border border-primary bg-card px-4 text-sm font-semibold text-primary hover:bg-primary-subtle disabled:opacity-50">{busy ? 'Đang lưu…' : 'Lưu bản nháp'}</button> : <p className="mt-4 text-sm font-semibold text-status-success-text">{draft.status === 'FINALIZED' ? `Đánh giá đã chốt${draft.finalization ? ` lúc ${dateTimeLabel(draft.finalization.finalizedAt)}` : ''}; chỉ đọc.` : 'Bạn có quyền xem đánh giá này.'}</p>}</section>
          </form>
          {scoringAllowed && editable ? <section className="rounded-xl border border-status-warning-border bg-status-warning-bg p-5 text-sm text-status-warning-text"><h2 className="font-semibold">Chốt đánh giá</h2><dl className="evaluator-score-summary"><div><dt>Điểm đã lưu</dt><dd>{draft.totalScore === null ? 'Chưa đủ điểm' : `${formatScore(draft.totalScore)}/${formatScore(draft.scoreScale)}`}</dd></div><div><dt>Tiêu chí còn thiếu</dt><dd>{formatCount(draft.missingCriterionIds.length)}</dd></div><div><dt>Bản nháp</dt><dd>{dirty ? 'Có thay đổi chưa lưu' : 'Đã đồng bộ'}</dd></div></dl>{dirty ? <p role="status" className="mt-3 font-semibold">Lưu bản nháp trước khi chốt để áp dụng điểm và nhận xét vừa sửa.</p> : null}<p className="mt-1 leading-6">Kiểm tra điểm và nhận xét trước khi chốt. Hệ thống sẽ xác nhận các điều kiện để hoàn tất đánh giá.</p><button type="button" disabled={busy || !canFinalize} onClick={() => void finalize()} className="mt-4 min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">Yêu cầu chốt đánh giá</button></section> : null}

          <section className="rounded-xl border border-hairline bg-card p-4 text-xs text-ink-muted"><strong className="text-ink-soft">Kết quả công bố:</strong> Kết quả chính thức được bộ môn công bố sau khi hoàn tất đánh giá.</section>
        </> : null}
      </div>
    </div>
    <UnsavedChangesNotice dirty={dirty && editable && scoringAllowed} busy={busy} />
    {confirmationDialog}
  </WorkspacePage>
}
