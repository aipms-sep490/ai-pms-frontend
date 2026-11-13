import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { getProjectPeriods, getSemesters } from '../api/governance-api'
import type { PagedResult, ProjectPeriod, Semester } from '../types/governance.types'

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

  const [searchText, setSearchText] = useState(urlSearch)
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [response, setResponse] = useState<{ key: string; data: PagedResult<ProjectPeriod> } | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  const token = session?.accessToken
  const requestKey = `${token ?? ''}:${urlSearch}:${urlSemesterId ?? ''}:${urlPage}:${revision}`
  const result = response?.key === requestKey ? response.data : null
  const error = failedKey === requestKey
  const loading = !result && !error

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
      .catch(() => { if (!controller.signal.aborted) setFailedKey(requestKey) })
    return () => controller.abort()
  }, [token, urlSearch, urlSemesterId, urlPage, revision, requestKey])

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    const nextParams = new URLSearchParams(searchParams)
    const trimmed = searchText.trim()
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

  const totalPages = Math.max(1, Math.ceil((result?.totalCount ?? 0) / pageSize))

  return <WorkspacePage title="Kỳ đăng ký đồ án" eyebrow="Khám phá học kỳ" description="Tìm kỳ đăng ký đang hoạt động và xem bước tiếp theo trong lộ trình đồ án.">
    {/* Scope & Policy Notice (SCOPE-01) */}
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-hairline bg-card/60 px-4 py-2.5 text-xs text-ink-muted">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-sm text-primary">policy</span>
        <span>Phạm vi hiển thị: <strong>Danh mục toàn cơ sở đào tạo</strong> (Áp dụng theo quy chế đào tạo hiện hành)</span>
      </div>
      <span className="rounded-full bg-canvas px-2.5 py-0.5 font-medium text-ink-muted border border-hairline/60">
        SCOPE-01: Public Directory
      </span>
    </div>

    {/* F-Research inspired Guidance Panel (P09) */}
    <section className="mb-6 rounded-xl border border-hairline bg-gradient-to-r from-primary-subtle/50 via-card to-card p-5" aria-label="Hướng dẫn tham gia kỳ đồ án">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">info</span>
            Quy trình tham gia đợt đồ án
          </div>
          <h2 className="mt-1 font-heading text-base font-bold text-ink">3 bước chuẩn bị trước khi nộp hồ sơ</h2>
          <p className="mt-1 text-xs text-ink-muted leading-relaxed">
            Sinh viên cần bảo đảm điều kiện học vụ, thành lập nhóm hợp lệ và chọn đề tài phù hợp trước khi thời hạn đăng ký của đợt kết thúc.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link to="/team" className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-card px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-canvas">
            <span className="material-symbols-outlined text-sm text-primary">groups</span>
            Quản lý nhóm
          </Link>
          <Link to="/projects/lifecycle" className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-card px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-canvas">
            <span className="material-symbols-outlined text-sm text-primary">timeline</span>
            Lộ trình đồ án
          </Link>
          <Link to="/topics" className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-card px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-canvas">
            <span className="material-symbols-outlined text-sm text-primary">explore</span>
            Khám phá đề tài
          </Link>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3 border-t border-hairline/60 pt-4 text-xs">
        <div className="flex items-start gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white text-xs">1</span>
          <div>
            <strong className="block font-semibold text-ink">Kiểm tra điều kiện</strong>
            <span className="text-ink-muted">Tín chỉ tích lũy &amp; không nợ môn tiên quyết</span>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white text-xs">2</span>
          <div>
            <strong className="block font-semibold text-ink">Lập nhóm đồ án</strong>
            <span className="text-ink-muted">3–5 sinh viên theo quy chế của ngành</span>
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

    <section className="rounded-xl border border-hairline bg-card p-4 sm:p-5" aria-label="Tìm kỳ đăng ký">
      <form onSubmit={submitSearch} className="flex flex-col gap-3 lg:flex-row">
        <label className="min-w-0 flex-1 text-sm font-semibold text-ink-soft">Tìm theo mã hoặc tên kỳ
          <input value={searchText} onChange={event => setSearchText(event.target.value)} placeholder="Ví dụ: Fall 2026" className="mt-1.5 min-h-11 w-full rounded-lg border border-hairline bg-canvas px-3 text-ink outline-primary" />
        </label>
        <label className="text-sm font-semibold text-ink-soft lg:w-56">Học kỳ
          <select value={urlSemesterId ?? ''} onChange={event => handleSemesterChange(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-hairline bg-canvas px-3 text-ink">
            <option value="">Tất cả học kỳ</option>
            {semesters.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <button type="submit" className="min-h-11 self-end rounded-lg bg-primary px-5 font-semibold text-white hover:bg-primary-hover">Tìm kiếm</button>
      </form>
    </section>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-heading text-xl font-bold text-ink">Kỳ đang mở đăng ký</h2>
      {result && <span className="rounded-full bg-primary-subtle px-3 py-1 text-sm font-semibold text-primary">{result.totalCount} kỳ phù hợp</span>}
    </div>
    {loading && <p role="status" className="mt-4 rounded-xl border border-hairline bg-card p-6 text-ink-muted">Đang tải các kỳ đăng ký…</p>}
    {error && <div role="alert" className="mt-4 rounded-xl border border-status-error-border bg-status-error-bg p-5 text-status-error-text">Không tải được danh sách kỳ đăng ký. <button type="button" onClick={() => setRevision(value => value + 1)} className="font-semibold underline">Thử lại</button></div>}
    {!loading && !error && result?.items.length === 0 && <p className="mt-4 rounded-xl border border-hairline bg-card p-6 text-ink-muted">Chưa có kỳ đăng ký đang hoạt động phù hợp bộ lọc. Hãy thử từ khóa hoặc học kỳ khác.</p>}
    {!loading && !error && result && result.items.length > 0 && <>
      <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{result.items.map(period => {
        const isCurrentSemester = period.academicSemesterId === semester?.id
        const windowStatus = getPeriodWindowStatus(period.startAt, period.endAt)
        return <li key={period.id} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-hairline bg-card">
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
        <button type="button" disabled={urlPage <= 1} onClick={() => handlePageChange(urlPage - 1)} className="min-h-11 rounded-lg border border-hairline bg-card px-4 text-primary disabled:opacity-40">Trang trước</button>
        <span className="text-sm font-semibold text-ink-soft">{urlPage} / {totalPages}</span>
        <button type="button" disabled={urlPage >= totalPages} onClick={() => handlePageChange(urlPage + 1)} className="min-h-11 rounded-lg border border-hairline bg-card px-4 text-primary disabled:opacity-40">Trang sau</button>
      </nav>
    </>}
  </WorkspacePage>
}
