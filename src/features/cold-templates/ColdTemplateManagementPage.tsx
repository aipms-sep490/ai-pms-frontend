import { useState } from 'react'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { HttpError } from '../../services/http/http-client'
import { createColdTemplate, getColdTemplateItExample, getColdTemplates } from '../../services/api/cold-templates.api'
import type { ColdReportInput, ColdTemplate } from '../../services/api/cold-templates.api'

type ReportRow = ColdReportInput

function emptyRow(): ReportRow {
  return { code: '', name: '', required: true }
}

function errorMessage(reason: unknown): string {
  if (reason instanceof HttpError) {
    if (reason.status === 403) return 'Bạn chỉ được tạo template cho ngành/khoa của mình.'
    if (reason.status === 400 || reason.status === 422) return 'Dữ liệu chưa hợp lệ. Cần ít nhất 1 report, mỗi report có mã và tên riêng.'
  }
  return 'Không thể kết nối. Hãy thử lại.'
}

export function ColdTemplateManagementPage() {
  const [majorId, setMajorId] = useState('')
  const [projectPeriodId, setProjectPeriodId] = useState('')
  const [templates, setTemplates] = useState<ColdTemplate[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState('')

  const [name, setName] = useState('')
  const [rows, setRows] = useState<ReportRow[]>([emptyRow()])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  async function search() {
    const major = Number(majorId); const period = Number(projectPeriodId)
    if (!major || !period) return
    setLoading(true); setListError(''); setTemplates(null)
    try {
      const result = await getColdTemplates(major, period, 1, 50)
      setTemplates(result.items)
    } catch (reason) {
      setListError(errorMessage(reason))
    } finally {
      setLoading(false)
    }
  }

  function updateRow(index: number, patch: Partial<ReportRow>) {
    setRows((current) => current.map((row, i) => i === index ? { ...row, ...patch } : row))
  }
  function addRow() { setRows((current) => [...current, emptyRow()]) }
  function removeRow(index: number) { setRows((current) => current.filter((_, i) => i !== index)) }

  async function loadItExample() {
    try {
      const example = await getColdTemplateItExample()
      setRows(example)
    } catch {
      setCreateError('Không tải được mẫu IT. Hãy thử lại.')
    }
  }

  async function submitCreate() {
    const major = Number(majorId); const period = Number(projectPeriodId)
    const cleanRows = rows.filter((row) => row.code.trim() && row.name.trim())
    if (!major || !period || !name.trim() || cleanRows.length === 0) return
    setCreating(true); setCreateError('')
    try {
      const created = await createColdTemplate({ majorId: major, projectPeriodId: period, name: name.trim(), reports: cleanRows })
      setTemplates((current) => [created, ...(current ?? [])])
      setName(''); setRows([emptyRow()])
    } catch (reason) {
      setCreateError(errorMessage(reason))
    } finally {
      setCreating(false)
    }
  }

  return <WorkspacePage className="space-y-5" title="Bộ report chấm nguội theo ngành" eyebrow="COLD · theo ngành, không dùng chung"
    description="Mỗi ngành tự định nghĩa bộ report của mình theo kỳ đồ án. Mẫu IT SEP490 chỉ là ví dụ, không áp đặt cho ngành khác. Mỗi lần tạo là một phiên bản mới, bất biến.">
    <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs">
      <h2 className="text-sm font-bold text-slate-900">Tìm template đã có</h2>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-sm text-slate-700">Mã ngành<input type="number" className="mt-1 block rounded-lg border border-hairline p-2 text-sm" value={majorId} onChange={(event) => setMajorId(event.target.value)} /></label>
        <label className="text-sm text-slate-700">Mã kỳ đồ án<input type="number" className="mt-1 block rounded-lg border border-hairline p-2 text-sm" value={projectPeriodId} onChange={(event) => setProjectPeriodId(event.target.value)} /></label>
        <button type="button" className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={loading || !majorId || !projectPeriodId} onClick={() => void search()}>Tìm</button>
      </div>
      {loading && <p role="status" className="mt-3 text-sm text-slate-600">Đang tải…</p>}
      {listError && <p role="alert" className="mt-3 text-sm text-status-error-text">{listError}</p>}
      {templates && templates.length === 0 && <p className="mt-3 text-sm text-slate-500">Chưa có template cho ngành/kỳ này.</p>}
      {templates && templates.length > 0 && <ul className="mt-3 space-y-3">
        {templates.map((template) => <li key={template.id} className="rounded-lg border border-hairline p-3">
          <p className="font-semibold text-slate-900">{template.name} (v{template.version})</p>
          <ul className="mt-1 space-y-0.5 text-sm text-slate-600">
            {template.reports.map((report) => <li key={report.code}>{report.code} — {report.name}{report.required ? ' · Bắt buộc' : ''}</li>)}
          </ul>
        </li>)}
      </ul>}
    </section>

    <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-900">Tạo template mới (phiên bản mới)</h2>
        <button type="button" className="min-h-9 text-sm font-semibold text-primary underline underline-offset-4" onClick={() => void loadItExample()}>Dùng mẫu IT (chỉ để tham khảo)</button>
      </div>
      <label className="mt-3 block text-sm text-slate-700">Tên template<input className="mt-1 block w-full rounded-lg border border-hairline p-2 text-sm" value={name} disabled={creating} onChange={(event) => setName(event.target.value)} /></label>
      <div className="mt-3 space-y-2">
        {rows.map((row, index) => <div key={index} className="flex flex-wrap items-center gap-2">
          <input className="min-w-32 rounded-lg border border-hairline p-2 text-sm" placeholder="Mã report" value={row.code} disabled={creating} onChange={(event) => updateRow(index, { code: event.target.value })} />
          <input className="min-w-48 flex-1 rounded-lg border border-hairline p-2 text-sm" placeholder="Tên report" value={row.name} disabled={creating} onChange={(event) => updateRow(index, { name: event.target.value })} />
          <label className="flex items-center gap-1 text-sm text-slate-700"><input type="checkbox" checked={row.required} disabled={creating} onChange={(event) => updateRow(index, { required: event.target.checked })} />Bắt buộc</label>
          <button type="button" className="min-h-9 text-sm text-status-error-text underline underline-offset-4 disabled:opacity-50" disabled={creating || rows.length === 1} onClick={() => removeRow(index)}>Xóa</button>
        </div>)}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button type="button" className="min-h-9 text-sm font-semibold text-primary underline underline-offset-4" disabled={creating} onClick={addRow}>+ Thêm report</button>
        <button type="button" className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={creating || !majorId || !projectPeriodId || !name.trim() || !rows.some((row) => row.code.trim() && row.name.trim())} onClick={() => void submitCreate()}>Tạo template</button>
      </div>
      {createError && <p role="alert" className="mt-3 text-sm text-status-error-text">{createError}</p>}
    </section>
  </WorkspacePage>
}
