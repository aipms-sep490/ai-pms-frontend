import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { Button } from '../../../components/ui/Button'
import { FilterToolbar } from '../../../components/ui/FilterToolbar'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { HttpError } from '../../../services/http/http-client'
import { getProjectPeriods, getSemesters } from '../api/governance-api'
import type { PagedResult, ProjectPeriod, Semester } from '../types/governance.types'

type WindowFilter = '' | 'OPEN' | 'UPCOMING' | 'CLOSED'
type PeriodSort = 'default' | 'end_asc' | 'start_desc'

const pageSize = 6
const dateLabel = (value: string) => new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
}).format(new Date(value))

function getPeriodWindowStatus(startAt: string, endAt: string) {
  const now = Date.now()
  const start = new Date(startAt).getTime()
  const end = new Date(endAt).getTime()

  if (now < start) {
    return { label: 'Chưa mở nhận hồ sơ', tone: 'neutral' as const, isWithinWindow: false }
  }
  if (now > end) {
    return { label: 'Đã hết hạn nhận hồ sơ', tone: 'muted' as const, isWithinWindow: false }
  }
  return { label: 'Đang mở nhận hồ sơ', tone: 'success' as const, isWithinWindow: true }
}

export function ProjectPeriodCatalogPage() {
  const { session } = useAuthSession()
  const { semester } = useStudentJourney()
  const [searchParams, setSearchParams] = useSearchParams()

  const urlSearch = searchParams.get('q') ?? ''
  const urlSemesterId = searchParams.get('semesterId') ? Number(searchParams.get('semesterId')) : undefined
  const urlPage = searchParams.get('page') ? Math.max(1, Number(searchParams.get('page'))) : 1

  const [windowFilter, setWindowFilter] = useState<WindowFilter>('')
  const [sortBy, setSortBy] = useState<PeriodSort>('default')
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [response, setResponse] = useState<{ key: string; data: PagedResult<ProjectPeriod> } | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const [forbiddenKey, setForbiddenKey] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  const token = session?.accessToken
  const requestKey = `${token ?? ''}:${urlSearch}:${urlSemesterId ?? ''}:${urlPage}:${revision}`
  const result = response?.key === requestKey ? response.data : null
  const error = failedKey === requestKey
  const isForbidden = forbiddenKey === requestKey
  const loading = !result && !error && !isForbidden

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    getSemesters(token, { search: '', status: 'ACTIVE' }, controller.signal)
      .then(data => setSemesters(data.items))
      .catch(() => { if (!controller.signal.aborted) setSemesters([]) })
    return () => controller.abort()
  }, [token])

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    getProjectPeriods(token, { search: urlSearch, semesterId: urlSemesterId, status: 'ACTIVE', periodType: 'REGISTRATION' }, controller.signal, urlPage, pageSize)
      .then(data => { if (!controller.signal.aborted) setResponse({ key: requestKey, data }) })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          if (err instanceof HttpError && err.status === 403) {
            setForbiddenKey(requestKey)
          } else {
            setFailedKey(requestKey)
          }
        }
      })
    return () => controller.abort()
  }, [token, urlSearch, urlSemesterId, urlPage, revision, requestKey])

  const handleSearchChange = (value: string) => {
    const nextParams = new URLSearchParams(searchParams)
    const trimmed = value.trim()
    if (trimmed) nextParams.set('q', trimmed)
    else nextParams.delete('q')
    nextParams.delete('page')
    setSearchParams(nextParams)
  }

  const handleSemesterChange = (newSemesterId: string) => {
    const nextParams = new URLSearchParams(searchParams)
    if (newSemesterId) nextParams.set('semesterId', newSemesterId)
    else nextParams.delete('semesterId')
    nextParams.delete('page')
    setSearchParams(nextParams)
  }

  const handlePageChange = (newPage: number) => {
    const nextParams = new URLSearchParams(searchParams)
    if (newPage > 1) nextParams.set('page', String(newPage))
    else nextParams.delete('page')
    setSearchParams(nextParams)
  }

  const clearAll = () => {
    setWindowFilter('')
    setSortBy('default')
    setSearchParams({})
  }

  const visiblePeriods = useMemo(() => {
    const items = result?.items ?? []
    const filtered = items.filter((period) => {
      if (!windowFilter) return true
      const status = getPeriodWindowStatus(period.startAt, period.endAt)
      if (windowFilter === 'OPEN') return status.isWithinWindow
      if (windowFilter === 'UPCOMING') return status.tone === 'neutral'
      return status.tone === 'muted'
    })
    if (sortBy === 'default') return filtered
    return [...filtered].sort((a, b) =>
      sortBy === 'end_asc'
        ? new Date(a.endAt).getTime() - new Date(b.endAt).getTime()
        : new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
    )
  }, [result, windowFilter, sortBy])

  const hasFilters = Boolean(urlSearch || urlSemesterId || windowFilter || sortBy !== 'default')
  const totalPages = Math.max(1, Math.ceil((result?.totalCount ?? 0) / pageSize))

  return <WorkspacePage size="wide" title="Kỳ đăng ký đồ án" eyebrow="Khám phá học kỳ" description="Tìm kỳ đăng ký đang hoạt động và xem bước tiếp theo trong lộ trình đồ án." action={<Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại" disabled={loading} onClick={() => setRevision(value => value + 1)} />}>
    <div className="mb-5">
      <StatTileRow
        tiles={[
          { icon: 'event_note', label: 'Kỳ đăng ký khả dụng', value: result ? result.totalCount : null, hero: true, caption: 'Trong cơ sở đào tạo của bạn.' },
          { icon: 'check_circle', label: 'Đang mở nhận hồ sơ', value: result ? result.items.filter(p => getPeriodWindowStatus(p.startAt, p.endAt).isWithinWindow).length : null, tone: 'success', caption: 'Trong cửa sổ đăng ký hiện tại.' },
          { icon: 'upcoming', label: 'Sắp mở / Chưa mở', value: result ? result.items.filter(p => getPeriodWindowStatus(p.startAt, p.endAt).tone === 'neutral').length : null, tone: 'info', caption: 'Chuẩn bị nhóm và đề tài trước hạn.' },
          { icon: 'calendar_month', label: 'Học kỳ đang hoạt động', value: semesters.length, tone: 'neutral', caption: semester?.name ?? 'Các học kỳ đang mở.' },
        ]}
      />
    </div>
    {/* Academic directory scope notice */}
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-hairline bg-card/60 px-4 py-2.5 text-xs text-ink-muted">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-sm text-primary" aria-hidden="true">policy</span>
        <span>Danh sách được giới hạn theo <strong>cơ sở đào tạo của tài khoản</strong>; quản trị viên có thể xem toàn hệ thống.</span>
      </div>
      <span className="rounded-full bg-canvas px-2.5 py-0.5 font-medium text-ink-muted border border-hairline/60">
        Phạm vi tài khoản
      </span>
    </div>

    {/* F-Research inspired Guidance Panel (P09) */}
    <section className="mb-6 rounded-xl border border-hairline bg-gradient-to-r from-primary-subtle/50 via-card to-card p-5" aria-label="Hướng dẫn tham gia kỳ đồ án">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm" aria-hidden="true">info</span>
            Quy trình tham gia đợt đồ án
          </div>
          <h2 className="mt-1 font-heading text-base font-bold text-ink">3 bước chuẩn bị trước khi nộp hồ sơ</h2>
          <p className="mt-1 text-xs text-ink-muted leading-relaxed">
            Sinh viên cần bảo đảm điều kiện học vụ, thành lập nhóm hợp lệ và chọn đề tài phù hợp trước khi thời hạn đăng ký của đợt kết thúc.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link to="/team" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-hairline bg-card px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <span className="material-symbols-outlined text-sm text-primary" aria-hidden="true">groups</span>
            Quản lý nhóm
          </Link>
          <Link to="/projects/lifecycle" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-hairline bg-card px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <span className="material-symbols-outlined text-sm text-primary" aria-hidden="true">timeline</span>
            Lộ trình đồ án
          </Link>
          <Link to="/topics" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-hairline bg-card px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <span className="material-symbols-outlined text-sm text-primary" aria-hidden="true">explore</span>
            Khám phá đề tài
          </Link>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3 border-t border-hairline/60 pt-4 text-xs">
        <div className="flex items-start gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white text-xs">1</span>
          <div>
            <strong className="block font-semibold text-ink">Kiểm tra điều kiện</strong>
            <span className="text-ink-muted">Xem điều kiện học vụ của đợt đăng ký trong hồ sơ</span>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white text-xs">2</span>
          <div>
            <strong className="block font-semibold text-ink">Lập nhóm đồ án</strong>
            <span className="text-ink-muted">Số thành viên theo quy định của đợt đăng ký</span>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white text-xs">3</span>
          <div>
            <strong className="block font-semibold text-ink">Đăng ký đề tài</strong>
            <span className="text-ink-muted">Chọn đề tài từ giảng viên hoặc tự đề xuất</span>
          </div>
        </div>
      </div>
    </section>

    <FilterToolbar
      ariaLabel="Tìm kỳ đăng ký"
      tabs={[
        { value: '', label: 'Tất cả' },
        { value: 'OPEN', label: 'Đang mở nhận hồ sơ' },
        { value: 'UPCOMING', label: 'Chưa mở' },
        { value: 'CLOSED', label: 'Đã hết hạn' },
      ]}
      activeTab={windowFilter}
      onTabChange={(val) => setWindowFilter(val as WindowFilter)}
      search={urlSearch}
      onSearchChange={handleSearchChange}
      searchLabel="Tìm theo mã hoặc tên kỳ"
      searchPlaceholder="Tìm theo mã hoặc tên kỳ (ví dụ: Fall 2026)…"
      controls={
        <select aria-label="Học kỳ" value={urlSemesterId ?? ''} onChange={event => handleSemesterChange(event.target.value)}>
          <option value="">Tất cả học kỳ</option>
          {semesters.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      }
      sort={{
        value: sortBy,
        onChange: (val) => setSortBy(val as PeriodSort),
        options: [
          { value: 'default', label: 'Mặc định' },
          { value: 'end_asc', label: 'Sắp kết thúc' },
          { value: 'start_desc', label: 'Mới mở nhất' },
        ],
      }}
      hasActiveFilters={hasFilters}
      onClearAll={clearAll}
      resultSummary={result ? `${visiblePeriods.length} / ${result.totalCount} kỳ phù hợp` : undefined}
    />
    <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-heading text-xl font-bold text-ink">Kỳ đang mở đăng ký</h2>
      {result && <span className="rounded-full bg-primary-subtle px-3 py-1 text-sm font-semibold text-primary">{result.totalCount} kỳ phù hợp</span>}
    </div>
    {loading && <p role="status" className="mt-4 rounded-xl border border-hairline bg-card p-6 text-ink-muted">Đang tải các kỳ đăng ký…</p>}
    {isForbidden && (
      <div role="alert" className="mt-4 rounded-xl border border-status-warning-border bg-status-warning-bg p-5 text-status-warning-text">
        <strong>Không thể xem danh sách kỳ đăng ký:</strong> Tài khoản chưa được gán cơ sở đào tạo đang hoạt động hoặc không có quyền xem dữ liệu này. Liên hệ quản trị viên nếu bạn cần hỗ trợ.
      </div>
    )}
    {!isForbidden && error && (
      <div role="alert" className="mt-4 rounded-xl border border-status-error-border bg-status-error-bg p-5 text-status-error-text">
        Không tải được danh sách kỳ đăng ký. <button type="button" onClick={() => setRevision(value => value + 1)} className="font-semibold underline">Thử lại</button>
      </div>
    )}
    {!loading && !error && !isForbidden && visiblePeriods.length === 0 && <p className="mt-4 rounded-xl border border-hairline bg-card p-6 text-ink-muted">Chưa có kỳ đăng ký đang hoạt động phù hợp bộ lọc. Hãy thử từ khóa hoặc học kỳ khác.</p>}
    {!loading && !error && !isForbidden && result && visiblePeriods.length > 0 && <>
      <ul className="mt-4 grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">{visiblePeriods.map(period => {
        const isCurrentSemester = period.academicSemesterId === semester?.id
        const windowStatus = getPeriodWindowStatus(period.startAt, period.endAt)
        return <li key={period.id} className="flex h-full min-w-0 flex-col justify-between overflow-hidden rounded-xl border border-hairline bg-card">
          <div className="flex-1 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full bg-primary-subtle px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">{period.semesterName}</span>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                windowStatus.tone === 'success'
                  ? 'border-status-success-border bg-status-success-bg text-status-success-text'
                  : windowStatus.tone === 'neutral'
                    ? 'border-primary-subtle bg-primary-subtle/50 text-primary'
                    : 'border-hairline bg-canvas text-ink-muted'
              }`}>{windowStatus.label}</span>
            </div>
            <h3 className="mt-5 break-words font-heading text-lg font-bold text-ink">{period.name}</h3>
            <p className="mt-1 font-mono text-sm text-ink-muted">{period.code}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-hairline pt-4 text-sm">
              <div><dt className="text-ink-muted">Bắt đầu</dt><dd className="mt-1 font-semibold text-ink">{dateLabel(period.startAt)}</dd></div>
              <div><dt className="text-ink-muted">Kết thúc</dt><dd className="mt-1 font-semibold text-ink">{dateLabel(period.endAt)}</dd></div>
            </dl>
          </div>
          <div className="border-t border-hairline p-4">
            {isCurrentSemester ? (
              <Link to="/team" className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary-hover">
                Xem nhóm và điều kiện <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <p className="text-sm leading-6 text-ink-muted">Học kỳ này chưa được chọn trong hồ sơ hiện tại. Kiểm tra ngữ cảnh học kỳ trước khi tiếp tục.</p>
            )}
          </div>
        </li>
      })}</ul>
      <nav className="mt-5 flex items-center justify-center gap-3" aria-label="Phân trang kỳ đăng ký">
        <button type="button" disabled={urlPage <= 1} onClick={() => handlePageChange(urlPage - 1)} className="min-h-11 rounded-lg border border-hairline bg-card px-4 text-sm font-semibold text-primary transition-colors hover:border-primary hover:bg-primary-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40">Trang trước</button>
        <span className="text-sm font-semibold text-ink-soft">{urlPage} / {totalPages}</span>
        <button type="button" disabled={urlPage >= totalPages} onClick={() => handlePageChange(urlPage + 1)} className="min-h-11 rounded-lg border border-hairline bg-card px-4 text-sm font-semibold text-primary transition-colors hover:border-primary hover:bg-primary-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40">Trang sau</button>
      </nav>
    </>}
  </WorkspacePage>
}
