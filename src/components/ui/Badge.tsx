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
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    se: 'bg-blue-50 text-blue-700 border-blue-200',
    uiux: 'bg-purple-50 text-purple-700 border-purple-200',
    ai: 'bg-amber-50 text-amber-800 border-amber-200',
    qa: 'bg-teal-50 text-teal-800 border-teal-200',
  }[variant]

  const dotColor = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
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
          className={`w-1.5 h-1.5 rounded-full ${dotColor} ${pulse ? 'animate-pulse' : ''}`}
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
