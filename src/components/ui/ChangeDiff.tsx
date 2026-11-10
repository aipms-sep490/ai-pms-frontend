type DiffValue = string | number | null | undefined

export type ChangeDiffRow = { label: string; before: DiffValue; after: DiffValue }

function displayValue(value: DiffValue): string {
  return value == null || value === '' ? '—' : String(value)
}

export function ChangeDiff({ rows, beforeLabel = 'HIỆN TẠI', afterLabel = 'ĐỀ XUẤT' }: {
  rows: readonly ChangeDiffRow[]
  beforeLabel?: string
  afterLabel?: string
}) {
  return (
    <div className="grid gap-4 rounded-lg border border-hairline bg-card p-4 md:grid-cols-2" aria-label="So sánh thay đổi">
      <section className="min-w-0">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">{beforeLabel}</h3>
        <dl className="space-y-2">
          {rows.map((row) => {
            const changed = displayValue(row.before) !== displayValue(row.after)
            return (
              <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 text-sm">
                <dt className="text-ink-muted">{row.label}</dt>
                <dd className={`min-w-0 break-words ${changed ? 'text-ink' : 'text-ink-muted'}`}>{displayValue(row.before)}</dd>
              </div>
            )
          })}
        </dl>
      </section>
      <section className="min-w-0 border-t border-hairline pt-4 md:border-l md:border-t-0 md:pl-4 md:pt-0">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.06em] text-primary">{afterLabel}</h3>
        <dl className="space-y-2">
          {rows.map((row) => {
            const changed = displayValue(row.before) !== displayValue(row.after)
            return (
              <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 text-sm">
                <dt className="text-ink-muted">{row.label}</dt>
                <dd data-changed={changed || undefined} className={`min-w-0 break-words ${changed ? 'font-semibold text-primary' : 'text-ink-muted'}`}>{displayValue(row.after)}</dd>
              </div>
            )
          })}
        </dl>
      </section>
    </div>
  )
}
