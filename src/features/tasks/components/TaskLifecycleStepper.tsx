import type { BackendTaskStatus } from '../../../types/backend'

interface TaskLifecycleStepperProps {
  status: BackendTaskStatus | string
}

const MAIN_STEPS: Array<{ key: BackendTaskStatus; label: string; icon: string; order: number }> = [
  { key: 'TODO', label: 'Chuẩn bị thực hiện', icon: 'radio_button_unchecked', order: 1 },
  { key: 'IN_PROGRESS', label: 'Đang thực hiện', icon: 'pending', order: 2 },
  { key: 'IN_REVIEW', label: 'Chờ nghiệm thu', icon: 'fact_check', order: 3 },
  { key: 'DONE', label: 'Đã hoàn thành', icon: 'check_circle', order: 4 },
]

export function TaskLifecycleStepper({ status }: TaskLifecycleStepperProps) {
  const isSpecial = status === 'BLOCKED' || status === 'CANCELLED'
  const currentOrder = MAIN_STEPS.find(s => s.key === status)?.order ?? 0

  return (
    <div className="task-lifecycle-stepper-container my-4 rounded-xl border border-hairline bg-card p-4 shadow-xs" aria-label="Tiến trình công việc">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Tiến trình thực hiện công việc
        </span>
        {status === 'BLOCKED' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-status-danger-bg px-2.5 py-0.5 text-xs font-bold text-status-danger-text">
            <span className="material-symbols-outlined text-sm">pause_circle</span>
            Đang vướng mắc
          </span>
        )}
        {status === 'CANCELLED' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-status-neutral-bg px-2.5 py-0.5 text-xs font-bold text-ink-muted">
            <span className="material-symbols-outlined text-sm">cancel</span>
            Đã hủy
          </span>
        )}
      </div>

      <nav aria-label="Các bước tiến trình" className="relative">
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
          {MAIN_STEPS.map((step) => {
            const isCompleted = !isSpecial && currentOrder > step.order
            const isCurrent = !isSpecial && status === step.key

            return (
              <li
                key={step.key}
                aria-current={isCurrent ? 'step' : undefined}
                className={`relative flex items-center gap-2.5 rounded-lg border p-2.5 transition-all ${
                  isCurrent
                    ? 'border-primary bg-primary-subtle/40 text-primary font-semibold ring-1 ring-primary/40'
                    : isCompleted
                    ? 'border-status-success-border/60 bg-status-success-bg/20 text-status-success-text'
                    : 'border-hairline bg-canvas/50 text-ink-muted'
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isCurrent
                      ? 'bg-primary text-white shadow-xs'
                      : isCompleted
                      ? 'bg-status-success-text text-white'
                      : 'bg-hairline text-ink-muted'
                  }`}
                >
                  {isCompleted ? '✓' : step.order}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium leading-tight">
                    {step.label}
                  </p>
                  <p className="text-xs text-ink-muted leading-tight mt-0.5">
                    {isCurrent ? 'Đang thực hiện' : isCompleted ? 'Đã qua' : 'Chưa đến'}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}
