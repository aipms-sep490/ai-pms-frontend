import { useState } from 'react'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { HttpError } from '../../services/http/http-client'
import { createColdTemplate, getColdTemplateItExample, getColdTemplates } from '../../services/api/cold-templates.api'
import type { ColdReportInput, ColdTemplate } from '../../services/api/cold-templates.api'
import { applyColdChecklist } from '../../services/api/cold.api'
import type { ColdTemplateTarget } from '../../services/api/cold.api'

type ReportRow = ColdReportInput

function emptyRow(): ReportRow {
  return { code: '', name: '', required: true }
}

interface TargetRow {
  templateId: string
  scope: 'COMMON' | 'MAJOR_SPECIFIC' | 'INDIVIDUAL'
  studentId: string
}

function emptyTargetRow(templateId = ''): TargetRow {
  return { templateId, scope: 'COMMON', studentId: '' }
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

  // Apply template to project state
  const [applyProjectId, setApplyProjectId] = useState('')
  const [applyPeriodId, setApplyPeriodId] = useState('')
  const [applyDeadline, setApplyDeadline] = useState('')
  const [targetRows, setTargetRows] = useState<TargetRow[]>([emptyTargetRow()])
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [applySuccess, setApplySuccess] = useState('')

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

  function updateTargetRow(index: number, patch: Partial<TargetRow>) {
    setTargetRows((current) => current.map((row, i) => i === index ? { ...row, ...patch } : row))
  }
  function addTargetRow(templateId = '') { setTargetRows((current) => [...current, emptyTargetRow(templateId)]) }
  function removeTargetRow(index: number) { setTargetRows((current) => current.filter((_, i) => i !== index)) }

  async function submitApply() {
    const pId = Number(applyProjectId)
    const period = Number(applyPeriodId || projectPeriodId)
    if (!pId || !period || !applyDeadline || targetRows.length === 0) return

    const validTargets: ColdTemplateTarget[] = targetRows.map((r) => {
      const tId = Number(r.templateId)
      if (!tId) return null
      return {
        templateId: tId,
        scope: r.scope,
        studentId: r.scope === 'INDIVIDUAL' && r.studentId ? Number(r.studentId) : null,
      }
    }).filter((t): t is ColdTemplateTarget => t !== null)

    if (validTargets.length === 0) {
      setApplyError('Vui lòng chọn ít nhất một template ID hợp lệ.')
      return
    }

    setApplying(true)
    setApplyError('')
    setApplySuccess('')
    try {
      const result = await applyColdChecklist(pId, {
        projectPeriodId: period,
        deadline: new Date(applyDeadline).toISOString(),
        targets: validTargets,
      })
      setApplySuccess(`Áp dụng checklist thành công cho đồ án #${pId} (ID checklist: ${result.id}, tổng ${result.items.length} mục)`)
    } catch (reason) {
      if (reason instanceof HttpError) {
        setApplyError(reason.message || `Lỗi ${reason.status}: Không thể áp checklist.`)
      } else {
        setApplyError('Không thể áp dụng checklist. Hãy kiểm tra thông tin.')
      }
    } finally {
      setApplying(false)
    }
  }

  return <WorkspacePage className="space-y-5" title="Bộ report chấm nguội theo ngành" eyebrow="COLD · theo ngành, không dùng chung"
    description="Mỗi ngành tự định nghĩa bộ report của mình theo kỳ đồ án. Mẫu IT SEP490 chỉ là ví dụ, không áp đặt cho ngành khác. Mỗi lần tạo là một phiên bản mới, bất biến.">
    <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs">
      <h2 className="text-sm font-bold text-ink">Tìm template đã có</h2>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-sm text-ink-soft">Mã ngành<input type="number" className="mt-1 block rounded-lg border border-hairline p-2 text-sm" value={majorId} onChange={(event) => setMajorId(event.target.value)} /></label>
        <label className="text-sm text-ink-soft">Mã kỳ đồ án<input type="number" className="mt-1 block rounded-lg border border-hairline p-2 text-sm" value={projectPeriodId} onChange={(event) => setProjectPeriodId(event.target.value)} /></label>
        <button type="button" className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={loading || !majorId || !projectPeriodId} onClick={() => void search()}>Tìm</button>
      </div>
      {loading && <p role="status" className="mt-3 text-sm text-ink-muted">Đang tải…</p>}
      {listError && <p role="alert" className="mt-3 text-sm text-status-error-text">{listError}</p>}
      {templates && templates.length === 0 && <p className="mt-3 text-sm text-ink-muted">Chưa có template cho ngành/kỳ này.</p>}
      {templates && templates.length > 0 && <ul className="mt-3 space-y-3">
        {templates.map((template) => <li key={template.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-hairline p-3">
          <div>
            <p className="font-semibold text-ink">{template.name} (v{template.version})</p>
            <ul className="mt-1 space-y-0.5 text-sm text-ink-muted">
              {template.reports.map((report) => <li key={report.code}>{report.code} — {report.name}{report.required ? ' · Bắt buộc' : ''}</li>)}
            </ul>
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-primary underline underline-offset-4"
            onClick={() => addTargetRow(String(template.id))}
          >
            + Chọn để áp dụng
          </button>
        </li>)}
      </ul>}
    </section>

    <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-ink">Tạo template mới (phiên bản mới)</h2>
        <button type="button" className="min-h-9 text-sm font-semibold text-primary underline underline-offset-4" onClick={() => void loadItExample()}>Dùng mẫu IT (chỉ để tham khảo)</button>
      </div>
      <label className="mt-3 block text-sm text-ink-soft">Tên template<input className="mt-1 block w-full rounded-lg border border-hairline p-2 text-sm" value={name} disabled={creating} onChange={(event) => setName(event.target.value)} /></label>
      <div className="mt-3 space-y-2">
        {rows.map((row, index) => <div key={index} className="flex flex-wrap items-center gap-2">
          <input className="min-w-32 rounded-lg border border-hairline p-2 text-sm" placeholder="Mã report" value={row.code} disabled={creating} onChange={(event) => updateRow(index, { code: event.target.value })} />
          <input className="min-w-48 flex-1 rounded-lg border border-hairline p-2 text-sm" placeholder="Tên report" value={row.name} disabled={creating} onChange={(event) => updateRow(index, { name: event.target.value })} />
          <label className="flex items-center gap-1 text-sm text-ink-soft"><input type="checkbox" checked={row.required} disabled={creating} onChange={(event) => updateRow(index, { required: event.target.checked })} />Bắt buộc</label>
          <button type="button" className="min-h-9 text-sm text-status-error-text underline underline-offset-4 disabled:opacity-50" disabled={creating || rows.length === 1} onClick={() => removeRow(index)}>Xóa</button>
        </div>)}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button type="button" className="min-h-9 text-sm font-semibold text-primary underline underline-offset-4" disabled={creating} onClick={addRow}>+ Thêm report</button>
        <button type="button" className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={creating || !majorId || !projectPeriodId || !name.trim() || !rows.some((row) => row.code.trim() && row.name.trim())} onClick={() => void submitCreate()}>Tạo template</button>
      </div>
      {createError && <p role="alert" className="mt-3 text-sm text-status-error-text">{createError}</p>}
    </section>

    {/* Section: Khoa áp dụng checklist vào đồ án */}
    <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-4">
      <div>
        <h2 className="text-sm font-bold text-ink">Áp dụng template vào đồ án (Khoa phân bổ checklist)</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Áp dụng bộ checklist COLD với phạm vi (Chung, Chuyên ngành, hoặc Từng cá nhân) và thời hạn nộp.
        </p>
      </div>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
        <strong>⚠️ Lưu ý kiểm soát ngành:</strong> Tuyệt đối không tự ý áp dụng checklist IT cho sinh viên/đồ án thuộc ngành Marketing, Design hoặc các chuyên ngành khác. Mỗi ngành phải sử dụng đúng template của ngành mình.
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-sm text-ink-soft">
          Mã đồ án (Project ID)
          <input
            type="number"
            className="mt-1 block w-full rounded-lg border border-hairline p-2 text-sm"
            value={applyProjectId}
            placeholder="vd: 101"
            onChange={(e) => setApplyProjectId(e.target.value)}
          />
        </label>
        <label className="text-sm text-ink-soft">
          Mã kỳ áp dụng
          <input
            type="number"
            className="mt-1 block w-full rounded-lg border border-hairline p-2 text-sm"
            value={applyPeriodId || projectPeriodId}
            placeholder="vd: 34"
            onChange={(e) => setApplyPeriodId(e.target.value)}
          />
        </label>
        <label className="text-sm text-ink-soft">
          Hạn nộp báo cáo (Deadline)
          <input
            type="datetime-local"
            className="mt-1 block w-full rounded-lg border border-hairline p-2 text-sm"
            value={applyDeadline}
            onChange={(e) => setApplyDeadline(e.target.value)}
          />
        </label>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-ink uppercase tracking-wide">Danh sách target templates</h3>
        {targetRows.map((target, idx) => (
          <div key={idx} className="flex flex-wrap items-center gap-2 rounded-lg border border-hairline p-2 bg-subtle">
            <input
              type="number"
              placeholder="Template ID"
              className="w-28 rounded-md border border-hairline p-1.5 text-sm"
              value={target.templateId}
              onChange={(e) => updateTargetRow(idx, { templateId: e.target.value })}
            />
            <select
              className="rounded-md border border-hairline p-1.5 text-sm"
              value={target.scope}
              onChange={(e) => updateTargetRow(idx, { scope: e.target.value as TargetRow['scope'] })}
            >
              <option value="COMMON">COMMON (Cả nhóm)</option>
              <option value="MAJOR_SPECIFIC">MAJOR_SPECIFIC (Theo ngành)</option>
              <option value="INDIVIDUAL">INDIVIDUAL (Cá nhân)</option>
            </select>
            {target.scope === 'INDIVIDUAL' && (
              <input
                type="number"
                placeholder="Student ID"
                className="w-28 rounded-md border border-hairline p-1.5 text-sm"
                value={target.studentId}
                onChange={(e) => updateTargetRow(idx, { studentId: e.target.value })}
              />
            )}
            <button
              type="button"
              className="text-xs text-status-error-text hover:underline ml-auto"
              disabled={targetRows.length === 1}
              onClick={() => removeTargetRow(idx)}
            >
              Xóa target
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-xs font-semibold text-primary hover:underline"
          onClick={() => addTargetRow()}
        >
          + Thêm target
        </button>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          disabled={applying || !applyProjectId || !applyDeadline || !targetRows.some((t) => t.templateId)}
          className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
          onClick={() => void submitApply()}
        >
          {applying ? 'Đang áp dụng…' : 'Áp dụng checklist vào đồ án'}
        </button>
      </div>

      {applyError && <p role="alert" className="text-sm text-status-error-text">{applyError}</p>}
      {applySuccess && <p role="status" className="text-sm text-status-success-text">{applySuccess}</p>}
    </section>
  </WorkspacePage>
}
