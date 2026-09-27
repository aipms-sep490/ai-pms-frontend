import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { ExecutionPage, ExConfirm, ExIcon, ExState } from '../../execution/execution-ui'
import { dateTimeLabel, dependencyLabels, executionError, localDateTime, priorityLabels, taskTransitions, toUtcDateTime } from '../../execution/execution-utils'
import { useExecutionMutation } from '../../execution/useExecutionMutation'
import { services } from '../../../services/service-gateway'
import type { ProjectTimelineDataDto, TaskDto, TaskStatusHistoryDto } from '../../../types/backend'
import { taskStatusLabel, utcTimestamp } from '../../projects/utils/collaboration-workspace'
import { TaskEvidenceAndComments } from '../components/TaskEvidenceAndComments'

export function TaskDetailPage() {
  const { taskId } = useParams()
  const { project } = useExecutionAccess()
  return <TaskDetail key={`${project.id}:${taskId}`} id={Number(taskId)} />
}
function TaskDetail({ id }: { id: number }) {
  const access = useExecutionAccess()
  const { project, canManageStructure, currentUserId, routeBase, team } = access
  const navigate = useNavigate()
  const location = useLocation()
  const listSearch = typeof location.state?.taskListSearch === 'string' ? location.state.taskListSearch : ''
  const taskListUrl = `${routeBase}/tasks${listSearch ? `?${listSearch}` : ''}`
  const [revision, setRevision] = useState(0)
  const [task, setTask] = useState<TaskDto | null>(null)
  const [history, setHistory] = useState<TaskStatusHistoryDto[]>([])
  const [timeline, setTimeline] = useState<ProjectTimelineDataDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [error, setError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [contextError, setContextError] = useState('')
  const [editing, setEditing] = useState<'content' | 'assignees' | 'dependency' | null>(null)
  const [deleting, setDeleting] = useState(false)
  const mutation = useExecutionMutation()
  const reload = () => setRevision(value => value + 1)
  useEffect(() => {
    if (!Number.isSafeInteger(id) || id < 1) { setError('Đường dẫn công việc không hợp lệ.'); setLoading(false); return }
    const controller = new AbortController(); const signal = controller.signal
    setLoading(true); setError(''); setHistoryError(''); setContextError(''); setHistoryLoading(true)
    services.task.getTask(id, signal).then(next => { if (!signal.aborted) setTask(next) })
      .catch(reason => { if (!signal.aborted) setError(executionError(reason, 'tải công việc')) }).finally(() => { if (!signal.aborted) setLoading(false) })
    services.task.getTaskHistory(id, signal).then(items => { if (!signal.aborted) setHistory(items) })
      .catch(reason => { if (!signal.aborted) setHistoryError(executionError(reason, 'tải lịch sử')) }).finally(() => { if (!signal.aborted) setHistoryLoading(false) })
    services.task.getProjectTimeline(project.id, signal).then(next => { if (!signal.aborted) setTimeline(next) })
      .catch(reason => { if (!signal.aborted) setContextError(executionError(reason, 'tải các công việc liên quan')) })
    return () => controller.abort()
  }, [id, project.id, revision])
  if (!task) return <ExecutionPage title="Chi tiết công việc" backTo={taskListUrl}><ExState loading={loading} message={error} retry={error ? reload : undefined} /></ExecutionPage>
  const allTasks = timeline?.milestones.flatMap(item => item.tasks) ?? []
  const milestone = timeline?.milestones.find(item => item.id === task.milestoneId)
  const contextValid = Boolean(milestone)
  const canUpdateStatus = contextValid && (canManageStructure || Boolean(currentUserId && task.assignees.some(person => person.userId === currentUserId)))
  const candidates = team?.members.map(member => ({ userId: member.userId, fullName: member.fullName })) ??
    [...new Map(allTasks.flatMap(item => item.assignees).map(person => [person.userId, person])).values()]
  const mayDelete = canManageStructure && contextValid && !historyLoading && !historyError && !history.length && !task.assignees.length && !task.dependencies.length && !allTasks.some(item => item.dependencies.some(dependency => dependency.dependsOnTaskId === task.id))
  const saved = () => { setEditing(null); reload() }
  return <ExecutionPage title={task.title} eyebrow={milestone?.title ?? project.code} backTo={taskListUrl}
    action={<><button className="ex-button" disabled={loading || mutation.busy} onClick={reload}><ExIcon name="refresh" />Cập nhật</button>{canManageStructure && contextValid && <button className="ex-button" disabled={mutation.busy} onClick={() => { mutation.clear(); setEditing('content') }}><ExIcon name="edit" />Chỉnh sửa</button>}</>}>
    <div className="ex-actions mb-6"><span className={`ex-badge ex-badge-${task.status}`}>{taskStatusLabel(task.status)}</span><span className="ex-muted">Ưu tiên {priorityLabels[task.priority ?? '']?.toLowerCase() ?? 'chưa chọn'}</span></div>
    {error && <ExState message={error} retry={reload} />}{contextError && <ExState message={contextError} retry={reload} />}
    {timeline && !contextValid && <p className="ex-notice ex-notice-error" role="alert">Công việc này không thuộc đồ án đang xem. <Link className="ex-link" to={`${routeBase}/tasks`}>Về danh sách công việc</Link></p>}
    {mutation.error && <p className="ex-notice ex-notice-error" role="alert">{mutation.error}</p>}{mutation.notice && <p className="ex-notice" role="status">{mutation.notice}</p>}
    {editing === 'content' && <TaskContentEditor task={task} timeline={timeline} busy={mutation.busy} onCancel={() => setEditing(null)} onSubmit={payload => mutation.run(() => services.task.updateTask(task.id, payload), saved)} />}
    <div className="ex-detail-grid"><div>
      <section className="ex-panel"><div className="ex-panel-heading"><h2>Nội dung công việc</h2></div><div className="ex-padding ex-stack"><p className="ex-prose">{task.description?.trim() || 'Chưa có mô tả cho công việc này.'}</p><dl className="ex-facts"><div><dt>Bắt đầu dự kiến</dt><dd>{dateTimeLabel(task.startAt)}</dd></div><div><dt>Hạn hoàn thành</dt><dd>{dateTimeLabel(task.dueAt)}</dd></div>{task.parentTaskId && <div><dt>Thuộc công việc</dt><dd><Link className="ex-link" to={`${routeBase}/tasks/${task.parentTaskId}`}>{allTasks.find(item => item.id === task.parentTaskId)?.title ?? 'Xem công việc cha'}</Link></dd></div>}<div><dt>Mốc đồ án</dt><dd>{milestone ? <Link className="ex-link" to={`${routeBase}/milestones/${milestone.id}`}>{milestone.title}</Link> : 'Đang tải thông tin mốc…'}</dd></div></dl></div></section>
      <section className="ex-panel"><div className="ex-panel-heading"><h2>Người phụ trách</h2>{canManageStructure && contextValid && <button className="ex-text-button" disabled={mutation.busy} onClick={() => { mutation.clear(); setEditing('assignees') }}>Phân công</button>}</div>
        <div className="ex-padding">{editing === 'assignees' ? <AssigneeEditor key={task.updatedAt} task={task} candidates={candidates} busy={mutation.busy} onCancel={() => setEditing(null)} onSubmit={ids => mutation.run(() => services.task.setTaskAssignees(task.id, ids), saved)} />
          : <p className="ex-prose">{task.assignees.map(person => person.userFullName).join(', ') || 'Chưa phân công người phụ trách.'}</p>}{!team && editing === 'assignees' && <p className="ex-muted mt-3">Danh sách gồm những người đã được giao công việc trong đồ án. Trưởng nhóm có thể phân công thêm thành viên từ danh sách nhóm.</p>}</div>
      </section>
      <section className="ex-panel"><div className="ex-panel-heading"><div><h2>Công việc liên quan</h2><p>Các việc cần bắt đầu hoặc hoàn thành trước công việc này.</p></div>{canManageStructure && contextValid && <button className="ex-text-button" disabled={mutation.busy} onClick={() => { mutation.clear(); setEditing('dependency') }}>Thêm liên kết</button>}</div>
        <div className="ex-padding">{task.dependencies.length ? <ul className="ex-dependencies">{task.dependencies.map(dependency => <li key={dependency.id}><div><Link className="ex-link" to={`${routeBase}/tasks/${dependency.dependsOnTaskId}`}>{allTasks.find(item => item.id === dependency.dependsOnTaskId)?.title ?? 'Xem công việc liên quan'}</Link><small>{dependencyLabels[dependency.dependencyType] ?? 'Liên kết công việc'}</small></div>{canManageStructure && contextValid && <button className="ex-text-button" disabled={mutation.busy} onClick={() => void mutation.run(() => services.task.removeTaskDependency(task.id, dependency.dependsOnTaskId), reload)}>Bỏ liên kết</button>}</li>)}</ul> : <p className="ex-muted">Chưa có liên kết với công việc khác.</p>}
          {editing === 'dependency' && <DependencyEditor tasks={allTasks.filter(item => item.id !== task.id && !task.dependencies.some(dependency => dependency.dependsOnTaskId === item.id))} busy={mutation.busy} onCancel={() => setEditing(null)} onSubmit={(dependsOnTaskId, dependencyType) => mutation.run(() => services.task.addTaskDependency({ taskId: task.id, dependsOnTaskId, dependencyType }), saved)} />}
        </div>
      </section>
      <section className="ex-panel"><div className="ex-panel-heading"><h2>Lịch sử cập nhật</h2></div><div className="ex-padding">{historyLoading ? <ExState loading /> : historyError ? <ExState message={historyError} retry={reload} /> : history.length ? <ol className="ex-history">{[...history].sort((a,b) => utcTimestamp(b.changedAt) - utcTimestamp(a.changedAt) || b.id - a.id).map(item => <li key={item.id}><strong>{item.oldStatus ? taskStatusLabel(item.oldStatus) : 'Tạo công việc'} → {taskStatusLabel(item.newStatus)}</strong><time>{dateTimeLabel(item.changedAt)} · {item.changedByFullName}</time>{item.reason && <p>{item.reason}</p>}</li>)}</ol> : <p className="ex-muted">Chưa có thay đổi trạng thái.</p>}</div></section>
      <TaskEvidenceAndComments taskId={task.id} currentUserId={currentUserId ?? null} canManageStructure={canManageStructure} />
      {mayDelete && <><button className="ex-text-button ex-danger-text" onClick={() => setDeleting(true)}>Xóa công việc</button>{deleting && <ExConfirm title="Xóa công việc này?" description="Chỉ công việc chưa có phân công, liên kết hoặc lịch sử mới được xóa. Các công việc đã thực hiện nên chuyển sang trạng thái Đã hủy." busy={mutation.busy} onCancel={() => setDeleting(false)} onConfirm={() => void mutation.run(() => services.task.deleteTask(task.id), () => navigate(`${routeBase}/tasks`, { replace: true }), 'Đã xóa công việc.')} />}</>}
    </div><aside><section className="ex-panel"><div className="ex-panel-heading"><h2>Cập nhật tiến độ</h2></div><div className="ex-padding">{canUpdateStatus ? <StatusEditor key={task.status} task={task} busy={mutation.busy} onSubmit={(newStatus, reason) => mutation.run(() => services.task.updateTaskStatus(task.id, { newStatus, reason: reason.trim() || null }), reload, 'Đã cập nhật trạng thái.')} />
      : <p className="ex-muted">Người phụ trách, trưởng nhóm và giảng viên hướng dẫn có thể cập nhật trạng thái công việc.</p>}</div></section></aside></div>
  </ExecutionPage>
}

function TaskContentEditor({ task, timeline, busy, onCancel, onSubmit }: { task: TaskDto; timeline: ProjectTimelineDataDto | null; busy: boolean; onCancel: () => void; onSubmit: (payload: import('../../../services/api/tasks.api').UpdateTaskPayload) => Promise<boolean> }) {
  const [validation, setValidation] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '').trim(); const start = String(form.get('startAt') ?? ''); const due = String(form.get('dueAt') ?? '')
    if (!title || (start && due && due < start)) { setValidation('Nhập tên công việc và chọn hạn bằng hoặc sau ngày bắt đầu.'); return }
    setValidation(''); void onSubmit({ milestoneId: Number(form.get('milestoneId')), parentTaskId: task.parentTaskId ?? null,
      title, description: String(form.get('description') ?? '').trim() || null, priority: String(form.get('priority')), startAt: toUtcDateTime(start), dueAt: toUtcDateTime(due) })
  }
  return <section className="ex-panel" aria-label="Chỉnh sửa công việc"><div className="ex-panel-heading"><h2>Chỉnh sửa công việc</h2></div><form className="ex-form" onSubmit={submit}><fieldset disabled={busy}><div className="ex-fields">
    <label className="ex-full">Tên công việc<input autoFocus name="title" defaultValue={task.title} required maxLength={255} /></label><label className="ex-full">Mô tả<textarea name="description" defaultValue={task.description ?? ''} rows={3} maxLength={10000} /></label>
    <label>Mốc đồ án<select name="milestoneId" defaultValue={task.milestoneId}>{timeline?.milestones.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>Mức ưu tiên<select name="priority" defaultValue={task.priority ?? 'MEDIUM'}>{Object.entries(priorityLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label>Bắt đầu dự kiến<input type="datetime-local" name="startAt" defaultValue={localDateTime(task.startAt)} /></label><label>Hạn hoàn thành<input type="datetime-local" name="dueAt" defaultValue={localDateTime(task.dueAt)} /></label>
  </div><p className="ex-muted mt-3">Thời gian tính theo giờ Việt Nam (UTC+7).</p>{validation && <p role="alert" className="ex-notice ex-notice-error mt-3">{validation}</p>}<div className="ex-form-footer"><button className="ex-button" type="button" onClick={onCancel}>Hủy</button><button className="ex-button ex-button-primary">{busy ? 'Đang lưu…' : 'Lưu nội dung'}</button></div></fieldset></form></section>
}
function AssigneeEditor({ task, candidates, busy, onCancel, onSubmit }: { task: TaskDto; candidates: { userId: number; fullName: string }[]; busy: boolean; onCancel: () => void; onSubmit: (ids: number[]) => Promise<boolean> }) {
  return <form onSubmit={event => { event.preventDefault(); void onSubmit(new FormData(event.currentTarget).getAll('assignee').map(Number)) }}><fieldset disabled={busy}><legend className="ex-muted">Chọn người cùng phụ trách công việc</legend><div className="ex-checks">{candidates.map(person => <label key={person.userId}><input name="assignee" type="checkbox" value={person.userId} defaultChecked={task.assignees.some(item => item.userId === person.userId)} />{person.fullName}</label>)}</div><div className="ex-form-footer"><button className="ex-button" type="button" onClick={onCancel}>Hủy</button><button className="ex-button ex-button-primary">Lưu phân công</button></div></fieldset></form>
}
function DependencyEditor({ tasks, busy, onCancel, onSubmit }: { tasks: { id: number; title: string }[]; busy: boolean; onCancel: () => void; onSubmit: (id: number, type: string) => Promise<boolean> }) {
  return <form className="mt-4" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void onSubmit(Number(form.get('dependency')), String(form.get('type'))) }}><fieldset disabled={busy}><div className="ex-fields"><label className="ex-full">Công việc liên quan<select name="dependency" required defaultValue=""><option value="" disabled>Chọn công việc</option>{tasks.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="ex-full">Mối liên hệ<select name="type" defaultValue="FINISH_TO_START">{Object.entries(dependencyLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><div className="ex-form-footer"><button className="ex-button" type="button" onClick={onCancel}>Hủy</button><button className="ex-button ex-button-primary" disabled={!tasks.length}>Lưu liên kết</button></div></fieldset></form>
}
function StatusEditor({ task, busy, onSubmit }: { task: TaskDto; busy: boolean; onSubmit: (status: string, reason: string) => Promise<boolean> }) {
  const next = taskTransitions[task.status] ?? []
  return <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void onSubmit(String(form.get('status')), String(form.get('reason') ?? '')) }}><fieldset disabled={busy}><label className="ex-field">Trạng thái tiếp theo<select name="status" defaultValue={next[0] ?? ''} required>{next.map(value => <option key={value} value={value}>{taskStatusLabel(value)}</option>)}</select></label><label className="ex-field mt-4">Ghi chú thay đổi<textarea name="reason" rows={2} maxLength={2000} placeholder="Vướng mắc hoặc lý do cập nhật (nếu có)" /></label><button className="ex-button ex-button-primary mt-4 w-full" disabled={!next.length}>{busy ? 'Đang lưu…' : 'Cập nhật trạng thái'}</button></fieldset></form>
}
