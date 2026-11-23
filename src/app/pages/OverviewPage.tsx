import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { Button } from '../../components/ui/Button'
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

  const isExecutionPhase = stageIndex >= 4

  return (
    <WorkspacePage size="wide" className="space-y-6" title="Tổng quan lộ trình" eyebrow="Không gian đồ án" description="Theo dõi trạng thái đồ án, việc cần ưu tiên và bước tiếp theo của nhóm.">
      {/* Dynamic Student Journey Banner */}
      <StudentJourneyHero />

      {!error && !isExecutionPhase ? (
        <section className="workspace-surface" aria-labelledby="journey-next-step">
          <div className="border-b border-hairline px-5 py-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Lộ trình đăng ký đồ án</p>
            <h2 id="journey-next-step" className="mt-1 text-lg font-bold tracking-tight text-ink">Bước tiếp theo của nhóm</h2>
          </div>
          <ol className="grid grid-cols-2 gap-px bg-canvas sm:grid-cols-5">
            {journeySteps.map((step, index) => (
              <li key={step.label} className={`bg-card px-4 py-4 ${index <= stageIndex ? 'text-primary' : 'text-ink-muted'}`}>
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[19px] ${index <= stageIndex ? 'text-primary' : 'text-ink-muted'}`} aria-hidden="true">
                    {index < stageIndex ? 'check_circle' : step.icon}
                  </span>
                  <span className="text-xs font-semibold">{step.label}</span>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-col gap-4 bg-canvas/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h3 className="text-sm font-bold text-ink">{nextAction.label}</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">{nextAction.detail}</p>
            </div>
            <Button onClick={() => navigate(nextAction.route)} icon="arrow_forward" className="flex-row-reverse shrink-0">
              Tiếp tục
            </Button>
          </div>
        </section>
      ) : null}

      <StudentDashboardSummary />

      {!error && isExecutionPhase ? (
        <section className="workspace-surface px-5 py-4 sm:px-6" aria-labelledby="journey-next-step">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p id="journey-next-step" className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Lộ trình đăng ký đồ án</p>
            <ol className="flex flex-wrap items-center gap-3 text-xs">
              {journeySteps.map((step, index) => (
                <li key={step.label} className={`inline-flex items-center gap-1 font-semibold ${index <= stageIndex ? 'text-primary' : 'text-ink-muted'}`}>
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                    {index < stageIndex ? 'check_circle' : step.icon}
                  </span>
                  <span>{step.label}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}
    </WorkspacePage>
  )
}


