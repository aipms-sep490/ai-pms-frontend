import { badgeToneClass, type BadgeTone } from './status-badge-tone'

export type StatTile = {
  icon: string
  label: string
  value: number | null
  caption?: string
  tone?: BadgeTone
  hero?: boolean
  onClick?: () => void
  active?: boolean
}

const gridColumnsByCount: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}

const iconToneClass: Record<BadgeTone, string> = {
  success: 'border-status-success-border bg-card text-status-success-text',
  warning: 'border-status-warning-border bg-card text-status-warning-text',
  danger: 'border-status-error-border bg-card text-status-error-text',
  info: 'border-primary/20 bg-primary-subtle text-primary',
  neutral: 'border-hairline bg-card text-ink-soft',
}

export function StatTileRow({ tiles }: { tiles: readonly StatTile[] }) {
  if (tiles.length === 0) return null
  const visible = tiles.slice(0, 4)
  const heroIndex = visible.findIndex((tile) => tile.hero)
  const gridClass = gridColumnsByCount[visible.length] ?? gridColumnsByCount[4]

  return (
    <ul className={`grid gap-3 ${gridClass}`} aria-label="Chỉ số tổng quan">
      {visible.map((tile, index) => {
        const hero = index === heroIndex
        const isInteractive = typeof tile.onClick === 'function'
        const activeClass = tile.active ? 'ring-2 ring-primary ring-offset-2' : ''
        const surfaceClass = hero
          ? 'border-primary bg-gradient-to-br from-primary to-primary-hover text-white shadow-sm'
          : tile.tone
            ? badgeToneClass[tile.tone]
            : 'border-hairline bg-card text-ink'
        const iconClass = hero
          ? 'bg-white/15 text-white'
          : tile.tone
            ? `border ${iconToneClass[tile.tone]}`
            : 'border border-primary/15 bg-primary-subtle text-primary'

        const content = (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className={`block text-xs font-bold uppercase tracking-[0.05em] ${hero ? 'text-white' : 'text-ink-soft'}`}>{tile.label}</span>
                <strong className="mt-1.5 block text-3xl font-bold tracking-tight tabular-nums">{tile.value === null ? '—' : tile.value.toLocaleString('vi-VN')}</strong>
              </div>
              <span aria-hidden="true" className={`material-symbols-outlined shrink-0 grid h-10 w-10 place-items-center rounded-xl ${iconClass}`}>
                {tile.icon}
              </span>
            </div>
            {(tile.caption || tile.value === null) && <p className={`mt-2.5 text-xs leading-5 ${hero ? 'text-white' : 'text-ink-muted'}`}>{tile.caption ?? 'Chưa có dữ liệu trong phạm vi hiện tại.'}</p>}
          </>
        )

        if (isInteractive) {
          return (
            <li
              key={`${tile.label}-${index}`}
              data-hero={hero || undefined}
              data-active={tile.active || undefined}
              className="min-w-0 flex"
            >
              <button
                type="button"
                onClick={tile.onClick}
                aria-pressed={Boolean(tile.active)}
                className={`min-w-0 w-full flex flex-col justify-between rounded-xl border p-4 text-left shadow-xs cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${surfaceClass} ${activeClass}`}
              >
                {content}
              </button>
            </li>
          )
        }

        return (
          <li
            key={`${tile.label}-${index}`}
            data-hero={hero || undefined}
            data-active={tile.active || undefined}
            className={`min-w-0 rounded-xl border p-4 shadow-xs transition-shadow hover:shadow-sm ${surfaceClass} ${activeClass}`}
          >
            {content}
          </li>
        )
      })}
    </ul>
  )
}
