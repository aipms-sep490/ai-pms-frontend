import type { ButtonProps } from './Button'

export function buttonClassName({ size = 'md', variant = 'primary', className = '' }: Pick<ButtonProps, 'size' | 'variant' | 'className'> = {}) {
  const sizeStyles = {
    sm: 'h-8 px-2.5 text-xs gap-1.5',
    md: 'h-10 px-3.5 text-[13px] gap-2',
    lg: 'h-11 px-4 text-sm gap-2.5',
  }[size]

  const variantStyles = {
    primary:
      'bg-primary hover:bg-primary-hover text-white hover:text-white font-medium shadow-[0_2px_8px_-2px_rgba(15,91,78,0.24)] hover:shadow-[0_4px_12px_-3px_rgba(15,91,78,0.28)] active:scale-[0.98] active:translate-y-[0.5px] border border-transparent',
    secondary:
      'bg-white hover:bg-primary-subtle/60 text-slate-800 border border-hairline hover:border-primary/30 shadow-xs active:scale-[0.98] active:translate-y-[0.5px]',
    outline:
      'bg-transparent hover:bg-primary-subtle text-primary border border-hairline hover:border-primary active:scale-[0.98] active:translate-y-[0.5px]',
    ghost:
      'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-transparent',
    danger:
      'bg-white hover:bg-red-50 text-red-700 font-medium border border-red-200 active:scale-[0.99]',
  }[variant]

  return `mk-press ui-button-${variant} inline-flex items-center justify-center rounded-lg select-none whitespace-nowrap transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none font-sans font-medium ${sizeStyles} ${variantStyles} ${className}`.trim()
}
