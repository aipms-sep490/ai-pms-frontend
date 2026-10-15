import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import * as tasksApi from '../../../services/api/tasks.api'
import { executionError } from '../../execution/execution-utils'
import type { SprintBurndownDto, SprintCarryover, SprintDto, TaskDto } from '../../../types/backend'
import { backlogTasks, collectLabels, parseLabels, pendingTasksInSprint, sprintPoints, STORY_POINTS, tasksInSprint } from '../sprint-model'
import { loadSprintBoard } from '../sprint-board-data'
import { HttpError } from '../../../services/http/http-client'

/**
 * Jira-style sprint + backlog view. Self-contained: fetches its own sprints and task board page.
 * Mutations go through the real BE-N08 sprint contract (SprintsController); lifecycle gates
 * (`canStart`/`canComplete`/`canEdit`) come from the server per sprint, not client-side guessing.
 */
export function SprintBacklogPanel({ projectId, routeBase, canManage = false }: { projectId: number; routeBase: string; canManage?: boolean }) {
  const [sprints, setSprints] = useState<SprintDto[]>([])
  const [tasks, setTasks] = useState<TaskDto[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [busy, setBusy] = useState(false)
  const mutation = useRef(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({ name: '', startAt: '', endAt: '' })
  const [revision, setRevision] = useState(0)
  const [completingSprintId, setCompletingSprintId] = useState<number | null>(null)

  // Fetch sets state only in the async callbacks; a reload bumps `revision` from an event handler.
  useEffect(() => {
    const abort = new AbortController()
    let alive = true
    loadSprintBoard(projectId, abort.signal).then(data => { if (!alive) return; setSprints(data.sprints); setTasks(data.tasks); setState('ready') })
      .catch(reason => { if (alive && !abort.signal.aborted) { setError(reason instanceof Error && reason.message.startsWith('SPRINT_BOARD_') ? 'Board quá lớn hoặc vừa thay đổi trong lúc tải. Chưa thể xác nhận đầy đủ công việc; hãy tải lại hoặc dùng bộ lọc ở danh sách công việc.' : executionError(reason)); setState('error') } })
    return () => { alive = false; abort.abort() }
  }, [projectId, revision])

  const reload = () => { setState('loading'); setRevision(r => r + 1) }
  const run = async (action: () => Promise<unknown>, success: string) => {
    if (mutation.current || !canManage) return false
    mutation.current = true
    setBusy(true); setError(''); setNotice('')
    try { await action(); setNotice(success); reload(); return true }
    catch (reason) { setError(executionError(reason)); if (reason instanceof HttpError && reason.status === 409) { setCompletingSprintId(null); reload() } return false }
    finally { mutation.current = false; setBusy(false) }
  }

  const createSprint = (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) { setError('Nhập tên sprint.'); return }
    if (!form.startAt || !form.endAt) { setError('Chọn ngày bắt đầu và kết thúc.'); return }
    if (form.endAt <= form.startAt) { setError('Ngày kết thúc phải sau ngày bắt đầu.'); return }
    void run(async () => { const result = await tasksApi.createSprint(projectId, { name: form.name.trim(), startAt: form.startAt, endAt: form.endAt }); setForm({ name: '', startAt: '', endAt: '' }); return result }, 'Đã tạo sprint.')
  }

  const labels = collectLabels(tasks)
  const planningOrActive = sprints.filter(s => s.status !== 'COMPLETED')
  const completed = sprints.filter(s => s.status === 'COMPLETED')
  const completingSprint = completingSprintId != null ? sprints.find(s => s.id === completingSprintId) ?? null : null

  if (state === 'loading') return <p role="status" className="ex-muted ex-padding">Đang tải sprint và backlog…</p>
  if (state === 'error') return <section className="ex-panel"><div className="ex-padding"><p role="alert" className="text-status-error-text">{error || 'Chưa tải được dữ liệu sprint.'}</p><button type="button" className="ex-button mt-2" onClick={reload}>Tải lại</button></div></section>

  return <div className="sprint-view">
    {notice && <p role="status" className="sprint-notice">{notice}</p>}
    {error && <p role="alert" className="sprint-error">{error}</p>}

    {canManage && <form className="ex-panel sprint-create" onSubmit={createSprint}>
      <div className="ex-panel-heading"><h2>Tạo sprint</h2></div>
      <div className="ex-padding sprint-create-fields">
        <label>Tên sprint<input value={form.name} maxLength={120} required onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label>Bắt đầu<input type="date" value={form.startAt} required onChange={e => setForm({ ...form, startAt: e.target.value })} /></label>
        <label>Kết thúc<input type="date" value={form.endAt} required onChange={e => setForm({ ...form, endAt: e.target.value })} /></label>
        <button type="submit" className="ex-button ex-button-primary" disabled={busy}>Tạo sprint</button>
      </div>
    </form>}

    {planningOrActive.map(sprint => <SprintCard
      key={sprint.id} sprint={sprint} tasks={tasks} sprints={sprints} routeBase={routeBase} busy={busy || !canManage} labelOptions={labels}
      run={run} onRequestComplete={() => setCompletingSprintId(sprint.id)}
    />)}

    <section className="ex-panel sprint-card" aria-label="Backlog">
      <div className="ex-panel-heading"><h2>Backlog</h2></div>
      <div className="ex-padding">
        <TaskRows tasks={backlogTasks(tasks)} sprints={sprints} routeBase={routeBase} busy={busy || !canManage} labelOptions={labels} run={run} emptyText="Không có công việc trong backlog." />
      </div>
    </section>

    {completed.length > 0 && <section className="ex-panel"><div className="ex-panel-heading"><h2>Sprint đã hoàn tất</h2></div><ul className="ex-padding sprint-completed">{completed.map(sprint => { const points = sprintPoints(tasks, sprint.id); return <li key={sprint.id}>{sprint.name} · {points.done}/{points.total} điểm · {points.count} công việc</li> })}</ul></section>}

    {completingSprint && <CompleteSprintDialog
      sprint={completingSprint} openTasks={pendingTasksInSprint(tasks, completingSprint.id)}
      otherSprints={planningOrActive.filter(s => s.id !== completingSprint.id && s.status === 'PLANNED')} busy={busy}
      onCancel={() => setCompletingSprintId(null)}
      onConfirm={carryover => void run(() => tasksApi.completeSprint(projectId, completingSprint.id, completingSprint.concurrencyToken, carryover), `Đã hoàn tất ${completingSprint.name}.`).then(saved => { if (saved) setCompletingSprintId(null) })}
    />}
  </div>
}

function SprintCard({ sprint, tasks, sprints, routeBase, busy, labelOptions, run, onRequestComplete }: {
  sprint: SprintDto; tasks: TaskDto[]; sprints: SprintDto[]; routeBase: string; busy: boolean; labelOptions: string[]
  run: (action: () => Promise<unknown>, success: string) => Promise<boolean>; onRequestComplete: () => void
}) {
  const points = sprintPoints(tasks, sprint.id)
  const [burndown, setBurndown] = useState<SprintBurndownDto | null>(null)
  const projectIdForBurndown = sprint.projectId

  useEffect(() => {
    const abort = new AbortController()
    tasksApi.getSprintBurndown(projectIdForBurndown, sprint.id, abort.signal)
      .then(data => { if (!abort.signal.aborted) setBurndown(data) })
      .catch(() => { if (!abort.signal.aborted) setBurndown(null) })
    return () => abort.abort()
  }, [projectIdForBurndown, sprint.id])

  return <section className="ex-panel sprint-card" aria-label={`Sprint ${sprint.name}`}>
    <div className="ex-panel-heading sprint-card-head">
      <div><h2>{sprint.name} <span className={`sprint-badge sprint-badge--${String(sprint.status).toLowerCase()}`}>{sprint.status === 'ACTIVE' ? 'Đang chạy' : 'Lên kế hoạch'}</span></h2></div>
      <div className="sprint-card-actions">
        {sprint.status === 'PLANNED' && <button type="button" className="ex-button" disabled={busy || !sprint.canStart} title={sprint.canStart ? undefined : 'Chưa thể bắt đầu sprint này'} onClick={() => void run(() => tasksApi.startSprint(sprint.projectId, sprint.id, sprint.concurrencyToken), `Đã bắt đầu ${sprint.name}.`)}>Bắt đầu</button>}
        {sprint.status === 'ACTIVE' && <button type="button" className="ex-button" disabled={busy || !sprint.canComplete} title={sprint.canComplete ? undefined : 'Chưa thể hoàn tất sprint này'} onClick={onRequestComplete}>Hoàn tất</button>}
      </div>
    </div>
    <div className="ex-padding">
      <p className="sprint-points">{points.done}/{points.total} điểm hoàn thành · {points.count} công việc.</p>
      <BurndownSummary burndown={burndown} />
      <TaskRows tasks={tasksInSprint(tasks, sprint.id)} sprints={sprints} routeBase={routeBase} busy={busy} labelOptions={labelOptions} run={run} />
    </div>
  </section>
}

function BurndownSummary({ burndown }: { burndown: SprintBurndownDto | null }) {
  if (!burndown || burndown.points.length === 0) return <p className="ex-muted">Chưa có dữ liệu burndown theo ngày.</p>
  const latest = burndown.points[burndown.points.length - 1]
  return <div className="sprint-burndown">
    <p className="ex-muted">
      Burndown: còn {latest.remainingPoints}/{latest.scopePoints} điểm{latest.unestimatedTasks > 0 ? ` · ${latest.unestimatedTasks} việc chưa ước lượng` : ''}
      {burndown.complete ? ' · Đã hoàn tất' : ''}
    </p>
    <ul className="sprint-burndown-points">
      {burndown.points.map(point => <li key={point.at}>{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(new Date(point.at))}: {point.remainingPoints}/{point.scopePoints}</li>)}
    </ul>
  </div>
}

function CompleteSprintDialog({ sprint, openTasks, otherSprints, busy, onCancel, onConfirm }: {
  sprint: SprintDto; openTasks: TaskDto[]; otherSprints: SprintDto[]; busy: boolean
  onCancel: () => void; onConfirm: (carryover: SprintCarryover[]) => void
}) {
  const [targets, setTargets] = useState<Record<number, string>>({})

  const confirm = () => {
    const carryover: SprintCarryover[] = openTasks.map(task => ({
      taskId: task.id,
      targetSprintId: targets[task.id] ? Number(targets[task.id]) : null,
      taskConcurrencyToken: task.concurrencyToken ?? '',
    }))
    onConfirm(carryover)
  }

  return <div className="ex-panel sprint-complete-dialog" role="dialog" aria-label={`Hoàn tất sprint ${sprint.name}`}>
    <div className="ex-panel-heading"><h2>Hoàn tất {sprint.name}</h2></div>
    <div className="ex-padding">
      {openTasks.length === 0 && <p className="ex-muted">Không còn công việc nào đang mở trong sprint này.</p>}
      {openTasks.length > 0 && <>
        <p>Chọn nơi chuyển các công việc chưa hoàn tất trước khi đóng sprint:</p>
        <ul className="sprint-carryover-list">
          {openTasks.map(task => <li key={task.id}>
            <span>#{task.id} · {task.title}</span>
            <label><span className="sr-only">Chuyển công việc #{task.id} đến</span>
              <select value={targets[task.id] ?? ''} disabled={busy} onChange={e => setTargets({ ...targets, [task.id]: e.target.value })}>
                <option value="">Backlog</option>
                {otherSprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          </li>)}
        </ul>
      </>}
      <div className="sprint-task-edit-actions">
        <button type="button" className="ex-button ex-button-primary" disabled={busy} onClick={confirm}>Xác nhận hoàn tất</button>
        <button type="button" className="ex-button" disabled={busy} onClick={onCancel}>Hủy</button>
      </div>
    </div>
  </div>
}

function TaskRows({ tasks, sprints, routeBase, busy, labelOptions, run, emptyText }: {
  tasks: TaskDto[]; sprints: SprintDto[]; routeBase: string; busy: boolean; labelOptions: string[]
  run: (action: () => Promise<unknown>, success: string) => Promise<boolean>; emptyText?: string
}) {
  if (!tasks.length) return <p className="ex-muted">{emptyText ?? 'Chưa có công việc.'}</p>
  return <ul className="sprint-task-rows">{tasks.map(task => <TaskRow key={task.id} task={task} sprints={sprints} routeBase={routeBase} busy={busy} labelOptions={labelOptions} run={run} />)}</ul>
}

function TaskRow({ task, sprints, routeBase, busy, labelOptions, run }: {
  task: TaskDto; sprints: SprintDto[]; routeBase: string; busy: boolean; labelOptions: string[]
  run: (action: () => Promise<unknown>, success: string) => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const [points, setPoints] = useState<string>(task.storyPoints == null ? '' : String(task.storyPoints))
  const [labelsText, setLabelsText] = useState((task.labels ?? []).join(', '))
  const openSprints = sprints.filter(s => s.status !== 'COMPLETED')
  const readOnly = busy || task.status === 'CANCELLED'

  const saveBoard = (overrides: { sprintId?: number | null; storyPoints?: number | null; labels?: string[] }) =>
    run(() => tasksApi.saveTaskBoard(task.id, {
      sprintId: 'sprintId' in overrides ? overrides.sprintId : task.sprintId,
      storyPoints: 'storyPoints' in overrides ? overrides.storyPoints : task.storyPoints,
      labels: overrides.labels ?? (task.labels ?? []),
      concurrencyToken: task.concurrencyToken,
    }), 'sprintId' in overrides ? 'Đã chuyển công việc.' : 'Đã cập nhật điểm và nhãn.')

  const savePlanning = () => void saveBoard({ storyPoints: points === '' ? null : Number(points), labels: parseLabels(labelsText) }).then(saved => { if (saved) setEditing(false) })

  return <li className="sprint-task-row">
    <div className="sprint-task-main">
      <Link className="ex-link" to={`${routeBase}/tasks/${task.id}`}>#{task.taskCode ?? task.id} · {task.title}</Link>
      <div className="sprint-task-meta">
        {task.storyPoints != null && <span className="sprint-point-badge" aria-label={`${task.storyPoints} điểm`}>{task.storyPoints}</span>}
        {(task.labels ?? []).map(label => <span key={label} className="sprint-label-chip">{label}</span>)}
        <span className="ex-muted">{task.assignees.map(a => a.userFullName).join(', ') || 'Chưa phân công'}</span>
      </div>
    </div>
    <div className="sprint-task-controls">
      <label className="sprint-move"><span className="sr-only">Chuyển sprint cho công việc #{task.id}</span>
        <select value={task.sprintId ?? ''} disabled={readOnly} onChange={e => void saveBoard({ sprintId: e.target.value ? Number(e.target.value) : null })}>
          <option value="">Backlog</option>
          {openSprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <button type="button" className="ex-text-button" disabled={readOnly} onClick={() => setEditing(v => !v)} aria-expanded={editing}>Điểm & nhãn</button>
    </div>
    {editing && <form className="sprint-task-edit" onSubmit={e => { e.preventDefault(); savePlanning() }}>
      <fieldset disabled={readOnly}>
        <div className="sprint-point-picker" role="group" aria-label="Chọn điểm story">
          {STORY_POINTS.map(value => <button type="button" key={value} aria-pressed={points === String(value)} className={points === String(value) ? 'sprint-point-option sprint-point-option--on' : 'sprint-point-option'} onClick={() => setPoints(String(value))}>{value}</button>)}
          <button type="button" className="sprint-point-option" onClick={() => setPoints('')}>Xóa</button>
        </div>
        <label>Nhãn (phân tách bằng dấu phẩy)<input list={`sprint-labels-${task.id}`} value={labelsText} onChange={e => setLabelsText(e.target.value)} /></label>
        <datalist id={`sprint-labels-${task.id}`}>{labelOptions.map(label => <option key={label} value={label} />)}</datalist>
        <div className="sprint-task-edit-actions"><button type="submit" className="ex-button ex-button-primary">Lưu</button><button type="button" className="ex-button" onClick={() => setEditing(false)}>Hủy</button></div>
      </fieldset>
    </form>}
  </li>
}
