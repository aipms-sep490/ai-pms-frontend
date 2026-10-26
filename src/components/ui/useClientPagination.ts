import { useEffect, useMemo, useState } from 'react'

export interface ClientPaginationResult<T> {
  page: number
  pages: number
  pageSize: number
  total: number
  paginatedItems: T[]
  setPage: (next: number) => void
  setPageSize: (next: number) => void
  showPagination: boolean
}

/**
 * Compact client-side pagination hook for lists and card grids.
 * Defaults to 10 items per page (or 12 for card grids) and auto-clamps
 * when filters reduce the total item count.
 */
export function useClientPagination<T>(
  items: readonly T[],
  defaultPageSize = 10,
): ClientPaginationResult<T> {
  const [page, setPageState] = useState(1)
  const [pageSize, setPageSizeState] = useState(defaultPageSize)

  const total = items.length
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pages)

  useEffect(() => {
    if (page > pages) {
      setPageState(pages)
    }
  }, [page, pages])

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, safePage, pageSize])

  const setPage = (next: number) => {
    setPageState(Math.max(1, Math.min(pages, next)))
  }

  const setPageSize = (next: number) => {
    setPageSizeState(next)
    setPageState(1)
  }

  return {
    page: safePage,
    pages,
    pageSize,
    total,
    paginatedItems,
    setPage,
    setPageSize,
    showPagination: total > pageSize,
  }
}
