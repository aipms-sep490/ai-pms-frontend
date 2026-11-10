import { badgeToneClass, type BadgeTone } from './status-badge-tone'

export type StatTile = {
  icon: string
  label: string
  value: number | null
  caption?: string
  tone?: BadgeTone
  hero?: boolean
}

export function StatTileRow({ tiles }: { tiles: readonly StatTile[] }) {
  if (tiles.length === 0) return null
  const visible = tiles.slice(0, 4)
  const heroIndex = visible.findIndex((tile) => tile.hero)

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Chỉ số tổng quan">
      {visible.map((tile, index) => {
        const hero = index === heroIndex
        return (
          <li key={`${tile.label}-${index}`} data-hero={hero || undefined} className={`min-w-0 rounded-xl border p-4 ${hero ? 'border-primary bg-primary text-white' : tile.tone ? badgeToneClass[tile.tone] : 'border-hairline bg-card text-ink'}`}>
            <span aria-hidden="true" className={`material-symbols-outlined mb-3 grid h-10 w-10 place-items-center rounded-lg ${hero ? 'bg-white/15 text-white' : 'bg-primary-subtle text-primary'}`}>
              {tile.icon}
            </span>
            <span className={`block text-xs font-semibold uppercase tracking-[0.06em] ${hero ? 'text-white' : 'text-ink-muted'}`}>{tile.label}</span>
            <strong className="mt-1 block text-3xl font-semibold tabular-nums">{tile.value === null ? '—' : tile.value.toLocaleString('vi-VN')}</strong>
            {(tile.caption || tile.value === null) && <p className={`mt-2 text-sm ${hero ? 'text-white' : 'text-ink-soft'}`}>{tile.caption ?? 'Chưa có dữ liệu trong phạm vi hiện tại.'}</p>}
          </li>
        )
      })}
    </ul>
  )
}
