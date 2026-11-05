import type { ReactNode } from 'react'

type Tone = 'neutral' | 'warning' | 'success'

const toneClass: Record<Tone, string> = {
  neutral: 'border-hairline bg-canvas text-ink-soft',
  warning: 'border-status-warning-border bg-status-warning-bg text-status-warning-text',
  success: 'border-status-success-border bg-status-success-bg text-status-success-text',
}

/** Persistent, text-first status message for a form or page section. */
export function InlineAlert({ tone, children, className = '' }: { tone: Tone; children: ReactNode; className?: string }) {
  return <div role="status" className={`rounded-lg border p-3 text-sm leading-6 ${toneClass[tone]} ${className}`}>{children}</div>
}
