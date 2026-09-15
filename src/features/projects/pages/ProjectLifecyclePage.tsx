import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { useStudentJourney } from '../../../app/context'
import { services } from '../../../services/service-gateway'
import type { ProjectStatusHistoryDto } from '../../../types/backend'
import { ProjectLifecycle } from '../components/ProjectLifecycle'
import { useProjectLifecycle } from '../hooks/useProjectLifecycle'
import { getActivePrimaryAssignment } from '../utils/project-resolution.utils'
import './project-lifecycle-page.css'

export function ProjectLifecyclePage() {
  const journey = useStudentJourney()
  const { project, team, assignments, semester } = journey
  const lifecycle = useProjectLifecycle()
  const [history, setHistory] = useState<ProjectStatusHistoryDto[]>([])
  const [historyError, setHistoryError] = useState<string | null>(null)
  const supervisor = getActivePrimaryAssignment(assignments)

  useEffect(() => {
    if (!project?.id) {
      setHistory([])
      return
    }
    let cancelled = false
    setHistoryError(null)
    services.project.getHistory(project.id)
      .then((items) => { if (!cancelled) setHistory(items) })
      .catch((reason: unknown) => {
        if (!cancelled) setHistoryError(reason instanceof Error ? reason.message : 'Không thể tải lịch sử đề tài.')
      })
    return () => { cancelled = true }
  }, [project?.id])

  if (journey.isLoading) return <div className="state-panel">Đang tải hồ sơ thật từ backend…</div>
  if (journey.error) return <div className="state-panel error-panel" role="alert">{journey.error}</div>

  if (!project || !team) {
    return (
      <section className="state-panel empty-panel">
        <div><strong>Nhóm chưa có hồ sơ đề tài</strong><p>Hoàn thiện điều kiện nhóm rồi tạo đề cương để bắt đầu lifecycle.</p></div>
        <Link className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white" to="/project/register">Tạo đề cương</Link>
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <header className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">Hồ sơ từ backend</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><h1 className="text-xl font-bold text-slate-900">{project.title}</h1><p className="mt-1 text-xs text-slate-500">{project.code} • {team.name} ({team.code}) • {semester?.name}</p></div>
            <span className="w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{project.status}</span>
          </div>
        </header>
        <dl className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Trưởng nhóm" value={team.members.find((member) => member.isLeader)?.fullName || '—'} />
          <Metric label="Sĩ số" value={`${team.members.length} thành viên`} />
          <Metric label="Chuyên ngành đề tài" value={project.majors.map((major) => major.majorCode).join(', ') || '—'} />
          <Metric label="GVHD chính" value={supervisor?.supervisorName || 'Chưa phân công'} />
        </dl>
        <div className="grid gap-5 border-t border-slate-100 px-5 py-5 lg:grid-cols-2 sm:px-6">
          <TextBlock title="Mục tiêu" value={project.objectives} />
          <TextBlock title="Sản phẩm kỳ vọng" value={project.expectedOutput} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <h2 className="text-base font-bold text-slate-900">Thành viên thực tế</h2>
        <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {team.members.map((member) => (
            <div key={member.userId} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <span className="font-semibold text-slate-900">{member.fullName}</span>
              <span className="text-xs text-slate-500">{member.isLeader ? 'Trưởng nhóm' : 'Thành viên'} • Major ID {member.majorId ?? '—'}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <h2 className="text-base font-bold text-slate-900">Lịch sử trạng thái thật</h2>
        {historyError ? <p className="mt-3 text-sm text-rose-700" role="alert">{historyError}</p> : null}
        <div className="mt-4 space-y-3">
          {history.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-sm text-slate-900">{item.oldStatus || 'Khởi tạo'} → {item.newStatus}</strong>
                <time className="text-xs text-slate-500">{new Date(item.changedAt).toLocaleString('vi-VN')}</time>
              </div>
              <p className="mt-1 text-xs text-slate-600">{item.changedByName || 'Hệ thống'}{item.reason ? ` • ${item.reason}` : ''}</p>
            </article>
          ))}
          {!historyError && history.length === 0 ? <p className="text-sm text-slate-500">Chưa có lịch sử trạng thái.</p> : null}
        </div>
      </section>

      <section className="pt-2">
        <div className="page-heading split-heading mb-4">
          <div><p className="eyebrow">Domain workflow engine</p><h2 className="font-heading text-lg font-bold text-slate-900">Các trạng thái do backend hỗ trợ</h2></div>
          <code className="endpoint-label">GET /api/v1/projects/lifecycle</code>
        </div>
        {lifecycle.isLoading && <div className="state-panel">Đang tải lifecycle…</div>}
        {!lifecycle.isLoading && lifecycle.isForbidden && <div className="state-panel forbidden-panel" role="alert">Backend từ chối quyền xem lifecycle.</div>}
        {!lifecycle.isLoading && lifecycle.error && !lifecycle.isForbidden && <div className="state-panel error-panel"><span>{lifecycle.error.message}</span><Button type="button" onClick={lifecycle.retry}>Thử lại</Button></div>}
        {!lifecycle.isLoading && lifecycle.data && lifecycle.isEmpty && <div className="state-panel empty-panel">Backend chưa trả về trạng thái lifecycle.</div>}
        {!lifecycle.isLoading && lifecycle.data && !lifecycle.isEmpty && <ProjectLifecycle states={lifecycle.data.states} />}
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="bg-white px-5 py-4"><dt className="text-[11px] text-slate-500">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd></div>
}

function TextBlock({ title, value }: { title: string; value?: string | null }) {
  return <div><h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h2><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{value || 'Backend chưa cung cấp nội dung.'}</p></div>
}
