import type { ReactNode } from 'react'
import { badgeToneClass, type BadgeTone } from './status-badge-tone'

export type HistoryTimelineItem = {
  at: string | Date
  actor: string
  action: ReactNode
  note?: string | null
  tone?: BadgeTone
}

export function HistoryTimeline({ items, emptyLabel = 'Chưa có lịch sử xử lý.' }: { items: readonly HistoryTimelineItem[]; emptyLabel?: string }) {
  if (items.length === 0) return <p role="status" className="rounded-lg border border-hairline bg-card p-4 text-sm text-ink-muted">{emptyLabel}</p>

  const newestFirst = [...items].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  return (
    <ol className="border-l border-hairline pl-5">
      {newestFirst.map((item, index) => {
        const date = new Date(item.at)
        const dateTime = item.at instanceof Date ? item.at.toISOString() : item.at
        return (
          <li key={`${dateTime}-${index}`} className="relative pb-5 last:pb-0">
            <span aria-hidden="true" className={`absolute -left-[1.7rem] top-1.5 h-3 w-3 rounded-full border ${badgeToneClass[item.tone ?? 'neutral']}`} />
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
              <div className="font-semibold text-ink">{item.action}</div>
              {item.actor && <span className="text-ink-soft">{item.actor}</span>}
              <time dateTime={dateTime} className="text-xs tabular-nums text-ink-muted">{Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN')}</time>
            </div>
            {item.note && <p data-history-note className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">{item.note}</p>}
          </li>
        )
      })}
    </ol>
  )
}
