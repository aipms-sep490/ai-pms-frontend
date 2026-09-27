import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { ProjectDto, SupervisorAssignmentDto, TeamDto } from '../../../types/backend'
import { useCollaborationWorkspace, type Resource } from '../hooks/useCollaborationWorkspace'
import { dateLabel, initials, isOpenTask, isOverdue, summarizeMembers, taskStatusLabel, utcTimestamp } from '../utils/collaboration-workspace'
import { WorkspaceTaskForm } from '../components/WorkspaceTaskForm'
import './collaboration-workspace.css'

export function CollaborationWorkspace({ project, team, supervisor, currentUserId }: {
  project: ProjectDto; team?: TeamDto | null; supervisor?: SupervisorAssignmentDto | null; currentUserId?: number
}) {
  const data = useCollaborationWorkspace(project.id)
  const [selectedMember, setSelectedMember] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(false)
  const createRef = useRef<HTMLButtonElement>(null)
  const closeCreate = () => { setCreating(false); createRef.current?.focus() }
  const now = Date.now()
  const members = team?.members ?? []
  const timeline = data.timeline.state === 'ready' ? data.timeline.data : null
  const tasks = timeline?.milestones.flatMap(milestone => milestone.tasks) ?? []
  const memberRows = summarizeMembers(members, tasks, now)
  const canCreate = members.some(member => member.userId === currentUserId && member.isLeader)
  const editableMilestones = timeline?.milestones.filter(item => !['COMPLETED', 'CANCELLED'].includes(item.status)) ?? []
  const attention = tasks.filter(task => task.status === 'BLOCKED' || isOverdue(task, now))
    .sort((a, b) => Number(b.status === 'BLOCKED') - Number(a.status === 'BLOCKED') || utcTimestamp(a.dueAt) - utcTimestamp(b.dueAt))
  const openTasks = tasks.filter(isOpenTask)
    .filter(task => selectedMember === null || task.assignees.some(person => person.userId === selectedMember))
    .sort((a, b) => utcTimestamp(a.dueAt) - utcTimestamp(b.dueAt) || a.id - b.id)
  const selectedName = members.find(member => member.userId === selectedMember)?.fullName
  const closestMilestone = timeline?.milestones.filter(item => !['COMPLETED', 'CANCELLED'].includes(item.status))
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || a.sortOrder - b.sortOrder)[0]
  const summary = data.summary.state === 'ready' ? data.summary.data : null
  const isLoading = [data.timeline, data.summary, data.feedback, data.deliverables, data.meetings].some(item => item.state === 'loading')
  const progress = summary ? Math.max(0, Math.min(100, summary.progressPercentage)) : null

  return <div className="collaboration-workspace">
    <header className="cw-page-heading">
      <div><p className="cw-eyebrow">{team?.name || project.teamName || 'Nhóm đồ án'} <span> / </span> {project.code}</p>
        <h1>Phối hợp nhóm</h1><p className="cw-page-description">Theo dõi công việc, tháo gỡ vướng mắc và cùng hoàn thành đồ án.</p>
      </div>
      <div className="cw-heading-actions"><button type="button" className="cw-button" onClick={data.reload} disabled={isLoading} aria-label="Cập nhật dữ liệu nhóm">
        <Icon name="refresh" />{isLoading ? 'Đang cập nhật…' : 'Cập nhật'}</button>
        {canCreate && <button ref={createRef} className="cw-button cw-button-primary" type="button" onClick={() => { setCreating(value => !value); setCreated(false) }} aria-expanded={creating}><Icon name="add" />Tạo công việc</button>}
      </div>
    </header>

    <section className="cw-project-line" aria-label="Tiến độ chung">
      <div className="cw-project-title"><Icon name="folder_open" /><div><strong>{project.title}</strong><span>{supervisor?.supervisorName ? `Giảng viên hướng dẫn: ${supervisor.supervisorName}` : 'Chưa có thông tin giảng viên hướng dẫn'}</span></div></div>
      <div className="cw-project-progress">{summary ? <><div><span>{summary.doneTasks}/{summary.totalTasks} việc hoàn thành</span><strong>{new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(progress!)}%</strong></div><Progress value={progress!} label="Tiến độ chung của đồ án" /></>
        : <ResourceState resource={data.summary} retry={data.reload} />}</div>
    </section>

    {created && <p className="cw-success" role="status"><Icon name="check_circle" />Đã tạo công việc.</p>}
    {creating && (data.timeline.state === 'ready' && editableMilestones.length ? <WorkspaceTaskForm milestones={editableMilestones} members={members}
      onCancel={closeCreate} onCreated={() => { closeCreate(); setCreated(true); data.reload() }} />
      : <section className="cw-panel cw-empty"><ResourceState resource={data.timeline} retry={data.reload} />{data.timeline.state === 'ready' && <p>Nhóm cần có một mốc đang thực hiện trước khi tạo công việc. <Link to="/project/milestones" className="cw-text-link">Quản lý mốc đồ án</Link></p>}</section>)}

    {data.timeline.state === 'ready' && attention.length > 0 && <section className="cw-attention" aria-labelledby="attention-heading">
      <Icon name="error_outline" /><div><h2 id="attention-heading">{attention.length} công việc cần nhóm xử lý</h2>
        <p>{attention.filter(task => task.status === 'BLOCKED').length} việc đang vướng mắc · {attention.filter(task => isOverdue(task, now)).length} việc quá hạn</p>
        <div className="cw-attention-links">{attention.slice(0, 2).map(task => <Link key={task.id} to={`/project/tasks/${task.id}`}><span>{task.title}</span><Icon name="arrow_outward" /></Link>)}</div>
      </div><Link className="cw-text-link" to="/project/tasks">Xem công việc</Link>
    </section>}

    <div className="cw-columns">
      <div className="cw-main-column">
        <section className="cw-panel" aria-labelledby="member-heading">
          <div className="cw-section-heading"><div><h2 id="member-heading">Tiến độ từng thành viên <span className="cw-count">{members.length}</span></h2><p>Chọn một người để xem công việc họ đang phụ trách.</p></div><Link className="cw-text-link" to="/team">Xem nhóm<Icon name="arrow_outward" /></Link></div>
          <ResourceState resource={data.timeline} retry={data.reload} />
          {data.timeline.state === 'ready' && (memberRows.length ? <>
            <div className="cw-member-table-heading" aria-hidden="true"><span>Thành viên / công việc đang làm</span><span>Đã hoàn thành</span><span>Cần chú ý</span></div>
            <ul className="cw-member-list">{memberRows.map(member => <li key={member.userId}>
              <button type="button" className={`cw-member-row ${selectedMember === member.userId ? 'is-selected' : ''}`} aria-pressed={selectedMember === member.userId}
                onClick={() => setSelectedMember(value => value === member.userId ? null : member.userId)}>
                <span className="cw-member-person"><span className="cw-avatar" aria-hidden="true">{initials(member.fullName)}</span><span className="cw-member-description"><span className="cw-member-name">{member.fullName}{member.isLeader && <span className="cw-leader">Trưởng nhóm</span>}</span><span className="cw-member-task">{member.currentTask?.title || (member.assigned ? 'Đã hoàn tất hoặc hủy các công việc được giao' : 'Chưa được giao công việc')}</span></span></span>
                <span className="cw-member-progress">{member.progress === null ? <span className="cw-muted">Chưa có công việc</span> : <><span><strong>{member.completed}</strong> / {member.assigned} việc</span><Progress value={member.progress} label={`Tiến độ công việc của ${member.fullName}`} /></>}</span>
                <span className="cw-member-attention">{member.blocked ? <span className="cw-status cw-status-warning">{member.blocked} vướng mắc</span> : null}{member.overdue ? <span className="cw-status cw-status-danger">{member.overdue} quá hạn</span> : null}{!member.blocked && !member.overdue && <span className="cw-muted">Không có cảnh báo</span>}</span>
              </button>
            </li>)}</ul>
            <p className="cw-panel-note">Tiến độ = việc hoàn thành / tổng việc được giao, bao gồm việc đã hủy. Việc có nhiều người phụ trách được tính cho từng người.</p>
          </> : <p className="cw-empty">Chưa tải được danh sách thành viên của nhóm. <Link className="cw-text-link" to="/team">Xem thông tin nhóm</Link></p>)}
        </section>

        <section className="cw-panel" aria-labelledby="tasks-heading">
          <div className="cw-section-heading"><div><h2 id="tasks-heading">{selectedName ? `Công việc của ${selectedName}` : 'Công việc sắp tới'}</h2><p>Ưu tiên những việc có hạn hoàn thành gần nhất.</p></div><Link className="cw-text-link" to={`/project/tasks${selectedMember === null ? '' : `?assignee=${selectedMember}`}`}>Xem tất cả<Icon name="arrow_outward" /></Link></div>
          <div className="cw-filters" role="group" aria-label="Phạm vi công việc"><button className={selectedMember === null ? 'is-active' : ''} onClick={() => setSelectedMember(null)}>Cả nhóm</button>
            {currentUserId && members.some(member => member.userId === currentUserId) && <button className={selectedMember === currentUserId ? 'is-active' : ''} onClick={() => setSelectedMember(currentUserId)}>Của tôi</button>}
            {selectedMember !== null && selectedMember !== currentUserId && <span className="cw-selected-name">{selectedName}</span>}
          </div>
          <ResourceState resource={data.timeline} retry={data.reload} />
          {data.timeline.state === 'ready' && (openTasks.length ? <ul className="cw-task-list">{openTasks.slice(0, 4).map(task => <li key={task.id}><Link className="cw-task-row" to={`/project/tasks/${task.id}`}>
            <span className={`cw-task-indicator ${task.status === 'BLOCKED' ? 'is-blocked' : ''}`} aria-hidden="true"><Icon name={task.status === 'BLOCKED' ? 'pause' : 'check_box_outline_blank'} /></span>
            <span className="cw-task-text"><strong>{task.title}</strong><span>{task.assignees.map(person => person.fullName).join(', ') || 'Chưa phân công'} · {taskStatusLabel(task.status)}</span></span>
            <span className={`cw-task-date ${isOverdue(task, now) ? 'is-overdue' : ''}`}>{isOverdue(task, now) && <span>Quá hạn</span>}{dateLabel(task.dueAt)}</span><Icon name="chevron_right" />
          </Link></li>)}</ul> : <div className="cw-empty"><Icon name="check_circle" /><p>{selectedMember === null ? 'Nhóm không có công việc nào đang mở.' : 'Thành viên này không có công việc nào đang mở.'}</p></div>)}
        </section>

        <section className="cw-panel" aria-labelledby="deliverable-heading">
          <div className="cw-section-heading"><div><h2 id="deliverable-heading">Hạng mục cần nộp</h2><p>Theo dõi yêu cầu nộp và các phiên bản của nhóm.</p></div><Link className="cw-text-link" to="/project/deliverables">Xem tất cả<Icon name="arrow_outward" /></Link></div>
          <ResourceState resource={data.deliverables} retry={data.reload} />
          {data.deliverables.state === 'ready' && (data.deliverables.data.length ? <ul className="cw-deliverable-list">{[...data.deliverables.data].sort((a, b) => Number(['ACCEPTED', 'CLOSED'].includes(a.status)) - Number(['ACCEPTED', 'CLOSED'].includes(b.status)) || utcTimestamp(a.dueAt) - utcTimestamp(b.dueAt)).slice(0, 3).map(item => <li key={item.id}><Link to="/project/deliverables"><Icon name="description" /><span><strong>{item.title}</strong><span>{item.latestVersion ? `Đã nộp ${item.latestVersion} phiên bản` : 'Chưa có bài nộp'} · {dateLabel(item.dueAt)}</span></span><span className={`cw-status ${item.status === 'ACCEPTED' ? 'cw-status-success' : ''}`}>{({ DRAFT: 'Bản nháp', OPEN: 'Đang nhận bài', SUBMITTED: 'Đã nộp', ACCEPTED: 'Đã chấp nhận', REJECTED: 'Không được chấp nhận', CLOSED: 'Đã đóng' })[item.status]}</span></Link></li>)}</ul>
            : <p className="cw-empty">Nhóm chưa có hạng mục cần nộp.</p>)}
        </section>
      </div>

      <aside className="cw-side-column" aria-label="Hướng dẫn và lịch của nhóm">
        <section className="cw-panel" aria-labelledby="feedback-heading"><div className="cw-section-heading"><div><p className="cw-eyebrow">Cùng giảng viên</p><h2 id="feedback-heading">Nhận xét gần đây</h2></div><Icon name="chat_bubble_outline" /></div>
          <ResourceState resource={data.feedback} retry={data.reload} />
          {data.feedback.state === 'ready' && <>{data.feedback.data.incomplete && <p className="cw-section-error" role="alert">Một số nhận xét chưa tải được. <button onClick={data.reload}>Thử lại</button></p>}
            {data.feedback.data.items.length ? <ul className="cw-feedback-list">{data.feedback.data.items.map(item => <li key={item.id}><div className="cw-feedback-author"><span className="cw-avatar" aria-hidden="true">{initials(item.supervisorName)}</span><div><strong>{item.supervisorName}</strong><span>{dateLabel(item.createdAt)} · Nhận xét báo cáo</span></div></div><blockquote>{item.feedbackText}</blockquote><Link className="cw-text-link" to={`/project/reports/${item.reportId}`}>Xem báo cáo {dateLabel(item.periodStart)} – {dateLabel(item.periodEnd)}<Icon name="arrow_outward" /></Link></li>)}</ul>
              : !data.feedback.data.incomplete && <p className="cw-empty">Chưa có nhận xét trong các kỳ báo cáo gần đây.</p>}</>}
          <div className="cw-panel-footer"><Link className="cw-text-link" to="/project/reports">Tất cả báo cáo<Icon name="arrow_forward" /></Link></div>
        </section>

        <section className="cw-panel" aria-labelledby="milestone-heading"><div className="cw-section-heading"><h2 id="milestone-heading">Mốc gần nhất</h2><Icon name="flag" /></div>
          <ResourceState resource={data.timeline} retry={data.reload} />
          {data.timeline.state === 'ready' && (closestMilestone ? <div className="cw-milestone"><p className="cw-milestone-date">{dateLabel(closestMilestone.dueDate)}</p><h3>{closestMilestone.title}</h3><p>{closestMilestone.tasks.filter(task => task.status === 'DONE').length}/{closestMilestone.tasks.length} công việc hoàn thành</p><Progress value={closestMilestone.progressPercentage} label={`Tiến độ mốc ${closestMilestone.title}`} /><Link className="cw-text-link" to={`/project/milestones/${closestMilestone.id}`}>Xem mốc đồ án<Icon name="arrow_forward" /></Link></div>
            : <p className="cw-empty">Không có mốc nào đang thực hiện.</p>)}
        </section>

        <section className="cw-panel" aria-labelledby="meeting-heading"><div className="cw-section-heading"><h2 id="meeting-heading">Lịch họp tiếp theo</h2><Icon name="calendar_month" /></div>
          <ResourceState resource={data.meetings} retry={data.reload} />
          {data.meetings.state === 'ready' && <UpcomingMeeting meetings={data.meetings.data} />}
          <div className="cw-panel-footer"><Link className="cw-text-link" to="/project/meetings">Lịch họp và biên bản<Icon name="arrow_forward" /></Link></div>
        </section>
      </aside>
    </div>
    <footer className="cw-page-footer"><span>{data.updatedAt ? `Cập nhật lúc ${data.updatedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : 'Đang tải thông tin nhóm…'}</span><span>{project.code} · {team?.code || project.teamName}</span></footer>
  </div>
}

function UpcomingMeeting({ meetings }: { meetings: import('../../meetings/meeting-types').Meeting[] }) {
  const next = [...meetings].sort((a, b) => utcTimestamp(a.startAt) - utcTimestamp(b.startAt))[0]
  if (!next) return <p className="cw-empty">Nhóm chưa có lịch họp sắp tới.</p>
  return <Link className="cw-meeting" to={`/project/meetings/${next.id}`}><div className="cw-meeting-date"><strong>{dateLabel(next.startAt)}</strong><span>{new Date(utcTimestamp(next.startAt)).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })}</span></div><div><strong>{next.title}</strong><p>{next.location || (next.onlineUrl ? 'Họp trực tuyến' : 'Chưa có địa điểm')}</p></div><Icon name="chevron_right" /></Link>
}

function Icon({ name }: { name: string }) { return <span className="material-symbols-outlined" aria-hidden="true">{name}</span> }
function Progress({ value, label }: { value: number; label: string }) {
  const percentage = Math.max(0, Math.min(100, value))
  return <span className="cw-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percentage)}><span style={{ width: `${percentage}%` }} /></span>
}
function ResourceState<T>({ resource, retry }: { resource: Resource<T>; retry: () => void }): ReactNode {
  if (resource.state === 'ready') return null
  if (resource.state === 'error') return <div className="cw-section-error" role="alert"><span>{resource.message}</span><button type="button" onClick={retry}>Thử lại</button></div>
  return <div className="cw-loading" role="status" aria-label="Đang tải dữ liệu"><span /><span /><span /></div>
}
