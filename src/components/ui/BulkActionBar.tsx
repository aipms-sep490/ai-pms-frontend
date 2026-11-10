import type { ReactNode } from 'react'

export type BlockedSelectionItem = { id: string | number; label: string; reason: string }

export function BulkActionBar({ count, noun, blocked = [], onClear, children }: {
  count: number
  noun: string
  blocked?: readonly BlockedSelectionItem[]
  onClear: () => void
  children?: ReactNode
}) {
  if (count <= 0) return null
  const hasBlocked = blocked.length > 0

  return (
    <section
      role="region"
      aria-label="Các mục đang chọn"
      data-tone={hasBlocked ? 'attention' : 'default'}
      className={`mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-l-4 p-3 text-sm ${hasBlocked ? 'border-hairline border-l-attention-border bg-attention-bg' : 'border-hairline border-l-primary bg-primary-subtle'}`}
    >
      <div className="min-w-0">
        <strong className="text-ink">Đã chọn {count} {noun}</strong>
        {hasBlocked && (
          <div className="mt-1 text-ink-soft">
            <p>Không thể áp dụng hành động cho các mục đã khóa:</p>
            <ul className="list-disc pl-5">
              {blocked.map((item) => <li key={item.id}><strong>{item.label}</strong>: {item.reason}</li>)}
            </ul>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!hasBlocked && children}
        <button type="button" onClick={onClear} className="min-h-10 rounded-lg border border-hairline bg-card px-3 py-2 font-semibold text-ink hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          Bỏ chọn
        </button>
      </div>
    </section>
  )
}
