import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { services } from '../../../services/service-gateway'
import type { ProjectStatusHistoryDto } from '../../../types/backend'
import { getActivePrimaryAssignment } from '../utils/project-resolution.utils'
import { projectStatusLabel } from '../utils/project-status'
import { PageLoading } from '../../../components/ui/PageLoading'
import { ExecutionPage, ExState } from '../../execution/execution-ui'
import { dateTimeLabel } from '../../execution/execution-utils'

export function ProjectLifecyclePage() {
  const journey = useStudentJourney()
  const { project, team, assignments, semester } = journey
  const [history, setHistory] = useState<ProjectStatusHistoryDto[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState('')
  const [revision, setRevision] = useState(0)
  const supervisor = getActivePrimaryAssignment(assignments)
  useEffect(() => {
    if (!project?.id) { setHistory([]); setHistoryLoading(false); return }
    let cancelled = false
    setHistoryLoading(true); setHistoryError('')
    services.project.getHistory(project.id)
      .then(items => { if (!cancelled) setHistory([...items].sort((a,b) => Date.parse(b.changedAt) - Date.parse(a.changedAt))) })
      .catch(() => { if (!cancelled) setHistoryError('Chưa tải được lịch sử đồ án. Hãy thử lại.') })
      .finally(() => { if (!cancelled) setHistoryLoading(false) })
    return () => { cancelled = true }
  }, [project?.id, revision])
  if (journey.isLoading) return <PageLoading />
  if (journey.error) return <ExState message="Chưa tải được hồ sơ đồ án. Hãy thử lại." retry={() => void journey.refreshAll()} />
  if (!project || !team) return <ExecutionPage title="Hồ sơ đồ án"><ExState title="Nhóm chưa có hồ sơ đồ án" message="Hoàn thiện điều kiện nhóm rồi tạo đề cương để đăng ký." action={<Link className="ex-button" to="/project/register">Tạo đề cương</Link>} /></ExecutionPage>
  return <ExecutionPage title={project.title} eyebrow="Hồ sơ đồ án" description={`${project.code} · ${team.name} (${team.code})${semester?.name ? ` · ${semester.name}` : ''}`}>
    <section className="ex-panel ex-padding" aria-label="Thông tin đồ án">
      <dl className="ex-facts"><div><dt>Trạng thái</dt><dd>{projectStatusLabel(project.status)}</dd></div><div><dt>Trưởng nhóm</dt><dd>{team.members.find(member => member.isLeader)?.fullName || 'Chưa có thông tin'}</dd></div><div><dt>Chuyên ngành</dt><dd>{project.majors.map(major => major.majorName || major.majorCode).join(', ') || 'Chưa có thông tin'}</dd></div><div><dt>Giảng viên hướng dẫn</dt><dd>{supervisor?.supervisorName || 'Chưa phân công'}</dd></div></dl>
      <div className="grid gap-6 border-t border-slate-100 pt-6 mt-6 sm:grid-cols-2"><TextBlock title="Mục tiêu" value={project.objectives} /><TextBlock title="Sản phẩm kỳ vọng" value={project.expectedOutput} /></div>
    </section>
    <section className="ex-panel ex-padding"><h2 className="text-base font-semibold mb-4">Thành viên nhóm <span className="text-sm font-normal text-slate-500">({team.members.length})</span></h2><div className="divide-y divide-slate-100">{team.members.map(member => <div key={member.userId} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="font-medium">{member.fullName}</span><span className="text-xs text-slate-500 shrink-0">{member.isLeader ? 'Trưởng nhóm' : 'Thành viên'}</span></div>)}</div></section>
    <section className="ex-panel ex-padding"><h2 className="text-base font-semibold mb-4">Lịch sử đồ án</h2>{historyLoading ? <ExState loading /> : historyError ? <ExState message={historyError} retry={() => setRevision(value => value + 1)} /> : history.length ? <ol className="divide-y divide-slate-100">{history.map(item => <li key={item.id} className="py-4"><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><strong className="font-medium">{item.oldStatus ? projectStatusLabel(item.oldStatus) : 'Khởi tạo'} → {projectStatusLabel(item.newStatus)}</strong><time className="text-xs text-slate-500">{dateTimeLabel(item.changedAt)}</time></div><p className="mt-1 text-xs text-slate-600">{item.changedByName || 'Hệ thống'}{item.reason ? ` · ${item.reason}` : ''}</p></li>)}</ol> : <p className="ex-muted">Chưa có lịch sử đồ án.</p>}</section>
  </ExecutionPage>
}
function TextBlock({ title, value }: { title: string; value?: string | null }) {
  return <div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{value || 'Chưa có nội dung.'}</p></div>
}
