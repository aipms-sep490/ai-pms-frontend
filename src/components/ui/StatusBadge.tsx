import { displayLabel } from './display-label'
import { badgeToneClass, schemeStatusTone, type BadgeTone } from './status-badge-tone'

export function StatusBadge({ status, tone, label, className }: { status?: string | null; tone?: BadgeTone; label?: string; className?: string }) {
  const resolvedTone = tone ?? schemeStatusTone(status)
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeToneClass[resolvedTone]}${className ? ` ${className}` : ''}`}>
      {label ?? displayLabel(status)}
    </span>
  )
}
