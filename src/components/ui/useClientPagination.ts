import { useMemo, useState } from 'react'

export interface ClientPaginationResult<T> {
  page: number
  pageSize: number
  total: number
  totalPages: number
  paginatedItems: T[]
  showPagination: boolean
  setPage: (next: number) => void
  setPageSize: (size: number) => void
}

/**
 * Lightweight client-side pagination hook for lists and tables that load a full array.
 * Keeps small datasets (<= pageSize) uncluttered while automatically clamping page bounds
 * when upstream filters narrow the list.
 */
export function useClientPagination<T>(
  items: readonly T[],
  defaultPageSize = 8,
): ClientPaginationResult<T> {
  const [rawPage, setRawPage] = useState(1)
  const [pageSize, setRawPageSize] = useState(defaultPageSize)

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, rawPage), totalPages)

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize])

  const setPage = (next: number) => {
    setRawPage(Math.min(Math.max(1, next), totalPages))
  }

  const setPageSize = (size: number) => {
    setRawPageSize(size)
    setRawPage(1)
  }

  return {
    page,
    pageSize,
    total,
    totalPages,
    paginatedItems,
    showPagination: total > pageSize,
    setPage,
    setPageSize,
  }
}
