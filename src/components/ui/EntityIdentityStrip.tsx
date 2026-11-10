import { badgeToneClass, type BadgeTone } from './status-badge-tone'

export type EntityIdentityChip = { icon: string; label: string; value: string; tone?: BadgeTone }

export function EntityIdentityStrip({ chips }: { chips: readonly EntityIdentityChip[] }) {
  if (chips.length === 0) return null

  return (
    <ul className="mb-6 flex min-w-0 flex-wrap gap-3" aria-label="Thông tin định danh">
      {chips.slice(0, 5).map((chip, index) => (
        <li key={`${chip.label}-${index}`} className="flex min-w-0 max-w-full flex-[1_1_12rem] items-center gap-2 rounded-lg border border-hairline bg-card p-2.5">
          <span aria-hidden="true" className={`material-symbols-outlined grid h-10 w-10 flex-none place-items-center rounded-lg ${chip.tone ? `border ${badgeToneClass[chip.tone]}` : 'bg-primary-subtle text-primary'}`}>
            {chip.icon}
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">{chip.label}</span>
            <span className="block truncate text-sm font-semibold text-ink" title={chip.value}>{chip.value}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
