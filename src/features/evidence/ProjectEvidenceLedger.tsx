import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { HttpError } from '../../services/http/http-client'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import { getProjectEvidence, type ProjectEvidence, type ProjectEvidenceQuery } from '../projects/api/project-governance-api'
import { useProjectDisciplineScope } from '../projects/hooks/useProjectDisciplineScope'

const sourceTypes = ['TASK', 'DELIVERABLE', 'MEETING', 'PROGRESS_REPORT', 'FILE'] as const
const verificationStatuses = ['PENDING', 'UNKNOWN'] as const
const sourceLabels: Record<(typeof sourceTypes)[number], string> = { TASK: 'Công việc', DELIVERABLE: 'Hạng mục bàn giao', MEETING: 'Cuộc họp', PROGRESS_REPORT: 'Báo cáo tiến độ', FILE: 'Tệp' }
const verificationLabels: Record<string, string> = { PENDING: 'Chờ xác minh', UNKNOWN: 'Chưa xác định', VERIFIED: 'Đã xác minh', REJECTED: 'Bị từ chối' }
const pageSize = 20

type Filters = Pick<ProjectEvidenceQuery, 'sourceType' | 'majorId' | 'verificationStatus'>

export function ProjectEvidenceLedgerPage() {
  const access = useExecutionAccess()
  const scope = useProjectDisciplineScope(access.project)
  if (access.actor === 'mentor' && !access.supervisor?.majorId) return <p role="alert">Chưa xác định được ngành hướng dẫn. Hãy tải lại hồ sơ phân công.</p>
  return <>
    {scope.loading && <p role="status" className="mb-4 text-sm">Đang tải phạm vi ngành…</p>}
    {scope.error && <p role="status" className="mb-4 text-sm text-slate-600">{scope.error} Bộ lọc ngành tạm thời chưa khả dụng. <button type="button" className="min-h-11 underline" onClick={scope.retry}>Tải lại phạm vi ngành</button></p>}
    <ProjectEvidenceLedger projectId={access.project.id} routeBase={access.routeBase} majors={scope.majors} lockedMajorId={access.actor === 'mentor' ? access.supervisor?.majorId ?? undefined : undefined} />
  </>
}

/** Read-only until a source-scoped execution capability is delivered by Backend. */
interface LedgerProps { projectId: number; routeBase: string; majors?: { majorId: number; majorName: string }[]; lockedMajorId?: number }
export function ProjectEvidenceLedger(props: LedgerProps) {
  return <EvidenceLedger key={`${props.projectId}:${props.routeBase}:${props.lockedMajorId ?? ''}`} {...props} />
}
function EvidenceLedger({ projectId, routeBase, majors = [], lockedMajorId }: LedgerProps) {
  const [filters, setFilters] = useState<Filters>({ majorId: lockedMajorId })
  const [majorInput, setMajorInput] = useState(String(lockedMajorId ?? ''))
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<{ items: ProjectEvidence[]; totalCount: number; totalPages: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const sequence = useRef(0)

  const query = useMemo(() => ({ ...filters, page, pageSize }), [filters, page])
  const load = useCallback(async () => {
    const request = ++sequence.current
    setLoading(true); setResult(null); setError(null)
    try {
      const next = await getProjectEvidence(projectId, query)
      if (request !== sequence.current) return
      setResult(next)
      setError(null)
    } catch (reason) {
      if (request === sequence.current) setError(messageFor(reason))
    } finally {
      if (request === sequence.current) setLoading(false)
    }
  }, [projectId, query])

  useEffect(() => { const requests = sequence; void load(); return () => { requests.current++ } }, [load])

  const applyMajor = () => {
    const majorId = lockedMajorId ?? Number(majorInput)
    if (!lockedMajorId && majorInput && !majors.some(item => item.majorId === majorId)) return
    setFilters(current => ({ ...current, majorId: lockedMajorId ?? (majorInput ? majorId : undefined) }))
    setPage(1)
  }
  const changeFilter = (key: keyof Omit<Filters, 'majorId'>, value: string) => {
    setFilters(current => ({ ...current, [key]: value || undefined }))
    setPage(1)
  }
  const totalPages = result?.totalPages ?? 1

  return <main className="mx-auto max-w-6xl space-y-6 pb-12">
    <header className="border-b border-hairline pb-5">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary">Đồ án #{projectId} · Sổ minh chứng</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Sổ minh chứng</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Tra cứu minh chứng theo công việc, báo cáo và cuộc họp; đối chiếu trạng thái từ hệ thống.</p>
    </header>

    <section className="rounded-xl border border-hairline bg-card p-4 shadow-xs sm:p-5" aria-label="Lọc minh chứng">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium text-slate-800">Nguồn
          <select value={filters.sourceType ?? ''} onChange={event => changeFilter('sourceType', event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <option value="">Tất cả nguồn</option>{sourceTypes.map(value => <option key={value} value={value}>{sourceLabels[value]}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-800">Trạng thái xác minh
          <select value={filters.verificationStatus ?? ''} onChange={event => changeFilter('verificationStatus', event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <option value="">Tất cả trạng thái</option>{verificationStatuses.map(value => <option key={value} value={value}>{verificationLabels[value]}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-800">Ngành
          <select value={majorInput} disabled={!!lockedMajorId || !majors.length} onChange={event => setMajorInput(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            {!lockedMajorId && <option value="">Tất cả ngành</option>}
            {lockedMajorId && !majors.some(item => item.majorId === lockedMajorId) && <option value={lockedMajorId}>Ngành hướng dẫn #{lockedMajorId}</option>}
            {majors.map(item => <option key={item.majorId} value={item.majorId}>{item.majorName}</option>)}
          </select>
        </label>
        <div className="flex items-end gap-2"><button type="button" onClick={applyMajor} className="min-h-11 flex-1 rounded-lg border border-primary bg-card px-4 text-sm font-semibold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Áp dụng</button><button type="button" onClick={() => { setFilters({ majorId: lockedMajorId }); setMajorInput(String(lockedMajorId ?? '')); setPage(1) }} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Xóa lọc</button></div>
      </div>
    </section>

    {error && <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{error} <button type="button" onClick={() => void load()} className="ml-2 min-h-11 font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Thử lại</button></section>}
    {loading && <p role="status" aria-live="polite" className="rounded-xl border border-hairline bg-card p-5 text-sm text-slate-700">Đang tải minh chứng…</p>}
    {!loading && !error && result?.items.length === 0 && <section className="rounded-xl border border-hairline bg-card p-5 text-sm text-slate-700"><h2 className="font-semibold text-slate-900">Chưa có minh chứng phù hợp</h2><p className="mt-1 leading-6">Hãy thử điều chỉnh bộ lọc. Trạng thái xác minh được lấy trực tiếp từ hệ thống.</p></section>}
    {!loading && !error && result?.items.length ? <EvidenceList items={result.items} routeBase={routeBase} /> : null}
    {!loading && !error && result && result.totalPages > 1 && <nav aria-label="Phân trang minh chứng" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-card p-4 text-sm"><button type="button" disabled={page <= 1} onClick={() => setPage(current => current - 1)} className="min-h-11 rounded-lg border border-hairline px-4 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Trang trước</button><span aria-live="polite">Trang {page} / {totalPages} · {result.totalCount} minh chứng</span><button type="button" disabled={page >= totalPages} onClick={() => setPage(current => current + 1)} className="min-h-11 rounded-lg border border-hairline px-4 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Trang sau</button></nav>}
  </main>
}

function EvidenceList({ items, routeBase }: { items: ProjectEvidence[]; routeBase: string }) {
  return <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs" aria-label="Danh sách minh chứng"><ul className="divide-y divide-hairline">{items.map(item => <li key={item.id} className="grid gap-3 p-4 sm:p-5 lg:grid-cols-[minmax(12rem,1fr)_minmax(9rem,.7fr)_minmax(10rem,.7fr)_auto] lg:items-start"><div className="min-w-0"><p className="font-semibold text-slate-900">{sourceLabels[item.sourceType as keyof typeof sourceLabels] ?? item.sourceType} #{item.sourceId}</p><p className="mt-1 text-sm text-slate-600">{item.majorId ? `Ngành #${item.majorId}` : 'Chưa phân loại ngành'} · {item.classification}</p>{item.notes ? <p className="mt-2 break-words text-sm leading-6 text-slate-700">{item.notes}</p> : <p className="mt-2 text-sm text-slate-500">Không có ghi chú.</p>}</div><div className="text-sm"><p className="font-medium text-slate-900">{verificationLabels[item.verificationStatus as keyof typeof verificationLabels] ?? item.verificationStatus}</p><p className="mt-1 text-slate-600">Người gửi #{item.submittedBy}</p></div><p className="text-sm leading-6 text-slate-600">{formatDate(item.submittedAt)}</p><div>{sourcePath(routeBase, item) ? <Link to={sourcePath(routeBase, item)!} className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Mở nguồn</Link> : <span className="inline-flex min-h-11 items-center text-sm text-slate-500">Chưa có đường dẫn nguồn</span>}</div></li>)}</ul></section>
}

function sourcePath(routeBase: string, item: ProjectEvidence): string | null {
  switch (item.sourceType) {
    case 'TASK': return `${routeBase}/tasks/${item.sourceId}`
    case 'MEETING': return `${routeBase}/meetings/${item.sourceId}`
    case 'PROGRESS_REPORT': return `${routeBase}/reports/${item.sourceId}`
    case 'DELIVERABLE': return `${routeBase}/deliverables`
    case 'FILE': return `${routeBase}/files`
    default: return null
  }
}

function messageFor(reason: unknown): string {
  if (reason instanceof HttpError) {
    if (reason.status === 403) return 'Hệ thống không cấp quyền xem minh chứng của đồ án này.'
    if (reason.status === 404) return 'Không tìm thấy đồ án hoặc minh chứng được yêu cầu.'
  }
  return 'Không thể tải minh chứng. Hãy thử lại.'
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString('vi-VN')
}
