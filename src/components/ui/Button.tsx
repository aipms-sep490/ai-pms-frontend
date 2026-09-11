import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: string
  shortcut?: string
  children?: ReactNode
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  shortcut,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const sizeStyles = {
    sm: 'h-8 px-2.5 text-xs gap-1.5',
    md: 'h-9 px-3.5 text-[13px] gap-2',
    lg: 'h-10 px-4 text-sm gap-2.5',
  }[size]

  const variantStyles = {
    primary:
      'bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium shadow-xs active:scale-[0.99] border border-transparent',
    secondary:
      'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-xs hover:border-slate-300 active:scale-[0.99]',
    outline:
      'bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-300 active:scale-[0.99]',
    ghost:
      'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-transparent',
    danger:
      'bg-red-600 hover:bg-red-700 text-white font-medium shadow-xs border border-transparent active:scale-[0.99]',
  }[variant]

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-lg select-none whitespace-nowrap transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none font-sans ${sizeStyles} ${variantStyles} ${className}`.trim()}
      {...props}
    >
      {icon && (
        <span className="material-symbols-outlined text-[16px] leading-none" aria-hidden="true">
          {icon}
        </span>
      )}
      {children && <span>{children}</span>}
      {shortcut && (
        <kbd
          className={`ml-1 px-1.5 py-0.5 rounded font-mono text-[10px] leading-none font-semibold ${
            variant === 'primary' || variant === 'danger'
              ? 'bg-white/20 text-white'
              : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          {shortcut}
        </kbd>
      )}
    </button>
  )
}
