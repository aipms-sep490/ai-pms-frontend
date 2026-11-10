import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { ExecutionPage, ExIcon, ExPagination, ExState } from '../../execution/execution-ui'
import { executionError, priorityLabels, taskTransitions } from '../../execution/execution-utils'
import { services } from '../../../services/service-gateway'
import type { BackendTaskStatus, MilestoneDto, PagedResult, TaskDto } from '../../../types/backend'
import { dateLabel, isOverdue, taskStatusLabel } from '../../projects/utils/collaboration-workspace'
import { WorkspaceTaskForm } from '../../projects/components/WorkspaceTaskForm'
import { canUseProjectExecutionAction } from '../../execution/execution-authority'
import { env } from '../../../app/config/env'
import { SprintBacklogPanel } from '../components/SprintBacklogPanel'
import { TaskDetailModal } from '../components/TaskDetailModal'
import type { AssistantDraft } from '../../ai/academic-ai-api'
import { readActionDraft } from '../../ai/assistant-action-draft'
import './task-board.css'

const statuses: BackendTaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW', 'DONE', 'CANCELLED']
const disciplineRoles = ['PRIMARY', 'SUPPORTING'] as const
const disciplineRoleLabels: Record<string, string> = { PRIMARY: 'Ngành chính', SUPPORTING: 'Ngành hỗ trợ' }
const positiveId = (value: string | null) => { const id = Number(value); return Number.isSafeInteger(id) && id > 0 ? id : undefined }

export function TaskBoardPage() {
  const access = useExecutionAccess()
  const { project, team, teamLoadError, retryTeam, currentUserId, routeBase } = access
  const location = useLocation()
  const navigate = useNavigate()
  const [assistantDraft, setAssistantDraft] = useState<(AssistantDraft & { draftKey: string; projectId: number }) | undefined>()
  const canCreate = canUseProjectExecutionAction(access, 'create_task')
  const [params, setParams] = useSearchParams()
  const page = positiveId(params.get('page')) ?? 1
  const assigneeUserId = positiveId(params.get('assignee'))
  const milestoneId = positiveId(params.get('milestone'))
  const status = statuses.includes(params.get('status') as BackendTaskStatus) ? params.get('status')! : ''
  const priority = Object.hasOwn(priorityLabels, params.get('priority') ?? '') ? params.get('priority')! : ''
  const search = params.get('search') ?? ''
  const overdue = params.get('overdue') === 'true'
  const showMajorFilter = env.taskMajorFilterEnabled && (project.majors?.length ?? 0) > 1
  const majorId = showMajorFilter ? positiveId(params.get('major')) : undefined
  const disciplineRole = showMajorFilter && disciplineRoles.includes(params.get('role') as (typeof disciplineRoles)[number])
    ? (params.get('role') as 'PRIMARY' | 'SUPPORTING') : undefined
  const modalTaskId = positiveId(params.get('taskDetail'))
  const dragActive = useRef(false)

  const openTaskDetail = (id: number) => {
    const next = new URLSearchParams(params)
    next.set('taskDetail', String(id))
    setParams(next)
  }

  const closeTaskDetail = () => {
    const next = new URLSearchParams(params)
    next.delete('taskDetail')
    setParams(next)
  }

  const [draft, setDraft] = useState({ search, status, priority, milestone: String(milestoneId ?? ''), assignee: String(assigneeUserId ?? ''), overdue, major: String(majorId ?? ''), role: disciplineRole ?? '' })
  const [advanced, setAdvanced] = useState(Boolean(priority || milestoneId || overdue || majorId || disciplineRole))
  const [view, setView] = useState<'list' | 'status' | 'board' | 'sprint'>('list')
  const [creating, setCreating] = useState(false)
  useEffect(() => {
    const incoming = readActionDraft(location.state?.assistantDraft, project.id, 'TASK')
    if (canCreate && incoming) {
      setAssistantDraft({ ...incoming, draftKey: location.key, projectId: project.id }); setCreating(true)
      navigate(location.pathname + location.search, { replace: true, state: null })
    }
  }, [location, navigate, project.id, canCreate])
  const [created, setCreated] = useState(false)
  useEffect(() => {
    if (created) {
      const timer = window.setTimeout(() => setCreated(false), 4000)
      return () => window.clearTimeout(timer)
    }
  }, [created])
  const createRef = useRef<HTMLButtonElement>(null)
  const restoreCreateFocus = useRef(false)
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<PagedResult<TaskDto> | null>(null)
  const [observedAt, setObservedAt] = useState(() => Date.now())
  const [milestones, setMilestones] = useState<MilestoneDto[]>([])
  const [milestoneError, setMilestoneError] = useState('')
  const [milestoneLoading, setMilestoneLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<BackendTaskStatus | null>(null)
  const [dragNotice, setDragNotice] = useState<string | null>(null)
  const statusPending = useRef(false)
  const [savingStatus, setSavingStatus] = useState(false)

  const handleDropOnColumn = async (targetStatus: BackendTaskStatus) => {
    if (statusPending.current) return
    setDragOverColumn(null)
    if (access.readOnly || !draggingTaskId || !data) return
    const currentTask = data.items.find(t => t.id === draggingTaskId)
    setDraggingTaskId(null)
    if (!currentTask || currentTask.status === targetStatus) return

    const allowed = taskTransitions[currentTask.status] ?? []
    if (!allowed.includes(targetStatus)) {
      setDragNotice(`Không thể chuyển trực tiếp từ "${taskStatusLabel(currentTask.status)}" sang "${taskStatusLabel(targetStatus)}".`)
      setTimeout(() => setDragNotice(null), 4000)
      return
    }

    statusPending.current = true; setSavingStatus(true)
    setDragNotice('Đang cập nhật trạng thái công việc…')

    try {
      await services.task.updateTaskStatus(currentTask.id, {
        newStatus: targetStatus,
        reason: null,
        concurrencyToken: currentTask.concurrencyToken,
      })
      // Reload the authoritative page, including new tokens, filters and totals.
      refresh()
      setDragNotice(`Đã chuyển công việc #${currentTask.id} sang "${taskStatusLabel(targetStatus)}".`)
      setTimeout(() => setDragNotice(null), 3000)
    } catch (err) {
      setDragNotice(executionError(err, 'cập nhật trạng thái'))
      setTimeout(() => setDragNotice(null), 5000)
    } finally {
      statusPending.current = false; setSavingStatus(false)
    }
  }
  useEffect(() => { setDraft({ search, status, priority, milestone: String(milestoneId ?? ''), assignee: String(assigneeUserId ?? ''), overdue, major: String(majorId ?? ''), role: disciplineRole ?? '' }) }, [search, status, priority, milestoneId, assigneeUserId, overdue, majorId, disciplineRole])
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('')
    services.task.getProjectTasks(project.id, { page, pageSize: 20, search: search.trim() || undefined, assigneeUserId,
      milestoneId, status: status || undefined, priority: priority || undefined, isOverdue: overdue || undefined, majorId, disciplineRole }, controller.signal)
      .then(next => { if (!controller.signal.aborted) { setData(next); setObservedAt(Date.now()) } })
      .catch(reason => { if (!controller.signal.aborted) setError(executionError(reason, 'tải công việc')) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [project.id, page, search, assigneeUserId, milestoneId, status, priority, overdue, majorId, disciplineRole, revision])
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
  const closeCreate = () => { restoreCreateFocus.current = true; setCreating(false); setAssistantDraft(undefined) }
  useEffect(() => {
    if (!creating && restoreCreateFocus.current) { createRef.current?.focus(); restoreCreateFocus.current = false }
  }, [creating])
  const activeMember = members.find(member => member.userId === assigneeUserId)
  return <ExecutionPage title="Công việc" eyebrow={project.code} description="Xem ai đang phụ trách, việc nào cần xử lý và hạn hoàn thành."
    action={<><button className="ex-button" onClick={refresh} disabled={loading}><ExIcon name="refresh" />Cập nhật</button>{canCreate && <button ref={createRef} className="ex-button ex-button-primary" onClick={() => { setCreating(true); setCreated(false) }} disabled={creating}><ExIcon name="add" />Tạo công việc</button>}</>}>
    {created && (
      <div className="ex-notice flex items-center justify-between" role="status">
        <span>Đã tạo công việc.</span>
        <button
          type="button"
          className="text-xs font-semibold underline ml-3"
          onClick={() => setCreated(false)}
          aria-label="Đóng thông báo"
        >
          Đóng
        </button>
      </div>
    )}
    {dragNotice && <p className="ex-notice" role="status">{dragNotice}</p>}
    {!team && <ExState message={teamLoadError ?? 'Chưa tải được danh sách thành viên nhóm. Bạn vẫn xem được công việc nhưng chưa giao được người phụ trách.'} retry={retryTeam} />}
    {creating && (milestoneLoading ? <ExState loading /> : milestoneError ? <ExState message={milestoneError} retry={refresh} /> : eligibleMilestones.length ? <div className="mb-6"><WorkspaceTaskForm key={`${project.id}:${assistantDraft?.draftKey ?? 'manual'}`} initialDraft={assistantDraft?.projectId === project.id ? assistantDraft : undefined} project={project} members={members} milestones={eligibleMilestones} onCancel={closeCreate} onCreated={() => { closeCreate(); setCreated(true); refresh() }} /></div>
      : <section className="ex-panel"><ExState title="Cần có mốc đồ án đang thực hiện" message="Tạo một mốc trước khi thêm công việc cho nhóm." action={<Link className="ex-button" to={`${routeBase}/milestones`}>Quản lý mốc đồ án</Link>} /><div className="ex-padding"><button className="ex-text-button" onClick={closeCreate}>Đóng</button></div></section>)}
    <section className="ex-panel task-board-panel" aria-label="Danh sách công việc">
      <div className="ex-toolbar ex-toolbar--two-rows flex flex-col gap-3 p-4">
        {data && data.items.length > 0 && (
          <div className="w-full rounded-xl border border-hairline bg-canvas/60 p-3 mb-1" aria-label="Tổng quan tiến trình công việc">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-ink">Tiến độ trang này:</span>
                <span className="rounded-full bg-primary-subtle px-2 py-0.5 font-bold text-primary">
                  {Math.round((data.items.filter(t => t.status === 'DONE').length / data.items.length) * 100)}% hoàn thành
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-slate-400" aria-hidden="true" />
                  <span>Chưa bắt đầu: <strong className="text-ink">{data.items.filter(t => t.status === 'TODO').length}</strong></span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
                  <span>Đang làm: <strong className="text-ink">{data.items.filter(t => t.status === 'IN_PROGRESS').length}</strong></span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-600" aria-hidden="true" />
                  <span>Chờ nghiệm thu: <strong className="text-ink">{data.items.filter(t => t.status === 'IN_REVIEW').length}</strong></span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden="true" />
                  <span>Hoàn thành: <strong className="text-ink">{data.items.filter(t => t.status === 'DONE').length}</strong></span>
                </span>
              </div>
            </div>
            <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div style={{ width: `${(data.items.filter(t => t.status === 'DONE').length / data.items.length) * 100}%` }} className="bg-emerald-600 transition-all" />
              <div style={{ width: `${(data.items.filter(t => t.status === 'IN_REVIEW').length / data.items.length) * 100}%` }} className="bg-indigo-600 transition-all" />
              <div style={{ width: `${(data.items.filter(t => t.status === 'IN_PROGRESS').length / data.items.length) * 100}%` }} className="bg-amber-500 transition-all" />
              <div style={{ width: `${(data.items.filter(t => t.status === 'TODO').length / data.items.length) * 100}%` }} className="bg-slate-400 transition-all" />
            </div>
          </div>
        )}
        <div className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-hairline pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Phạm vi:</span>
            <div className="ex-tabs" role="group" aria-label="Phạm vi công việc">
              <button type="button" aria-pressed={!assigneeUserId} onClick={() => updateParams('assignee', '')}>Cả nhóm</button>
              {currentUserId && <button type="button" aria-pressed={assigneeUserId === currentUserId} onClick={() => updateParams('assignee', String(currentUserId))}>Của tôi</button>}
            </div>
            {assigneeUserId && assigneeUserId !== currentUserId && (
              <span className="text-xs font-medium text-ink-soft inline-flex items-center gap-1.5 ml-2">
                <span>{activeMember?.fullName ?? 'Thành viên đã chọn'}</span>
                <button type="button" className="ex-text-button text-xs underline" onClick={() => updateParams('assignee', '')}>Bỏ lọc</button>
              </span>
            )}
          </div>
          {data && (
            <span className="text-xs text-ink-muted tabular-nums">
              Tổng số công việc: <strong className="text-ink">{data.totalCount}</strong>
            </span>
          )}
        </div>
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Hiển thị:</span>
            <div className="ex-tabs" role="group" aria-label="Cách hiển thị">
              <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}><ExIcon name="format_list_bulleted" /> Danh sách</button>
              <button type="button" aria-pressed={view === 'status'} onClick={() => setView('status')}>Theo trạng thái</button>
              <button type="button" aria-pressed={view === 'board'} onClick={() => setView('board')}>Bảng Kanban</button>
              {env.jiraSprintEnabled && <button type="button" aria-pressed={view === 'sprint'} onClick={() => setView('sprint')}>Sprint &amp; Backlog</button>}
            </div>
          </div>
        </div>
      </div>
      <form onSubmit={apply}>
        <div className="ex-filters"><label className="ex-filter-search">Tìm công việc<input value={draft.search} onChange={event => setDraft({ ...draft, search: event.target.value })} placeholder="Tên công việc…" /></label>
          <label>Trạng thái<select value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value })}><option value="">Tất cả</option>{statuses.map(value => <option key={value} value={value}>{taskStatusLabel(value)}</option>)}</select></label>
          {members.length > 0 && <label>Người phụ trách<select value={draft.assignee} onChange={event => setDraft({ ...draft, assignee: event.target.value })}><option value="">Cả nhóm</option>{members.map(member => <option key={member.userId} value={member.userId}>{member.fullName}</option>)}</select></label>}
          <button className="ex-button" type="submit">Áp dụng</button><button className="ex-text-button" type="button" aria-expanded={advanced} onClick={() => setAdvanced(value => !value)}>Bộ lọc khác</button>
        </div>
        {advanced && <div className="ex-filters">{showMajorFilter && <><label>Ngành<select value={draft.major} onChange={event => setDraft({ ...draft, major: event.target.value })}><option value="">Tất cả ngành</option>{project.majors.map(item => <option key={item.id} value={item.majorId}>{item.majorName}</option>)}</select></label><label>Vai trò ngành<select value={draft.role} onChange={event => setDraft({ ...draft, role: event.target.value })}><option value="">Tất cả vai trò</option>{disciplineRoles.map(value => <option key={value} value={value}>{disciplineRoleLabels[value]}</option>)}</select></label></>}<label>Mốc đồ án<select value={draft.milestone} onChange={event => setDraft({ ...draft, milestone: event.target.value })}><option value="">Tất cả mốc</option>{milestones.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>Mức ưu tiên<select value={draft.priority} onChange={event => setDraft({ ...draft, priority: event.target.value })}><option value="">Tất cả mức</option>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="ex-filter-check"><input type="checkbox" checked={draft.overdue} onChange={event => setDraft({ ...draft, overdue: event.target.checked })} />Chỉ việc quá hạn</label><button className="ex-text-button" type="button" onClick={() => setParams({})}>Xóa bộ lọc</button></div>}
      </form>
      {view === 'sprint' ? <SprintBacklogPanel projectId={project.id} routeBase={routeBase} canManage={canCreate} /> : loading ? <ExState loading /> : error ? <ExState message={error} retry={refresh} /> : data && <>
        {!data.items.length ? <ExState title="Không có công việc phù hợp" message="Thử đổi bộ lọc hoặc tạo công việc mới cho nhóm." /> : <>
          {view === 'board' ? <><p className="ex-muted ex-padding">{access.readOnly ? 'Bảng công việc chỉ xem; nhấn vào thẻ để xem chi tiết.' : 'Kéo thả thẻ công việc giữa các cột để chuyển trạng thái nhanh, hoặc nhấn vào thẻ để xem chi tiết.'} Chỉ hiển thị công việc trên trang hiện tại.</p><section className="task-board-scroll" aria-label="Bảng công việc theo trang" tabIndex={0}>{statuses.map(value => <section data-status={value} className={`task-board-column ${dragOverColumn === value ? 'is-drag-over' : ''} ${value === 'IN_PROGRESS' ? 'task-board-column--in-progress' : ''}`} key={value} aria-label={taskStatusLabel(value)}
            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOverColumn !== value) setDragOverColumn(value) }}
            onDragLeave={e => { if (e.currentTarget.contains(e.relatedTarget as Node)) return; if (dragOverColumn === value) setDragOverColumn(null) }}
            onDrop={e => { e.preventDefault(); void handleDropOnColumn(value) }}>
            <h2>{taskStatusLabel(value)} <span className="text-xs font-normal text-ink-muted">({data.items.filter(task => task.status === value).length} trên trang này)</span></h2>
            <ul>{data.items.filter(task => task.status === value).map(task => (
              <li
                key={task.id}
                draggable={!savingStatus && !access.readOnly}
                onDragStart={e => {
                  e.dataTransfer.setData('text/plain', String(task.id))
                  e.dataTransfer.effectAllowed = 'move'
                  dragActive.current = true
                  setDraggingTaskId(task.id)
                }}
                onDragEnd={() => {
                  setDraggingTaskId(null)
                  setDragOverColumn(null)
                  setTimeout(() => { dragActive.current = false }, 120)
                }}
                className={draggingTaskId === task.id ? 'is-card-dragging' : ''}
              >
                <Link
                  className="task-board-card"
                  to={`${routeBase}/tasks/${task.id}`}
                  state={{ taskListSearch: params.toString() }}
                  onClick={e => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey) return
                    e.preventDefault()
                    if (!dragActive.current) openTaskDetail(task.id)
                  }}
                >
                  <small>#{task.id} · {priorityLabels[task.priority ?? ''] ?? 'Chưa có ưu tiên'}</small>
                  <strong>{task.title}</strong>
                  {(task.storyPoints != null || (task.labels?.length ?? 0) > 0) && (
                    <span className="task-card-chips">
                      {task.storyPoints != null && (
                        <span className="sprint-point-badge" aria-label={`${task.storyPoints} điểm`}>{task.storyPoints}</span>
                      )}
                      {(task.labels ?? []).map(label => (
                        <span key={label} className="sprint-label-chip">{label}</span>
                      ))}
                    </span>
                  )}
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="task-card-assignees flex items-center -space-x-1">
                      {task.assignees.length > 0 ? (
                        task.assignees.map(person => (
                          <span
                            key={person.userId}
                            className="task-assignee-avatar"
                            title={person.userFullName}
                          >
                            {person.userFullName.trim().split(' ').pop()?.slice(0, 2).toUpperCase() || 'U'}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-ink-muted italic">Chưa phân công</span>
                      )}
                    </span>
                    <span className={`text-xs ${isOverdue({ ...task, assignees: [] }, observedAt) ? 'font-bold text-status-error-text' : 'text-ink-muted'}`}>
                      {dateLabel(task.dueAt)}
                    </span>
                  </div>
                  <span className="sr-only">{task.assignees.map(person => person.userFullName).join(', ') || 'Chưa phân công'}</span>
                </Link>
              </li>
            ))}</ul>{!data.items.some(task => task.status === value) && <p className="ex-muted">Không có việc trên trang này.</p>}</section>)}</section></> : <><div className="ex-task-list-heading" aria-hidden="true"><span>Công việc / mốc đồ án</span><span>Người phụ trách</span><span>Trạng thái</span><span>Hạn hoàn thành</span></div>
          {view === 'list' ? <ul>{data.items.map(task => <TaskRow key={task.id} task={task} routeBase={routeBase} milestones={milestones} listSearch={params.toString()} onSelect={openTaskDetail} />)}</ul>
            : statuses.filter(value => data.items.some(task => task.status === value)).map(value => <div key={value}><h2 className="ex-group-heading">{taskStatusLabel(value)} <span className="ex-muted">· {data.items.filter(task => task.status === value).length} việc trên trang này</span></h2><ul>{data.items.filter(task => task.status === value).map(task => <TaskRow key={task.id} task={task} routeBase={routeBase} milestones={milestones} listSearch={params.toString()} onSelect={openTaskDetail} />)}</ul></div>)}</>}
        </>}
        <ExPagination page={page} pages={data.totalPages} total={data.totalCount} onPage={nextPage => { const next = new URLSearchParams(params); next.set('page', String(nextPage)); setParams(next) }} />
      </>}
    </section>

    {/* Task Detail Modal - opens centered over Kanban board without leaving board context */}
    {modalTaskId && (
      <TaskDetailModal
        key={`${project.id}:${modalTaskId}`}
        taskId={modalTaskId}
        onClose={closeTaskDetail}
        onTaskUpdated={refresh}
      />
    )}
  </ExecutionPage>
}
function TaskRow({ task, routeBase, milestones, listSearch, onSelect }: { task: TaskDto; routeBase: string; milestones: MilestoneDto[]; listSearch: string; onSelect?: (id: number) => void }) {
  const overdue = isOverdue({ ...task, assignees: [] }, Date.now())
  return <li><Link className="ex-task-row" to={`${routeBase}/tasks/${task.id}`} state={{ taskListSearch: listSearch }} onClick={e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return
    if (onSelect) {
      e.preventDefault()
      onSelect(task.id)
    }
  }}><span className="ex-task-title"><ExIcon name={task.status === 'DONE' ? 'check_circle' : task.status === 'BLOCKED' ? 'pause_circle' : 'radio_button_unchecked'} /><div><strong>{task.title}</strong><small>{milestones.find(item => item.id === task.milestoneId)?.title || 'Công việc của đồ án'} · Ưu tiên {priorityLabels[task.priority ?? '']?.toLowerCase() ?? 'chưa chọn'}</small></div></span>
    <span className="ex-task-assignee">{task.assignees.map(person => person.userFullName).join(', ') || 'Chưa phân công'}</span><span className="ex-task-status"><span className={`ex-badge ex-badge-${task.status}`}>{taskStatusLabel(task.status)}</span></span><span className={`ex-task-date ${overdue ? 'is-overdue' : ''}`}>{dateLabel(task.dueAt)}{overdue && <small>Quá hạn</small>}</span>
  </Link></li>
}
