import './pagination.css'

export interface FilterChipItem {
  id: string
  label: string
  value: string
}

export interface FilterChipsProps {
  chips: FilterChipItem[]
  onRemove: (id: string) => void
  onClearAll?: () => void
  className?: string
}

export function FilterChips({ chips, onRemove, onClearAll, className = '' }: FilterChipsProps) {
  if (chips.length === 0) return null

  return (
    <div className={`ui-filter-chips ${className}`} role="region" aria-label="Bộ lọc đang áp dụng">
      <span className="text-xs font-semibold text-ink-muted">Đang lọc:</span>
      {chips.map((chip) => (
        <span key={chip.id} className="ui-filter-chip">
          <span>{chip.label}: <strong>{chip.value}</strong></span>
          <button
            type="button"
            className="ui-filter-chip-remove"
            onClick={() => onRemove(chip.id)}
            aria-label={`Xóa bộ lọc ${chip.label}`}
          >
            ✕
          </button>
        </span>
      ))}
      {onClearAll && chips.length > 1 && (
        <button
          type="button"
          className="ui-filter-clear-all"
          onClick={onClearAll}
        >
          Xóa tất cả
        </button>
      )}
    </div>
  )
}
