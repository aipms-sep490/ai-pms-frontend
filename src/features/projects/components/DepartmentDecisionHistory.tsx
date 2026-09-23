/** The current API exposes only the latest submission decision set. */
export function DepartmentDecisionHistory() {
  return (
    <section aria-labelledby="department-decision-history-heading">
      <h2 id="department-decision-history-heading">Previous submission decisions</h2>
      <p className="text-sm text-slate-600">Historical department-decision snapshots are not returned by the current Backend contract. They are intentionally not inferred from the current snapshot.</p>
    </section>
  )
}
