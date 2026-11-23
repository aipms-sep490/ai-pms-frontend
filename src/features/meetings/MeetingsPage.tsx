import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FilterToolbar } from '../../components/ui/FilterToolbar'
import type { FilterChipItem } from '../../components/ui/FilterChips'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import { getMeetings } from '../../services/api/meetings.api'
import type { PagedResult } from '../../types/backend'
import { meetingStatuses, type Meeting, type MeetingStatus } from './meeting-types'
import { formatMeetingTime, meetingVenue, meetingError, validCalendarDate } from './meeting-utils'
import { MeetingError, MeetingLoading, MeetingShell, MeetingStatusBadge } from './meeting-ui'
import { useAssistantActionDraft } from '../ai/useAssistantActionDraft'
import { canUseProjectExecutionAction } from '../execution/execution-authority'
import { utcTimestamp } from '../projects/utils/collaboration-workspace'

type MeetingChannel = 'ALL' | 'ONLINE' | 'ONSITE'
type MeetingSort = 'nearest' | 'newest'

export function MeetingsPage() {
  const access = useExecutionAccess()
  return <MeetingList key={`${access.project.id}:${access.currentUserId}`} />
}

function MeetingList() {
  const access = useExecutionAccess()
  const { project, routeBase, actor } = access
  const assistant = useAssistantActionDraft(project.id, 'MEETING_MINUTES')
  const canSchedule = canUseProjectExecutionAction(access, 'schedule_meeting')
  const [params, setParams] = useSearchParams()
  const status = Object.hasOwn(meetingStatuses, params.get('status') ?? '') ? params.get('status') as MeetingStatus : ''
  const calendarDate = (value: string | null) => validCalendarDate(value) ? value : ''
  const from = calendarDate(params.get('from'))
  const to = calendarDate(params.get('to'))
  const parsedPage = Number(params.get('page') ?? 1)
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1

  const [search, setSearch] = useState('')
  const [channel, setChannel] = useState<MeetingChannel>('ALL')
  const [sortBy, setSortBy] = useState<MeetingSort>('nearest')
  const [validation, setValidation] = useState('')
  const [data, setData] = useState<PagedResult<Meeting> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    if (from && to && to < from) {
      setLoading(false)
      setError('Khoảng ngày trong đường dẫn không hợp lệ. Chọn lại bộ lọc.')
      return
    }
    getMeetings(project.id, {
      status: status || undefined,
      page,
      pageSize: 10,
      from: from ? new Date(`${from}T00:00:00+07:00`).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59.999+07:00`).toISOString() : undefined,
    }, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setData(result) })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(meetingError(reason)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [project.id, status, from, to, page, revision])

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    next.delete('page')
    if (value) next.set(key, value)
    else next.delete(key)
    const nextFrom = next.get('from') ?? ''
    const nextTo = next.get('to') ?? ''
    if (nextFrom && nextTo && nextTo < nextFrom) {
      setValidation('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.')
      return
    }
    setValidation('')
    setParams(next)
  }

  function clearAll() {
    setSearch('')
    setChannel('ALL')
    setSortBy('nearest')
    setValidation('')
    setParams({})
  }

  function goToPage(nextPage: number) {
    const next = new URLSearchParams(params)
    next.set('page', String(nextPage))
    setParams(next)
  }

  const visibleItems = useMemo(() => {
    const list = data?.items ?? []
    const needle = search.trim().toLowerCase()
    const filtered = list.filter((m) => {
      const isOnline = Boolean(m.onlineUrl || m.meetingDeliveryMode === 'REMOTE' || m.meetingDeliveryMode === 'HYBRID' || m.videoChannel === 'IN_APP_VIDEO' || m.videoChannel === 'EXTERNAL_LINK')
      if (channel === 'ONLINE' && !isOnline) return false
      if (channel === 'ONSITE' && isOnline) return false
      if (!needle) return true
      return (
        m.title.toLowerCase().includes(needle) ||
        (m.location ?? '').toLowerCase().includes(needle) ||
        m.createdByName.toLowerCase().includes(needle)
      )
    })
    return [...filtered].sort((a, b) =>
      sortBy === 'newest'
        ? utcTimestamp(b.startAt) - utcTimestamp(a.startAt)
        : utcTimestamp(a.startAt) - utcTimestamp(b.startAt),
    )
  }, [data, search, channel, sortBy])

  const activeChips = useMemo<FilterChipItem[]>(() => {
    const chips: FilterChipItem[] = []
    if (status) chips.push({ id: 'status', label: 'Trạng thái', value: meetingStatuses[status] })
    if (search.trim()) chips.push({ id: 'search', label: 'Từ khóa', value: search.trim() })
    if (channel !== 'ALL') chips.push({ id: 'channel', label: 'Hình thức', value: channel === 'ONLINE' ? 'Trực tuyến' : 'Trực tiếp' })
    if (from) chips.push({ id: 'from', label: 'Từ ngày', value: from })
    if (to) chips.push({ id: 'to', label: 'Đến ngày', value: to })
    return chips
  }, [status, search, channel, from, to])

  const hasActiveFilters = activeChips.length > 0 || sortBy !== 'nearest'

  return (
    <MeetingShell
      title="Lịch họp và biên bản"
      projectTitle={project.title}
      backTo={actor === 'student' ? undefined : `${routeBase}/workspace`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="mtg-button mtg-button--secondary" disabled={loading} onClick={() => setRevision(v => v + 1)}>
            Làm mới
          </button>
          {canSchedule && <Link className="mtg-button" to={`${routeBase}/meetings/new`}>+ Lên lịch họp</Link>}
        </div>
      }
    >
      {assistant.draft && (
        <p role="status" className="mtg-notice">
          Bản nháp biên bản đã sẵn sàng. Chọn cuộc họp để kiểm tra và đưa nội dung vào biểu mẫu; chưa lưu biên bản hoặc điểm danh.
        </p>
      )}
      <section className="mtg-panel" aria-label="Danh sách cuộc họp">
        <FilterToolbar
          embedded
          tabs={[
            { value: '', label: 'Tất cả' },
            { value: 'SCHEDULED', label: meetingStatuses.SCHEDULED },
            { value: 'COMPLETED', label: meetingStatuses.COMPLETED },
            { value: 'CANCELLED', label: meetingStatuses.CANCELLED },
          ]}
          activeTab={status}
          onTabChange={(val) => updateParam('status', val)}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm theo tiêu đề, địa điểm hoặc người tổ chức…"
          controls={
            <select aria-label="Hình thức họp" value={channel} onChange={(e) => setChannel(e.target.value as MeetingChannel)}>
              <option value="ALL">Mọi hình thức</option>
              <option value="ONLINE">Trực tuyến</option>
              <option value="ONSITE">Trực tiếp</option>
            </select>
          }
          sort={{
            value: sortBy,
            onChange: (val) => setSortBy(val as MeetingSort),
            options: [
              { value: 'nearest', label: 'Thời gian tăng dần' },
              { value: 'newest', label: 'Mới nhất trước' },
            ],
          }}
          advancedControls={
            <>
              <label>Từ ngày
                <input type="date" aria-label="Từ ngày" value={from} onChange={(e) => updateParam('from', e.target.value)} />
              </label>
              <label>Đến ngày
                <input type="date" aria-label="Đến ngày" min={from || undefined} value={to} onChange={(e) => updateParam('to', e.target.value)} />
              </label>
            </>
          }
          advancedActiveCount={Number(Boolean(from)) + Number(Boolean(to))}
          advancedLabel="Khoảng ngày"
          activeChips={activeChips}
          onRemoveChip={(id) => {
            if (id === 'search') setSearch('')
            else if (id === 'channel') setChannel('ALL')
            else updateParam(id, '')
          }}
          hasActiveFilters={hasActiveFilters}
          onClearAll={clearAll}
          resultSummary={data ? `${visibleItems.length} / ${data.totalCount} cuộc họp · Giờ Việt Nam (UTC+7)` : undefined}
        />

        {validation && <p role="alert" className="mtg-notice mtg-notice--error">{validation}</p>}
        <div className="mtg-list-heading"><h2>Các cuộc họp</h2>{data && <span className="text-xs text-ink-muted">{data.totalCount} cuộc họp</span>}</div>

        {loading ? (
          <MeetingLoading />
        ) : error ? (
          <MeetingError message={error} retry={() => setRevision((value) => value + 1)} />
        ) : data && (
          <>
            {visibleItems.length === 0 ? (
              <div className="mtg-empty">
                <span className="material-symbols-outlined" aria-hidden="true">event_note</span>
                <h3>{hasActiveFilters || page > 1 ? 'Không có cuộc họp phù hợp' : 'Chưa có lịch họp'}</h3>
                <p>
                  {hasActiveFilters
                    ? 'Thử xóa bộ lọc để xem toàn bộ lịch họp của nhóm.'
                    : canSchedule
                      ? 'Lên lịch để cả nhóm thống nhất thời gian và nội dung trao đổi.'
                      : 'Cuộc họp do người được hệ thống cho phép lên lịch sẽ xuất hiện tại đây.'}
                </p>
                {hasActiveFilters && <button type="button" className="mtg-button mtg-button--secondary mt-3" onClick={clearAll}>Xóa bộ lọc</button>}
                {page > 1 && <button className="mtg-button mtg-button--secondary mt-3" onClick={() => goToPage(1)}>Về trang đầu</button>}
              </div>
            ) : (
              <ul className="mtg-list">
                {visibleItems.map((meeting) => (
                  <li key={meeting.id}>
                    <Link
                      className="mtg-row"
                      to={`${routeBase}/meetings/${meeting.id}`}
                      state={assistant.draft ? { assistantDraft: { ...assistant.draft, projectId: project.id } } : undefined}
                    >
                      <span className="mtg-row-icon material-symbols-outlined" aria-hidden="true">
                        {meeting.onlineUrl || meeting.meetingDeliveryMode === 'REMOTE' || meeting.meetingDeliveryMode === 'HYBRID' || meeting.videoChannel === 'IN_APP_VIDEO' || meeting.videoChannel === 'EXTERNAL_LINK' ? 'videocam' : 'calendar_month'}
                      </span>
                      <div className="mtg-row-main">
                        <p className="mtg-eyebrow">{formatMeetingTime(meeting.startAt)}</p>
                        <h3>{meeting.title}</h3>
                        <p>{meetingVenue(meeting)}</p>
                        <small>{meeting.participantCount} người tham gia · Tổ chức bởi {meeting.createdByName}</small>
                      </div>
                      <div className="mtg-row-state">
                        <MeetingStatusBadge status={meeting.status} />
                        <span className="mtg-row-open workspace-action-link">
                          Xem chi tiết
                          <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <nav className="mtg-pagination" aria-label="Phân trang cuộc họp">
              <span>{data.totalCount} cuộc họp · Trang {page} / {Math.max(1, data.totalPages)}</span>
              <div>
                <button className="mtg-button mtg-button--secondary" disabled={page <= 1} onClick={() => goToPage(page - 1)}>Trang trước</button>
                <button className="mtg-button mtg-button--secondary" disabled={page >= data.totalPages} onClick={() => goToPage(page + 1)}>Trang sau</button>
              </div>
            </nav>
          </>
        )}
      </section>
    </MeetingShell>
  )
}
