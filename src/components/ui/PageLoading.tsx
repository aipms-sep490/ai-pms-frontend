import './page-loading.css'

/** Neutral placeholders while identity or project data is still unknown. */
export function PageLoading({ fullPage = false, label = 'Đang tải…' }: { fullPage?: boolean; label?: string }) {
  return <div className={`page-loading ${fullPage ? 'page-loading--full' : ''}`} role="status" aria-label={label}>
    <div className="page-loading__content" aria-hidden="true">
      <span className="page-loading__line page-loading__line--short" />
      <span className="page-loading__line page-loading__line--title" />
      <span className="page-loading__line" />
      <div className="page-loading__rows">{[0, 1, 2].map(item => <div key={item}><span /><span /></div>)}</div>
    </div>
    <span className="sr-only">{label}</span>
  </div>
}
