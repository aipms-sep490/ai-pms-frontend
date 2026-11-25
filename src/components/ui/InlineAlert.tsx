import type { ReactNode } from 'react'

type Tone = 'neutral' | 'info' | 'warning' | 'success' | 'error'

const toneClass: Record<Tone, string> = {
  neutral: 'border-hairline border-l-ink-muted bg-canvas text-ink-soft',
  info: 'border-primary/20 border-l-primary bg-primary-subtle/75 text-ink',
  warning: 'border-status-warning-border/85 border-l-status-warning-text bg-status-warning-bg/85 text-status-warning-text',
  success: 'border-status-success-border/80 border-l-status-success-text bg-status-success-bg/80 text-status-success-text',
  error: 'border-status-error-border/80 border-l-status-error-text bg-status-error-bg/80 text-status-error-text',
}

const iconColorClass: Record<Tone, string> = {
  neutral: 'text-ink-muted',
  info: 'text-primary',
  warning: 'text-status-warning-text',
  success: 'text-status-success-text',
  error: 'text-status-error-text',
}

function ToneIcon({ tone }: { tone: Tone }) {
  const cls = `mt-0.5 h-4 w-4 shrink-0 ${iconColorClass[tone]}`
  if (tone === 'success') {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={cls}>
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6.7 10.2 9 12.4 13.6 7.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (tone === 'warning') {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={cls}>
        <path d="M10 2.8 18 16.5H2L10 2.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M10 8v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="10" cy="14.4" r="0.9" fill="currentColor" />
      </svg>
    )
  }
  if (tone === 'error') {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={cls}>
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 6.2v4.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="10" cy="13.8" r="0.95" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={cls}>
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 9.2v4.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="10" cy="6.6" r="0.95" fill="currentColor" />
    </svg>
  )
}

/** Unified flat, left-accent status/error banner — never nests cards inside cards. */
export function InlineAlert({
  tone,
  children,
  action,
  role,
  id,
  className = '',
}: {
  tone: Tone
  children: ReactNode
  action?: ReactNode
  role?: 'alert' | 'status'
  id?: string
  className?: string
}) {
  return (
    <div
      id={id}
      role={role ?? (tone === 'error' ? 'alert' : 'status')}
      className={`flex items-start justify-between gap-3 rounded-lg border border-l-[3px] px-3.5 py-2.5 text-[13px] leading-5 ${toneClass[tone]} ${className}`.trim()}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <ToneIcon tone={tone} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  )
}
