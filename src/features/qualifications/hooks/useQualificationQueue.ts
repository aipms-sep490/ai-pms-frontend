import { useCallback, useEffect, useRef, useState } from 'react'
import { services } from '../../../services/service-gateway'
import { HttpError } from '../../../services/http/http-client'
import { departmentError } from '../../department/hooks/useDepartmentSection'
import type { StudentQualificationDto } from '../../../types/backend'

export function useQualificationQueue() {
  const [search, setSearch] = useState(''), [status, setStatus] = useState('PENDING_VERIFICATION')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(10)
  const [resolved, setResolved] = useState<{ key: string; items: StudentQualificationDto[]; totalCount: number; error: string | null } | null>(null)
  const [actionError, setActionError] = useState<{ key: string; message: string } | null>(null)
  const version = useRef(0)
  const queryKey = `${status}:${search.trim()}:${page}:${pageSize}`
  const readQueue = useCallback(async (key: string, nextStatus: string, nextSearch: string, nextPage: number, nextPageSize: number) => {
    try {
      const result = await services.qualification.getVerificationQueue({ status: nextStatus, search: nextSearch.trim() || undefined, page: nextPage, pageSize: nextPageSize })
      const count = result.totalCount ?? result.items.length
      const maxPage = Math.max(1, Math.ceil(count / nextPageSize))
      if (nextPage > 1 && result.items.length === 0 && nextPage > maxPage) return { redirectPage: maxPage as number | null, resolved: null }
      return { redirectPage: null, resolved: { key, items: result.items, totalCount: count, error: null as string | null } }
    } catch (reason) {
      return { redirectPage: null, resolved: { key, items: [] as StudentQualificationDto[], totalCount: 0, error: departmentError(reason).message } }
    }
  }, [])
  const refresh = useCallback(async () => {
    const current = ++version.current
    setActionError(null)
    setResolved(null)
    const outcome = await readQueue(queryKey, status, search, page, pageSize)
    if (current !== version.current) return
    if (outcome.redirectPage !== null) setPage(outcome.redirectPage)
    else if (outcome.resolved) setResolved(outcome.resolved)
  }, [readQueue, queryKey, status, search, page, pageSize])
  useEffect(() => {
    const requestVersion = version
    const current = ++requestVersion.current
    void readQueue(queryKey, status, search, page, pageSize).then(outcome => {
      if (current !== requestVersion.current) return
      if (outcome.redirectPage !== null) setPage(outcome.redirectPage)
      else if (outcome.resolved) setResolved(outcome.resolved)
    })
    return () => { requestVersion.current++ }
  }, [readQueue, queryKey, status, search, page, pageSize])
  const decide = async (id: number, expectedConcurrencyToken: string, reason?: string) => {
    setActionError(null)
    if (!expectedConcurrencyToken) { setActionError({ key: queryKey, message: 'Hồ sơ chưa có phiên bản đã xác minh. Hãy tải lại trước khi quyết định.' }); return false }
    try {
      if (reason === undefined) await services.qualification.verify(id, expectedConcurrencyToken)
      else await services.qualification.reject(id, reason, expectedConcurrencyToken)
      await refresh()
      return true
    } catch (failure) {
      if (failure instanceof HttpError && failure.status === 409) await refresh()
      setActionError({ key: queryKey, message: departmentError(failure).message })
      return false
    }
  }
  const active = resolved?.key === queryKey ? resolved : null
  const items = active?.items ?? []
  const totalCount = active?.totalCount ?? 0
  const loading = active === null
  const error = (actionError?.key === queryKey ? actionError.message : null) ?? active?.error ?? null
  return { items, search, status, page, pageSize, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / pageSize)), loading, error, refresh, decide,
    setSearch: (value: string) => { setActionError(null); setPage(1); setSearch(value) },
    setStatus: (value: string) => { setActionError(null); setPage(1); setStatus(value) },
    setPage: (next: number) => { setActionError(null); setPage(next) },
    setPageSize: (next: number) => { setActionError(null); setPageSizeState(next); setPage(1) } }
}
