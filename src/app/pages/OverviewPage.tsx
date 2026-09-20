import { StudentJourneyHero } from '../../features/dashboard/components'
import { useStudentJourney } from '../context'
import { useNavigate } from 'react-router-dom'
import { getActivePrimaryAssignment } from '../../features/projects/utils/project-resolution.utils'
import { resolveStudentNextAction } from '../../features/auth/utils/resolve-student-next-action'

const journeySteps = [
  { label: 'Tuyển quân', icon: 'group_add' },
  { label: 'Đề cương', icon: 'description' },
  { label: 'Thẩm định', icon: 'fact_check' },
  { label: 'Ghép GVHD', icon: 'school' },
  { label: 'Thực hiện', icon: 'rocket_launch' },
] as const

export function OverviewPage() {
  const { journeyState, error, project, team, assignments, semester } = useStudentJourney()
  const navigate = useNavigate()
  const supervisor = getActivePrimaryAssignment(assignments)
  const stageIndex = {
    NO_TEAM: 0,
    TEAM_FORMING: 0,
    TEAM_ELIGIBLE: 1,
    PROJECT_PENDING: 2,
    REVISION_REQUIRED: 2,
    PROJECT_REJECTED: 2,
    SUPERVISOR_PENDING: 3,
    ACTIVE: 4,
    FINAL_SUBMISSION: 4,
    COMPLETED: 4,
  }[journeyState]
  const nextAction = resolveStudentNextAction({ journeyState, projectStatus: project?.status })
  const showActiveHandoff = journeyState === 'ACTIVE'

  return (
    <div className="flex flex-col gap-6">
      {/* Dynamic Student Journey Banner */}
      <StudentJourneyHero />

      {!showActiveHandoff && !error ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs" aria-labelledby="journey-next-step">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Lộ trình đăng ký đồ án</p>
            <h2 id="journey-next-step" className="mt-1 text-lg font-bold tracking-tight text-slate-900">Bước tiếp theo của nhóm</h2>
          </div>
          <ol className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-5">
            {journeySteps.map((step, index) => (
              <li key={step.label} className={`bg-white px-4 py-4 ${index === stageIndex ? 'text-blue-700' : index < stageIndex ? 'text-emerald-700' : 'text-slate-400'}`}>
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[19px] ${index === stageIndex ? 'text-blue-600' : index < stageIndex ? 'text-emerald-600' : 'text-slate-300'}`} aria-hidden="true">
                    {index < stageIndex ? 'check_circle' : step.icon}
                  </span>
                  <span className="text-xs font-semibold">{step.label}</span>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-col gap-4 bg-slate-50/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{nextAction.label}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{nextAction.detail}</p>
            </div>
            <button type="button" onClick={() => navigate(nextAction.route)}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
              Tiếp tục
              <span className="material-symbols-outlined text-[17px]" aria-hidden="true">arrow_forward</span>
            </button>
          </div>
        </section>
      ) : showActiveHandoff ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs" aria-labelledby="active-project-title">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Dữ liệu trực tiếp từ hệ thống</p>
            <h2 id="active-project-title" className="mt-1 text-xl font-bold tracking-tight text-slate-900">
              {project?.title || 'Đồ án đang hoạt động'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">{project?.code} • {team?.name} ({team?.code})</p>
          </div>
          <dl className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white px-5 py-4"><dt className="text-[11px] text-slate-500">Trạng thái</dt><dd className="mt-1 text-sm font-bold text-emerald-700">{project?.status}</dd></div>
            <div className="bg-white px-5 py-4"><dt className="text-[11px] text-slate-500">Học kỳ</dt><dd className="mt-1 text-sm font-bold text-slate-900">{semester?.name || '—'}</dd></div>
            <div className="bg-white px-5 py-4"><dt className="text-[11px] text-slate-500">Thành viên</dt><dd className="mt-1 text-sm font-bold text-slate-900">{team?.members.length ?? 0}</dd></div>
            <div className="bg-white px-5 py-4"><dt className="text-[11px] text-slate-500">GVHD chính</dt><dd className="mt-1 text-sm font-bold text-slate-900">{supervisor?.supervisorName || 'Chưa phân công'}</dd></div>
          </dl>
          <div className="flex flex-wrap gap-3 bg-slate-50/70 px-5 py-5 sm:px-6">
            <button type="button" onClick={() => navigate('/projects/lifecycle')} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Xem hồ sơ thật</button>
            <button type="button" onClick={() => navigate('/project/status')} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Lịch sử xét duyệt</button>
            <button type="button" onClick={() => navigate(nextAction.route)} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800">Mở không gian đồ án</button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
