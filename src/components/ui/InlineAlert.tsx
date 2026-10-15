import type { ReactNode } from 'react'
import { Button } from './Button'
import { badgeToneClass, type BadgeTone } from './status-badge-tone'

export interface InlineAlertProps {
  tone: BadgeTone
  title?: string
  children?: ReactNode
  onRetry?: () => void
  retryLabel?: string
  retryPending?: boolean
  className?: string
}

/** Block-level counterpart to StatusBadge's pill, for a page/section-level
 * loading, empty, error or business-blocked message with an optional retry. */
export function InlineAlert({ tone, title, children, onRetry, retryLabel = 'Thử lại', retryPending = false, className = '' }: InlineAlertProps) {
  const role = tone === 'danger' || tone === 'warning' ? 'alert' : 'status'
  return (
    <section role={role} className={`rounded-md border p-4 text-sm ${badgeToneClass[tone]} ${className}`.trim()}>
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
