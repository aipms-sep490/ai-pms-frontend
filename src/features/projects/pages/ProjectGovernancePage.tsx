import { DepartmentGovernanceOverview } from '../components/DepartmentGovernanceOverview'
import { displayLabel } from '../../../components/ui/display-label'
import { FilterToolbar, type ActiveFilterChip } from '../../../components/ui/FilterToolbar'
import { ListLoading } from '../../../components/ui/ListLoading'
import { Modal } from '../../../components/ui/Modal'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { WorkspaceTabs } from '../../../components/ui/WorkspaceTabs'
import type { BadgeTone } from '../../../components/ui/status-badge-tone'
import { AssignmentManagementPanel } from '../../supervisors/components/AssignmentManagementPanel'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { useParams } from 'react-router-dom'
import { getMeetings } from '../../../services/api/meetings.api'
import { getProgressReports } from '../../../services/api/progress-reports.api'
import { getProject } from '../../../services/api/projects.api'
import { readAllPages } from '../../../services/api/paged-read'
import { HttpError } from '../../../services/http/http-client'
import * as api from '../api/project-governance-api'
import { localDateTime, toUtcDateTime } from '../../execution/execution-utils'

const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value))
    : '—'

function errorText(reason: unknown) {
  if (reason instanceof HttpError) {
    if (reason.status === 403) return 'Bạn chưa có quyền thao tác trong đồ án này.'
    if (reason.status === 409) return 'Dữ liệu vừa thay đổi. Danh sách mới đã được tải lại; hãy kiểm tra trước khi lưu.'
    if (reason.status === 404) return 'Đồ án hoặc bản ghi không còn tồn tại.'
    if (reason.status === 400) return reason.problem?.detail || 'Dữ liệu không hợp lệ theo quy tắc hệ thống.'
  }
  return 'Chưa hoàn tất thao tác. Hãy thử tải lại.'
}

function actionTone(status: string): BadgeTone {
  if (status === 'DONE') return 'success'
  if (status === 'BLOCKED') return 'danger'
  if (status === 'IN_PROGRESS') return 'info'
  if (status === 'CANCELLED') return 'neutral'
  return 'warning'
}

type GovTab = 'cycles' | 'actions' | 'evidence'

export function ProjectGovernancePage() {
  const projectId = Number(useParams().projectId)
  const errorSummary = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<GovTab>('cycles')

  // Independent pagination state per list so paging one list never blanks out the others.
  const [cyclePage, setCyclePage] = useState(1)
  const [actionPage, setActionPage] = useState(1)
  const [evidencePage, setEvidencePage] = useState(1)

  // Client filters per tab
  const [cycleTypeFilter, setCycleTypeFilter] = useState('ALL')
  const [actionSearch, setActionSearch] = useState('')
  const [actionStatusFilter, setActionStatusFilter] = useState('ALL')
  const [evidenceSearch, setEvidenceSearch] = useState('')
  const [evidenceStatusFilter, setEvidenceStatusFilter] = useState('ALL')

  // Modal editors
  const [cycleModalOpen, setCycleModalOpen] = useState(false)
  const [editingCycle, setEditingCycle] = useState<api.ReportingCycle | null>(null)
  const [actionModalOpen, setActionModalOpen] = useState(false)
  const [editingAction, setEditingAction] = useState<api.ProjectActionItem | null>(null)

  const [data, setData] = useState<Awaited<ReturnType<typeof loadData>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    setCyclePage(1)
    setActionPage(1)
    setEvidencePage(1)
  }, [projectId])
  useEffect(() => { if (error) errorSummary.current?.focus() }, [error])

  const readVersion = useRef(0)
  const load = useCallback(async () => {
    if (!Number.isInteger(projectId) || projectId < 1) {
      setError('Mã đồ án không hợp lệ.')
      setLoading(false)
      return
    }
    const current = ++readVersion.current
    setLoading(true)
    try {
      const next = await loadData(projectId, cyclePage, actionPage, evidencePage)
      if (current === readVersion.current) {
        setData(next)
        setError(null)
      }
    } catch (reason) {
      if (current === readVersion.current) setError(errorText(reason))
    } finally {
      if (current === readVersion.current) setLoading(false)
    }
  }, [projectId, cyclePage, actionPage, evidencePage])

  useEffect(() => {
    const requestVersion = readVersion
    void load()
    return () => { requestVersion.current++ }
  }, [load])

  const mutationLock = useRef(false)
  const run = async (operation: () => Promise<unknown>, success: string) => {
    if (mutationLock.current) return
    mutationLock.current = true
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await operation()
      await load()
      setNotice(success)
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) await load()
      setError(errorText(reason))
    } finally {
      mutationLock.current = false
      setBusy(false)
    }
  }

  const canManage = Boolean(
    data
    && api.canManageProjectGovernance(data.governance)
    && data.project.academicScope?.leadDepartmentId === data.governance.actorScope.departmentId,
  )

  const sources = useMemo(() => {
    if (!data) return []
    return [
      ...data.meetings.map(item => ({ value: `MEETING:${item.id}`, title: `Cuộc họp: ${item.title}` })),
      ...data.reports.map(item => ({ value: `PROGRESS_REPORT:${item.id}`, title: `Báo cáo tiến độ (${date(item.periodStart)})` })),
    ]
  }, [data])

  const filteredCycles = useMemo(() => {
    if (!data) return []
    if (cycleTypeFilter === 'ALL') return data.cycles
    return data.cycles.filter(item => item.reportType === cycleTypeFilter)
  }, [data, cycleTypeFilter])

  const filteredActions = useMemo(() => {
    if (!data) return []
    const q = actionSearch.trim().toLowerCase()
    return data.actions.filter(item => {
      if (actionStatusFilter !== 'ALL' && item.status !== actionStatusFilter) return false
      if (q && !`${item.title} ${item.description ?? ''} ${displayLabel(item.status)}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [data, actionSearch, actionStatusFilter])

  const filteredEvidence = useMemo(() => {
    if (!data) return []
    const q = evidenceSearch.trim().toLowerCase()
    return data.evidence.filter(item => {
      if (evidenceStatusFilter !== 'ALL' && item.verificationStatus !== evidenceStatusFilter) return false
      if (q) {
        const extra = item as typeof item & { sourceTitle?: string | null; submittedByName?: string | null; majorName?: string | null }
        if (!`${extra.sourceTitle ?? ''} ${displayLabel(item.sourceType)} ${displayLabel(item.classification)} ${extra.majorName ?? ''} ${extra.submittedByName ?? ''} ${item.notes ?? ''}`.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [data, evidenceSearch, evidenceStatusFilter])

  const resolveSource = (item: NonNullable<typeof data>['actions'][number]) => {
    if (!data) return displayLabel(item.sourceType)
    if (item.meetingId) {
      const m = data.meetings.find(x => x.id === item.meetingId)
      return m ? `Cuộc họp: ${m.title}` : displayLabel(item.sourceType)
    }
    if (item.progressReportId) {
      const r = data.reports.find(x => x.id === item.progressReportId)
      return r ? `Báo cáo tiến độ (${date(r.periodStart)})` : displayLabel(item.sourceType)
    }
    return displayLabel(item.sourceType)
  }

  const eyebrow = data?.project ? `${data.project.code} · ${data.project.title}` : 'Điều phối đồ án'

  const actionChips: ActiveFilterChip[] = []
  if (actionStatusFilter !== 'ALL') actionChips.push({ id: 'status', label: 'Trạng thái', value: displayLabel(actionStatusFilter) })
  const evidenceChips: ActiveFilterChip[] = []
  if (evidenceStatusFilter !== 'ALL') evidenceChips.push({ id: 'status', label: 'Xác minh', value: displayLabel(evidenceStatusFilter) })

  return (
    <WorkspacePage
      size="wide"
      title="Điều phối đồ án"
      description="Theo dõi lịch báo cáo, việc cần làm sau trao đổi và minh chứng của nhóm."
      eyebrow={eyebrow}
      backTo="/department/portfolio"
      backLabel="Danh mục đồ án"
      className="execution-page space-y-6"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại" disabled={loading || busy} onClick={() => void load()} />
          {canManage && (
            <>
              <Button icon="event_repeat" variant="secondary" disabled={busy} onClick={() => { setEditingCycle(null); setCycleModalOpen(true) }}>
                Tạo lịch nộp
              </Button>
              <Button icon="add_task" disabled={busy || !sources.length} onClick={() => { setEditingAction(null); setActionModalOpen(true) }}>
                Thêm công việc
              </Button>
            </>
          )}
        </div>
      }
    >
      {error && (
        <div ref={errorSummary} tabIndex={-1} role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">
          <strong>Chưa thể hoàn tất thao tác</strong>
          <p className="mt-1">{error}</p>
          <button type="button" className="mt-2 min-h-11 font-semibold underline" onClick={() => void load()}>Tải lại</button>
        </div>
      )}
      {notice && (
        <p role="status" className="flex items-center gap-2 rounded-lg border border-hairline border-l-4 border-l-status-success-text bg-card p-4 text-sm text-ink shadow-xs">
          <span className="material-symbols-outlined text-[18px] text-status-success-text" aria-hidden="true">check_circle</span>
          <span>{notice}</span>
        </p>
      )}
      {loading && !data && <ListLoading label="Đang tải thông tin điều phối…" />}

      {data && (
        <div className="space-y-6">
          <StatTileRow
            tiles={[
              { icon: 'event_repeat', label: 'Lịch nộp báo cáo', value: data.totals.cycles, hero: true, caption: 'Các kỳ báo cáo đã thiết lập cho đồ án.' },
              { icon: 'task_alt', label: 'Công việc sau trao đổi', value: data.totals.actions, tone: 'info', caption: 'Đầu việc hành động từ họp và báo cáo.' },
              { icon: 'fact_check', label: 'Minh chứng học thuật', value: data.totals.evidence, tone: 'success', caption: 'Tài liệu đối chiếu trong sổ minh chứng.' },
              { icon: 'admin_panel_settings', label: 'Quyền điều phối', value: canManage ? 'Chủ trì' : 'Chỉ xem', tone: canManage ? 'success' : 'neutral', caption: canManage ? 'Bộ môn chủ trì có quyền thiết lập.' : 'Chế độ theo dõi theo phạm vi.' },
            ]}
          />
          <DepartmentGovernanceOverview governance={data.governance} />
          {!canManage && (
            <p className="rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-text" role="status">
              {api.governanceReadOnlyReason(data.governance, data.project.academicScope?.leadDepartmentId)}
            </p>
          )}

          {/* 3-Tab Governance Workspace with independent pagination per tab */}
          <WorkspaceTabs
            ariaLabel="Danh mục điều phối đồ án"
            activeId={activeTab}
            onChange={(id) => setActiveTab(id)}
            tabs={[
              { id: 'cycles' as const, label: 'Lịch báo cáo', icon: 'event_repeat', count: data.totals.cycles },
              { id: 'actions' as const, label: 'Công việc sau trao đổi', icon: 'add_task', count: data.totals.actions },
              { id: 'evidence' as const, label: 'Sổ minh chứng đồ án', icon: 'fact_check', count: data.totals.evidence },
            ]}
          />
          <section className="rounded-xl border border-hairline bg-card shadow-xs overflow-hidden">
            {loading && <div className="border-b border-hairline bg-canvas/50 px-5 py-2 text-xs text-ink-muted">Đang đồng bộ…</div>}

            <div className="p-5 space-y-4">
              {activeTab === 'cycles' && (
                <>
                  <FilterToolbar
                    embedded
                    tabs={[
                      { value: 'ALL', label: 'Tất cả loại' },
                      { value: 'WEEKLY', label: 'Hàng tuần' },
                      { value: 'MONTHLY', label: 'Hàng tháng' },
                    ]}
                    activeTab={cycleTypeFilter}
                    onTabChange={setCycleTypeFilter}
                    tabsLabel="Lọc lịch báo cáo theo chu kỳ"
                    resultSummary={`${filteredCycles.length} / ${data.totals.cycles} kỳ báo cáo`}
                    rightActions={canManage ? (
                      <Button size="sm" variant="secondary" icon="add" disabled={busy} onClick={() => { setEditingCycle(null); setCycleModalOpen(true) }}>
                        Tạo lịch nộp
                      </Button>
                    ) : undefined}
                  />
                  {!filteredCycles.length ? (
                    <p className="py-6 text-center text-sm text-ink-muted">Chưa có lịch báo cáo phù hợp trong trang này.</p>
                  ) : (
                    <ul className="divide-y divide-hairline text-sm">
                      {filteredCycles.map(item => (
                        <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <strong className="text-ink">{item.reportType === 'WEEKLY' ? 'Báo cáo hàng tuần' : 'Báo cáo hàng tháng'}</strong>
                              <StatusBadge tone={item.latePolicy === 'BLOCK' ? 'danger' : 'warning'} label={item.latePolicy === 'BLOCK' ? 'Không cho nộp trễ' : 'Đánh dấu nộp trễ'} />
                            </div>
                            <p className="text-ink-muted">Kỳ báo cáo: {date(item.periodStart)} → {date(item.periodEnd)}</p>
                            <p className="text-ink-muted">Hạn nộp: <strong className="text-ink">{date(item.deadline)}</strong></p>
                          </div>
                          {canManage && (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busy}
                              onClick={() => void run(async () => {
                                const fresh = await api.getReportingCycle(projectId, item.id)
                                setEditingCycle(fresh)
                                setCycleModalOpen(true)
                              }, 'Đã tải lịch nộp để chỉnh sửa.')}
                            >
                              Chỉnh sửa
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {data.totalPages.cycles > 1 && (
                    <nav aria-label="Phân trang lịch báo cáo" className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3 text-sm">
                      <Button className="min-h-11" variant="secondary" disabled={loading || busy || cyclePage <= 1} onClick={() => setCyclePage(p => Math.max(1, p - 1))}>Trang trước</Button>
                      <span className="text-xs text-ink-muted">Trang {cyclePage} / {data.totalPages.cycles} · {data.totals.cycles} lịch báo cáo</span>
                      <Button className="min-h-11" variant="secondary" disabled={loading || busy || cyclePage >= data.totalPages.cycles} onClick={() => setCyclePage(p => p + 1)}>Trang sau</Button>
                    </nav>
                  )}
                </>
              )}

              {activeTab === 'actions' && (
                <>
                  <FilterToolbar
                    embedded
                    search={actionSearch}
                    onSearchChange={setActionSearch}
                    searchLabel="Tìm công việc sau trao đổi"
                    searchPlaceholder="Tìm theo tiêu đề hoặc mô tả công việc..."
                    debounceMs={0}
                    tabs={[
                      { value: 'ALL', label: 'Tất cả' },
                      { value: 'TODO', label: 'Chưa bắt đầu' },
                      { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
                      { value: 'BLOCKED', label: 'Vướng mắc' },
                      { value: 'DONE', label: 'Hoàn thành' },
                    ]}
                    activeTab={actionStatusFilter}
                    onTabChange={setActionStatusFilter}
                    tabsLabel="Lọc công việc sau trao đổi theo trạng thái"
                    activeChips={actionChips}
                    onRemoveChip={id => { if (id === 'status') setActionStatusFilter('ALL') }}
                    onClearAll={() => { setActionSearch(''); setActionStatusFilter('ALL') }}
                    hasActiveFilters={Boolean(actionSearch.trim() || actionStatusFilter !== 'ALL')}
                    resultSummary={`${filteredActions.length} / ${data.totals.actions} công việc`}
                    rightActions={canManage ? (
                      <Button size="sm" variant="secondary" icon="add" disabled={busy || !sources.length} onClick={() => { setEditingAction(null); setActionModalOpen(true) }}>
                        Thêm công việc
                      </Button>
                    ) : undefined}
                  />
                  {!filteredActions.length ? (
                    <p className="py-6 text-center text-sm text-ink-muted">Không có công việc sau trao đổi phù hợp trong trang này.</p>
                  ) : (
                    <ul className="divide-y divide-hairline text-sm">
                      {filteredActions.map(item => (
                        <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <strong className="text-ink">{item.title}</strong>
                              <StatusBadge tone={actionTone(item.status)} label={displayLabel(item.status)} />
                            </div>
                            <p className="text-ink-muted">{resolveSource(item)} · Hạn: {date(item.dueAt)}</p>
                            {item.description && <p className="text-xs text-ink-soft">{item.description}</p>}
                          </div>
                          {canManage && (
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="text-xs font-medium text-ink-soft">
                                <span className="sr-only">Trạng thái {item.title}</span>
                                <select
                                  aria-label={`Trạng thái ${item.title}`}
                                  className="min-h-10 rounded-lg border border-hairline bg-card px-2.5 text-xs text-ink"
                                  value={item.status}
                                  disabled={busy}
                                  onChange={event => {
                                    const nextStatus = event.target.value
                                    void run(async () => {
                                      const fresh = await api.getProjectActionItem(projectId, item.id)
                                      await api.updateProjectActionItemStatus(projectId, item.id, nextStatus, fresh.concurrencyToken)
                                    }, 'Đã cập nhật trạng thái công việc.')
                                  }}
                                >
                                  <option value="TODO">Chưa bắt đầu</option>
                                  <option value="IN_PROGRESS">Đang thực hiện</option>
                                  <option value="BLOCKED">Đang vướng mắc</option>
                                  <option value="DONE">Hoàn thành</option>
                                  <option value="CANCELLED">Đã hủy</option>
                                </select>
                              </label>
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={busy}
                                onClick={() => void run(async () => {
                                  const fresh = await api.getProjectActionItem(projectId, item.id)
                                  setEditingAction(fresh)
                                  setActionModalOpen(true)
                                }, 'Đã tải công việc để chỉnh sửa.')}
                              >
                                Sửa
                              </Button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {data.totalPages.actions > 1 && (
                    <nav aria-label="Phân trang công việc sau trao đổi" className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3 text-sm">
                      <Button className="min-h-11" variant="secondary" disabled={loading || busy || actionPage <= 1} onClick={() => setActionPage(p => Math.max(1, p - 1))}>Trang trước</Button>
                      <span className="text-xs text-ink-muted">Trang {actionPage} / {data.totalPages.actions} · {data.totals.actions} công việc</span>
                      <Button className="min-h-11" variant="secondary" disabled={loading || busy || actionPage >= data.totalPages.actions} onClick={() => setActionPage(p => p + 1)}>Trang sau</Button>
                    </nav>
                  )}
                </>
              )}

              {activeTab === 'evidence' && (
                <>
                  <FilterToolbar
                    embedded
                    search={evidenceSearch}
                    onSearchChange={setEvidenceSearch}
                    searchLabel="Tìm minh chứng đồ án"
                    searchPlaceholder="Tìm theo nguồn, ngành, người nộp hoặc ghi chú..."
                    debounceMs={0}
                    controls={
                      <label className="ft-select-wrap">
                        <span className="sr-only">Trạng thái xác minh</span>
                        <select className="ft-select" aria-label="Lọc minh chứng theo trạng thái" value={evidenceStatusFilter} onChange={e => setEvidenceStatusFilter(e.target.value)}>
                          <option value="ALL">Tất cả trạng thái</option>
                          <option value="PENDING">Chờ xác minh</option>
                          <option value="VERIFIED">Đã xác minh</option>
                          <option value="REJECTED">Từ chối</option>
                        </select>
                      </label>
                    }
                    activeChips={evidenceChips}
                    onRemoveChip={id => { if (id === 'status') setEvidenceStatusFilter('ALL') }}
                    onClearAll={() => { setEvidenceSearch(''); setEvidenceStatusFilter('ALL') }}
                    hasActiveFilters={Boolean(evidenceSearch.trim() || evidenceStatusFilter !== 'ALL')}
                    resultSummary={`${filteredEvidence.length} / ${data.totals.evidence} minh chứng`}
                  />
                  <p className="text-xs text-ink-muted">Bổ sung minh chứng tại công việc tương ứng để giữ đúng nguồn dữ liệu.</p>
                  {!filteredEvidence.length ? (
                    <p className="py-6 text-center text-sm text-ink-muted">Không có minh chứng phù hợp trong trang này.</p>
                  ) : (
                    <ul className="divide-y divide-hairline text-sm">
                      {filteredEvidence.map(item => {
                        const extra = item as typeof item & { sourceTitle?: string | null; submittedByName?: string | null; majorName?: string | null }
                        return (
                          <li key={item.id} className="py-3.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <strong className="text-ink">{extra.sourceTitle ? `${displayLabel(item.sourceType)}: ${extra.sourceTitle}` : displayLabel(item.sourceType)}</strong>
                              <StatusBadge
                                tone={item.verificationStatus === 'VERIFIED' ? 'success' : item.verificationStatus === 'REJECTED' ? 'danger' : 'warning'}
                                label={displayLabel(item.verificationStatus)}
                              />
                            </div>
                            <span className="mt-1 block text-xs text-ink-muted">{displayLabel(item.classification)}{extra.majorName ? ` · ${extra.majorName}` : ''}{extra.submittedByName ? ` · ${extra.submittedByName}` : ''} · {date(item.submittedAt)}</span>
                            {item.notes && <p className="mt-1 text-ink-soft">{item.notes}</p>}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  {data.totalPages.evidence > 1 && (
                    <nav aria-label="Phân trang sổ minh chứng" className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3 text-sm">
                      <Button className="min-h-11" variant="secondary" disabled={loading || busy || evidencePage <= 1} onClick={() => setEvidencePage(p => Math.max(1, p - 1))}>Trang trước</Button>
                      <span className="text-xs text-ink-muted">Trang {evidencePage} / {data.totalPages.evidence} · {data.totals.evidence} minh chứng</span>
                      <Button className="min-h-11" variant="secondary" disabled={loading || busy || evidencePage >= data.totalPages.evidence} onClick={() => setEvidencePage(p => p + 1)}>Trang sau</Button>
                    </nav>
                  )}
                </>
              )}
            </div>
          </section>

          <AssignmentManagementPanel projectId={projectId} projectStatus={data.governance.projectStatus} />
        </div>
      )}

      {/* Cycle Create / Edit Modal */}
      {cycleModalOpen && (
        <Modal
          open
          title={editingCycle ? 'Chỉnh sửa lịch nộp báo cáo' : 'Tạo lịch nộp báo cáo'}
          busy={busy}
          onClose={() => { setCycleModalOpen(false); setEditingCycle(null) }}
        >
          <form
            key={editingCycle?.id ?? 'new-cycle'}
            className="api-form grid gap-3 sm:grid-cols-2"
            onSubmit={event => {
              event.preventDefault()
              const f = new FormData(event.currentTarget)
              const startIso = toUtcDateTime(String(f.get('start')))
              const endIso = toUtcDateTime(String(f.get('end')))
              const deadlineIso = toUtcDateTime(String(f.get('deadline')))
              if (!startIso || !endIso || !deadlineIso || startIso >= endIso) {
                event.currentTarget.querySelector<HTMLInputElement>('[name=end]')?.setCustomValidity('Ngày kết thúc phải sau ngày bắt đầu.')
                event.currentTarget.reportValidity()
                return
              }
              const body = { periodStart: startIso, periodEnd: endIso, deadline: deadlineIso, latePolicy: String(f.get('late')) as 'BLOCK' | 'FLAG' }
              void run(async () => {
                if (editingCycle) await api.updateReportingCycle(projectId, editingCycle.id, { ...body, concurrencyToken: editingCycle.concurrencyToken })
                else await api.createReportingCycle(projectId, { ...body, reportType: String(f.get('type')) as 'WEEKLY' | 'MONTHLY' })
                setEditingCycle(null)
                setCycleModalOpen(false)
              }, 'Đã lưu lịch nộp báo cáo.')
            }}
          >
            <label>Loại báo cáo<select name="type" defaultValue={editingCycle?.reportType ?? 'WEEKLY'} disabled={Boolean(editingCycle)}><option value="WEEKLY">Hàng tuần</option><option value="MONTHLY">Hàng tháng</option></select></label>
            <label>Khi quá hạn<select name="late" defaultValue={editingCycle?.latePolicy ?? 'FLAG'}><option value="FLAG">Cho nộp và đánh dấu trễ</option><option value="BLOCK">Không cho nộp</option></select></label>
            <label>Từ ngày (giờ VN)<input name="start" type="datetime-local" required defaultValue={editingCycle ? localDateTime(editingCycle.periodStart) : ''} /></label>
            <label>Đến ngày (giờ VN)<input name="end" type="datetime-local" required defaultValue={editingCycle ? localDateTime(editingCycle.periodEnd) : ''} onChange={event => event.target.setCustomValidity('')} /></label>
            <label className="sm:col-span-2">Hạn nộp (giờ VN)<input name="deadline" type="datetime-local" required defaultValue={editingCycle ? localDateTime(editingCycle.deadline) : ''} /></label>
            <div className="sm:col-span-2 flex flex-wrap justify-end gap-2 border-t border-hairline pt-3">
              <Button type="button" variant="secondary" disabled={busy} onClick={() => { setCycleModalOpen(false); setEditingCycle(null) }}>Hủy</Button>
              <Button disabled={busy} type="submit">{editingCycle ? 'Lưu thay đổi' : 'Tạo lịch nộp'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Action Item Create / Edit Modal */}
      {actionModalOpen && (
        <Modal
          open
          title={editingAction ? 'Chỉnh sửa công việc sau trao đổi' : 'Thêm công việc sau trao đổi'}
          busy={busy}
          onClose={() => { setActionModalOpen(false); setEditingAction(null) }}
        >
          <form
            key={editingAction?.id ?? 'new-action'}
            className="api-form grid gap-3"
            onSubmit={event => {
              event.preventDefault()
              const f = new FormData(event.currentTarget)
              const title = String(f.get('title')).trim()
              const description = String(f.get('description')).trim() || null
              const due = String(f.get('due'))
              const dueAt = due ? toUtcDateTime(due) : null
              if (!title) return
              void run(async () => {
                if (editingAction) {
                  await api.updateProjectActionItem(projectId, editingAction.id, { title, description, dueAt, ownerId: editingAction.ownerId, taskId: editingAction.taskId, milestoneId: editingAction.milestoneId, concurrencyToken: editingAction.concurrencyToken })
                } else {
                  const [sourceType, id] = String(f.get('source')).split(':')
                  await api.createProjectActionItem(projectId, { title, description, dueAt, sourceType: sourceType as 'MEETING' | 'PROGRESS_REPORT', ...(sourceType === 'MEETING' ? { meetingId: Number(id) } : { progressReportId: Number(id) }) })
                }
                setEditingAction(null)
                setActionModalOpen(false)
              }, 'Đã lưu công việc sau trao đổi.')
            }}
          >
            {!editingAction && (
              <label>Nguồn trao đổi<select name="source" required><option value="">Chọn cuộc họp hoặc báo cáo</option>{sources.map(item => <option key={item.value} value={item.value}>{item.title}</option>)}</select></label>
            )}
            <label>Công việc<input name="title" required maxLength={300} defaultValue={editingAction?.title ?? ''} /></label>
            <label>Mô tả<textarea name="description" rows={3} defaultValue={editingAction?.description ?? ''} /></label>
            <label>Hạn hoàn thành (giờ VN)<input name="due" type="datetime-local" defaultValue={editingAction?.dueAt ? localDateTime(editingAction.dueAt) : ''} /></label>
            <div className="flex flex-wrap justify-end gap-2 border-t border-hairline pt-3">
              <Button type="button" variant="secondary" disabled={busy} onClick={() => { setActionModalOpen(false); setEditingAction(null) }}>Hủy</Button>
              <Button type="submit" disabled={busy || (!editingAction && !sources.length)}>{editingAction ? 'Lưu thay đổi' : 'Thêm công việc'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </WorkspacePage>
  )
}

async function loadData(projectId: number, cyclePage = 1, actionPage = 1, evidencePage = 1) {
  const [project, cycles, actions, evidence, reports, meetings, governance] = await Promise.all([
    getProject(projectId),
    api.getReportingCycles(projectId, undefined, cyclePage),
    api.getProjectActionItems(projectId, undefined, actionPage),
    api.getProjectEvidence(projectId, { page: evidencePage, pageSize: 10 }),
    readAllPages(page => getProgressReports(projectId, { page, pageSize: 100 })),
    readAllPages(page => getMeetings(projectId, { page, pageSize: 100 })),
    api.getProjectGovernance(projectId),
  ])
  return {
    project,
    governance,
    totalPages: {
      cycles: Math.max(1, Math.ceil(cycles.totalCount / Math.max(1, cycles.pageSize))),
      actions: Math.max(1, Math.ceil(actions.totalCount / Math.max(1, actions.pageSize))),
      evidence: Math.max(1, Math.ceil(evidence.totalCount / Math.max(1, evidence.pageSize))),
    },
    totals: { cycles: cycles.totalCount, actions: actions.totalCount, evidence: evidence.totalCount },
    cycles: cycles.items,
    actions: actions.items,
    evidence: evidence.items,
    reports,
    meetings,
  }
}
