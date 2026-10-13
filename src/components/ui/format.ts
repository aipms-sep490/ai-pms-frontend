/**
 * Shared number formatters for scores, percentages and plain counts. Centralizes the
 * `value == null → '—'` convention that evaluation/result screens each re-implemented
 * on their own (e.g. `const fmt = (v) => v == null ? '—' : String(v)`), and gives every
 * screen the same locale-aware rendering instead of raw `String(value)`.
 *
 * A missing score must never render as `0` or be silently dropped — it means "not graded
 * yet", not "zero". Every formatter here renders `null`/`undefined`/`NaN` as `'—'`.
 */

export function formatNumber(value: number | null | undefined, options?: Intl.NumberFormatOptions): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('vi-VN', options).format(value)
}

/** A score on the project's grading scale (e.g. 0–10). Up to 2 decimals, no trailing zero padding. */
export function formatScore(value: number | null | undefined): string {
  return formatNumber(value, { maximumFractionDigits: 2 })
}

/** `value` is already a percentage number (e.g. 50 for "50%"), not a 0–1 fraction. */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${formatNumber(value, { maximumFractionDigits: 1 })}%`
}

/** A plain integer count (tasks, members, criteria…). */
export function formatCount(value: number | null | undefined): string {
  return formatNumber(value, { maximumFractionDigits: 0 })
}
