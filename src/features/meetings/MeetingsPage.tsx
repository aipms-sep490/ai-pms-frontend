import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import { getMeetings } from '../../services/api/meetings.api'
import type { PagedResult } from '../../types/backend'
import { meetingStatuses, type Meeting, type MeetingStatus } from './meeting-types'
import { formatMeetingTime, meetingVenue, meetingError, validCalendarDate } from './meeting-utils'
import { MeetingError, MeetingLoading, MeetingShell, MeetingStatusBadge } from './meeting-ui'
import { useAssistantActionDraft } from '../ai/useAssistantActionDraft'
import { canUseProjectExecutionAction } from '../execution/execution-authority'
import { Pagination, StatTileRow } from '../../components/ui'

export function MeetingsPage() {
  const access = useExecutionAccess()
  return <MeetingList key={`${access.project.id}:${access.currentUserId}`} />
}
function MeetingList() {
  const access = useExecutionAccess()
  const { project, routeBase } = access
  const assistant = useAssistantActionDraft(project.id, 'MEETING_MINUTES')
  const canSchedule = canUseProjectExecutionAction(access, 'schedule_meeting')
  const [params, setParams] = useSearchParams()
  const status = Object.hasOwn(meetingStatuses, params.get('status') ?? '') ? params.get('status') as MeetingStatus : ''
  const calendarDate = (value: string | null) => validCalendarDate(value) ? value : ''
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
  const items = data?.items ?? []
  const scheduledCount = data ? items.filter((item) => item.status === 'SCHEDULED').length : null
  const completedCount = data ? items.filter((item) => item.status === 'COMPLETED').length : null
  const cancelledCount = data ? items.filter((item) => item.status === 'CANCELLED').length : null

  return <MeetingShell title="Lịch họp và biên bản" projectTitle={project.title} backTo={`${routeBase}/workspace`}
    action={canSchedule && <Link className="mtg-button" to={`${routeBase}/meetings/new`}>+ Lên lịch họp</Link>}>
    <div className="mb-5">
      <StatTileRow
        tiles={[
          { icon: 'calendar_month', label: 'Tổng cuộc họp', value: data ? data.totalCount : null, caption: 'Toàn bộ lịch họp theo bộ lọc', hero: true },
          { icon: 'upcoming', label: 'Sắp diễn ra', value: scheduledCount, caption: 'Cuộc họp đang lên lịch trên trang này', tone: 'warning' },
          { icon: 'event_available', label: 'Cuộc họp hoàn tất', value: completedCount, caption: 'Đã kết thúc & lưu biên bản trang này', tone: 'success' },
          { icon: 'event_busy', label: 'Cuộc họp đã hủy', value: cancelledCount, caption: 'Lịch đã hủy trên trang này', tone: 'neutral' },
        ]}
      />
    </div>
    {assistant.draft && <p role="status" className="mtg-notice">Bản nháp biên bản đã sẵn sàng. Chọn cuộc họp để kiểm tra và đưa nội dung vào biểu mẫu; chưa lưu biên bản hoặc điểm danh.</p>}
    <div className="mtg-process mb-5"><span><b>01</b>Thống nhất lịch</span><span><b>02</b>Ghi nhận cuộc họp</span><span><b>03</b>Theo dõi phản hồi</span><small>Giờ Việt Nam · UTC+7</small></div>
    <section className="mtg-panel" aria-label="Danh sách cuộc họp">
      <form className="mtg-filters bg-canvas/70 border-b border-hairline px-5 py-3.5" onSubmit={applyFilters}>
        <label>Trạng thái<select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value as MeetingStatus | '' })}><option value="">Tất cả trạng thái</option>{Object.entries(meetingStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Từ ngày<input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
        <label>Đến ngày<input type="date" min={filters.from || undefined} value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
        <button className="mtg-button mtg-button--secondary" type="submit">Áp dụng</button>
        <button className="mtg-text-button" type="button" onClick={() => { setFilters({ status: '', from: '', to: '' }); setParams({}); setValidation('') }}>Xóa bộ lọc</button>
        <button className="mtg-text-button" type="button" disabled={loading} onClick={() => setRevision((value) => value + 1)}>Làm mới</button>
      </form>
      {validation && <p role="alert" className="mtg-notice mtg-notice--error mx-5 mt-4">{validation}</p>}
      <div className="mtg-list-heading bg-canvas/50 border-b border-hairline px-5 py-3">
        <div className="flex items-center gap-2">
          <h2>Các cuộc họp</h2>
          {data && <span className="rounded-full border border-hairline bg-card px-2 py-0.5 text-xs font-semibold text-ink-soft tabular-nums">{data.totalCount}</span>}
        </div>
        <span className="text-xs text-ink-muted">Múi giờ Việt Nam (UTC+7)</span>
      </div>
      {loading ? <MeetingLoading /> : error ? <MeetingError message={error} retry={() => setRevision((value) => value + 1)} /> : data && <>
        {data.items.length === 0 ? <div className="mtg-empty"><span className="material-symbols-outlined" aria-hidden="true">event_note</span><h3>{status || from || to || page > 1 ? 'Không có cuộc họp phù hợp' : 'Chưa có lịch họp'}</h3><p>{canSchedule ? 'Lên lịch để cả nhóm thống nhất thời gian và nội dung trao đổi.' : 'Cuộc họp do người được hệ thống cho phép lên lịch sẽ xuất hiện tại đây.'}</p>{page > 1 && <button className="mtg-button mtg-button--secondary" onClick={() => goToPage(1)}>Về trang đầu</button>}</div> : <ul className="mtg-list">{data.items.map((meeting) => <li key={meeting.id}><Link className="mtg-row" to={`${routeBase}/meetings/${meeting.id}`} state={assistant.draft ? { assistantDraft: { ...assistant.draft, projectId: project.id } } : undefined}>
          <span className="mtg-row-icon material-symbols-outlined" aria-hidden="true">calendar_month</span>
          <div className="mtg-row-main">
            <p className="mtg-eyebrow">{formatMeetingTime(meeting.startAt)} · UTC+7</p>
            <h3>{meeting.title}</h3>
            <p className="truncate">{meetingVenue(meeting)} · {meeting.participantCount} người tham gia · Tổ chức bởi {meeting.createdByName}</p>
          </div>
          <div className="mtg-row-state"><MeetingStatusBadge status={meeting.status} /><span className="mtg-row-open workspace-action-link">Xem chi tiết<span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></span></div>
        </Link></li>)}</ul>}
        {data.totalPages > 1 && (
          <div className="border-t border-hairline bg-canvas/50 px-5 py-3.5">
            <Pagination
              page={page}
              pages={data.totalPages}
              total={data.totalCount}
              pageSize={10}
              onPage={goToPage}
            />
          </div>
        )}
      </>}
    </section>
  </MeetingShell>
}
