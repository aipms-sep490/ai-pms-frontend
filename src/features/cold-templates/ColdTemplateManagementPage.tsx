import { useContext, useState } from 'react'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { HttpError } from '../../services/http/http-client'
import { createColdTemplate, getColdTemplateItExample, getColdTemplates } from '../../services/api/cold-templates.api'
import type { ColdReportInput, ColdTemplate } from '../../services/api/cold-templates.api'
import { applyColdChecklist } from '../../services/api/cold.api'
import type { ColdTemplateTarget } from '../../services/api/cold.api'
import { AcademicWorkflowContext } from '../../app/context/academic-workflow-context'

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
    if (reason.status === 403) return 'Bạn chỉ được tạo template cho ngành/khoa của mình (yêu cầu đúng ngành của Khoa và kỳ EVALUATION hoặc FINAL_SUBMISSION).'
    if (reason.status === 400 || reason.status === 422) return 'Dữ liệu chưa hợp lệ. Cần ít nhất 1 report, mã report phải viết HOA chữ cái ASCII (A-Z, 0-9, _) tối đa 30 ký tự.'
  }
  return 'Không thể kết nối. Hãy thử lại.'
}

export function ColdTemplateManagementPage() {
  const academicContext = useContext(AcademicWorkflowContext)
  const currentDepartment = academicContext?.academic?.departments?.[0]
  const availableMajors = academicContext?.academic?.majors ?? []
  const availablePeriods = academicContext?.academic?.periods ?? []

  const [majorId, setMajorId] = useState('')
  const [projectPeriodId, setProjectPeriodId] = useState('')
  const [templates, setTemplates] = useState<ColdTemplate[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState('')

  const [name, setName] = useState('')
  const [rows, setRows] = useState<ReportRow[]>([emptyRow()])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  // Apply template to project state
  const [applyProjectId, setApplyProjectId] = useState('')
  const [applyPeriodId, setApplyPeriodId] = useState('')
  const [applyDeadline, setApplyDeadline] = useState('')
  const [targetRows, setTargetRows] = useState<TargetRow[]>([emptyTargetRow()])
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [applySuccess, setApplySuccess] = useState('')

  async function search() {
    const major = Number(majorId)
    const period = Number(projectPeriodId)
    if (!major || !period) return
    setLoading(true)
    setListError('')
    setTemplates(null)
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
    if (patch.code !== undefined) {
      patch.code = patch.code.toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 30)
    }
    setRows((current) => current.map((row, i) => i === index ? { ...row, ...patch } : row))
  }
  function addRow() { setRows((current) => [...current, emptyRow()]) }
  function removeRow(index: number) { setRows((current) => current.filter((_, i) => i !== index)) }

  async function loadItExample() {
    try {
      const example = await getColdTemplateItExample()
      setRows(example)
      setCreateError('')
    } catch {
      setCreateError('Không tải được mẫu IT. Hãy thử lại.')
    }
  }

  async function submitCreate() {
    const major = Number(majorId)
    const period = Number(projectPeriodId)
    const cleanRows = rows.filter((row) => row.code.trim() && row.name.trim())
    if (!major || !period || !name.trim() || cleanRows.length === 0) return
    setCreating(true)
    setCreateError('')
    setCreateSuccess('')
    try {
      const created = await createColdTemplate({ majorId: major, projectPeriodId: period, name: name.trim(), reports: cleanRows })
      setTemplates((current) => [created, ...(current ?? [])])
      setName('')
      setRows([emptyRow()])
      setCreateSuccess(`Đã tạo thành công template "${created.name}" (phiên bản v${created.version}) với ID #${created.id}.`)
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

    const validTargets: ColdTemplateTarget[] = []
    for (const r of targetRows) {
      const tId = Number(r.templateId)
      if (tId) {
        validTargets.push({
          templateId: tId,
          scope: r.scope,
          studentId: r.scope === 'INDIVIDUAL' && r.studentId ? Number(r.studentId) : null,
        })
      }
    }

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

  return (
    <WorkspacePage
      className="space-y-6"
      title="Bộ report chấm nguội theo ngành"
      eyebrow="COLD · QUẢN LÝ THEO NGÀNH VÀ KỲ ĐỒ ÁN"
      description="Mỗi ngành tự định nghĩa bộ report của mình theo từng kỳ đồ án (loại EVALUATION hoặc FINAL_SUBMISSION). Mỗi lần tạo là một phiên bản mới, bất biến."
    >
      {/* Thông tin ngữ cảnh khoa */}
      <section className="rounded-xl border border-hairline bg-card p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-ink">Quy tắc nghiệp vụ Cán bộ khoa (Department Staff)</h2>
            <p className="mt-1 text-xs text-ink-muted">
              {currentDepartment
                ? `Khoa hiện tại: ${currentDepartment.name} (${currentDepartment.code} · ID: #${currentDepartment.id})`
                : 'Chỉ cán bộ thuộc đúng Khoa mới có quyền tạo và áp dụng template cho các ngành của Khoa mình.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-md bg-subtle px-2.5 py-1 font-medium text-ink-soft">
              Kỳ hợp lệ: EVALUATION hoặc FINAL_SUBMISSION
            </span>
            <span className="rounded-md bg-subtle px-2.5 py-1 font-medium text-ink-soft">
              Mã report: In hoa ASCII (A-Z, 0-9, _)
            </span>
          </div>
        </div>

        {/* Dropdown gợi ý nhanh nếu có dữ liệu từ context */}
        {(availableMajors.length > 0 || availablePeriods.length > 0) && (
          <div className="mt-3 grid grid-cols-1 gap-3 border-t border-hairline pt-3 sm:grid-cols-2">
            {availableMajors.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-ink-soft">
                  Gợi ý chọn nhanh ngành thuộc khoa của bạn:
                </label>
                <select
                  className="mt-1 block w-full rounded-lg border border-hairline bg-canvas p-2 text-xs font-medium text-ink"
                  value={majorId}
                  onChange={(e) => setMajorId(e.target.value)}
                >
                  <option value="">-- Chọn ngành trực thuộc khoa --</option>
                  {availableMajors.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.code}] {m.name} (Mã ngành ID: #{m.id})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {availablePeriods.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-ink-soft">
                  Gợi ý chọn nhanh kỳ đồ án:
                </label>
                <select
                  className="mt-1 block w-full rounded-lg border border-hairline bg-canvas p-2 text-xs font-medium text-ink"
                  value={projectPeriodId}
                  onChange={(e) => setProjectPeriodId(e.target.value)}
                >
                  <option value="">-- Chọn kỳ đồ án --</option>
                  {availablePeriods.map((p) => {
                    const isEligible = p.periodType === 'EVALUATION' || p.periodType === 'FINAL_SUBMISSION'
                    return (
                      <option key={p.id} value={p.id}>
                        [{p.periodType}] {p.name} (#{p.id}) {isEligible ? '— [Hợp lệ cho COLD]' : '— [Chỉ đọc/Khác]'}
                      </option>
                    )
                  })}
                </select>
              </div>
            )}
          </div>
        )}
      </section>

      {/* KHUÔN 1: Tra cứu & Danh sách Templates */}
      <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
          <div>
            <h2 className="text-base font-bold text-ink">Khuôn 1: Tra cứu template đã có</h2>
            <p className="text-xs text-ink-muted">Nhập Mã ngành và Mã kỳ đồ án để xem các bộ template đã được tạo.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
          <label className="text-sm font-semibold text-ink-soft">
            Mã ngành
            <input
              type="number"
              className="mt-1 block w-full rounded-lg border border-hairline p-2 text-sm"
              placeholder="VD: 20002"
              value={majorId}
              onChange={(event) => setMajorId(event.target.value)}
            />
          </label>
          <label className="text-sm font-semibold text-ink-soft">
            Mã kỳ đồ án
            <input
              type="number"
              className="mt-1 block w-full rounded-lg border border-hairline p-2 text-sm"
              placeholder="VD: 20003"
              value={projectPeriodId}
              onChange={(event) => setProjectPeriodId(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
            disabled={loading || !majorId || !projectPeriodId}
            onClick={() => void search()}
          >
            {loading ? 'Đang tải…' : 'Tìm'}
          </button>
        </div>

        {loading && <p role="status" className="text-sm text-ink-muted">Đang tải danh sách template…</p>}
        {listError && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{listError}</p>}
        {templates && templates.length === 0 && (
          <p className="rounded-lg border border-hairline bg-subtle p-3 text-sm text-ink-muted">
            Chưa có template cho ngành/kỳ này.
          </p>
        )}
        {templates && templates.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Kết quả ({templates.length} template)
            </h3>
            <ul className="space-y-3">
              {templates.map((template) => (
                <li key={template.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-hairline bg-canvas p-4 transition-shadow hover:shadow-xs">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{template.name} (v{template.version})</p>
                      <span className="rounded-md bg-subtle px-2 py-0.5 font-mono text-xs text-ink-muted">ID: #{template.id}</span>
                      <span className="rounded-md bg-primary-subtle px-2 py-0.5 text-xs font-semibold text-primary">v{template.version}</span>
                    </div>
                    <ul className="space-y-1 text-xs text-ink-soft">
                      {template.reports.map((report) => (
                        <li key={report.code} className="flex items-center gap-2">
                          <code className="rounded bg-subtle px-1.5 py-0.5 font-semibold text-ink">{report.code}</code>
                          <span>— {report.name}</span>
                          {report.required && <span className="text-amber-700 font-medium">· Bắt buộc</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-subtle"
                    onClick={() => {
                      addTargetRow(String(template.id))
                      if (!applyPeriodId && projectPeriodId) setApplyPeriodId(projectPeriodId)
                    }}
                  >
                    + Chọn để áp dụng
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* KHUÔN 2: Tạo Template mới */}
      <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
          <div>
            <h2 className="text-base font-bold text-ink">Khuôn 2: Tạo template mới (phiên bản mới)</h2>
            <p className="text-xs text-ink-muted">
              Mỗi lần lưu sẽ tạo ra một phiên bản template mới bất biến cho Ngành & Kỳ đồ án đang chọn ở Khuôn 1.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-hairline bg-subtle px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-subtle"
            onClick={() => void loadItExample()}
          >
            Dùng mẫu IT (chỉ để tham khảo)
          </button>
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink-soft">
            Tên template
            <input
              className="mt-1 block w-full rounded-lg border border-hairline p-2 text-sm"
              placeholder="VD: Báo cáo chấm nguội chuyên ngành Kỹ thuật phần mềm"
              value={name}
              disabled={creating}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Danh sách các đầu mục báo cáo (Reports)</h3>
            <span className="text-xs text-ink-muted">Mã tự động chuyển thành IN HOA</span>
          </div>

          <div className="space-y-2">
            {rows.map((row, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2 rounded-lg border border-hairline bg-canvas p-2.5">
                <input
                  className="min-w-36 rounded-md border border-hairline p-2 text-sm font-mono uppercase"
                  placeholder="Mã report"
                  value={row.code}
                  disabled={creating}
                  onChange={(event) => updateRow(index, { code: event.target.value })}
                />
                <input
                  className="min-w-48 flex-1 rounded-md border border-hairline p-2 text-sm"
                  placeholder="Tên report"
                  value={row.name}
                  disabled={creating}
                  onChange={(event) => updateRow(index, { name: event.target.value })}
                />
                <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft px-2">
                  <input
                    type="checkbox"
                    checked={row.required}
                    disabled={creating}
                    onChange={(event) => updateRow(index, { required: event.target.checked })}
                  />
                  Bắt buộc
                </label>
                <button
                  type="button"
                  className="text-xs text-status-error-text hover:underline disabled:opacity-40"
                  disabled={creating || rows.length === 1}
                  onClick={() => removeRow(index)}
                >
                  Xóa
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:underline"
              disabled={creating}
              onClick={addRow}
            >
              + Thêm report
            </button>
            <button
              type="button"
              className="min-h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
              disabled={creating || !majorId || !projectPeriodId || !name.trim() || !rows.some((row) => row.code.trim() && row.name.trim())}
              onClick={() => void submitCreate()}
            >
              {creating ? 'Đang tạo…' : 'Tạo template'}
            </button>
          </div>
        </div>

        {createError && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{createError}</p>}
        {createSuccess && <p role="status" className="rounded-lg border border-status-success-border bg-status-success-bg p-3 text-sm text-status-success-text">{createSuccess}</p>}
      </section>

      {/* KHUÔN 3: Áp dụng template vào đồ án */}
      <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-4">
        <div className="border-b border-hairline pb-3">
          <h2 className="text-base font-bold text-ink">Khuôn 3: Áp dụng template vào đồ án (Khoa phân bổ checklist)</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Gán bộ checklist COLD vào đồ án cụ thể với phạm vi (Cả nhóm, Theo ngành hoặc Cá nhân) kèm thời hạn nộp báo cáo.
          </p>
        </div>

        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-800 leading-relaxed">
          <strong>⚠️ Lưu ý kiểm soát ngành:</strong> Tuyệt đối không tự ý áp dụng checklist IT cho sinh viên/đồ án thuộc ngành Marketing, Design hoặc các chuyên ngành khác. Mỗi ngành phải sử dụng đúng template của ngành mình.
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="text-sm font-semibold text-ink-soft">
            Mã đồ án (Project ID)
            <input
              type="number"
              className="mt-1 block w-full rounded-lg border border-hairline p-2 text-sm"
              value={applyProjectId}
              placeholder="VD: 101"
              onChange={(e) => setApplyProjectId(e.target.value)}
            />
          </label>
          <label className="text-sm font-semibold text-ink-soft">
            Mã kỳ áp dụng
            <input
              type="number"
              className="mt-1 block w-full rounded-lg border border-hairline p-2 text-sm"
              value={applyPeriodId || projectPeriodId}
              placeholder="VD: 20003"
              onChange={(e) => setApplyPeriodId(e.target.value)}
            />
          </label>
          <label className="text-sm font-semibold text-ink-soft">
            Hạn nộp báo cáo (Deadline)
            <input
              type="datetime-local"
              className="mt-1 block w-full rounded-lg border border-hairline p-2 text-sm"
              value={applyDeadline}
              onChange={(e) => setApplyDeadline(e.target.value)}
            />
          </label>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Danh sách target templates</h3>
          {targetRows.map((target, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2 rounded-lg border border-hairline bg-canvas p-2.5">
              <input
                type="number"
                placeholder="Template ID"
                className="w-32 rounded-md border border-hairline p-1.5 text-sm font-mono"
                value={target.templateId}
                onChange={(e) => updateTargetRow(idx, { templateId: e.target.value })}
              />
              <select
                className="rounded-md border border-hairline bg-canvas p-1.5 text-sm"
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
                  className="w-32 rounded-md border border-hairline p-1.5 text-sm font-mono"
                  value={target.studentId}
                  onChange={(e) => updateTargetRow(idx, { studentId: e.target.value })}
                />
              )}
              <button
                type="button"
                className="ml-auto text-xs text-status-error-text hover:underline"
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

        <div className="pt-2">
          <button
            type="button"
            disabled={applying || !applyProjectId || !applyDeadline || !targetRows.some((t) => t.templateId)}
            className="min-h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
            onClick={() => void submitApply()}
          >
            {applying ? 'Đang áp dụng…' : 'Áp dụng checklist vào đồ án'}
          </button>
        </div>

        {applyError && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{applyError}</p>}
        {applySuccess && <p role="status" className="rounded-lg border border-status-success-border bg-status-success-bg p-3 text-sm text-status-success-text">{applySuccess}</p>}
      </section>
    </WorkspacePage>
  )
}
