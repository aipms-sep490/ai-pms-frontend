import { getReviewDetail } from '../projects/api/project-review-api'
import { useAuthSession } from '../auth/context/useAuthSession'
import { getAcademicHierarchy } from '../academic/api/academic-api'
import { getProjectPeriods } from '../academic/api/governance-api'
import { readAllPages } from '../../services/api/paged-read'
import { getProjects } from '../../services/api/projects.api'
import { useContext, useEffect, useState } from 'react'
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
  const { session } = useAuthSession()
  const [availableMajors, setMajors] = useState<Array<{ id: number; name: string; code: string }>>([])
  const [availablePeriods, setPeriods] = useState<Array<{ id: number; name: string; code: string; periodType: string }>>([])
  const [availableProjects, setProjects] = useState<Array<{ id: number; title: string; code: string }>>([])
  const [catalogError, setCatalogError] = useState('')
  useEffect(() => {
    let active = true
    if (!session) return
    void Promise.all([getAcademicHierarchy(session.accessToken, { search: '', includeInactive: false }), readAllPages(page => getProjectPeriods(session.accessToken, { search: '' }, undefined, page)), readAllPages(page => getProjects({ page, pageSize: 100 }))]).then(([hierarchy, periods, projects]) => {
      if (!active) return
      setMajors(hierarchy.flatMap(o => o.departments).filter(d => !currentDepartment || d.department.id === currentDepartment.id).flatMap(d => d.majors))
      setPeriods(periods.filter(p => p.periodType === 'EVALUATION' || p.periodType === 'FINAL_SUBMISSION'))
      setProjects(projects)
    }).catch(() => { if (active) setCatalogError('Chưa tải được danh sách ngành và kỳ. Hãy tải lại trang.') })
    return () => { active = false }
  }, [session, currentDepartment])

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
  const [students, setStudents] = useState<Array<{ userId: number; fullName: string }>>([])
  useEffect(() => {
    let active = true
    setStudents([])
    setTargetRows(current => current.map(row => ({ ...row, studentId: '' })))
    if (applyProjectId && session) void getReviewDetail(Number(applyProjectId), session.accessToken).then(review => {
      if (active) setStudents(review.latestSubmission?.evidence.members ?? [])
    }).catch(() => { if (active) setApplyError('Chưa tải được danh sách sinh viên của đồ án. Hãy chọn lại đồ án.') })
    return () => { active = false }
  }, [applyProjectId, session])
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
      setCreateSuccess(`Đã tạo thành công template "${created.name}" (phiên bản v${created.version}).`)
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
      setApplySuccess(`Đã áp dụng checklist cho đồ án. Tổng số hạng mục: ${result.items.length}.`)
    } catch (reason) {
      if (reason instanceof HttpError) {
        setApplyError(reason.message?.includes('checklist is applied once')
          ? 'Đồ án này đã được áp checklist COLD. Mỗi đồ án chỉ áp dụng một lần; phạm vi và hạn nộp đã được khóa.'
          : reason.message || `Lỗi ${reason.status}: Không thể áp checklist.`)
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
                      [{m.code}] {m.name} 
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
                        [{p.periodType}] {p.name}  {isEligible ? '— [Hợp lệ cho COLD]' : '— [Chỉ đọc/Khác]'}
                      </option>
                    )
                  })}
                </select>
              </div>
            )}
          </div>
        )}
      </section>

      {catalogError && <p role="alert">{catalogError}</p>}
      {/* KHUÔN 1: Tra cứu & Danh sách Templates */}
      <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
          <div>
            <h2 className="text-base font-bold text-ink">Khuôn 1: Tra cứu template đã có</h2>
            <p className="text-xs text-ink-muted">Chọn ngành và kỳ đồ án để xem các bộ template đã được tạo.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
          <label className="text-sm font-semibold text-ink-soft">
            Ngành áp dụng
            <select className="mt-1 block w-full rounded-lg border border-hairline bg-card p-2 text-sm" value={majorId} onChange={(event) => setMajorId(event.target.value)}><option value="">-- Chọn ngành --</option>{availableMajors.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.code})</option> )}</select>
          </label>

          <label className="text-sm font-semibold text-ink-soft">
            Kỳ đồ án áp dụng
            <select className="mt-1 block w-full rounded-lg border border-hairline bg-card p-2 text-sm" value={projectPeriodId} onChange={(event) => setProjectPeriodId(event.target.value)}><option value="">-- Chọn kỳ đồ án --</option>{availablePeriods.filter(p => p.periodType === 'EVALUATION' || p.periodType === 'FINAL_SUBMISSION').map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option> )}</select>
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
            Đồ án áp dụng
            <select className="mt-1 block w-full rounded-lg border border-hairline bg-card p-2 text-sm" value={applyProjectId} onChange={(e) => setApplyProjectId(e.target.value)}><option value="">-- Chọn đồ án --</option>{availableProjects.map(p => <option key={p.id} value={p.id}>{p.title} ({p.code})</option>)}</select>
          </label>
          <label className="text-sm font-semibold text-ink-soft">
            Kỳ áp dụng
            <select className="mt-1 block w-full rounded-lg border border-hairline bg-card p-2 text-sm" value={applyPeriodId || projectPeriodId} onChange={(e) => setApplyPeriodId(e.target.value)}><option value="">-- Chọn kỳ --</option>{availablePeriods.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}</select>
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
              <select className="min-w-56 rounded-md border border-hairline bg-card p-1.5 text-sm" value={target.templateId} onChange={(e) => updateTargetRow(idx, { templateId: e.target.value })}><option value="">-- Chọn template --</option>{(templates ?? []).map(t => <option key={t.id} value={t.id}>{t.name} (v{t.version})</option>)}</select>
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
                <select aria-label="Sinh viên được áp dụng" className="rounded-md border border-hairline bg-card p-1.5 text-sm" value={target.studentId} onChange={(e) => updateTargetRow(idx, { studentId: e.target.value })}><option value="">-- Chọn sinh viên --</option>{students.map(student => <option key={student.userId} value={student.userId}>{student.fullName}</option>)}</select>
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
