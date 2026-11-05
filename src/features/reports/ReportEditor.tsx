import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { getProgressReportPrefill, type ProgressReportPrefill } from '../../services/api/progress-reports.api'
import type { ReportingCycle } from '../../services/api/progress-reports.api'
import type { AssistantDraft } from '../ai/academic-ai-api'
import { utcTimestamp } from '../execution/execution-utils'
import {
  formatReportDate,
  formSections,
  missingSubmissionFields,
  type CreateReport,
  type ProgressReport,
  type ReportDetail,
  type ReportType,
} from './report-types'

export function ReportEditor({
  projectId,
  report,
  initialDraft,
  cycles,
  existingReports = [],
  fieldErrors,
  busy,
  onSave,
  onDirtyChange,
}: {
  projectId: number
  initialDraft?: AssistantDraft
  report?: ReportDetail
  cycles?: ReportingCycle[]
  existingReports?: ProgressReport[]
  fieldErrors?: Record<string, string>
  busy: boolean
  onSave: (value: CreateReport) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
}) {
  const matches = !report && initialDraft?.report?.periodStart && initialDraft.report.periodEnd ? cycles?.filter(c => c.reportType === 'WEEKLY' && c.periodStart.slice(0, 10) === initialDraft.report!.periodStart && c.periodEnd.slice(0, 10) === initialDraft.report!.periodEnd && !existingReports.some(r => r.progressReportPeriodId === c.id || (r.reportType === c.reportType && r.periodStart.slice(0, 10) === c.periodStart.slice(0, 10) && r.periodEnd.slice(0, 10) === c.periodEnd.slice(0, 10)))) ?? [] : []
  const initialCycle = matches.length === 1 ? matches[0] : undefined
  const initialCycleId = initialCycle?.id
  const [selectedCycleId, setSelectedCycleId] = useState<number | ''>(report?.progressReportPeriodId ?? initialCycle?.id ?? '')
  const [values, setValues] = useState<CreateReport>(() => ({
    reportType: report?.reportType ?? 'WEEKLY',
    periodStart: report?.periodStart ?? initialCycle?.periodStart.slice(0, 10) ?? initialDraft?.report?.periodStart ?? '',
    periodEnd: report?.periodEnd ?? initialCycle?.periodEnd.slice(0, 10) ?? initialDraft?.report?.periodEnd ?? '',
    progressReportPeriodId: report?.progressReportPeriodId ?? initialCycle?.id ?? null,
    summary: report?.summary ?? initialDraft?.description ?? '',
    completedWork: report?.completedWork ?? initialDraft?.report?.completedWork ?? '',
    inProgressWork: report?.inProgressWork ?? initialDraft?.report?.inProgressWork ?? '',
    blockers: report?.blockers ?? initialDraft?.report?.blockers ?? '',
    risks: report?.risks ?? initialDraft?.report?.risks ?? '',
    nextActions: report?.nextActions ?? initialDraft?.report?.nextActions ?? '',
    plannedWork: report?.plannedWork ?? initialDraft?.report?.plannedWork ?? '',
    issuesAndRisks: report?.issuesAndRisks ?? '',
  }))
  const [dirty, setDirty] = useState(false)
  const [validation, setValidation] = useState('')
  const [renderedAt] = useState(Date.now)
  const [prefillLoading, setPrefillLoading] = useState(false)
  const [suggestedKeys, setSuggestedKeys] = useState<Array<keyof ProgressReportPrefill['suggested']>>([])
  const suggestedKeysRef = useRef<Array<keyof ProgressReportPrefill['suggested']>>([])
  const touchedKeys = useRef(new Set<keyof ProgressReportPrefill['suggested']>(
    (['summary', 'completedWork', 'inProgressWork', 'blockers', 'risks', 'nextActions'] as const)
      .filter(key => Boolean(key === 'summary' ? initialDraft?.description : initialDraft?.report?.[key])),
  ))
  const prefillController = useRef<AbortController | null>(null)
  const prefillTimer = useRef<number | null>(null)
  const dismissedSuggestions = useRef(false)

  const requestPrefill = useCallback((periodId?: number) => {
    prefillController.current?.abort()
    if (prefillTimer.current !== null) window.clearTimeout(prefillTimer.current)
    if (dismissedSuggestions.current) return
    if (suggestedKeysRef.current.length) {
      const oldKeys = suggestedKeysRef.current
      setValues(current => {
        const next = { ...current }
        oldKeys.forEach(key => { if (!touchedKeys.current.has(key)) next[key] = '' })
        return next
      })
      suggestedKeysRef.current = []
      setSuggestedKeys([])
    }
    const controller = new AbortController()
    prefillController.current = controller
    setPrefillLoading(true)
    prefillTimer.current = window.setTimeout(() => {
      controller.abort()
      setPrefillLoading(false)
    }, 2000)
    void getProgressReportPrefill(projectId, periodId, controller.signal).then(prefill => {
      if (controller.signal.aborted) return
      const nextKeys = (['summary', 'completedWork', 'inProgressWork', 'blockers', 'risks', 'nextActions'] as const)
        .filter(key => !touchedKeys.current.has(key) && Boolean(prefill.suggested[key]))
      setValues(current => {
        const next = { ...current }
        nextKeys.forEach(key => { next[key] = prefill.suggested[key] ?? '' })
        return next
      })
      setSuggestedKeys(nextKeys)
      suggestedKeysRef.current = nextKeys
      if (nextKeys.length) onDirtyChange(true)
    }).catch(() => {
      // Suggestions are optional. The editor remains available without an error banner.
    }).finally(() => {
      if (prefillController.current !== controller) return
      if (prefillTimer.current !== null) window.clearTimeout(prefillTimer.current)
      prefillTimer.current = null
      if (!controller.signal.aborted) setPrefillLoading(false)
    })
  }, [projectId, onDirtyChange])

  useEffect(() => {
    if (!report) requestPrefill(initialCycleId)
    return () => {
      prefillController.current?.abort()
      if (prefillTimer.current !== null) window.clearTimeout(prefillTimer.current)
    }
  }, [report, requestPrefill, initialCycleId])

  function update(key: keyof CreateReport, value: string) {
    if (key in { summary: true, completedWork: true, inProgressWork: true, blockers: true, risks: true, nextActions: true }) {
      const suggestedKey = key as keyof ProgressReportPrefill['suggested']
      touchedKeys.current.add(suggestedKey)
      setSuggestedKeys(current => current.filter(item => item !== suggestedKey))
      suggestedKeysRef.current = suggestedKeysRef.current.filter(item => item !== suggestedKey)
    }
    setValues((current) => ({ ...current, [key]: value }))
    setDirty(true)
    onDirtyChange(true)
    setValidation('')
  }

  function handleSelectCycle(cycleId: number | '') {
    setSelectedCycleId(cycleId)
    setValidation('')
    if (!cycleId) {
      setValues((current) => ({
        ...current,
        progressReportPeriodId: null,
      }))
      return
    }
    const cycle = cycles?.find((c) => c.id === cycleId)
    if (cycle) {
      if (!report) requestPrefill(cycle.id)
      setValues((current) => ({
        ...current,
        reportType: cycle.reportType as ReportType,
        periodStart: cycle.periodStart.slice(0, 10),
        periodEnd: cycle.periodEnd.slice(0, 10),
        progressReportPeriodId: cycle.id,
      }))
      setDirty(true)
      onDirtyChange(true)
    }
  }

  function clearSuggestions() {
    dismissedSuggestions.current = true
    prefillController.current?.abort()
    if (prefillTimer.current !== null) window.clearTimeout(prefillTimer.current)
    setPrefillLoading(false)
    setValues(current => {
      const next = { ...current }
      suggestedKeys.forEach(key => { next[key] = '' })
      return next
    })
    setSuggestedKeys([])
    suggestedKeysRef.current = []
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!values.summary.trim()) {
      setValidation('Vui lòng nhập tóm tắt tiến độ.')
      return
    }
    if (cycles && cycles.length > 0 && !values.progressReportPeriodId && !report) {
      setValidation('Vui lòng chọn kỳ báo cáo trước khi lưu.')
      return
    }
    if (!values.periodStart || !values.periodEnd || values.periodEnd < values.periodStart) {
      setValidation('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.')
      return
    }
    const payload: CreateReport = {
      reportType: values.reportType,
      periodStart: values.periodStart,
      periodEnd: values.periodEnd,
      progressReportPeriodId: values.progressReportPeriodId ?? null,
      summary: values.summary.trim(),
      completedWork: values.completedWork?.trim() || null,
      inProgressWork: values.inProgressWork?.trim() || null,
      blockers: values.blockers?.trim() || null,
      risks: values.risks?.trim() || null,
      nextActions: values.nextActions?.trim() || null,
      plannedWork: values.plannedWork?.trim() || null,
      issuesAndRisks: report?.issuesAndRisks !== undefined ? values.issuesAndRisks?.trim() || null : undefined,
    }
    await onSave(payload)
  }

  const selectedCycle = cycles?.find((c) => c.id === Number(selectedCycleId))
  const isSelectedCycleOverdue = selectedCycle ? renderedAt > utcTimestamp(selectedCycle.deadline) : false
  const missing = missingSubmissionFields(values)
  const canChooseCycle = !report || !report.progressReportPeriodId

  // Empty state when there are explicitly no cycles available for new report creation
  if (!report && cycles && cycles.length === 0) {
    return (
      <div className="report-panel report-empty" role="status">
        <span className="material-symbols-outlined" aria-hidden="true">event_busy</span>
        <h3>Chưa có kỳ báo cáo</h3>
        <p>Đồ án chưa có kỳ báo cáo. GVHD hoặc bộ môn cần tạo lịch báo cáo trước.</p>
      </div>
    )
  }

  return (
    <form className="report-panel report-editor" onSubmit={(event) => void save(event)}>
      <div className="report-section-heading">
        <h2>{report ? 'Nội dung bản nháp' : 'Soạn báo cáo mới'}</h2>
        <span>{dirty ? 'Có thay đổi chưa lưu' : 'Bản nháp'}</span>
      </div>

      {!report && prefillLoading && <p role="status" className="report-help">Đang lấy gợi ý từ dữ liệu dự án…</p>}
      {!report && suggestedKeys.length > 0 && <div className="report-prefill-note" role="note"><p>Gợi ý từ dữ liệu dự án — hãy kiểm tra và sửa trước khi nộp.</p><button className="report-button report-button--secondary" type="button" onClick={clearSuggestions}>Bỏ gợi ý, nhập lại từ đầu</button></div>}
      {initialDraft && !report && <p role="status" className="report-help">Đã điền bản nháp AI. Kiểm tra nội dung và kỳ báo cáo trước khi lưu; báo cáo chưa được nộp.</p>}
      <fieldset disabled={busy}>
        {/* Cycle selection when creating a new report */}
        {canChooseCycle && cycles && cycles.length > 0 ? (
          <div className="report-cycle-selection">
            <label htmlFor="report-cycle-select" className="report-cycle-label">
              <span><b>Chọn kỳ báo cáo</b> *</span>
              <small>Mỗi kỳ báo cáo chỉ tạo một bản báo cáo. Thông tin kỳ sẽ được điền tự động.</small>
              <select
                id="report-cycle-select"
                required
                value={selectedCycleId}
                aria-invalid={fieldErrors?.progressReportPeriodId ? true : undefined}
                aria-describedby={fieldErrors?.progressReportPeriodId ? 'report-cycle-error' : undefined}
                onChange={(event) => handleSelectCycle(event.target.value ? Number(event.target.value) : '')}
              >
                <option value="">-- Chọn một kỳ báo cáo --</option>
                {cycles.map((cycle) => {
                  const existing = existingReports.find(
                    (r) =>
                      r.progressReportPeriodId === cycle.id ||
                      (r.reportType === cycle.reportType &&
                        r.periodStart.slice(0, 10) === cycle.periodStart.slice(0, 10) &&
                        r.periodEnd.slice(0, 10) === cycle.periodEnd.slice(0, 10))
                  )
                  const label = `[${cycle.reportType === 'WEEKLY' ? 'Tuần' : 'Tháng'}] ${formatReportDate(cycle.periodStart)} – ${formatReportDate(cycle.periodEnd)} (Hạn: ${formatReportDate(cycle.deadline)})${existing ? ' — Đã có báo cáo' : ''}`
                  return (
                    <option key={cycle.id} value={cycle.id} disabled={Boolean(existing)}>
                      {label}
                    </option>
                  )
                })}
              </select>
              {fieldErrors?.progressReportPeriodId && <small id="report-cycle-error" role="alert" className="report-validation">{fieldErrors.progressReportPeriodId}</small>}
            </label>

            {selectedCycle && (
              <div className="report-cycle-summary">
                <p>
                  <strong>Kỳ đã chọn:</strong> {selectedCycle.reportType === 'WEEKLY' ? 'Báo cáo tuần' : 'Báo cáo tháng'} (
                  {formatReportDate(selectedCycle.periodStart)} – {formatReportDate(selectedCycle.periodEnd)}) • Hạn nộp:{' '}
                  {formatReportDate(selectedCycle.deadline)}
                </p>
                {isSelectedCycleOverdue && selectedCycle.latePolicy === 'BLOCK' && (
                  <p role="alert" className="report-validation text-danger-text">
                    Kỳ này đã qua hạn nộp ({formatReportDate(selectedCycle.deadline)}) và áp dụng chính sách chặn nộp muộn.
                  </p>
                )}
                {isSelectedCycleOverdue && selectedCycle.latePolicy === 'FLAG' && (
                  <p role="status" className="report-help text-status-warning-text">
                    Kỳ này đã qua hạn nộp ({formatReportDate(selectedCycle.deadline)}). Báo cáo nộp sau hạn sẽ được ghi nhận là nộp muộn.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Fallback period fields for existing reports or tests without cycle mock */
          <div className="report-period-fields">
            <label>
              Loại báo cáo
              <select
                value={values.reportType}
                disabled={Boolean(report)}
                onChange={(event) => update('reportType', event.target.value as ReportType)}
              >
                <option value="WEEKLY">Báo cáo tuần</option>
                <option value="MONTHLY">Báo cáo tháng</option>
              </select>
            </label>
            <label>
              Từ ngày
              <input
                type="date"
                required
                value={values.periodStart}
                aria-invalid={fieldErrors?.periodStart ? true : undefined}
                aria-describedby={fieldErrors?.periodStart ? 'report-period-start-error' : undefined}
                disabled={Boolean(report)}
                onChange={(event) => update('periodStart', event.target.value)}
              />
              {fieldErrors?.periodStart && <small id="report-period-start-error" role="alert" className="report-validation">{fieldErrors.periodStart}</small>}
            </label>
            <label>
              Đến ngày
              <input
                type="date"
                required
                min={values.periodStart || undefined}
                value={values.periodEnd}
                aria-invalid={fieldErrors?.periodEnd ? true : undefined}
                aria-describedby={fieldErrors?.periodEnd ? 'report-period-end-error' : undefined}
                disabled={Boolean(report)}
                onChange={(event) => update('periodEnd', event.target.value)}
              />
              {fieldErrors?.periodEnd && <small id="report-period-end-error" role="alert" className="report-validation">{fieldErrors.periodEnd}</small>}
            </label>
          </div>
        )}

        {report && <p className="report-help">Loại và kỳ báo cáo được cố định sau khi tạo.</p>}
        {report && !report.progressReportPeriodId && cycles?.length === 0 && <p role="status" className="report-help">Chưa có kỳ báo cáo khớp loại và thời gian của bản nháp. Bộ môn cần bổ sung lịch tương ứng trước khi bạn có thể gắn kỳ và nộp.</p>}

        {/* 7 form input fields organized in 4 progressive disclosure groups (DECISIONS.md Q4) */}
        {formSections.map((section) => (
          <div key={section.group} className="report-form-group">
            <h3 className="report-form-group-title">{section.group}</h3>
            {section.fields.map(({ key, label, hint, required, rows }) => (
              <label className="report-content-field" key={key} htmlFor={`report-${key}`}>
                <span>
                  <b>{label}</b>
                  {required && <span aria-hidden="true" className="text-danger-text"> *</span>}
                </span>
                <small id={`hint-${key}`}>{hint}</small>
                <textarea
                  id={`report-${key}`}
                  required={required}
                  rows={rows}
                  aria-invalid={fieldErrors?.[key] ? true : undefined}
                  aria-describedby={`hint-${key}${fieldErrors?.[key] ? ` error-${key}` : ''}`}
                  className={suggestedKeys.includes(key as keyof ProgressReportPrefill['suggested']) ? 'report-suggested-field' : undefined}
                  disabled={prefillLoading}
                  value={values[key] ?? ''}
                  onChange={(event) => update(key, event.target.value)}
                />
                {fieldErrors?.[key] && <small id={`error-${key}`} role="alert" className="report-validation">{fieldErrors[key]}</small>}
              </label>
            ))}
          </div>
        ))}

        {/* Preserve legacy content while editing the seven current fields. */}
        {report?.issuesAndRisks && (
          <label className="report-content-field" htmlFor="report-issuesAndRisks">
            <span>
              <b>Khó khăn & rủi ro</b> (Trường cũ, đã thay bằng Vướng mắc và Rủi ro)
            </span>
            <small id="hint-issuesAndRisks">Trường cũ, đã thay bằng Vướng mắc và Rủi ro.</small>
            <textarea
              id="report-issuesAndRisks"
              rows={3}
              aria-describedby="hint-issuesAndRisks"
              value={values.issuesAndRisks ?? ''}
              readOnly
            />
          </label>
        )}

        {validation && <p role="alert" className="report-validation">{validation}</p>}

        <div className="report-editor-footer">
          <p>
            {missing.length
              ? `Cần hoàn thiện ${missing.length} mục trước khi nộp. Bạn vẫn có thể lưu nháp.`
              : 'Đã có đủ các mục nội dung để trưởng nhóm nộp.'}
          </p>
          <button className="report-button" type="submit">
            {busy ? 'Đang lưu…' : report ? 'Lưu thay đổi' : 'Lưu bản nháp'}
          </button>
        </div>
      </fieldset>
    </form>
  )
}
