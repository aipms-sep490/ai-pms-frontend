import './list-loading.css'

/** Reserves the row layout without presenting placeholders as interactive items. */
export function ListLoading({ label }: { label: string }) {
  return <div className="list-loading" role="status" aria-label={label}>
    <span className="sr-only">{label}</span>
    <div aria-hidden="true">{[0, 1, 2].map(row => <div className="list-loading-row" key={row}>
      <span className="list-loading-icon" />
      <div className="list-loading-copy"><span /><span /><span /></div>
      <span className="list-loading-action" />
    </div>)}</div>
  </div>
}
