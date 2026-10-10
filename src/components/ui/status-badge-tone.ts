export type BadgeTone = 'success' | 'warning' | 'neutral' | 'danger' | 'info'

export const badgeToneClass: Record<BadgeTone, string> = {
  success: 'border-status-success-border bg-status-success-bg text-status-success-text',
  warning: 'border-status-warning-border bg-status-warning-bg text-status-warning-text',
  danger: 'border-status-error-border bg-status-error-bg text-status-error-text',
  info: 'border-primary/30 bg-primary-subtle text-primary',
  neutral: 'border-hairline bg-slate-100 text-slate-700',
}

/**
 * Tone of an evaluation scheme / rubric status. PROPOSED is surfaced as a warning
 * so a not-yet-approved rubric (v5 Marketing/COMMON/INDIVIDUAL templates) can never
 * be mistaken for an official published grading policy.
 */
export function schemeStatusTone(status: string | null | undefined): BadgeTone {
  switch ((status ?? '').toUpperCase()) {
    case 'PUBLISHED': return 'success'
    case 'PROPOSED': return 'warning'
    case 'FROZEN': return 'info'
    case 'DRAFT':
    case 'RETIRED':
    case 'REVOKED': return 'neutral'
    default: return 'neutral'
  }
}
