import { displayLabel } from '../../components/ui/display-label'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { PageLoading } from '../../components/ui/PageLoading'
import { useWorkspaceAccess } from '../../app/context/workspace-access'
import { useAuthSession } from '../auth/context/useAuthSession'
import { formatCalendarDate, isHistoricalStatus } from './calendar-projections'
import { loadCalendarAttention } from './calendar-data'
import type { CalendarAttentionData, CalendarProjectionItem } from './calendar-types'
import './calendar-attention.css'

type ViewMode = 'agenda' | 'month'
const sourceLabels: Record<CalendarProjectionItem['sourceType'], string> = {
  TASK: 'Công việc', MILESTONE: 'Mốc đồ án', MEETING: 'Cuộc họp', DELIVERABLE: 'Hạng mục', FINAL_SUBMISSION: 'Bàn giao cuối kỳ', EVALUATION_ASSIGNMENT: 'Phân công đánh giá', PROGRESS_REPORT: 'Báo cáo tiến độ',
}

function datedAt(item: CalendarProjectionItem): string | undefined { return item.dueAt ?? item.startAt ?? item.endAt }
function dateKey(item: CalendarProjectionItem): string { return datedAt(item)?.slice(0, 10) ?? '' }
function sourceStateText(data: CalendarAttentionData): string | null {
  const affected = data.sources.filter((source) => source.state !== 'ready' && source.state !== 'empty')
  return affected.length ? `${affected.length} nguồn chưa đầy đủ. Những nguồn khác vẫn được hiển thị.` : null
}

export function CalendarAttentionPage() {
  const access = useWorkspaceAccess()
  const { session } = useAuthSession()
  const [data, setData] = useState<CalendarAttentionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('agenda')
  const [showHistorical, setShowHistorical] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setData(await loadCalendarAttention({ role: access.identityRole, semesterId: access.selectedSemesterId, accessToken: session?.accessToken }))
    setLoading(false)
  }, [access.identityRole, access.selectedSemesterId, session?.accessToken])

  useEffect(() => { void refresh() }, [refresh])

  const items = useMemo(() => (data?.calendar ?? [])
    .filter((item) => showHistorical || !isHistoricalStatus(item.status))
    .sort((left, right) => (datedAt(left) ?? '').localeCompare(datedAt(right) ?? '')), [data, showHistorical])
  const grouped = useMemo(() => items.reduce<Record<string, CalendarProjectionItem[]>>((groups, item) => {
    const key = dateKey(item) || 'undated'
    groups[key] = [...(groups[key] ?? []), item]
    return groups
  }, {}), [items])
  const partialMessage = data ? sourceStateText(data) : null

  return <section className="calendar-page workspace-page" aria-labelledby="calendar-heading">
    <header className="calendar-page__header">
      <div>
        <p className="calendar-page__eyebrow">Không gian chung · chỉ đọc</p>
        <h1 id="calendar-heading">Lịch tổng hợp &amp; điểm cần chú ý</h1>
        <p>Tổng hợp các mốc thời gian trong phạm vi bạn được xem. Lịch giúp theo dõi công việc nhưng không thay thế thông báo.</p>
      </div>
      <Button variant="outline" icon="refresh" onClick={() => void refresh()} disabled={loading} aria-label="Tải lại lịch và điểm cần chú ý">Tải lại</Button>
    </header>

    {loading && <PageLoading label="Đang tải lịch tổng hợp" />}
    {!loading && data && <>
      {partialMessage && <div className="calendar-page__notice" role="status"><span className="material-symbols-outlined" aria-hidden="true">info</span><span>{partialMessage}</span></div>}
      <div className="calendar-page__layout">
        <section className="calendar-panel" aria-labelledby="calendar-projection-heading">
          <div className="calendar-panel__toolbar">
            <div><h2 id="calendar-projection-heading">Lịch của bạn</h2><p>Theo dõi lịch họp, công việc và mốc đồ án. Thời gian hiển thị theo giờ Việt Nam.</p></div>
            <div className="calendar-panel__controls" aria-label="Tùy chọn hiển thị lịch">
              <div className="calendar-segmented" role="group" aria-label="Chế độ xem lịch">
                <button type="button" aria-pressed={view === 'agenda'} onClick={() => setView('agenda')}>Danh sách</button>
                <button type="button" aria-pressed={view === 'month'} onClick={() => setView('month')}>Theo tháng</button>
              </div>
              <label className="calendar-checkbox"><input type="checkbox" checked={showHistorical} onChange={(event) => setShowHistorical(event.target.checked)} /> Hiện hoàn tất</label>
            </div>
          </div>
          {items.length === 0 ? <div className="calendar-empty"><span className="material-symbols-outlined" aria-hidden="true">event_busy</span><p>Chưa có sự kiện nào có thời gian trong phạm vi hiện tại.</p></div> : view === 'agenda' ? <div className="calendar-agenda">
            {Object.entries(grouped).map(([date, entries]) => <div className="calendar-agenda__group" key={date}>
              <h3>{date === 'undated' ? 'Chưa có thời điểm' : formatCalendarDate(date)}</h3>
              {entries.map((item) => <CalendarRow item={item} key={`${item.sourceType}-${item.sourceId}`} />)}
            </div>)}
          </div> : <div className="calendar-month" role="list" aria-label="Sự kiện theo tháng">
            {items.map((item) => <CalendarRow item={item} key={`${item.sourceType}-${item.sourceId}`} compact />)}
          </div>}
        </section>
        <aside className="attention-panel" aria-labelledby="attention-heading">
          <div className="attention-panel__heading"><div><h2 id="attention-heading">Điểm cần chú ý</h2><p>Những việc sắp đến hạn hoặc cần bạn theo dõi.</p></div><span className="attention-panel__count" aria-label={`${data.attention.length} điểm cần chú ý`}>{data.attention.length}</span></div>
          {data.attention.length === 0 ? <div className="calendar-empty"><span className="material-symbols-outlined" aria-hidden="true">task_alt</span><p>Không có điểm cần chú ý từ nguồn đã tải.</p></div> : <ul className="attention-list">{data.attention.map((item) => <li key={`${item.code}-${item.sourceId}`}><Link to={item.deepLink}><span className="attention-list__status">{displayLabel(item.status)}</span><strong>{item.title}</strong><span>{item.description}</span>{item.dueAt && <time dateTime={item.dueAt}>{formatCalendarDate(item.dueAt)}</time>}</Link></li>)}</ul>}
        </aside>
      </div>
      <section className="calendar-sources" aria-labelledby="calendar-sources-heading"><h2 id="calendar-sources-heading">Trạng thái nguồn dữ liệu</h2><ul>{data.sources.map((source) => <li key={source.id}><span className={`calendar-source-dot calendar-source-dot--${source.state}`} aria-hidden="true" /><div><strong>{source.label}</strong><span>{source.message ?? (source.state === 'ready' ? 'Đã tải dữ liệu nguồn.' : 'Không có dữ liệu để hiển thị.')}</span></div></li>)}</ul></section>
    </>}
  </section>
}

function CalendarRow({ item, compact = false }: { item: CalendarProjectionItem; compact?: boolean }) {
  const timestamp = datedAt(item)
  return <Link className={`calendar-event${compact ? ' calendar-event--compact' : ''}`} to={item.deepLink}>
    <span className="calendar-event__type">{sourceLabels[item.sourceType]}</span>
    <span className="calendar-event__body"><strong>{item.title}</strong>{item.projectName && <span>{item.projectName}</span>}<span>{timestamp ? formatCalendarDate(timestamp) : 'Chưa có thời điểm'}</span></span>
    <span className="calendar-event__status">{calendarStatusLabel(item.status)}</span>
    <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
  </Link>
}

function calendarStatusLabel(status: string) {
  return ({ TODO: 'Cần làm', IN_PROGRESS: 'Đang thực hiện', DONE: 'Hoàn tất', COMPLETED: 'Hoàn tất', SCHEDULED: 'Đã lên lịch', CANCELLED: 'Đã hủy', OVERDUE: 'Quá hạn', SUBMITTED: 'Đã nộp' } as Record<string, string>)[status] ?? status
}

