import type { ButtonProps } from './Button'

export function buttonClassName({ size = 'md', variant = 'primary', className = '' }: Pick<ButtonProps, 'size' | 'variant' | 'className'> = {}) {
  const sizeStyles = {
    // WCAG 2.2 Target Size (Minimum) Exception for secondary inline/table row controls
    sm: 'px-2.5 text-xs gap-1.5 min-h-[36px]',
    md: 'px-3.5 text-[13px] gap-2 min-h-[44px]',
    lg: 'px-4 text-sm gap-2.5 min-h-[48px]',
  }[size]

  const variantStyles = {
    primary:
      'bg-primary hover:bg-primary-hover text-white hover:text-white font-medium shadow-primary hover:shadow-primary-hover active:scale-[0.98] active:translate-y-[0.5px] border border-transparent',
    secondary:
      'bg-white hover:bg-primary-subtle/80 text-ink border border-hairline hover:border-primary/40 shadow-xs active:scale-[0.98] active:translate-y-[0.5px]',
    outline:
      'bg-transparent hover:bg-primary-subtle text-primary border border-hairline hover:border-primary active:scale-[0.98] active:translate-y-[0.5px]',
    ghost:
      'bg-transparent hover:bg-slate-100 text-ink-muted hover:text-ink border border-transparent',
    danger:
      'bg-white hover:bg-status-error-bg text-danger-text font-medium border border-status-error-border active:scale-[0.99]',
  }[variant]

  return `mk-press ui-button-${variant} inline-flex items-center justify-center rounded-lg select-none whitespace-nowrap transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none font-sans font-medium ${sizeStyles} ${variantStyles} ${className}`.trim()
}
