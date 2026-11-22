import { badgeToneClass, type BadgeTone } from './status-badge-tone'

export type EntityIdentityChip = { icon: string; label: string; value: string; tone?: BadgeTone }

export function EntityIdentityStrip({ chips }: { chips: readonly EntityIdentityChip[] }) {
  if (chips.length === 0) return null

  const visible = chips.slice(0, 5)
  const gridCols = visible.length === 2
    ? 'sm:grid-cols-2'
    : visible.length === 3
      ? 'sm:grid-cols-3'
      : visible.length === 4
        ? 'sm:grid-cols-2 xl:grid-cols-4'
        : 'sm:grid-cols-2 lg:grid-cols-3'

  return (
    <ul className={`mb-6 grid min-w-0 grid-cols-1 gap-3 ${gridCols}`} aria-label="Thông tin định danh">
      {visible.map((chip, index) => (
        <li key={`${chip.label}-${index}`} className="flex min-w-0 items-start gap-2.5 rounded-lg border border-hairline bg-card p-3">
          <span aria-hidden="true" className={`material-symbols-outlined grid h-10 w-10 flex-none place-items-center rounded-lg ${chip.tone ? `border ${badgeToneClass[chip.tone]}` : 'bg-primary-subtle text-primary'}`}>
            {chip.icon}
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">{chip.label}</span>
            <span className="block line-clamp-2 break-words text-sm font-semibold text-ink" title={chip.value}>{chip.value}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
