import { StatusBadge } from '../../components/ui/StatusBadge'
import type { BadgeTone } from '../../components/ui/status-badge-tone'
import { StatTileRow } from '../../components/ui/StatTileRow'
import { DataSourceStatus } from '../../components/ui/DataSourceStatus'
import { Pagination } from '../../components/ui/Pagination'
import { useClientPagination } from '../../components/ui/useClientPagination'
import { displayLabel } from '../../components/ui/display-label'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { PageLoading } from '../../components/ui/PageLoading'
import { useWorkspaceAccess } from '../../app/context/workspace-access'
import { useAuthSession } from '../auth/context/useAuthSession'
import { formatCalendarDate, isHistoricalStatus } from './calendar-projections'
import { loadCalendarAttention } from './calendar-data'
import type { AttentionItem, CalendarAttentionData, CalendarProjectionItem } from './calendar-types'
import './calendar-attention.css'

type ViewMode = 'agenda' | 'month'
const sourceLabels: Record<CalendarProjectionItem['sourceType'], string> = {
  TASK: 'Công việc', MILESTONE: 'Mốc đồ án', MEETING: 'Cuộc họp', DELIVERABLE: 'Hạng mục', FINAL_SUBMISSION: 'Bàn giao cuối kỳ', EVALUATION_ASSIGNMENT: 'Phân công đánh giá', PROGRESS_REPORT: 'Báo cáo tiến độ',
}

function datedAt(item: CalendarProjectionItem): string | undefined { return item.dueAt ?? item.startAt ?? item.endAt }
function dateKey(item: CalendarProjectionItem): string { return datedAt(item)?.slice(0, 10) ?? '' }
function isAttentionSource(id: string): boolean {
  return ['next-actions', 'triage-queue', 'accounts', 'urgent-actions'].includes(id) || id.startsWith('urgent-actions-')
}
function sourceStateText(data: CalendarAttentionData): string | null {
  const affected = data.sources.filter((source) => !isAttentionSource(source.id) && (source.state === 'error' || source.state === 'partial'))
  return affected.length ? `${affected.length} nguồn chưa đầy đủ. Những nguồn khác vẫn được hiển thị.` : null
}

export function CalendarAttentionPage() {
  const access = useWorkspaceAccess()
  const { session } = useAuthSession()
  const [data, setData] = useState<CalendarAttentionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('agenda')
  const [showHistorical, setShowHistorical] = useState(false)
  const generation = useRef(0)

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const request = ++generation.current
    setLoading(true)
    const next = await loadCalendarAttention({ role: access.identityRole, semesterId: access.selectedSemesterId, accessToken: session?.accessToken, departmentIds: access.departmentIds, departments: access.departments, signal })
    if (!signal?.aborted && request === generation.current) { setData(next); setLoading(false) }
  }, [access.identityRole, access.selectedSemesterId, session?.accessToken, access.departmentIds, access.departments])

  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal)
    return () => controller.abort()
  }, [refresh])

  const items = useMemo(() => (data?.calendar ?? [])
    .filter((item) => showHistorical || !isHistoricalStatus(item.status))
    .sort((left, right) => (datedAt(left) ?? '').localeCompare(datedAt(right) ?? '')), [data, showHistorical])

  const calendarPagination = useClientPagination(items, 10)
  const attentionItems = data?.attention ?? []
  const attentionPagination = useClientPagination(attentionItems, 8)

  const grouped = useMemo(() => calendarPagination.paginatedItems.reduce<Record<string, CalendarProjectionItem[]>>((groups, item) => {
    const key = dateKey(item) || 'undated'
    groups[key] = [...(groups[key] ?? []), item]
    return groups
  }, {}), [calendarPagination.paginatedItems])

  const partialMessage = data ? sourceStateText(data) : null
  const attentionSources = data?.sources.filter(source => isAttentionSource(source.id)) ?? []
  const attentionKnown = attentionSources.length > 0 && attentionSources.every(source => source.state === 'ready' || source.state === 'empty')
  const attentionErrors = attentionSources.filter(source => source.state === 'error')
  const attentionUnavailable = attentionSources.filter(source => source.state === 'unavailable' || source.state === 'unsupported')
  const attentionPartial = attentionSources.filter(source => source.state === 'partial')
  const calendarKnown = data?.sources.some(source => ['student-calendar', 'lecturer-calendar', 'student-dashboard', 'meetings', 'deliverables', 'final-submission'].includes(source.id) && ['ready', 'empty', 'partial'].includes(source.state)) ?? false
  const highPriorityCount = attentionItems.filter(item => item.severity === 'HIGH' || item.tone === 'danger').length
  const healthySourceCount = data?.sources.filter(source => source.state === 'ready' || source.state === 'empty').length ?? 0

  return <section className="calendar-page workspace-page" aria-labelledby="calendar-heading" aria-busy={loading}>
    <header className="calendar-page__header">
      <div>
        <p className="calendar-page__eyebrow">Không gian chung · chỉ đọc</p>
        <h1 id="calendar-heading">Lịch tổng hợp &amp; điểm cần chú ý</h1>
        <p>Tổng hợp các mốc thời gian trong phạm vi bạn được xem. Lịch giúp theo dõi công việc nhưng không thay thế thông báo.</p>
      </div>
      <Button variant="outline" icon="refresh" onClick={() => void refresh()} disabled={loading} aria-label="Tải lại lịch và điểm cần chú ý">Tải lại</Button>
    </header>

    {loading && <PageLoading label="Đang tải lịch tổng hợp" />}
    {data && <>
      <StatTileRow tiles={[
        {
          icon: 'calendar_month',
          label: 'Sự kiện sắp tới',
          value: calendarKnown ? items.length : null,
          hero: true,
          caption: showHistorical ? 'Bao gồm cả sự kiện đã hoàn tất.' : 'Lịch họp, công việc và mốc còn mở.',
        },
        {
          icon: 'notification_important',
          label: 'Điểm cần chú ý',
          value: attentionKnown ? attentionItems.length : null,
          tone: attentionKnown && attentionItems.length > 0 ? 'warning' : 'neutral',
          caption: attentionKnown ? 'Các hạng mục ưu tiên cần xử lý.' : 'Một số nguồn chưa sẵn sàng.',
        },
        {
          icon: 'priority_high',
          label: 'Việc ưu tiên cao',
          value: attentionKnown ? highPriorityCount : null,
          tone: attentionKnown && highPriorityCount > 0 ? 'danger' : 'neutral',
          caption: 'Mốc quá hạn hoặc cảnh báo khẩn.',
        },
        {
          icon: 'pending_actions',
          label: 'Việc đang mở khác',
          value: data.otherOpenActionsCount != null ? data.otherOpenActionsCount : (attentionKnown ? 0 : null),
          tone: 'info',
          caption: 'Không thuộc nhóm ưu tiên cao.',
        },
      ]} />

      {partialMessage && <div className="calendar-page__notice" role="status"><span className="material-symbols-outlined" aria-hidden="true">info</span><span>{partialMessage}</span></div>}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-start">
        <section className="calendar-panel xl:col-span-8" aria-labelledby="calendar-projection-heading">
          <div className="calendar-panel__toolbar">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">event_note</span>
                <h2 id="calendar-projection-heading">Lịch của bạn</h2>
                <span className="inline-flex items-center rounded-full border border-hairline bg-card px-2.5 py-0.5 text-xs font-bold tabular-nums text-ink-soft">
                  {items.length}
                </span>
              </div>
              <p>Theo dõi lịch họp, công việc và mốc đồ án. Thời gian hiển thị theo giờ Việt Nam.</p>
            </div>
            <div className="calendar-panel__controls" aria-label="Tùy chọn hiển thị lịch">
              <div className="calendar-segmented" role="group" aria-label="Chế độ xem lịch">
                <button type="button" aria-pressed={view === 'agenda'} onClick={() => setView('agenda')}>Danh sách</button>
                <button type="button" aria-pressed={view === 'month'} onClick={() => setView('month')}>Theo tháng</button>
              </div>
              <label className="calendar-checkbox"><input type="checkbox" checked={showHistorical} onChange={(event) => setShowHistorical(event.target.checked)} /> Hiện hoàn tất</label>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="calendar-empty">
              <span className="material-symbols-outlined" aria-hidden="true">event_busy</span>
              <p>{data.calendar.length > 0 ? 'Không có sự kiện phù hợp bộ lọc hiện tại.' : calendarKnown ? 'Chưa có sự kiện nào có thời gian trong phạm vi hiện tại.' : 'Chưa tải được sự kiện lịch từ nguồn hiện tại.'}</p>
            </div>
          ) : view === 'agenda' ? (
            <div className="calendar-agenda">
              {Object.entries(grouped).map(([date, entries]) => (
                <div className="calendar-agenda__group" key={date}>
                  <h3>{date === 'undated' ? 'Chưa có thời điểm' : formatCalendarDate(date)}</h3>
                  {entries.map((item) => <CalendarRow item={item} key={`${item.sourceType}-${item.sourceId}`} />)}
                </div>
              ))}
            </div>
          ) : (
            <div className="calendar-month" role="list" aria-label="Sự kiện theo tháng">
              {calendarPagination.paginatedItems.map((item) => <CalendarRow item={item} key={`${item.sourceType}-${item.sourceId}`} compact />)}
            </div>
          )}

          {calendarPagination.showPagination && (
            <div className="border-t border-hairline px-5 py-3">
              <Pagination
                page={calendarPagination.page}
                pages={calendarPagination.totalPages}
                total={calendarPagination.total}
                pageSize={calendarPagination.pageSize}
                pageSizeOptions={[10, 20, 40]}
                onPage={calendarPagination.setPage}
                onPageSizeChange={calendarPagination.setPageSize}
              />
            </div>
          )}
        </section>

        <aside className="attention-panel xl:col-span-4" aria-labelledby="attention-heading">
          <div className="attention-panel__heading">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">notifications_active</span>
                <h2 id="attention-heading">Điểm cần chú ý</h2>
              </div>
              <p>Những việc ưu tiên cao và mốc đồ án quá hạn.</p>
            </div>
            <span className="attention-panel__count" role="status" aria-atomic="true" aria-label={attentionKnown ? `${data.attention.length} điểm cần chú ý` : 'Chưa xác định số việc cần làm'}>
              <span aria-hidden="true">{attentionKnown ? data.attention.length : '—'}</span>
              <span className="sr-only">{attentionKnown ? `${data.attention.length} điểm cần chú ý` : 'Chưa xác định số việc cần làm'}</span>
            </span>
          </div>
          {attentionErrors.length > 0 && <div role="alert" className="mx-4 mt-3 mb-3 space-y-2 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">
            <p>Một số nguồn chưa tải được; danh sách có thể chưa đầy đủ.</p>
            {attentionErrors.map(source => <p key={source.id}>{source.message}</p>)}
            <Button variant="outline" size="sm" className="min-h-11" icon="refresh" onClick={() => void refresh()} disabled={loading}>Tải lại danh sách</Button>
          </div>}
          {attentionUnavailable.map(source => <p key={source.id} className="px-4 pt-3 text-sm text-ink-muted">{source.message ?? 'Chưa có nguồn dữ liệu trong phạm vi hiện tại.'}</p>)}
          {attentionPartial.map(source => <p key={source.id} className="px-4 pt-3 text-sm text-ink-muted">{source.message}</p>)}
          {attentionSources.length === 0 && <p className="px-4 pt-3 text-sm text-ink-muted">Chưa có nguồn việc cần làm trong phạm vi hiện tại. Xem trạng thái nguồn dữ liệu bên dưới.</p>}
          {data.attentionAsOfUtc && <p className="px-4 pt-3 text-xs text-ink-muted">Dữ liệu tính đến: <time dateTime={data.attentionAsOfUtc}>{formatCalendarDate(data.attentionAsOfUtc)}</time></p>}
          {(data.otherOpenActionsCount ?? 0) > 0 && <p className="px-4 pt-2 pb-1 text-sm text-ink-muted">Còn {data.otherOpenActionsCount} việc đang mở không thuộc nhóm ưu tiên cao.</p>}
          {data.attention.length === 0 && attentionKnown
            ? <div className="calendar-empty"><span className="material-symbols-outlined" aria-hidden="true">task_alt</span><p>{(data.otherOpenActionsCount ?? 0) > 0 ? 'Không có điểm cần chú ý ưu tiên cao.' : 'Không có việc cần làm.'}</p><a className="inline-flex min-h-11 items-center text-sm text-primary underline" href="#calendar-sources-heading">Xem phạm vi nguồn dữ liệu</a></div>
            : data.attention.length > 0 && (
              <>
                <ul className="attention-list">{attentionPagination.paginatedItems.map(item => <li key={`${item.code}-${item.sourceId}`}>
                  {item.deepLink ? <Link to={item.deepLink}><AttentionContent item={item} /></Link> : <div className="attention-list__content"><AttentionContent item={item} /><span className="text-xs">Chưa có liên kết nội bộ hợp lệ.</span></div>}
                </li>)}</ul>
                {attentionPagination.showPagination && (
                  <div className="border-t border-hairline px-4 py-3">
                    <Pagination
                      page={attentionPagination.page}
                      pages={attentionPagination.totalPages}
                      total={attentionPagination.total}
                      pageSize={attentionPagination.pageSize}
                      onPage={attentionPagination.setPage}
                    />
                  </div>
                )}
              </>
            )}
        </aside>
      </div>

      {data.sources.length > 0 && (
        <details id="calendar-sources-heading" className="calendar-sources-disclosure" open={Boolean(partialMessage || attentionErrors.length > 0)}>
          <summary>
            <span className="inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">database</span>
              <span>Trạng thái nguồn dữ liệu ({healthySourceCount}/{data.sources.length} nguồn sẵn sàng)</span>
            </span>
            <span className="text-xs font-medium text-ink-muted">Xem chi tiết</span>
          </summary>
          <DataSourceStatus sources={data.sources} asOfUtc={data.attentionAsOfUtc} className="border-0 rounded-none shadow-none" />
        </details>
      )}
    </>}
  </section>
}

function CalendarRow({ item, compact = false }: { item: CalendarProjectionItem; compact?: boolean }) {
  const timestamp = datedAt(item)
  return <Link className={`calendar-event${compact ? ' calendar-event--compact' : ''}`} to={item.deepLink}>
    <span className="calendar-event__type">{sourceLabels[item.sourceType]}</span>
    <span className="calendar-event__body"><strong>{item.title}</strong>{item.projectName && <span>{item.projectName}</span>}<span>{timestamp ? formatCalendarDate(timestamp) : 'Chưa có thời điểm'}</span></span>
    <span className="calendar-event__status"><StatusBadge tone={calendarStatusTone(item.status)} label={calendarStatusLabel(item.status)} /></span>
    <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
  </Link>
}

function calendarStatusLabel(status: string) {
  return ({ TODO: 'Cần làm', IN_PROGRESS: 'Đang thực hiện', DONE: 'Hoàn tất', COMPLETED: 'Hoàn tất', SCHEDULED: 'Đã lên lịch', CANCELLED: 'Đã hủy', OVERDUE: 'Quá hạn', SUBMITTED: 'Đã nộp' } as Record<string, string>)[status] ?? displayLabel(status)
}

function calendarStatusTone(status: string): BadgeTone {
  switch ((status ?? '').toUpperCase()) {
    case 'DONE':
    case 'COMPLETED':
    case 'SUBMITTED':
      return 'success'
    case 'IN_PROGRESS':
    case 'SCHEDULED':
      return 'info'
    case 'OVERDUE':
    case 'CANCELLED':
      return 'danger'
    case 'TODO':
      return 'warning'
    default:
      return 'neutral'
  }
}


function AttentionContent({ item }: { item: AttentionItem }) {
  return <>
    <span className="material-symbols-outlined" aria-hidden="true">{item.icon ?? 'info'}</span>
    <StatusBadge status={item.status} tone={item.tone} label={displayLabel(item.status)} />
    {item.severity && <StatusBadge status={item.severity} tone={item.tone} label={item.severity === 'HIGH' ? 'Ưu tiên cao' : 'Thông thường'} />}
    <strong>{item.title}</strong><span>{item.description}</span>
    {item.dueAt && <time dateTime={item.dueAt}>{formatCalendarDate(item.dueAt)}</time>}
  </>
}
