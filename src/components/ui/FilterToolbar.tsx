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

export interface FilterToolbarPagination {
  page: number
  pages: number
  total: number
  pageSize?: number
  busy?: boolean
  onPage: (page: number) => void
}

export interface FilterToolbarProps {
  /** Optional custom leading control (e.g. SegmentedControl with role="button") rendered inline before query controls. */
  leading?: ReactNode

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

  /** Optional compact top-right micro-pagination synchronized with bottom Pagination. */
  pagination?: FilterToolbarPagination

  /** Right-aligned extra actions (view switcher, refresh, export, etc.). */
  rightActions?: ReactNode

  /** Layout density: 'auto' merges compact tabs+filters into one balanced row on desktop. */
  layout?: 'auto' | 'inline' | 'stacked'

  /** Set true when rendered directly inside a bordered panel/surface to avoid double borders. */
  embedded?: boolean
  className?: string
  ariaLabel?: string
}

export function FilterToolbar({
  leading,
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
  pagination,
  rightActions,
  layout = 'auto',
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

  const hasTabs = Boolean(tabs && tabs.length > 0)
  const hasLeading = Boolean(leading)
  const hasMain = Boolean(onSearchChange || controls || sort || advancedControls || showClearAll)
  const safePages = pagination ? Math.max(1, pagination.pages) : 1
  const showMicroPager = Boolean(pagination && pagination.total > 0 && safePages > 1)

  const tabCharCount = tabs
    ? tabs.reduce((sum, tab) => sum + tab.label.length + (typeof tab.count === 'number' ? 3 : 0), 0)
    : 0
  const useInlineTabs =
    hasMain &&
    (hasLeading ||
      (hasTabs &&
        (layout === 'inline' ||
          (layout === 'auto' &&
            !className.includes('ft-bar--stacked') &&
            !className.includes('ft-bar--compact') &&
            !rightActions &&
            (tabs?.length ?? 0) <= 4 &&
            tabCharCount <= 42))))

  // When multi-page micro-pager is shown, it carries the concise range (e.g. "1–10 / 48"),
  // avoiding redundant summary duplication on the top bar unless active filter chips exist.
  const effectiveTopSummary = showMicroPager ? undefined : resultSummary
  const inlineTabSummary = Boolean(hasTabs && !useInlineTabs && activeChips.length === 0 && effectiveTopSummary)
  const inlineMainSummary = Boolean(((!hasTabs && !hasLeading) || useInlineTabs) && !className.includes('ft-bar--compact') && activeChips.length === 0 && effectiveTopSummary)
  const showFooter =
    activeChips.length > 0 ||
    (Boolean(resultSummary) && !showMicroPager && !inlineTabSummary && !inlineMainSummary)

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

  const renderMicroPager = () => {
    if (!showMicroPager || !pagination) return null
    const size = pagination.pageSize || 10
    const start = (pagination.page - 1) * size + 1
    const end = Math.min(pagination.page * size, pagination.total)
    return (
      <div className="ft-pager" role="group" aria-label="Chuyển trang nhanh">
        <span className="ft-pager-range">
          {start}–{end} / {pagination.total}
        </span>
        <div className="ft-pager-btns">
          <button
            type="button"
            className="ft-pager-btn"
            disabled={pagination.busy || pagination.page <= 1}
            onClick={() => pagination.onPage(pagination.page - 1)}
            aria-label="Trang trước (đầu danh sách)"
            title="Trang trước"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">chevron_left</span>
          </button>
          <span className="ft-pager-page" aria-live="polite">
            {pagination.page}/{safePages}
          </span>
          <button
            type="button"
            className="ft-pager-btn"
            disabled={pagination.busy || pagination.page >= safePages}
            onClick={() => pagination.onPage(pagination.page + 1)}
            aria-label="Trang sau (đầu danh sách)"
            title="Trang sau"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">chevron_right</span>
          </button>
        </div>
      </div>
    )
  }

  const renderTabsList = () => {
    if (!tabs || tabs.length === 0) return null
    return (
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
    )
  }

  const renderQueryControls = () => (
    <>
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
    </>
  )

  return (
    <section
      className={`ft-bar ${embedded ? 'ft-bar--embedded' : ''} ${useInlineTabs ? 'ft-bar--inline' : ''} ${className}`.trim()}
      aria-label={ariaLabel}
    >
      {useInlineTabs ? (
        <div className="ft-unified-row">
          {leading && <div className="ft-leading">{leading}</div>}
          {renderTabsList()}
          <div className="ft-query-group">
            {renderQueryControls()}
          </div>
          {(inlineMainSummary || showMicroPager || rightActions) && (
            <div className="ft-right-actions">
              {inlineMainSummary && <div className="ft-summary">{effectiveTopSummary}</div>}
              {renderMicroPager()}
              {rightActions}
            </div>
          )}
        </div>
      ) : (
        <>
          {hasTabs && (
            <div className="ft-tabs-row">
              {renderTabsList()}
              {(inlineTabSummary || showMicroPager || rightActions) && (
                <div className="ft-right-actions">
                  {inlineTabSummary && <div className="ft-summary">{effectiveTopSummary}</div>}
                  {renderMicroPager()}
                  {rightActions}
                </div>
              )}
            </div>
          )}

          {(hasMain || inlineMainSummary || (!hasTabs && (showMicroPager || rightActions))) && (
            <div className="ft-main-row">
              {renderQueryControls()}

              {(inlineMainSummary || (!hasTabs && (showMicroPager || rightActions))) && (
                <div className="ft-right-actions">
                  {inlineMainSummary && <div className="ft-summary">{effectiveTopSummary}</div>}
                  {!hasTabs && renderMicroPager()}
                  {!hasTabs && rightActions}
                </div>
              )}
            </div>
          )}
        </>
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
