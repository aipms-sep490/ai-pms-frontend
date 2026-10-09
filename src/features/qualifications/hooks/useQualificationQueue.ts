import { useCallback, useEffect, useRef, useState } from 'react'
import { services } from '../../../services/service-gateway'
import { HttpError } from '../../../services/http/http-client'
import { departmentError } from '../../department/hooks/useDepartmentSection'
import type { StudentQualificationDto } from '../../../types/backend'

export function useQualificationQueue() {
  const [items, setItems] = useState<StudentQualificationDto[]>([])
  const [search, setSearch] = useState(''), [status, setStatus] = useState('PENDING_VERIFICATION')
  const [page, setPage] = useState(1), [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true), [error, setError] = useState<string | null>(null)
  const version = useRef(0)
  const pageSize = 20
  const refresh = useCallback(async () => {
    const current = ++version.current
    setLoading(true); setError(null); setItems([])
    try {
      const result = await services.qualification.getVerificationQueue({ status, search: search.trim() || undefined, page, pageSize })
      if (current !== version.current) return
      const count = result.totalCount ?? result.items.length
      if (page > 1 && result.items.length === 0 && page > Math.max(1, Math.ceil(count / pageSize))) { setPage(Math.max(1, Math.ceil(count / pageSize))); return }
      setItems(result.items); setTotalCount(count)
    } catch (reason) { if (current === version.current) { setError(departmentError(reason).message); setTotalCount(0) } }
    finally { if (current === version.current) setLoading(false) }
  }, [page, search, status])
  useEffect(() => { const requestVersion = version; void refresh(); return () => { requestVersion.current++ } }, [refresh])
  const decide = async (id: number, expectedConcurrencyToken: string, reason?: string) => {
    setError(null)
    if (!expectedConcurrencyToken) { setError('Hồ sơ chưa có phiên bản đã xác minh. Hãy tải lại trước khi quyết định.'); return false }
    try {
      if (reason === undefined) await services.qualification.verify(id, expectedConcurrencyToken)
      else await services.qualification.reject(id, reason, expectedConcurrencyToken)
      await refresh()
      return true
    } catch (failure) {
      if (failure instanceof HttpError && failure.status === 409) await refresh()
      setError(departmentError(failure).message)
      return false
    }
  }
  return { items, search, status, page, pageSize, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / pageSize)), loading, error, refresh, decide,
    setSearch: (value: string) => { setPage(1); setSearch(value) }, setStatus: (value: string) => { setPage(1); setStatus(value) }, setPage }
}
