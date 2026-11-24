import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { FilterChips, type FilterChipItem } from './FilterChips'
import './filter-toolbar.css'

export type ActiveFilterChip = FilterChipItem

export interface FilterTabOption {
  value: string
  label: string
  count?: number
  disabled?: boolean
}

export interface FilterSortOption {
  value: string
  label: string
}

export interface FilterToolbarProps {
  /** Instant quick-filter tabs (e.g. Tất cả / Đang thực hiện / Quá hạn). */
  tabs?: FilterTabOption[]
  activeTab?: string
  onTabChange?: (value: string) => void
  tabsLabel?: string

  /** Live debounced search input. Omit `onSearchChange` to hide search box. */
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  searchLabel?: string
  debounceMs?: number

  /** Primary inline filter controls (e.g. instant `<select>` dropdowns). */
  controls?: ReactNode

  /** Optional sort selector. */
  sort?: {
    value: string
    options: FilterSortOption[]
    onChange: (value: string) => void
    label?: string
  }

  /** Collapsible secondary filters tray (e.g. date range, overdue toggle). */
  advancedControls?: ReactNode
  advancedActiveCount?: number
  advancedLabel?: string
  defaultAdvancedOpen?: boolean

  /** Removable active filter chips rendered below the main toolbar. */
  activeChips?: FilterChipItem[]
  onRemoveChip?: (id: string) => void

  /** Clear-all button; shown whenever `hasActiveFilters` is true (or chips exist). */
  onClearAll?: () => void
  hasActiveFilters?: boolean
  clearAllLabel?: string

  /** Result counter or summary text (e.g. "Hiển thị 12 / 24 mục"). */
  resultSummary?: ReactNode

  /** Right-aligned extra actions (view switcher, refresh, export, etc.). */
  rightActions?: ReactNode

  /** Set true when rendered directly inside a bordered panel/surface to avoid double borders. */
  embedded?: boolean
  className?: string
  ariaLabel?: string
}

export function FilterToolbar({
  tabs,
  activeTab,
  onTabChange,
  tabsLabel = 'Lọc nhanh theo trạng thái',
  search,
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm…',
  searchLabel = 'Tìm kiếm',
  debounceMs = 250,
  controls,
  sort,
  advancedControls,
  advancedActiveCount = 0,
  advancedLabel = 'Bộ lọc nâng cao',
  defaultAdvancedOpen = false,
  activeChips = [],
  onRemoveChip,
  onClearAll,
  hasActiveFilters,
  clearAllLabel = 'Xóa lọc',
  resultSummary,
  rightActions,
  embedded = false,
  className = '',
  ariaLabel = 'Thanh lọc và tìm kiếm',
}: FilterToolbarProps) {
  const [draftSearch, setDraftSearch] = useState(search ?? '')
  const [advancedOpen, setAdvancedOpen] = useState(defaultAdvancedOpen || advancedActiveCount > 0)
  const searchInputId = useId()
  const sortSelectId = useId()
  const advancedRegionId = useId()

  const latestOnSearchChange = useRef(onSearchChange)
  useEffect(() => {
    latestOnSearchChange.current = onSearchChange
  }, [onSearchChange])

  const lastEmittedSearch = useRef(search ?? '')
  const externalSearch = search ?? ''

  // Sync when parent resets or updates `search` externally (e.g. Clear All or URL change).
  useEffect(() => {
    if (externalSearch !== lastEmittedSearch.current) {
      setDraftSearch(externalSearch)
      lastEmittedSearch.current = externalSearch
    }
  }, [externalSearch])

  // Debounce user typing before calling `onSearchChange`.
  useEffect(() => {
    if (!latestOnSearchChange.current) return
    if (draftSearch === lastEmittedSearch.current) return

    if (debounceMs <= 0) {
      lastEmittedSearch.current = draftSearch
      latestOnSearchChange.current(draftSearch)
      return
    }

    const timer = window.setTimeout(() => {
      lastEmittedSearch.current = draftSearch
      latestOnSearchChange.current?.(draftSearch)
    }, debounceMs)

    return () => window.clearTimeout(timer)
  }, [draftSearch, debounceMs])

  const showClearAll = Boolean(
    onClearAll && (hasActiveFilters ?? (activeChips.length > 0 || Boolean(draftSearch.trim()))),
  )
  const inlineTabSummary = Boolean(tabs && tabs.length > 0 && activeChips.length === 0 && resultSummary)
  const inlineMainSummary = Boolean(!tabs?.length && !className.includes('ft-bar--compact') && activeChips.length === 0 && resultSummary)
  const showFooter = activeChips.length > 0 || (Boolean(resultSummary) && !inlineTabSummary && !inlineMainSummary)

  function handleClearSearch() {
    setDraftSearch('')
    lastEmittedSearch.current = ''
    latestOnSearchChange.current?.('')
  }

  function handleClearAll() {
    setDraftSearch('')
    lastEmittedSearch.current = ''
    onClearAll?.()
  }

  return (
    <section
      className={`ft-bar ${embedded ? 'ft-bar--embedded' : ''} ${className}`.trim()}
      aria-label={ariaLabel}
    >
      {tabs && tabs.length > 0 && (
        <div className="ft-tabs-row">
          <div className="ft-tabs" role="tablist" aria-label={tabsLabel}>
            {tabs.map((tab) => {
              const active = tab.value === activeTab
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  disabled={tab.disabled}
                  className={`ft-tab ${active ? 'is-active' : ''}`}
                  onClick={() => onTabChange?.(tab.value)}
                >
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && (
                    <span className="ft-tab-count">{tab.count}</span>
                  )}
                </button>
              )
            })}
          </div>
          {(inlineTabSummary || rightActions) && (
            <div className="ft-right-actions">
              {inlineTabSummary && <div className="ft-summary">{resultSummary}</div>}
              {rightActions}
            </div>
          )}
        </div>
      )}

      {(onSearchChange || controls || sort || advancedControls || showClearAll || inlineMainSummary || (!tabs?.length && rightActions)) && (
        <div className="ft-main-row">
          {onSearchChange && (
            <div className="ft-search">
              <label htmlFor={searchInputId} className="sr-only">
                {searchLabel}
              </label>
              <span className="material-symbols-outlined ft-search-icon" aria-hidden="true">
                search
              </span>
              <input
                id={searchInputId}
                type="search"
                className="ft-search-input"
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
                placeholder={searchPlaceholder}
                autoComplete="off"
              />
              {draftSearch && (
                <button
                  type="button"
                  className="ft-search-clear"
                  onClick={handleClearSearch}
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                    close
                  </span>
                </button>
              )}
            </div>
          )}

          {controls && <div className="ft-controls">{controls}</div>}

          {sort && sort.options.length > 0 && (
            <div className="ft-sort-wrap">
              <label htmlFor={sortSelectId} className="ft-sort-label" title={sort.label ?? 'Sắp xếp'}>
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  swap_vert
                </span>
                <span className="sr-only">{sort.label ?? 'Sắp xếp'}</span>
              </label>
              <select
                id={sortSelectId}
                className="ft-sort-select"
                value={sort.value}
                title={sort.label ?? 'Sắp xếp'}
                onChange={(event) => sort.onChange(event.target.value)}
              >
                {sort.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {advancedControls && (
            <button
              type="button"
              className={`ft-btn ft-btn-icon ${advancedOpen || advancedActiveCount > 0 ? 'is-active' : ''}`}
              aria-expanded={advancedOpen}
              aria-controls={advancedRegionId}
              aria-label={advancedLabel}
              title={advancedLabel}
              onClick={() => setAdvancedOpen((open) => !open)}
            >
              <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                tune
              </span>
              {advancedActiveCount > 0 && (
                <span className="ft-badge" aria-label={`${advancedActiveCount} bộ lọc nâng cao đang bật`}>
                  {advancedActiveCount}
                </span>
              )}
            </button>
          )}

          {showClearAll && (
            <button
              type="button"
              className="ft-btn ft-btn-clear ft-btn-icon"
              aria-label={clearAllLabel}
              title={clearAllLabel}
              onClick={handleClearAll}
            >
              <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                filter_alt_off
              </span>
            </button>
          )}

          {(inlineMainSummary || (!tabs?.length && rightActions)) && (
            <div className="ft-right-actions">
              {inlineMainSummary && <div className="ft-summary">{resultSummary}</div>}
              {!tabs?.length && rightActions}
            </div>
          )}
        </div>
      )}

      {advancedControls && advancedOpen && (
        <div id={advancedRegionId} className="ft-advanced">
          {advancedControls}
        </div>
      )}

      {showFooter && (
        <div className={`ft-footer-row ${activeChips.length === 0 ? 'ft-footer-row--summary-only' : ''}`.trim()}>
          {activeChips.length > 0 && (
            <div>
              {onRemoveChip && (
                <FilterChips
                  chips={activeChips}
                  onRemove={onRemoveChip}
                  onClearAll={activeChips.length > 1 ? handleClearAll : undefined}
                />
              )}
            </div>
          )}
          {resultSummary && <div className="ft-summary">{resultSummary}</div>}
        </div>
      )}
    </section>
  )
}
