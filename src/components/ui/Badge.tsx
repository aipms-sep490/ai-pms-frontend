import type { ReactNode } from 'react'

export interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'se' | 'uiux' | 'ai' | 'qa' | 'is'
  size?: 'sm' | 'md'
  dot?: boolean
  pulse?: boolean
  icon?: string
  children: ReactNode
  className?: string
}

export function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  pulse = false,
  icon,
  children,
  className = '',
}: BadgeProps) {
  const sizeStyles = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-xs'

  const variantStyles = {
    success: 'bg-status-success-bg text-status-success-text border-status-success-border',
    warning: 'bg-status-warning-bg text-status-warning-text border-status-warning-border',
    error: 'bg-status-error-bg text-status-error-text border-status-error-border',
    info: 'bg-primary-subtle text-primary border-primary/20',
    neutral: 'bg-canvas text-ink-soft border-hairline',
    se: 'bg-tag-se-bg text-tag-se border-tag-se/20',
    uiux: 'bg-tag-uiux-bg text-tag-uiux border-tag-uiux/20',
    ai: 'bg-tag-ai-bg text-tag-ai border-tag-ai/20',
    qa: 'bg-tag-qa-bg text-tag-qa border-tag-qa/20',
    is: 'bg-tag-is-bg text-tag-is border-tag-is/20',
  }[variant]

  const dotColor = {
    success: 'bg-academic-emerald',
    warning: 'bg-academic-amber',
    error: 'bg-academic-coral',
    info: 'bg-primary',
    neutral: 'bg-ink-muted',
    se: 'bg-tag-se',
    uiux: 'bg-tag-uiux',
    ai: 'bg-tag-ai',
    qa: 'bg-tag-qa',
    is: 'bg-tag-is',
  }[variant]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono font-semibold whitespace-nowrap ${sizeStyles} ${variantStyles} ${className}`.trim()}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColor} ${pulse ? 'animate-pulse motion-reduce:animate-none' : ''}`}
          aria-hidden="true"
        />
      )}
      {icon && (
        <span className="material-symbols-outlined text-[13px] leading-none" aria-hidden="true">
          {icon}
        </span>
      )}
      <span>{children}</span>
    </span>
  )
}
