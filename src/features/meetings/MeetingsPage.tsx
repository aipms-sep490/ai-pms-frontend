import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import { getMeetings } from '../../services/api/meetings.api'
import type { PagedResult } from '../../types/backend'
import { meetingStatuses, type Meeting, type MeetingStatus } from './meeting-types'
import { formatMeetingTime, meetingError } from './meeting-utils'
import { MeetingError, MeetingLoading, MeetingShell, MeetingStatusBadge } from './meeting-ui'

export function MeetingsPage() {
  const access = useExecutionAccess()
  return <MeetingList key={`${access.project.id}:${access.currentUserId}`} />
}
function MeetingList() {
  const { project, routeBase, canManageStructure } = useExecutionAccess()
  const [params, setParams] = useSearchParams()
  const status = Object.hasOwn(meetingStatuses, params.get('status') ?? '') ? params.get('status') as MeetingStatus : ''
  const calendarDate = (value: string | null) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) ? value : ''
  const from = calendarDate(params.get('from'))
  const to = calendarDate(params.get('to'))
  const parsedPage = Number(params.get('page') ?? 1)
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1
  const [filters, setFilters] = useState({ status, from, to })
  const [validation, setValidation] = useState('')
  const [data, setData] = useState<PagedResult<Meeting> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => { setFilters({ status, from, to }); setValidation('') }, [status, from, to])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    if (from && to && to < from) { setLoading(false); setError('Khoảng ngày trong đường dẫn không hợp lệ. Chọn lại bộ lọc.'); return }
    getMeetings(project.id, {
      status: status || undefined, page, pageSize: 10,
      from: from ? new Date(`${from}T00:00:00+07:00`).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59.999+07:00`).toISOString() : undefined,
    }, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setData(result) })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(meetingError(reason)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [project.id, status, from, to, page, revision])
  function applyFilters(event: FormEvent) {
    event.preventDefault()
    if (filters.from && filters.to && filters.to < filters.from) { setValidation('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.'); return }
    const next = new URLSearchParams()
    for (const [key, value] of Object.entries(filters)) if (value) next.set(key, value)
    setValidation(''); setParams(next)
  }
  function goToPage(nextPage: number) {
    const next = new URLSearchParams(params); next.set('page', String(nextPage)); setParams(next)
  }
  return <MeetingShell title="Lịch họp & biên bản" projectTitle={project.title} backTo={`${routeBase}/workspace`}
    action={canManageStructure && <Link className="mtg-button" to={`${routeBase}/meetings/new`}>+ Lên lịch họp</Link>}>
    <div className="mtg-process"><span><b>01</b>Thống nhất lịch</span><span><b>02</b>Ghi nhận cuộc họp</span><span><b>03</b>Theo dõi phản hồi</span><small>Giờ Việt Nam · UTC+7</small></div>
    <section className="mtg-panel" aria-label="Danh sách cuộc họp">
      <form className="mtg-filters" onSubmit={applyFilters}>
        <label>Trạng thái<select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value as MeetingStatus | '' })}><option value="">Tất cả trạng thái</option>{Object.entries(meetingStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Từ ngày<input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
        <label>Đến ngày<input type="date" min={filters.from || undefined} value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
        <button className="mtg-button mtg-button--secondary" type="submit">Áp dụng</button>
        <button className="mtg-text-button" type="button" onClick={() => { setFilters({ status: '', from: '', to: '' }); setParams({}); setValidation('') }}>Xóa bộ lọc</button>
      </form>
      {validation && <p role="alert" className="mtg-notice mtg-notice--error">{validation}</p>}
      <div className="mtg-list-heading"><h2>Các cuộc họp</h2><button className="mtg-text-button" disabled={loading} onClick={() => setRevision((value) => value + 1)}>Làm mới</button></div>
      {loading ? <MeetingLoading /> : error ? <MeetingError message={error} retry={() => setRevision((value) => value + 1)} /> : data && <>
        {data.items.length === 0 ? <div className="mtg-empty"><span className="material-symbols-outlined" aria-hidden="true">event_note</span><h3>{status || from || to || page > 1 ? 'Không có cuộc họp phù hợp' : 'Chưa có lịch họp'}</h3><p>{canManageStructure ? 'Lên lịch để cả nhóm thống nhất thời gian và nội dung trao đổi.' : 'Cuộc họp do trưởng nhóm hoặc GVHD lên lịch sẽ xuất hiện tại đây.'}</p>{page > 1 && <button className="mtg-button mtg-button--secondary" onClick={() => goToPage(1)}>Về trang đầu</button>}</div> : <ul className="mtg-list">{data.items.map((meeting) => <li key={meeting.id}><Link className="mtg-row" to={`${routeBase}/meetings/${meeting.id}`}>
          <span className="mtg-row-icon material-symbols-outlined" aria-hidden="true">calendar_month</span>
          <div className="mtg-row-main"><p className="mtg-eyebrow">{formatMeetingTime(meeting.startAt)} · UTC+7</p><h3>{meeting.title}</h3><p>{meeting.location || (meeting.onlineUrl ? 'Họp trực tuyến' : 'Chưa xác định địa điểm')}</p><small>{meeting.participantCount} người tham gia · Tổ chức bởi {meeting.createdByName}</small></div>
          <div className="mtg-row-state"><MeetingStatusBadge status={meeting.status} /><span>Xem chi tiết →</span></div>
        </Link></li>)}</ul>}
        <nav className="mtg-pagination" aria-label="Phân trang cuộc họp"><span>{data.totalCount} cuộc họp · Trang {page} / {Math.max(1, data.totalPages)}</span><div><button className="mtg-button mtg-button--secondary" disabled={page <= 1} onClick={() => goToPage(page - 1)}>Trang trước</button><button className="mtg-button mtg-button--secondary" disabled={page >= data.totalPages} onClick={() => goToPage(page + 1)}>Trang sau</button></div></nav>
      </>}
    </section>
  </MeetingShell>
}
