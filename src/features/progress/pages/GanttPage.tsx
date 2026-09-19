import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { HttpError } from '../../../services/http/http-client'
import { services } from '../../../services/service-gateway'
import type { ProjectProgressSummaryDto, ProjectTimelineDataDto } from '../../../types/backend'

/** Timeline is a read-only projection of the Backend execution model. */
export function GanttPage() {
  const { project, routeBase } = useExecutionAccess()
  const [timeline, setTimeline] = useState<ProjectTimelineDataDto | null>(null)
  const [summary, setSummary] = useState<ProjectProgressSummaryDto | null>(null)
  const [error, setError] = useState<HttpError | null>(null)

  const load = useCallback(async () => {
    try {
      const [nextTimeline, nextSummary] = await Promise.all([
        services.task.getProjectTimeline(project.id),
        services.task.getProjectProgressSummary(project.id),
      ])
      setTimeline(nextTimeline); setSummary(nextSummary); setError(null)
    } catch (reason) { setError(reason instanceof HttpError ? reason : new HttpError('Không thể tải timeline.', 500)) }
  }, [project.id])
  useEffect(() => { void load() }, [load])

  if (error && !timeline) return <section role="alert" className="mx-auto max-w-5xl rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{error.status === 403 ? 'Backend không cấp quyền xem timeline của Project này.' : error.message}<button className="ml-3 font-bold underline" onClick={() => void load()}>Tải lại</button></section>
  if (!timeline || !summary) return <section role="status" className="p-5">Đang tải timeline từ Backend…</section>

  return <main className="mx-auto flex max-w-6xl flex-col gap-5 pb-12"><header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold">Timeline Project</h1><p className="mt-1 text-sm text-slate-600">Read-only projection từ Backend; không dùng fixture hoặc suy đoán critical path.</p></div><Link to={`${routeBase}/tasks`} className="rounded border px-3 py-2 text-xs font-bold">Task Board</Link></header>{error ? <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error.message}</p> : null}<section className="grid gap-3 sm:grid-cols-4">{[['Tiến độ', `${summary.progressPercentage}%`], ['Hoàn thành', `${summary.doneTasks}/${summary.totalTasks} task`], ['Quá hạn', String(summary.overdueTasks)], ['Bị chặn', String(summary.blockedTasks)]].map(([label, value]) => <div key={label} className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-bold">{value}</p></div>)}</section>{timeline.milestones.length === 0 ? <section className="rounded-2xl border bg-white p-8 text-sm text-slate-600">Backend chưa trả milestone hoặc task timeline nào cho Project ACTIVE này.</section> : <section className="space-y-3">{timeline.milestones.map((milestone) => <article key={milestone.id} className="rounded-2xl border bg-white p-5"><header className="flex flex-wrap justify-between gap-2"><div><h2 className="font-bold">{milestone.title}</h2><p className="mt-1 text-xs text-slate-500">{milestone.status} · {milestone.startDate ?? 'Chưa có start'} → {milestone.dueDate ?? 'Chưa có due'} · {milestone.progressPercentage}%</p></div><Link className="text-xs font-bold text-blue-700" to={`${routeBase}/milestones/${milestone.id}`}>Xem milestone</Link></header>{milestone.tasks.length ? <ul className="mt-4 space-y-2">{milestone.tasks.map((task) => <li key={task.id} className="flex flex-wrap justify-between gap-2 rounded border border-slate-100 p-3 text-xs"><Link className="font-bold text-blue-700" to={`${routeBase}/tasks/${task.id}`}>{task.title}</Link><span>{task.status} · {task.startAt ?? '—'} → {task.dueAt ?? '—'}</span></li>)}</ul> : <p className="mt-3 text-xs text-slate-500">Chưa có task do Backend trả về.</p>}</article>)}</section>}</main>
}

export default GanttPage
