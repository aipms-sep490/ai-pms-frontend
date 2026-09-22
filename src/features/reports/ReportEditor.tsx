import { useState, type FormEvent } from 'react'
import { contentFields, missingSubmissionFields, type CreateReport, type ReportDetail, type ReportType } from './report-types'

export function ReportEditor({ report, busy, onSave, onDirtyChange }: {
  report?: ReportDetail; busy: boolean; onSave: (value: CreateReport) => Promise<void>; onDirtyChange: (dirty: boolean) => void
}) {
  const [values, setValues] = useState<CreateReport>(() => ({
    reportType: report?.reportType ?? 'WEEKLY', periodStart: report?.periodStart ?? '', periodEnd: report?.periodEnd ?? '',
    summary: report?.summary ?? '', completedWork: report?.completedWork ?? '', plannedWork: report?.plannedWork ?? '', issuesAndRisks: report?.issuesAndRisks ?? '',
  }))
  const [dirty, setDirty] = useState(false)
  const [validation, setValidation] = useState('')
  function update(key: keyof CreateReport, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
    setDirty(true); onDirtyChange(true); setValidation('')
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!values.summary.trim()) { setValidation('Vui lòng nhập tóm tắt tiến độ.'); return }
    if (!values.periodStart || !values.periodEnd || values.periodEnd < values.periodStart) { setValidation('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.'); return }
    await onSave({ ...values, summary: values.summary.trim(), completedWork: values.completedWork?.trim() || null, plannedWork: values.plannedWork?.trim() || null, issuesAndRisks: values.issuesAndRisks?.trim() || null })
  }
  const missing = missingSubmissionFields(values)
  return <form className="report-panel report-editor" onSubmit={(event) => void save(event)}>
    <div className="report-section-heading"><h2>{report ? 'Nội dung bản nháp' : 'Soạn báo cáo mới'}</h2><span>{dirty ? 'Có thay đổi chưa lưu' : 'Bản nháp'}</span></div>
    <fieldset disabled={busy}>
      <div className="report-period-fields">
        <label>Loại báo cáo<select value={values.reportType} disabled={Boolean(report)} onChange={(event) => update('reportType', event.target.value as ReportType)}><option value="WEEKLY">Báo cáo tuần</option><option value="MONTHLY">Báo cáo tháng</option></select></label>
        <label>Từ ngày<input type="date" required value={values.periodStart} disabled={Boolean(report)} onChange={(event) => update('periodStart', event.target.value)} /></label>
        <label>Đến ngày<input type="date" required min={values.periodStart || undefined} value={values.periodEnd} disabled={Boolean(report)} onChange={(event) => update('periodEnd', event.target.value)} /></label>
      </div>
      {report && <p className="report-help">Loại và kỳ báo cáo được cố định sau khi tạo.</p>}
      {contentFields.map(({ key, label, hint }, index) => <label className="report-content-field" key={key} htmlFor={`report-${key}`}><span><b>{String(index + 1).padStart(2, '0')}</b>{label}{key === 'summary' && <span aria-hidden="true"> *</span>}</span><small id={`hint-${key}`}>{hint}</small><textarea id={`report-${key}`} required={key === 'summary'} rows={key === 'summary' ? 3 : 4} aria-describedby={`hint-${key}`} value={values[key] ?? ''} onChange={(event) => update(key, event.target.value)} /></label>)}
      {validation && <p role="alert" className="report-validation">{validation}</p>}
      <div className="report-editor-footer"><p>{missing.length ? `Cần hoàn thiện ${missing.length}/4 mục trước khi nộp. Bạn vẫn có thể lưu nháp.` : 'Đã có đủ 4 mục nội dung để trưởng nhóm nộp.'}</p><button className="report-button" type="submit">{busy ? 'Đang lưu…' : report ? 'Lưu thay đổi' : 'Lưu bản nháp'}</button></div>
    </fieldset>
  </form>
}
