import { useEffect, useMemo, useState } from 'react'

interface ContextualBlockerBannerProps {
  code?: string | null
  title: string
  detail: string
  actionLabel?: string
  onAction?: () => void
}

export function ContextualBlockerBanner({ code, title, detail, actionLabel, onAction }: ContextualBlockerBannerProps) {
  return (
    <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1 text-xs">
        <div className="font-semibold text-amber-950">
          {title} {code && <span className="ml-1 rounded bg-amber-200 px-1.5 py-0.5 font-mono text-xs">{code}</span>}
        </div>
        <p className="text-amber-900">{detail}</p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export interface ImpactDiffRow {
  label: string
  before: string
  after: string
  highlight?: 'neutral' | 'warning' | 'danger'
}

interface ImpactDiffSheetProps {
  open: boolean
  title: string
  summary: string
  rows: ImpactDiffRow[]
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => Promise<void> | void
  onClose: () => void
}

export function ImpactDiffSheet({
  open,
  title,
  summary,
  rows,
  confirmLabel = 'Xác nhận áp dụng',
  busy = false,
  onConfirm,
  onClose,
}: ImpactDiffSheetProps) {
  if (!open) return null
  return (
    <aside
      role="dialog"
      aria-label={title}
      className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white border-l border-slate-200 shadow-2xl p-6 flex flex-col justify-between gap-4 overflow-y-auto"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-600 mt-1">{summary}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">Đóng</button>
        </div>

        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-xs">
          {rows.map(row => (
            <div key={row.label} className="p-3 flex items-center justify-between gap-3">
              <span className="font-medium text-slate-800">{row.label}</span>
              <span className="text-slate-600">
                <span className="line-through text-slate-400 mr-2">{row.before}</span>
                <strong className={row.highlight === 'danger' ? 'text-rose-700' : row.highlight === 'warning' ? 'text-amber-700' : 'text-emerald-700'}>
                  {row.after}
                </strong>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700">
          Hủy
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onConfirm()}
          className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {confirmLabel}
        </button>
      </div>
    </aside>
  )
}

export interface CommandPaletteItem {
  id: string
  label: string
  category: string
  targetPath: string
  meta?: string
}

interface CommandPaletteProps {
  items: CommandPaletteItem[]
  onSelect: (item: CommandPaletteItem) => void
}

export function CommandPalette({ items, onSelect }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items.slice(0, 12)
    return items.filter(i =>
      i.label.toLowerCase().includes(q)
      || i.category.toLowerCase().includes(q)
      || (i.meta?.toLowerCase().includes(q) ?? false),
    )
  }, [items, query])

  if (!open) return null

  return (
    <div role="dialog" aria-label="Chuyển nhanh Command Palette" className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 pt-24 px-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <input
          type="search"
          autoFocus
          aria-label="Tìm nhanh đồ án hoặc phiếu chấm"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Tìm nhanh đồ án, Gate Review, phiếu chấm (Ctrl/Cmd+K)..."
          className="w-full border-b border-slate-200 px-4 py-3 text-sm text-slate-900 focus:outline-none"
        />
        <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
          {matches.map(item => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onSelect(item)
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between gap-2"
              >
                <span className="font-medium text-slate-900">{item.label}</span>
                <span className="text-slate-500">{item.category}{item.meta ? ` · ${item.meta}` : ''}</span>
              </button>
            </li>
          ))}
          {matches.length === 0 && <li className="px-4 py-6 text-center text-slate-500">Không tìm thấy mục phù hợp.</li>}
        </ul>
      </div>
    </div>
  )
}
