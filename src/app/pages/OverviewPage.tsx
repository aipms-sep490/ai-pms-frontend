import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { StudentJourneyHero } from '../../features/dashboard/components'
import { StudentDashboardSummary } from '../../features/dashboard/components/StudentDashboardSummary'
import { useStudentJourney } from '../context'
import { useNavigate } from 'react-router-dom'
import { resolveStudentNextAction } from '../../features/auth/utils/resolve-student-next-action'
import { PageLoading } from '../../components/ui/PageLoading'

const journeySteps = [
  { label: 'Thành lập nhóm', icon: 'group_add' },
  { label: 'Đề cương', icon: 'description' },
  { label: 'Thẩm định', icon: 'fact_check' },
  { label: 'Phân công hướng dẫn', icon: 'school' },
  { label: 'Thực hiện', icon: 'rocket_launch' },
] as const

export function OverviewPage() {
  const { journeyState, error, project, isLoading } = useStudentJourney()
  const navigate = useNavigate()
  if (isLoading) return <PageLoading />
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

  return (
    <WorkspacePage className="space-y-6" title="Tổng quan lộ trình" eyebrow="Không gian đồ án" description="Theo dõi trạng thái đồ án, việc cần ưu tiên và bước tiếp theo của nhóm.">
      {/* Dynamic Student Journey Banner */}
      <StudentJourneyHero />
      <StudentDashboardSummary />

      {!error ? (
        <section className="workspace-surface" aria-labelledby="journey-next-step">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Lộ trình đăng ký đồ án</p>
            <h2 id="journey-next-step" className="mt-1 text-lg font-bold tracking-tight text-slate-900">Bước tiếp theo của nhóm</h2>
          </div>
          <ol className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-5">
            {journeySteps.map((step, index) => (
              <li key={step.label} className={`bg-white px-4 py-4 ${index <= stageIndex ? 'text-primary' : 'text-slate-400'}`}>
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[19px] ${index <= stageIndex ? 'text-primary' : 'text-slate-300'}`} aria-hidden="true">
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
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              Tiếp tục
              <span className="material-symbols-outlined text-[17px]" aria-hidden="true">arrow_forward</span>
            </button>
          </div>
        </section>
      ) : null}
    </WorkspacePage>
  )
}


