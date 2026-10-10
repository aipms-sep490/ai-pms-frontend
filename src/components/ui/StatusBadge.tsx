import { displayLabel } from './display-label'
import { badgeToneClass, schemeStatusTone, type BadgeTone } from './status-badge-tone'

export function StatusBadge({ status, tone, label }: { status?: string | null; tone?: BadgeTone; label?: string }) {
  const resolvedTone = tone ?? schemeStatusTone(status)
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeToneClass[resolvedTone]}`}>
      {label ?? displayLabel(status)}
    </span>
  )
}
