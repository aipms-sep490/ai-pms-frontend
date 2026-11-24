import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { Pagination } from '../../../components/ui/Pagination'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { HttpError } from '../../../services/http/http-client'
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
    return { label: 'Chưa mở nhận hồ sơ', tone: 'info' as const, isWithinWindow: false }
  }
  if (now > end) {
    return { label: 'Đã hết hạn nhận hồ sơ', tone: 'neutral' as const, isWithinWindow: false }
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
  const openWindowCount = result ? result.items.filter(item => getPeriodWindowStatus(item.startAt, item.endAt).isWithinWindow).length : null
  const upcomingWindowCount = result ? result.items.filter(item => getPeriodWindowStatus(item.startAt, item.endAt).tone === 'info').length : null

  return <WorkspacePage
    className="space-y-5"
    title="Kỳ đăng ký đồ án"
    eyebrow="Khám phá học kỳ"
    description="Tìm kỳ đăng ký đang hoạt động và xem bước tiếp theo trong lộ trình đồ án."
    action={
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/team" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-hairline bg-card px-3 text-xs font-semibold text-ink-soft transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <span className="material-symbols-outlined text-sm text-primary" aria-hidden="true">groups</span>
          Quản lý nhóm
        </Link>
        <Link to="/projects/lifecycle" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-hairline bg-card px-3 text-xs font-semibold text-ink-soft transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <span className="material-symbols-outlined text-sm text-primary" aria-hidden="true">timeline</span>
          Lộ trình đồ án
        </Link>
        <Link to="/topics" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-primary/20 bg-primary-subtle px-3 text-xs font-semibold text-primary transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <span className="material-symbols-outlined text-sm" aria-hidden="true">explore</span>
          Khám phá đề tài
        </Link>
      </div>
    }
  >
    <StatTileRow tiles={[
      { icon: 'event_note', label: 'Kỳ đăng ký phù hợp', value: result ? result.totalCount : null, caption: 'Phạm vi cơ sở đào tạo của tài khoản.', hero: true },
      { icon: 'lock_open', label: 'Kỳ đang mở', value: openWindowCount, tone: 'success', caption: 'Đang trong hạn nhận hồ sơ.' },
      { icon: 'schedule', label: 'Kỳ sắp mở', value: upcomingWindowCount, tone: 'info', caption: 'Sắp tới thời gian đăng ký.' },
      { icon: 'calendar_month', label: 'Học kỳ hoạt động', value: semesters.length, tone: 'neutral', caption: semester ? `Đang chọn: ${semester.name}` : 'Chưa chọn học kỳ.' },
    ]} />

    {/* Thanh tìm kiếm & lọc 1 hàng ngang gọn ngay trên đầu */}
    <section className="workspace-surface p-4 sm:p-5 space-y-3" aria-label="Tìm kỳ đăng ký">
      <form onSubmit={submitSearch} className="flex flex-wrap items-end gap-3">
        <label className="min-w-56 flex-1 text-xs font-semibold text-ink-soft">Tìm theo mã hoặc tên kỳ
          <input value={searchText} onChange={event => setSearchText(event.target.value)} placeholder="Ví dụ: Fall 2026" className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" />
        </label>
        <label className="min-w-48 text-xs font-semibold text-ink-soft lg:w-64">Học kỳ
          <select value={urlSemesterId ?? ''} onChange={event => handleSemesterChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <option value="">Tất cả học kỳ</option>
            {semesters.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <button type="submit" className="min-h-11 shrink-0 whitespace-nowrap rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Tìm kiếm</button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-2.5 text-xs text-ink-muted">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm text-primary" aria-hidden="true">policy</span>
          <span>Danh sách được giới hạn theo <strong>cơ sở đào tạo của tài khoản</strong>; quản trị viên có thể xem toàn hệ thống.</span>
        </div>
        <StatusBadge tone="neutral" label="Phạm vi tài khoản" />
      </div>
    </section>

    {/* Danh sách kỳ đang mở nổi bật ngay trên màn hình chính */}
    <section className="workspace-surface" aria-label="Danh sách kỳ đăng ký">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
        <div>
          <h2 className="font-heading text-base font-bold text-ink">Kỳ đang mở đăng ký</h2>
          <p className="text-xs text-ink-muted">Kiểm tra khung thời gian mở nhận hồ sơ và đi tới màn hình nhóm của học kỳ đang chọn.</p>
        </div>
        {result && <StatusBadge tone="info" label={`${result.totalCount} kỳ phù hợp`} />}
      </header>

      <div className="space-y-4 p-5">
        {loading && <p role="status" className="rounded-xl border border-hairline bg-canvas p-5 text-sm text-ink-muted">Đang tải các kỳ đăng ký…</p>}
        {isForbidden && (
          <div role="alert" className="rounded-xl border border-status-warning-border bg-status-warning-bg p-5 text-sm text-status-warning-text">
            <strong>Không thể xem danh sách kỳ đăng ký:</strong> Tài khoản chưa được gán cơ sở đào tạo đang hoạt động hoặc không có quyền xem dữ liệu này. Liên hệ quản trị viên nếu bạn cần hỗ trợ.
          </div>
        )}
        {!isForbidden && error && (
          <div role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-5 text-sm text-status-error-text">
            Không tải được danh sách kỳ đăng ký. <button type="button" onClick={() => setRevision(value => value + 1)} className="font-semibold underline">Thử lại</button>
          </div>
        )}
        {!loading && !error && !isForbidden && result?.items.length === 0 && (
          <p className="rounded-xl border border-hairline bg-canvas p-5 text-sm text-ink-muted">
            Chưa có kỳ đăng ký đang hoạt động phù hợp bộ lọc. Hãy thử từ khóa hoặc học kỳ khác.
          </p>
        )}
        {!loading && !error && !isForbidden && result && result.items.length > 0 && (
          <>
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{result.items.map(period => {
              const isCurrentSemester = period.academicSemesterId === semester?.id
              const windowStatus = getPeriodWindowStatus(period.startAt, period.endAt)
              return (
                <li key={period.id} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-hairline bg-card shadow-2xs transition-shadow hover:border-primary/40 hover:shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-4 py-3">
                    <span className="rounded-full bg-primary-subtle px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-primary">{period.semesterName}</span>
                    <StatusBadge tone={windowStatus.tone} label={windowStatus.label} />
                  </div>
                  <div className="flex-1 p-4">
                    <h3 className="break-words font-heading text-base font-bold text-ink">{period.name}</h3>
                    <p className="mt-1 font-mono text-xs text-ink-muted">{period.code}</p>
                    <dl className="mt-3.5 grid grid-cols-2 gap-2.5 border-t border-hairline pt-3.5 text-xs">
                      <div className="rounded-lg border border-hairline bg-canvas p-2.5">
                        <dt className="text-ink-muted">Bắt đầu</dt>
                        <dd className="mt-1 font-semibold tabular-nums text-ink">{dateLabel(period.startAt)}</dd>
                      </div>
                      <div className="rounded-lg border border-hairline bg-canvas p-2.5">
                        <dt className="text-ink-muted">Kết thúc</dt>
                        <dd className="mt-1 font-semibold tabular-nums text-ink">{dateLabel(period.endAt)}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="border-t border-hairline bg-canvas/40 p-3.5">
                    {isCurrentSemester ? (
                      <Link to="/team" className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                        Xem nhóm và điều kiện <span aria-hidden="true">→</span>
                      </Link>
                    ) : (
                      <p className="text-xs leading-5 text-ink-muted">Học kỳ này chưa được chọn trong hồ sơ hiện tại. Kiểm tra ngữ cảnh học kỳ trước khi tiếp tục.</p>
                    )}
                  </div>
                </li>
              )
            })}</ul>
            {totalPages > 1 && (
              <Pagination
                page={urlPage}
                pages={totalPages}
                total={result.totalCount}
                pageSize={pageSize}
                busy={loading}
                onPage={handlePageChange}
              />
            )}
          </>
        )}
      </div>
    </section>

    {/* Thu gọn khối hướng dẫn 3 bước thành dải ngang gọn gàng có thể đóng/mở */}
    <details className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs" aria-label="Hướng dẫn tham gia kỳ đồ án">
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-3 bg-canvas/70 px-5 py-3 text-sm font-bold text-ink hover:bg-primary-subtle/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <span className="inline-flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">info</span>
          3 bước chuẩn bị trước khi nộp hồ sơ
        </span>
        <span className="inline-flex items-center gap-2 text-xs font-medium text-ink-muted">
          Quy trình tham gia đợt đồ án
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">expand_more</span>
        </span>
      </summary>
      <div className="space-y-3 border-t border-hairline p-4 sm:p-5">
        <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
          Sinh viên cần bảo đảm điều kiện học vụ, thành lập nhóm hợp lệ và chọn đề tài phù hợp trước khi thời hạn đăng ký của đợt kết thúc.
        </p>
        <div className="grid gap-3 text-xs sm:grid-cols-3">
          <div className="flex items-start gap-2.5 rounded-xl border border-hairline bg-canvas p-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">1</span>
            <div>
              <strong className="block font-semibold text-ink">Kiểm tra điều kiện</strong>
              <span className="text-ink-muted">Xem điều kiện học vụ của đợt đăng ký trong hồ sơ</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-xl border border-hairline bg-canvas p-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">2</span>
            <div>
              <strong className="block font-semibold text-ink">Lập nhóm đồ án</strong>
              <span className="text-ink-muted">Số thành viên theo quy định của đợt đăng ký</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-xl border border-hairline bg-canvas p-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">3</span>
            <div>
              <strong className="block font-semibold text-ink">Đăng ký đề tài</strong>
              <span className="text-ink-muted">Chọn đề tài từ giảng viên hoặc tự đề xuất</span>
            </div>
          </div>
        </div>
      </div>
    </details>
  </WorkspacePage>
}
