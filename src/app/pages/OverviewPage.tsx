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

  const isExecutionStage = stageIndex >= 4

  return (
    <WorkspacePage className="space-y-5" title="Tổng quan lộ trình" eyebrow="Không gian đồ án" description="Theo dõi trạng thái đồ án, việc cần ưu tiên và bước tiếp theo của nhóm.">
      {/* Dynamic Student Journey Banner */}
      <StudentJourneyHero />
      <StudentDashboardSummary />

      {!error ? (
        isExecutionStage ? (
          <details className="workspace-surface group" aria-labelledby="journey-next-step">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-canvas/70 px-5 py-3.5 transition-colors hover:bg-canvas [&::-webkit-details-marker]:hidden">
              <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                <span className="material-symbols-outlined text-[20px] text-status-success-text shrink-0" aria-hidden="true">task_alt</span>
                <span id="journey-next-step" className="text-sm font-bold text-ink">Lộ trình đăng ký đồ án</span>
                <span className="inline-flex items-center rounded-full border border-status-success-border bg-status-success-bg px-2.5 py-0.5 text-xs font-semibold text-status-success-text">
                  Đã hoàn tất đăng ký · Đang thực hiện
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary shrink-0">
                <span>Xem lại 5 bước</span>
                <span className="material-symbols-outlined text-[18px] transition-transform group-open:rotate-180" aria-hidden="true">expand_more</span>
              </span>
            </summary>
            <div className="border-t border-hairline">
              <ol className="grid grid-cols-2 gap-px bg-canvas sm:grid-cols-5">
                {journeySteps.map((step, index) => (
                  <li key={step.label} className={`bg-card px-4 py-3.5 ${index <= stageIndex ? 'text-primary' : 'text-ink-muted'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-[19px] ${index <= stageIndex ? 'text-primary' : 'text-ink-muted'}`} aria-hidden="true">
                        {index < stageIndex ? 'check_circle' : step.icon}
                      </span>
                      <span className="text-xs font-semibold">{step.label}</span>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="flex flex-col gap-3 border-t border-hairline bg-canvas/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-ink">{nextAction.label}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{nextAction.detail}</p>
                </div>
                <Button onClick={() => navigate(nextAction.route)} icon="arrow_forward" className="flex-row-reverse shrink-0">
                  Tiếp tục
                </Button>
              </div>
            </div>
          </details>
        ) : (
          <section className="workspace-surface" aria-labelledby="journey-next-step">
            <div className="border-b border-hairline bg-canvas/70 px-5 py-3.5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Lộ trình đăng ký đồ án</p>
              <h2 id="journey-next-step" className="mt-1 text-base font-bold tracking-tight text-ink">Bước tiếp theo của nhóm</h2>
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
            <div className="flex flex-col gap-4 border-t border-hairline bg-canvas/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-ink">{nextAction.label}</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">{nextAction.detail}</p>
              </div>
              <Button onClick={() => navigate(nextAction.route)} icon="arrow_forward" className="flex-row-reverse shrink-0">
                Tiếp tục
              </Button>
            </div>
          </section>
        )
      ) : null}
    </WorkspacePage>
  )
}


