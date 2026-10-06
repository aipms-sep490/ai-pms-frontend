import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { ExecutionPage, ExIcon, ExState } from '../../execution/execution-ui'
import { executionError, milestoneLabels } from '../../execution/execution-utils'
import { services } from '../../../services/service-gateway'
import type { ProjectProgressSummaryDto, ProjectTimelineDataDto } from '../../../types/backend'
import { taskStatusLabel } from '../../projects/utils/collaboration-workspace'
import { calendarDay, dayLabel, scheduleInterval, scheduleRange, scheduleTicks } from '../utils/schedule'

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
  const [expanded, setExpanded] = useState<number[]>([])
  const reload = () => setRevision(value => value + 1)
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setSummaryError(''); setSummary(null)
    services.task.getProjectTimeline(project.id, controller.signal).then(next => { if (!controller.signal.aborted) setTimeline(next) })
      .catch(reason => { if (!controller.signal.aborted) setError(executionError(reason, 'tải lịch thực hiện')) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    services.task.getProjectProgressSummary(project.id, controller.signal).then(next => { if (!controller.signal.aborted) setSummary(next) })
      .catch(reason => { if (!controller.signal.aborted) setSummaryError(executionError(reason, 'tải tiến độ đồ án')) })
    return () => controller.abort()
  }, [project.id, revision])
  const milestones = timeline?.milestones.filter(item => !selected || item.id === Number(selected)).sort((a,b) => a.sortOrder - b.sortOrder || a.id - b.id) ?? []
  const range = scheduleRange(milestones)
  const ticks = range ? scheduleTicks(range,scale) : []
  const today = calendarDay(new Date().toISOString())!
  const todayPosition = range && today >= range.start && today <= range.end ? (today-range.start)/range.days*100 : null
  const width = range ? Math.min(5000, Math.max(980, (scale === 'week' ? range.days / 7 * 72 : range.days / 30 * 180) + 240)) : 980
  const axisTicks = ticks.map((tick,index) => ({ ...tick, label: ((ticks[index+1]?.left ?? 100)-tick.left)/100*(width-240) >= (scale === 'week' ? 42 : 94) ? tick.label : '' }))
  function toggle(id: number) { setExpanded(items => items.includes(id) ? items.filter(value => value !== id) : [...items,id]) }
  return <ExecutionPage title="Lịch thực hiện" eyebrow={project.code} description="Xem thời gian của các mốc và công việc để sắp xếp kế hoạch của nhóm."
    action={<><Link className="ex-button" to={`${routeBase}/milestones`}><ExIcon name="flag" />Quản lý mốc</Link><button className="ex-button" disabled={loading} onClick={reload}><ExIcon name="refresh" />Cập nhật</button></>}>
    {summary && <dl className="schedule-summary"><div><dt>Tiến độ chung</dt><dd>{new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(summary.progressPercentage)}%</dd></div><div><dt>Việc hoàn thành</dt><dd>{summary.doneTasks}/{summary.totalTasks}</dd></div><div className={summary.overdueTasks ? 'is-alert' : ''}><dt>Quá hạn</dt><dd>{summary.overdueTasks}</dd></div><div className={summary.blockedTasks ? 'is-warning' : ''}><dt>Vướng mắc</dt><dd>{summary.blockedTasks}</dd></div></dl>}
    {summaryError && <ExState message={summaryError} retry={reload} />}
    <section className="ex-panel" aria-label="Biểu đồ lịch thực hiện">
      <div className="ex-toolbar"><div className="ex-tabs" role="group" aria-label="Mức chi tiết"><button aria-pressed={!showTasks} onClick={() => setShowTasks(false)}>Các mốc</button><button aria-pressed={showTasks} onClick={() => setShowTasks(true)}>Cả công việc</button></div><div className="ex-tabs" role="group" aria-label="Đơn vị thời gian"><button aria-pressed={scale === 'month'} onClick={() => setScale('month')}>Theo tháng</button><button aria-pressed={scale === 'week'} onClick={() => setScale('week')}>Theo tuần</button></div></div>
      <div className="schedule-range"><label>Mốc đồ án<select value={selected} onChange={event => setSelected(event.target.value)}><option value="">Tất cả các mốc</option>{timeline?.milestones.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><p>{range ? `${dayLabel(range.start,true)} – ${dayLabel(range.end,true)}` : 'Chưa có thời gian dự kiến'}<small>Thời gian trên biểu đồ lấy từ ngày đã đặt cho mốc và công việc.</small></p></div>
      {loading ? <ExState loading /> : error ? <ExState message={error} retry={reload} /> : !milestones.length ? <ExState title="Chưa có lịch thực hiện" message="Tạo mốc đồ án và đặt thời gian để bắt đầu lên kế hoạch." action={<Link className="ex-button" to={`${routeBase}/milestones`}>Xem các mốc đồ án</Link>} />
        : range ? <><p className="schedule-scroll-hint">Cuộn ngang để xem toàn bộ khoảng thời gian.</p><div className="schedule-scroll" tabIndex={0} aria-label="Lịch theo thời gian, có thể cuộn ngang">
          <div className="schedule-table" style={{ '--schedule-width': `${width}px` } as CSSProperties}><div className="schedule-axis"><span className="schedule-label">Mốc / công việc</span><div className="schedule-track">{axisTicks.map(tick => <span className="schedule-tick" key={tick.day} style={{left:`${tick.left}%`}}>{tick.label}</span>)}</div></div>
            {milestones.map(milestone => <div key={milestone.id}><div className="schedule-row schedule-milestone"><div className="schedule-label"><button className="schedule-expand" onClick={() => toggle(milestone.id)} aria-label={`${showTasks || expanded.includes(milestone.id) ? 'Thu gọn' : 'Mở công việc của'} ${milestone.title}`} aria-expanded={showTasks || expanded.includes(milestone.id)} disabled={showTasks || !milestone.tasks.length}><ExIcon name={showTasks || expanded.includes(milestone.id) ? 'expand_more' : 'chevron_right'} /></button><Link to={`${routeBase}/milestones/${milestone.id}`} title={milestone.title}>{milestone.title}</Link><small>{milestoneLabels[milestone.status] ?? 'Chưa xác định'}</small></div><ScheduleTrack start={milestone.startDate} end={milestone.dueDate} progress={milestone.progressPercentage} status={milestone.status} range={range} ticks={ticks} today={todayPosition} label={milestone.title} /></div>
              {(showTasks || expanded.includes(milestone.id)) && milestone.tasks.map(task => <div className="schedule-row schedule-task" key={task.id}><div className="schedule-label"><Link to={`${routeBase}/tasks/${task.id}`} title={task.title}>{task.title}</Link><small>{taskStatusLabel(task.status)}</small></div><ScheduleTrack start={task.startAt} end={task.dueAt} progress={task.status === 'DONE' ? 100 : null} status={task.status} range={range} ticks={ticks} today={todayPosition} label={task.title} /></div>)}
            </div>)}
          </div>
        </div><div className="schedule-legend"><span><i />Thời gian dự kiến</span><span><i className="is-progress" />Phần công việc hoàn thành</span><span><i className="is-today" />Hôm nay</span><small>Công việc có một ngày được hiển thị bằng dấu mốc; ngày còn thiếu không được tự ước tính.</small></div></>
          : <div className="ex-padding"><p className="ex-muted mb-4">Các mốc chưa có ngày dự kiến. Đặt ngày bắt đầu hoặc hạn hoàn thành để hiển thị trên biểu đồ.</p>{milestones.map(item => <div key={item.id}><div className="ex-panel-heading"><Link className="ex-link" to={`${routeBase}/milestones/${item.id}`}>{item.title}</Link><button className="ex-text-button" onClick={() => toggle(item.id)} aria-expanded={showTasks || expanded.includes(item.id)} disabled={showTasks || !item.tasks.length}>Xem công việc</button></div>{(showTasks || expanded.includes(item.id)) && <ul className="ex-dependencies">{item.tasks.map(task => <li key={task.id}><Link className="ex-link" to={`${routeBase}/tasks/${task.id}`}>{task.title}</Link><span className="ex-muted">{taskStatusLabel(task.status)} · Chưa có ngày</span></li>)}</ul>}</div>)}</div>}
    </section>
  </ExecutionPage>
}
function ScheduleTrack({ start, end, progress, status, range, ticks, today, label }: { start?: string | null; end?: string | null; progress: number | null; status: string; range: NonNullable<ReturnType<typeof scheduleRange>>; ticks: ReturnType<typeof scheduleTicks>; today: number | null; label: string }) {
  const interval = scheduleInterval(start,end,range)
  return <div className="schedule-track">{ticks.map(tick => <span className="schedule-gridline" key={tick.day} style={{left:`${tick.left}%`}} />)}{today !== null && <span className="schedule-today" style={{left:`${today}%`}} />}
    {interval.state === 'dated' ? <span className={`schedule-bar ${interval.point ? 'is-point' : ''} ${status === 'BLOCKED' ? 'is-blocked' : ''} ${status === 'CANCELLED' ? 'is-cancelled' : ''}`} style={{left:`${interval.left}%`,width:`${interval.width}%`}} role="img" aria-label={`${label}: ${interval.label}${progress === null ? '' : `, ${Math.round(progress)}% hoàn thành`}`} title={`${interval.label}${progress === null ? '' : ` · ${Math.round(progress)}% hoàn thành`}`}>
      {progress !== null && !interval.point && <span className="schedule-bar-fill" style={{width:`${Math.max(0,Math.min(100,progress))}%`}} />}{!interval.point && progress !== null && <span className={`schedule-bar-value ${progress >= 50 ? 'is-on-fill' : ''}`}>{Math.round(progress)}%</span>}
    </span> : <span className="schedule-undated">{interval.state === 'invalid' ? 'Khoảng ngày chưa hợp lệ' : 'Chưa có thời gian dự kiến'}</span>}
  </div>
}
export default GanttPage
