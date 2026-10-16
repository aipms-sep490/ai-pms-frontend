import { buildReadinessChecklist } from '../utils/submission-readiness'
import { Link } from 'react-router-dom'

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
  const needsSupervision = items.some((item) => item.code === 'SUPERVISOR_NOT_CONFIRMED' || item.code.startsWith('MENTOR_NOT_CONFIRMED:'))

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
      {needsSupervision && <>
        <p className="mt-3 text-xs text-status-warning-text">Lưu thay đổi đề cương trước khi chuyển sang mời giảng viên.</p>
        <Link to="/project/supervisor" className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary/90">
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">person_add</span>
          Mời giảng viên hướng dẫn / Mentor
        </Link>
      </>}
    </section>
  )
}
