import { useCallback, useEffect, useState } from 'react'
import { Navigate, Outlet, useParams } from 'react-router-dom'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { ExecutionAccessProvider } from '../../execution/context/ExecutionAccessProvider'
import { HttpError } from '../../../services/http/http-client'
import { services } from '../../../services/service-gateway'
import type { ProjectDto, SupervisorAssignmentDto } from '../../../types/backend'

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
    if (!Number.isInteger(id) || id < 1) { setLoading(false); setError('Project không hợp lệ.'); return }
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
      else if (reason instanceof HttpError && reason.status === 403) setError('Backend từ chối phạm vi Project hoặc assignment của GVHD.')
      else setError(reason instanceof Error ? reason.message : 'Không thể tải Project được phân công.')
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { void load() }, [load])
  if (loading) return <p className="p-6" role="status">Đang xác minh Project ACTIVE trong phạm vi GVHD…</p>
  if (error) return <section className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800" role="alert"><p>{error}</p><button type="button" onClick={() => void load()} className="mt-3 rounded-lg border border-current px-3 py-2 text-xs font-bold">Tải lại</button></section>
  if (!data) return <Navigate to="/supervisor/workspace" replace />
  return <ExecutionAccessProvider value={{ project: data.project, supervisor: data.assignment, currentUserId: session?.user.id, actor: 'supervisor', canManageStructure: true, routeBase: `/supervisor/projects/${id}` }}><Outlet /></ExecutionAccessProvider>
}
