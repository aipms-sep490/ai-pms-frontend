import type { HTMLAttributes, ReactNode } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
  hoverable?: boolean
}

export function Card({ children, className = '', hoverable = false, ...props }: CardProps) {
  return (
    <div
      className={`bg-card rounded-xl border border-hairline shadow-xs transition-all duration-150 ${
        hoverable ? 'hover:border-line-strong hover:shadow-sm' : ''
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
      className={`p-4 pb-3 border-b border-line flex items-center justify-between gap-3 ${className}`.trim()}
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
      className={`font-heading text-sm font-semibold text-ink tracking-tight ${className}`.trim()}
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
    <p className={`text-xs text-ink-muted font-sans mt-0.5 ${className}`.trim()} {...props}>
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
      className={`p-4 pt-3 border-t border-line flex items-center justify-between text-xs text-ink-muted ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  )
}
