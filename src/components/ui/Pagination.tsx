import './pagination.css'

export interface PaginationProps {
  page: number
  pages: number
  total: number
  pageSize?: number
  pageSizeOptions?: number[]
  busy?: boolean
  onPage: (page: number) => void
  onPageSizeChange?: (size: number) => void
  className?: string
}

export function generatePageNumbers(current: number, totalPages: number): (number | 'ellipsis')[] {
  const safePages = Math.max(1, totalPages)
  if (safePages <= 7) {
    return Array.from({ length: safePages }, (_, i) => i + 1)
  }

  if (current <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis', safePages]
  }

  if (current >= safePages - 3) {
    return [1, 'ellipsis', safePages - 4, safePages - 3, safePages - 2, safePages - 1, safePages]
  }

  return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', safePages]
}

export function Pagination({
  page,
  pages,
  total,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  busy = false,
  onPage,
  onPageSizeChange,
  className = '',
}: PaginationProps) {
  const totalPages = Math.max(1, pages)
  const pageNumbers = generatePageNumbers(page, totalPages)

  const startRecord = total > 0 ? (page - 1) * (pageSize || 10) + 1 : 0
  const endRecord = total > 0 ? Math.min(page * (pageSize || 10), total) : 0

  return (
    <nav className={`ui-pagination ${className}`} aria-label="Phân trang danh sách">
      {/* Summary record range & total */}
      <div className="ui-pagination-summary">
        {total > 0 ? (
          <span>
            Hiển thị <strong>{startRecord}–{endRecord}</strong> trên tổng số <strong>{total}</strong>
          </span>
        ) : (
          <span>Không có dữ liệu</span>
        )}

        {pageSize != null && onPageSizeChange && (
          <div className="ui-pagination-size ml-3">
            <label htmlFor="ui-pagination-select" className="text-xs text-ink-muted">Số dòng:</label>
            <select
              id="ui-pagination-select"
              value={pageSize}
              disabled={busy}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Số bản ghi trên mỗi trang"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page controls */}
      <ul className="ui-pagination-controls">
        {/* Previous page */}
        <li>
          <button
            type="button"
            className="ui-pagination-btn"
            disabled={busy || page <= 1}
            onClick={() => onPage(page - 1)}
            aria-label="Trang trước"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_left</span>
            <span className="hidden sm:inline ml-1 text-xs font-semibold">Trước</span>
          </button>
        </li>

        {/* Numbered buttons with ellipsis */}
        {pageNumbers.map((item, idx) => {
          if (item === 'ellipsis') {
            return (
              <li key={`ellipsis-${idx}`}>
                <span className="ui-pagination-ellipsis" aria-hidden="true">…</span>
              </li>
            )
          }

          const isCurrent = item === page
          return (
            <li key={`page-${item}`}>
              <button
                type="button"
                className="ui-pagination-btn"
                disabled={busy}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={`Trang ${item}`}
                onClick={() => onPage(item)}
              >
                {item}
              </button>
            </li>
          )
        })}

        {/* Next page */}
        <li>
          <button
            type="button"
            className="ui-pagination-btn"
            disabled={busy || page >= totalPages}
            onClick={() => onPage(page + 1)}
            aria-label="Trang sau"
          >
            <span className="hidden sm:inline mr-1 text-xs font-semibold">Sau</span>
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_right</span>
          </button>
        </li>
      </ul>
    </nav>
  )
}
