import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { getStudentDashboard, type StudentDashboard } from '../api/dashboard-api'

export function StudentDashboardSummary() {
  const [data, setData] = useState<StudentDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    setLoading(true)
    try { setData(await getStudentDashboard()); setError(null) }
    catch (reason) { setError(reason instanceof HttpError && reason.status === 403 ? 'Backend không cấp quyền xem dashboard cá nhân.' : 'Không thể tải chỉ số cá nhân.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  if (loading) return <section role="status" className="rounded-xl border border-hairline bg-card p-5 text-sm text-slate-700">Đang tải chỉ số cá nhân từ Backend…</section>
  if (error || !data) return <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-5 text-sm text-status-error-text"><p className="font-semibold">Không thể tải dashboard cá nhân</p><p className="mt-1">{error ?? 'Không có dữ liệu trả về.'}</p><button type="button" className="mt-2 min-h-11 font-semibold underline underline-offset-4" onClick={() => void load()}>Tải lại</button></section>
  const risk = data.project?.analysis?.riskLevel
  return <section className="space-y-4" aria-label="Tổng quan cá nhân">
    <div className="grid gap-3 sm:grid-cols-3"><Metric label="Task đang mở" value={data.assignedOpenTasks} /><Metric label="Task quá hạn" value={data.assignedOverdueTasks} tone={data.assignedOverdueTasks > 0 ? 'error' : 'neutral'} /><Metric label="Thông báo chưa đọc" value={data.unreadNotifications} tone={data.unreadNotifications > 0 ? 'warning' : 'neutral'} /></div>
    {data.project && <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-heading font-semibold text-slate-950">{data.project.code} · {data.project.title}</h2><p className="mt-1 text-sm text-slate-600">Trạng thái project do Backend xác định: {data.project.status}.</p></div>{risk && <span className={risk === 'HIGH' ? 'rounded-full bg-status-error-bg px-2.5 py-1 text-xs font-semibold text-status-error-text' : 'rounded-full bg-status-warning-bg px-2.5 py-1 text-xs font-semibold text-status-warning-text'}>Rủi ro: {risk}</span>}</div>{data.project.analysis && <p className="mt-3 text-sm text-slate-700">Tiến độ: <strong>{data.project.analysis.progressSummary.progressPercentage.toFixed(0)}%</strong> · Task blocked: {data.project.analysis.progressSummary.blockedTasks} · Task quá hạn: {data.project.analysis.progressSummary.overdueTasks}</p>}</section>}
    <div className="grid gap-3 lg:grid-cols-2"><DeadlineList title="Task sắp đến hạn" empty="Chưa có task cần chú ý." items={data.taskDeadlines.map(task => ({ id: task.id, title: task.title, date: task.dueAtUtc, overdue: task.isOverdue, href: `/project/tasks/${task.id}` }))} /><DeadlineList title="Milestone sắp đến hạn" empty="Chưa có milestone cần chú ý." items={data.milestoneDeadlines.map(item => ({ id: item.id, title: item.title, date: item.dueDate, overdue: item.isOverdue, href: `/project/milestones/${item.id}` }))} /></div>
    <p className="text-xs leading-5 text-slate-500">Dữ liệu contribution: {data.contributionDataStatus}. Chỉ báo đóng góp không phải điểm đánh giá.</p>
  </section>
}

function Metric({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'warning' | 'error' }) { const tones = { neutral: 'border-hairline', warning: 'border-status-warning-border', error: 'border-status-error-border' }; return <div className={`rounded-xl border bg-card p-4 shadow-xs ${tones[tone]}`}><p className="text-xs font-medium text-slate-600">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums text-slate-950">{value}</p></div> }
function DeadlineList({ title, empty, items }: { title: string; empty: string; items: Array<{ id: number; title: string; date: string; overdue: boolean; href: string }> }) { return <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs"><h2 className="font-heading font-semibold text-slate-950">{title}</h2>{items.length === 0 ? <p className="mt-2 text-sm text-slate-600">{empty}</p> : <ul className="mt-3 divide-y divide-hairline text-sm">{items.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><Link to={item.href} className="font-medium text-primary underline underline-offset-4 hover:text-primary-hover">{item.title}</Link><span className={item.overdue ? 'font-medium text-status-error-text' : 'text-slate-600'}>{formatDate(item.date)}{item.overdue ? ' · Quá hạn' : ''}</span></li>)}</ul>}</section> }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(date) }
