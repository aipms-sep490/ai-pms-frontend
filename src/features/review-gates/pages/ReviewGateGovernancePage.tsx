import { Table, TableHead } from '../../../components/ui/Table'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { Pagination } from '../../../components/ui/Pagination'
import { useClientPagination } from '../../../components/ui/useClientPagination'
import '../../../components/ui/workspace-tabs.css'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import {
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

export function ReviewGateGovernancePage() {
  const academicContext = useContext(AcademicWorkflowContext)
  const departmentKey = (academicContext?.academic?.departments ?? []).map(item => item.id).filter(id => Number.isSafeInteger(id) && id > 0).join(',')
  const { periodId } = useParams<{ periodId?: string }>()
  const [activeTab, setActiveTab] = useState<'overview' | 'builder' | 'matrix' | 'hybrid' | 'defense'>('overview')
  const [templates, setTemplates] = useState<ReviewGateTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
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
  const [reviewerGaps, setReviewerGaps] = useState<{ key: string; state: 'ready' | 'unavailable'; count: number } | null>(null)
  const cloneSequence = useRef(0)
  const scopedReviewerGaps = reviewerGaps?.key === departmentKey ? reviewerGaps : null

  const templatesPagination = useClientPagination(templates, 8)

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

  const publishedTemplatesCount = templates.filter(t => t.status === 'PUBLISHED').length
  const draftTemplatesCount = templates.length - publishedTemplatesCount
  const hybridProjects = matrixProjects.filter(p => p.mode === 'INTERDISCIPLINARY' || p.hybridScopes)
  const defenseReadyCount = matrixProjects.filter(p => {
    const statuses = Object.values(p.gateStatuses)
    return statuses.length > 0 && statuses.every(st => st === 'PASSED')
  }).length
  const revisionRequiredCount = matrixProjects.filter(p => Object.values(p.gateStatuses).includes('REVISION_REQUIRED')).length
  const periodLabel = periodId ? decodeURIComponent(periodId) : env.reviewGatesMockEnabled ? 'Fall 2026 · SEP490' : 'Tất cả kỳ học'

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

  async function handleUpdateDecision(
    projectId: string,
    gateCode: string,
    newStatus: 'PASSED' | 'REVISION_REQUIRED' | 'IN_REVIEW',
  ) {
    try {
      const updated = await updateGateDecision(projectId, gateCode, newStatus)
      setMatrixProjects(prev => prev.map(p => (p.projectId === updated.projectId ? updated : p)))
      setNotice(`Đã ghi nhận kết luận thẩm định cho đồ án ${projectId}: ${gateCode} → ${newStatus}.`)
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
      const token = matrixProjects.find(p => p.projectId === projectId)?.hybridScopeTokens?.[scope]
      const updated = await updateHybridScopeDecision(projectId, scope, newStatus, token)
      setMatrixProjects(prev => prev.map(p => (p.projectId === updated.projectId ? updated : p)))
      setNotice(`Đã cập nhật quyết định ngành ${scope} của đồ án ${projectId}: ${newStatus}.`)
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) {
        try { setMatrixProjects(await getProjectReviewMatrix()) } catch { /* keep current matrix and selected choice */ }
      }
      throw err
    }
  }

  const tabs: {
    id: 'overview' | 'builder' | 'matrix' | 'hybrid' | 'defense'
    label: string
    icon: string
    count?: number
    badgeTone?: 'default' | 'warning' | 'danger' | 'success'
    onSelect?: () => void
  }[] = [
    {
      id: 'overview',
      label: 'Thư viện Mẫu Tiến trình (Overview)',
      icon: 'library_books',
      count: templates.length,
    },
    {
      id: 'builder',
      label: 'Thiết kế Review Gates (Builder)',
      icon: 'tune',
      count: currentTemplate ? currentTemplate.gates.length : undefined,
    },
    {
      id: 'matrix',
      label: 'Ma trận Giám sát Tiến trình (Matrix)',
      icon: 'grid_view',
      count: matrixProjects.length,
      badgeTone: revisionRequiredCount > 0 ? 'warning' : 'default',
      onSelect: () => { setReviewerGaps(null); setActiveTab('matrix') },
    },
    {
      id: 'hybrid',
      label: 'Gate Liên ngành (Interdisciplinary)',
      icon: 'hub',
      count: hybridProjects.length,
      onSelect: () => {
        const currentHasHybrid = matrixProjects.find(p => p.projectId === selectedProjectId)?.hybridScopes
        if (!currentHasHybrid) {
          const firstHybrid = matrixProjects.find(p => p.mode === 'INTERDISCIPLINARY' || p.hybridScopes)
          if (firstHybrid) setSelectedProjectId(firstHybrid.projectId)
        }
        setActiveTab('hybrid')
      },
    },
    {
      id: 'defense',
      label: 'Xét Điều kiện Bảo vệ (Defense Readiness)',
      icon: 'verified',
      count: defenseReadyCount,
      badgeTone: defenseReadyCount > 0 ? 'success' : 'default',
    },
  ]

  return (
    <WorkspacePage
      className="space-y-5"
      title="Cấu hình & Giám sát Tiến trình Đồ án"
      eyebrow="Quản lý Học vụ · Review Gate Governance"
      description="Thiết kế các đợt thẩm định học thuật (Review Gates R1..Rn), kiểm tra điều kiện minh chứng và ma trận theo dõi tiến độ các nhóm."
    >
      <ReviewGatesMockNotice />

      {/* Alert Notices */}
      {notice && (
        <div
          role="status"
          className="flex items-center justify-between rounded-xl border border-status-success-border bg-status-success-bg p-4 text-xs font-semibold text-status-success-text"
        >
          <span>✓ {notice}</span>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setNotice(null)} className="text-status-success-text hover:text-ink">
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

      {/* Main Navigation Tabs styled identically to WorkspaceTabs while preserving button role & exact label for governance tests */}
      <nav className="ui-workspace-tabs" aria-label="Điều hướng quản trị Review Gates">
        {tabs.map((tab) => {
          const active = tab.id === activeTab
          const toneClass = tab.badgeTone && tab.badgeTone !== 'default' ? `is-${tab.badgeTone}` : ''
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={active}
              aria-label={tab.label}
              className={`ui-workspace-tab ${active ? 'is-active' : ''}`}
              onClick={() => (tab.onSelect ? tab.onSelect() : setActiveTab(tab.id))}
            >
              <span className="material-symbols-outlined ui-workspace-tab-icon" aria-hidden="true">
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {tab.count != null && (
                <span className={`ui-workspace-tab-count ${toneClass}`} aria-hidden="true">
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {loading ? (
        <div className="rounded-xl border border-hairline bg-card p-12 text-center text-sm text-ink-muted">
          Đang tải dữ liệu tiến trình học vụ…
        </div>
      ) : (
        <>
          <StatTileRow
            tiles={[
              {
                icon: 'library_books',
                label: 'Mẫu tiến trình',
                value: templates.length,
                caption: periodLabel,
                hero: true,
              },
              {
                icon: 'grid_view',
                label: 'Đồ án trên ma trận',
                value: matrixProjects.length,
                tone: 'info',
                caption: `${hybridProjects.length} đồ án liên ngành · ${revisionRequiredCount} cần sửa`,
              },
              {
                icon: 'verified',
                label: 'Sẵn sàng bảo vệ',
                value: defenseReadyCount,
                tone: defenseReadyCount > 0 ? 'success' : 'neutral',
                caption: templates.length > 0
                  ? `${templates[0].gatesCount < 10 ? '0' : ''}${templates[0].gatesCount} Gates tiêu chuẩn`
                  : 'Chưa cấu hình',
              },
              {
                icon: 'edit_note',
                label: 'Cần chỉnh sửa Review',
                value: revisionRequiredCount,
                tone: revisionRequiredCount > 0 ? 'warning' : 'neutral',
                caption: scopedReviewerGaps?.state === 'ready'
                  ? (scopedReviewerGaps.count > 0 ? `Cần phân công thêm ${scopedReviewerGaps.count} reviewer` : 'Đã phân công đủ reviewer')
                  : 'Đồ án có cổng bị yêu cầu bổ sung',
              },
            ]}
          />

          {/* TAB 1: OVERVIEW / TEMPLATES LIBRARY */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Template Library Table */}
              <div className="rounded-xl border border-hairline bg-card shadow-xs overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-ink">Danh mục Mẫu Tiến trình Review</h3>
                    <StatusBadge tone="neutral" label={`${templates.length} mẫu`} />
                    {publishedTemplatesCount > 0 && (
                      <StatusBadge tone="success" label={`${publishedTemplatesCount} đã công bố`} />
                    )}
                    {draftTemplatesCount > 0 && (
                      <StatusBadge tone="warning" label={`${draftTemplatesCount} bản nháp`} />
                    )}
                  </div>
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
                            reviewerPolicy: 'Assigned Reviewer',
                            reviewScope: 'COMMON',
                            requirements: [],
                          },
                        ],
                      }
                      setTemplates(prev => [newDraft, ...prev])
                      setSelectedTemplateId(newDraft.id)
                      setActiveTab('builder')
                      setNotice('Đã tạo bản nháp tiến trình mới. Vui lòng thiết lập cấu trúc Gates và lưu bản nháp.')
                    }}
                    className="min-h-10 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-primary-hover cursor-pointer"
                  >
                    ＋ Tạo Mẫu Tiến trình Mới
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <Table className="w-full min-w-[640px] text-left text-xs">
                    <TableHead className="font-semibold uppercase tracking-wider text-ink-muted">
                      <tr>
                        <th className="py-3 px-4">Tên Mẫu Tiến trình</th>
                        <th className="py-3 px-4">Chế độ / Ngành</th>
                        <th className="py-3 px-3 text-center">Số Gate</th>
                        <th className="py-3 px-3 text-center">Phiên bản</th>
                        <th className="py-3 px-3 text-center">Trạng thái</th>
                        <th className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </TableHead>
                    <tbody className="divide-y divide-hairline text-ink-soft">
                      {templatesPagination.paginatedItems.map(tmpl => (
                        <tr key={tmpl.id} className="hover:bg-canvas">
                          <td className="py-3.5 px-4">
                            <strong className="block font-bold text-ink">{tmpl.name}</strong>
                            <span className="text-xs text-ink-muted font-mono">{tmpl.code}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="block font-semibold text-ink">
                              {tmpl.mode === 'SINGLE_MAJOR' ? 'Đơn ngành' : 'Liên ngành'}
                            </span>
                            <span className="text-xs text-ink-muted">{tmpl.major}</span>
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold tabular-nums">{tmpl.gatesCount}</td>
                          <td className="py-3.5 px-3 text-center font-mono">v{tmpl.version}</td>
                          <td className="py-3.5 px-3 text-center">
                            <StatusBadge
                              tone={tmpl.status === 'PUBLISHED' ? 'success' : 'warning'}
                              label={tmpl.status === 'PUBLISHED' ? 'ĐÃ CÔNG BỐ' : 'BẢN NHÁP'}
                            />
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            {tmpl.status === 'PUBLISHED' && (
                              <button
                                type="button"
                                onClick={() => handleCloneTemplate(tmpl)}
                                className="min-h-9 rounded-md border border-hairline px-2.5 py-1 font-semibold text-ink-soft hover:bg-canvas"
                                title="Nhân bản tạo phiên bản nháp mới"
                              >
                                Nhân bản
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTemplateId(tmpl.id)
                                setActiveTab('builder')
                              }}
                              className="min-h-9 rounded-md border border-hairline px-3 py-1 font-semibold text-primary hover:bg-canvas"
                            >
                              Thiết kế Gate ↗
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                {templatesPagination.showPagination && (
                  <div className="border-t border-hairline px-5 py-3">
                    <Pagination
                      page={templatesPagination.page}
                      pages={templatesPagination.totalPages}
                      total={templatesPagination.total}
                      pageSize={templatesPagination.pageSize}
                      pageSizeOptions={[8, 16, 30]}
                      onPage={templatesPagination.setPage}
                      onPageSizeChange={templatesPagination.setPageSize}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: BUILDER */}
          {activeTab === 'builder' && currentTemplate && (
            <>
              {!env.reviewGatesMockEnabled && /^\d+$/.test(currentTemplate.id) && (
                <GateWorkbookPanel
                  template={currentTemplate}
                  dirty={dirtyTemplateIds.has(currentTemplate.id)}
                  onSaved={updated => {
                    setTemplates(previous => previous.map(item => item.id === updated.id ? updated : item))
                    setNotice('Đã lưu mẫu Gate từ workbook. Tải lại workbook sẽ có dữ liệu mới nhất.')
                  }}
                />
              )}
              <ReviewGateBuilder
                key={currentTemplate.id}
                template={currentTemplate}
                onChange={handleTemplateChange}
                onSaveDraft={handleSaveDraft}
                onPublish={handlePublish}
                onClone={handleCloneTemplate}
                busy={busy}
                formError={error}
              />
            </>
          )}

          {activeTab === 'builder' && !currentTemplate && (
            <p role="status" className="rounded-xl border border-hairline bg-card p-5 text-sm text-ink-soft">
              Chưa có mẫu tiến trình để thiết kế. Hãy tạo mẫu từ thư viện Mẫu Tiến trình.
            </p>
          )}

          {/* TAB 3: MATRIX */}
          {activeTab === 'matrix' && (
            <>
              {scopedReviewerGaps?.state === 'ready' && scopedReviewerGaps.count > 0 ? (
                <p role="alert" className="rounded-xl border border-l-4 border-status-warning-border border-l-accent-amber bg-status-warning-bg p-4 text-sm text-status-warning-text">
                  Có ít nhất {scopedReviewerGaps.count} đồ án thiếu reviewer trong phạm vi bộ môn. Mở hồ sơ để kiểm tra và phân công.
                </p>
              ) : null}
              {scopedReviewerGaps?.state === 'unavailable' ? (
                <p role="status" className="rounded-xl border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">
                  Chưa kiểm tra được tình trạng phân công reviewer. Ma trận trạng thái vẫn có thể xem.
                </p>
              ) : null}
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
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-card px-5 py-3.5 shadow-2xs">
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
                    {hybridProjects.map(p => (
                      <option key={p.projectId} value={p.projectId}>
                        {p.projectId} — {p.projectName}
                      </option>
                    ))}
                  </select>
                </div>
                <StatusBadge tone="info" label={`${hybridProjects.length} đồ án liên ngành`} />
              </div>

              <InterdisciplinaryGatePanel
                projectId={selectedProjectId}
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
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-card px-5 py-3.5 shadow-2xs">
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="defense-project-select" className="text-xs font-bold text-ink-soft">
                    Chọn đồ án thẩm định điều kiện bảo vệ:
                  </label>
                  <select
                    id="defense-project-select"
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                    className="min-h-11 rounded-lg border border-hairline bg-card px-3 py-1.5 text-xs font-medium text-ink"
                  >
                    {matrixProjects.map(p => (
                      <option key={p.projectId} value={p.projectId}>
                        {p.projectId} — {p.projectName} ({p.mode === 'INTERDISCIPLINARY' ? 'Liên ngành' : 'Đơn ngành'})
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-xs text-ink-muted">
                  Mã dự án: <strong className="font-mono text-ink">{selectedProjectId}</strong>
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
                  Chưa có dữ liệu điều kiện bảo vệ cho đồ án {selectedProjectId}.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </WorkspacePage>
  )
}

export default ReviewGateGovernancePage
