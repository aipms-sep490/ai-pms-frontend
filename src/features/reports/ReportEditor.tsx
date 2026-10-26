import { useState, type FormEvent } from 'react'
import type { ReportingCycle } from '../../services/api/progress-reports.api'
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
  report,
  cycles,
  existingReports = [],
  busy,
  onSave,
  onDirtyChange,
}: {
  report?: ReportDetail
  cycles?: ReportingCycle[]
  existingReports?: ProgressReport[]
  busy: boolean
  onSave: (value: CreateReport) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
}) {
  const [selectedCycleId, setSelectedCycleId] = useState<number | ''>(report?.progressReportPeriodId ?? '')
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
    issuesAndRisks: report?.issuesAndRisks ?? '',
  }))
  const [dirty, setDirty] = useState(false)
  const [validation, setValidation] = useState('')
  const [renderedAt] = useState(Date.now)

  function update(key: keyof CreateReport, value: string) {
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

      <fieldset disabled={busy}>
        {/* Cycle selection when creating a new report */}
        {!report && cycles && cycles.length > 0 ? (
          <div className="report-cycle-selection">
            <label htmlFor="report-cycle-select" className="report-cycle-label">
              <span><b>Chọn kỳ báo cáo</b> *</span>
              <small>Mỗi kỳ báo cáo chỉ tạo một bản báo cáo. Thông tin kỳ sẽ được điền tự động.</small>
              <select
                id="report-cycle-select"
                required
                value={selectedCycleId}
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
            </label>

            {selectedCycle && (
              <div className="report-cycle-summary">
                <p>
                  <strong>Kỳ đã chọn:</strong> {selectedCycle.reportType === 'WEEKLY' ? 'Báo cáo tuần' : 'Báo cáo tháng'} (
                  {formatReportDate(selectedCycle.periodStart)} – {formatReportDate(selectedCycle.periodEnd)}) • Hạn nộp:{' '}
                  {formatReportDate(selectedCycle.deadline)}
                </p>
                {isSelectedCycleOverdue && selectedCycle.latePolicy === 'BLOCK' && (
                  <p role="alert" className="report-validation text-rose-700">
                    Kỳ này đã qua hạn nộp ({formatReportDate(selectedCycle.deadline)}) và áp dụng chính sách chặn nộp muộn.
                  </p>
                )}
                {isSelectedCycleOverdue && selectedCycle.latePolicy === 'FLAG' && (
                  <p role="status" className="report-help text-amber-700">
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
        )}

        {report && <p className="report-help">Loại và kỳ báo cáo được cố định sau khi tạo.</p>}

        {/* 7 form input fields organized in 4 progressive disclosure groups (DECISIONS.md Q4) */}
        {formSections.map((section) => (
          <div key={section.group} className="report-form-group">
            <h3 className="report-form-group-title">{section.group}</h3>
            {section.fields.map(({ key, label, hint, required, rows }) => (
              <label className="report-content-field" key={key} htmlFor={`report-${key}`}>
                <span>
                  <b>{label}</b>
                  {required && <span aria-hidden="true" className="text-red-500"> *</span>}
                </span>
                <small id={`hint-${key}`}>{hint}</small>
                <textarea
                  id={`report-${key}`}
                  required={required}
                  rows={rows}
                  aria-describedby={`hint-${key}`}
                  value={values[key] ?? ''}
                  onChange={(event) => update(key, event.target.value)}
                />
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
