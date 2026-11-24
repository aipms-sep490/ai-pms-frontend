import type { ButtonProps } from './Button'

export function buttonClassName({
  size = 'md',
  variant = 'primary',
  className = '',
  iconOnly = false,
}: Pick<ButtonProps, 'size' | 'variant' | 'className'> & { iconOnly?: boolean } = {}) {
  const sizeStyles = iconOnly
    ? {
        sm: 'w-9 h-9 p-0 min-h-[36px] text-xs',
        md: 'w-10 h-10 p-0 min-h-[40px] text-[13px]',
        lg: 'w-11 h-11 p-0 min-h-[44px] text-sm',
      }[size]
    : {
        // WCAG 2.2 Target Size (Minimum) Exception for secondary inline/table row controls
        sm: 'px-2.5 text-xs gap-1.5 min-h-[36px]',
        md: 'px-3.5 text-[13px] gap-2 min-h-[40px]',
        lg: 'px-4 text-sm gap-2.5 min-h-[44px]',
      }[size]

  const variantStyles = {
    primary:
      'bg-primary hover:bg-primary-hover text-white hover:text-white font-medium shadow-primary hover:shadow-primary-hover active:scale-[0.98] active:translate-y-[0.5px] border border-transparent',
    secondary:
      'bg-card hover:bg-primary-subtle/80 text-ink border border-hairline hover:border-primary/40 shadow-xs active:scale-[0.98] active:translate-y-[0.5px]',
    outline:
      'bg-transparent hover:bg-primary-subtle text-primary border border-hairline hover:border-primary active:scale-[0.98] active:translate-y-[0.5px]',
    ghost:
      'bg-transparent hover:bg-canvas text-ink-muted hover:text-ink border border-transparent',
    warning:
      'bg-card hover:bg-status-warning-bg text-status-warning-text font-medium border border-status-warning-border active:scale-[0.99]',
    danger:
      'bg-card hover:bg-status-error-bg text-status-error-text font-medium border border-status-error-border active:scale-[0.99]',
  }[variant]

  return `mk-press ui-button-${variant} inline-flex items-center justify-center rounded-lg select-none whitespace-nowrap transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none font-sans font-medium ${sizeStyles} ${variantStyles} ${className}`.trim()
}
