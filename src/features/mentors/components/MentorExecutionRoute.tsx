import { ProjectSectionNavigation } from '../../execution/ProjectSectionNavigation'
import { useCallback, useEffect, useState } from 'react'
import { Navigate, Outlet, useParams } from 'react-router-dom'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { PageLoading } from '../../../components/ui/PageLoading'
import { ExState } from '../../execution/execution-ui'
import { ExecutionAccessProvider } from '../../execution/context/ExecutionAccessProvider'
import { HttpError } from '../../../services/http/http-client'
import { services } from '../../../services/service-gateway'
import type { ProjectDto, SupervisorAssignmentDto } from '../../../types/backend'
import { loadOwnSupervisorAssignments } from '../../supervisors/utils/loadOwnSupervisorAssignments'

type MentorAccess = { project: ProjectDto; assignment: SupervisorAssignmentDto } | null
const isActive = (status: string) => status.replaceAll('_', '').toUpperCase() === 'ACTIVE'

/** A URL is insufficient: every direct Mentor route proves the exact active persisted assignment. */
export function MentorExecutionRoute() {
  const { projectId, majorId } = useParams()
  const { session } = useAuthSession()
  const project = Number(projectId)
  const major = Number(majorId)
  const [data, setData] = useState<MentorAccess>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!Number.isSafeInteger(project) || project < 1 || !Number.isSafeInteger(major) || major < 1) {
      setLoading(false); setError('Đường dẫn mentor không hợp lệ.'); return
    }
    setLoading(true); setError(null)
    try {
      const [projectData, assignments] = await Promise.all([
        services.project.getProject(project),
        loadOwnSupervisorAssignments({ status: 'ACTIVE' }),
      ])
      const assignment = assignments.find(item => item.projectId === project && item.assignmentType === 'DISCIPLINE_MENTOR' && item.majorId === major && !item.endedAt)
      setData(assignment && isActive(projectData.status) ? { project: projectData, assignment } : null)
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 401) setError('Phiên đăng nhập đã hết hạn.')
      else if (reason instanceof HttpError && reason.status === 403) setError('Bạn không có quyền truy cập mentor cho đồ án này.')
      else setError('Chưa tải được phạm vi mentor. Hãy thử lại.')
    } finally { setLoading(false) }
  }, [major, project])

  useEffect(() => { void load() }, [load])
  if (loading) return <PageLoading />
  if (error) return <ExState message={error} retry={() => void load()} />
  if (!data) return <Navigate to="/mentor/workspace" replace />
  return <ExecutionAccessProvider value={{ project: data.project, supervisor: data.assignment, currentUserId: session?.user.id, actor: 'mentor', canManageStructure: false, routeBase: `/mentor/projects/${project}/majors/${major}` }}><ProjectSectionNavigation /><Outlet /></ExecutionAccessProvider>
}
