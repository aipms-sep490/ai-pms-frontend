import type { EvidenceReference } from '../ai-api'

/**
 * Evidence is rendered exactly as the scoped Backend AI contract returns it.
 * `referenceUrl` is deliberately not translated into a frontend route: it is
 * an API reference, not a confirmed canonical UI deep-link for every actor.
 */
export function EvidenceReferences({ items, heading = 'Chứng cứ hệ thống trả về' }: { items: EvidenceReference[]; heading?: string }) {
  if (!items.length) return <p className="mt-3 text-sm text-slate-600">Chưa có minh chứng tham chiếu.</p>

  return <section className="mt-4" aria-label={heading}>
    <h3 className="text-sm font-semibold text-slate-900">{heading}</h3>
    <ul className="mt-2 space-y-2 text-sm text-slate-700">
      {items.map((item) => <li key={`${item.sourceType}-${item.sourceId}`} className="rounded-lg border border-hairline bg-card p-3">
        <p className="font-semibold text-slate-900">{item.title}</p>
        <p className="mt-1 text-xs text-slate-500">{item.sourceType} · {item.sourceId}{item.periodOrDate ? ` · ${item.periodOrDate}` : ''}</p>
        {item.excerpt && <p className="mt-2 whitespace-pre-wrap leading-6">{item.excerpt}</p>}
        {item.referenceUrl && <p className="mt-2 break-all text-xs text-slate-500">Nguồn tham chiếu: {item.referenceUrl}</p>}
      </li>)}
    </ul>
  </section>
}
