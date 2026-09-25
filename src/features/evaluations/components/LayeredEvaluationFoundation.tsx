import { useLayeredEvaluationAvailability } from '../hooks/useLayeredEvaluationAvailability'

/** Displays the integration boundary; it deliberately has no score inputs or mutations. */
export function LayeredEvaluationFoundation() {
  const availability = useLayeredEvaluationAvailability()
  return (
    <section aria-labelledby="layered-evaluation-heading" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="text-[11px] font-bold uppercase tracking-wider">Evaluator foundation</p>
      <h2 id="layered-evaluation-heading" className="mt-1 font-bold">Layered evaluation is awaiting backend contract W7-BE-02</h2>
      <p className="mt-2">The future scopes are shown for integration planning only. Backend remains the authority for assignments, targets, scores, totals, and finalization.</p>
      <ul className="mt-3 list-disc pl-5">{availability.capabilities.map((capability) => <li key={capability.scope}>{capability.scope} → {capability.requiredTarget} target · backend pending</li>)}</ul>
    </section>
  )
}
