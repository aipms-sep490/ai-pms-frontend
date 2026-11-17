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

export function StatTileRow({ tiles }: { tiles: readonly StatTile[] }) {
  if (tiles.length === 0) return null
  const visible = tiles.slice(0, 4)
  const heroIndex = visible.findIndex((tile) => tile.hero)

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Chỉ số tổng quan">
      {visible.map((tile, index) => {
        const hero = index === heroIndex
        const isInteractive = typeof tile.onClick === 'function'
        const activeClass = tile.active ? 'ring-2 ring-primary ring-offset-2' : ''
        const interactiveClass = isInteractive
          ? 'cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-0 text-left w-full'
          : ''

        const content = (
          <>
            <span aria-hidden="true" className={`material-symbols-outlined mb-3 grid h-10 w-10 place-items-center rounded-lg ${hero ? 'bg-white/15 text-white' : 'bg-primary-subtle text-primary'}`}>
              {tile.icon}
            </span>
            <span className={`block text-xs font-semibold uppercase tracking-[0.06em] ${hero ? 'text-white' : 'text-ink-muted'}`}>{tile.label}</span>
            <strong className="mt-1 block text-3xl font-semibold tabular-nums">{tile.value === null ? '—' : tile.value.toLocaleString('vi-VN')}</strong>
            {(tile.caption || tile.value === null) && <p className={`mt-2 text-sm ${hero ? 'text-white' : 'text-ink-soft'}`}>{tile.caption ?? 'Chưa có dữ liệu trong phạm vi hiện tại.'}</p>}
          </>
        )

        return (
          <li
            key={`${tile.label}-${index}`}
            data-hero={hero || undefined}
            data-active={tile.active || undefined}
            className={`min-w-0 rounded-xl border p-4 ${hero ? 'border-primary bg-primary text-white' : tile.tone ? badgeToneClass[tile.tone] : 'border-hairline bg-card text-ink'} ${activeClass} ${interactiveClass}`}
            onClick={tile.onClick}
            role={isInteractive ? 'button' : undefined}
            tabIndex={isInteractive ? 0 : undefined}
            aria-pressed={isInteractive ? Boolean(tile.active) : undefined}
            onKeyDown={isInteractive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tile.onClick?.() } } : undefined}
          >
            {content}
          </li>
        )
      })}
    </ul>
  )
}
