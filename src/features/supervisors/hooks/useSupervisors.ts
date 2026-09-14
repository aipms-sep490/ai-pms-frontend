import { useCallback, useEffect, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { detail, list, type Filters, type Page, type Supervisor } from '../api/supervisor-api'

const initialPage: Page<Supervisor> = { items: [], page: 1, pageSize: 20, totalCount: 0 }

export function useSupervisors(id?: number) {
  const { session } = useAuthSession()
  const [directory, setDirectory] = useState<Page<Supervisor>>(initialPage)
  const [current, setCurrent] = useState<Supervisor | null>(null)
  const [filters, setFilters] = useState<Filters>({ page: 1, pageSize: 20 })
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(!!session)

  const refresh = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setError(null)
    try {
      if (id) setCurrent(await detail(id, session.accessToken))
      else setDirectory(await list(session.accessToken, filters))
    } catch (caught) {
      setError(caught as Error)
    } finally {
      setLoading(false)
    }
  }, [session, id, filters])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    items: directory.items,
    page: directory.page,
    pageSize: directory.pageSize,
    totalCount: directory.totalCount,
    current,
    filters,
    setFilters,
    loading,
    error,
    refresh,
    isUnauthorized: !session || (error instanceof HttpError && error.status === 401),
    isForbidden: error instanceof HttpError && error.status === 403,
  }
}
