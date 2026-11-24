import { getReviewDetail } from '../projects/api/project-review-api'
import { useAuthSession } from '../auth/context/useAuthSession'
import { getAcademicHierarchy } from '../academic/api/academic-api'
import { getProjectPeriods } from '../academic/api/governance-api'
import { readAllPages } from '../../services/api/paged-read'
import { getProjects } from '../../services/api/projects.api'
import { useContext, useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { ConfigModeFrame } from '../../components/ui/ConfigModeFrame'
import { FilterToolbar, type ActiveFilterChip } from '../../components/ui/FilterToolbar'
import { Pagination } from '../../components/ui/Pagination'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useClientPagination } from '../../components/ui/useClientPagination'
import { HttpError } from '../../services/http/http-client'
import { createColdTemplate, getColdTemplateItExample, getColdTemplates } from '../../services/api/cold-templates.api'
import type { ColdReportInput, ColdTemplate } from '../../services/api/cold-templates.api'
import { applyColdChecklist } from '../../services/api/cold.api'
import type { ColdTemplateTarget } from '../../services/api/cold.api'
import { AcademicWorkflowContext } from '../../app/context/academic-workflow-context'
import { DepartmentAiDraftBar } from '../ai-suite/DepartmentAiDraftBar'
import { applyColdTemplateAiSetup, type AssistantColdTemplateSetupPlan } from '../ai/academic-ai-api'

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
    if (reason.status === 403) return 'Bạn chỉ được tạo template cho ngành/khoa của mình (yêu cầu đúng ngành của Khoa và kỳ Đánh giá hoặc Bàn giao cuối kỳ).'
    if (reason.status === 400 || reason.status === 422) return 'Dữ liệu chưa hợp lệ. Cần ít nhất 1 đầu mục báo cáo, mã phải viết HOA không dấu (A-Z, 0-9, _) tối đa 30 ký tự.'
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
  const [aiColdOpen, setAiColdOpen] = useState(false)
  const [aiColdApplying, setAiColdApplying] = useState(false)
  const [aiColdError, setAiColdError] = useState('')

  // Apply template to project state
  const [applyProjectId, setApplyProjectId] = useState('')
  const [students, setStudents] = useState<Array<{ userId: number; fullName: string }>>([])
  const [applyPeriodId, setApplyPeriodId] = useState('')
  const [applyDeadline, setApplyDeadline] = useState('')
  const [targetRows, setTargetRows] = useState<TargetRow[]>([emptyTargetRow()])
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [applySuccess, setApplySuccess] = useState('')
  const [templateFilterText, setTemplateFilterText] = useState('')
  const [reportRequirementFilter, setReportRequirementFilter] = useState<'ALL' | 'HAS_REQUIRED' | 'OPTIONAL_ONLY'>('ALL')
  const [templateSortBy, setTemplateSortBy] = useState<'version_desc' | 'name_asc' | 'reports_desc'>('version_desc')

  useEffect(() => {
    if (!applyProjectId || !session) return
    let active = true
    void getReviewDetail(Number(applyProjectId), session.accessToken).then(review => {
      if (active) setStudents(review.latestSubmission?.evidence.members ?? [])
    }).catch(() => { if (active) setApplyError('Chưa tải được danh sách sinh viên của đồ án. Hãy chọn lại đồ án.') })
    return () => { active = false }
  }, [applyProjectId, session])

  // Auto-load common & scoped templates for the selected Apply period so users don't have to manually search Step 1 first.
  useEffect(() => {
    const period = Number(applyPeriodId)
    if (!period || !session) return
    let active = true
    const majorTargets: Array<number | null> = [null, ...availableMajors.slice(0, 5).map(m => m.id)]
    void Promise.all(
      majorTargets.map(m => Promise.resolve(getColdTemplates(m, period, 1, 50)).catch(() => null)),
    ).then(results => {
      if (!active) return
      const loaded = results.flatMap(res => res?.items ?? [])
      if (!loaded.length) return
      setTemplateChoices(current => {
        const byId = new Map(current.map(item => [item.id, item]))
        for (const item of loaded) byId.set(item.id, item)
        return [...byId.values()]
      })
    })
    return () => { active = false }
  }, [applyPeriodId, availableMajors, session])

  const filteredTemplates = useMemo(() => {
    if (!templates) return null
    const q = templateFilterText.trim().toLowerCase()
    const filtered = templates.filter(tmpl => {
      if (reportRequirementFilter === 'HAS_REQUIRED' && !tmpl.reports.some(r => r.required)) return false
      if (reportRequirementFilter === 'OPTIONAL_ONLY' && tmpl.reports.some(r => r.required)) return false
      if (q && !(tmpl.name.toLowerCase().includes(q) || tmpl.reports.some(r => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)))) {
        return false
      }
      return true
    })
    return [...filtered].sort((a, b) => {
      if (templateSortBy === 'name_asc') return a.name.localeCompare(b.name, 'vi')
      if (templateSortBy === 'reports_desc') return b.reports.length - a.reports.length
      return b.version - a.version
    })
  }, [templates, templateFilterText, reportRequirementFilter, templateSortBy])

  const templatePager = useClientPagination(filteredTemplates ?? [], 10)
  const templateChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = []
    if (reportRequirementFilter !== 'ALL') {
      chips.push({
        id: 'reportRequirement',
        label: 'Đầu mục',
        value: reportRequirementFilter === 'HAS_REQUIRED' ? 'Có mục bắt buộc' : 'Chỉ mục tùy chọn',
      })
    }
    return chips
  }, [reportRequirementFilter])
  const hasTemplateLocalFilters = Boolean(templateFilterText.trim() || reportRequirementFilter !== 'ALL' || templateSortBy !== 'version_desc')
  const clearTemplateLocalFilters = () => {
    setTemplateFilterText('')
    setReportRequirementFilter('ALL')
    setTemplateSortBy('version_desc')
  }

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

  return (
    <WorkspacePage
      size="wide"
      className="space-y-6 cold-template-page"
      title="Mẫu báo cáo chấm nguội"
      eyebrow="Chấm nguội · Quản lý theo phạm vi và kỳ đồ án"
      description="Tạo bộ đầu mục báo cáo chung hoặc theo ngành cho từng kỳ đánh giá hoặc bàn giao cuối kỳ. Mỗi lần tạo là một phiên bản mới, bất biến."
    >
      {/* Thông tin ngữ cảnh khoa & Điều hướng nhanh 3 bước */}
      <section className="rounded-xl border border-hairline bg-card p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-ink">Quy tắc nghiệp vụ Cán bộ bộ môn</h2>
            <p className="mt-1 text-xs text-ink-muted">
              {currentDepartment
                ? `Bộ môn hiện tại: ${currentDepartment.name} (${currentDepartment.code})`
                : 'Chỉ cán bộ thuộc đúng bộ môn mới có quyền tạo và áp dụng mẫu báo cáo cho các ngành phụ trách.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <a href="#cold-step-search" className="inline-flex min-h-9 items-center rounded-lg border border-hairline bg-canvas px-3 font-semibold text-ink-soft hover:border-primary hover:text-primary">1. Tra cứu mẫu</a>
            <a href="#cold-step-create" className="inline-flex min-h-9 items-center rounded-lg border border-hairline bg-canvas px-3 font-semibold text-ink-soft hover:border-primary hover:text-primary">2. Tạo mẫu mới</a>
            <a href="#cold-step-apply" className="inline-flex min-h-9 items-center rounded-lg border border-hairline bg-canvas px-3 font-semibold text-ink-soft hover:border-primary hover:text-primary">3. Áp dụng vào đồ án</a>
          </div>
        </div>
      </section>

      {catalogError && <p role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{catalogError}</p>}

      <div className="grid items-stretch gap-6 xl:grid-cols-2">
      {/* BƯỚC 1: Tra cứu & Danh sách mẫu */}
      <section id="cold-step-search" className="flex h-full flex-col rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
          <div>
            <h2 className="text-base font-bold text-ink">Bước 1: Tra cứu mẫu đã có</h2>
            <p className="text-xs text-ink-muted">Chọn phạm vi và kỳ đồ án để xem các bộ mẫu báo cáo đã được tạo.</p>
          </div>
        </div>

        <FilterToolbar
          embedded
          ariaLabel="Tra cứu và lọc mẫu báo cáo chấm nguội"
          search={templateFilterText}
          onSearchChange={setTemplateFilterText}
          searchLabel="Lọc nhanh danh sách mẫu"
          searchPlaceholder="Lọc theo tên mẫu hoặc mã đầu mục…"
          debounceMs={0}
          controls={
            <>
              <label className="ft-select-wrap">
                <span className="sr-only">Phạm vi template</span>
                <select
                  aria-label="Phạm vi template"
                  className="ft-select"
                  value={templateScope}
                  onChange={event => { setTemplateScope(event.target.value as 'COMMON' | 'MAJOR_SPECIFIC'); setTemplates(null) }}
                >
                  <option value="MAJOR_SPECIFIC">Theo ngành</option>
                  <option value="COMMON">Chung</option>
                </select>
              </label>
              <label className="ft-select-wrap">
                <span className="sr-only">Ngành áp dụng</span>
                <select
                  aria-label="Ngành áp dụng"
                  className="ft-select"
                  value={majorId}
                  disabled={templateScope === 'COMMON'}
                  onChange={(event) => setMajorId(event.target.value)}
                >
                  <option value="">-- Chọn ngành --</option>
                  {availableMajors.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
                </select>
              </label>
              <label className="ft-select-wrap">
                <span className="sr-only">Kỳ đồ án áp dụng</span>
                <select
                  aria-label="Kỳ đồ án áp dụng"
                  className="ft-select"
                  value={projectPeriodId}
                  onChange={(event) => { setProjectPeriodId(event.target.value); setTemplates(null); setTemplateChoices([]); setTargetRows([emptyTargetRow()]) }}
                >
                  <option value="">-- Chọn kỳ đồ án --</option>
                  {availablePeriods.filter(p => p.periodType === 'EVALUATION' || p.periodType === 'FINAL_SUBMISSION').map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                </select>
              </label>
              <label className="ft-select-wrap">
                <span className="sr-only">Loại đầu mục</span>
                <select
                  aria-label="Lọc theo loại đầu mục"
                  className="ft-select"
                  value={reportRequirementFilter}
                  onChange={event => setReportRequirementFilter(event.target.value as 'ALL' | 'HAS_REQUIRED' | 'OPTIONAL_ONLY')}
                >
                  <option value="ALL">Mọi đầu mục</option>
                  <option value="HAS_REQUIRED">Có mục bắt buộc</option>
                  <option value="OPTIONAL_ONLY">Chỉ mục tùy chọn</option>
                </select>
              </label>
            </>
          }
          sort={{
            value: templateSortBy,
            onChange: val => setTemplateSortBy(val as 'version_desc' | 'name_asc' | 'reports_desc'),
            options: [
              { value: 'version_desc', label: 'Phiên bản mới nhất' },
              { value: 'name_asc', label: 'Tên mẫu A–Z' },
              { value: 'reports_desc', label: 'Nhiều đầu mục nhất' },
            ],
          }}
          rightActions={
            <Button
              size="sm"
              variant="outline"
              disabled={loading || (templateScope === 'MAJOR_SPECIFIC' && !majorId) || !projectPeriodId}
              onClick={() => void search()}
            >
              {loading ? 'Đang tải…' : 'Tìm'}
            </Button>
          }
          activeChips={templateChips}
          onRemoveChip={id => { if (id === 'reportRequirement') setReportRequirementFilter('ALL') }}
          onClearAll={clearTemplateLocalFilters}
          hasActiveFilters={hasTemplateLocalFilters}
          resultSummary={templates ? `${filteredTemplates?.length ?? 0} / ${templates.length} mẫu` : undefined}
        />

        {loading && <p role="status" className="text-sm text-ink-muted">Đang tải danh sách mẫu…</p>}
        {listError && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{listError}</p>}
        {templates && templates.length === 0 && (
          <p className="rounded-lg border border-hairline bg-canvas p-3 text-sm text-ink-muted">
            Chưa có template cho phạm vi/kỳ này.
          </p>
        )}
        {templates && templates.length > 0 && (
          <div className="space-y-3 pt-1">
            {templatePager.paginatedItems.length === 0 ? (
              <div className="rounded-lg border border-hairline bg-canvas p-4 text-center text-sm text-ink-muted">
                <p>Không có mẫu nào khớp bộ lọc hiện tại.</p>
                <button type="button" className="mt-2 font-semibold text-primary underline" onClick={clearTemplateLocalFilters}>Xóa bộ lọc</button>
              </div>
            ) : (
              <>
                <ul className="space-y-3">
                  {templatePager.paginatedItems.map((template) => (
                    <li key={template.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-hairline bg-canvas p-4 transition-shadow hover:shadow-xs">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-ink">{template.name} (v{template.version})</p>
                          <StatusBadge tone="info" label={`v${template.version}`} />
                          <StatusBadge tone="neutral" label={template.scope === 'COMMON' ? 'Chung' : 'Theo ngành'} />
                        </div>
                        <ul className="space-y-1 text-xs text-ink-soft">
                          {template.reports.map((report) => (
                            <li key={report.code} className="flex items-center gap-2">
                              <code className="rounded border border-hairline bg-card px-1.5 py-0.5 font-semibold text-ink">{report.code}</code>
                              <span>— {report.name}</span>
                              {report.required && <span className="font-medium text-status-warning-text">· Bắt buộc</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <button
                        type="button"
                        className="inline-flex min-h-10 items-center gap-1 whitespace-nowrap rounded-lg border border-primary bg-card px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
                {templatePager.showPagination && (
                  <Pagination
                    page={templatePager.page}
                    pages={templatePager.pages}
                    total={templatePager.total}
                    pageSize={templatePager.pageSize}
                    onPage={templatePager.setPage}
                    onPageSizeChange={templatePager.setPageSize}
                  />
                )}
              </>
            )}
          </div>
        )}
      </section>

      {/* BƯỚC 2: Tạo mẫu mới */}
      <div id="cold-step-create" className="flex h-full flex-col">
      <ConfigModeFrame mode={createMode} dirty={Boolean(name || rows.length !== 1 || rows[0].code || rows[0].name || !rows[0].required)} busy={creating} onEdit={() => setCreateMode('edit')} onCancel={() => { setName(''); setRows([emptyRow()]); setCreateMode('view'); setCreateSuccess('Đã hủy các thay đổi.') }} onSave={() => void submitCreate()} saveLabel="Tạo template" saveDisabled={(templateScope === 'MAJOR_SPECIFIC' && !majorId) || !projectPeriodId || !name.trim() || !rows.some(row => row.code.trim() && row.name.trim())} navigationGuard={false} blastRadius="Mẫu mới tạo là một phiên bản bất biến trong phạm vi ngành và kỳ đồ án đang chọn. Danh sách nộp chỉ được áp dụng cho đồ án sau thao tác riêng ở Bước 3.">
      <section className="flex h-full flex-col rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
          <div>
            <h2 className="text-base font-bold text-ink">Bước 2: Tạo mẫu mới (phiên bản mới)</h2>
            <p className="text-xs text-ink-muted">
              {createMode === 'view'
                ? 'Nhấn nút “Chỉnh sửa” ở thanh trên để bắt đầu soạn phiên bản mẫu mới cho phạm vi và kỳ đang chọn ở Bước 1.'
                : 'Mỗi lần lưu tạo một phiên bản bất biến cho phạm vi và kỳ đồ án đang chọn ở Bước 1.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              onClick={() => { setAiColdError(''); setAiColdOpen(true) }}
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">auto_awesome</span>
              Soạn mẫu bằng AI
            </button>
            <button
              type="button"
              className="inline-flex min-h-9 items-center whitespace-nowrap rounded-lg border border-primary/20 bg-primary-subtle px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              onClick={() => void loadItExample()}
            >
              Dùng mẫu IT (chỉ để tham khảo)
            </button>
          </div>
        </div>

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
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Danh sách các đầu mục báo cáo</h3>
            <span className="text-xs text-ink-muted">Mã tự động chuyển thành IN HOA</span>
          </div>

          <div className="space-y-2">
            {rows.map((row, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2.5 rounded-lg border border-hairline bg-canvas p-2.5">
                <input
                  className="min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 font-mono text-sm uppercase text-ink sm:w-44 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:bg-canvas disabled:text-ink-muted"
                  placeholder="Mã report"
                  value={row.code}
                  disabled={creating}
                  onChange={(event) => updateRow(index, { code: event.target.value })}
                />
                <input
                  className="min-h-11 min-w-48 flex-1 rounded-lg border border-hairline bg-card px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:bg-canvas disabled:text-ink-muted"
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

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
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
        {createSuccess && (
          <div className="flex items-center gap-2 rounded-lg border border-hairline border-l-4 border-l-status-success-text bg-card p-3 text-sm text-ink">
            <span className="material-symbols-outlined shrink-0 text-[18px] text-status-success-text" aria-hidden="true">check_circle</span>
            <p role="status">{createSuccess}</p>
          </div>
        )}
      </section>
      </ConfigModeFrame>
      </div>
      </div>

      {/* BƯỚC 3: Áp dụng mẫu vào đồ án */}
      <section id="cold-step-apply" className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-4">
        <div className="border-b border-hairline pb-3">
          <h2 className="text-base font-bold text-ink">Bước 3: Áp dụng mẫu vào đồ án</h2>
          <p className="mt-1 text-xs text-ink-muted">Gán mẫu chung và mẫu của từng ngành vào cùng đồ án; có thể chỉ định thêm phần cá nhân.</p>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-status-warning-border bg-status-warning-bg p-3.5 text-xs leading-relaxed text-status-warning-text">
          <span className="material-symbols-outlined shrink-0 text-[18px]" aria-hidden="true">warning</span>
          <p><strong>Lưu ý kiểm soát ngành:</strong> Tuyệt đối không tự ý áp dụng bộ báo cáo IT cho sinh viên hoặc đồ án thuộc ngành khác. Mỗi ngành phải sử dụng đúng mẫu báo cáo của ngành mình.</p>
        </div>

        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
          <label className="text-sm font-semibold text-ink-soft">
            Đồ án áp dụng
            <select className="mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" value={applyProjectId} onChange={(e) => { setApplyProjectId(e.target.value); setStudents([]); setTargetRows(current => current.map(row => ({ ...row, studentId: '' }))) }}><option value="">-- Chọn đồ án --</option>{availableProjects.map(p => <option key={p.id} value={p.id}>{p.title} ({p.code})</option>)}</select>
          </label>
          <label className="text-sm font-semibold text-ink-soft">
            Kỳ áp dụng
            <select className="mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" value={applyPeriodId || projectPeriodId} onChange={(e) => setApplyPeriodId(e.target.value)}><option value="">-- Chọn kỳ --</option>{availablePeriods.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}</select>
          </label>
          <label className="text-sm font-semibold text-ink-soft">
            Hạn nộp báo cáo (Deadline)
            <input
              type="datetime-local"
              className="mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              value={applyDeadline}
              onChange={(e) => setApplyDeadline(e.target.value)}
            />
          </label>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Danh sách mẫu áp dụng</h3>
          {targetRows.map((target, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2.5 rounded-lg border border-hairline bg-canvas p-2.5">
              <select className="min-h-11 min-w-56 flex-1 rounded-lg border border-hairline bg-card px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" value={target.templateId} onChange={(e) => { const selected = templateChoices.find(t => String(t.id) === e.target.value); updateTargetRow(idx, selected ? emptyTargetRow(selected) : emptyTargetRow()) }}><option value="">-- Chọn template --</option>{templateChoices.filter(t => t.projectPeriodId === Number(applyPeriodId || projectPeriodId)).map(t => <option key={t.id} value={t.id}>{t.scope === 'COMMON' ? 'Chung · ' : 'Ngành · '}{t.name} (v{t.version})</option>)}</select>
              <select
                className="min-h-11 rounded-lg border border-hairline bg-card px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:bg-canvas disabled:text-ink-muted"
                value={target.scope}
                disabled={templateChoices.find(t => String(t.id) === target.templateId)?.majorId == null}
                onChange={(e) => updateTargetRow(idx, { scope: e.target.value as TargetRow['scope'] })}
              >
                {target.scope === 'COMMON' && <option value="COMMON">Chung</option>}
                <option value="MAJOR_SPECIFIC">Theo ngành</option>
                <option value="INDIVIDUAL">Cá nhân</option>
              </select>
              {target.scope === 'INDIVIDUAL' && (
                <select aria-label="Sinh viên được áp dụng" className="min-h-11 min-w-48 rounded-lg border border-hairline bg-card px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" value={target.studentId} onChange={(e) => updateTargetRow(idx, { studentId: e.target.value })}><option value="">-- Chọn sinh viên --</option>{students.map(student => <option key={student.userId} value={student.userId}>{student.fullName}</option>)}</select>
              )}
              <button
                type="button"
                className="ml-auto inline-flex min-h-9 items-center rounded-lg border border-hairline bg-card px-3 text-xs font-semibold text-status-error-text transition-colors hover:border-status-error-border hover:bg-status-error-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
                disabled={targetRows.length === 1}
                onClick={() => removeTargetRow(idx)}
              >
                Xóa dòng
              </button>
            </div>
          ))}
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-lg border border-hairline bg-card px-4 text-xs font-semibold text-primary transition-colors hover:border-primary hover:bg-primary-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={() => addTargetRow()}
          >
            + Thêm mẫu áp dụng
          </button>
        </div>

        <div className="pt-2">
          <button
            type="button"
            disabled={applying || !applyProjectId || !applyDeadline || !targetRows.some((t) => t.templateId)}
            className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void submitApply()}
          >
            {applying ? 'Đang áp dụng…' : 'Áp dụng checklist vào đồ án'}
          </button>
        </div>

        {applyError && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{applyError}</p>}
        {applySuccess && (
          <div className="flex items-center gap-2 rounded-lg border border-hairline border-l-4 border-l-status-success-text bg-card p-3 text-sm text-ink">
            <span className="material-symbols-outlined shrink-0 text-[18px] text-status-success-text" aria-hidden="true">check_circle</span>
            <p role="status">{applySuccess}</p>
          </div>
        )}
      </section>

      <DepartmentAiDraftBar
        open={aiColdOpen}
        onClose={() => setAiColdOpen(false)}
        title="Soạn mẫu hồ sơ chấm nguội bằng AI"
        description="Đính kèm đề cương môn học hoặc nhập chuyên ngành (Marketing, Kinh tế, Thiết kế, Liên ngành…) để AI đề xuất bộ đầu mục báo cáo chuẩn UPPER_SNAKE_CASE."
        toolMode="COLD_TEMPLATE_SETUP"
        pageContext="/department/cold-templates"
        projectPeriodId={projectPeriodId ? Number(projectPeriodId) : undefined}
        placeholder="VD: Tạo bộ hồ sơ chấm nguội cho chuyên ngành Marketing / Thiết kế đồ họa gồm 6 đầu mục báo cáo..."
        starters={[
          {
            label: 'Khối Marketing / Kinh doanh',
            prompt: 'Soạn mẫu hồ sơ chấm nguội cho đồ án chuyên ngành Marketing / Kinh doanh gồm nghiên cứu thị trường, chiến lược, kế hoạch tài chính và minh chứng triển khai.',
          },
          {
            label: 'Khối Thiết kế đồ họa / UI-UX',
            prompt: 'Soạn mẫu hồ sơ chấm nguội cho đồ án chuyên ngành Thiết kế gồm Design Brief, Concept/Moodboard, Design System, kiểm thử trải nghiệm và Portfolio.',
          },
          {
            label: 'Khối Liên ngành (SE + Kinh doanh)',
            prompt: 'Soạn mẫu hồ sơ chấm nguội dùng chung (COMMON) cho đồ án liên ngành kết hợp Kỹ thuật phần mềm và Marketing.',
          },
        ]}
        renderResult={response => {
          const plan: AssistantColdTemplateSetupPlan | null | undefined = response.draft?.coldTemplateSetup
          if (!plan) {
            return (
              <div className="rounded-xl border border-hairline bg-canvas p-4 text-sm text-ink-soft whitespace-pre-wrap">
                {response.answer}
              </div>
            )
          }
          return (
            <section className="space-y-3 rounded-xl border border-hairline bg-card p-4" aria-label="Bản nháp mẫu chấm nguội AI">
              <div className="border-b border-hairline pb-2.5">
                <h3 className="text-base font-bold text-ink">{plan.name}</h3>
                <p className="mt-0.5 text-xs text-ink-muted">{plan.summary}</p>
              </div>
              {plan.warnings.length > 0 && (
                <ul className="space-y-1 rounded-lg border border-status-warning-border bg-status-warning-bg px-3 py-2 text-xs text-status-warning-text">
                  {plan.warnings.map((w, idx) => <li key={idx}>• {w}</li>)}
                </ul>
              )}
              <ul className="space-y-1.5">
                {plan.reports.map((report, idx) => (
                  <li key={`${report.code}-${idx}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline bg-canvas px-3 py-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded bg-card px-1.5 py-0.5 font-mono font-bold text-primary">{report.code}</code>
                      <span className="font-medium text-ink">{report.name}</span>
                    </div>
                    <span className={report.required ? 'font-semibold text-status-warning-text' : 'text-ink-muted'}>
                      {report.required ? 'Bắt buộc' : 'Tùy chọn'}
                    </span>
                  </li>
                ))}
              </ul>
              {aiColdError && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-2.5 text-xs text-status-error-text">{aiColdError}</p>}
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline pt-3">
                <button
                  type="button"
                  className="min-h-10 rounded-lg border border-primary bg-card px-4 text-xs font-semibold text-primary hover:bg-primary-subtle"
                  onClick={() => {
                    setName(plan.name)
                    setRows(plan.reports.map(r => ({ code: r.code.slice(0, 30), name: r.name, required: r.required })))
                    setCreateMode('edit')
                    setCreateError('')
                    setCreateSuccess('Đã đổ bộ đầu mục AI đề xuất vào Bước 2. Kiểm tra phạm vi/kỳ rồi bấm Tạo template.')
                    setAiColdOpen(false)
                  }}
                >
                  Đổ vào biểu mẫu để chỉnh thêm
                </button>
                <button
                  type="button"
                  disabled={aiColdApplying || !projectPeriodId || (templateScope === 'MAJOR_SPECIFIC' && !majorId)}
                  className="min-h-10 rounded-lg bg-primary px-4 text-xs font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={async () => {
                    if (!projectPeriodId) return
                    setAiColdApplying(true)
                    setAiColdError('')
                    try {
                      const key = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                        ? crypto.randomUUID()
                        : `${Date.now()}-0000-4000-8000-000000000000`
                      const saved = await applyColdTemplateAiSetup({
                        idempotencyKey: key,
                        runId: response.runId ?? null,
                        projectPeriodId: Number(projectPeriodId),
                        scope: templateScope,
                        majorId: templateScope === 'COMMON' ? null : Number(majorId),
                        name: plan.name,
                        reports: plan.reports,
                      })
                      setCreateSuccess(`Đã lưu phiên bản v${saved.version} mẫu chấm nguội "${saved.name}" (${saved.reportsCount} đầu mục).`)
                      setAiColdOpen(false)
                      void search()
                    } catch (reason) {
                      setAiColdError(errorMessage(reason))
                    } finally {
                      setAiColdApplying(false)
                    }
                  }}
                >
                  {aiColdApplying ? 'Đang lưu…' : 'Lưu thành phiên bản mới ngay'}
                </button>
              </div>
              {(!projectPeriodId || (templateScope === 'MAJOR_SPECIFIC' && !majorId)) && (
                <p className="text-xs text-ink-muted">
                  Chọn Kỳ đồ án (và Chuyên ngành nếu theo ngành) ở Bước 1 để bật nút Lưu ngay, hoặc bấm "Đổ vào biểu mẫu để chỉnh thêm".
                </p>
              )}
            </section>
          )
        }}
      />
    </WorkspacePage>
  )
}
