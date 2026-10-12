import { useEffect, useState } from 'react'
import { getActorDashboard, type ActorDashboardSummary } from '../api/dashboard-api'

const scopeLabel: Record<string, string> = { PLATFORM: 'Toàn hệ thống', ACTOR_ASSIGNMENTS: 'Phạm vi của bạn' }

/**
 * BE-N10 · a small cross-role overview card. Additive only: it never replaces the role-specific
 * numbers already shown on StudentDashboardSummary/SupervisorDashboardPage, and failing to load
 * it must not block those pages — render nothing rather than an error banner.
 */
export function ActorDashboardCard() {
  const [data, setData] = useState<ActorDashboardSummary | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const abort = new AbortController()
    getActorDashboard(undefined, abort.signal)
      .then(result => { if (!abort.signal.aborted) { setData(result); setFailed(false) } })
      .catch(() => { if (!abort.signal.aborted) setFailed(true) })
    return () => abort.abort()
  }, [])

  if (failed || !data) return null
  return <section className="workspace-surface p-5" aria-label="Tổng quan nhanh">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-heading text-sm font-semibold text-slate-950">Tổng quan nhanh · {scopeLabel[data.scope] ?? data.scope}</h2>
      {!data.complete && <span className="rounded-full bg-status-warning-bg px-2 py-0.5 text-xs font-medium text-status-warning-text">Số liệu chưa đầy đủ</span>}
    </div>
    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
      <ActorMetric label="Đồ án" value={data.projectCount} />
      <ActorMetric label="Việc đang mở" value={data.openTasks} />
      <ActorMetric label="Việc quá hạn" value={data.overdueTasks} tone={data.overdueTasks > 0 ? 'error' : 'neutral'} />
      <ActorMetric label="Chờ đánh giá" value={data.pendingEvaluations} tone={data.pendingEvaluations > 0 ? 'warning' : 'neutral'} />
      <ActorMetric label="Thông báo chưa đọc" value={data.unreadNotifications} tone={data.unreadNotifications > 0 ? 'warning' : 'neutral'} />
      {data.activeAccounts !== null && <ActorMetric label="Tài khoản hoạt động" value={data.activeAccounts} />}
    </div>
  </section>
}

function ActorMetric({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'warning' | 'error' }) {
  const tones = { neutral: 'text-slate-950', warning: 'text-status-warning-text', error: 'text-status-error-text' }
  return <div><p className="text-xs font-medium text-slate-600">{label}</p><p className={`mt-1 text-xl font-bold tabular-nums ${tones[tone]}`}>{value}</p></div>
}
