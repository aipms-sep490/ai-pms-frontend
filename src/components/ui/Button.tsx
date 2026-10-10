import { buttonClassName } from './button-styles'
import './interaction-polish.css'
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>
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
  const styles = buttonClassName({ size, variant, className })

  return (
    <button
      type={type}
      className={styles}
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
          className={`ml-1 px-1.5 py-0.5 rounded font-mono text-xs leading-none font-semibold ${
            variant === 'primary'
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

