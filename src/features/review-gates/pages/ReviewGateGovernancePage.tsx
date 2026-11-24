import { Table, TableHead } from '../../../components/ui/Table'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import '../../../components/ui/workspace-tabs.css'
import { FilterToolbar, type ActiveFilterChip } from '../../../components/ui/FilterToolbar'
import { Pagination } from '../../../components/ui/Pagination'
import { useClientPagination } from '../../../components/ui/useClientPagination'
import { WorkspaceEmptyState } from '../../../components/ui/WorkspaceState'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import {
  deleteReviewGateTemplate,
  getDefenseReadiness,
  getProjectReviewMatrix,
  getReviewGateTemplates,
  publishReviewGateTemplate,
  saveReviewGateTemplate,
  updateGateDecision,
  updateHybridScopeDecision,
} from '../api/review-gates-api'
import type {
  DefenseReadinessSummary,
  ProjectReviewMatrixRow,
  ReviewGateTemplate,
} from '../types/review-gates.types'
import { ReviewGateBuilder } from '../components/ReviewGateBuilder'
import { GateWorkbookPanel } from '../components/GateWorkbookPanel'
import { ReviewGatesMockNotice } from '../components/ReviewGatesMockNotice'
import { ProjectProgressMatrix } from '../components/ProjectProgressMatrix'
import { InterdisciplinaryGatePanel } from '../components/InterdisciplinaryGatePanel'
import { DefenseReadinessChecker } from '../components/DefenseReadinessChecker'
import { env } from '../../../app/config/env'
import { HttpError } from '../../../services/http/http-client'
import { gateWeightTotal, validateGateWeights } from '../api/review-gates-contract'
import { AcademicWorkflowContext } from '../../../app/context/academic-workflow-context'
import { getDepartmentUrgentActions } from '../../calendar/action-aggregators-api'
import { DepartmentAiDraftBar } from '../../ai-suite/DepartmentAiDraftBar'
import { AssistantReviewGateSetupCard } from '../../ai/components/AssistantReviewGateSetupCard'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'

function templateError(error: unknown, template: ReviewGateTemplate): string {
  if (error instanceof HttpError && error.status === 409) return 'Mẫu đã công bố không thể sửa hoặc phiên bản đã thay đổi. Giữ lại nội dung đang nhập; tải lại để đối chiếu hoặc nhân bản thành phiên bản nháp mới.'
  if (error instanceof HttpError && error.status === 422) {
    const errors = error.problem?.errors
    if (errors && Object.keys(errors).some(key => key.toLowerCase() === 'weights')) {
      return `Trọng số chưa hợp lệ. Nhập đủ các cổng trong khoảng 0–100%, tổng đúng 100%, hoặc để trống tất cả. Tổng hiện tại: ${gateWeightTotal(template.gates)}%.`
    }
  }
  return error instanceof Error ? error.message : 'Không thể lưu mẫu tiến trình. Nội dung đang nhập được giữ lại.'
}

function cloneDraftTemplate(templateToClone: ReviewGateTemplate, stamp: number): ReviewGateTemplate {
  const nextVer = (parseFloat(templateToClone.version) + 1.0).toFixed(1)
  return {
    ...templateToClone,
    id: `tmpl-draft-${stamp}`,
    code: `${templateToClone.code}-v${nextVer}`,
    name: `${templateToClone.name} (Bản nháp v${nextVer})`,
    status: 'DRAFT',
    version: `${nextVer}-draft`,
    concurrencyToken: '',
    gates: templateToClone.gates.map((g, gi) => ({
      ...g,
      id: `gate-clone-${stamp}-${gi}`,
      requirements: g.requirements.map((r, ri) => ({
        ...r,
        id: `req-clone-${stamp}-${ri}`,
      })),
    })),
  }
}

const gateDecisionLabels: Record<'PASSED' | 'REVISION_REQUIRED' | 'IN_REVIEW', string> = {
  PASSED: 'Đạt',
  REVISION_REQUIRED: 'Cần chỉnh sửa',
  IN_REVIEW: 'Đang thẩm định',
}

type GovernanceTab = 'overview' | 'builder' | 'matrix' | 'hybrid' | 'defense'

function defaultTabForPathname(pathname: string): GovernanceTab {
  return pathname.replace(/\/+$/, '').endsWith('/progress-matrix') ? 'matrix' : 'overview'
}

export function ReviewGateGovernancePage() {
  const academicContext = useContext(AcademicWorkflowContext)
  const location = useLocation()
  const departmentKey = (academicContext?.academic?.departments ?? []).map(item => item.id).filter(id => Number.isSafeInteger(id) && id > 0).join(',')
  const { periodId } = useParams<{ periodId?: string }>()
  const [activeTab, setActiveTab] = useState<GovernanceTab>(() => defaultTabForPathname(location.pathname))
  const [templateSearch, setTemplateSearch] = useState('')
  const [templateStatusFilter, setTemplateStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL')
  const [templateModeFilter, setTemplateModeFilter] = useState<'ALL' | 'SINGLE_MAJOR' | 'INTERDISCIPLINARY'>('ALL')
  const [templates, setTemplates] = useState<ReviewGateTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const [dirtyTemplateIds, setDirtyTemplateIds] = useState<Set<string>>(() => new Set())
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [matrixProjects, setMatrixProjects] = useState<ProjectReviewMatrixRow[]>([])
  const [defenseSummary, setDefenseSummary] = useState<DefenseReadinessSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [defenseError, setDefenseError] = useState<string | null>(null)
  const [readinessRefresh, setReadinessRefresh] = useState(0)
  const [aiDraftOpen, setAiDraftOpen] = useState(false)
  const [reviewerGaps, setReviewerGaps] = useState<{ key: string; state: 'ready' | 'unavailable'; count: number } | null>(null)
  const cloneSequence = useRef(0)
  const scopedReviewerGaps = reviewerGaps?.key === departmentKey ? reviewerGaps : null

  useEffect(() => {
    setActiveTab(defaultTabForPathname(location.pathname))
  }, [location.pathname])

  const loadAllData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [allTemplates, matrixList] = await Promise.all([
        getReviewGateTemplates(),
        getProjectReviewMatrix(),
      ])
      const tmplList = periodId && !env.reviewGatesMockEnabled ? allTemplates.filter(t => String(t.projectPeriodId) === periodId) : allTemplates
      setTemplates(tmplList)
      setMatrixProjects(matrixList)
      setSelectedTemplateId(prev => tmplList.some(t => t.id === prev) ? prev : tmplList[0]?.id || '')
      setSelectedProjectId(prev => matrixList.some(p => p.projectId === prev) ? prev : matrixList[0]?.projectId || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chưa tải được dữ liệu tiến trình học vụ.')
    } finally {
      setLoading(false)
    }
  }, [periodId])

  useEffect(() => {
    void loadAllData()
  }, [loadAllData])

  useEffect(() => {
    if (activeTab !== 'matrix' || !departmentKey) return
    let active = true
    const ids = departmentKey.split(',').map(Number)
    void Promise.all(ids.map(id => getDepartmentUrgentActions(id))).then(results => {
      if (!active) return
      const projectIds = new Set(results.flatMap(result => result.items).filter(item => item.kind === 'REVIEWER_ASSIGNMENT' && item.projectId !== null).map(item => item.projectId))
      setReviewerGaps({ key: departmentKey, state: 'ready', count: projectIds.size })
    }).catch(() => { if (active) setReviewerGaps({ key: departmentKey, state: 'unavailable', count: 0 }) })
    return () => { active = false }
  }, [activeTab, departmentKey])

  useEffect(() => {
    let active = true
    setDefenseSummary(null)
    setDefenseError(null)
    if (selectedProjectId) void getDefenseReadiness(selectedProjectId)
      .then(res => { if (active) setDefenseSummary(res) })
      .catch(err => { if (active) setDefenseError(err instanceof Error ? err.message : 'Không thể kiểm tra điều kiện bảo vệ.') })
    return () => { active = false }
  }, [selectedProjectId, readinessRefresh])

  const currentTemplate =
    templates.find(t => t.id === selectedTemplateId) || templates[0] || null

  function handleTemplateChange(updated: ReviewGateTemplate) {
    setError(null)
    setDirtyTemplateIds(previous => new Set(previous).add(updated.id))
    setTemplates(prev => prev.map(t => (t.id === updated.id ? updated : t)))
  }

  async function handleSaveDraft() {
    if (!currentTemplate) return
    const validation = validateGateWeights(currentTemplate.gates)
    if (validation) { setError(validation); return }
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const saved = await saveReviewGateTemplate(currentTemplate)
      setTemplates(prev => prev.map(t => (t.id === currentTemplate.id ? saved : t)))
      setDirtyTemplateIds(previous => { const next = new Set(previous); next.delete(currentTemplate.id); return next })
      setSelectedTemplateId(saved.id)
      setNotice('Đã lưu bản nháp tiến trình thành công.')
    } catch (err) {
      setError(templateError(err, currentTemplate))
    } finally {
      setBusy(false)
    }
  }

  async function handlePublish() {
    if (!currentTemplate) return
    const validation = validateGateWeights(currentTemplate.gates)
    if (validation) { setError(validation); return }
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const saved = await saveReviewGateTemplate(currentTemplate)
      setTemplates(prev => prev.map(t => (t.id === currentTemplate.id ? saved : t)))
      setDirtyTemplateIds(previous => { const next = new Set(previous); next.delete(currentTemplate.id); return next })
      setSelectedTemplateId(saved.id)
      const published = await publishReviewGateTemplate(saved.id, saved.concurrencyToken)
      setTemplates(prev => prev.map(t => (t.id === saved.id ? published : t)))
      setNotice(`Đã công bố chính thức mẫu tiến trình ${published.name} (phiên bản v${published.version}).`)
    } catch (err) {
      setError(templateError(err, currentTemplate))
    } finally {
      setBusy(false)
    }
  }

  function handleCloneTemplate(templateToClone: ReviewGateTemplate) {
    const cloned = cloneDraftTemplate(templateToClone, ++cloneSequence.current)
    setTemplates(prev => [cloned, ...prev])
    setSelectedTemplateId(cloned.id)
    setActiveTab('builder')
    setNotice(`Đã nhân bản ${templateToClone.name} thành bản nháp mới v${cloned.version}.`)
  }

  async function handleDeleteDraftTemplate(templateToDelete: ReviewGateTemplate) {
    if (templateToDelete.status !== 'DRAFT' || busy) return
    const decision = await requestConfirmation({
      title: `Xóa bản nháp "${templateToDelete.name}"?`,
      description: `Bản nháp ${templateToDelete.code} (v${templateToDelete.version}) và toàn bộ cổng/yêu cầu bên trong sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.`,
      confirmLabel: 'Xóa bản nháp',
      danger: true,
    })
    if (decision === null) return

    const isUnsavedLocalDraft = templateToDelete.id.startsWith('tmpl-draft') || templateToDelete.id.startsWith('tmpl-temp')
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (!isUnsavedLocalDraft) {
        await deleteReviewGateTemplate(templateToDelete.id)
      }
      const remaining = templates.filter(t => t.id !== templateToDelete.id)
      setTemplates(remaining)
      setDirtyTemplateIds(previous => {
        const next = new Set(previous)
        next.delete(templateToDelete.id)
        return next
      })
      if (selectedTemplateId === templateToDelete.id) {
        setSelectedTemplateId(remaining[0]?.id ?? '')
        if (activeTab === 'builder') setActiveTab('overview')
      }
      setNotice(`Đã xóa bản nháp tiến trình "${templateToDelete.name}" (${templateToDelete.code}).`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa bản nháp mẫu tiến trình.')
    } finally {
      setBusy(false)
    }
  }

  async function handleUpdateDecision(
    projectId: string,
    gateCode: string,
    newStatus: 'PASSED' | 'REVISION_REQUIRED' | 'IN_REVIEW',
  ) {
    try {
      const updated = await updateGateDecision(projectId, gateCode, newStatus)
      setMatrixProjects(prev => prev.map(p => (p.projectId === updated.projectId ? updated : p)))
      const projectLabel = updated.projectCode || updated.projectName
      setNotice(`Đã ghi nhận kết luận thẩm định cho đồ án ${projectLabel}: ${gateCode} → ${gateDecisionLabels[newStatus]}.`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật kết luận thẩm định.'
      setError(msg)
      throw err
    }
  }

  async function handleUpdateHybridScopeDecision(
    projectId: string,
    scope: string,
    newStatus: 'PASSED' | 'REVISION_REQUIRED' | 'IN_REVIEW',
  ) {
    try {
      const targetProject = matrixProjects.find(p => p.projectId === projectId)
      const token = targetProject?.hybridScopeTokens?.[scope]
      const updated = await updateHybridScopeDecision(projectId, scope, newStatus, token)
      setMatrixProjects(prev => prev.map(p => (p.projectId === updated.projectId ? updated : p)))
      const projectLabel = updated.projectCode || updated.projectName
      const scopeLabel = updated.hybridScopeLabels?.[scope] ?? targetProject?.hybridScopeLabels?.[scope] ?? scope
      setNotice(`Đã cập nhật quyết định ngành ${scopeLabel} của đồ án ${projectLabel}: ${gateDecisionLabels[newStatus]}.`)
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) {
        try { setMatrixProjects(await getProjectReviewMatrix()) } catch { /* keep current matrix and selected choice */ }
      }
      throw err
    }
  }

  const publishedCount = templates.filter(t => t.status === 'PUBLISHED').length
  const draftCount = templates.filter(t => t.status !== 'PUBLISHED').length
  const selectedMatrixProject = matrixProjects.find(p => p.projectId === selectedProjectId)

  const resolvedPeriodLabel = useMemo(() => {
    if (periodId) {
      const matched = academicContext?.academic?.periods.find(item => String(item.id) === periodId || item.code === periodId)
      if (matched) return `${matched.code} · ${matched.name}`
      if (!/^\d+$/.test(periodId)) return decodeURIComponent(periodId)
      return 'Kỳ đồ án đang chọn'
    }
    if (env.reviewGatesMockEnabled) return 'Fall 2026 · SEP490'
    return academicContext?.academic?.selectedSemester
      ? academicContext.academic.selectedSemester.code
      : 'Tất cả kỳ học'
  }, [periodId, academicContext])

  const resolvedPeriodCaption = useMemo(() => {
    if (env.reviewGatesMockEnabled) return 'Phạm vi cấu hình cổng thẩm định.'
    return academicContext?.academic?.selectedSemester?.name || 'Phạm vi cấu hình cổng thẩm định.'
  }, [academicContext])

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.trim().toLowerCase()
    return templates.filter(tmpl => {
      if (templateStatusFilter === 'PUBLISHED' && tmpl.status !== 'PUBLISHED') return false
      if (templateStatusFilter === 'DRAFT' && tmpl.status === 'PUBLISHED') return false
      if (templateModeFilter !== 'ALL' && tmpl.mode !== templateModeFilter) return false
      if (q && !`${tmpl.name} ${tmpl.code} ${tmpl.major ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [templates, templateSearch, templateStatusFilter, templateModeFilter])

  const templatePager = useClientPagination(filteredTemplates, 10)

  const templateChips: ActiveFilterChip[] = []
  if (templateStatusFilter !== 'ALL') {
    templateChips.push({ id: 'status', label: 'Trạng thái', value: templateStatusFilter === 'PUBLISHED' ? 'Đã công bố' : 'Bản nháp' })
  }
  if (templateModeFilter !== 'ALL') {
    templateChips.push({ id: 'mode', label: 'Chế độ', value: templateModeFilter === 'SINGLE_MAJOR' ? 'Đơn ngành' : 'Liên ngành' })
  }
  const hasTemplateFilters = Boolean(templateSearch.trim() || templateStatusFilter !== 'ALL' || templateModeFilter !== 'ALL')

  return (
    <WorkspacePage
      size="wide"
      title="Cấu hình & Giám sát Tiến trình Đồ án"
      eyebrow="Quản lý học vụ · Chính sách cổng kiểm duyệt"
      description="Thiết kế các cổng kiểm duyệt (R1..Rn), kiểm tra điều kiện minh chứng và ma trận theo dõi tiến độ các nhóm."
      action={
        <button
          type="button"
          onClick={() => setAiDraftOpen(true)}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-subtle px-3.5 text-sm font-semibold text-primary transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">auto_awesome</span>
          Soạn nháp bằng AI
        </button>
      }
    >
      <ReviewGatesMockNotice />
      {confirmationDialog}
      {/* Alert Notices */}
      {notice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-hairline border-l-4 border-l-status-success-text bg-card p-4 text-xs font-semibold text-ink shadow-xs"
        >
          <span className="inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-status-success-text" aria-hidden="true">check_circle</span>
            <span>{notice}</span>
          </span>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setNotice(null)} className="text-ink-muted hover:text-ink">
            ✕
          </button>
        </div>
      )}

      {error && (activeTab !== 'builder' || !currentTemplate) && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-status-error-border bg-status-error-bg p-4 text-xs font-semibold text-status-error-text"
        >
          <span>✕ {error}</span>
          <button type="button" aria-label="Đóng lỗi" onClick={() => setError(null)} className="text-status-error-text hover:text-ink">
            ✕
          </button>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="ui-workspace-tabs" role="group" aria-label="Khu vực quản trị cổng kiểm duyệt">
        <button type="button" aria-pressed={activeTab === 'overview'} onClick={() => setActiveTab('overview')} className={`ui-workspace-tab ${activeTab === 'overview' ? 'is-active' : ''}`}>
          <span className="material-symbols-outlined ui-workspace-tab-icon" aria-hidden="true">library_books</span>
          <span>Thư viện mẫu tiến trình</span>
          <span className="ui-workspace-tab-count" aria-hidden="true">{templates.length}</span>
        </button>
        <button type="button" aria-pressed={activeTab === 'builder'} onClick={() => setActiveTab('builder')} className={`ui-workspace-tab ${activeTab === 'builder' ? 'is-active' : ''}`}>
          <span className="material-symbols-outlined ui-workspace-tab-icon" aria-hidden="true">tune</span>
          <span>Thiết kế cổng kiểm duyệt</span>
        </button>
        <button type="button" aria-pressed={activeTab === 'matrix'} onClick={() => { setReviewerGaps(null); setActiveTab('matrix') }} className={`ui-workspace-tab ${activeTab === 'matrix' ? 'is-active' : ''}`}>
          <span className="material-symbols-outlined ui-workspace-tab-icon" aria-hidden="true">grid_view</span>
          <span>Ma trận tiến độ</span>
          <span className="ui-workspace-tab-count" aria-hidden="true">{matrixProjects.length}</span>
        </button>
        <button
          type="button"
          aria-pressed={activeTab === 'hybrid'}
          onClick={() => {
            const currentHasHybrid = matrixProjects.find(p => p.projectId === selectedProjectId)?.hybridScopes
            if (!currentHasHybrid) {
              const firstHybrid = matrixProjects.find(p => p.mode === 'INTERDISCIPLINARY' || p.hybridScopes)
              if (firstHybrid) setSelectedProjectId(firstHybrid.projectId)
            }
            setActiveTab('hybrid')
          }}
          className={`ui-workspace-tab ${activeTab === 'hybrid' ? 'is-active' : ''}`}
        >
          <span className="material-symbols-outlined ui-workspace-tab-icon" aria-hidden="true">hub</span>
          <span>Cổng liên ngành</span>
        </button>
        <button type="button" aria-pressed={activeTab === 'defense'} onClick={() => setActiveTab('defense')} className={`ui-workspace-tab ${activeTab === 'defense' ? 'is-active' : ''}`}>
          <span className="material-symbols-outlined ui-workspace-tab-icon" aria-hidden="true">verified_user</span>
          <span>Xét điều kiện bảo vệ</span>
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-hairline bg-card p-12 text-center text-sm text-ink-muted">
          Đang tải dữ liệu tiến trình học vụ…
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW / TEMPLATES LIBRARY */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <StatTileRow
                tiles={[
                  { icon: 'calendar_month', label: 'Kỳ học áp dụng', value: resolvedPeriodLabel, hero: true, caption: resolvedPeriodCaption },
                  { icon: 'library_books', label: 'Mẫu tiến trình', value: templates.length, tone: 'info', caption: `${publishedCount} đã công bố · ${draftCount} bản nháp.` },
                  { icon: 'flag', label: 'Số cổng tiêu chuẩn', value: templates.length > 0 ? `${templates[0].gatesCount < 10 ? '0' : ''}${templates[0].gatesCount} cổng` : 'Chưa cấu hình', tone: 'neutral', caption: 'Cấu trúc kiểm duyệt tiến độ đồ án.' },
                  { icon: 'verified', label: 'Mẫu đã công bố', value: publishedCount, tone: publishedCount > 0 ? 'success' : 'warning', caption: draftCount > 0 ? `${draftCount} bản nháp đang chỉnh sửa.` : 'Sẵn sàng áp dụng cho sinh viên.' },
                ]}
              />

              {/* Template Library Table */}
              <div className="rounded-xl border border-hairline bg-card shadow-xs overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline p-4">
                  <h3 className="text-sm font-bold text-ink">Danh mục Mẫu Tiến trình Thẩm định</h3>
                  <button
                    type="button"
                    onClick={() => {
                      const newDraft: ReviewGateTemplate = {
                        id: `tmpl-draft-${Date.now()}`,
                        code: `TMPL-${Date.now().toString().slice(-4)}`,
                        name: 'Mẫu tiến trình mới (Bản nháp)',
                        projectPeriodId: periodId && /^\d+$/.test(periodId) ? Number(periodId) : null,
                        mode: 'SINGLE_MAJOR',
                        major: env.reviewGatesMockEnabled ? 'Kỹ thuật Phần mềm' : '',
                        gatesCount: 1,
                        status: 'DRAFT',
                        version: '1.0-draft',
                        concurrencyToken: '',
                        gates: [
                          {
                            id: `gate-${Date.now()}-1`,
                            code: 'R1',
                            title: 'Đợt 1: Đề cương & Đặc tả (Bản nháp)',
                            objective: 'Thẩm định đề cương chi tiết và yêu cầu chức năng.',
                            required: true,
                            blockNextGate: true,
                            start: env.reviewGatesMockEnabled ? '2026-11-01' : null,
                            end: env.reviewGatesMockEnabled ? '2026-11-15' : null,
                            reviewerPolicy: 'Người thẩm định được phân công',
                            reviewScope: 'COMMON',
                            requirements: [],
                          },
                        ],
                      }
                      setTemplates(prev => [newDraft, ...prev])
                      setSelectedTemplateId(newDraft.id)
                      setActiveTab('builder')
                      setNotice('Đã tạo bản nháp tiến trình mới. Vui lòng thiết lập cấu trúc cổng kiểm duyệt và lưu bản nháp.')
                    }}
                    className="min-h-10 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-primary-hover cursor-pointer"
                  >
                    ＋ Tạo Mẫu Tiến trình Mới
                  </button>
                </div>

                <div className="border-b border-hairline px-4 py-3">
                  <FilterToolbar
                    embedded
                    search={templateSearch}
                    onSearchChange={setTemplateSearch}
                    searchLabel="Tìm mẫu tiến trình"
                    searchPlaceholder="Tìm theo tên mẫu, mã mẫu hoặc chuyên ngành..."
                    debounceMs={0}
                    tabs={[
                      { value: 'ALL', label: 'Tất cả', count: templates.length },
                      { value: 'PUBLISHED', label: 'Đã công bố', count: publishedCount },
                      { value: 'DRAFT', label: 'Bản nháp', count: draftCount },
                    ]}
                    activeTab={templateStatusFilter}
                    onTabChange={v => setTemplateStatusFilter(v as 'ALL' | 'PUBLISHED' | 'DRAFT')}
                    tabsLabel="Lọc mẫu tiến trình theo trạng thái"
                    controls={
                      <label className="ft-select-wrap">
                        <span className="sr-only">Chế độ mẫu</span>
                        <select
                          className="ft-select"
                          aria-label="Lọc mẫu theo chế độ"
                          value={templateModeFilter}
                          onChange={e => setTemplateModeFilter(e.target.value as 'ALL' | 'SINGLE_MAJOR' | 'INTERDISCIPLINARY')}
                        >
                          <option value="ALL">Tất cả chế độ</option>
                          <option value="SINGLE_MAJOR">Đơn ngành</option>
                          <option value="INTERDISCIPLINARY">Liên ngành</option>
                        </select>
                      </label>
                    }
                    activeChips={templateChips}
                    onRemoveChip={id => {
                      if (id === 'status') setTemplateStatusFilter('ALL')
                      if (id === 'mode') setTemplateModeFilter('ALL')
                    }}
                    onClearAll={() => {
                      setTemplateSearch('')
                      setTemplateStatusFilter('ALL')
                      setTemplateModeFilter('ALL')
                    }}
                    hasActiveFilters={hasTemplateFilters}
                    resultSummary={`Hiển thị ${filteredTemplates.length}/${templates.length} mẫu`}
                  />
                </div>

                {filteredTemplates.length === 0 ? (
                  <div className="p-6">
                    <WorkspaceEmptyState
                      title={hasTemplateFilters ? 'Không tìm thấy mẫu tiến trình phù hợp' : 'Chưa có mẫu tiến trình nào'}
                      message={hasTemplateFilters ? 'Thử thay đổi từ khóa hoặc xóa bộ lọc hiện tại.' : 'Nhấn "Tạo Mẫu Tiến trình Mới" để thiết lập các cổng kiểm duyệt cho kỳ học.'}
                    />
                  </div>
                ) : (
                <div className="overflow-x-auto">
                  <Table className="w-full min-w-[640px] text-left text-xs">
                    <TableHead className="font-semibold uppercase tracking-wider text-ink-muted">
                      <tr>
                        <th className="py-3 px-4">Tên Mẫu Tiến trình</th>
                        <th className="py-3 px-4">Chế độ / Ngành</th>
                        <th className="py-3 px-3 text-center">Số cổng</th>
                        <th className="py-3 px-3 text-center">Phiên bản</th>
                        <th className="py-3 px-3 text-center">Trạng thái</th>
                        <th className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </TableHead>
                    <tbody className="divide-y divide-hairline text-ink-soft">
                      {templatePager.paginatedItems.map(tmpl => (
                        <tr key={tmpl.id} className="hover:bg-canvas">
                          <td className="py-3.5 px-4">
                            <strong className="block font-bold text-ink">{tmpl.name}</strong>
                            <span className="text-xs text-ink-muted font-mono">{tmpl.code}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="block font-semibold text-ink">
                              {tmpl.mode === 'SINGLE_MAJOR' ? 'Đơn ngành' : 'Liên ngành'}
                            </span>
                            {tmpl.major && tmpl.major !== 'INTERDISCIPLINARY' && tmpl.major !== 'SINGLE_MAJOR' && (
                              <span className="text-xs text-ink-muted">{tmpl.major}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold">{tmpl.gatesCount}</td>
                          <td className="py-3.5 px-3 text-center font-mono">v{tmpl.version}</td>
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                                tmpl.status === 'PUBLISHED'
                                  ? 'bg-status-success-bg text-status-success-text border-status-success-border'
                                  : 'bg-status-warning-bg text-status-warning-text border-status-warning-border'
                              }`}
                            >
                              {tmpl.status === 'PUBLISHED' ? 'ĐÃ CÔNG BỐ' : 'BẢN NHÁP'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-2">
                            {tmpl.status === 'PUBLISHED' && (
                              <button
                                type="button"
                                onClick={() => handleCloneTemplate(tmpl)}
                                className="min-h-9 whitespace-nowrap rounded-md border border-hairline px-2.5 py-1 font-semibold text-ink-soft hover:bg-canvas"
                                title="Nhân bản tạo phiên bản nháp mới"
                              >
                                Nhân bản
                              </button>
                            )}
                            {tmpl.status === 'DRAFT' && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void handleDeleteDraftTemplate(tmpl)}
                                className="min-h-9 whitespace-nowrap rounded-md border border-status-error-border bg-card px-2.5 py-1 font-semibold text-status-error-text hover:bg-status-error-bg disabled:opacity-50"
                                title="Xóa bản nháp tiến trình này"
                              >
                                Xóa nháp
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTemplateId(tmpl.id)
                                setActiveTab('builder')
                              }}
                              className="min-h-9 whitespace-nowrap rounded-md border border-hairline px-3 py-1 font-semibold text-primary hover:bg-canvas"
                            >
                              Thiết kế cổng ↗
                            </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                )}
                {templatePager.showPagination && (
                  <div className="border-t border-hairline px-4 py-3">
                    <Pagination
                      page={templatePager.page}
                      pages={templatePager.pages}
                      total={templatePager.total}
                      pageSize={templatePager.pageSize}
                      onPage={templatePager.setPage}
                      onPageSizeChange={templatePager.setPageSize}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: BUILDER */}
          {activeTab === 'builder' && currentTemplate && (
            <>
            {!env.reviewGatesMockEnabled && /^\d+$/.test(currentTemplate.id) &&
              <GateWorkbookPanel template={currentTemplate} dirty={dirtyTemplateIds.has(currentTemplate.id)}
                onSaved={updated => {
                  setTemplates(previous => previous.map(item => item.id === updated.id ? updated : item))
                  setNotice('Đã lưu mẫu Gate từ workbook. Tải lại workbook sẽ có dữ liệu mới nhất.')
                }} />}
            <ReviewGateBuilder
              key={currentTemplate.id}
              template={currentTemplate}
              majors={academicContext?.academic?.majors ?? []}
              onChange={handleTemplateChange}
              onSaveDraft={handleSaveDraft}
              onPublish={handlePublish}
              onClone={handleCloneTemplate}
              onDeleteDraft={tmpl => void handleDeleteDraftTemplate(tmpl)}
              busy={busy}
              formError={error}
            />
            </>
          )}

          {activeTab === 'builder' && !currentTemplate && <p role="status" className="rounded-lg border border-hairline bg-card p-5 text-sm text-ink-soft">Chưa có mẫu tiến trình để thiết kế. Hãy tạo mẫu từ thư viện Mẫu Tiến trình.</p>}

          {/* TAB 3: MATRIX */}
          {activeTab === 'matrix' && (
            <>
            {scopedReviewerGaps?.state === 'ready' && scopedReviewerGaps.count > 0 ? <p role="alert" className="mb-4 rounded-lg border border-l-4 border-status-warning-border border-l-accent-amber bg-status-warning-bg p-4 text-sm text-status-warning-text">Có ít nhất {scopedReviewerGaps.count} đồ án thiếu reviewer trong phạm vi bộ môn. Mở hồ sơ để kiểm tra và phân công.</p> : null}
            {scopedReviewerGaps?.state === 'unavailable' ? <p role="status" className="mb-4 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">Chưa kiểm tra được tình trạng phân công reviewer. Ma trận trạng thái vẫn có thể xem.</p> : null}
            <ProjectProgressMatrix
              projects={matrixProjects}
              onUpdateDecision={handleUpdateDecision}
              onSelectProject={(id) => setSelectedProjectId(id)}
              onSelectHybridProject={(id) => {
                setSelectedProjectId(id)
                setActiveTab('hybrid')
              }}
            />
            </>
          )}

          {/* TAB 4: HYBRID */}
          {activeTab === 'hybrid' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-card p-4 shadow-2xs">
                <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
                  <label htmlFor="hybrid-project-select" className="shrink-0 text-xs font-bold text-ink-soft">
                    Đồ án liên ngành:
                  </label>
                  <select
                    id="hybrid-project-select"
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                    className="min-h-11 min-w-0 max-w-full flex-1 rounded-lg border border-hairline bg-card px-3 py-1.5 text-xs font-medium text-ink focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {matrixProjects
                      .filter(p => p.mode === 'INTERDISCIPLINARY' || p.hybridScopes)
                      .map(p => (
                        <option key={p.projectId} value={p.projectId}>
                          {p.projectCode ?? p.projectId} — {p.projectName}
                        </option>
                      ))}
                  </select>
                </div>
                <span className="text-xs text-ink-muted">
                  {matrixProjects.filter(p => p.mode === 'INTERDISCIPLINARY' || p.hybridScopes).length} đồ án liên ngành
                </span>
              </div>

              <InterdisciplinaryGatePanel
                projectId={selectedProjectId}
                projectCode={selectedMatrixProject?.projectCode}
                hybridScopes={matrixProjects.find(p => p.projectId === selectedProjectId)?.hybridScopes}
                hybridScopeLabels={matrixProjects.find(p => p.projectId === selectedProjectId)?.hybridScopeLabels}
                hybridScopeDecisionDetails={matrixProjects.find(p => p.projectId === selectedProjectId)?.hybridScopeDecisionDetails}
                hybridScopeCapabilities={matrixProjects.find(p => p.projectId === selectedProjectId)?.hybridScopeCapabilities}
                onUpdateScopeDecision={handleUpdateHybridScopeDecision}
              />
            </div>
          )}

          {/* TAB 5: DEFENSE READINESS */}
          {activeTab === 'defense' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-card p-4 shadow-2xs">
                <div className="flex min-w-0 max-w-full flex-1 flex-wrap items-center gap-2">
                  <label htmlFor="defense-project-select" className="shrink-0 text-xs font-bold text-ink-soft">
                    Chọn đồ án thẩm định điều kiện bảo vệ:
                  </label>
                  <select
                    id="defense-project-select"
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                    className="min-h-11 min-w-0 max-w-full flex-1 truncate rounded-lg border border-hairline bg-card py-1.5 pl-3 pr-9 text-xs font-semibold text-ink"
                  >
                    {matrixProjects.map(p => (
                      <option key={p.projectId} value={p.projectId}>
                        {p.projectCode ?? p.projectId} — {p.projectName} ({p.mode === 'INTERDISCIPLINARY' ? 'Liên ngành' : 'Đơn ngành'})
                      </option>
                    ))}
                  </select>
                </div>
                <span className="shrink-0 whitespace-nowrap text-xs text-ink-muted">
                  Mã đồ án: <strong className="text-ink">{selectedMatrixProject?.projectCode ?? defenseSummary?.projectCode ?? selectedProjectId}</strong>
                </span>
              </div>

              {defenseError && <p role="alert" className="text-xs text-status-error-text">{defenseError}</p>}
              {defenseSummary ? (
                <DefenseReadinessChecker
                  summary={defenseSummary}
                  onRecheck={() => setReadinessRefresh(value => value + 1)}
                />
              ) : (
                <div className="rounded-xl border border-hairline bg-card p-8 text-center text-sm text-ink-muted">
                  Chưa có dữ liệu điều kiện bảo vệ cho đồ án {selectedMatrixProject?.projectCode ?? selectedMatrixProject?.projectName ?? selectedProjectId}.
                </div>
              )}
            </div>
          )}
        </>
      )}

      <DepartmentAiDraftBar
        open={aiDraftOpen}
        onClose={() => setAiDraftOpen(false)}
        title="Soạn nháp Khung cổng thẩm định bằng AI"
        description="Tải tệp Đề cương / Lịch học kỳ (PDF, DOCX, XLSX) hoặc mô tả yêu cầu để AI đề xuất các cổng G1..Gn với trọng số 100% và minh chứng theo ngành."
        toolMode="REVIEW_GATE_SETUP"
        pageContext="/department/review-gates"
        projectPeriodId={periodId && /^\d+$/.test(periodId) ? Number(periodId) : undefined}
        placeholder="VD: Thiết kế 3 cổng thẩm định G1 (25%), G2 (35%), G3 (40% chặn bảo vệ) cho đồ án tốt nghiệp chuyên ngành Kỹ thuật phần mềm..."
        starters={[
          {
            label: 'Khung 3 cổng đơn ngành chuẩn (G1–G3)',
            prompt: 'Đề xuất khung 3 cổng thẩm định G1 (25% khởi tạo & SRS), G2 (35% thiết kế & demo giữa kỳ), G3 (40% nghiệm thu & chặn bảo vệ) với đầy đủ yêu cầu minh chứng.',
          },
          {
            label: 'Khung liên ngành (COMMON + MAJOR_SPECIFIC)',
            prompt: 'Đề xuất khung 3 cổng thẩm định cho đồ án liên ngành, có cả yêu cầu minh chứng chung (COMMON) và theo chuyên ngành (MAJOR_SPECIFIC).',
          },
          {
            label: 'Trích xuất từ tệp đề cương đính kèm',
            prompt: 'Đọc tệp đề cương / kế hoạch học kỳ đính kèm và trích xuất cấu trúc cổng thẩm định G1..Gn kèm mốc ngày và yêu cầu minh chứng.',
          },
        ]}
        renderResult={response =>
          response.draft?.reviewGateSetup ? (
            <AssistantReviewGateSetupCard
              runId={response.runId}
              plan={response.draft.reviewGateSetup}
              defaultPeriodId={periodId && /^\d+$/.test(periodId) ? Number(periodId) : undefined}
              onApplied={result => {
                setAiDraftOpen(false)
                setNotice(`Đã tạo bản nháp khung cổng "${result.name}" (${result.code}) ở trạng thái DRAFT.`)
                void loadAllData().then(() => {
                  setSelectedTemplateId(String(result.templateId))
                  setActiveTab('builder')
                })
              }}
            />
          ) : (
            <div className="rounded-xl border border-hairline bg-canvas p-4 text-sm text-ink-soft whitespace-pre-wrap">
              {response.answer}
            </div>
          )
        }
      />
    </WorkspacePage>
  )
}

export default ReviewGateGovernancePage
