import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { httpGetBlob, HttpError } from '../../services/http/http-client'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import { getProjectEvidence, type ProjectEvidence, type ProjectEvidenceQuery } from '../projects/api/project-governance-api'
import { useProjectDisciplineScope } from '../projects/hooks/useProjectDisciplineScope'
import { getEvidenceReviewTarget, getEvidenceReviews, reviewEvidence } from './evidence-review-api'
import type { EvidenceReview, EvidenceReviewDecision, EvidenceReviewTarget } from './evidence-review-types'
import { Pagination, StatTileRow, StatusBadge, useClientPagination } from '../../components/ui'
import { displayLabel } from '../../components/ui/display-label'
import type { BadgeTone } from '../../components/ui/status-badge-tone'

function verificationTone(status: string): BadgeTone {
  switch (status.toUpperCase()) {
    case 'VERIFIED': return 'success'
    case 'PENDING': return 'warning'
    case 'REJECTED': return 'danger'
    default: return 'neutral'
  }
}

const sourceTypes = ['TASK', 'DELIVERABLE', 'MEETING', 'PROGRESS_REPORT', 'FILE'] as const
const verificationStatuses = ['PENDING', 'UNKNOWN', 'VERIFIED', 'REJECTED'] as const
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
    {scope.error && <p role="status" className="mb-4 text-sm text-ink-muted">{scope.error} Bộ lọc ngành tạm thời chưa khả dụng. <button type="button" className="min-h-11 underline" onClick={scope.retry}>Tải lại phạm vi ngành</button></p>}
    <ProjectEvidenceLedger projectId={access.project.id} routeBase={access.routeBase} majors={scope.majors} lockedMajorId={access.actor === 'mentor' ? access.supervisor?.majorId ?? undefined : undefined} actor={access.actor} />
  </>
}

/** Listing is read-only; review decisions are written via BE-13 (project-evidence/{id}/reviews).
 * `actor` is presentation-only (hides the review toggle for students, who have no
 * review-history API access at all) — the server remains the sole review authority. */
interface LedgerProps { projectId: number; routeBase: string; majors?: { majorId: number; majorName: string }[]; lockedMajorId?: number; actor?: 'student' | 'supervisor' | 'mentor' }
export function ProjectEvidenceLedger(props: LedgerProps) {
  return <EvidenceLedger key={`${props.projectId}:${props.routeBase}:${props.lockedMajorId ?? ''}`} {...props} />
}
function EvidenceLedger({ projectId, routeBase, majors = [], lockedMajorId, actor }: LedgerProps) {
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
  const evidenceItems = result?.items ?? []
  const taskEvidenceCount = result ? evidenceItems.filter(item => item.sourceType === 'TASK').length : null
  const reportMeetingEvidenceCount = result ? evidenceItems.filter(item => item.sourceType === 'PROGRESS_REPORT' || item.sourceType === 'MEETING').length : null
  const deliverableFileEvidenceCount = result ? evidenceItems.filter(item => item.sourceType === 'DELIVERABLE' || item.sourceType === 'FILE').length : null

  return <div className="workspace-page space-y-5 pb-12">
    <header className="workspace-heading border-b border-hairline pb-5">
      <div className="min-w-0">
        <p className="workspace-kicker font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary">Đồ án #{projectId} · Sổ minh chứng</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Sổ minh chứng</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">Tra cứu minh chứng theo công việc, báo cáo và cuộc họp; đối chiếu trạng thái từ hệ thống.</p>
      </div>
    </header>

    <StatTileRow
      tiles={[
        { icon: 'fact_check', label: 'Tổng minh chứng', value: result ? result.totalCount : null, caption: 'Ghi nhận theo bộ lọc hiện tại', hero: true },
        { icon: 'assignment', label: 'Công việc', value: taskEvidenceCount, caption: 'Minh chứng từ công việc trên trang này', tone: 'info' },
        { icon: 'description', label: 'Báo cáo & Cuộc họp', value: reportMeetingEvidenceCount, caption: 'Báo cáo tiến độ và cuộc họp trang này', tone: 'warning' },
        { icon: 'inventory_2', label: 'Hạng mục & Tệp', value: deliverableFileEvidenceCount, caption: 'Bàn giao và kho tệp trên trang này', tone: 'success' },
      ]}
    />

    <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs" aria-label="Lọc minh chứng">
      <div className="flex items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
        <h2 className="text-[15px] font-bold text-ink">Bộ lọc minh chứng</h2>
        <span className="text-xs text-ink-muted">Đối chiếu trạng thái trực tiếp từ hệ thống</span>
      </div>
      <div className="flex flex-wrap items-end gap-3 p-5">
        <label className="flex-1 min-w-44 text-xs font-semibold uppercase tracking-wide text-ink-soft">Nguồn
          <select value={filters.sourceType ?? ''} onChange={event => changeFilter('sourceType', event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-sm font-normal normal-case tracking-normal text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <option value="">Tất cả nguồn</option>{sourceTypes.map(value => <option key={value} value={value}>{sourceLabels[value]}</option>)}
          </select>
        </label>
        <label className="flex-1 min-w-44 text-xs font-semibold uppercase tracking-wide text-ink-soft">Trạng thái xác minh
          <select value={filters.verificationStatus ?? ''} onChange={event => changeFilter('verificationStatus', event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-sm font-normal normal-case tracking-normal text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <option value="">Tất cả trạng thái</option>{verificationStatuses.map(value => <option key={value} value={value}>{verificationLabels[value]}</option>)}
          </select>
        </label>
        <label className="flex-1 min-w-44 text-xs font-semibold uppercase tracking-wide text-ink-soft">Ngành
          <select value={majorInput} disabled={!!lockedMajorId || !majors.length} onChange={event => setMajorInput(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-sm font-normal normal-case tracking-normal text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            {!lockedMajorId && <option value="">Tất cả ngành</option>}
            {lockedMajorId && !majors.some(item => item.majorId === lockedMajorId) && <option value={lockedMajorId}>Ngành hướng dẫn #{lockedMajorId}</option>}
            {majors.map(item => <option key={item.majorId} value={item.majorId}>{item.majorName}</option>)}
          </select>
        </label>
        <div className="flex items-end gap-2"><button type="button" onClick={applyMajor} className="min-h-11 whitespace-nowrap rounded-lg border border-primary bg-card px-4 text-sm font-semibold text-primary hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Áp dụng</button><button type="button" onClick={() => { setFilters({ majorId: lockedMajorId }); setMajorInput(String(lockedMajorId ?? '')); setPage(1) }} className="min-h-11 whitespace-nowrap rounded-lg px-3 text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Xóa lọc</button></div>
      </div>
    </section>

    {error && <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{error} <button type="button" onClick={() => void load()} className="ml-2 min-h-11 font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Thử lại</button></section>}
    {loading && <p role="status" aria-live="polite" className="rounded-xl border border-hairline bg-card p-5 text-sm text-ink-soft">Đang tải minh chứng…</p>}
    {!loading && !error && result?.items.length === 0 && <section className="rounded-xl border border-hairline bg-card p-5 text-sm text-ink-soft"><h2 className="font-semibold text-ink">Chưa có minh chứng phù hợp</h2><p className="mt-1 leading-6">Hãy thử điều chỉnh bộ lọc. Trạng thái xác minh được lấy trực tiếp từ hệ thống.</p></section>}
    {!loading && !error && result?.items.length ? <EvidenceList items={result.items} totalCount={result.totalCount} majors={majors} routeBase={routeBase} actor={actor} onReviewed={() => void load()} /> : null}
    {!loading && !error && result && result.totalPages > 1 && (
      <div className="rounded-xl border border-hairline bg-card px-5 py-3 shadow-xs">
        <Pagination page={page} pages={totalPages} total={result.totalCount} pageSize={pageSize} onPage={setPage} />
      </div>
    )}
  </div>
}

function EvidenceList({ items, totalCount, majors, routeBase, actor, onReviewed }: { items: ProjectEvidence[]; totalCount: number; majors: { majorId: number; majorName: string }[]; routeBase: string; actor?: 'student' | 'supervisor' | 'mentor'; onReviewed: () => void }) {
  const majorLabel = (majorId: number | null) => {
    if (!majorId) return 'Chưa phân loại ngành'
    const matched = majors.find(item => item.majorId === majorId)?.majorName
    return matched ? `Ngành: ${matched}` : 'Theo phạm vi chuyên ngành'
  }
  return <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs" aria-label="Danh sách minh chứng">
    <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
      <div className="flex items-center gap-2">
        <h2 className="text-[15px] font-bold text-ink">Danh sách minh chứng</h2>
        <span className="rounded-full border border-hairline bg-card px-2 py-0.5 text-xs font-semibold text-ink-soft tabular-nums">{totalCount}</span>
      </div>
      <span className="text-xs text-ink-muted">Nhấn Mở nguồn để đối chiếu bản gốc</span>
    </div>
    <ul className="divide-y divide-hairline">{items.map(item => <li key={item.id} className="grid gap-3 px-5 py-4 transition-colors hover:bg-canvas/60">
      <div className="grid gap-3 lg:grid-cols-[minmax(12rem,1fr)_minmax(10rem,.7fr)_minmax(10rem,.7fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink">{sourceLabels[item.sourceType as keyof typeof sourceLabels] ?? item.sourceType} #{item.sourceId}</p>
            <StatusBadge tone="info" label={displayLabel(item.classification)} />
          </div>
          <p className="mt-1 text-xs text-ink-muted">{majorLabel(item.majorId)}</p>
          {item.notes ? <p className="mt-1.5 break-words text-sm leading-6 text-ink-soft">{item.notes}</p> : <p className="mt-1.5 text-xs text-ink-muted">Không có ghi chú.</p>}
        </div>
        <div className="text-sm">
          <StatusBadge status={item.verificationStatus} tone={verificationTone(item.verificationStatus)} label={verificationLabels[item.verificationStatus as keyof typeof verificationLabels] ?? item.verificationStatus} />
        </div>
        <p className="text-xs leading-6 text-ink-muted tabular-nums">{formatDate(item.submittedAt)}</p>
        <div className="flex items-center justify-end">{sourcePath(routeBase, item) ? (isProtectedSource(sourcePath(routeBase, item)!) ? <ProtectedSourceButton path={sourcePath(routeBase, item)!} /> : <Link to={sourcePath(routeBase, item)!} className="inline-flex min-h-10 items-center rounded-md border border-hairline bg-card px-3 text-sm font-semibold text-primary hover:border-primary/30 hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Mở nguồn</Link>) : <span className="inline-flex min-h-10 items-center text-xs text-ink-muted">Chưa có đường dẫn nguồn</span>}</div>
      </div>
      {actor && actor !== 'student' && <EvidenceReviewSection evidenceId={item.id} onReviewed={onReviewed} />}
    </li>)}</ul>
  </section>
}

const reviewDecisionLabels: Record<string, string> = { ACCEPTED: 'Đã chấp nhận', CHANGES_REQUESTED: 'Cần bổ sung', REJECTED: 'Từ chối' }

function EvidenceReviewSection({ evidenceId, onReviewed }: { evidenceId: number; onReviewed: () => void }) {
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<EvidenceReviewTarget | null>(null)
  const [history, setHistory] = useState<EvidenceReview[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [decision, setDecision] = useState<EvidenceReviewDecision>('ACCEPTED')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true); setError('')
    Promise.all([getEvidenceReviewTarget(evidenceId), getEvidenceReviews(evidenceId, 1, 20)])
      .then(([targetResult, historyResult]) => { setTarget(targetResult); setHistory(historyResult.items) })
      .catch((reason_: unknown) => setError(reason_ instanceof HttpError && reason_.status === 403 ? 'Bạn không có quyền duyệt minh chứng này.' : 'Không tải được dữ liệu duyệt. Hãy thử lại.'))
      .finally(() => setLoading(false))
  }, [evidenceId])

  function toggle() {
    const next = !open
    setOpen(next)
    if (next && !target && !loading) load()
  }

  async function submit() {
    if (!target || !reason.trim()) return
    setBusy(true); setError('')
    try {
      await reviewEvidence(evidenceId, { sourceVersionId: target.sourceVersionId, expectedSourceVersion: target.sourceVersion, expectedLatestReviewId: target.latestReviewId, decision, reason: reason.trim() })
      setReason('')
      await load()
      onReviewed()
    } catch (reason_) {
      if (reason_ instanceof HttpError && reason_.status === 409) { load(); return }
      setError(reason_ instanceof HttpError && reason_.status === 403 ? 'Bạn không có quyền duyệt minh chứng này.' : 'Không ghi được kết quả duyệt. Hãy thử lại.')
    } finally {
      setBusy(false)
    }
  }

  const historyPagination = useClientPagination(history ?? [], 6)

  return <div className="border-t border-hairline pt-3">
    <button type="button" className="min-h-9 text-sm font-semibold text-primary underline underline-offset-4" onClick={toggle}>{open ? 'Ẩn duyệt minh chứng' : 'Duyệt minh chứng'}</button>
    {open && <div className="mt-3 space-y-3">
      {loading && <p role="status" className="text-sm text-ink-muted">Đang tải…</p>}
      {error && <p role="alert" className="text-sm text-status-error-text">{error}</p>}
      {!loading && history && history.length > 0 && <>
        <ul className="space-y-2">
          {historyPagination.paginatedItems.map((review) => <li key={review.id} className="text-sm"><span className="font-semibold text-ink">{reviewDecisionLabels[review.decision] ?? review.decision}</span> <span className="text-ink-muted">· {formatDate(review.reviewedAt)}</span><p className="mt-0.5 text-ink-soft">{review.reason}</p></li>)}
        </ul>
        {historyPagination.showPagination && (
          <div className="border-t border-hairline pt-2">
            <Pagination
              page={historyPagination.page}
              pages={historyPagination.totalPages}
              total={historyPagination.total}
              pageSize={historyPagination.pageSize}
              onPage={historyPagination.setPage}
            />
          </div>
        )}
      </>}
      {!loading && target && !target.canReview && <p className="text-sm text-ink-muted">{target.denialReason ?? 'Chưa thể duyệt minh chứng này.'}</p>}
      {!loading && target?.canReview && <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm text-ink-soft">Kết quả<select className="mt-1 block min-h-10 rounded-lg border border-hairline bg-card px-3 py-2 text-sm font-normal text-ink" value={decision} disabled={busy} onChange={(event) => setDecision(event.target.value as EvidenceReviewDecision)}>
          <option value="ACCEPTED">Đã chấp nhận</option>
          <option value="CHANGES_REQUESTED">Cần bổ sung</option>
          <option value="REJECTED">Từ chối</option>
        </select></label>
        <label className="flex-1 min-w-48 text-sm text-ink-soft">Lý do<input className="mt-1 w-full min-h-10 rounded-lg border border-hairline bg-card px-3 py-2 text-sm font-normal text-ink" value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} /></label>
        <button type="button" className="min-h-10 whitespace-nowrap rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50" disabled={busy || !reason.trim()} onClick={() => void submit()}>Ghi kết quả duyệt</button>
      </div>}
    </div>}
  </div>
}

function sourcePath(routeBase: string, item: ProjectEvidence): string | null {
  const sourceUrl = (item as ProjectEvidence & { sourceUrl?: string | null }).sourceUrl
  if (sourceUrl) return sourceUrl
  switch (item.sourceType) {
    case 'TASK': return `${routeBase}/tasks/${item.sourceId}`
    case 'MEETING': return `${routeBase}/meetings/${item.sourceId}`
    case 'PROGRESS_REPORT': return `${routeBase}/reports/${item.sourceId}`
    case 'DELIVERABLE': return `${routeBase}/deliverables`
    case 'FILE': return `${routeBase}/files`
    default: return null
  }
}

function isProtectedSource(path: string) {
  return path.startsWith('/api/')
}

function ProtectedSourceButton({ path }: { path: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const open = async () => {
    setBusy(true); setError(false)
    try {
      const blob = await httpGetBlob(path.startsWith('/api/v1/') ? path.slice('/api/v1'.length) : path)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.target = '_blank'
      anchor.rel = 'noreferrer'
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }
  return <button type="button" disabled={busy} onClick={() => void open()} className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{busy ? 'Đang mở…' : error ? 'Mở lại nguồn' : 'Mở nguồn'}</button>
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
