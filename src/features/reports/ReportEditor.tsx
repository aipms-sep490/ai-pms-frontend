import { useEffect, useState, type FormEvent } from 'react'
import {
  contentFields,
  formatReportDate,
  missingSubmissionFields,
  reportTypeLabels,
  type CreateReport,
  type ReportDetail,
  type ReportType,
} from './report-types'
import { getReportingCycles, type ReportingCycle } from '../projects/api/project-governance-api'

export function ReportEditor({
  projectId,
  report,
  busy,
  onSave,
  onDirtyChange,
}: {
  projectId?: number
  report?: ReportDetail
  busy: boolean
  onSave: (value: CreateReport) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
}) {
  const [cycles, setCycles] = useState<ReportingCycle[]>([])
  const [values, setValues] = useState<CreateReport>(() => ({
    reportType: report?.reportType ?? 'WEEKLY',
    periodStart: report?.periodStart ?? '',
    periodEnd: report?.periodEnd ?? '',
    progressReportPeriodId: report?.progressReportPeriodId ?? null,
    summary: report?.summary ?? '',
    completedWork: report?.completedWork ?? '',
    inProgressWork: report?.inProgressWork ?? '',
    blockers: report?.blockers ?? '',
    risks: report?.risks ?? '',
    nextActions: report?.nextActions ?? '',
    plannedWork: report?.plannedWork ?? '',
    issuesAndRisks: report?.issuesAndRisks ?? null,
  }))
  const [dirty, setDirty] = useState(false)
  const [validation, setValidation] = useState('')

  const pId = projectId ?? report?.projectId
  useEffect(() => {
    if (!pId) return
    let active = true
    getReportingCycles(pId)
      .then((res) => {
        if (active && res?.items) setCycles(res.items)
      })
      .catch(() => {
        // Fallback gracefully if reporting cycles endpoint is unavailable
      })
    return () => { active = false }
  }, [pId])

  function update(key: keyof CreateReport, value: unknown) {
    setValues((current) => ({ ...current, [key]: value }))
    setDirty(true)
    onDirtyChange(true)
    setValidation('')
  }

  function onCycleSelect(cycleIdStr: string) {
    if (!cycleIdStr) {
      update('progressReportPeriodId', null)
      return
    }
    const cycleId = Number(cycleIdStr)
    const selected = cycles.find((c) => c.id === cycleId)
    if (selected) {
      setValues((current) => ({
        ...current,
        progressReportPeriodId: selected.id,
        reportType: (selected.reportType === 'MONTHLY' ? 'MONTHLY' : 'WEEKLY') as ReportType,
        periodStart: selected.periodStart.slice(0, 10),
        periodEnd: selected.periodEnd.slice(0, 10),
      }))
      setDirty(true)
      onDirtyChange(true)
      setValidation('')
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!values.summary.trim()) {
      setValidation('Vui lòng nhập tóm tắt tiến độ.')
      return
    }
    if (!values.periodStart || !values.periodEnd || values.periodEnd < values.periodStart) {
      setValidation('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.')
      return
    }
    await onSave({
      ...values,
      summary: values.summary.trim(),
      completedWork: values.completedWork?.trim() || null,
      inProgressWork: values.inProgressWork?.trim() || null,
      blockers: values.blockers?.trim() || null,
      risks: values.risks?.trim() || null,
      nextActions: values.nextActions?.trim() || null,
      plannedWork: values.plannedWork?.trim() || null,
      issuesAndRisks: undefined, // Q4: never send legacy issuesAndRisks in new submissions
    })
  }

  const missing = missingSubmissionFields(values)

  return (
    <form className="report-panel report-editor" onSubmit={(event) => void save(event)}>
      <div className="report-section-heading">
        <h2>{report ? 'Nội dung bản nháp' : 'Soạn báo cáo mới'}</h2>
        <span>{dirty ? 'Có thay đổi chưa lưu' : 'Bản nháp'}</span>
      </div>
      <fieldset disabled={busy}>
        {cycles.length > 0 && (
          <div className="report-cycle-select-field mb-4">
            <label htmlFor="report-cycle-select" className="block text-sm font-medium mb-1">
              Kỳ báo cáo học vụ (Reporting Cycle)
            </label>
            <select
              id="report-cycle-select"
              className="w-full rounded-lg border border-hairline p-2.5 bg-surface text-ink text-sm"
              value={values.progressReportPeriodId ?? ''}
              disabled={Boolean(report && report.status !== 'DRAFT')}
              onChange={(e) => onCycleSelect(e.target.value)}
            >
              <option value="">-- Chọn kỳ báo cáo --</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {reportTypeLabels[c.reportType as ReportType] ?? c.reportType} (
                  {formatReportDate(c.periodStart)} – {formatReportDate(c.periodEnd)}) — Hạn:{' '}
                  {formatReportDate(c.deadline)}
                </option>
              ))}
            </select>
            {!values.progressReportPeriodId && (
              <small className="text-amber-600 block mt-1">
                * Báo cáo cần gắn với một kỳ báo cáo trước khi nộp.
              </small>
            )}
          </div>
        )}

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
              disabled={Boolean(report)}
              onChange={(event) => update('periodStart', event.target.value)}
            />
          </label>
          <label>
            Đến ngày
            <input
              type="date"
              required
              min={values.periodStart || undefined}
              value={values.periodEnd}
              disabled={Boolean(report)}
              onChange={(event) => update('periodEnd', event.target.value)}
            />
          </label>
        </div>
        {report && <p className="report-help">Loại và kỳ báo cáo được cố định sau khi tạo.</p>}

        {report?.issuesAndRisks && (
          <div className="report-legacy-field p-3 bg-amber-50/70 border border-amber-200 rounded-lg my-3">
            <span className="text-amber-800 font-semibold text-xs uppercase tracking-wide block mb-1">
              Khó khăn & rủi ro (Trường cũ, đã thay bằng Vướng mắc và Rủi ro)
            </span>
            <p className="text-sm text-ink-muted whitespace-pre-wrap">{report.issuesAndRisks}</p>
          </div>
        )}

        {contentFields.map(({ key, label, hint, required }, index) => (
          <label className="report-content-field" key={key} htmlFor={`report-${key}`}>
            <span>
              <b>{String(index + 1).padStart(2, '0')}</b>
              {label}
              {required && <span aria-hidden="true"> *</span>}
            </span>
            <small id={`hint-${key}`}>{hint}</small>
            <textarea
              id={`report-${key}`}
              required={required}
              rows={key === 'summary' ? 3 : 4}
              aria-describedby={`hint-${key}`}
              value={(values[key as keyof CreateReport] as string) ?? ''}
              onChange={(event) => update(key as keyof CreateReport, event.target.value)}
            />
          </label>
        ))}

        {validation && <p role="alert" className="report-validation">{validation}</p>}

        <div className="report-editor-footer">
          <p>
            {missing.length
              ? `Cần hoàn thiện: ${missing.join(', ')} trước khi nộp. Bạn vẫn có thể lưu nháp.`
              : 'Đã sẵn sàng để trưởng nhóm nộp cho GVHD.'}
          </p>
          <button className="report-button" type="submit">
            {busy ? 'Đang lưu…' : report ? 'Lưu thay đổi' : 'Lưu bản nháp'}
          </button>
        </div>
      </fieldset>
    </form>
  )
}
