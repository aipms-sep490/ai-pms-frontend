import { DepartmentGovernanceOverview } from '../components/DepartmentGovernanceOverview'
import { displayLabel } from '../../../components/ui/display-label'
import { ProjectGovernanceEditor } from '../components/ProjectGovernanceEditor'
import { AssignmentManagementPanel } from '../../supervisors/components/AssignmentManagementPanel'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { Pagination, StatTileRow, StatusBadge, WorkspaceTabs } from '../../../components/ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getMeetings } from '../../../services/api/meetings.api'
import { getProgressReports } from '../../../services/api/progress-reports.api'
import { getProject } from '../../../services/api/projects.api'
import { readAllPages } from '../../../services/api/paged-read'
import { HttpError } from '../../../services/http/http-client'
import * as api from '../api/project-governance-api'
import { env } from '../../../app/config/env'
import { ProjectIndustryAdvisoryPanel } from '../../industry/ProjectIndustryAdvisoryPanel'

type GovernanceTab = 'overview' | 'cycles' | 'evidence'

const date = (value: string | null) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—'
function errorText(reason: unknown) { if (reason instanceof HttpError) { if (reason.status === 403) return 'Bạn chưa có quyền thao tác trong đồ án này.'; if (reason.status === 409) return 'Dữ liệu vừa thay đổi. Danh sách mới đã được tải lại; hãy kiểm tra trước khi lưu.'; if (reason.status === 404) return 'Đồ án hoặc bản ghi không còn tồn tại.'; if (reason.status === 400) return reason.problem?.detail || 'Dữ liệu không hợp lệ theo quy tắc hệ thống.' } return 'Chưa hoàn tất thao tác. Hãy thử tải lại.' }

export function ProjectGovernancePage() {
  const [activeTab, setActiveTab] = useState<GovernanceTab>('overview')
  const [cyclePage, setCyclePage] = useState(1)
  const [actionPage, setActionPage] = useState(1)
  const [evidencePage, setEvidencePage] = useState(1)
  const projectId = Number(useParams().projectId); const errorSummary = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<Awaited<ReturnType<typeof loadData>> | null>(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null)
  useEffect(() => { setCyclePage(1); setActionPage(1); setEvidencePage(1); setActiveTab('overview') }, [projectId])
  useEffect(() => { if (error) errorSummary.current?.focus() }, [error])
  const readVersion = useRef(0)
  const load = useCallback(async () => {
    if (!Number.isInteger(projectId) || projectId < 1) { setError('Mã đồ án không hợp lệ.'); setLoading(false); return }
    const current = ++readVersion.current
    setLoading(true)
    try {
      const next = await loadData(projectId, { cyclePage, actionPage, evidencePage })
      if (current === readVersion.current) { setData(next); setError(null) }
    } catch (reason) {
      if (current === readVersion.current) setError(errorText(reason))
    } finally {
      if (current === readVersion.current) setLoading(false)
    }
  }, [projectId, cyclePage, actionPage, evidencePage])
  useEffect(() => { const requestVersion = readVersion; void load(); return () => { requestVersion.current++ } }, [load])
  const mutationLock = useRef(false)
  const run = async (operation: () => Promise<unknown>, success: string) => { if (mutationLock.current) return; mutationLock.current = true; setBusy(true); setError(null); setNotice(null); try { await operation(); await load(); setNotice(success) } catch (reason) { if (reason instanceof HttpError && reason.status === 409) await load(); setError(errorText(reason)) } finally { mutationLock.current = false; setBusy(false) } }

  return (
    <WorkspacePage title="Điều phối đồ án" description="Theo dõi lịch báo cáo, việc cần làm sau trao đổi và minh chứng của nhóm." eyebrow={`Đồ án #${projectId}`} className="execution-page space-y-5">
      {error && (
        <div ref={errorSummary} tabIndex={-1} role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">
          <strong>Chưa thể hoàn tất thao tác</strong>
          <p className="mt-1">{error}</p>
          <button type="button" className="mt-2 min-h-11 font-semibold underline" onClick={() => void load()}>Tải lại</button>
        </div>
      )}
      {notice && <p role="status" className="rounded-xl border border-status-success-border bg-status-success-bg p-4 text-sm text-status-success-text">{notice}</p>}
      {loading && !data && <p role="status" className="rounded-xl border border-hairline bg-card p-4 text-sm text-ink-muted">Đang tải thông tin điều phối…</p>}

      {data && (
        <div className="flex flex-col gap-5">
          <StatTileRow
            tiles={[
              {
                icon: 'event_repeat',
                label: 'Lịch báo cáo',
                value: data.totals.cycles,
                caption: 'Chu kỳ báo cáo đã thiết lập',
                hero: true,
              },
              {
                icon: 'checklist',
                label: 'Việc sau trao đổi',
                value: data.totals.actions,
                caption: 'Ghi nhận từ cuộc họp & báo cáo',
                tone: 'info',
              },
              {
                icon: 'fact_check',
                label: 'Minh chứng đồ án',
                value: data.totals.evidence,
                caption: 'Bản ghi trong sổ minh chứng',
                tone: 'success',
              },
              {
                icon: 'forum',
                label: 'Cuộc họp & báo cáo',
                value: data.meetings.length + data.reports.length,
                caption: `${data.meetings.length} cuộc họp · ${data.reports.length} báo cáo`,
                tone: 'neutral',
              },
            ]}
          />

          <WorkspaceTabs
            activeId={activeTab}
            onChange={setActiveTab}
            ariaLabel="Khu vực điều phối đồ án"
            tabs={[
              { id: 'overview', label: 'Tổng quan & Điều phối', icon: 'dashboard' },
              { id: 'cycles', label: 'Chu kỳ & Hành động', icon: 'event_repeat', count: data.totals.cycles + data.totals.actions },
              { id: 'evidence', label: 'Minh chứng & Phân công', icon: 'fact_check', count: data.totals.evidence },
            ]}
          />

          {activeTab === 'overview' && (
            <div className="flex flex-col gap-5">
              <DepartmentGovernanceOverview governance={data.governance} />

              {(api.canManageProjectGovernance(data.governance) && data.project.academicScope?.leadDepartmentId === data.governance.actorScope.departmentId) ? (
                <ProjectGovernanceEditor
                  projectId={projectId}
                  cycles={data.cycles.items}
                  actions={data.actions.items}
                  sources={[
                    ...data.meetings.map(item => ({ value: `MEETING:${item.id}`, title: `Cuộc họp: ${item.title}` })),
                    ...data.reports.map(item => ({ value: `PROGRESS_REPORT:${item.id}`, title: `Báo cáo #${item.id}` })),
                  ]}
                  busy={busy}
                  run={run}
                />
              ) : (
                <p className="rounded-xl border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-text" role="status">
                  {api.governanceReadOnlyReason(data.governance, data.project.academicScope?.leadDepartmentId)}
                </p>
              )}
            </div>
          )}

          {activeTab === 'cycles' && (
            <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
              <div className="xl:col-span-7">
                <ActionPanel data={data} page={actionPage} onPage={setActionPage} busy={loading || busy} />
              </div>
              <div className="xl:col-span-5">
                <CyclePanel data={data} page={cyclePage} onPage={setCyclePage} busy={loading || busy} />
              </div>
            </div>
          )}

          {activeTab === 'evidence' && (
            <div className="flex flex-col gap-5">
              <EvidencePanel data={data} page={evidencePage} onPage={setEvidencePage} busy={loading || busy} />
              <AssignmentManagementPanel projectId={projectId} projectStatus={data.governance.projectStatus} />
              {env.industryEnabled && <ProjectIndustryAdvisoryPanel projectId={projectId} />}
            </div>
          )}
        </div>
      )}
    </WorkspacePage>
  )
}

async function loadData(projectId: number, pages: { cyclePage: number; actionPage: number; evidencePage: number }) {
  const [project, cycles, actions, evidence, reports, meetings, governance] = await Promise.all([
    getProject(projectId),
    api.getReportingCycles(projectId, undefined, pages.cyclePage),
    api.getProjectActionItems(projectId, undefined, pages.actionPage),
    api.getProjectEvidence(projectId, { page: pages.evidencePage, pageSize: 20 }),
    readAllPages(page => getProgressReports(projectId, { page, pageSize: 100 })),
    readAllPages(page => getMeetings(projectId, { page, pageSize: 100 })),
    api.getProjectGovernance(projectId),
  ])
  return {
    project,
    governance,
    totals: { cycles: cycles.totalCount, actions: actions.totalCount, evidence: evidence.totalCount },
    cycles,
    actions,
    evidence,
    reports,
    meetings,
  }
}

type ServerPanelProps = {
  data: Awaited<ReturnType<typeof loadData>>
  page: number
  onPage: (next: number) => void
  busy: boolean
}

function CyclePanel({ data, page, onPage, busy }: ServerPanelProps) {
  const totalPages = Math.max(1, Math.ceil(data.cycles.totalCount / Math.max(1, data.cycles.pageSize)))
  return (
    <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
      <div className="flex items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
        <h2 className="text-base font-bold text-ink">Lịch báo cáo</h2>
        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-primary">
          {data.cycles.totalCount}
        </span>
      </div>
      <div className="p-5">
        {data.cycles.items.length > 0 ? (
          <>
            <ul className="divide-y divide-hairline text-sm">
              {data.cycles.items.map(item => (
                <li key={item.id} className="space-y-1.5 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-ink">{item.reportType === 'WEEKLY' ? 'Hàng tuần' : 'Hàng tháng'}</strong>
                    <StatusBadge tone={item.latePolicy === 'BLOCK' ? 'warning' : 'neutral'} label={item.latePolicy === 'BLOCK' ? 'Không cho nộp trễ' : 'Đánh dấu nộp trễ'} />
                  </div>
                  <p className="text-xs text-ink-muted">{date(item.periodStart)} → {date(item.periodEnd)}</p>
                  <p className="font-mono text-xs text-ink-soft">Hạn nộp: {date(item.deadline)}</p>
                </li>
              ))}
            </ul>
            {totalPages > 1 && (
              <div className="mt-4 border-t border-hairline pt-3">
                <Pagination page={page} pages={totalPages} total={data.cycles.totalCount} pageSize={data.cycles.pageSize} busy={busy} onPage={onPage} />
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-ink-muted">Chưa có lịch báo cáo nào.</p>
        )}
      </div>
    </section>
  )
}

function ActionPanel({ data, page, onPage, busy }: ServerPanelProps) {
  const totalPages = Math.max(1, Math.ceil(data.actions.totalCount / Math.max(1, data.actions.pageSize)))
  return (
    <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
        <div>
          <h2 className="text-base font-bold text-ink">Công việc sau trao đổi</h2>
          <p className="mt-0.5 text-xs text-ink-muted">Các công việc đã ghi nhận sau cuộc họp hoặc báo cáo.</p>
        </div>
        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-primary">
          {data.actions.totalCount}
        </span>
      </div>
      <div className="p-5">
        {data.actions.items.length > 0 ? (
          <>
            <ul className="divide-y divide-hairline text-sm">
              {data.actions.items.map(item => (
                <li key={item.id} className="space-y-1 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-ink">{item.title}</strong>
                    <StatusBadge tone="info" label={displayLabel(item.status)} />
                  </div>
                  <span className="block text-xs text-ink-muted">
                    {displayLabel(item.sourceType)} #{item.meetingId ?? item.progressReportId} · hạn {date(item.dueAt)}
                  </span>
                </li>
              ))}
            </ul>
            {totalPages > 1 && (
              <div className="mt-4 border-t border-hairline pt-3">
                <Pagination page={page} pages={totalPages} total={data.actions.totalCount} pageSize={data.actions.pageSize} busy={busy} onPage={onPage} />
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-ink-muted">Chưa có công việc sau trao đổi nào.</p>
        )}
      </div>
    </section>
  )
}

function EvidencePanel({ data, page, onPage, busy }: ServerPanelProps) {
  const totalPages = Math.max(1, Math.ceil(data.evidence.totalCount / Math.max(1, data.evidence.pageSize)))
  return (
    <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
        <div>
          <h2 className="text-base font-bold text-ink">Sổ minh chứng đồ án</h2>
          <p className="mt-0.5 text-xs text-ink-muted">Bổ sung minh chứng tại công việc tương ứng để giữ đúng nguồn dữ liệu.</p>
        </div>
        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-primary">
          {data.evidence.totalCount}
        </span>
      </div>
      <div className="p-5">
        {data.evidence.items.length > 0 ? (
          <>
            <ul className="divide-y divide-hairline text-sm">
              {data.evidence.items.map(item => (
                <li key={item.id} className="space-y-1 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-ink">{displayLabel(item.sourceType)} #{item.sourceId}</strong>
                    <StatusBadge tone={item.verificationStatus === 'VERIFIED' ? 'success' : 'neutral'} label={displayLabel(item.verificationStatus)} />
                  </div>
                  <span className="block text-xs text-ink-muted">
                    {displayLabel(item.classification)} · {date(item.submittedAt)}
                  </span>
                  {item.notes && <p className="mt-1 text-xs text-ink-soft">{item.notes}</p>}
                </li>
              ))}
            </ul>
            {totalPages > 1 && (
              <div className="mt-4 border-t border-hairline pt-3">
                <Pagination page={page} pages={totalPages} total={data.evidence.totalCount} pageSize={data.evidence.pageSize} busy={busy} onPage={onPage} />
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-ink-muted">Chưa có minh chứng nào.</p>
        )}
      </div>
    </section>
  )
}
