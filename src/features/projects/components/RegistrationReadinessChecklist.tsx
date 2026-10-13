import { buildReadinessChecklist } from '../utils/submission-readiness'

interface RegistrationReadinessChecklistProps {
  reasons: string[]
  resolveMajorName?: (majorId: number) => string | undefined
  title?: string
}

/** Surfaces the `submit_project`/`resubmit_project` action's reason codes as a
 * plain-language checklist, so "submit is disabled" always comes with a why. */
export function RegistrationReadinessChecklist({ reasons, resolveMajorName, title = 'Cần hoàn tất trước khi nộp' }: RegistrationReadinessChecklistProps) {
  const items = buildReadinessChecklist(reasons, resolveMajorName)
  if (!items.length) return null

  return (
    <section role="status" aria-label={title} className="rounded-xl border border-status-warning-border bg-status-warning-bg p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-status-warning-text">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item.code} className="flex items-start gap-2 text-sm text-status-warning-text">
            <span className="material-symbols-outlined mt-0.5 text-base" aria-hidden="true">radio_button_unchecked</span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
