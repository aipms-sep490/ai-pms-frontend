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
    neutral: 'bg-slate-100 text-slate-700 border-hairline',
    se: 'bg-[var(--color-tag-se-bg)] text-[var(--color-tag-se)] border-[var(--color-tag-se)]/20',
    uiux: 'bg-[var(--color-tag-uiux-bg)] text-[var(--color-tag-uiux)] border-[var(--color-tag-uiux)]/20',
    ai: 'bg-[var(--color-tag-ai-bg)] text-[var(--color-tag-ai)] border-[var(--color-tag-ai)]/20',
    qa: 'bg-[var(--color-tag-qa-bg)] text-[var(--color-tag-qa)] border-[var(--color-tag-qa)]/20',
    is: 'bg-[var(--color-tag-is-bg)] text-[var(--color-tag-is)] border-[var(--color-tag-is)]/20',
  }[variant]

  const dotColor = {
    success: 'bg-academic-emerald',
    warning: 'bg-academic-amber',
    error: 'bg-academic-coral',
    info: 'bg-primary',
    neutral: 'bg-slate-400',
    se: 'bg-[var(--color-tag-se)]',
    uiux: 'bg-[var(--color-tag-uiux)]',
    ai: 'bg-[var(--color-tag-ai)]',
    qa: 'bg-[var(--color-tag-qa)]',
    is: 'bg-[var(--color-tag-is)]',
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
