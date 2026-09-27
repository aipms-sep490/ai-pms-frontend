import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { ExecutionPage, ExIcon, ExPagination, ExState } from '../../execution/execution-ui'
import { executionError, priorityLabels } from '../../execution/execution-utils'
import { services } from '../../../services/service-gateway'
import type { BackendTaskStatus, MilestoneDto, PagedResult, TaskDto } from '../../../types/backend'
import { dateLabel, isOverdue, taskStatusLabel } from '../../projects/utils/collaboration-workspace'
import { WorkspaceTaskForm } from '../../projects/components/WorkspaceTaskForm'

const statuses: BackendTaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW', 'DONE', 'CANCELLED']
const positiveId = (value: string | null) => { const id = Number(value); return Number.isSafeInteger(id) && id > 0 ? id : undefined }

export function TaskBoardPage() {
  const { project, team, currentUserId, canManageStructure, routeBase } = useExecutionAccess()
  const [params, setParams] = useSearchParams()
  const page = positiveId(params.get('page')) ?? 1
  const assigneeUserId = positiveId(params.get('assignee'))
  const milestoneId = positiveId(params.get('milestone'))
  const status = statuses.includes(params.get('status') as BackendTaskStatus) ? params.get('status')! : ''
  const priority = Object.hasOwn(priorityLabels, params.get('priority') ?? '') ? params.get('priority')! : ''
  const search = params.get('search') ?? ''
  const overdue = params.get('overdue') === 'true'
  const [draft, setDraft] = useState({ search, status, priority, milestone: String(milestoneId ?? ''), assignee: String(assigneeUserId ?? ''), overdue })
  const [advanced, setAdvanced] = useState(Boolean(priority || milestoneId || overdue))
  const [view, setView] = useState<'list' | 'status'>('list')
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(false)
  const createRef = useRef<HTMLButtonElement>(null)
  const restoreCreateFocus = useRef(false)
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<PagedResult<TaskDto> | null>(null)
  const [milestones, setMilestones] = useState<MilestoneDto[]>([])
  const [milestoneError, setMilestoneError] = useState('')
  const [milestoneLoading, setMilestoneLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { setDraft({ search, status, priority, milestone: String(milestoneId ?? ''), assignee: String(assigneeUserId ?? ''), overdue }) }, [search, status, priority, milestoneId, assigneeUserId, overdue])
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('')
    services.task.getProjectTasks(project.id, { page, pageSize: 20, search: search.trim() || undefined, assigneeUserId,
      milestoneId, status: status || undefined, priority: priority || undefined, isOverdue: overdue || undefined }, controller.signal)
      .then(next => { if (!controller.signal.aborted) setData(next) })
      .catch(reason => { if (!controller.signal.aborted) setError(executionError(reason, 'tải công việc')) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [project.id, page, search, assigneeUserId, milestoneId, status, priority, overdue, revision])
  useEffect(() => {
    const controller = new AbortController(); setMilestoneError(''); setMilestoneLoading(true); setMilestones([])
    services.milestone.getProjectMilestones(project.id, controller.signal)
      .then(items => { if (!controller.signal.aborted) setMilestones(items) })
      .catch(reason => { if (!controller.signal.aborted) setMilestoneError(executionError(reason, 'tải mốc đồ án')) })
      .finally(() => { if (!controller.signal.aborted) setMilestoneLoading(false) })
    return () => controller.abort()
  }, [project.id, revision])
  const members = team?.members ?? []
  const eligibleMilestones = milestones.filter(item => !['COMPLETED', 'CANCELLED'].includes(item.status))
  const refresh = () => setRevision(value => value + 1)
  function updateParams(key: string, value: string) {
    const next = new URLSearchParams(params); next.delete('page'); if (value) next.set(key, value); else next.delete(key); setParams(next)
  }
  function apply(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    for (const [key, value] of Object.entries(draft)) if (value) next.set(key, String(value))
    setParams(next)
  }
  const closeCreate = () => { restoreCreateFocus.current = true; setCreating(false) }
  useEffect(() => {
    if (!creating && restoreCreateFocus.current) { createRef.current?.focus(); restoreCreateFocus.current = false }
  }, [creating])
  const activeMember = members.find(member => member.userId === assigneeUserId)
  return <ExecutionPage title="Công việc" eyebrow={project.code} description="Xem ai đang phụ trách, việc nào cần xử lý và hạn hoàn thành."
    action={<><button className="ex-button" onClick={refresh} disabled={loading}><ExIcon name="refresh" />Cập nhật</button>{canManageStructure && <button ref={createRef} className="ex-button ex-button-primary" onClick={() => { setCreating(true); setCreated(false) }} disabled={creating}><ExIcon name="add" />Tạo công việc</button>}</>}>
    {created && <p className="ex-notice" role="status">Đã tạo công việc.</p>}
    {creating && (milestoneLoading ? <ExState loading /> : milestoneError ? <ExState message={milestoneError} retry={refresh} /> : eligibleMilestones.length ? <div className="mb-6"><WorkspaceTaskForm members={members} milestones={eligibleMilestones} onCancel={closeCreate} onCreated={() => { closeCreate(); setCreated(true); refresh() }} /></div>
      : <section className="ex-panel"><ExState title="Cần có mốc đồ án đang thực hiện" message="Tạo một mốc trước khi thêm công việc cho nhóm." action={<Link className="ex-button" to={`${routeBase}/milestones`}>Quản lý mốc đồ án</Link>} /><div className="ex-padding"><button className="ex-text-button" onClick={closeCreate}>Đóng</button></div></section>)}
    <section className="ex-panel" aria-label="Danh sách công việc">
      <div className="ex-toolbar"><div className="ex-tabs" role="group" aria-label="Phạm vi công việc"><button aria-pressed={!assigneeUserId} onClick={() => updateParams('assignee', '')}>Cả nhóm</button>{currentUserId && <button aria-pressed={assigneeUserId === currentUserId} onClick={() => updateParams('assignee', String(currentUserId))}>Của tôi</button>}
        {assigneeUserId && assigneeUserId !== currentUserId && <span className="ex-muted">{activeMember?.fullName ?? 'Thành viên đã chọn'} <button className="ex-text-button" onClick={() => updateParams('assignee', '')}>Bỏ lọc</button></span>}</div>
        <div className="ex-tabs" role="group" aria-label="Cách hiển thị"><button aria-pressed={view === 'list'} onClick={() => setView('list')}><ExIcon name="format_list_bulleted" /> Danh sách</button><button aria-pressed={view === 'status'} onClick={() => setView('status')}>Theo trạng thái</button></div>
      </div>
      <form onSubmit={apply}>
        <div className="ex-filters"><label className="ex-filter-search">Tìm công việc<input value={draft.search} onChange={event => setDraft({ ...draft, search: event.target.value })} placeholder="Tên công việc…" /></label>
          <label>Trạng thái<select value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value })}><option value="">Tất cả</option>{statuses.map(value => <option key={value} value={value}>{taskStatusLabel(value)}</option>)}</select></label>
          {members.length > 0 && <label>Người phụ trách<select value={draft.assignee} onChange={event => setDraft({ ...draft, assignee: event.target.value })}><option value="">Cả nhóm</option>{members.map(member => <option key={member.userId} value={member.userId}>{member.fullName}</option>)}</select></label>}
          <button className="ex-button" type="submit">Áp dụng</button><button className="ex-text-button" type="button" aria-expanded={advanced} onClick={() => setAdvanced(value => !value)}>Bộ lọc khác</button>
        </div>
        {advanced && <div className="ex-filters"><label>Mốc đồ án<select value={draft.milestone} onChange={event => setDraft({ ...draft, milestone: event.target.value })}><option value="">Tất cả mốc</option>{milestones.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>Mức ưu tiên<select value={draft.priority} onChange={event => setDraft({ ...draft, priority: event.target.value })}><option value="">Tất cả mức</option>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="ex-filter-check"><input type="checkbox" checked={draft.overdue} onChange={event => setDraft({ ...draft, overdue: event.target.checked })} />Chỉ việc quá hạn</label><button className="ex-text-button" type="button" onClick={() => setParams({})}>Xóa bộ lọc</button></div>}
      </form>
      {loading ? <ExState loading /> : error ? <ExState message={error} retry={refresh} /> : data && <>
        {!data.items.length ? <ExState title="Không có công việc phù hợp" message="Thử đổi bộ lọc hoặc tạo công việc mới cho nhóm." /> : <>
          <div className="ex-task-list-heading" aria-hidden="true"><span>Công việc / mốc đồ án</span><span>Người phụ trách</span><span>Trạng thái</span><span>Hạn hoàn thành</span></div>
          {view === 'list' ? <ul>{data.items.map(task => <TaskRow key={task.id} task={task} routeBase={routeBase} milestones={milestones} listSearch={params.toString()} />)}</ul>
            : statuses.filter(value => data.items.some(task => task.status === value)).map(value => <div key={value}><h2 className="ex-group-heading">{taskStatusLabel(value)} <span className="ex-muted">· {data.items.filter(task => task.status === value).length} việc trên trang này</span></h2><ul>{data.items.filter(task => task.status === value).map(task => <TaskRow key={task.id} task={task} routeBase={routeBase} milestones={milestones} listSearch={params.toString()} />)}</ul></div>)}
        </>}
        <ExPagination page={page} pages={data.totalPages} total={data.totalCount} onPage={nextPage => { const next = new URLSearchParams(params); next.set('page', String(nextPage)); setParams(next) }} />
      </>}
    </section>
  </ExecutionPage>
}
function TaskRow({ task, routeBase, milestones, listSearch }: { task: TaskDto; routeBase: string; milestones: MilestoneDto[]; listSearch: string }) {
  const overdue = isOverdue({ ...task, assignees: [] }, Date.now())
  return <li><Link className="ex-task-row" to={`${routeBase}/tasks/${task.id}`} state={{ taskListSearch: listSearch }}><span className="ex-task-title"><ExIcon name={task.status === 'DONE' ? 'check_circle' : task.status === 'BLOCKED' ? 'pause_circle' : 'radio_button_unchecked'} /><div><strong>{task.title}</strong><small>{milestones.find(item => item.id === task.milestoneId)?.title || 'Công việc của đồ án'} · Ưu tiên {priorityLabels[task.priority ?? '']?.toLowerCase() ?? 'chưa chọn'}</small></div></span>
    <span className="ex-task-assignee">{task.assignees.map(person => person.userFullName).join(', ') || 'Chưa phân công'}</span><span className="ex-task-status"><span className={`ex-badge ex-badge-${task.status}`}>{taskStatusLabel(task.status)}</span></span><span className={`ex-task-date ${overdue ? 'is-overdue' : ''}`}>{dateLabel(task.dueAt)}{overdue && <small>Quá hạn</small>}</span>
  </Link></li>
}
