export interface IntendedDestinationState {
  from?: unknown
}

/** Only preserve same-origin application paths; never trust external redirect input. */
export function resolveIntendedDestination(
  state: unknown,
  fallback = '/project/workspace',
): string {
  const from = (state as IntendedDestinationState | null)?.from
  if (typeof from !== 'string') return fallback
  if (!from.startsWith('/') || from.startsWith('//') || from.includes('://')) return fallback
  return from
}
