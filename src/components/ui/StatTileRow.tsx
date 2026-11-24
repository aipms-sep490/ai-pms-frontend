import type { BadgeTone } from './status-badge-tone'

export type StatTile = {
  icon: string
  label: string
  value: number | string | null
  caption?: string
  tone?: BadgeTone
  hero?: boolean
  onClick?: () => void
  active?: boolean
}

const toneAccentBorder: Record<BadgeTone, string> = {
  info: 'border-t-primary',
  success: 'border-t-status-success-text',
  warning: 'border-t-status-warning-text',
  danger: 'border-t-status-error-text',
  neutral: 'border-t-line-strong',
}

const toneIconChip: Record<BadgeTone, string> = {
  info: 'bg-primary-subtle text-primary',
  success: 'bg-status-success-bg text-status-success-text',
  warning: 'bg-status-warning-bg text-status-warning-text',
  danger: 'bg-status-error-bg text-status-error-text',
  neutral: 'bg-canvas text-ink-soft',
}

const toneValueText: Record<BadgeTone, string> = {
  info: 'text-ink',
  success: 'text-ink',
  warning: 'text-ink',
  danger: 'text-status-error-text',
  neutral: 'text-ink',
}

export function StatTileRow({ tiles }: { tiles: readonly StatTile[] }) {
  if (tiles.length === 0) return null
  const visible = tiles.slice(0, 4)
  const heroIndex = visible.findIndex((tile) => tile.hero)

  const gridCols = visible.length === 1
    ? 'grid-cols-1'
    : visible.length === 2
      ? 'sm:grid-cols-2'
      : visible.length === 3
        ? 'sm:grid-cols-3'
        : 'sm:grid-cols-2 lg:grid-cols-4'

  return (
    <ul className={`grid items-stretch gap-3 ${gridCols}`} aria-label="Chỉ số tổng quan">
      {visible.map((tile, index) => {
        const hero = index === heroIndex
        const tone: BadgeTone = tile.tone ?? 'info'
        const isInteractive = typeof tile.onClick === 'function'
        const activeClass = tile.active ? 'ring-2 ring-primary ring-offset-2' : ''
        const interactiveClass = isInteractive
          ? 'cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/50 active:translate-y-0 text-left w-full'
          : ''

        const surfaceClass = hero
          ? 'border-primary bg-primary text-white shadow-xs'
          : `border-hairline border-t-[3px] ${toneAccentBorder[tone]} bg-card text-ink shadow-2xs`

        const iconChipClass = hero
          ? 'bg-white/15 text-white'
          : toneIconChip[tone]

        const valueTextClass = hero ? 'text-white' : toneValueText[tone]

        return (
          <li
            key={`${tile.label}-${index}`}
            data-hero={hero || undefined}
            data-active={tile.active || undefined}
            className={`flex h-full min-w-0 flex-col justify-between rounded-xl border p-4 ${surfaceClass} ${activeClass} ${interactiveClass}`}
            onClick={tile.onClick}
            role={isInteractive ? 'button' : undefined}
            tabIndex={isInteractive ? 0 : undefined}
            aria-pressed={isInteractive ? Boolean(tile.active) : undefined}
            onKeyDown={isInteractive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tile.onClick?.() } } : undefined}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className={`block text-xs font-semibold uppercase tracking-[0.05em] leading-snug ${hero ? 'text-white' : 'text-ink-muted'}`}>
                  {tile.label}
                </span>
                <span
                  aria-hidden="true"
                  className={`material-symbols-outlined grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[18px] ${iconChipClass}`}
                >
                  {tile.icon}
                </span>
              </div>
              <strong className={`mt-2 block text-2xl sm:text-[28px] font-bold leading-tight tabular-nums ${valueTextClass}`}>
                {tile.value === null ? '—' : typeof tile.value === 'string' ? tile.value : tile.value.toLocaleString('vi-VN')}
              </strong>
            </div>

            {(tile.caption || tile.value === null) && (
              <p className={`mt-2.5 text-xs leading-relaxed ${hero ? 'text-white' : 'text-ink-soft'}`}>
                {tile.caption ?? 'Chưa có dữ liệu trong phạm vi hiện tại.'}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
