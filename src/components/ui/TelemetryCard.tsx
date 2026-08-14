import type { ReactNode } from 'react'

export interface TelemetryCardProps {
  label: string
  value: string | number
  unit?: string
  icon?: string
  iconColor?: string
  statusBadge?: ReactNode
  subtitle?: string
  className?: string
}

export function TelemetryCard({
  label,
  value,
  unit,
  icon,
  iconColor = 'text-blue-600',
  statusBadge,
  subtitle,
  className = '',
}: TelemetryCardProps) {
  return (
    <div
      className={`p-4 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between gap-3 ${className}`.trim()}
    >
      <div className="flex items-center justify-between text-slate-500">
        <span className="uppercase tracking-wider font-mono text-[11px] font-semibold">
          {label}
        </span>
        {icon && (
          <span className={`material-symbols-outlined text-[18px] ${iconColor}`} aria-hidden="true">
            {icon}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-heading text-2xl font-bold text-slate-900 tracking-tight leading-none">
          {value}
        </span>
        {unit && <span className="text-xs font-sans text-slate-500">{unit}</span>}
      </div>

      {(statusBadge || subtitle) && (
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          {statusBadge && <div>{statusBadge}</div>}
          {subtitle && <span className="text-[11px] text-slate-500 truncate">{subtitle}</span>}
        </div>
      )}
    </div>
  )
}
