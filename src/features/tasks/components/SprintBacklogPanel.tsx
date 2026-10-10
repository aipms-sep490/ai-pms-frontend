import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import * as tasksApi from '../../../services/api/tasks.api'
import { executionError } from '../../execution/execution-utils'
import type { SprintDto, TaskDto } from '../../../types/backend'
import { backlogTasks, canCompleteSprint, canStartSprint, collectLabels, parseLabels, sprintPoints, STORY_POINTS, tasksInSprint } from '../sprint-model'

/**
 * Jira-style sprint + backlog view. Self-contained: fetches its own sprints and task page.
 * Mutations go through the proposed sprint API, which the backend must implement before the
 * `jiraSprintEnabled` flag is turned on. The lifecycle invariants (one active sprint, no completing
 * with open tasks) are enforced client-side here and must be re-enforced on the server.
 */
export function SprintBacklogPanel({ projectId, routeBase }: { projectId: number; routeBase: string }) {
  const [sprints, setSprints] = useState<SprintDto[]>([])
  const [tasks, setTasks] = useState<TaskDto[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({ name: '', goal: '', startAt: '', endAt: '' })
  const [revision, setRevision] = useState(0)

  // Fetch sets state only in the async callbacks; a reload bumps `revision` from an event handler.
  useEffect(() => {
    const abort = new AbortController()
    let alive = true
    Promise.all([
      tasksApi.getProjectSprints(projectId, abort.signal),
      tasksApi.getProjectTasks(projectId, { page: 1, pageSize: 100 }, abort.signal),
    ]).then(([sprintList, taskPage]) => { if (!alive) return; setSprints(sprintList); setTasks(taskPage.items); setState('ready'); setError('') })
      .catch(reason => { if (alive && !abort.signal.aborted) { setError(executionError(reason)); setState('error') } })
    return () => { alive = false; abort.abort() }
  }, [projectId, revision])

  const reload = () => { setState('loading'); setRevision(r => r + 1) }
  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true); setError(''); setNotice('')
    try { await action(); setNotice(success); reload() }
    catch (reason) { setError(executionError(reason)) }
    finally { setBusy(false) }
  }

  const createSprint = (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) { setError('Nhập tên sprint.'); return }
    if (form.startAt && form.endAt && form.endAt < form.startAt) { setError('Ngày kết thúc không được trước ngày bắt đầu.'); return }
    void run(() => tasksApi.createSprint(projectId, { name: form.name.trim(), goal: form.goal.trim() || null, startAt: form.startAt || null, endAt: form.endAt || null }), 'Đã tạo sprint.')
      .then(() => setForm({ name: '', goal: '', startAt: '', endAt: '' }))
  }

  const labels = collectLabels(tasks)
  const planningOrActive = sprints.filter(s => s.status !== 'COMPLETED')
  const completed = sprints.filter(s => s.status === 'COMPLETED')

  if (state === 'loading') return <p role="status" className="ex-muted ex-padding">Đang tải sprint và backlog…</p>
  if (state === 'error') return <section className="ex-panel"><div className="ex-padding"><p role="alert" className="text-status-error-text">{error || 'Chưa tải được dữ liệu sprint.'}</p><button type="button" className="ex-button mt-2" onClick={reload}>Tải lại</button></div></section>

  return <div className="sprint-view">
    {notice && <p role="status" className="sprint-notice">{notice}</p>}
    {error && <p role="alert" className="sprint-error">{error}</p>}

    <form className="ex-panel sprint-create" onSubmit={createSprint}>
      <div className="ex-panel-heading"><h2>Tạo sprint</h2></div>
      <div className="ex-padding sprint-create-fields">
        <label>Tên sprint<input value={form.name} maxLength={120} required onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label>Mục tiêu<input value={form.goal} maxLength={255} onChange={e => setForm({ ...form, goal: e.target.value })} /></label>
        <label>Bắt đầu<input type="date" value={form.startAt} onChange={e => setForm({ ...form, startAt: e.target.value })} /></label>
        <label>Kết thúc<input type="date" value={form.endAt} onChange={e => setForm({ ...form, endAt: e.target.value })} /></label>
        <button type="submit" className="ex-button ex-button-primary" disabled={busy}>Tạo sprint</button>
      </div>
    </form>

    {planningOrActive.map(sprint => {
      const points = sprintPoints(tasks, sprint.id)
      const startable = canStartSprint(sprints, sprint.id)
      const completable = canCompleteSprint(sprint, tasks)
      return <section key={sprint.id} className="ex-panel sprint-card" aria-label={`Sprint ${sprint.name}`}>
        <div className="ex-panel-heading sprint-card-head">
          <div><h2>{sprint.name} <span className={`sprint-badge sprint-badge--${String(sprint.status).toLowerCase()}`}>{sprint.status === 'ACTIVE' ? 'Đang chạy' : 'Lên kế hoạch'}</span></h2>{sprint.goal && <p className="ex-muted">{sprint.goal}</p>}</div>
          <div className="sprint-card-actions">
            {sprint.status === 'PLANNING' && <button type="button" className="ex-button" disabled={busy || !startable} title={startable ? undefined : 'Đã có sprint khác đang chạy'} onClick={() => void run(() => tasksApi.updateSprintStatus(sprint.id, 'ACTIVE', sprint.concurrencyToken), `Đã bắt đầu ${sprint.name}.`)}>Bắt đầu</button>}
            {sprint.status === 'ACTIVE' && <button type="button" className="ex-button" disabled={busy || !completable} title={completable ? undefined : 'Còn công việc chưa hoàn tất hoặc hủy'} onClick={() => void run(() => tasksApi.updateSprintStatus(sprint.id, 'COMPLETED', sprint.concurrencyToken), `Đã hoàn tất ${sprint.name}.`)}>Hoàn tất</button>}
          </div>
        </div>
        <div className="ex-padding">
          <p className="sprint-points">{points.done}/{points.total} điểm hoàn thành · {points.count} công việc. <span className="ex-muted">Chưa có dữ liệu burndown theo ngày.</span></p>
          <TaskRows tasks={tasksInSprint(tasks, sprint.id)} sprints={sprints} routeBase={routeBase} busy={busy} labelOptions={labels} run={run} />
        </div>
      </section>
    })}

    <section className="ex-panel sprint-card" aria-label="Backlog">
      <div className="ex-panel-heading"><h2>Backlog</h2></div>
      <div className="ex-padding">
        <TaskRows tasks={backlogTasks(tasks)} sprints={sprints} routeBase={routeBase} busy={busy} labelOptions={labels} run={run} emptyText="Không có công việc trong backlog." />
      </div>
    </section>

    {completed.length > 0 && <section className="ex-panel"><div className="ex-panel-heading"><h2>Sprint đã hoàn tất</h2></div><ul className="ex-padding sprint-completed">{completed.map(sprint => { const points = sprintPoints(tasks, sprint.id); return <li key={sprint.id}>{sprint.name} · {points.done}/{points.total} điểm · {points.count} công việc</li> })}</ul></section>}
  </div>
}

function TaskRows({ tasks, sprints, routeBase, busy, labelOptions, run, emptyText }: {
  tasks: TaskDto[]; sprints: SprintDto[]; routeBase: string; busy: boolean; labelOptions: string[]
  run: (action: () => Promise<unknown>, success: string) => Promise<void>; emptyText?: string
}) {
  if (!tasks.length) return <p className="ex-muted">{emptyText ?? 'Chưa có công việc.'}</p>
  return <ul className="sprint-task-rows">{tasks.map(task => <TaskRow key={task.id} task={task} sprints={sprints} routeBase={routeBase} busy={busy} labelOptions={labelOptions} run={run} />)}</ul>
}

function TaskRow({ task, sprints, routeBase, busy, labelOptions, run }: {
  task: TaskDto; sprints: SprintDto[]; routeBase: string; busy: boolean; labelOptions: string[]
  run: (action: () => Promise<unknown>, success: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [points, setPoints] = useState<string>(task.storyPoints == null ? '' : String(task.storyPoints))
  const [labelsText, setLabelsText] = useState((task.labels ?? []).join(', '))
  const openSprints = sprints.filter(s => s.status !== 'COMPLETED')

  const savePlanning = () => void run(() => tasksApi.setTaskPlanning(task.id, { storyPoints: points === '' ? null : Number(points), labels: parseLabels(labelsText), concurrencyToken: task.concurrencyToken }), 'Đã cập nhật điểm và nhãn.').then(() => setEditing(false))

  return <li className="sprint-task-row">
    <div className="sprint-task-main">
      <Link className="ex-link" to={`${routeBase}/tasks/${task.id}`}>#{task.id} · {task.title}</Link>
      <div className="sprint-task-meta">
        {task.storyPoints != null && <span className="sprint-point-badge" aria-label={`${task.storyPoints} điểm`}>{task.storyPoints}</span>}
        {(task.labels ?? []).map(label => <span key={label} className="sprint-label-chip">{label}</span>)}
        <span className="ex-muted">{task.assignees.map(a => a.userFullName).join(', ') || 'Chưa phân công'}</span>
      </div>
    </div>
    <div className="sprint-task-controls">
      <label className="sprint-move"><span className="sr-only">Chuyển sprint cho công việc #{task.id}</span>
        <select value={task.sprintId ?? ''} disabled={busy} onChange={e => void run(() => tasksApi.setTaskSprint(task.id, e.target.value ? Number(e.target.value) : null, task.concurrencyToken), 'Đã chuyển công việc.')}>
          <option value="">Backlog</option>
          {openSprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <button type="button" className="ex-text-button" disabled={busy} onClick={() => setEditing(v => !v)} aria-expanded={editing}>Điểm & nhãn</button>
    </div>
    {editing && <form className="sprint-task-edit" onSubmit={e => { e.preventDefault(); savePlanning() }}>
      <fieldset disabled={busy}>
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
