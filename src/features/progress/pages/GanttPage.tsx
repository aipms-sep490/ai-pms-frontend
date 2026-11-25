import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { FilterToolbar } from '../../../components/ui/FilterToolbar'
import { Modal } from '../../../components/ui/Modal'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { canUseProjectExecutionAction } from '../../execution/execution-authority'
import { ExecutionPage, ExIcon, ExState } from '../../execution/execution-ui'
import { executionError, milestoneLabels } from '../../execution/execution-utils'
import { services } from '../../../services/service-gateway'
import type { ProjectProgressSummaryDto, ProjectTimelineDataDto, TimelineMilestoneDto, TimelineTaskDto } from '../../../types/backend'
import { isOverdue, taskStatusLabel } from '../../projects/utils/collaboration-workspace'
import { WorkspaceTaskForm } from '../../projects/components/WorkspaceTaskForm'
import { TaskDetailModal } from '../../tasks/components/TaskDetailModal'
import { MilestoneScheduleDrawer } from '../components/MilestoneScheduleDrawer'
import { calendarDay, dayLabel, scheduleInterval, scheduleRange, scheduleTicks, weekendSpans, type ScheduleScale } from '../utils/schedule'
import './gantt-workbench.css'

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

function milestoneScheduleSubtitle(milestone: TimelineMilestoneDto, observedAt: number): { text: string; overdue: boolean } {
  const total = milestone.tasks.length
  const done = milestone.tasks.filter(t => t.status === 'DONE').length
  const late = milestone.tasks.filter(t => isOverdue(t, observedAt)).length
  if (late > 0) {
    return { text: `${late} việc quá hạn · ${done}/${total} xong`, overdue: true }
  }
  if (total > 0 && Math.round(milestone.progressPercentage) >= 100 && milestone.status !== 'COMPLETED' && milestone.status !== 'CANCELLED') {
    return { text: 'Đã xong 100% việc · Chưa chốt mốc', overdue: false }
  }
  if (milestone.status === 'PLANNED' && done > 0) {
    return { text: `Đang triển khai · ${done}/${total} xong`, overdue: false }
  }
  return { text: milestoneLabels[milestone.status] ?? 'Chưa xác định', overdue: false }
}

function compactRangeLabel(startDay: number, endDay: number): string {
  const startFull = dayLabel(startDay, true)
  const endFull = dayLabel(endDay, true)
  if (startFull.slice(-4) === endFull.slice(-4)) {
    return `${dayLabel(startDay, false)} – ${endFull}`
  }
  return `${startFull} – ${endFull}`
}

function taskIconName(status: string, overdue: boolean): string {
  if (status === 'DONE') return 'check_circle'
  if (overdue) return 'error'
  if (status === 'BLOCKED') return 'pause_circle'
  if (status === 'IN_PROGRESS' || status === 'IN_REVIEW') return 'pending'
  return 'radio_button_unchecked'
}

function taskToneClass(status: string, overdue: boolean): string {
  if (status === 'DONE') return 'is-done'
  if (overdue) return 'is-overdue'
  if (status === 'BLOCKED') return 'is-blocked'
  if (status === 'CANCELLED') return 'is-cancelled'
  if (status === 'IN_PROGRESS' || status === 'IN_REVIEW') return 'is-in-progress'
  return 'is-todo'
}

export function GanttPage() {
  const access = useExecutionAccess()
  const { project, team, routeBase, canManageStructure } = access
  const canCreateTask = canUseProjectExecutionAction(access, 'create_task')
  const [timeline, setTimeline] = useState<ProjectTimelineDataDto | null>(null)
  const [summary, setSummary] = useState<ProjectProgressSummaryDto | null>(null)
  const [error, setError] = useState('')
  const [summaryError, setSummaryError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const [scale, setScale] = useState<ScheduleScale>('month')
  const [showTasks, setShowTasks] = useState(false)
  const [selected, setSelected] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [quickFilter, setQuickFilter] = useState<QuickAttentionFilter>('all')
  const [expanded, setExpanded] = useState<number[]>([])
  const [observedAt, setObservedAt] = useState(() => Date.now())
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null)
  const [activeMilestoneId, setActiveMilestoneId] = useState<number | null>(null)
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [createMilestoneHint, setCreateMilestoneHint] = useState<string | undefined>(undefined)
  const scrollRef = useRef<HTMLDivElement>(null)

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

  const editableMilestones = useMemo(
    () => (timeline?.milestones ?? []).filter(ms => ms.status !== 'COMPLETED' && ms.status !== 'CANCELLED'),
    [timeline],
  )

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

  const activeMilestone = useMemo(
    () => (activeMilestoneId != null ? (timeline?.milestones ?? []).find(m => m.id === activeMilestoneId) ?? null : null),
    [activeMilestoneId, timeline],
  )

  const range = scheduleRange(milestones)
  const ticks = range ? scheduleTicks(range, scale) : []
  const weekends = range && scale !== 'month' ? weekendSpans(range) : []
  const today = todayVietnamDay()
  const todayPosition = range && today >= range.start && today <= range.end ? (today - range.start) / range.days * 100 : null
  const labelColWidth = 288
  const width = range
    ? Math.min(
        5600,
        Math.max(
          980,
          (scale === 'day'
            ? range.days * 40
            : scale === 'week'
              ? (range.days / 7) * 112
              : (range.days / 30) * 220) + labelColWidth,
        ),
      )
    : 980
  const trackPx = Math.max(600, width - labelColWidth)
  const axisTicks = ticks.map((tick, index) => {
    const nextLeft = ticks[index + 1]?.left ?? 100
    const pxGap = ((nextLeft - tick.left) / 100) * trackPx
    const minPx = scale === 'day' ? 28 : scale === 'week' ? 46 : 94
    return {
      ...tick,
      label: pxGap >= minPx ? tick.label : '',
    }
  })

  function toggle(id: number) {
    setExpanded(items => items.includes(id) ? items.filter(value => value !== id) : [...items, id])
  }

  function jumpToToday() {
    const container = scrollRef.current
    if (!container || todayPosition === null) return
    const trackWidth = Math.max(0, container.scrollWidth - labelColWidth)
    const todayX = labelColWidth + (todayPosition / 100) * trackWidth
    const targetLeft = Math.max(0, todayX - container.clientWidth * 0.55)
    container.scrollTo?.({ left: targetLeft, behavior: 'smooth' })
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
  const expandableMilestoneIds = milestones.filter(m => m.tasks.length > 0).map(m => m.id)
  const allExpanded = expandableMilestoneIds.length > 0 && expandableMilestoneIds.every(id => expanded.includes(id))

  return (
    <ExecutionPage
      title="Lịch thực hiện"
      eyebrow={project.code}
      description="Theo dõi tiến độ theo dòng thời gian, bấm vào từng mốc hoặc công việc để cập nhật trạng thái và điều chỉnh hạn."
      action={
        <>
          <button type="button" className="ex-button ex-button-icon" aria-label="Làm mới" title="Làm mới" disabled={loading} onClick={reload}><ExIcon name="refresh" /></button>
          <Link className="ex-button" to={`${routeBase}/milestones`}><ExIcon name="flag" />Quản lý mốc</Link>
          {canCreateTask && editableMilestones.length > 0 && (
            <button
              type="button"
              className="ex-button ex-button-primary"
              onClick={() => { setCreateMilestoneHint(undefined); setCreateTaskOpen(true) }}
            >
              <ExIcon name="add" />Tạo công việc
            </button>
          )}
        </>
      }
    >
      {summary && (
        <div className="mb-5">
          <StatTileRow
            tiles={[
              {
                icon: 'donut_large',
                label: 'Tiến độ chung',
                value: `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(summary.progressPercentage)}%`,
                caption: 'Nhấn để hiển thị toàn bộ lịch',
                hero: true,
                active: quickFilter === 'all',
                onClick: () => setQuickFilter('all'),
              },
              {
                icon: 'task_alt',
                label: 'Việc hoàn thành',
                value: `${summary.doneTasks}/${summary.totalTasks}`,
                caption: 'Nhấn để lọc việc đã hoàn thành',
                tone: 'success',
                active: quickFilter === 'done',
                onClick: () => toggleQuickFilter('done'),
              },
              {
                icon: 'schedule',
                label: 'Quá hạn',
                value: summary.overdueTasks,
                caption: 'Nhấn để lọc việc quá hạn',
                tone: summary.overdueTasks > 0 ? 'danger' : 'neutral',
                active: quickFilter === 'overdue',
                onClick: () => toggleQuickFilter('overdue'),
              },
              {
                icon: 'pause_circle',
                label: 'Vướng mắc',
                value: summary.blockedTasks,
                caption: 'Nhấn để lọc việc bị chặn',
                tone: summary.blockedTasks > 0 ? 'warning' : 'neutral',
                active: quickFilter === 'blocked',
                onClick: () => toggleQuickFilter('blocked'),
              },
            ]}
          />
        </div>
      )}
      {summaryError && <ExState message={summaryError} retry={reload} />}

      <section className="ex-panel" aria-label="Biểu đồ lịch thực hiện">
        <div className="gantt-toolbar">
          <div className="gantt-toolbar__left">
            <div className="ex-tabs" role="group" aria-label="Mức chi tiết">
              <button type="button" aria-pressed={!showTasks} onClick={() => setShowTasks(false)}>Các mốc</button>
              <button type="button" aria-pressed={showTasks} onClick={() => setShowTasks(true)}>Cả công việc</button>
            </div>
            {!effectiveShowTasks && expandableMilestoneIds.length > 0 && (
              <button
                type="button"
                className="gantt-tool-btn"
                onClick={() => setExpanded(allExpanded ? [] : expandableMilestoneIds)}
              >
                <ExIcon name={allExpanded ? 'unfold_less' : 'unfold_more'} />
                <span>{allExpanded ? 'Thu gọn' : 'Mở rộng tất cả'}</span>
              </button>
            )}
            {todayPosition !== null && (
              <button type="button" className="gantt-tool-btn" onClick={jumpToToday} title="Cuộn tới mốc Hôm nay">
                <ExIcon name="today" />
                <span>Hôm nay</span>
              </button>
            )}
          </div>

          <div className="gantt-toolbar__right">
            <span className="gantt-range-pill">
              <ExIcon name="date_range" />
              {range ? compactRangeLabel(range.start, range.end) : 'Chưa có thời gian dự kiến'}
            </span>
            <div className="ex-tabs" role="group" aria-label="Đơn vị thời gian">
              <button type="button" aria-pressed={scale === 'day'} onClick={() => setScale('day')}>Theo ngày</button>
              <button type="button" aria-pressed={scale === 'week'} onClick={() => setScale('week')}>Theo tuần</button>
              <button type="button" aria-pressed={scale === 'month'} onClick={() => setScale('month')}>Theo tháng</button>
            </div>
          </div>
        </div>

        <FilterToolbar
          embedded
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm mốc hoặc công việc…"
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
            <div ref={scrollRef} className="gantt-scroll" tabIndex={0} aria-label="Lịch theo thời gian, có thể cuộn ngang">
              <div className="gantt-table" style={{ '--schedule-width': `${width}px` } as CSSProperties}>
                <div className="gantt-axis">
                  <span className="gantt-label">
                    <span>Mốc / công việc</span>
                    <span className="font-mono text-xs font-medium text-ink-muted">{milestones.length} mốc</span>
                  </span>
                  <div className="gantt-track">
                    {axisTicks.map(tick => (
                      <span className={`gantt-tick ${tick.isWeekend ? 'is-weekend' : ''}`} key={tick.day} style={{ left: `${tick.left}%` }}>
                        <span>{tick.label}</span>
                        {tick.subLabel && tick.label && <span className="gantt-tick-sub">{tick.subLabel}</span>}
                      </span>
                    ))}
                    {todayPosition !== null && (
                      <span className="gantt-today-badge" style={{ left: `${todayPosition}%` }}>Hôm nay</span>
                    )}
                  </div>
                </div>

                {milestones.map(milestone => {
                  const sub = milestoneScheduleSubtitle(milestone, observedAt)
                  const doneCount = milestone.tasks.filter(t => t.status === 'DONE').length
                  const isOpen = effectiveShowTasks || expanded.includes(milestone.id)
                  const allDone = milestone.tasks.length > 0 && doneCount === milestone.tasks.length
                  return (
                    <div key={milestone.id}>
                      <div className="gantt-row gantt-row--milestone">
                        <div className="gantt-label">
                          <button
                            type="button"
                            className="gantt-expand"
                            onClick={() => toggle(milestone.id)}
                            aria-label={`${isOpen ? 'Thu gọn' : 'Mở công việc của'} ${milestone.title}`}
                            aria-expanded={isOpen}
                            disabled={effectiveShowTasks || !milestone.tasks.length}
                          >
                            <ExIcon name={isOpen ? 'expand_more' : 'chevron_right'} />
                          </button>
                          <div className="gantt-label-head">
                            <Link
                              className="gantt-label-link"
                              to={`${routeBase}/milestones/${milestone.id}`}
                              title={milestone.title}
                            >
                              {milestone.title}
                            </Link>
                            {milestone.tasks.length > 0 && (
                              <span className={`gantt-ms-count ${allDone ? 'is-done' : ''}`}>
                                {doneCount}/{milestone.tasks.length}
                              </span>
                            )}
                          </div>
                          <span className={`gantt-label-sub ${sub.overdue ? 'is-overdue' : ''}`}>{sub.text}</span>
                        </div>
                        <MilestoneTrack
                          milestone={milestone}
                          range={range}
                          ticks={ticks}
                          weekends={weekends}
                          today={todayPosition}
                          hasOverdue={sub.overdue}
                          onInspect={() => setActiveMilestoneId(milestone.id)}
                        />
                      </div>

                      {isOpen && milestone.tasks.map(task => {
                        const late = isOverdue(task, observedAt)
                        const dueDay = calendarDay(task.dueAt)
                        const overdueDays = late && dueDay !== null ? Math.max(1, today - dueDay) : 0
                        const tone = taskToneClass(task.status, late)
                        const depCount = task.dependencies?.length ?? 0
                        return (
                          <div className="gantt-row gantt-row--task" key={task.id}>
                            <div className="gantt-label">
                              <span className={`material-symbols-outlined gantt-task-icon ${tone}`} aria-hidden="true">
                                {taskIconName(task.status, late)}
                              </span>
                              <div className="gantt-task-label-copy">
                                <Link
                                  className="gantt-label-link"
                                  to={`${routeBase}/tasks/${task.id}`}
                                  title={task.title}
                                  onClick={(event) => {
                                    if (event.metaKey || event.ctrlKey || event.shiftKey) return
                                    event.preventDefault()
                                    setActiveTaskId(task.id)
                                  }}
                                >
                                  {task.title}
                                </Link>
                                <span className={`gantt-label-sub ${late ? 'is-overdue' : ''}`}>
                                  {taskStatusLabel(task.status)}
                                  {late ? ` · Quá hạn ${overdueDays} ngày` : ''}
                                  {depCount > 0 ? ` · Phụ thuộc ${depCount}` : ''}
                                </span>
                              </div>
                              {task.assignees[0] && (
                                <span className="gantt-task-avatar">
                                  <Avatar name={task.assignees[0].fullName} title={task.assignees.map(a => a.fullName).join(', ')} size="xs" shape="circle" />
                                </span>
                              )}
                            </div>
                            <TaskTrack
                              task={task}
                              overdue={late}
                              overdueDays={overdueDays}
                              range={range}
                              ticks={ticks}
                              weekends={weekends}
                              today={todayPosition}
                              onInspect={() => setActiveTaskId(task.id)}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="gantt-legend">
              <span className="gantt-legend-item"><i className="gantt-legend-swatch gantt-legend-swatch--done" />Hoàn thành</span>
              <span className="gantt-legend-item"><i className="gantt-legend-swatch" />Đang triển khai (mốc)</span>
              <span className="gantt-legend-item"><i className="gantt-legend-swatch gantt-legend-swatch--progress" />Đang làm / Kiểm tra</span>
              <span className="gantt-legend-item"><i className="gantt-legend-swatch gantt-legend-swatch--blocked" />Bị chặn</span>
              <span className="gantt-legend-item"><i className="gantt-legend-swatch gantt-legend-swatch--overdue" />Quá hạn</span>
              <span className="gantt-legend-item"><i className="gantt-legend-swatch gantt-legend-swatch--today" />Hôm nay (VN)</span>
              <span className="gantt-legend-hint">Nhấn vào thanh mốc hoặc dấu hạn công việc để xem chi tiết &amp; điều chỉnh nhanh.</span>
            </div>
          </>
        ) : (
          <div className="ex-padding">
            <p className="ex-muted mb-4">Các mốc chưa có ngày dự kiến. Đặt ngày bắt đầu hoặc hạn hoàn thành để hiển thị trên biểu đồ.</p>
            {milestones.map(item => (
              <div key={item.id}>
                <div className="ex-panel-heading">
                  <Link className="ex-link" to={`${routeBase}/milestones/${item.id}`}>{item.title}</Link>
                  <button type="button" className="ex-text-button" onClick={() => toggle(item.id)} aria-expanded={effectiveShowTasks || expanded.includes(item.id)} disabled={effectiveShowTasks || !item.tasks.length}>Xem công việc</button>
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

      {activeMilestone && (
        <MilestoneScheduleDrawer
          milestone={activeMilestone}
          routeBase={routeBase}
          canEdit={canManageStructure}
          canCreateTask={canCreateTask}
          observedAt={observedAt}
          onClose={() => setActiveMilestoneId(null)}
          onUpdated={reload}
          onOpenTask={(taskId) => {
            setActiveMilestoneId(null)
            setActiveTaskId(taskId)
          }}
          onCreateTaskInMilestone={(milestoneTitle) => {
            setActiveMilestoneId(null)
            setCreateMilestoneHint(milestoneTitle)
            setCreateTaskOpen(true)
          }}
        />
      )}

      {activeTaskId !== null && (
        <TaskDetailModal
          key={`${project.id}:${activeTaskId}`}
          taskId={activeTaskId}
          onClose={() => setActiveTaskId(null)}
          onTaskUpdated={reload}
        />
      )}

      {createTaskOpen && canCreateTask && (
        <Modal
          open
          drawer
          title="Tạo công việc mới"
          description="Thêm công việc mới vào mốc để cập nhật trực tiếp trên lịch thực hiện."
          onClose={() => setCreateTaskOpen(false)}
        >
          <WorkspaceTaskForm
            project={project}
            milestones={editableMilestones}
            members={team?.members ?? []}
            initialDraft={createMilestoneHint ? { title: '', description: '', task: { milestoneTitle: createMilestoneHint } } : undefined}
            onCancel={() => setCreateTaskOpen(false)}
            onCreated={() => {
              setCreateTaskOpen(false)
              setShowTasks(true)
              reload()
            }}
          />
        </Modal>
      )}
    </ExecutionPage>
  )
}

function MilestoneTrack({
  milestone,
  range,
  ticks,
  weekends,
  today,
  hasOverdue,
  onInspect,
}: {
  milestone: TimelineMilestoneDto
  range: NonNullable<ReturnType<typeof scheduleRange>>
  ticks: ReturnType<typeof scheduleTicks>
  weekends: ReturnType<typeof weekendSpans>
  today: number | null
  hasOverdue: boolean
  onInspect: () => void
}) {
  const interval = scheduleInterval(milestone.startDate, milestone.dueDate, range)
  const pct = Math.max(0, Math.min(100, Math.round(milestone.progressPercentage)))
  const doneCount = milestone.tasks.filter(t => t.status === 'DONE').length
  const toneClass = milestone.status === 'COMPLETED' || (milestone.tasks.length > 0 && pct >= 100)
    ? 'is-done'
    : milestone.status === 'CANCELLED'
      ? 'is-cancelled'
      : hasOverdue
        ? 'is-overdue'
        : ''
  const ariaLabel = `${milestone.title}: ${interval.state === 'dated' ? interval.label : 'Chưa có thời gian dự kiến'}, ${pct}% hoàn thành`

  return (
    <div className="gantt-track">
      {weekends.map(span => <span className="gantt-weekend" key={span.day} style={{ left: `${span.left}%`, width: `${span.width}%` }} />)}
      {ticks.map(tick => <span className="gantt-gridline" key={tick.day} style={{ left: `${tick.left}%` }} />)}
      {today !== null && <span className="gantt-today" style={{ left: `${today}%` }} />}
      {interval.state === 'dated' ? (
        <button
          type="button"
          className={`gantt-bar-btn ${toneClass}`.trim()}
          style={{ left: `${interval.left}%`, width: `${interval.width}%` }}
          onClick={onInspect}
          title={`${milestone.title} · ${interval.label} · ${pct}% (${doneCount}/${milestone.tasks.length} việc) — Nhấn để xem & điều chỉnh`}
        >
          <span role="img" aria-label={ariaLabel} className="block h-full w-full">
            <span className="gantt-bar-fill" style={{ width: `${pct}%` }} />
            {interval.width >= 5 && (
              <span className={`gantt-bar-value ${pct >= 52 ? 'is-on-fill' : ''}`}>
                {pct}%{milestone.tasks.length > 0 && interval.width >= 14 ? ` · ${doneCount}/${milestone.tasks.length}` : ''}
              </span>
            )}
          </span>
        </button>
      ) : (
        <button type="button" className="gantt-undated" onClick={onInspect}>
          <span className="material-symbols-outlined text-[15px]" aria-hidden="true">edit_calendar</span>
          <span>{interval.state === 'invalid' ? 'Khoảng ngày chưa hợp lệ' : 'Chưa có thời gian · Đặt lịch'}</span>
        </button>
      )}
    </div>
  )
}

function TaskTrack({
  task,
  overdue,
  overdueDays,
  range,
  ticks,
  weekends,
  today,
  onInspect,
}: {
  task: TimelineTaskDto
  overdue: boolean
  overdueDays: number
  range: NonNullable<ReturnType<typeof scheduleRange>>
  ticks: ReturnType<typeof scheduleTicks>
  weekends: ReturnType<typeof weekendSpans>
  today: number | null
  onInspect: () => void
}) {
  const interval = scheduleInterval(task.startAt, task.dueAt, range)
  const tone = taskToneClass(task.status, overdue)
  const shortDay = calendarDay(task.dueAt ?? task.startAt)
  const shortDate = shortDay !== null ? dayLabel(shortDay, false) : ''
  const progress = task.status === 'DONE' ? 100 : null
  const ariaLabel = interval.state === 'dated'
    ? `${task.title}: ${interval.label}${progress === null ? '' : `, ${progress}% hoàn thành`}`
    : `${task.title}: Chưa có thời gian`

  return (
    <div className="gantt-track">
      {weekends.map(span => <span className="gantt-weekend" key={span.day} style={{ left: `${span.left}%`, width: `${span.width}%` }} />)}
      {ticks.map(tick => <span className="gantt-gridline" key={tick.day} style={{ left: `${tick.left}%` }} />)}
      {today !== null && <span className="gantt-today" style={{ left: `${today}%` }} />}
      {interval.state === 'dated' ? (
        interval.point ? (
          <button
            type="button"
            className={`gantt-point-wrap ${interval.left > 72 ? 'is-flipped' : ''}`}
            style={{ left: `${interval.left}%` }}
            onClick={onInspect}
            title={`${task.title} · ${interval.label} · ${taskStatusLabel(task.status)} — Nhấn để mở chi tiết`}
          >
            <span className={`gantt-point-node ${tone}`} role="img" aria-label={ariaLabel} />
            <span className={`gantt-point-pill ${tone}`}>
              <span className="material-symbols-outlined" aria-hidden="true">{taskIconName(task.status, overdue)}</span>
              <strong>{shortDate}</strong>
              <span>
                {task.status === 'DONE'
                  ? 'Xong'
                  : overdue
                    ? `Trễ ${overdueDays}n`
                    : taskStatusLabel(task.status)}
              </span>
            </span>
          </button>
        ) : (
          <button
            type="button"
            className={`gantt-bar-btn gantt-bar-btn--task ${tone}`.trim()}
            style={{ left: `${interval.left}%`, width: `${interval.width}%` }}
            onClick={onInspect}
            title={`${task.title} · ${interval.label} · ${taskStatusLabel(task.status)} — Nhấn để mở chi tiết`}
          >
            <span role="img" aria-label={ariaLabel} className="block h-full w-full">
              {progress !== null && <span className="gantt-bar-fill" style={{ width: `${progress}%` }} />}
              {interval.width >= 6 && (
                <span className={`gantt-bar-value ${progress === 100 ? 'is-on-fill' : ''}`}>
                  {task.status === 'DONE' ? '100%' : shortDate}
                </span>
              )}
            </span>
          </button>
        )
      ) : (
        <button type="button" className="gantt-undated" onClick={onInspect}>
          <span className="material-symbols-outlined text-[15px]" aria-hidden="true">edit_calendar</span>
          <span>{interval.state === 'invalid' ? 'Khoảng ngày chưa hợp lệ' : 'Chưa đặt hạn · Cập nhật'}</span>
        </button>
      )}
    </div>
  )
}

export default GanttPage
