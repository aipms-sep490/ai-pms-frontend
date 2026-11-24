import { getReviewDetail } from '../projects/api/project-review-api'
import { useAuthSession } from '../auth/context/useAuthSession'
import { getAcademicHierarchy } from '../academic/api/academic-api'
import { getProjectPeriods } from '../academic/api/governance-api'
import { readAllPages } from '../../services/api/paged-read'
import { getProjects } from '../../services/api/projects.api'
import { useContext, useEffect, useMemo, useState } from 'react'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { ConfigModeFrame } from '../../components/ui/ConfigModeFrame'
import { StatTileRow } from '../../components/ui/StatTileRow'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Pagination } from '../../components/ui/Pagination'
import { useClientPagination } from '../../components/ui/useClientPagination'
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

function emptyTargetRow(template?: ColdTemplate): TargetRow {
  return { templateId: template ? String(template.id) : '', scope: template && template.majorId == null ? 'COMMON' : 'MAJOR_SPECIFIC', studentId: '' }
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
  const [templateScope, setTemplateScope] = useState<'COMMON' | 'MAJOR_SPECIFIC'>('MAJOR_SPECIFIC')
  const [projectPeriodId, setProjectPeriodId] = useState('')
  const [templates, setTemplates] = useState<ColdTemplate[] | null>(null)
  const [templateChoices, setTemplateChoices] = useState<ColdTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState('')

  const [name, setName] = useState('')
  const [rows, setRows] = useState<ReportRow[]>([emptyRow()])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')
  const [createMode, setCreateMode] = useState<'view' | 'edit'>('view')

  // Apply template to project state
  const [applyProjectId, setApplyProjectId] = useState('')
  const [students, setStudents] = useState<Array<{ userId: number; fullName: string }>>([])
  const [applyPeriodId, setApplyPeriodId] = useState('')
  const [applyDeadline, setApplyDeadline] = useState('')
  const [targetRows, setTargetRows] = useState<TargetRow[]>([emptyTargetRow()])
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [applySuccess, setApplySuccess] = useState('')

  useEffect(() => {
    if (!applyProjectId || !session) return
    let active = true
    void getReviewDetail(Number(applyProjectId), session.accessToken).then(review => {
      if (active) setStudents(review.latestSubmission?.evidence.members ?? [])
    }).catch(() => { if (active) setApplyError('Chưa tải được danh sách sinh viên của đồ án. Hãy chọn lại đồ án.') })
    return () => { active = false }
  }, [applyProjectId, session])

  async function search() {
    const major = templateScope === 'COMMON' ? null : Number(majorId)
    const period = Number(projectPeriodId)
    if ((templateScope === 'MAJOR_SPECIFIC' && !major) || !period) return
    setLoading(true)
    setListError('')
    setTemplates(null)
    try {
      const result = await getColdTemplates(major, period, 1, 50)
      setTemplates(result.items)
      setTemplateChoices(current => [...current.filter(item => item.projectPeriodId === period && !result.items.some(next => next.id === item.id)), ...result.items])
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
    const major = templateScope === 'COMMON' ? null : Number(majorId)
    const period = Number(projectPeriodId)
    const cleanRows = rows.filter((row) => row.code.trim() && row.name.trim())
    if ((templateScope === 'MAJOR_SPECIFIC' && !major) || !period || !name.trim() || cleanRows.length === 0) return
    setCreating(true)
    setCreateError('')
    setCreateSuccess('')
    try {
      const created = await createColdTemplate({ majorId: major, scope: templateScope, projectPeriodId: period, name: name.trim(), reports: cleanRows })
      setTemplates((current) => [created, ...(current ?? [])])
      setTemplateChoices(current => [...current.filter(item => item.id !== created.id && item.projectPeriodId === period), created])
      setName('')
      setRows([emptyRow()])
      setCreateMode('view')
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
  function addTargetRow(template?: ColdTemplate) { setTargetRows((current) => [...current, emptyTargetRow(template)]) }
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
    if (validTargets.some(target => !templateChoices.some(template => template.id === target.templateId
      && template.projectPeriodId === period && (template.majorId == null
        ? target.scope === 'COMMON' && target.studentId == null
        : target.scope === 'MAJOR_SPECIFIC' || target.scope === 'INDIVIDUAL' && !!target.studentId)))) {
      setApplyError('Chọn template đã tải đúng kỳ và đúng phạm vi chung, ngành hoặc cá nhân.')
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

  const templateList = useMemo(() => templates ?? [], [templates])
  const templatePagination = useClientPagination(templateList, 8)
  const filledReportCount = rows.filter((row) => row.code.trim() || row.name.trim()).length

  return (
    <WorkspacePage
      className="space-y-5 cold-template-page"
      title="Bộ report chấm nguội"
      eyebrow="CHẤM HỒ SƠ ĐÃ KHÓA · QUẢN LÝ THEO PHẠM VI VÀ KỲ ĐỒ ÁN"
      description="Tạo bộ báo cáo chung hoặc theo chuyên ngành cho kỳ Đánh giá hoặc Bàn giao cuối kỳ. Mỗi lần tạo là một phiên bản mới, bất biến."
    >
      <StatTileRow tiles={[
        {
          icon: 'inventory_2',
          label: 'Template tìm thấy',
          value: templates ? templates.length : templateChoices.length,
          caption: templates ? 'Kết quả trong kỳ đang tra cứu.' : 'Chọn phạm vi & kỳ để tra cứu.',
          hero: true,
        },
        {
          icon: 'school',
          label: 'Ngành quản lý',
          value: availableMajors.length,
          caption: currentDepartment ? `${currentDepartment.code} · #${currentDepartment.id}` : 'Phạm vi khoa hiện tại.',
          tone: 'info',
        },
        {
          icon: 'date_range',
          label: 'Kỳ áp dụng',
          value: availablePeriods.length,
          caption: 'Kỳ Đánh giá & Bàn giao cuối kỳ.',
          tone: 'success',
        },
        {
          icon: 'checklist',
          label: 'Đầu mục đang soạn',
          value: filledReportCount,
          caption: `${rows.length} dòng trong trình soạn mẫu.`,
          tone: 'warning',
        },
      ]} />

      {/* Thu gọn quy tắc nghiệp vụ để đẩy vùng thao tác lên ngay đầu màn hình */}
      <details className="rounded-xl border border-hairline bg-card shadow-xs">
        <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink hover:bg-canvas/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <span className="inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">policy</span>
            Quy tắc nghiệp vụ Cán bộ bộ môn
            {currentDepartment && (
              <span className="rounded-md border border-hairline bg-canvas px-2 py-0.5 font-mono text-xs font-semibold text-ink-soft">
                {currentDepartment.code}
              </span>
            )}
          </span>
          <span className="flex flex-wrap items-center gap-2 text-xs font-medium text-ink-muted">
            <span className="rounded-md border border-hairline bg-canvas px-2 py-0.5 text-ink-soft">
              Kỳ hợp lệ: Đánh giá / Bàn giao cuối kỳ
            </span>
            <span className="rounded-md border border-hairline bg-canvas px-2 py-0.5 text-ink-soft">
              Mã ASCII: A-Z, 0-9, _
            </span>
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">expand_more</span>
          </span>
        </summary>
        <div className="space-y-2 border-t border-hairline bg-canvas/50 px-4 py-3.5">
          <p className="text-xs leading-5 text-ink-muted">
            {currentDepartment
              ? `Khoa hiện tại: ${currentDepartment.name} (${currentDepartment.code} · ID: #${currentDepartment.id}). Chọn phạm vi, chuyên ngành và kỳ đồ án ngay tại Khuôn 1 để tra cứu hoặc tạo phiên bản mẫu mới.`
              : 'Chỉ cán bộ thuộc đúng Khoa mới có quyền tạo và áp dụng mẫu báo cáo cho các chuyên ngành của Khoa mình. Chọn phạm vi, chuyên ngành và kỳ đồ án tại Khuôn 1.'}
          </p>
        </div>
      </details>

      {catalogError && <p role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{catalogError}</p>}

      {/* BENTO 2 CỘT: Trái = Khuôn 1 (Tra cứu) + Khuôn 2 (Tạo mẫu) | Phải = Khuôn 3 (Áp dụng vào đồ án) */}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-7">
          {/* KHUÔN 1: Tra cứu & Danh sách Templates */}
          <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
              <div>
                <h2 className="text-base font-bold text-ink">Khuôn 1: Tra cứu template đã có</h2>
                <p className="text-xs text-ink-muted">Chọn phạm vi và kỳ đồ án để xem các bộ template đã được tạo.</p>
              </div>
              {templates && (
                <StatusBadge tone={templates.length > 0 ? 'info' : 'neutral'} label={`${templates.length} template`} />
              )}
            </header>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                <label className="text-sm font-semibold text-ink-soft">Phạm vi template
                  <select className="mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" value={templateScope} onChange={event => { setTemplateScope(event.target.value as 'COMMON' | 'MAJOR_SPECIFIC'); setTemplates(null) }}><option value="MAJOR_SPECIFIC">Theo ngành</option><option value="COMMON">Chung</option></select>
                </label>
                <label className="text-sm font-semibold text-ink-soft">
                  Ngành áp dụng
                  <select className="mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:bg-canvas disabled:text-ink-muted" value={majorId} disabled={templateScope === 'COMMON'} onChange={(event) => setMajorId(event.target.value)}><option value="">-- Chọn ngành --</option>{availableMajors.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.code})</option> )}</select>
                </label>

                <label className="text-sm font-semibold text-ink-soft">
                  Kỳ đồ án áp dụng
                  <select className="mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" value={projectPeriodId} onChange={(event) => { setProjectPeriodId(event.target.value); setTemplates(null); setTemplateChoices([]); setTargetRows([emptyTargetRow()]) }}><option value="">-- Chọn kỳ đồ án --</option>{availablePeriods.filter(p => p.periodType === 'EVALUATION' || p.periodType === 'FINAL_SUBMISSION').map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option> )}</select>
                </label>

                <button
                  type="button"
                  className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loading || (templateScope === 'MAJOR_SPECIFIC' && !majorId) || !projectPeriodId}
                  onClick={() => void search()}
                >
                  {loading ? 'Đang tải…' : 'Tìm'}
                </button>
              </div>

              {loading && <p role="status" className="text-sm text-ink-muted">Đang tải danh sách template…</p>}
              {listError && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{listError}</p>}
              {templates && templates.length === 0 && (
                <p className="rounded-lg border border-hairline bg-canvas p-3.5 text-sm text-ink-muted">
                  Chưa có template cho phạm vi/kỳ này.
                </p>
              )}
              {templates && templates.length > 0 && (
                <div className="space-y-3 pt-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Kết quả ({templates.length} template)
                  </h3>
                  <ul className="space-y-2.5">
                    {templatePagination.paginatedItems.map((template) => (
                      <li key={template.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-hairline bg-canvas p-4 transition-shadow hover:border-primary/40 hover:shadow-xs">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-ink">{template.name} (v{template.version})</p>
                            <span className="rounded-md border border-hairline bg-card px-2 py-0.5 font-mono text-xs text-ink-muted">Mã #{template.id}</span>
                            <StatusBadge tone={template.scope === 'COMMON' ? 'success' : 'neutral'} label={template.scope === 'COMMON' ? 'Chung toàn đồ án' : 'Theo chuyên ngành'} />
                          </div>
                          <ul className="space-y-1 text-xs text-ink-soft">
                            {template.reports.map((report) => (
                              <li key={report.code} className="flex flex-wrap items-center gap-2">
                                <code className="rounded border border-hairline bg-card px-1.5 py-0.5 font-semibold text-ink">{report.code}</code>
                                <span>— {report.name}</span>
                                {report.required && <span className="font-medium text-status-warning-text">· Bắt buộc</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <button
                          type="button"
                          className="inline-flex min-h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-primary bg-card px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          onClick={() => {
                            addTargetRow(template)
                            if (!applyPeriodId && projectPeriodId) setApplyPeriodId(projectPeriodId)
                          }}
                        >
                          + Chọn để áp dụng
                        </button>
                      </li>
                    ))}
                  </ul>
                  {templatePagination.showPagination && (
                    <Pagination
                      page={templatePagination.page}
                      pages={templatePagination.totalPages}
                      total={templatePagination.total}
                      pageSize={templatePagination.pageSize}
                      pageSizeOptions={[8, 16, 30]}
                      onPage={templatePagination.setPage}
                      onPageSizeChange={templatePagination.setPageSize}
                    />
                  )}
                </div>
              )}
            </div>
          </section>

          {/* KHUÔN 2: Tạo Template mới */}
          <ConfigModeFrame
            mode={createMode}
            dirty={Boolean(name || rows.length !== 1 || rows[0].code || rows[0].name || !rows[0].required)}
            busy={creating}
            onEdit={() => setCreateMode('edit')}
            onCancel={() => { setName(''); setRows([emptyRow()]); setCreateMode('view'); setCreateSuccess('Đã hủy các thay đổi.') }}
            onSave={() => void submitCreate()}
            saveLabel="Tạo template"
            saveDisabled={(templateScope === 'MAJOR_SPECIFIC' && !majorId) || !projectPeriodId || !name.trim() || !rows.some(row => row.code.trim() && row.name.trim())}
            navigationGuard={false}
            blastRadius="Mẫu mới tạo là một phiên bản bất biến trong phạm vi ngành và kỳ đồ án đang chọn. Checklist chỉ được áp dụng cho đồ án sau thao tác riêng ở Khuôn 3."
          >
            <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
                <div>
                  <h2 className="text-base font-bold text-ink">Khuôn 2: Tạo template mới (phiên bản mới)</h2>
                  <p className="text-xs text-ink-muted">
                    Mỗi lần lưu tạo một phiên bản bất biến cho phạm vi và kỳ đồ án đang chọn ở Khuôn 1.
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex min-h-9 items-center whitespace-nowrap rounded-lg border border-primary/20 bg-primary-subtle px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  onClick={() => void loadItExample()}
                >
                  Dùng mẫu IT (chỉ để tham khảo)
                </button>
              </header>

              <div className="space-y-4 p-5">
                <div>
                  <label className="block text-sm font-semibold text-ink-soft">
                    Tên template
                    <input
                      className="mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:bg-canvas disabled:text-ink-muted"
                      placeholder="VD: Báo cáo chấm nguội chuyên ngành Kỹ thuật phần mềm"
                      value={name}
                      disabled={creating}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Danh sách các đầu mục báo cáo (Reports)</h3>
                    <span className="text-xs text-ink-muted">Mã tự động chuyển thành IN HOA</span>
                  </div>

                  <div className="space-y-2">
                    {rows.map((row, index) => (
                      <div key={index} className="flex flex-wrap items-center gap-2.5 rounded-lg border border-hairline bg-canvas p-2.5">
                        <input
                          className="min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 font-mono text-sm uppercase text-ink sm:w-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:bg-canvas disabled:text-ink-muted"
                          placeholder="Mã report"
                          value={row.code}
                          disabled={creating}
                          onChange={(event) => updateRow(index, { code: event.target.value })}
                        />
                        <input
                          className="min-h-11 min-w-44 flex-1 rounded-lg border border-hairline bg-card px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:bg-canvas disabled:text-ink-muted"
                          placeholder="Tên report"
                          value={row.name}
                          disabled={creating}
                          onChange={(event) => updateRow(index, { name: event.target.value })}
                        />
                        <label className="inline-flex min-h-9 items-center gap-2 px-2 text-xs font-semibold text-ink-soft">
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
                          className="inline-flex min-h-9 items-center rounded-lg border border-hairline bg-card px-3 text-xs font-semibold text-status-error-text transition-colors hover:border-status-error-border hover:bg-status-error-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={creating || rows.length === 1}
                          onClick={() => removeRow(index)}
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center rounded-lg border border-hairline bg-card px-4 text-xs font-semibold text-primary transition-colors hover:border-primary hover:bg-primary-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={creating}
                      onClick={addRow}
                    >
                      + Thêm report
                    </button>
                  </div>
                </div>

                {createError && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{createError}</p>}
                {createSuccess && <p role="status" className="rounded-lg border border-status-success-border bg-status-success-bg p-3 text-sm text-status-success-text">{createSuccess}</p>}
              </div>
            </section>
          </ConfigModeFrame>
        </div>

        {/* KHUÔN 3: Áp dụng template vào đồ án (cột phải Bento, sẵn sàng phân bổ) */}
        <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs xl:sticky xl:top-20 xl:col-span-5">
          <header className="flex flex-wrap items-start justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
            <div>
              <h2 className="text-base font-bold text-ink">Khuôn 3: Áp dụng template vào đồ án (Khoa phân bổ checklist)</h2>
              <p className="mt-0.5 text-xs text-ink-muted">Gán mẫu chung và mẫu của từng ngành vào cùng đồ án; có thể chỉ định thêm phần cá nhân.</p>
            </div>
            <StatusBadge tone="warning" label={`${targetRows.length} mục áp dụng`} />
          </header>

          <div className="space-y-4 p-5">
            <div className="rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-xs leading-relaxed text-status-warning-text">
              <strong>Lưu ý kiểm soát ngành:</strong> Tuyệt đối không tự ý áp dụng checklist IT cho sinh viên/đồ án thuộc ngành Marketing, Design hoặc các chuyên ngành khác. Mỗi ngành phải sử dụng đúng template của ngành mình.
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <label className="text-sm font-semibold text-ink-soft">
                Đồ án áp dụng
                <select className="mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" value={applyProjectId} onChange={(e) => { setApplyProjectId(e.target.value); setStudents([]); setTargetRows(current => current.map(row => ({ ...row, studentId: '' }))) }}><option value="">-- Chọn đồ án --</option>{availableProjects.map(p => <option key={p.id} value={p.id}>{p.title} ({p.code})</option>)}</select>
              </label>
              <label className="text-sm font-semibold text-ink-soft">
                Kỳ áp dụng
                <select className="mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" value={applyPeriodId || projectPeriodId} onChange={(e) => setApplyPeriodId(e.target.value)}><option value="">-- Chọn kỳ --</option>{availablePeriods.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}</select>
              </label>
              <label className="text-sm font-semibold text-ink-soft sm:col-span-2 xl:col-span-1">
                Hạn nộp báo cáo (Deadline)
                <input
                  type="datetime-local"
                  className="mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  value={applyDeadline}
                  onChange={(e) => setApplyDeadline(e.target.value)}
                />
              </label>
            </div>

            <div className="space-y-2.5 border-t border-hairline pt-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Danh sách mẫu áp dụng</h3>
                <button
                  type="button"
                  className="inline-flex min-h-9 items-center rounded-lg border border-hairline bg-card px-3 text-xs font-semibold text-primary transition-colors hover:border-primary hover:bg-primary-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  onClick={() => addTargetRow()}
                >
                  + Thêm mục áp dụng
                </button>
              </div>
              {targetRows.map((target, idx) => (
                <div key={idx} className="space-y-2 rounded-lg border border-hairline bg-canvas p-3">
                  <select className="min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" value={target.templateId} onChange={(e) => { const selected = templateChoices.find(t => String(t.id) === e.target.value); updateTargetRow(idx, selected ? emptyTargetRow(selected) : emptyTargetRow()) }}><option value="">-- Chọn template --</option>{templateChoices.filter(t => t.projectPeriodId === Number(applyPeriodId || projectPeriodId)).map(t => <option key={t.id} value={t.id}>{t.scope === 'COMMON' ? 'Chung · ' : 'Ngành · '}{t.name} (v{t.version})</option>)}</select>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="min-h-11 min-w-0 flex-1 rounded-lg border border-hairline bg-card px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:bg-canvas disabled:text-ink-muted"
                      value={target.scope}
                      disabled={templateChoices.find(t => String(t.id) === target.templateId)?.majorId == null}
                      onChange={(e) => updateTargetRow(idx, { scope: e.target.value as TargetRow['scope'] })}
                    >
                      {target.scope === 'COMMON' && <option value="COMMON">Chung (toàn đồ án)</option>}
                      <option value="MAJOR_SPECIFIC">Theo chuyên ngành</option>
                      <option value="INDIVIDUAL">Cá nhân sinh viên</option>
                    </select>
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center rounded-lg border border-hairline bg-card px-3 text-xs font-semibold text-status-error-text transition-colors hover:border-status-error-border hover:bg-status-error-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={targetRows.length === 1}
                      onClick={() => removeTargetRow(idx)}
                    >
                      Xóa mục
                    </button>
                  </div>
                  {target.scope === 'INDIVIDUAL' && (
                    <select aria-label="Sinh viên được áp dụng" className="min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" value={target.studentId} onChange={(e) => updateTargetRow(idx, { studentId: e.target.value })}><option value="">-- Chọn sinh viên --</option>{students.map(student => <option key={student.userId} value={student.userId}>{student.fullName}</option>)}</select>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-1">
              <button
                type="button"
                disabled={applying || !applyProjectId || !applyDeadline || !targetRows.some((t) => t.templateId)}
                className="min-h-11 w-full rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void submitApply()}
              >
                {applying ? 'Đang áp dụng…' : 'Áp dụng checklist vào đồ án'}
              </button>
            </div>

            {applyError && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{applyError}</p>}
            {applySuccess && <p role="status" className="rounded-lg border border-status-success-border bg-status-success-bg p-3 text-sm text-status-success-text">{applySuccess}</p>}
          </div>
        </section>
      </div>
    </WorkspacePage>
  )
}
