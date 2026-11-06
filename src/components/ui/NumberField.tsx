import { useId } from 'react'

export function NumberField({ label, description, value, unit, min, step = 1, onChange, disabled = false, error }: {
  label: string
  description?: string
  value: number | ''
  unit: string
  min?: number
  step?: number
  onChange: (value: number | '') => void
  disabled?: boolean
  error?: string
}) {
  const descriptionId = useId()
  const errorId = useId()
  const cannotStep = disabled || value === ''

  return (
    <div className="flex min-h-16 min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-hairline bg-card p-4 text-sm">
      <div className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{label}</span>
        {description && <span id={descriptionId} className="mt-1 block text-ink-muted">{description}</span>}
      </div>
      <div className="flex max-w-full items-center gap-1">
        <button type="button" aria-label={`Giảm ${label}`} disabled={cannotStep || (min !== undefined && value <= min)} onClick={() => onChange((value as number) - step)} className="min-h-10 min-w-10 rounded-lg border border-hairline bg-card text-lg text-ink hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50">−</button>
        <input
          type="number"
          aria-label={label}
          aria-invalid={Boolean(error)}
          aria-describedby={[description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined}
          value={value}
          min={min}
          step={step}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value === '' ? '' : event.target.valueAsNumber)}
          className="min-h-10 w-20 rounded-lg border border-hairline bg-card px-2 text-center font-semibold tabular-nums text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        />
        <button type="button" aria-label={`Tăng ${label}`} disabled={cannotStep} onClick={() => onChange((value as number) + step)} className="min-h-10 min-w-10 rounded-lg border border-hairline bg-card text-lg text-ink hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50">+</button>
        <span className="rounded-lg border border-hairline bg-canvas px-2 py-2 text-xs font-semibold text-ink-soft">{unit}</span>
      </div>
      {error && <p id={errorId} className="w-full text-xs text-status-error-text">{error}</p>}
    </div>
  )
}
