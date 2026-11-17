import { useCallback, useEffect, useRef, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { useAcademicWorkflow } from '../../../app/context/useAcademicWorkflow'
import { detail, list, type Filters, type Page, type Supervisor } from '../api/supervisor-api'

const initialPage: Page<Supervisor> = { items: [], page: 1, pageSize: 20, totalCount: 0 }

export function useSupervisors(id?: number) {
  const { session } = useAuthSession()
  const academicWorkflow = useAcademicWorkflow()
  const token = session?.accessToken
  const departmentIds = (academicWorkflow.academic?.departments ?? []).map(department => department.id).filter(id => Number.isSafeInteger(id) && id > 0).join(',')
  const [directory, setDirectory] = useState<Page<Supervisor>>(initialPage)
  const [current, setCurrent] = useState<Supervisor | null>(null)
  const [filters, setFilters] = useState<Filters>({ page: 1, pageSize: 20 })
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(!!session)
  const requestVersion = useRef(0)

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current
    if (!token) {
      setDirectory(initialPage)
      setCurrent(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    setCurrent(null)
    setDirectory(initialPage)
    try {
      if (academicWorkflow.status === 'idle' || academicWorkflow.status === 'loading') return
      const allowed = departmentIds.split(',').map(Number).filter(Boolean)
      const selectedDepartmentId = filters.departmentId ?? allowed[0]
      if (academicWorkflow.status !== 'ready' || !allowed.includes(selectedDepartmentId)) throw new HttpError('Department scope unavailable', 403)
      if (id) {
        const profile = await detail(id, token)
        if (!allowed.includes(profile.departmentId)) throw new HttpError('Supervisor outside department scope', 403)
        if (version === requestVersion.current) setCurrent(profile)
      } else {
        const page = await list(token, { ...filters, departmentId: selectedDepartmentId })
        if (version === requestVersion.current) setDirectory(page)
      }
    } catch (caught) {
      if (version === requestVersion.current) setError(caught as Error)
    } finally {
      if (version === requestVersion.current && academicWorkflow.status !== 'idle' && academicWorkflow.status !== 'loading') setLoading(false)
    }
  }, [token, id, filters, departmentIds, academicWorkflow.status])

  useEffect(() => {
    const versionRef = requestVersion
    void refresh()
    return () => { versionRef.current++ }
  }, [refresh])

  return {
    items: directory.items,
    page: directory.page,
    pageSize: directory.pageSize,
    totalCount: directory.totalCount,
    current,
    allowedDepartments: academicWorkflow.academic?.departments ?? [],
    filters,
    setFilters,
    loading,
    error,
    refresh,
    isUnauthorized: !token || (error instanceof HttpError && error.status === 401),
    isForbidden: error instanceof HttpError && error.status === 403,
  }
}
