import { useEffect, useRef, useState } from 'react'
import { useAcademicWorkflow } from '../../../app/context/useAcademicWorkflow'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { useAcademicStructure } from '../../academic/hooks/useAcademicStructure'
import { getProjectPeriods } from '../../academic/api/governance-api'
import type { ProjectPeriod } from '../../academic/types/governance.types'
import { readAllPages } from '../../../services/api/paged-read'

export function useTopicCatalog() {
  const { academic } = useAcademicWorkflow()
  const { session } = useAuthSession()
  const structure = useAcademicStructure()
  const [periods, setPeriods] = useState<ProjectPeriod[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState<unknown>(null), [retryVersion, setRetryVersion] = useState(0)
  const version = useRef(0), token = session?.accessToken
  useEffect(() => {
    const requestVersion = version; const current = ++requestVersion.current, controller = new AbortController()
    setPeriods([]); setError(null); setLoading(true)
    if (!token) { setLoading(false); return }
    readAllPages(page => getProjectPeriods(token, { search: '', periodType: 'REGISTRATION' }, controller.signal, page))
      .then(items => { if (current === version.current) setPeriods(items) })
      .catch(reason => { if (!controller.signal.aborted && current === version.current) setError(reason) })
      .finally(() => { if (current === version.current) setLoading(false) })
    return () => { controller.abort(); requestVersion.current++ }
  }, [token, retryVersion])
  const department = academic?.departments.length === 1 ? academic.departments[0] : null
  const majors = (structure.hierarchy ?? []).filter(item => item.organization.id === academic?.organization?.id)
    .flatMap(item => item.departments.flatMap(part => part.majors.map(major => ({ id: major.id, name: `${major.code} · ${major.name}`, departmentId: part.department.id }))))
  return { department, periods, majors, loading: loading || structure.isLoading, error: error || structure.error, retry: () => { structure.retry(); setRetryVersion(value => value + 1) } }
}
