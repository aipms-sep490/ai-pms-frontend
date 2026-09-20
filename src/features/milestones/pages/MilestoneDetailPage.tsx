import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { services } from '../../../services/service-gateway'
import { HttpError } from '../../../services/http/http-client'
import type { MilestoneDto, MilestoneProgressDto } from '../../../types/backend'

export function MilestoneDetailPage() {
  const { milestoneId } = useParams<{ milestoneId: string }>()
  const navigate = useNavigate()
  const access = useExecutionAccess()
  const { project, canManageStructure, routeBase } = access
  const [milestones, setMilestones] = useState<MilestoneDto[]>([])
  const [progress, setProgress] = useState<MilestoneProgressDto[]>([])
  const [error, setError] = useState<HttpError | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [items, summary] = await Promise.all([
        services.milestone.getProjectMilestones(project.id),
        services.milestone.getProjectMilestoneProgress(project.id),
      ])
      setMilestones(items)
      setProgress(summary)
      setError(null)
    } catch (reason) {
      setError(reason instanceof HttpError ? reason : new HttpError('Không thể tải milestone.', 500))
    } finally { setLoading(false) }
  }, [project.id])
  useEffect(() => { void load() }, [load])

  const mutate = async (operation: () => Promise<unknown>) => {
    try { await operation(); await load() }
    catch (reason) {
      const next = reason instanceof HttpError ? reason : new HttpError('Không thể cập nhật milestone.', 500)
      setError(next)
      if (next.status === 409) await load()
    }
  }
  if (loading) return <State message="Đang tải milestone từ Backend…" />
  if (error && milestones.length === 0) return <State error message={error.status === 403 ? 'Backend không cấp quyền xem milestone của Project này.' : error.message} retry={load} />
  const selected = milestones.find((item) => item.id === Number(milestoneId)) ?? milestones[0] ?? null
  const selectedProgress = progress.find((item) => item.milestoneId === selected?.id)

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-5 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold">Milestones</h1><p className="mt-1 text-sm text-slate-600">Dữ liệu và tiến độ do Backend trả về; không dùng preview fixture.</p></div><Link to={`${routeBase}/tasks`} className="rounded border px-3 py-2 text-xs font-bold">Task Board</Link></header>
      {error ? <State error message={error.status === 409 ? 'Dữ liệu vừa thay đổi trên Backend; đã tải lại để bạn xem lại.' : error.message} /> : null}
      {milestones.length === 0 ? <section className="rounded-2xl border bg-white p-8 text-sm text-slate-600">Project ACTIVE này chưa có milestone. Đây là trạng thái hợp lệ vì Backend không tạo milestone mặc định.</section> : <section className="grid gap-3 md:grid-cols-3">{milestones.map((item) => <button key={item.id} onClick={() => navigate(`${routeBase}/milestones/${item.id}`)} className={`rounded-xl border p-4 text-left ${selected?.id === item.id ? 'border-blue-500 bg-blue-50' : 'bg-white'}`}><strong>{item.title}</strong><p className="mt-1 text-xs">{item.status} · {progress.find((entry) => entry.milestoneId === item.id)?.progressPercentage ?? 0}%</p></button>)}</section>}
      {selected ? <MilestoneEditor milestone={selected} progress={selectedProgress} mutate={mutate} canManageStructure={canManageStructure} /> : null}
      {canManageStructure ? <CreateMilestone projectId={project.id} sortOrder={milestones.length} mutate={mutate} /> : null}
      {canManageStructure && milestones.length > 0 ? <button onClick={() => void mutate(() => services.milestone.reorderMilestones(project.id, milestones.map((item, index) => ({ milestoneId: item.id, sortOrder: index }))))} className="self-start rounded border px-3 py-2 text-xs font-bold">Lưu thứ tự Backend hiện tại</button> : null}
    </main>
  )
}

function MilestoneEditor({ milestone, progress, mutate, canManageStructure }: { milestone: MilestoneDto; progress?: MilestoneProgressDto; mutate: (operation: () => Promise<unknown>) => Promise<void>; canManageStructure: boolean }) {
  const [title, setTitle] = useState(milestone.title); const [description, setDescription] = useState(milestone.description ?? ''); const [startDate, setStartDate] = useState(milestone.startDate ?? ''); const [dueDate, setDueDate] = useState(milestone.dueDate ?? ''); const [status, setStatus] = useState(milestone.status)
  useEffect(() => { setTitle(milestone.title); setDescription(milestone.description ?? ''); setStartDate(milestone.startDate ?? ''); setDueDate(milestone.dueDate ?? ''); setStatus(milestone.status) }, [milestone])
  return <section className="rounded-2xl border bg-white p-5"><h2 className="font-bold">{milestone.title} · {progress?.progressPercentage ?? 0}%</h2>{canManageStructure ? <form className="mt-4 grid gap-3" onSubmit={(event) => { event.preventDefault(); if (startDate && dueDate && startDate > dueDate) return; void mutate(() => services.milestone.updateMilestone(milestone.id, { title, description: description || null, startDate: startDate || null, dueDate: dueDate || null, status, sortOrder: milestone.sortOrder })) }}><input value={title} onChange={(event) => setTitle(event.target.value)} required className="rounded border px-3 py-2"/><textarea value={description} onChange={(event) => setDescription(event.target.value)} className="rounded border px-3 py-2"/><div className="flex flex-wrap gap-2"><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="rounded border px-3 py-2"/><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="rounded border px-3 py-2"/><select value={status} onChange={(event) => setStatus(event.target.value)}>{['PLANNED','IN_PROGRESS','COMPLETED','CANCELLED'].map((value) => <option key={value}>{value}</option>)}</select></div><div className="flex gap-2"><button className="rounded bg-slate-900 px-3 py-2 text-xs font-bold text-white">Lưu milestone</button><button type="button" onClick={() => void mutate(() => services.milestone.deleteMilestone(milestone.id))} className="rounded border border-rose-300 px-3 py-2 text-xs font-bold text-rose-700">Xóa</button></div></form> : <p className="mt-3 text-sm text-slate-600">Chỉ trưởng nhóm hoặc GVHD được Backend cho phép mới thấy thao tác cấu trúc milestone.</p>}</section>
}
function CreateMilestone({ projectId, sortOrder, mutate }: { projectId: number; sortOrder: number; mutate: (operation: () => Promise<unknown>) => Promise<void> }) { const [title, setTitle] = useState(''); return <form className="rounded-2xl border bg-white p-5" onSubmit={(event) => { event.preventDefault(); void mutate(() => services.milestone.createMilestone({ projectId, title, sortOrder })).then(() => setTitle('')) }}><h2 className="font-bold">Tạo milestone</h2><div className="mt-3 flex gap-2"><input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Tên milestone" className="rounded border px-3 py-2"/><button className="rounded bg-blue-700 px-3 py-2 text-xs font-bold text-white">Tạo</button></div></form> }
function State({ message, error, retry }: { message: string; error?: boolean; retry?: () => Promise<void> }) { return <section role={error ? 'alert' : 'status'} className={`rounded-2xl border p-5 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'bg-white'}`}>{message}{retry ? <button onClick={() => void retry()} className="ml-3 font-bold underline">Tải lại</button> : null}</section> }
