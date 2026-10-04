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
import './project-lifecycle.css'
import { ProjectResponsibilitiesPanel } from '../components/ProjectResponsibilitiesPanel'

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
  return <ExecutionPage title="Hồ sơ đồ án" eyebrow={project.code} description={`${project.title} · ${team.name} (${team.code})${semester?.name ? ` · ${semester.name}` : ''}`}>
    <div className="lifecycle-page">
    <ProjectResponsibilitiesPanel projectId={project.id} majors={project.majors} />
    <section className="lifecycle-section lifecycle-overview" aria-label="Thông tin đồ án">
      <dl className="lifecycle-facts">
        <div>
          <dt>Trạng thái</dt>
          <dd><span className="ex-badge ex-badge-IN_PROGRESS">{projectStatusLabel(project.status)}</span></dd>
        </div>
        <div>
          <dt>Trưởng nhóm</dt>
          <dd>{team.members.find(member => member.isLeader)?.fullName || 'Chưa có thông tin'}</dd>
        </div>
        <div>
          <dt>Chuyên ngành</dt>
          <dd>{project.majors.map(major => major.majorName || major.majorCode).join(', ') || 'Chưa có thông tin'}</dd>
        </div>
        <div>
          <dt>Giảng viên hướng dẫn</dt>
          <dd>{supervisor?.supervisorName || 'Chưa phân công'}</dd>
        </div>
      </dl>
      <div className="lifecycle-brief">
        <div>
          <div className="lifecycle-subheading">
            <span className="material-symbols-outlined text-[19px]" aria-hidden="true">flag</span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Mục tiêu đồ án</h2>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{project.objectives || 'Chưa có nội dung.'}</p>
        </div>
        <div>
          <div className="lifecycle-subheading">
            <span className="material-symbols-outlined text-[19px]" aria-hidden="true">inventory_2</span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Sản phẩm kỳ vọng</h2>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{project.expectedOutput || 'Chưa có nội dung.'}</p>
        </div>
      </div>
    </section>
    <section className="lifecycle-section">
      <div className="lifecycle-section-heading">
        <h2 className="text-base font-bold text-slate-900">
          Thành viên nhóm <span className="text-xs font-normal text-slate-500">({team.members.length} thành viên)</span>
        </h2>
      </div>
      <div className="lifecycle-members">
        {team.members.map(member => (
          <div key={member.userId} className="lifecycle-member">
            <div className="size-10 rounded-full bg-[#edf3f0] text-[#0f5b4e] flex items-center justify-center font-bold text-xs shrink-0 border border-[#0f5b4e]/10">
              {member.fullName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-sm text-slate-900 block truncate">{member.fullName}</span>
              <span className="text-[11px] text-slate-500 block">Thành viên #{member.userId}</span>
            </div>
            <span className={`shrink-0 text-xs px-2.5 py-0.5 rounded-full font-semibold ${
              member.isLeader
                ? 'bg-[#edf3f0] text-[#0f5b4e] border border-[#a7f3d0]'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}>
              {member.isLeader ? 'Trưởng nhóm' : 'Thành viên'}
            </span>
          </div>
        ))}
      </div>
    </section>
    <section className="lifecycle-section lifecycle-history">
      <h2 className="lifecycle-section-heading text-base font-bold text-slate-900">Lịch sử đồ án</h2>
      {historyLoading ? (
        <ExState loading />
      ) : historyError ? (
        <ExState message={historyError} retry={() => setRevision(value => value + 1)} />
      ) : history.length ? (
        <ol className="ex-timeline">
          {history.map(item => (
            <li key={item.id} className="ex-timeline-item">
              <span className="ex-timeline-dot" aria-hidden="true" />
              <div className="lifecycle-history-content">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <strong className="font-semibold text-slate-900">
                    {item.oldStatus ? projectStatusLabel(item.oldStatus) : 'Khởi tạo'} → {projectStatusLabel(item.newStatus)}
                  </strong>
                  <time className="font-mono text-xs text-slate-500">{dateTimeLabel(item.changedAt)}</time>
                </div>
                <p className="mt-1.5 text-xs text-slate-600">
                  {item.changedByName || 'Hệ thống'}{item.reason ? ` · ${historyReasonLabel(item.reason)}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="ex-muted">Chưa có lịch sử đồ án.</p>
      )}
    </section>
    </div>
  </ExecutionPage>
}

const historyReasonTranslations: Record<string, string> = {
  'Primary and co-supervisor assignments were confirmed.': 'Đã xác nhận phân công giảng viên hướng dẫn chính và đồng hướng dẫn.',
  'Project moved to supervisor matching and assignment stage.': 'Đồ án chuyển sang giai đoạn ghép và phân công giảng viên hướng dẫn.',
  'Proposal satisfies multi-major capstone requirements and was approved.': 'Đề cương đáp ứng yêu cầu đồ án đa ngành và đã được phê duyệt.',
  'Department staff started proposal review.': 'Bộ môn bắt đầu thẩm định đề cương.',
  'Team completed the initial proposal and submitted it for department review.': 'Nhóm đã hoàn thiện đề cương ban đầu và gửi bộ môn thẩm định.',
  'Initial project registration created by team leader.': 'Trưởng nhóm đã khởi tạo hồ sơ đăng ký đồ án.',
}

function historyReasonLabel(reason: string) {
  const normalized = reason.trim()
  return historyReasonTranslations[normalized] ?? normalized
}
