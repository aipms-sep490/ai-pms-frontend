import type { HTMLAttributes, ReactNode } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
  hoverable?: boolean
}

export function Card({ children, className = '', hoverable = false, ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-xs transition-all duration-150 ${
        hoverable ? 'hover:border-slate-300 hover:shadow-sm' : ''
      } ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`p-4 pb-3 border-b border-slate-100 flex items-center justify-between gap-3 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`font-heading text-sm font-semibold text-slate-900 tracking-tight ${className}`.trim()}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardDescription({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-xs text-slate-500 font-sans mt-0.5 ${className}`.trim()} {...props}>
      {children}
    </p>
  )
}

export function CardContent({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-4 ${className}`.trim()} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`p-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  )
}
