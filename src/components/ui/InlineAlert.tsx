import type { ReactNode, Ref } from 'react'
import { Button } from './Button'
import { badgeToneClass, type BadgeTone } from './status-badge-tone'

export interface InlineAlertProps {
  ref?: Ref<HTMLElement>
  tone: BadgeTone
  title?: string
  children?: ReactNode
  onRetry?: () => void
  retryLabel?: string
  retryPending?: boolean
  className?: string
}

/** Block-level counterpart to StatusBadge's pill, for a page/section-level
 * loading, empty, error or business-blocked message with an optional retry.
 * Accepts a ref so callers can move focus onto a freshly-appeared error, per
 * this project's "errors announced in accessible manner" rule. */
export function InlineAlert({ ref, tone, title, children, onRetry, retryLabel = 'Thử lại', retryPending = false, className = '' }: InlineAlertProps) {
  const role = tone === 'danger' || tone === 'warning' ? 'alert' : 'status'
  return (
    <section ref={ref} tabIndex={-1} role={role} className={`rounded-md border p-4 text-sm outline-none ${badgeToneClass[tone]} ${className}`.trim()}>
      {title && <p className="font-bold">{title}</p>}
      {children && <div className={title ? 'mt-1 text-xs leading-relaxed' : 'text-xs leading-relaxed'}>{children}</div>}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry} disabled={retryPending}>
          {retryPending ? 'Đang tải lại…' : retryLabel}
        </Button>
      )}
    </section>
  )
}
