import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { services } from '../../../services/service-gateway'
import { HttpError } from '../../../services/http/http-client'
import type { BackendTaskStatus, MilestoneDto, TaskDto } from '../../../types/backend'

const columns: BackendTaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW', 'DONE', 'CANCELLED']

export function TaskBoardPage() {
  const { project } = useStudentJourney()
  const [tasks, setTasks] = useState<TaskDto[]>([])
  const [milestones, setMilestones] = useState<MilestoneDto[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<HttpError | null>(null)
  const load = async () => {
    if (!project) return
    setLoading(true); setError(null)
    try {
      const [taskPage, milestoneItems] = await Promise.all([
        services.task.getProjectTasks(project.id, { search: search.trim() || undefined, page: 1, pageSize: 100 }),
        services.milestone.getProjectMilestones(project.id),
      ])
      setTasks(taskPage.items); setMilestones(milestoneItems)
    }
    catch (reason) { setError(reason instanceof HttpError ? reason : new HttpError('Không thể tải Task.', 500)) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [project?.id]) // search is applied explicitly to avoid client-side authority/filtering
  const grouped = useMemo(() => Object.fromEntries(columns.map((status) => [status, tasks.filter((task) => task.status === status)])) as Record<BackendTaskStatus, TaskDto[]>, [tasks])
  if (loading) return <State message="Đang tải Task từ Backend…" />
  if (error) return <State error message={error.status === 403 ? 'Backend không cấp quyền xem Task của Project này.' : error.message} retry={load} />
  return <main className="mx-auto flex max-w-7xl flex-col gap-5 pb-12"><header><h1 className="text-2xl font-bold">Task Board</h1><p className="mt-1 text-sm text-slate-600">Trạng thái và dữ liệu đều do Backend trả về; Evidence/Comment chưa có contract.</p></header><form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void load() }}><input aria-label="Tìm kiếm task" value={search} onChange={(event) => setSearch(event.target.value)} className="rounded border px-3 py-2 text-sm" placeholder="Tìm task"/><button className="rounded bg-slate-900 px-3 py-2 text-xs font-bold text-white">Lọc</button></form><CreateTask milestones={milestones} onCreated={load} />{tasks.length === 0 ? <section className="rounded-2xl border bg-white p-8 text-sm text-slate-600">Backend chưa trả Task nào cho Project ACTIVE này.</section> : <div className="grid gap-4 xl:grid-cols-6">{columns.map((status) => <section key={status} className="rounded-xl border bg-slate-50 p-3"><h2 className="text-xs font-bold">{status} · {grouped[status].length}</h2><div className="mt-3 space-y-2">{grouped[status].map((task) => <Link key={task.id} to={`/project/tasks/${task.id}`} className="block rounded-lg border bg-white p-3 text-xs hover:border-blue-400"><strong>{task.title}</strong><p className="mt-1 text-slate-500">{task.priority ?? 'Không ưu tiên'} · {task.dueAt ?? 'Chưa có hạn'}</p></Link>)}</div></section>)}</div>}<EvidenceBoundary /></main>
}

function CreateTask({ milestones, onCreated }: { milestones: MilestoneDto[]; onCreated: () => Promise<void> }) {
  const [milestoneId, setMilestoneId] = useState(''); const [title, setTitle] = useState(''); const [error, setError] = useState('')
  if (milestones.length === 0) return <p className="text-xs text-slate-500">Không thể tạo Task cho đến khi Backend trả về milestone.</p>
  return <form className="flex flex-wrap gap-2 rounded-xl border bg-white p-4" onSubmit={(event) => { event.preventDefault(); const selected = Number(milestoneId); if (!Number.isInteger(selected)) { setError('Chọn milestone do Backend trả về.'); return }; void services.task.createTask({ milestoneId: selected, title, assigneeUserIds: [] }).then(onCreated).then(() => { setTitle(''); setError('') }).catch((reason: unknown) => setError(reason instanceof HttpError ? reason.message : 'Không thể tạo Task.')) }}><strong className="self-center text-sm">Tạo Task</strong><select aria-label="Milestone cho task" value={milestoneId} onChange={(event) => setMilestoneId(event.target.value)} required className="rounded border px-2"><option value="">Chọn milestone</option>{milestones.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><input aria-label="Tên task" required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Tên task" className="rounded border px-2"/><button className="rounded bg-blue-700 px-3 py-2 text-xs font-bold text-white">Tạo</button>{error ? <span role="alert" className="self-center text-xs text-rose-700">{error}</span> : null}</form>
}

function State({ message, error, retry }: { message: string; error?: boolean; retry?: () => Promise<void> }) { return <section role={error ? 'alert' : 'status'} className={`mx-auto max-w-3xl rounded-2xl border p-5 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'bg-white'}`}>{message}{retry ? <button onClick={() => void retry()} className="ml-3 font-bold underline">Tải lại</button> : null}</section> }
export function EvidenceBoundary() { return <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950"><strong>BLOCKED_BY_BE_CONTRACT — Evidence & Comment</strong><p className="mt-1">Cần TaskEvidence tham chiếu file/version được ủy quyền, actor/timestamp, quyền task/project, list/create/remove; và TaskComment list/create với actor/timestamp cùng audit/history. Frontend không lưu cục bộ hoặc thay thế bằng Deliverable.</p></section> }
