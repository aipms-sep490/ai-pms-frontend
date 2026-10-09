import { displayLabel } from '../../../components/ui/display-label'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { projectStatusLabel } from '../../projects/utils/project-status'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { getWorkspaceRole } from '../../auth/utils/role-access'
import { HttpError } from '../../../services/http/http-client'
import { exportPortfolio, exportPortfolioCsv, type PortfolioExportFormat, getPortfolioDashboard, type DashboardFilter, type DashboardProject, type PortfolioDashboard } from '../api/dashboard-api'
import { archiveProject } from '../../projects/api/archive-project'
import { getReviewActions } from '../../projects/api/project-review-api'
import { env } from '../../../app/config/env'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { departmentError } from '../../department/hooks/useDepartmentSection'

const statuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUIRED', 'REJECTED', 'APPROVED', 'SUPERVISOR_PENDING', 'ACTIVE', 'FINAL_SUBMISSION', 'COMPLETED', 'ARCHIVED']

export function PortfolioDashboardPage() {
  const { session } = useAuthSession()
  const role = getWorkspaceRole(session?.user)
  const scope = role === 'admin' ? 'admin' : 'department'
  const [searchInput, setSearchInput] = useState('')
  const [filter, setFilter] = useState<DashboardFilter>({ page: 1, pageSize: 20 })
  const [data, setData] = useState<PortfolioDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<PortfolioExportFormat>('csv')
  const [archivingId, setArchivingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const version = useRef(0), archiveLock = useRef(false), exportLock = useRef(false)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()

  const load = useCallback(async () => {
    const current = ++version.current
    setLoading(true); setData(null); setError(null)
    try { const result = await getPortfolioDashboard(scope, filter); if (current === version.current) setData(result) }
    catch (reason) { if (current === version.current) setError(departmentError(reason).message) }
    finally { if (current === version.current) setLoading(false) }
  }, [scope, filter])
  useEffect(() => { const requestVersion = version; void load(); return () => { requestVersion.current++ } }, [load])

  const applyFilter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFilter(current => ({ ...current, search: searchInput.trim() || undefined, page: 1 }))
  }

  const download = async () => {
    if (exportLock.current) return
    exportLock.current = true
    setExporting(true); setNotice(null)
    try {
      const blob = exportFormat === 'csv' ? await exportPortfolioCsv(filter) : await exportPortfolio(filter, exportFormat)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `ai-pms-portfolio-${new Date().toISOString().slice(0, 10)}.${exportFormat}`
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      setError(null); setNotice(`Đã tạo tệp ${exportFormat.toUpperCase()} theo bộ lọc hiện tại.`)
    } catch (reason) {
      setError(reason instanceof HttpError && reason.status === 422 ? 'Danh sách xuất vượt giới hạn 10.000 đồ án. Hãy thu hẹp bộ lọc.' : departmentError(reason).message)
    } finally { exportLock.current = false; setExporting(false) }
  }

  const archive = async (project: DashboardProject) => {
    if (archiveLock.current) return
    archiveLock.current = true
    const current = version.current
    setArchivingId(project.id); setNotice(null)
    try {
      const decision = await requestConfirmation({ title: 'Lưu trữ đồ án?', description: `${project.code} · ${project.title}. Hệ thống sẽ kiểm tra lại quyền, trạng thái và phiên bản trước khi lưu trữ.`, confirmLabel: 'Xác nhận lưu trữ', danger: true })
      if (decision === null || current !== version.current) return
      await archiveProject(project.id, null); await load(); setNotice('Đã lưu trữ đồ án; danh sách đã được tải lại từ hệ thống.')
    }
    catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) await load()
      setError(reason instanceof HttpError && reason.status === 409
        ? 'Đồ án đã thay đổi. Danh sách đã được tải lại; hãy kiểm tra trước khi lưu trữ.'
        : departmentError(reason).message)
    } finally { archiveLock.current = false; setArchivingId(null) }
  }

  const activeCount = data?.summary.projectStates.find(item => item.status === 'ACTIVE')?.count ?? 0
  const completedCount = data?.summary.projectStates.find(item => item.status === 'COMPLETED')?.count ?? 0
  const attentionRisks = useMemo(() => data?.summary.riskLevels.filter(item => item.status !== 'LOW').reduce((total, item) => total + item.count, 0) ?? 0, [data])

  return <WorkspacePage title="Danh mục đồ án" eyebrow={scope === 'admin' ? 'Tổng quan nền tảng' : 'Phạm vi bộ môn'} description="Theo dõi trạng thái và tiến độ các đồ án trong phạm vi được cấp." action={<div className="flex flex-wrap items-end gap-3"><label className="text-sm font-medium">Định dạng xuất<select aria-label="Định dạng xuất" className="ml-2 min-h-11 rounded-lg border border-hairline bg-card px-3" value={exportFormat} disabled={exporting} onChange={event => setExportFormat(event.target.value as PortfolioExportFormat)}><option value="csv">CSV</option><option value="xlsx">Excel</option><option value="pdf">PDF</option></select></label><button type="button" disabled={exporting || loading || !data} onClick={() => void download()} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50">{exporting ? 'Đang xuất…' : `Xuất ${exportFormat.toUpperCase()}`}</button></div>}>

    <form className="workspace-filter-grid" onSubmit={applyFilter}>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-800 sm:col-span-2" htmlFor="portfolio-search">Tìm đồ án<input id="portfolio-search" value={searchInput} onChange={event => setSearchInput(event.target.value)} className="min-h-11 rounded-lg border border-hairline bg-card px-3 text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" placeholder="Mã hoặc tên đồ án" /></label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-800" htmlFor="portfolio-status">Trạng thái<select id="portfolio-status" className="min-h-11 rounded-lg border border-hairline bg-card px-3 text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" value={filter.status ?? ''} onChange={event => setFilter(current => ({ ...current, status: event.target.value || undefined, page: 1 }))}><option value="">Tất cả</option>{statuses.map(status => <option key={status} value={status}>{projectStatusLabel(status)}</option>)}</select></label>
      <button type="submit" className="min-h-11 self-end rounded-lg border border-hairline px-4 text-sm font-semibold text-primary hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Áp dụng</button>
    </form>
    {confirmationDialog}
    {error && <div role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><p className="font-semibold">Không thể hoàn tất thao tác</p><p className="mt-1">{error}</p><button type="button" className="mt-2 min-h-11 font-semibold underline underline-offset-4" onClick={() => void load()}>Tải lại dữ liệu</button></div>}
    {notice && <p role="status" className="rounded-lg border border-status-success-border bg-status-success-bg p-4 text-sm text-status-success-text">{notice}</p>}
    {loading && <p role="status" className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-700">Đang tải danh mục đồ án…</p>}
    {!loading && data && <>
      <section aria-label="Tóm tắt danh mục đồ án" className="workspace-metrics"><Metric label="Tổng đồ án" value={data.summary.totalProjects} /><Metric label="Đang thực hiện" value={activeCount} tone="success" /><Metric label="Đã hoàn thành" value={completedCount} />{env.aiAdvisoryEnabled && <Metric label="Cần chú ý theo rủi ro" value={attentionRisks} tone={attentionRisks > 0 ? 'warning' : 'neutral'} />}</section>
      <section className="workspace-summary-grid"><SummaryCard title="Theo trạng thái" items={data.summary.projectStates.map(item => `${projectStatusLabel(item.status)}: ${item.count}`)} />{env.aiAdvisoryEnabled && <SummaryCard title="Theo rủi ro" items={data.summary.riskLevels.map(item => `${displayLabel(item.status)}: ${item.count}`)} />}<SummaryCard title="Theo chuyên ngành" items={data.summary.majors.map(item => `${item.code}: ${item.projectCount}`)} /></section>
      <section className="workspace-surface workspace-surface-padding mt-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-heading font-semibold text-slate-950">Danh sách đồ án</h2><p className="mt-1 text-sm text-slate-600">Dữ liệu tại {formatAsOf(data.asOfUtc)}. Hệ thống ghi nhận lịch sử xuất dữ liệu.</p></div><MajorChips majors={data.summary.majors} selected={filter.majorId} onSelect={majorId => setFilter(current => ({ ...current, majorId, page: 1 }))} /></div>{data.projects.items.length === 0 ? <p className="mt-4 text-sm text-slate-600">Không có đồ án phù hợp với bộ lọc hiện tại.</p> : <ul className="mt-4 divide-y divide-hairline">{data.projects.items.map(project => <ProjectRow readOnly={scope === 'admin'} key={project.id} project={project} accessToken={session?.accessToken ?? ''} archiving={archivingId !== null} onArchive={() => void archive(project)} />)}</ul>}</section>
      <Pagination page={filter.page ?? 1} totalPages={data.projects.totalPages} onChange={page => setFilter(current => ({ ...current, page }))} />
    </>}
  </WorkspacePage>
}

function Metric({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'success' | 'warning' }) { const tones = { neutral: 'border-hairline', success: 'border-status-success-border', warning: 'border-status-warning-border' }; return <div className={`workspace-metric ${tones[tone]}`}><dt className="text-xs font-medium text-slate-600">{label}</dt><dd className="mt-1 text-2xl font-bold tabular-nums text-slate-950">{value}</dd></div> }
function SummaryCard({ title, items }: { title: string; items: string[] }) { return <section className="workspace-summary"><h2 className="font-heading text-sm font-semibold text-slate-950">{title}</h2>{items.length === 0 ? <p className="mt-2 text-sm text-slate-600">Chưa có dữ liệu.</p> : <ul className="mt-3 flex flex-wrap gap-2">{items.map(item => <li key={item} className="rounded-full bg-primary-subtle px-2.5 py-1 text-xs font-medium text-primary">{item}</li>)}</ul>}</section> }
function MajorChips({ majors, selected, onSelect }: { majors: PortfolioDashboard['summary']['majors']; selected?: number; onSelect: (majorId: number | undefined) => void }) { if (majors.length === 0) return null; return <div className="flex max-w-full flex-wrap gap-2" aria-label="Lọc theo chuyên ngành"><button type="button" aria-pressed={!selected} className="min-h-11 rounded-lg border border-hairline px-3 text-sm font-semibold text-primary hover:bg-primary-subtle" onClick={() => onSelect(undefined)}>Tất cả ngành</button>{majors.map(major => <button type="button" key={major.majorId} aria-pressed={selected === major.majorId} className="min-h-11 rounded-lg border border-hairline px-3 text-sm font-semibold text-primary hover:bg-primary-subtle" onClick={() => onSelect(major.majorId)}>{major.code}</button>)}</div> }
function ProjectRow({ project, accessToken, archiving, onArchive, readOnly = false }: { readOnly?: boolean; project: DashboardProject; accessToken: string; archiving: boolean; onArchive: () => void }) { const risk = project.analysis?.riskLevel; const riskClass = risk === 'HIGH' ? 'rounded-full bg-status-error-bg px-2 py-1 text-xs font-medium text-status-error-text' : risk === 'MEDIUM' ? 'rounded-full bg-status-warning-bg px-2 py-1 text-xs font-medium text-status-warning-text' : 'rounded-full bg-status-success-bg px-2 py-1 text-xs font-medium text-status-success-text'; return <li className="flex flex-wrap items-start justify-between gap-3 py-4 text-sm"><div className="min-w-0"><p className="font-semibold text-slate-950">{project.code} · {project.title}</p><p className="mt-1 text-slate-600">{project.departmentName ?? 'Chưa có khoa'} · {project.supervisor?.name ?? 'Chưa có GVHD'}</p><div className="mt-2 flex flex-wrap gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{projectStatusLabel(project.status)}</span>{env.aiAdvisoryEnabled && risk && <span className={riskClass}>Rủi ro: {displayLabel(risk)}</span>}</div></div>{readOnly && <div className="flex flex-wrap gap-x-4 gap-y-1"><Link to={`/admin/projects/${project.id}/evaluation-schemes`} className="inline-flex min-h-11 items-center font-semibold text-primary underline">Phương án đánh giá</Link><Link to={`/admin/projects/${project.id}/result`} className="inline-flex min-h-11 items-center font-semibold text-primary underline">Kết quả</Link></div>}{!readOnly && <div className="flex flex-wrap gap-x-4 gap-y-1"><Link to={`/department/projects/review/${project.id}`} className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 hover:text-primary-hover">Xem</Link>{env.aiAdvisoryEnabled && <Link to={`/department/projects/${project.id}/risk`} className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 hover:text-primary-hover">Phân tích</Link>}<Link to={`/department/projects/${project.id}/files`} className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 hover:text-primary-hover">Tệp</Link>{project.status === 'FINAL_SUBMISSION' && <Link to={`/department/projects/${project.id}/evaluations`} className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 hover:text-primary-hover">Người chấm</Link>}<Link to={`/department/projects/${project.id}/governance`} className="inline-flex min-h-11 items-center font-semibold text-primary underline">Điều phối</Link><Link to={`/department/projects/${project.id}/evaluation-schemes`} className="inline-flex min-h-11 items-center font-semibold text-primary underline">Phương án đánh giá</Link><Link to={`/department/projects/${project.id}/result`} className="inline-flex min-h-11 items-center font-semibold text-primary underline">Kết quả</Link><ArchiveAction projectId={project.id} accessToken={accessToken} archiving={archiving} onArchive={onArchive} /></div>}</li> }
function ArchiveAction({ projectId, accessToken, archiving, onArchive }: { projectId: number; accessToken: string; archiving: boolean; onArchive: () => void }) {
  const [state, setState] = useState<{ loading: boolean; allowed: boolean; reasons: string[] }>({ loading: true, allowed: false, reasons: [] })
  useEffect(() => { let active = true; if (!accessToken) return; getReviewActions(projectId, accessToken).then(result => { const action = result.actions.find(item => item.code === 'archive_project'); if (active) setState({ loading: false, allowed: Boolean(action?.allowed), reasons: action?.reasons ?? [] }) }).catch(() => { if (active) setState({ loading: false, allowed: false, reasons: [] }) }); return () => { active = false } }, [projectId, accessToken])
  if (state.loading || !state.allowed) return state.reasons.length ? <span className="self-center text-xs text-slate-500" title={state.reasons.join(' ')}>Chưa thể lưu trữ</span> : null
  return <button type="button" disabled={archiving} className="min-h-11 font-semibold text-status-error-text underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50" onClick={onArchive}>{archiving ? 'Đang lưu trữ…' : 'Lưu trữ'}</button>
}
function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) { if (totalPages <= 1) return null; return <nav aria-label="Trang portfolio" className="flex items-center justify-between gap-3 text-sm"><button type="button" disabled={page <= 1} className="min-h-11 rounded-lg border border-hairline px-4 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50" onClick={() => onChange(page - 1)}>Trang trước</button><span className="tabular-nums text-slate-600">Trang {page} / {totalPages}</span><button type="button" disabled={page >= totalPages} className="min-h-11 rounded-lg border border-hairline px-4 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50" onClick={() => onChange(page + 1)}>Trang sau</button></nav> }
function formatAsOf(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date) }
