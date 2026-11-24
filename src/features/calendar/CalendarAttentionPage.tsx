import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWorkspaceAccess } from '../../app/context/workspace-access'
import { Button } from '../../components/ui/Button'
import { DataSourceStatus } from '../../components/ui/DataSourceStatus'
import { displayLabel } from '../../components/ui/display-label'
import { FilterToolbar, type ActiveFilterChip } from '../../components/ui/FilterToolbar'
import { PageLoading } from '../../components/ui/PageLoading'
import { Pagination } from '../../components/ui/Pagination'
import { StatTileRow } from '../../components/ui/StatTileRow'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type { BadgeTone } from '../../components/ui/status-badge-tone'
import { useClientPagination } from '../../components/ui/useClientPagination'
import { useAuthSession } from '../auth/context/useAuthSession'
import './calendar-attention.css'
import { loadCalendarAttention } from './calendar-data'
import { formatCalendarDate, isHistoricalStatus } from './calendar-projections'
import type { AttentionItem, CalendarAttentionData, CalendarProjectionItem } from './calendar-types'

type ViewMode = 'agenda' | 'month'
type CalendarSort = 'soonest' | 'latest' | 'title'

const sourceLabels: Record<CalendarProjectionItem['sourceType'], string> = {
  TASK: 'Công việc',
  MILESTONE: 'Mốc đồ án',
  MEETING: 'Cuộc họp',
  DELIVERABLE: 'Hạng mục',
  FINAL_SUBMISSION: 'Bàn giao cuối kỳ',
  EVALUATION_ASSIGNMENT: 'Phân công đánh giá',
  PROGRESS_REPORT: 'Báo cáo tiến độ',
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Cần làm',
  OPEN: 'Đang mở',
  ACTIVE: 'Đang thực hiện',
  IN_PROGRESS: 'Đang thực hiện',
  IN_REVIEW: 'Đang xem xét',
  PENDING: 'Chờ xử lý',
  DRAFT: 'Bản nháp',
  BLOCKED: 'Bị chặn',
  OVERDUE: 'Quá hạn',
  SCHEDULED: 'Đã lên lịch',
  SUBMITTED: 'Đã nộp',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị từ chối',
  REVISION_REQUIRED: 'Cần chỉnh sửa',
  PASSED: 'Đạt',
  FAILED: 'Chưa đạt',
  DONE: 'Hoàn tất',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
}

export function calendarStatusLabel(status: string): string {
  const key = status.trim().toUpperCase()
  return STATUS_LABELS[key] ?? displayLabel(status)
}

function calendarStatusTone(status: string): BadgeTone {
  const key = status.trim().toUpperCase()
  if (['DONE', 'COMPLETED', 'APPROVED', 'PASSED'].includes(key)) return 'success'
  if (['OVERDUE', 'BLOCKED', 'REJECTED', 'FAILED', 'CANCELLED'].includes(key)) return 'danger'
  if (['IN_REVIEW', 'PENDING', 'REVISION_REQUIRED', 'IN_PROGRESS', 'ACTIVE', 'SUBMITTED'].includes(key)) return 'warning'
  return 'neutral'
}

function datedAt(item: CalendarProjectionItem): string | undefined {
  return item.dueAt ?? item.startAt ?? item.endAt
}

function vnDateKey(iso: string | undefined): string {
  if (!iso) return ''
  const parsed = new Date(iso)
  if (!Number.isFinite(parsed.getTime())) return iso.slice(0, 10)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(parsed)
  const year = parts.find(p => p.type === 'year')?.value
  const month = parts.find(p => p.type === 'month')?.value
  const day = parts.find(p => p.type === 'day')?.value
  return year && month && day ? `${year}-${month}-${day}` : iso.slice(0, 10)
}

function dateKey(item: CalendarProjectionItem): string {
  return vnDateKey(datedAt(item))
}

function todayVnKey(): string {
  return vnDateKey(new Date().toISOString())
}

function parseMonthAnchor(key: string): { year: number; month: number } {
  const [y, m] = key.split('-').map(Number)
  if (Number.isInteger(y) && Number.isInteger(m) && m >= 1 && m <= 12) {
    return { year: y, month: m - 1 }
  }
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() }
}

function toIsoDate(year: number, month: number, day: number): string {
  const d = new Date(Date.UTC(year, month, day))
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

interface MonthGridCell {
  key: string
  dayNumber: number
  inCurrentMonth: boolean
  isToday: boolean
}

function buildMonthGrid(year: number, month: number, todayKey: string): MonthGridCell[] {
  const firstDay = new Date(Date.UTC(year, month, 1))
  // Convert Sunday=0..Saturday=6 into Monday=0..Sunday=6
  const startOffset = (firstDay.getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7
  const cells: MonthGridCell[] = []
  for (let idx = 0; idx < totalCells; idx++) {
    const dayOffset = idx - startOffset + 1
    const dateObj = new Date(Date.UTC(year, month, dayOffset))
    const key = toIsoDate(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate())
    cells.push({
      key,
      dayNumber: dateObj.getUTCDate(),
      inCurrentMonth: dateObj.getUTCMonth() === month && dateObj.getUTCFullYear() === year,
      isToday: key === todayKey,
    })
  }
  return cells
}

function isAttentionSource(id: string): boolean {
  return ['next-actions', 'triage-queue', 'accounts', 'urgent-actions'].includes(id) || id.startsWith('urgent-actions-')
}

function sourceStateText(data: CalendarAttentionData): string | null {
  const affected = data.sources.filter(
    (source) => !isAttentionSource(source.id) && (source.state === 'error' || source.state === 'partial'),
  )
  return affected.length ? `${affected.length} nguồn chưa đầy đủ. Những nguồn khác vẫn được hiển thị.` : null
}

export function CalendarAttentionPage() {
  const access = useWorkspaceAccess()
  const { session } = useAuthSession()
  const [data, setData] = useState<CalendarAttentionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('agenda')
  const [showHistorical, setShowHistorical] = useState(false)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<'ALL' | CalendarProjectionItem['sourceType']>('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState<CalendarSort>('soonest')
  const todayKey = useMemo(() => todayVnKey(), [])
  const [monthCursor, setMonthCursor] = useState<{ year: number; month: number }>(() => parseMonthAnchor(todayKey))
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null)
  const monthInitialized = useRef(false)
  const generation = useRef(0)

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const request = ++generation.current
    setLoading(true)
    const next = await loadCalendarAttention({
      role: access.identityRole,
      semesterId: access.selectedSemesterId,
      accessToken: session?.accessToken,
      departmentIds: access.departmentIds,
      departments: access.departments,
      signal,
    })
    if (!signal?.aborted && request === generation.current) {
      setData(next)
      setLoading(false)
      if (!monthInitialized.current) {
        monthInitialized.current = true
        const dated = next.calendar.map(dateKey).filter(Boolean).sort()
        const currentPrefix = todayKey.slice(0, 7)
        if (dated.length > 0 && !dated.some(k => k.startsWith(currentPrefix))) {
          setMonthCursor(parseMonthAnchor(dated[0]))
        }
      }
    }
  }, [access.identityRole, access.selectedSemesterId, session?.accessToken, access.departmentIds, access.departments, todayKey])

  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal)
    return () => controller.abort()
  }, [refresh])

  const baseItems = useMemo(
    () =>
      (data?.calendar ?? [])
        .filter((item) => showHistorical || !isHistoricalStatus(item.status))
        .sort((left, right) => (datedAt(left) ?? '').localeCompare(datedAt(right) ?? '')),
    [data, showHistorical],
  )

  const availableStatusLabels = useMemo(() => {
    const labels: string[] = []
    const seen = new Set<string>()
    for (const item of baseItems) {
      if (!item.status) continue
      const label = calendarStatusLabel(item.status)
      if (!seen.has(label)) {
        seen.add(label)
        labels.push(label)
      }
    }
    return labels
  }, [baseItems])

  const items = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = baseItems.filter((item) => {
      if (sourceFilter !== 'ALL' && item.sourceType !== sourceFilter) return false
      if (statusFilter !== 'ALL' && calendarStatusLabel(item.status) !== statusFilter) return false
      if (query && !`${item.title} ${item.projectName ?? ''}`.toLowerCase().includes(query)) return false
      return true
    })
    if (sortBy === 'latest') {
      return [...filtered].sort((left, right) => (datedAt(right) ?? '').localeCompare(datedAt(left) ?? ''))
    }
    if (sortBy === 'title') {
      return [...filtered].sort((left, right) => left.title.localeCompare(right.title, 'vi'))
    }
    return filtered
  }, [baseItems, search, sortBy, sourceFilter, statusFilter])

  const agendaPagination = useClientPagination(items, 10)
  const attentionItems = useMemo(() => data?.attention ?? [], [data?.attention])
  const attentionPagination = useClientPagination(attentionItems, 10)

  const grouped = useMemo(
    () =>
      items.reduce<Record<string, CalendarProjectionItem[]>>((groups, item) => {
        const key = dateKey(item) || 'undated'
        groups[key] = [...(groups[key] ?? []), item]
        return groups
      }, {}),
    [items],
  )

  const agendaGrouped = useMemo(
    () =>
      agendaPagination.paginatedItems.reduce<Record<string, CalendarProjectionItem[]>>((groups, item) => {
        const key = dateKey(item) || 'undated'
        groups[key] = [...(groups[key] ?? []), item]
        return groups
      }, {}),
    [agendaPagination.paginatedItems],
  )

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = []
    if (search.trim()) chips.push({ id: 'search', label: 'Từ khóa', value: search.trim() })
    if (sourceFilter !== 'ALL') chips.push({ id: 'source', label: 'Nguồn', value: sourceLabels[sourceFilter] })
    if (statusFilter !== 'ALL') chips.push({ id: 'status', label: 'Trạng thái', value: statusFilter })
    return chips
  }, [search, sourceFilter, statusFilter])

  const monthCells = useMemo(
    () => buildMonthGrid(monthCursor.year, monthCursor.month, todayKey),
    [monthCursor.month, monthCursor.year, todayKey],
  )

  const monthTitle = useMemo(
    () =>
      new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
        new Date(Date.UTC(monthCursor.year, monthCursor.month, 1)),
      ),
    [monthCursor.month, monthCursor.year],
  )

  const effectiveSelectedDay = useMemo(() => {
    if (selectedDayKey) return selectedDayKey
    const monthPrefix = `${monthCursor.year}-${String(monthCursor.month + 1).padStart(2, '0')}`
    if (todayKey.startsWith(monthPrefix) && (grouped[todayKey]?.length ?? 0) > 0) return todayKey
    const firstWithEvents = monthCells.find(c => c.inCurrentMonth && (grouped[c.key]?.length ?? 0) > 0)
    return firstWithEvents?.key ?? null
  }, [grouped, monthCells, monthCursor.month, monthCursor.year, selectedDayKey, todayKey])

  const selectedDayItems = effectiveSelectedDay ? grouped[effectiveSelectedDay] ?? [] : []
  const undatedItems = grouped.undated ?? []

  const partialMessage = data ? sourceStateText(data) : null
  const attentionSources = data?.sources.filter(source => isAttentionSource(source.id)) ?? []
  const attentionKnown = attentionSources.length > 0 && attentionSources.every(source => source.state === 'ready' || source.state === 'empty')
  const attentionErrors = attentionSources.filter(source => source.state === 'error')
  const attentionUnavailable = attentionSources.filter(source => source.state === 'unavailable' || source.state === 'unsupported')
  const attentionPartial = attentionSources.filter(source => source.state === 'partial')
  const calendarKnown =
    data?.sources.some(
      source =>
        ['student-calendar', 'lecturer-calendar', 'student-dashboard', 'meetings', 'deliverables', 'final-submission'].includes(source.id) &&
        ['ready', 'empty', 'partial'].includes(source.state),
    ) ?? false

  function shiftMonth(delta: number) {
    setMonthCursor(prev => {
      const next = new Date(Date.UTC(prev.year, prev.month + delta, 1))
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() }
    })
    setSelectedDayKey(null)
  }

  function jumpToToday() {
    setMonthCursor(parseMonthAnchor(todayKey))
    setSelectedDayKey(todayKey)
  }

  return (
    <section className="calendar-page workspace-page" aria-labelledby="calendar-heading" aria-busy={loading}>
      <header className="calendar-page__header">
        <div>
          <p className="calendar-page__eyebrow">Không gian chung · chỉ đọc</p>
          <h1 id="calendar-heading">Lịch tổng hợp &amp; điểm cần chú ý</h1>
          <p>Tổng hợp các mốc thời gian trong phạm vi bạn được xem. Lịch giúp theo dõi công việc nhưng không thay thế thông báo.</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon="refresh"
          onClick={() => void refresh()}
          disabled={loading}
          aria-label="Tải lại lịch và điểm cần chú ý"
        />
      </header>

      {loading && <PageLoading label="Đang tải lịch tổng hợp" />}

      {data && (
        <>
          {partialMessage && (
            <div className="calendar-page__notice" role="status">
              <span className="material-symbols-outlined" aria-hidden="true">info</span>
              <span>{partialMessage}</span>
            </div>
          )}

          <div className="mb-5">
            <StatTileRow
              tiles={[
                { icon: 'calendar_month', label: 'Mốc lịch sắp tới', value: baseItems.length, hero: true, caption: showHistorical ? 'Bao gồm các mục đã hoàn tất.' : 'Đang hoạt động theo giờ Việt Nam.' },
                { icon: 'priority_high', label: 'Điểm cần chú ý', value: data.attention.length, tone: data.attention.length > 0 ? 'warning' : 'success', caption: data.attention.length > 0 ? 'Các mục ưu tiên xử lý sớm.' : 'Không có điểm tồn đọng.' },
                { icon: 'today', label: 'Sự kiện hôm nay', value: (grouped[todayKey] ?? []).length, tone: 'info', caption: 'Lịch trình diễn ra trong ngày.' },
                { icon: 'sync', label: 'Nguồn dữ liệu đồng bộ', value: `${data.sources.filter(s => s.state === 'ready' || s.state === 'empty').length}/${data.sources.length}`, tone: 'neutral', caption: 'Tổng hợp tự động theo quyền hiện tại.' },
              ]}
            />
          </div>

          <div className="calendar-page__layout">
            <section className="calendar-panel" aria-labelledby="calendar-projection-heading">
              <div className="calendar-panel__toolbar">
                <div>
                  <h2 id="calendar-projection-heading">Lịch của bạn</h2>
                  <p>Theo dõi lịch họp, công việc và mốc đồ án. Thời gian hiển thị theo giờ Việt Nam.</p>
                </div>
                <div className="calendar-panel__controls" aria-label="Tùy chọn hiển thị lịch">
                  <div className="calendar-segmented" role="group" aria-label="Chế độ xem lịch">
                    <button type="button" aria-pressed={view === 'agenda'} onClick={() => setView('agenda')}>Danh sách</button>
                    <button type="button" aria-pressed={view === 'month'} onClick={() => setView('month')}>Theo tháng</button>
                  </div>
                  <label className="calendar-checkbox">
                    <input type="checkbox" checked={showHistorical} onChange={(event) => setShowHistorical(event.target.checked)} />
                    Hiện hoàn tất
                  </label>
                </div>
              </div>

              <div className="calendar-panel__filters">
                <FilterToolbar
                  embedded
                  debounceMs={0}
                  ariaLabel="Bộ lọc sự kiện lịch"
                  search={search}
                  onSearchChange={setSearch}
                  searchPlaceholder="Tìm theo tiêu đề sự kiện hoặc tên đồ án…"
                  searchLabel="Tìm kiếm sự kiện lịch"
                  controls={
                    <>
                      <label className="ft-select-wrap">
                        <span className="sr-only">Lọc theo nguồn</span>
                        <select
                          aria-label="Nguồn sự kiện"
                          value={sourceFilter}
                          onChange={(e) => setSourceFilter(e.target.value as 'ALL' | CalendarProjectionItem['sourceType'])}
                        >
                          <option value="ALL">Mọi nguồn</option>
                          {Object.entries(sourceLabels).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </label>
                      {availableStatusLabels.length > 0 && (
                        <label className="ft-select-wrap">
                          <span className="sr-only">Lọc theo trạng thái</span>
                          <select aria-label="Trạng thái sự kiện" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="ALL">Mọi trạng thái</option>
                            {availableStatusLabels.map((label) => (
                              <option key={label} value={label}>{label}</option>
                            ))}
                          </select>
                        </label>
                      )}
                    </>
                  }
                  activeChips={activeChips}
                  sort={{
                    value: sortBy,
                    onChange: (value) => setSortBy(value as CalendarSort),
                    options: [
                      { value: 'soonest', label: 'Sắp đến hạn trước' },
                      { value: 'latest', label: 'Xa nhất trước' },
                      { value: 'title', label: 'Tiêu đề A–Z' },
                    ],
                  }}
                  onRemoveChip={(id) => {
                    if (id === 'search') setSearch('')
                    if (id === 'source') setSourceFilter('ALL')
                    if (id === 'status') setStatusFilter('ALL')
                  }}
                  onClearAll={() => { setSearch(''); setSourceFilter('ALL'); setStatusFilter('ALL'); setSortBy('soonest') }}
                  hasActiveFilters={activeChips.length > 0 || sortBy !== 'soonest'}
                  resultSummary={activeChips.length > 0 ? `Hiển thị ${items.length} / ${baseItems.length} sự kiện` : undefined}
                />
              </div>

              {view === 'agenda' ? (
                items.length === 0 ? (
                  <div className="calendar-empty">
                    <span className="material-symbols-outlined" aria-hidden="true">event_busy</span>
                    <p>
                      {data.calendar.length > 0
                        ? 'Không có sự kiện phù hợp bộ lọc hiện tại.'
                        : calendarKnown
                          ? 'Chưa có sự kiện nào có thời gian trong phạm vi hiện tại.'
                          : 'Chưa tải được sự kiện lịch từ nguồn hiện tại.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="calendar-agenda">
                      {Object.entries(agendaGrouped).map(([date, entries]) => (
                        <div className="calendar-agenda__group" key={date}>
                          <h3>{date === 'undated' ? 'Chưa có thời điểm' : formatCalendarDate(date)}</h3>
                          {entries.map((item) => (
                            <CalendarRow item={item} key={`${item.sourceType}-${item.sourceId}`} />
                          ))}
                        </div>
                      ))}
                    </div>
                    {agendaPagination.showPagination && (
                      <div className="px-5 pb-4">
                        <Pagination
                          page={agendaPagination.page}
                          pages={agendaPagination.pages}
                          total={agendaPagination.total}
                          pageSize={agendaPagination.pageSize}
                          onPage={agendaPagination.setPage}
                          onPageSizeChange={agendaPagination.setPageSize}
                        />
                      </div>
                    )}
                  </>
                )
              ) : (
                <div className="calendar-month-shell">
                  <div className="calendar-month-nav">
                    <h3 className="calendar-month-nav__title">{monthTitle}</h3>
                    <div className="calendar-month-nav__actions">
                      <Button size="sm" variant="outline" onClick={() => shiftMonth(-1)}>← Tháng trước</Button>
                      <Button size="sm" variant="secondary" onClick={jumpToToday}>Hôm nay</Button>
                      <Button size="sm" variant="outline" onClick={() => shiftMonth(1)}>Tháng sau →</Button>
                    </div>
                  </div>

                  <div className="calendar-month-grid-wrap">
                    <div className="calendar-month-grid" role="grid" aria-label={`Lịch ${monthTitle}`}>
                      {WEEKDAYS.map(day => (
                        <div key={day} className="calendar-month-weekday" role="columnheader">
                          {day}
                        </div>
                      ))}
                      {monthCells.map(cell => {
                        const dayEvents = grouped[cell.key] ?? []
                        const isSelected = effectiveSelectedDay === cell.key
                        return (
                          <button
                            key={cell.key}
                            type="button"
                            role="gridcell"
                            aria-pressed={isSelected}
                            aria-label={`Ngày ${cell.key}${dayEvents.length ? `, ${dayEvents.length} sự kiện` : ''}`}
                            onClick={() => setSelectedDayKey(cell.key)}
                            className={`calendar-day-cell${cell.inCurrentMonth ? '' : ' calendar-day-cell--outside'}${cell.isToday ? ' calendar-day-cell--today' : ''}${isSelected ? ' calendar-day-cell--selected' : ''}`}
                          >
                            <div className="calendar-day-cell__head">
                              <span className="calendar-day-cell__num">{cell.dayNumber}</span>
                              {dayEvents.length > 0 && (
                                <span className="calendar-day-cell__count">{dayEvents.length}</span>
                              )}
                            </div>
                            {dayEvents.length > 0 && (
                              <div className="calendar-day-cell__pills">
                                {dayEvents.slice(0, 2).map(ev => (
                                  <span key={`${ev.sourceType}-${ev.sourceId}`} className="calendar-day-pill" title={ev.title}>
                                    {ev.title}
                                  </span>
                                ))}
                                {dayEvents.length > 2 && (
                                  <span className="calendar-day-pill calendar-day-pill--more">
                                    +{dayEvents.length - 2} mục nữa
                                  </span>
                                )}
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="calendar-day-detail" aria-live="polite">
                    <div className="calendar-day-detail__header">
                      <h3>
                        {effectiveSelectedDay
                          ? `Chi tiết ngày ${formatCalendarDate(effectiveSelectedDay)}`
                          : 'Chọn một ngày trên lịch để xem chi tiết'}
                      </h3>
                      {effectiveSelectedDay && (
                        <StatusBadge
                          tone={selectedDayItems.length > 0 ? 'warning' : 'neutral'}
                          label={`${selectedDayItems.length} sự kiện`}
                        />
                      )}
                    </div>
                    {effectiveSelectedDay && selectedDayItems.length > 0 ? (
                      <div className="space-y-1">
                        {selectedDayItems.map(item => (
                          <CalendarRow item={item} key={`detail-${item.sourceType}-${item.sourceId}`} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-ink-muted">
                        {effectiveSelectedDay
                          ? 'Không có sự kiện nào trong ngày này theo bộ lọc hiện tại.'
                          : 'Nhấp vào ô ngày bất kỳ có đánh dấu sự kiện để xem danh sách chi tiết.'}
                      </p>
                    )}
                  </div>

                  {undatedItems.length > 0 && (
                    <div className="calendar-day-detail">
                      <div className="calendar-day-detail__header">
                        <h3>Chưa có thời điểm</h3>
                        <StatusBadge tone="neutral" label={`${undatedItems.length} sự kiện`} />
                      </div>
                      <div className="space-y-1">
                        {undatedItems.map(item => (
                          <CalendarRow item={item} key={`undated-${item.sourceType}-${item.sourceId}`} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <aside className="attention-panel" aria-labelledby="attention-heading">
              <div className="attention-panel__heading">
                <div>
                  <h2 id="attention-heading">Điểm cần chú ý</h2>
                  <p>Những việc ưu tiên cao và mốc đồ án quá hạn.</p>
                </div>
                <span
                  className="attention-panel__count"
                  role="status"
                  aria-atomic="true"
                  aria-label={attentionKnown ? `${data.attention.length} điểm cần chú ý` : 'Chưa xác định số việc cần làm'}
                >
                  <span aria-hidden="true">{attentionKnown ? data.attention.length : '—'}</span>
                  <span className="sr-only">
                    {attentionKnown ? `${data.attention.length} điểm cần chú ý` : 'Chưa xác định số việc cần làm'}
                  </span>
                </span>
              </div>

              {attentionErrors.length > 0 && (
                <div role="alert" className="mx-4 my-3 space-y-2 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">
                  <p>Một số nguồn chưa tải được; danh sách có thể chưa đầy đủ.</p>
                  {attentionErrors.map(source => <p key={source.id}>{source.message}</p>)}
                  <Button variant="outline" size="sm" className="min-h-11" icon="refresh" onClick={() => void refresh()} disabled={loading}>
                    Tải lại danh sách
                  </Button>
                </div>
              )}

              {attentionUnavailable.map(source => (
                <p key={source.id} className="px-4 py-2 text-sm text-ink-muted">
                  {source.message ?? 'Chưa có nguồn dữ liệu trong phạm vi hiện tại.'}
                </p>
              ))}
              {attentionPartial.map(source => (
                <p key={source.id} className="px-4 py-2 text-sm text-ink-muted">{source.message}</p>
              ))}
              {attentionSources.length === 0 && (
                <p className="px-4 py-2 text-sm text-ink-muted">
                  Chưa có nguồn việc cần làm trong phạm vi hiện tại. Xem trạng thái nguồn dữ liệu bên dưới.
                </p>
              )}
              {data.attentionAsOfUtc && (
                <p className="px-4 pb-2 text-xs text-ink-muted">
                  Dữ liệu tính đến: <time dateTime={data.attentionAsOfUtc}>{formatCalendarDate(data.attentionAsOfUtc)}</time>
                </p>
              )}
              {(data.otherOpenActionsCount ?? 0) > 0 && (
                <p className="px-4 pb-2 text-sm text-ink-muted">
                  Còn {data.otherOpenActionsCount} việc đang mở không thuộc nhóm ưu tiên cao.
                </p>
              )}

              {data.attention.length === 0 && attentionKnown ? (
                <div className="calendar-empty">
                  <span className="material-symbols-outlined" aria-hidden="true">task_alt</span>
                  <p>{(data.otherOpenActionsCount ?? 0) > 0 ? 'Không có điểm cần chú ý ưu tiên cao.' : 'Không có việc cần làm.'}</p>
                  <a className="inline-flex min-h-11 items-center text-sm text-primary underline" href="#calendar-sources-heading">
                    Xem phạm vi nguồn dữ liệu
                  </a>
                </div>
              ) : (
                data.attention.length > 0 && (
                  <>
                    <ul className="attention-list">
                      {attentionPagination.paginatedItems.map(item => (
                        <li key={`${item.code}-${item.sourceId}`}>
                          {item.deepLink ? (
                            <Link to={item.deepLink}><AttentionContent item={item} /></Link>
                          ) : (
                            <div className="attention-list__content">
                              <AttentionContent item={item} />
                              <span className="text-xs text-ink-muted">Chưa có liên kết nội bộ hợp lệ.</span>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                    {attentionPagination.showPagination && (
                      <div className="px-4 pb-4">
                        <Pagination
                          page={attentionPagination.page}
                          pages={attentionPagination.pages}
                          total={attentionPagination.total}
                          pageSize={attentionPagination.pageSize}
                          onPage={attentionPagination.setPage}
                          onPageSizeChange={attentionPagination.setPageSize}
                        />
                      </div>
                    )}
                  </>
                )
              )}
            </aside>
          </div>

          <DataSourceStatus sources={data.sources} asOfUtc={data.attentionAsOfUtc} />
        </>
      )}
    </section>
  )
}

function CalendarRow({ item }: { item: CalendarProjectionItem }) {
  const timestamp = datedAt(item)
  return (
    <Link className="calendar-event" to={item.deepLink}>
      <div className="calendar-event__main">
        <div className="calendar-event__badges">
          <span className="calendar-event__type">{sourceLabels[item.sourceType]}</span>
          <StatusBadge tone={calendarStatusTone(item.status)} label={calendarStatusLabel(item.status)} />
        </div>
        <strong className="calendar-event__title">{item.title}</strong>
        <div className="calendar-event__meta">
          {item.projectName && <span>{item.projectName}</span>}
          <span>{timestamp ? formatCalendarDate(timestamp) : 'Chưa có thời điểm'}</span>
        </div>
      </div>
      <span className="calendar-event__trail">
        <span className="material-symbols-outlined text-ink-muted" aria-hidden="true">chevron_right</span>
      </span>
    </Link>
  )
}

function AttentionContent({ item }: { item: AttentionItem }) {
  return (
    <>
      <div className="attention-list__badges">
        <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">{item.icon ?? 'info'}</span>
        <StatusBadge status={item.status} tone={item.tone} label={calendarStatusLabel(item.status)} />
        {item.severity && (
          <StatusBadge
            status={item.severity}
            tone={item.severity === 'HIGH' ? 'danger' : item.tone}
            label={item.severity === 'HIGH' ? 'Ưu tiên cao' : 'Thông thường'}
          />
        )}
      </div>
      <strong>{item.title}</strong>
      <span className="attention-list__desc">{item.description}</span>
      {item.dueAt && <time dateTime={item.dueAt}>{formatCalendarDate(item.dueAt)}</time>}
    </>
  )
}
