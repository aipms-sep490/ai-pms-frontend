import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { FilterToolbar } from '../../../components/ui/FilterToolbar'
import type { FilterChipItem } from '../../../components/ui/FilterChips'
import { Modal } from '../../../components/ui/Modal'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { ExecutionPage, ExIcon, ExPagination, ExState } from '../../execution/execution-ui'
import { executionError, priorityLabels, taskTransitions } from '../../execution/execution-utils'
import { services } from '../../../services/service-gateway'
import type { BackendTaskStatus, MilestoneDto, PagedResult, TaskDto } from '../../../types/backend'
import { dateLabel, isOverdue, taskStatusLabel, utcTimestamp } from '../../projects/utils/collaboration-workspace'
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
const priorityWeight: Record<string, number> = { CRITICAL: 4, URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
const positiveId = (value: string | null) => { const id = Number(value); return Number.isSafeInteger(id) && id > 0 ? id : undefined }

type TaskViewMode = 'list' | 'status' | 'board' | 'sprint'
type TaskSortMode = 'default' | 'due_asc' | 'priority_desc' | 'updated_desc'

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
  const rawView = params.get('view')
  const view: TaskViewMode = rawView === 'status' || rawView === 'board' || (rawView === 'sprint' && env.jiraSprintEnabled) ? rawView : 'list'
  const [sortBy, setSortBy] = useState<TaskSortMode>('default')
  const dragActive = useRef(false)

  const setView = (nextView: TaskViewMode) => {
    const next = new URLSearchParams(params)
    if (nextView === 'list') next.delete('view')
    else next.set('view', nextView)
    setParams(next)
  }

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

  const [creating, setCreating] = useState(false)
  useEffect(() => {
    const incoming = readActionDraft(location.state?.assistantDraft, project.id, 'TASK')
    if (canCreate && incoming) {
      setAssistantDraft({ ...incoming, draftKey: location.key, projectId: project.id })
      setCreating(true)
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

    statusPending.current = true
    setSavingStatus(true)
    setDragNotice('Đang cập nhật trạng thái công việc…')

    try {
      await services.task.updateTaskStatus(currentTask.id, {
        newStatus: targetStatus,
        reason: null,
        concurrencyToken: currentTask.concurrencyToken,
      })
      refresh()
      setDragNotice(`Đã chuyển "${currentTask.title}" sang "${taskStatusLabel(targetStatus)}".`)
      setTimeout(() => setDragNotice(null), 3000)
    } catch (err) {
      setDragNotice(executionError(err, 'cập nhật trạng thái'))
      setTimeout(() => setDragNotice(null), 5000)
    } finally {
      statusPending.current = false
      setSavingStatus(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    services.task.getProjectTasks(project.id, {
      page,
      pageSize: 12,
      search: search.trim() || undefined,
      assigneeUserId,
      milestoneId,
      status: status || undefined,
      priority: priority || undefined,
      isOverdue: overdue || undefined,
      majorId,
      disciplineRole,
    }, controller.signal)
      .then(next => { if (!controller.signal.aborted) { setData(next); setObservedAt(Date.now()) } })
      .catch(reason => { if (!controller.signal.aborted) setError(executionError(reason, 'tải công việc')) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [project.id, page, search, assigneeUserId, milestoneId, status, priority, overdue, majorId, disciplineRole, revision])

  useEffect(() => {
    const controller = new AbortController()
    setMilestoneError('')
    setMilestoneLoading(true)
    setMilestones([])
    services.milestone.getProjectMilestones(project.id, controller.signal)
      .then(items => { if (!controller.signal.aborted) setMilestones(items) })
      .catch(reason => { if (!controller.signal.aborted) setMilestoneError(executionError(reason, 'tải mốc đồ án')) })
      .finally(() => { if (!controller.signal.aborted) setMilestoneLoading(false) })
    return () => controller.abort()
  }, [project.id, revision])

  const members = useMemo(() => team?.members ?? [], [team])
  const eligibleMilestones = milestones.filter(item => !['COMPLETED', 'CANCELLED'].includes(item.status))
  const refresh = () => setRevision(value => value + 1)

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    next.delete('page')
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  function clearAllFilters() {
    const next = new URLSearchParams()
    if (view !== 'list') next.set('view', view)
    setSortBy('default')
    setParams(next)
  }

  const closeCreate = () => { restoreCreateFocus.current = true; setCreating(false); setAssistantDraft(undefined) }
  useEffect(() => {
    if (!creating && restoreCreateFocus.current) { createRef.current?.focus(); restoreCreateFocus.current = false }
  }, [creating])

  const sortedItems = useMemo(() => {
    const items = data?.items ?? []
    if (sortBy === 'default') return items
    return [...items].sort((a, b) => {
      if (sortBy === 'due_asc') return utcTimestamp(a.dueAt) - utcTimestamp(b.dueAt) || a.id - b.id
      if (sortBy === 'priority_desc') return (priorityWeight[b.priority ?? ''] ?? 0) - (priorityWeight[a.priority ?? ''] ?? 0) || utcTimestamp(a.dueAt) - utcTimestamp(b.dueAt)
      if (sortBy === 'updated_desc') return utcTimestamp(b.updatedAt) - utcTimestamp(a.updatedAt) || b.id - a.id
      return 0
    })
  }, [data, sortBy])

  const activeChips = useMemo<FilterChipItem[]>(() => {
    const chips: FilterChipItem[] = []
    if (search.trim()) chips.push({ id: 'search', label: 'Từ khóa', value: search.trim() })
    if (status) chips.push({ id: 'status', label: 'Trạng thái', value: taskStatusLabel(status) })
    if (assigneeUserId) {
      const m = members.find(item => item.userId === assigneeUserId)
      chips.push({ id: 'assignee', label: 'Phụ trách', value: m?.fullName ?? 'Đã chọn' })
    }
    if (milestoneId) {
      const ms = milestones.find(item => item.id === milestoneId)
      chips.push({ id: 'milestone', label: 'Mốc', value: ms?.title ?? `#${milestoneId}` })
    }
    if (priority) chips.push({ id: 'priority', label: 'Ưu tiên', value: priorityLabels[priority] ?? priority })
    if (overdue) chips.push({ id: 'overdue', label: 'Hạn', value: 'Chỉ việc quá hạn' })
    if (majorId) {
      const mj = project.majors.find(item => item.majorId === majorId)
      chips.push({ id: 'major', label: 'Ngành', value: mj?.majorName ?? `#${majorId}` })
    }
    if (disciplineRole) chips.push({ id: 'role', label: 'Vai trò ngành', value: disciplineRoleLabels[disciplineRole] ?? disciplineRole })
    return chips
  }, [search, status, assigneeUserId, members, milestoneId, milestones, priority, overdue, majorId, project.majors, disciplineRole])

  const advancedActiveCount = Number(Boolean(milestoneId)) + Number(Boolean(priority)) + (showMajorFilter ? Number(Boolean(majorId)) + Number(Boolean(disciplineRole)) : 0)
  const hasActiveFilters = activeChips.length > 0 || sortBy !== 'default'
  const activeMember = members.find(member => member.userId === assigneeUserId)
  const pageItems = data?.items ?? []
  const inProgressCount = pageItems.filter(item => item.status === 'IN_PROGRESS' || item.status === 'IN_REVIEW').length
  const blockedOrOverdueCount = pageItems.filter(item => item.status === 'BLOCKED' || isOverdue({ ...item, assignees: [] }, observedAt)).length
  const doneCount = pageItems.filter(item => item.status === 'DONE').length

  return (
    <ExecutionPage
      title="Công việc"
      eyebrow={project.code}
      description="Xem ai đang phụ trách, việc nào cần xử lý và hạn hoàn thành."
      action={
        <>
          <button
            type="button"
            className="ex-button ex-button-icon"
            onClick={refresh}
            disabled={loading}
            aria-label="Cập nhật danh sách công việc"
            title="Cập nhật"
          >
            <ExIcon name="refresh" />
          </button>
          {canCreate && (
            <button ref={createRef} className="ex-button ex-button-primary" onClick={() => { setCreating(true); setCreated(false) }}>
              <ExIcon name="add" />Tạo công việc
            </button>
          )}
        </>
      }
    >
      {created && (
        <div className="ex-notice flex items-center justify-between" role="status">
          <span>Đã tạo công việc.</span>
          <button type="button" className="text-xs font-semibold underline ml-3" onClick={() => setCreated(false)} aria-label="Đóng thông báo">Đóng</button>
        </div>
      )}
      {dragNotice && <p className="ex-notice" role="status">{dragNotice}</p>}
      {!team && <ExState message={teamLoadError ?? 'Chưa tải được danh sách thành viên nhóm. Bạn vẫn xem được công việc nhưng chưa giao được người phụ trách.'} retry={retryTeam} />}

      {creating && (
        <Modal open drawer title="Tạo công việc mới" description="Phân công đầu việc, mốc thời gian và mức ưu tiên cho nhóm." onClose={closeCreate}>
          {milestoneLoading ? (
            <ExState loading />
          ) : milestoneError ? (
            <ExState message={milestoneError} retry={refresh} />
          ) : eligibleMilestones.length ? (
            <WorkspaceTaskForm
              key={`${project.id}:${assistantDraft?.draftKey ?? 'manual'}`}
              initialDraft={assistantDraft?.projectId === project.id ? assistantDraft : undefined}
              project={project}
              members={members}
              milestones={eligibleMilestones}
              onCancel={closeCreate}
              onCreated={() => { closeCreate(); setCreated(true); refresh() }}
            />
          ) : (
            <ExState
              title="Cần có mốc đồ án đang thực hiện"
              message="Tạo một mốc trước khi thêm công việc cho nhóm."
              action={<Link className="ex-button" to={`${routeBase}/milestones`}>Quản lý mốc đồ án</Link>}
            />
          )}
        </Modal>
      )}

      {view !== 'sprint' && (
        <div className="mb-5">
          <StatTileRow
            tiles={[
              { icon: 'assignment', label: 'Tổng công việc', value: data ? data.totalCount : null, caption: 'Toàn bộ phạm vi bộ lọc hiện tại', hero: true },
              { icon: 'pending_actions', label: 'Đang thực hiện', value: data ? inProgressCount : null, caption: 'Đang làm và chờ kiểm tra trên trang này', tone: 'info' },
              { icon: 'warning', label: 'Quá hạn / Bị chặn', value: data ? blockedOrOverdueCount : null, caption: 'Cần ưu tiên tháo gỡ trên trang này', tone: blockedOrOverdueCount > 0 ? 'danger' : 'neutral' },
              { icon: 'task_alt', label: 'Hoàn tất', value: data ? doneCount : null, caption: 'Hoàn thành trên trang hiện tại', tone: 'success' },
            ]}
          />
        </div>
      )}

      <section className="ex-panel task-board-panel" aria-label="Danh sách công việc">
        <div className="ex-toolbar task-board-top-strip">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="ex-tabs" role="group" aria-label="Cách hiển thị">
              <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}><ExIcon name="format_list_bulleted" />Danh sách</button>
              <button type="button" aria-pressed={view === 'status'} onClick={() => setView('status')}><ExIcon name="view_agenda" />Theo trạng thái</button>
              <button type="button" aria-pressed={view === 'board'} onClick={() => setView('board')}><ExIcon name="view_kanban" />Bảng Kanban</button>
              {env.jiraSprintEnabled && <button type="button" aria-pressed={view === 'sprint'} onClick={() => setView('sprint')}><ExIcon name="sprint" />Kế hoạch Sprint</button>}
            </div>
            {view !== 'sprint' && access.actor === 'student' && currentUserId && (
              <div className="ex-tabs" role="group" aria-label="Phạm vi công việc">
                <button type="button" aria-pressed={!assigneeUserId} onClick={() => updateParam('assignee', '')}>Cả nhóm</button>
                <button type="button" aria-pressed={assigneeUserId === currentUserId} onClick={() => updateParam('assignee', String(currentUserId))}>Của tôi</button>
              </div>
            )}
            {view !== 'sprint' && assigneeUserId && assigneeUserId !== currentUserId && (
              <span className="text-xs font-medium text-ink-soft inline-flex items-center gap-1.5">
                <span>{activeMember?.fullName ?? 'Thành viên đã chọn'}</span>
                <button type="button" className="ex-text-button text-xs underline" onClick={() => updateParam('assignee', '')}>Bỏ lọc</button>
              </span>
            )}
          </div>
          {view !== 'sprint' && data && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted tabular-nums">
              {data.items.length > 0 && (
                <div className="inline-flex items-center gap-2" aria-label="Tổng quan tiến trình công việc">
                  <span>Tiến độ trang:</span>
                  <div className="flex h-1.5 w-20 overflow-hidden rounded-full bg-hairline">
                    <div style={{ width: `${(data.items.filter(t => t.status === 'DONE').length / data.items.length) * 100}%` }} className="bg-primary transition-all" />
                    <div style={{ width: `${(data.items.filter(t => t.status === 'IN_REVIEW').length / data.items.length) * 100}%` }} className="bg-status-warning-text transition-all" />
                    <div style={{ width: `${(data.items.filter(t => t.status === 'BLOCKED').length / data.items.length) * 100}%` }} className="bg-status-error-text transition-all" />
                  </div>
                  <span className="rounded-full bg-primary-subtle px-2 py-0.5 font-bold text-primary">
                    {Math.round((data.items.filter(t => t.status === 'DONE').length / data.items.length) * 100)}%
                  </span>
                </div>
              )}
              <span>
                Tổng số công việc: <strong className="text-ink">{data.totalCount}</strong>
              </span>
            </div>
          )}
        </div>

        {view !== 'sprint' && (
          <FilterToolbar
            embedded
            search={search}
            onSearchChange={(val) => updateParam('search', val.trim())}
            searchLabel="Tìm công việc"
            searchPlaceholder="Tìm theo tên công việc…"
            controls={
              <>
                <select aria-label="Trạng thái" value={status} onChange={(e) => updateParam('status', e.target.value)}>
                  <option value="">Mọi trạng thái</option>
                  {statuses.map(value => <option key={value} value={value}>{taskStatusLabel(value)}</option>)}
                </select>
                {members.length > 0 && (
                  <select aria-label="Người phụ trách" value={String(assigneeUserId ?? '')} onChange={(e) => updateParam('assignee', e.target.value)}>
                    <option value="">Mọi thành viên</option>
                    {members.map(member => <option key={member.userId} value={member.userId}>{member.fullName}</option>)}
                  </select>
                )}
                <button
                  type="button"
                  className={`ft-btn ${overdue ? 'is-active' : ''}`}
                  aria-pressed={overdue}
                  onClick={() => updateParam('overdue', overdue ? '' : 'true')}
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">schedule</span>
                  <span>Quá hạn</span>
                </button>
              </>
            }
            sort={{
              value: sortBy,
              onChange: (value) => setSortBy(value as TaskSortMode),
              options: [
                { value: 'default', label: 'Mặc định' },
                { value: 'due_asc', label: 'Hạn gần nhất' },
                { value: 'priority_desc', label: 'Ưu tiên cao nhất' },
                { value: 'updated_desc', label: 'Mới cập nhật' },
              ],
            }}
            advancedControls={
              <>
                <label>Mốc đồ án
                  <select aria-label="Mốc đồ án" value={String(milestoneId ?? '')} onChange={(e) => updateParam('milestone', e.target.value)}>
                    <option value="">Tất cả mốc</option>
                    {milestones.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
                  </select>
                </label>
                <label>Mức ưu tiên
                  <select aria-label="Mức ưu tiên" value={priority} onChange={(e) => updateParam('priority', e.target.value)}>
                    <option value="">Mọi ưu tiên</option>
                    {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                {showMajorFilter && (
                  <>
                    <label>Ngành
                      <select aria-label="Ngành" value={String(majorId ?? '')} onChange={(e) => updateParam('major', e.target.value)}>
                        <option value="">Tất cả ngành</option>
                        {project.majors.map(item => <option key={item.id} value={item.majorId}>{item.majorName}</option>)}
                      </select>
                    </label>
                    <label>Vai trò ngành
                      <select aria-label="Vai trò ngành" value={disciplineRole ?? ''} onChange={(e) => updateParam('role', e.target.value)}>
                        <option value="">Tất cả vai trò</option>
                        {disciplineRoles.map(value => <option key={value} value={value}>{disciplineRoleLabels[value]}</option>)}
                      </select>
                    </label>
                  </>
                )}
              </>
            }
            advancedActiveCount={advancedActiveCount}
            activeChips={activeChips}
            onRemoveChip={(chipId) => updateParam(chipId, '')}
            hasActiveFilters={hasActiveFilters}
            onClearAll={clearAllFilters}
            resultSummary={hasActiveFilters && data ? `Hiển thị ${sortedItems.length} / ${data.totalCount} công việc` : undefined}
          />
        )}

        {view === 'sprint' ? (
          <SprintBacklogPanel projectId={project.id} routeBase={routeBase} canManage={canCreate} />
        ) : loading ? (
          <ExState loading />
        ) : error ? (
          <ExState message={error} retry={refresh} />
        ) : data && (
          <>
            {!sortedItems.length ? (
              <ExState
                title="Không có công việc phù hợp"
                message="Thử đổi bộ lọc hoặc tạo công việc mới cho nhóm."
                action={hasActiveFilters ? <button type="button" className="ex-button" onClick={clearAllFilters}>Xóa bộ lọc</button> : undefined}
              />
            ) : (
              <>
                {view === 'board' ? (
                  <>
                    <p className="ex-muted ex-padding">
                      {access.readOnly ? 'Bảng công việc chỉ xem; nhấn vào thẻ để xem chi tiết.' : 'Kéo thả thẻ công việc giữa các cột để chuyển trạng thái nhanh, hoặc nhấn vào thẻ để xem chi tiết.'} Chỉ hiển thị công việc trên trang hiện tại.
                    </p>
                    <section className="task-board-scroll" aria-label="Bảng công việc theo trang" tabIndex={0}>
                      {statuses.map(value => {
                        const colTasks = sortedItems.filter(task => task.status === value)
                        return (
                          <section
                            data-status={value}
                            className={`task-board-column ${dragOverColumn === value ? 'is-drag-over' : ''} ${value === 'IN_PROGRESS' ? 'task-board-column--in-progress' : ''}`}
                            key={value}
                            aria-label={taskStatusLabel(value)}
                            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOverColumn !== value) setDragOverColumn(value) }}
                            onDragLeave={e => { if (e.currentTarget.contains(e.relatedTarget as Node)) return; if (dragOverColumn === value) setDragOverColumn(null) }}
                            onDrop={e => { e.preventDefault(); void handleDropOnColumn(value) }}
                          >
                            <h2>{taskStatusLabel(value)} <span className="text-xs font-normal text-ink-muted">({colTasks.length} trên trang này)</span></h2>
                            <ul>
                              {colTasks.map(task => (
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
                                    <small>{priorityLabels[task.priority ?? ''] ?? 'Chưa có ưu tiên'}</small>
                                    <strong>{task.title}</strong>
                                    {(task.storyPoints != null || (task.labels?.length ?? 0) > 0) && (
                                      <span className="task-card-chips">
                                        {task.storyPoints != null && <span className="sprint-point-badge" aria-label={`${task.storyPoints} điểm`}>{task.storyPoints}</span>}
                                        {(task.labels ?? []).map(label => <span key={label} className="sprint-label-chip">{label}</span>)}
                                      </span>
                                    )}
                                    <div className="flex items-center justify-between gap-2 mt-1">
                                      <span className="task-card-assignees flex items-center -space-x-1">
                                        {task.assignees.length > 0 ? (
                                          task.assignees.map(person => (
                                            <Avatar key={person.userId} name={person.userFullName} title={person.userFullName} size="xs" shape="circle" />
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
                              ))}
                            </ul>
                            {!colTasks.length && <p className="ex-muted">Không có việc trong cột này.</p>}
                          </section>
                        )
                      })}
                    </section>
                  </>
                ) : (
                  <>
                    <div className="ex-task-list-heading" aria-hidden="true"><span>Công việc / mốc đồ án</span><span>Người phụ trách</span><span>Trạng thái</span><span>Hạn hoàn thành</span></div>
                    {view === 'list' ? (
                      <ul>{sortedItems.map(task => <TaskRow key={task.id} task={task} observedAt={observedAt} routeBase={routeBase} milestones={milestones} listSearch={params.toString()} onSelect={openTaskDetail} />)}</ul>
                    ) : (
                      statuses.filter(value => sortedItems.some(task => task.status === value)).map(value => (
                        <div key={value}>
                          <h2 className="ex-group-heading">{taskStatusLabel(value)} <span className="ex-muted">· {sortedItems.filter(task => task.status === value).length} việc</span></h2>
                          <ul>{sortedItems.filter(task => task.status === value).map(task => <TaskRow key={task.id} task={task} observedAt={observedAt} routeBase={routeBase} milestones={milestones} listSearch={params.toString()} onSelect={openTaskDetail} />)}</ul>
                        </div>
                      ))
                    )}
                  </>
                )}
              </>
            )}
            <ExPagination page={page} pages={data.totalPages} total={data.totalCount} onPage={nextPage => { const next = new URLSearchParams(params); next.set('page', String(nextPage)); setParams(next) }} />
          </>
        )}
      </section>

      {modalTaskId && (
        <TaskDetailModal
          key={`${project.id}:${modalTaskId}`}
          taskId={modalTaskId}
          onClose={closeTaskDetail}
          onTaskUpdated={refresh}
        />
      )}
    </ExecutionPage>
  )
}

function TaskRow({ task, observedAt, routeBase, milestones, listSearch, onSelect }: {
  task: TaskDto; observedAt: number; routeBase: string; milestones: MilestoneDto[]; listSearch: string; onSelect?: (id: number) => void
}) {
  const overdue = isOverdue({ ...task, assignees: [] }, observedAt)
  return (
    <li>
      <Link
        className="ex-task-row"
        to={`${routeBase}/tasks/${task.id}`}
        state={{ taskListSearch: listSearch }}
        onClick={e => {
          if (e.metaKey || e.ctrlKey || e.shiftKey) return
          if (onSelect) {
            e.preventDefault()
            onSelect(task.id)
          }
        }}
      >
        <span className="ex-task-title">
          <ExIcon name={task.status === 'DONE' ? 'check_circle' : task.status === 'BLOCKED' ? 'pause_circle' : 'radio_button_unchecked'} />
          <div>
            <strong>{task.title}</strong>
            <small>{milestones.find(item => item.id === task.milestoneId)?.title || 'Công việc của đồ án'} · Ưu tiên {priorityLabels[task.priority ?? '']?.toLowerCase() ?? 'chưa chọn'}</small>
          </div>
        </span>
        <span className="ex-task-assignee flex items-center gap-2">
          {task.assignees.length > 0 ? (
            <>
              <span className="flex items-center -space-x-1 shrink-0">
                {task.assignees.slice(0, 2).map(person => (
                  <Avatar key={person.userId} name={person.userFullName} title={person.userFullName} size="xs" shape="circle" />
                ))}
              </span>
              <span className="truncate">{task.assignees.map(person => person.userFullName).join(', ')}</span>
            </>
          ) : (
            <span className="text-ink-muted italic">Chưa phân công</span>
          )}
        </span>
        <span className="ex-task-status">
          <span className={`ex-badge ex-badge-${task.status}`}>{taskStatusLabel(task.status)}</span>
        </span>
        <span className={`ex-task-date ${overdue ? 'is-overdue' : ''}`}>
          {dateLabel(task.dueAt)}
          {overdue && <small>Quá hạn</small>}
        </span>
      </Link>
    </li>
  )
}
