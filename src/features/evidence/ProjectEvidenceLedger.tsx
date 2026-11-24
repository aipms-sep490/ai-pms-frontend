import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { displayLabel } from '../../components/ui/display-label'
import { FilterToolbar } from '../../components/ui/FilterToolbar'
import type { FilterChipItem } from '../../components/ui/FilterChips'
import { ListLoading } from '../../components/ui/ListLoading'
import { StatTileRow } from '../../components/ui/StatTileRow'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { httpGetBlob, HttpError } from '../../services/http/http-client'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import { getProjectEvidence, type ProjectEvidence, type ProjectEvidenceQuery } from '../projects/api/project-governance-api'
import { useProjectDisciplineScope } from '../projects/hooks/useProjectDisciplineScope'
import { getEvidenceReviewTarget, getEvidenceReviews, reviewEvidence } from './evidence-review-api'
import type { EvidenceReview, EvidenceReviewDecision, EvidenceReviewTarget } from './evidence-review-types'

const sourceTypes = ['TASK', 'DELIVERABLE', 'MEETING', 'PROGRESS_REPORT', 'FILE'] as const
const verificationStatuses = ['PENDING', 'UNKNOWN', 'VERIFIED', 'REJECTED'] as const
const sourceLabels: Record<(typeof sourceTypes)[number], string> = { TASK: 'Công việc', DELIVERABLE: 'Hạng mục bàn giao', MEETING: 'Cuộc họp', PROGRESS_REPORT: 'Báo cáo tiến độ', FILE: 'Tệp' }
const verificationLabels: Record<string, string> = { PENDING: 'Chờ xác minh', UNKNOWN: 'Chưa xác định', VERIFIED: 'Đã xác minh', REJECTED: 'Bị từ chối' }
const verificationTone = (status: string): 'success' | 'danger' | 'warning' | 'neutral' => {
  if (status === 'VERIFIED') return 'success'
  if (status === 'REJECTED') return 'danger'
  if (status === 'PENDING') return 'warning'
  return 'neutral'
}
const pageSize = 20

type Filters = Pick<ProjectEvidenceQuery, 'sourceType' | 'majorId' | 'verificationStatus'>
type EvidenceSort = 'newest' | 'oldest'

export function ProjectEvidenceLedgerPage() {
  const access = useExecutionAccess()
  const scope = useProjectDisciplineScope(access.project)
  if (access.actor === 'mentor' && !access.supervisor?.majorId) return <p role="alert">Chưa xác định được ngành hướng dẫn. Hãy tải lại hồ sơ phân công.</p>
  return <>
    {scope.loading && <p role="status" className="mb-4 text-sm">Đang tải phạm vi ngành…</p>}
    {scope.error && <p role="status" className="mb-4 text-sm text-ink-muted">{scope.error} Bộ lọc ngành tạm thời chưa khả dụng. <button type="button" className="min-h-11 underline" onClick={scope.retry}>Tải lại phạm vi ngành</button></p>}
    <ProjectEvidenceLedger projectId={access.project.id} projectLabel={[access.project.code, access.project.title].filter(Boolean).join(' · ')} routeBase={access.routeBase} majors={scope.majors} lockedMajorId={access.actor === 'mentor' ? access.supervisor?.majorId ?? undefined : undefined} actor={access.actor} />
  </>
}

/** Listing is read-only; review decisions are written via BE-13 (project-evidence/{id}/reviews).
 * `actor` is presentation-only (hides the review toggle for students, who have no
 * review-history API access at all) — the server remains the sole review authority. */
interface LedgerProps { projectId: number; projectLabel?: string; routeBase: string; majors?: { majorId: number; majorName: string }[]; lockedMajorId?: number; actor?: 'student' | 'supervisor' | 'mentor' }
export function ProjectEvidenceLedger(props: LedgerProps) {
  return <EvidenceLedger key={`${props.projectId}:${props.routeBase}:${props.lockedMajorId ?? ''}`} {...props} />
}
function EvidenceLedger({ projectId, projectLabel, routeBase, majors = [], lockedMajorId, actor }: LedgerProps) {
  const [filters, setFilters] = useState<Filters>({ majorId: lockedMajorId })
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<EvidenceSort>('newest')
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

  const changeMajor = (value: string) => {
    if (lockedMajorId) return
    const majorId = value ? Number(value) : undefined
    if (majorId !== undefined && !majors.some(item => item.majorId === majorId)) return
    setFilters(current => ({ ...current, majorId }))
    setPage(1)
  }
  const changeFilter = (key: keyof Omit<Filters, 'majorId'>, value: string) => {
    setFilters(current => ({ ...current, [key]: value || undefined }))
    setPage(1)
  }
  const clearAll = () => {
    setFilters({ majorId: lockedMajorId })
    setSearch('')
    setSortBy('newest')
    setPage(1)
  }
  const majorMap = useMemo(() => Object.fromEntries(majors.map(item => [item.majorId, item.majorName])), [majors])
  const totalPages = result?.totalPages ?? 1

  const visibleItems = useMemo(() => {
    const items = result?.items ?? []
    const q = search.trim().toLowerCase()
    const filtered = q ? items.filter(item =>
      `${item.sourceTitle ?? ''} ${item.notes ?? ''} ${item.submittedByName ?? ''} ${sourceLabels[item.sourceType as keyof typeof sourceLabels] ?? ''}`.toLowerCase().includes(q)
    ) : items
    return [...filtered].sort((a, b) => {
      const diff = new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      return sortBy === 'oldest' ? -diff : diff
    })
  }, [result, search, sortBy])

  const activeChips = useMemo<FilterChipItem[]>(() => {
    const chips: FilterChipItem[] = []
    if (filters.sourceType) chips.push({ id: 'sourceType', label: 'Nguồn', value: sourceLabels[filters.sourceType as keyof typeof sourceLabels] ?? filters.sourceType })
    if (filters.verificationStatus) chips.push({ id: 'verificationStatus', label: 'Trạng thái', value: verificationLabels[filters.verificationStatus] ?? filters.verificationStatus })
    if (!lockedMajorId && filters.majorId) chips.push({ id: 'majorId', label: 'Ngành', value: majorMap[filters.majorId] ?? 'Chuyên ngành' })
    if (search.trim()) chips.push({ id: 'search', label: 'Từ khóa', value: search.trim() })
    return chips
  }, [filters, lockedMajorId, majorMap, search])

  const hasActiveFilters = activeChips.length > 0 || sortBy !== 'newest' || Boolean(lockedMajorId)

  return <WorkspacePage
    size="wide"
    className="space-y-5"
    title="Sổ minh chứng"
    eyebrow={projectLabel ? `${projectLabel} · Sổ minh chứng` : 'Sổ minh chứng đồ án'}
    description="Tra cứu minh chứng theo công việc, báo cáo và cuộc họp; đối chiếu trạng thái từ hệ thống."
    action={
      <button type="button" disabled={loading} onClick={() => void load()} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-hairline bg-card px-3.5 text-sm font-semibold text-ink-soft transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary disabled:opacity-50">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">refresh</span>
        Làm mới
      </button>
    }
  >
    <StatTileRow
      tiles={[
        { icon: 'fact_check', label: 'Tổng minh chứng', value: result ? result.totalCount : null, caption: 'Ghi nhận tự động theo bộ lọc hiện tại', hero: true },
        { icon: 'verified', label: 'Đã xác minh', value: result ? result.items.filter(i => i.verificationStatus === 'VERIFIED').length : null, caption: 'Đã được kiểm chứng trên trang này', tone: 'success' },
        { icon: 'hourglass_top', label: 'Chờ xác minh', value: result ? result.items.filter(i => i.verificationStatus === 'PENDING').length : null, caption: 'Đang chờ rà soát trên trang này', tone: (result?.items.filter(i => i.verificationStatus === 'PENDING').length ?? 0) > 0 ? 'warning' : 'neutral' },
        { icon: 'cancel', label: 'Bị từ chối', value: result ? result.items.filter(i => i.verificationStatus === 'REJECTED').length : null, caption: 'Cần bổ sung minh chứng thay thế', tone: (result?.items.filter(i => i.verificationStatus === 'REJECTED').length ?? 0) > 0 ? 'danger' : 'neutral' },
      ]}
    />
    <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs" aria-label="Lọc minh chứng">
      <FilterToolbar
        embedded
        search={search}
        onSearchChange={setSearch}
        searchLabel="Tìm minh chứng"
        searchPlaceholder="Tìm tiêu đề, ghi chú…"
        controls={
          <>
            <select aria-label="Nguồn" value={filters.sourceType ?? ''} onChange={event => changeFilter('sourceType', event.target.value)}>
              <option value="">Tất cả nguồn</option>
              {sourceTypes.map(value => <option key={value} value={value}>{sourceLabels[value]}</option>)}
            </select>
            <select aria-label="Trạng thái xác minh" value={filters.verificationStatus ?? ''} onChange={event => changeFilter('verificationStatus', event.target.value)}>
              <option value="">Tất cả trạng thái</option>
              {verificationStatuses.map(value => <option key={value} value={value}>{verificationLabels[value]}</option>)}
            </select>
            <select aria-label="Ngành" value={String(filters.majorId ?? '')} disabled={!!lockedMajorId || !majors.length} onChange={event => changeMajor(event.target.value)}>
              {!lockedMajorId && <option value="">Tất cả ngành</option>}
              {lockedMajorId && !majors.some(item => item.majorId === lockedMajorId) && <option value={lockedMajorId}>Ngành hướng dẫn</option>}
              {majors.map(item => <option key={item.majorId} value={item.majorId}>{item.majorName}</option>)}
            </select>
          </>
        }
        sort={{
          value: sortBy,
          onChange: (val) => setSortBy(val as EvidenceSort),
          options: [
            { value: 'newest', label: 'Mới gửi nhất' },
            { value: 'oldest', label: 'Cũ nhất' },
          ],
        }}
        activeChips={activeChips}
        onRemoveChip={(id) => {
          if (id === 'search') setSearch('')
          else if (id === 'majorId') changeMajor('')
          else changeFilter(id as keyof Omit<Filters, 'majorId'>, '')
        }}
        hasActiveFilters={hasActiveFilters}
        onClearAll={clearAll}
        resultSummary={result ? `${visibleItems.length} / ${result.totalCount} minh chứng` : undefined}
      />

      {error && <div role="alert" className="m-4 rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{error} <button type="button" onClick={() => void load()} className="ml-2 min-h-11 font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Thử lại</button></div>}
      {loading && <ListLoading label="Đang tải minh chứng…" />}
      {!loading && !error && result && visibleItems.length === 0 && <div className="p-6 text-center text-sm text-ink-soft"><h2 className="font-semibold text-ink">Chưa có minh chứng phù hợp</h2><p className="mt-1 leading-6 text-ink-muted">Hãy thử điều chỉnh bộ lọc. Trạng thái xác minh được lấy trực tiếp từ hệ thống.</p></div>}
      {!loading && !error && visibleItems.length > 0 ? <EvidenceList items={visibleItems} majorMap={majorMap} routeBase={routeBase} actor={actor} onReviewed={() => void load()} /> : null}
    </section>

    {!loading && !error && result && result.totalPages > 1 && <nav aria-label="Phân trang minh chứng" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-card p-4 text-sm"><button type="button" disabled={page <= 1} onClick={() => setPage(current => current - 1)} className="min-h-11 whitespace-nowrap rounded-lg border border-hairline px-4 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Trang trước</button><span aria-live="polite">Trang {page} / {totalPages} · {result.totalCount} minh chứng</span><button type="button" disabled={page >= totalPages} onClick={() => setPage(current => current + 1)} className="min-h-11 whitespace-nowrap rounded-lg border border-hairline px-4 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Trang sau</button></nav>}
  </WorkspacePage>
}

function EvidenceList({ items, majorMap, routeBase, actor, onReviewed }: { items: ProjectEvidence[]; majorMap: Record<number, string>; routeBase: string; actor?: 'student' | 'supervisor' | 'mentor'; onReviewed: () => void }) {
  return <div aria-label="Danh sách minh chứng"><ul className="divide-y divide-hairline">{items.map(item => <li key={item.id} className="grid gap-3 p-4 sm:p-5">
    <div className="grid gap-3 lg:grid-cols-[minmax(12rem,1fr)_minmax(10rem,.7fr)_minmax(10rem,.7fr)_auto] lg:items-start">
      <div className="min-w-0"><p className="font-semibold text-ink">{sourceLabels[item.sourceType as keyof typeof sourceLabels] ?? displayLabel(item.sourceType)}{item.sourceTitle ? `: ${item.sourceTitle}` : ''}</p><p className="mt-1 text-sm text-ink-muted">{item.majorName ?? (item.majorId ? majorMap[item.majorId] ?? 'Chuyên ngành' : 'Chưa phân loại ngành')} · {displayLabel(item.classification)}</p>{item.notes ? <p className="mt-2 break-words text-sm leading-6 text-ink-soft">{item.notes}</p> : <p className="mt-2 text-sm text-ink-muted">Không có ghi chú.</p>}</div>
      <div className="text-sm"><StatusBadge tone={verificationTone(item.verificationStatus)} label={verificationLabels[item.verificationStatus as keyof typeof verificationLabels] ?? displayLabel(item.verificationStatus)} /><p className="mt-1.5 text-xs text-ink-muted">Người gửi: {item.submittedByName ?? 'Thành viên đồ án'}</p></div>
      <p className="text-sm leading-6 text-ink-muted">{formatDate(item.submittedAt)}</p>
       <div>{sourcePath(routeBase, item) ? (isProtectedSource(sourcePath(routeBase, item)!) ? <ProtectedSourceButton path={sourcePath(routeBase, item)!} /> : <Link to={sourcePath(routeBase, item)!} className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Mở nguồn</Link>) : <span className="inline-flex min-h-11 items-center text-sm text-ink-muted">Chưa có đường dẫn nguồn</span>}</div>
    </div>
    {actor && actor !== 'student' && <EvidenceReviewSection evidenceId={item.id} onReviewed={onReviewed} />}
  </li>)}</ul></div>
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

  return <div className="border-t border-hairline pt-3">
    <button type="button" className="min-h-9 text-sm font-semibold text-primary underline underline-offset-4" onClick={toggle}>{open ? 'Ẩn duyệt minh chứng' : 'Duyệt minh chứng'}</button>
    {open && <div className="mt-3 space-y-3">
      {loading && <p role="status" className="text-sm text-ink-muted">Đang tải…</p>}
      {error && <p role="alert" className="text-sm text-status-error-text">{error}</p>}
      {!loading && history && history.length > 0 && <ul className="space-y-2">
        {history.map((review) => <li key={review.id} className="text-sm"><span className="font-semibold text-ink">{reviewDecisionLabels[review.decision] ?? review.decision}</span> <span className="text-ink-muted">· {formatDate(review.reviewedAt)}</span><p className="mt-0.5 text-ink-soft">{review.reason}</p></li>)}
      </ul>}
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
    const code = reason.problem?.code ?? reason.problem?.errorCode
    if (code === 'ASSIGNMENT_REVOKED') return 'Phân công của bạn đã bị thu hồi hoặc hết hiệu lực (ASSIGNMENT_REVOKED).'
    if (code === 'SCOPE_ACCESS_DENIED') return 'Minh chứng này nằm ngoài phạm vi ngành được phân công (SCOPE_ACCESS_DENIED).'
    if (reason.status === 403) return 'Hệ thống không cấp quyền xem minh chứng của đồ án này.'
    if (reason.status === 404) return 'Không tìm thấy đồ án hoặc minh chứng được yêu cầu.'
  }
  return 'Không thể tải minh chứng. Hãy thử lại.'
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })
}
