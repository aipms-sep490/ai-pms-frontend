import { useMemo, useState } from 'react'

export interface ProjectLabelItem {
  id: number
  slug: string
  name: string
  colorHex: string
  description?: string | null
  isSystem?: boolean
}

interface ProjectLabelPickerProps {
  labels: ProjectLabelItem[]
  selectedSlugs: string[]
  canEditCatalog?: boolean
  onToggle: (slug: string) => void
  onEditCatalog?: () => void
}

export function ProjectLabelPicker({
  labels,
  selectedSlugs,
  canEditCatalog = false,
  onToggle,
  onEditCatalog,
}: ProjectLabelPickerProps) {
  const [query, setQuery] = useState('')
  const selectedSet = useMemo(() => new Set(selectedSlugs), [selectedSlugs])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return labels
    return labels.filter(l =>
      l.name.toLowerCase().includes(q)
      || l.slug.toLowerCase().includes(q)
      || (l.description?.toLowerCase().includes(q) ?? false),
    )
  }, [labels, query])

  const selectedList = filtered.filter(l => selectedSet.has(l.slug))
  const availableList = filtered.filter(l => !selectedSet.has(l.slug))

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-2.5 w-72" aria-label="Chọn nhãn dự án">
      <input
        type="search"
        aria-label="Lọc nhãn"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Filter labels..."
        className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900"
      />

      {selectedList.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected</div>
          {selectedList.map(label => (
            <label key={label.slug} className="flex items-start gap-2 rounded p-1 hover:bg-slate-50 cursor-pointer text-xs">
              <input type="checkbox" checked onChange={() => onToggle(label.slug)} className="mt-0.5" />
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: label.colorHex }} />
              <span className="min-w-0">
                <span className="block font-medium text-slate-900">{label.name}</span>
                {label.description && <span className="block text-xs text-slate-500 truncate">{label.description}</span>}
              </span>
            </label>
          ))}
        </div>
      )}

      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Labels</div>
        {availableList.map(label => (
          <label key={label.slug} className="flex items-start gap-2 rounded p-1 hover:bg-slate-50 cursor-pointer text-xs">
            <input type="checkbox" checked={false} onChange={() => onToggle(label.slug)} className="mt-0.5" />
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: label.colorHex }} />
            <span className="min-w-0">
              <span className="block font-medium text-slate-900">{label.name}</span>
              {label.description && <span className="block text-xs text-slate-500 truncate">{label.description}</span>}
            </span>
          </label>
        ))}
      </div>

      {canEditCatalog && onEditCatalog && (
        <div className="border-t border-slate-100 pt-2">
          <button type="button" onClick={onEditCatalog} className="text-xs font-medium text-blue-700 hover:underline">
            Quản lý nhãn (Edit labels)
          </button>
        </div>
      )}
    </div>
  )
}
