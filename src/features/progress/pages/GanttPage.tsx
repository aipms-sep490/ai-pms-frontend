import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { FilterToolbar } from '../../../components/ui/FilterToolbar'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { ExecutionPage, ExIcon, ExState } from '../../execution/execution-ui'
import { executionError, milestoneLabels } from '../../execution/execution-utils'
import { services } from '../../../services/service-gateway'
import type { ProjectProgressSummaryDto, ProjectTimelineDataDto } from '../../../types/backend'
import { isOverdue, taskStatusLabel } from '../../projects/utils/collaboration-workspace'
import { calendarDay, dayLabel, scheduleInterval, scheduleRange, scheduleTicks } from '../utils/schedule'

type QuickAttentionFilter = 'all' | 'done' | 'overdue' | 'blocked'

function todayVietnamDay(): number {
  const vnDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  return calendarDay(vnDate) ?? calendarDay(new Date().toISOString())!
}

function milestoneScheduleSubtitle(status: string, progressPercentage: number, taskCount: number): string {
  if (taskCount > 0 && Math.round(progressPercentage) >= 100 && status !== 'COMPLETED' && status !== 'CANCELLED') {
    return 'Đã xong 100% việc · Chưa chốt mốc'
  }
  return milestoneLabels[status] ?? 'Chưa xác định'
}

export function GanttPage() {
  const { project, routeBase } = useExecutionAccess()
  const [timeline, setTimeline] = useState<ProjectTimelineDataDto | null>(null)
  const [summary, setSummary] = useState<ProjectProgressSummaryDto | null>(null)
  const [error, setError] = useState('')
  const [summaryError, setSummaryError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const [scale, setScale] = useState<'month' | 'week'>('month')
  const [showTasks, setShowTasks] = useState(false)
  const [selected, setSelected] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [quickFilter, setQuickFilter] = useState<QuickAttentionFilter>('all')
  const [expanded, setExpanded] = useState<number[]>([])
  const [observedAt, setObservedAt] = useState(() => Date.now())

  const reload = () => {
    setObservedAt(Date.now())
    setRevision(value => value + 1)
  }

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setSummaryError('')
    setSummary(null)
    services.task.getProjectTimeline(project.id, controller.signal).then(next => {
      if (!controller.signal.aborted) {
        setTimeline(next)
        setObservedAt(Date.now())
      }
    }).catch(reason => {
      if (!controller.signal.aborted) setError(executionError(reason, 'tải lịch thực hiện'))
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    services.task.getProjectProgressSummary(project.id, controller.signal).then(next => {
      if (!controller.signal.aborted) setSummary(next)
    }).catch(reason => {
      if (!controller.signal.aborted) setSummaryError(executionError(reason, 'tải tiến độ đồ án'))
    })
    return () => controller.abort()
  }, [project.id, revision])

  const assignees = useMemo(() => {
    const map = new Map<number, string>()
    for (const ms of timeline?.milestones ?? []) {
      for (const task of ms.tasks) {
        for (const person of task.assignees) {
          map.set(person.userId, person.fullName)
        }
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'vi-VN'))
  }, [timeline])

  const hasTaskLevelFilter = Boolean(search.trim() || statusFilter || assigneeFilter || quickFilter !== 'all')

  const milestones = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const base = timeline?.milestones
      .filter(item => !selected || item.id === Number(selected))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id) ?? []

    if (!hasTaskLevelFilter) return base

    return base
      .map((milestone) => {
        const milestoneMatchesSearch = needle ? milestone.title.toLowerCase().includes(needle) : false
        const matchingTasks = milestone.tasks.filter((task) => {
          if (statusFilter && task.status !== statusFilter) return false
          if (assigneeFilter && !task.assignees.some(a => String(a.userId) === assigneeFilter)) return false
          if (quickFilter === 'done' && task.status !== 'DONE') return false
          if (quickFilter === 'blocked' && task.status !== 'BLOCKED') return false
          if (quickFilter === 'overdue' && !isOverdue(task, observedAt)) return false
          if (needle && !milestoneMatchesSearch && !task.title.toLowerCase().includes(needle)) return false
          return true
        })
        if (matchingTasks.length > 0) return { ...milestone, tasks: matchingTasks }
        if (milestoneMatchesSearch && !statusFilter && !assigneeFilter && quickFilter === 'all') return milestone
        return null
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  }, [timeline, selected, hasTaskLevelFilter, search, statusFilter, assigneeFilter, quickFilter, observedAt])

  const range = scheduleRange(milestones)
  const ticks = range ? scheduleTicks(range, scale) : []
  const today = todayVietnamDay()
  const todayPosition = range && today >= range.start && today <= range.end ? (today - range.start) / range.days * 100 : null
  const width = range ? Math.min(5000, Math.max(980, (scale === 'week' ? range.days / 7 * 72 : range.days / 30 * 180) + 240)) : 980
  const axisTicks = ticks.map((tick, index) => ({
    ...tick,
    label: ((ticks[index + 1]?.left ?? 100) - tick.left) / 100 * (width - 240) >= (scale === 'week' ? 42 : 94) ? tick.label : '',
  }))

  function toggle(id: number) {
    setExpanded(items => items.includes(id) ? items.filter(value => value !== id) : [...items, id])
  }

  function toggleQuickFilter(next: QuickAttentionFilter) {
    setQuickFilter(current => {
      const resolved = current === next ? 'all' : next
      if (resolved !== 'all') setShowTasks(true)
      return resolved
    })
  }

  const clearAllFilters = () => {
    setSelected('')
    setSearch('')
    setStatusFilter('')
    setAssigneeFilter('')
    setQuickFilter('all')
  }

  const hasAnyFilter = Boolean(selected || hasTaskLevelFilter)
  const effectiveShowTasks = showTasks || hasTaskLevelFilter

  return (
    <ExecutionPage
      title="Lịch thực hiện"
      eyebrow={project.code}
      description="Xem thời gian của các mốc và công việc để sắp xếp kế hoạch của nhóm."
      action={
        <>
          <Link className="ex-button" to={`${routeBase}/milestones`}><ExIcon name="flag" />Quản lý mốc</Link>
          <button className="ex-button" disabled={loading} onClick={reload}><ExIcon name="refresh" />Cập nhật</button>
        </>
      }
    >
      {summary && (
        <dl className="schedule-summary">
          <div className={quickFilter === 'all' ? 'is-active-filter' : ''}>
            <button type="button" className="schedule-kpi-btn" onClick={() => setQuickFilter('all')}>
              <dt>Tiến độ chung</dt>
              <dd>{new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(summary.progressPercentage)}%</dd>
            </button>
          </div>
          <div className={quickFilter === 'done' ? 'is-active-filter' : ''}>
            <button type="button" className="schedule-kpi-btn" onClick={() => toggleQuickFilter('done')}>
              <dt>Việc hoàn thành</dt>
              <dd>{summary.doneTasks}/{summary.totalTasks}</dd>
            </button>
          </div>
          <div className={`${summary.overdueTasks ? 'is-alert' : ''} ${quickFilter === 'overdue' ? 'is-active-filter' : ''}`.trim()}>
            <button type="button" className="schedule-kpi-btn" onClick={() => toggleQuickFilter('overdue')}>
              <dt>Quá hạn</dt>
              <dd>{summary.overdueTasks}</dd>
            </button>
          </div>
          <div className={`${summary.blockedTasks ? 'is-warning' : ''} ${quickFilter === 'blocked' ? 'is-active-filter' : ''}`.trim()}>
            <button type="button" className="schedule-kpi-btn" onClick={() => toggleQuickFilter('blocked')}>
              <dt>Vướng mắc</dt>
              <dd>{summary.blockedTasks}</dd>
            </button>
          </div>
        </dl>
      )}
      {summaryError && <ExState message={summaryError} retry={reload} />}

      <section className="ex-panel" aria-label="Biểu đồ lịch thực hiện">
        <div className="ex-toolbar">
          <div className="ex-tabs" role="group" aria-label="Mức chi tiết">
            <button aria-pressed={!showTasks} onClick={() => setShowTasks(false)}>Các mốc</button>
            <button aria-pressed={showTasks} onClick={() => setShowTasks(true)}>Cả công việc</button>
          </div>
          <div className="ex-tabs" role="group" aria-label="Đơn vị thời gian">
            <button aria-pressed={scale === 'month'} onClick={() => setScale('month')}>Theo tháng</button>
            <button aria-pressed={scale === 'week'} onClick={() => setScale('week')}>Theo tuần</button>
          </div>
        </div>

        <FilterToolbar
          embedded
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm mốc hoặc công việc trên lịch…"
          controls={
            <>
              <select aria-label="Mốc đồ án" value={selected} onChange={event => setSelected(event.target.value)}>
                <option value="">Tất cả các mốc</option>
                {timeline?.milestones.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
              <select aria-label="Trạng thái công việc" value={statusFilter} onChange={event => { setStatusFilter(event.target.value); if (event.target.value) setShowTasks(true) }}>
                <option value="">Mọi trạng thái việc</option>
                <option value="TODO">Chưa bắt đầu</option>
                <option value="IN_PROGRESS">Đang làm</option>
                <option value="IN_REVIEW">Chờ kiểm tra</option>
                <option value="BLOCKED">Đang vướng mắc</option>
                <option value="DONE">Hoàn thành</option>
              </select>
              {assignees.length > 0 && (
                <select aria-label="Người phụ trách" value={assigneeFilter} onChange={event => { setAssigneeFilter(event.target.value); if (event.target.value) setShowTasks(true) }}>
                  <option value="">Tất cả thành viên</option>
                  {assignees.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              )}
            </>
          }
          hasActiveFilters={hasAnyFilter}
          onClearAll={clearAllFilters}
          resultSummary={range ? `${dayLabel(range.start, true)} – ${dayLabel(range.end, true)}` : 'Chưa có thời gian dự kiến'}
        />

        {loading ? (
          <ExState loading />
        ) : error ? (
          <ExState message={error} retry={reload} />
        ) : !milestones.length ? (
          hasAnyFilter ? (
            <ExState
              title="Không có mốc hoặc công việc khớp bộ lọc"
              message="Thử xóa bộ lọc để xem toàn bộ lịch thực hiện của nhóm."
              action={<button type="button" className="ex-button" onClick={clearAllFilters}>Xóa bộ lọc</button>}
            />
          ) : (
            <ExState
              title="Chưa có lịch thực hiện"
              message="Tạo mốc đồ án và đặt thời gian để bắt đầu lên kế hoạch."
              action={<Link className="ex-button" to={`${routeBase}/milestones`}>Xem các mốc đồ án</Link>}
            />
          )
        ) : range ? (
          <>
            {width > 1100 && <p className="schedule-scroll-hint">Cuộn ngang để xem toàn bộ khoảng thời gian.</p>}
            <div className="schedule-scroll" tabIndex={0} aria-label="Lịch theo thời gian, có thể cuộn ngang">
              <div className="schedule-table" style={{ '--schedule-width': `${width}px` } as CSSProperties}>
                <div className="schedule-axis">
                  <span className="schedule-label">Mốc / công việc</span>
                  <div className="schedule-track">
                    {axisTicks.map(tick => <span className="schedule-tick" key={tick.day} style={{ left: `${tick.left}%` }}>{tick.label}</span>)}
                  </div>
                </div>
                {milestones.map(milestone => (
                  <div key={milestone.id}>
                    <div className="schedule-row schedule-milestone">
                      <div className="schedule-label">
                        <button
                          className="schedule-expand"
                          onClick={() => toggle(milestone.id)}
                          aria-label={`${effectiveShowTasks || expanded.includes(milestone.id) ? 'Thu gọn' : 'Mở công việc của'} ${milestone.title}`}
                          aria-expanded={effectiveShowTasks || expanded.includes(milestone.id)}
                          disabled={effectiveShowTasks || !milestone.tasks.length}
                        >
                          <ExIcon name={effectiveShowTasks || expanded.includes(milestone.id) ? 'expand_more' : 'chevron_right'} />
                        </button>
                        <Link to={`${routeBase}/milestones/${milestone.id}`} title={milestone.title}>{milestone.title}</Link>
                        <small>{milestoneScheduleSubtitle(milestone.status, milestone.progressPercentage, milestone.tasks.length)}</small>
                      </div>
                      <ScheduleTrack
                        start={milestone.startDate}
                        end={milestone.dueDate}
                        progress={milestone.progressPercentage}
                        status={milestone.status}
                        range={range}
                        ticks={ticks}
                        today={todayPosition}
                        label={milestone.title}
                      />
                    </div>
                    {(effectiveShowTasks || expanded.includes(milestone.id)) && milestone.tasks.map(task => (
                      <div className="schedule-row schedule-task" key={task.id}>
                        <div className="schedule-label">
                          <Link to={`${routeBase}/tasks/${task.id}`} title={task.title}>{task.title}</Link>
                          <small>
                            {taskStatusLabel(task.status)}
                            {isOverdue(task, observedAt) ? ' · Quá hạn' : ''}
                          </small>
                        </div>
                        <ScheduleTrack
                          start={task.startAt}
                          end={task.dueAt}
                          progress={task.status === 'DONE' ? 100 : null}
                          status={task.status}
                          overdue={isOverdue(task, observedAt)}
                          range={range}
                          ticks={ticks}
                          today={todayPosition}
                          label={task.title}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="schedule-legend">
              <span><i />Thời gian dự kiến</span>
              <span><i className="is-progress" />Hoàn thành</span>
              <span><i className="is-in-progress" />Đang làm / Kiểm tra</span>
              <span><i className="is-overdue" />Quá hạn</span>
              <span><i className="is-today" />Hôm nay (VN)</span>
              <small>Công việc có một ngày được hiển thị bằng dấu mốc; ngày còn thiếu không được tự ước tính.</small>
            </div>
          </>
        ) : (
          <div className="ex-padding">
            <p className="ex-muted mb-4">Các mốc chưa có ngày dự kiến. Đặt ngày bắt đầu hoặc hạn hoàn thành để hiển thị trên biểu đồ.</p>
            {milestones.map(item => (
              <div key={item.id}>
                <div className="ex-panel-heading">
                  <Link className="ex-link" to={`${routeBase}/milestones/${item.id}`}>{item.title}</Link>
                  <button className="ex-text-button" onClick={() => toggle(item.id)} aria-expanded={effectiveShowTasks || expanded.includes(item.id)} disabled={effectiveShowTasks || !item.tasks.length}>Xem công việc</button>
                </div>
                {(effectiveShowTasks || expanded.includes(item.id)) && (
                  <ul className="ex-dependencies">
                    {item.tasks.map(task => (
                      <li key={task.id}>
                        <Link className="ex-link" to={`${routeBase}/tasks/${task.id}`}>{task.title}</Link>
                        <span className="ex-muted">{taskStatusLabel(task.status)} · Chưa có ngày</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </ExecutionPage>
  )
}

function ScheduleTrack({ start, end, progress, status, overdue = false, range, ticks, today, label }: {
  start?: string | null
  end?: string | null
  progress: number | null
  status: string
  overdue?: boolean
  range: NonNullable<ReturnType<typeof scheduleRange>>
  ticks: ReturnType<typeof scheduleTicks>
  today: number | null
  label: string
}) {
  const interval = scheduleInterval(start, end, range)
  const barToneClass = overdue
    ? 'is-overdue'
    : status === 'BLOCKED'
      ? 'is-blocked'
      : status === 'CANCELLED'
        ? 'is-cancelled'
        : status === 'IN_PROGRESS' || status === 'IN_REVIEW'
          ? 'is-in-progress'
          : ''

  return (
    <div className="schedule-track">
      {ticks.map(tick => <span className="schedule-gridline" key={tick.day} style={{ left: `${tick.left}%` }} />)}
      {today !== null && <span className="schedule-today" style={{ left: `${today}%` }} />}
      {interval.state === 'dated' ? (
        <span
          className={`schedule-bar ${interval.point ? 'is-point' : ''} ${barToneClass}`.trim()}
          style={{ left: `${interval.left}%`, width: `${interval.width}%` }}
          role="img"
          aria-label={`${label}: ${interval.label}${progress === null ? '' : `, ${Math.round(progress)}% hoàn thành`}`}
          title={`${interval.label}${progress === null ? '' : ` · ${Math.round(progress)}% hoàn thành`}`}
        >
          {progress !== null && !interval.point && (
            <span className="schedule-bar-fill" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
          )}
          {!interval.point && progress !== null && interval.width >= 4 && (
            <span className={`schedule-bar-value ${progress >= 50 ? 'is-on-fill' : ''}`}>{Math.round(progress)}%</span>
          )}
        </span>
      ) : (
        <span className="schedule-undated">{interval.state === 'invalid' ? 'Khoảng ngày chưa hợp lệ' : 'Chưa có thời gian dự kiến'}</span>
      )}
    </div>
  )
}

export default GanttPage
