import { Link, type LinkProps } from 'react-router-dom'
import type { ButtonProps } from './Button'
import { buttonClassName } from './button-styles'

/** Navigation with the same visual treatment as an action, using one interactive element. */
export function ButtonLink({ children, icon, variant = 'secondary', size, className, ...props }: LinkProps & Pick<ButtonProps, 'icon' | 'variant' | 'size'>) {
  return <Link className={buttonClassName({ variant, size, className })} {...props}>
    {icon && <span className="material-symbols-outlined text-[16px] leading-none" aria-hidden="true">{icon}</span>}
    <span>{children}</span>
  </Link>
}
