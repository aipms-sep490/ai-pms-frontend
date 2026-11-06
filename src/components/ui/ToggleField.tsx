export function ToggleField({ label, description, checked, onChange, disabled = false }: {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex min-h-16 min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-hairline bg-card p-4 text-sm">
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{label}</span>
        {description && <span className="mt-1 block text-ink-muted">{description}</span>}
      </span>
      <span className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-1">
        <input
          type="checkbox"
          role="switch"
          aria-label={label}
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="relative h-6 w-11 cursor-pointer appearance-none rounded-full bg-hairline transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:content-[''] checked:bg-primary checked:after:translate-x-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
        />
        <span className={`text-xs font-semibold ${checked ? 'text-primary' : 'text-ink-muted'}`}>{checked ? 'ĐANG BẬT' : 'ĐANG TẮT'}</span>
      </span>
    </label>
  )
}
