import type { ReactNode } from 'react'

export interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'se' | 'uiux' | 'ai' | 'qa'
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
  const sizeStyles = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'

  const variantStyles = {
    success: 'bg-status-success-bg text-status-success-text border-status-success-border',
    warning: 'bg-status-warning-bg text-status-warning-text border-status-warning-border',
    error: 'bg-status-error-bg text-status-error-text border-status-error-border',
    info: 'bg-primary-subtle text-primary border-primary/20',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    se: 'bg-blue-50 text-blue-700 border-blue-200',
    uiux: 'bg-purple-50 text-purple-700 border-purple-200',
    ai: 'bg-amber-50 text-amber-800 border-amber-200',
    qa: 'bg-teal-50 text-teal-800 border-teal-200',
  }[variant]

  const dotColor = {
    success: 'bg-academic-emerald',
    warning: 'bg-academic-amber',
    error: 'bg-academic-coral',
    info: 'bg-primary',
    neutral: 'bg-slate-400',
    se: 'bg-blue-600',
    uiux: 'bg-purple-600',
    ai: 'bg-amber-600',
    qa: 'bg-teal-600',
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
