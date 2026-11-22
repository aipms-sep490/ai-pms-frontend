import { DepartmentGovernanceOverview } from '../components/DepartmentGovernanceOverview'
import { displayLabel } from '../../../components/ui/display-label'
import { ListLoading } from '../../../components/ui/ListLoading'
import { ProjectGovernanceEditor } from '../components/ProjectGovernanceEditor'
import { AssignmentManagementPanel } from '../../supervisors/components/AssignmentManagementPanel'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { useParams } from 'react-router-dom'
import { getMeetings } from '../../../services/api/meetings.api'
import { getProgressReports } from '../../../services/api/progress-reports.api'
import { getProject } from '../../../services/api/projects.api'
import { readAllPages } from '../../../services/api/paged-read'
import { HttpError } from '../../../services/http/http-client'
import * as api from '../api/project-governance-api'
import { env } from '../../../app/config/env'
import { ProjectIndustryAdvisoryPanel } from '../../industry/ProjectIndustryAdvisoryPanel'

const date = (value: string | null) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—'
function errorText(reason: unknown) { if (reason instanceof HttpError) { if (reason.status === 403) return 'Bạn chưa có quyền thao tác trong đồ án này.'; if (reason.status === 409) return 'Dữ liệu vừa thay đổi. Danh sách mới đã được tải lại; hãy kiểm tra trước khi lưu.'; if (reason.status === 404) return 'Đồ án hoặc bản ghi không còn tồn tại.'; if (reason.status === 400) return reason.problem?.detail || 'Dữ liệu không hợp lệ theo quy tắc hệ thống.' } return 'Chưa hoàn tất thao tác. Hãy thử tải lại.' }

export function ProjectGovernancePage() {
  const [page, setPage] = useState(1)
  const projectId = Number(useParams().projectId); const errorSummary = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<Awaited<ReturnType<typeof loadData>> | null>(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null)
  useEffect(() => { setPage(1) }, [projectId])
  useEffect(() => { if (error) errorSummary.current?.focus() }, [error])
  const readVersion = useRef(0)
  const load = useCallback(async () => { if (!Number.isInteger(projectId) || projectId < 1) { setError('Mã đồ án không hợp lệ.'); setLoading(false); return }; const current = ++readVersion.current; setLoading(true); setData(null); try { const next = await loadData(projectId, page); if (current === readVersion.current) { setData(next); setError(null) } } catch (reason) { if (current === readVersion.current) setError(errorText(reason)) } finally { if (current === readVersion.current) setLoading(false) } }, [projectId, page])
  useEffect(() => { const requestVersion = readVersion; void load(); return () => { requestVersion.current++ } }, [load])
  const mutationLock = useRef(false)
  const run = async (operation: () => Promise<unknown>, success: string) => { if (mutationLock.current) return; mutationLock.current = true; setBusy(true); setError(null); setNotice(null); try { await operation(); await load(); setNotice(success) } catch (reason) { if (reason instanceof HttpError && reason.status === 409) await load(); setError(errorText(reason)) } finally { mutationLock.current = false; setBusy(false) } }
  const eyebrow = data?.project ? `${data.project.code} · ${data.project.title}` : 'Điều phối đồ án'
  return <WorkspacePage title="Điều phối đồ án" description="Theo dõi lịch báo cáo, việc cần làm sau trao đổi và minh chứng của nhóm." eyebrow={eyebrow} className="execution-page space-y-6">
    {error && <div ref={errorSummary} tabIndex={-1} role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><strong>Chưa thể hoàn tất thao tác</strong><p className="mt-1">{error}</p><button type="button" className="mt-2 min-h-11 font-semibold underline" onClick={() => void load()}>Tải lại</button></div>}{notice && <p role="status" className="rounded-lg border border-status-success-border bg-status-success-bg p-4 text-sm text-status-success-text">{notice}</p>}{loading && <ListLoading label="Đang tải thông tin điều phối…" />}
    {data && <div className="space-y-6"><DepartmentGovernanceOverview governance={data.governance} />{(api.canManageProjectGovernance(data.governance) && data.project.academicScope?.leadDepartmentId === data.governance.actorScope.departmentId) ? <ProjectGovernanceEditor projectId={projectId} cycles={data.cycles} actions={data.actions} sources={[...data.meetings.map(item => ({ value: `MEETING:${item.id}`, title: `Cuộc họp: ${item.title}` })), ...data.reports.map(item => ({ value: `PROGRESS_REPORT:${item.id}`, title: `Báo cáo tiến độ (${date(item.periodStart)})` }))]} busy={busy} run={run} /> : <p className="rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-text" role="status">{api.governanceReadOnlyReason(data.governance, data.project.academicScope?.leadDepartmentId)}</p>}<section className="grid gap-5 xl:grid-cols-2"><CyclePanel projectId={projectId} data={data} busy={busy} run={run} readOnly /><ActionPanel projectId={projectId} data={data} busy={busy} run={run} readOnly /></section><EvidencePanel data={data} /><nav aria-label="Phân trang dữ liệu điều phối" className="flex flex-wrap items-center justify-between gap-3 text-sm"><Button className="min-h-11" variant="secondary" disabled={loading || busy || page <= 1} onClick={() => setPage(page - 1)}>Trang trước</Button><span>Trang {page} / {data.totalPages} · Lịch báo cáo: {data.totals.cycles} · Công việc: {data.totals.actions} · Minh chứng: {data.totals.evidence}</span><Button className="min-h-11" variant="secondary" disabled={loading || busy || page >= data.totalPages} onClick={() => setPage(page + 1)}>Trang sau</Button></nav><AssignmentManagementPanel projectId={projectId} projectStatus={data.governance.projectStatus} />{env.industryEnabled && <ProjectIndustryAdvisoryPanel projectId={projectId} />}</div>}
  </WorkspacePage>
}
async function loadData(projectId: number, page = 1) { const [project, cycles, actions, evidence, reports, meetings, governance] = await Promise.all([getProject(projectId), api.getReportingCycles(projectId, undefined, page), api.getProjectActionItems(projectId, undefined, page), api.getProjectEvidence(projectId, { page, pageSize: 20 }), readAllPages(page => getProgressReports(projectId, { page, pageSize: 100 })), readAllPages(page => getMeetings(projectId, { page, pageSize: 100 })), api.getProjectGovernance(projectId)]); return { project, governance, totalPages: Math.max(1, ...[cycles, actions, evidence].map(result => Math.ceil(result.totalCount / result.pageSize))), totals: { cycles: cycles.totalCount, actions: actions.totalCount, evidence: evidence.totalCount }, cycles: cycles.items, actions: actions.items, evidence: evidence.items, reports, meetings } }
function CyclePanel({ data }: PanelProps & { readOnly?: boolean }) { return <section className="rounded-xl border border-hairline bg-card p-5"><h2 className="font-semibold text-ink">Lịch báo cáo</h2><ul className="mt-4 divide-y divide-hairline text-sm">{data.cycles.map(item => <li key={item.id} className="space-y-1 py-3"><strong>{item.reportType === 'WEEKLY' ? 'Hàng tuần' : 'Hàng tháng'} · {item.latePolicy === 'BLOCK' ? 'Không cho nộp trễ' : 'Đánh dấu nộp trễ'}</strong><p className="text-ink-muted">{date(item.periodStart)} → {date(item.periodEnd)}</p><p className="text-ink-muted">Hạn nộp: {date(item.deadline)}</p></li>)}</ul>{!data.cycles.length && <p className="mt-3 text-sm text-ink-muted">Không có lịch báo cáo trong trang này.</p>}</section> }
type PanelProps = { projectId: number; data: Awaited<ReturnType<typeof loadData>>; busy: boolean; run: (operation: () => Promise<unknown>, success: string) => Promise<void> }
function ActionPanel({ data, readOnly }: PanelProps & { readOnly?: boolean }) {
  const resolveSource = (item: (typeof data.actions)[number]) => {
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
  return <section className="rounded-xl border border-hairline bg-card p-5"><h2 className="font-semibold text-ink">Công việc sau trao đổi</h2><p className="mt-1 text-sm text-ink-muted">{readOnly ? 'Các công việc đã ghi nhận sau cuộc họp hoặc báo cáo.' : 'Danh sách việc cần thực hiện hiện có.'}</p><ul className="mt-4 divide-y divide-hairline text-sm">{data.actions.map(item => <li key={item.id} className="py-3"><strong className="text-ink">{item.title}</strong><span className="block text-ink-muted">{resolveSource(item)} · {displayLabel(item.status)} · hạn {date(item.dueAt)}</span></li>)}{!data.actions.length && <li className="py-3 text-ink-muted">Không có công việc sau trao đổi trong trang này.</li>}</ul></section>
}
function EvidencePanel({ data }: { data: Awaited<ReturnType<typeof loadData>> }) {
  return <section className="rounded-xl border border-hairline bg-card p-5"><h2 className="font-semibold text-ink">Sổ minh chứng đồ án</h2><p className="mt-1 text-sm leading-6 text-ink-muted">Bổ sung minh chứng tại công việc tương ứng để giữ đúng nguồn dữ liệu.</p><ul className="mt-4 divide-y divide-hairline text-sm">{data.evidence.map(item => {
    const extra = item as typeof item & { sourceTitle?: string | null; submittedByName?: string | null; majorName?: string | null }
    return <li key={item.id} className="py-3"><strong className="text-ink">{extra.sourceTitle ? `${displayLabel(item.sourceType)}: ${extra.sourceTitle}` : displayLabel(item.sourceType)}</strong><span className="block text-ink-muted">{displayLabel(item.classification)}{extra.majorName ? ` · ${extra.majorName}` : ''} · {displayLabel(item.verificationStatus)}{extra.submittedByName ? ` · ${extra.submittedByName}` : ''} · {date(item.submittedAt)}</span>{item.notes && <p className="mt-1 text-ink-muted">{item.notes}</p>}</li>
  })}{!data.evidence.length && <li className="py-3 text-ink-muted">Không có minh chứng trong trang này.</li>}</ul></section>
}
