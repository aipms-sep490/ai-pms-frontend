import { useCallback, useEffect, useState } from 'react'
import { Navigate, Outlet, useParams } from 'react-router-dom'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { ExecutionAccessProvider } from '../../execution/context/ExecutionAccessProvider'
import { HttpError } from '../../../services/http/http-client'
import { services } from '../../../services/service-gateway'
import type { ProjectDto, SupervisorAssignmentDto } from '../../../types/backend'
import { PageLoading } from '../../../components/ui/PageLoading'
import { ExState } from '../../execution/execution-ui'

type AccessLoad = { project: ProjectDto; assignment: SupervisorAssignmentDto } | null
const isActive = (status: string) => status.replaceAll('_', '').toUpperCase() === 'ACTIVE'

/** Verifies the current, unended primary assignment before exposing supervisor execution routes. */
export function SupervisorExecutionRoute() {
  const { projectId } = useParams()
  const { session } = useAuthSession()
  const id = Number(projectId)
  const [data, setData] = useState<AccessLoad>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!Number.isInteger(id) || id < 1) { setLoading(false); setError('Đường dẫn đồ án không hợp lệ.'); return }
    setLoading(true); setError(null)
    try {
      const [project, assignments] = await Promise.all([
        services.project.getProject(id),
        services.supervisor.getOwnAssignments({ status: 'ACTIVE', page: 1, pageSize: 100 }),
      ])
      const assignment = assignments.items.find((item) => item.projectId === id && item.isPrimary && !item.endedAt)
      setData(assignment && isActive(project.status) ? { project, assignment } : null)
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 401) setError('Phiên đăng nhập đã hết hạn.')
      else if (reason instanceof HttpError && reason.status === 403) setError('Bạn không có quyền truy cập đồ án này.')
      else setError('Chưa tải được đồ án được phân công. Hãy thử lại.')
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { void load() }, [load])
  if (loading) return <PageLoading />
  if (error) return <ExState message={error} retry={() => void load()} />
  if (!data) return <Navigate to="/supervisor/workspace" replace />
  return <ExecutionAccessProvider value={{ project: data.project, supervisor: data.assignment, currentUserId: session?.user.id, actor: 'supervisor', canManageStructure: true, routeBase: `/supervisor/projects/${id}` }}><Outlet /></ExecutionAccessProvider>
}
