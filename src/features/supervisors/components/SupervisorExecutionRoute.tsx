import { ProjectSectionNavigation } from '../../execution/ProjectSectionNavigation'
import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useParams } from 'react-router-dom'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { ExecutionAccessProvider } from '../../execution/context/ExecutionAccessProvider'
import { HttpError } from '../../../services/http/http-client'
import { services } from '../../../services/service-gateway'
import type { BackendProjectStatus, ProjectDto, SupervisorAssignmentDto, TeamDto } from '../../../types/backend'
import { PageLoading } from '../../../components/ui/PageLoading'
import { ExState } from '../../execution/execution-ui'
import { loadOwnSupervisorAssignments } from '../utils/loadOwnSupervisorAssignments'
import { useProjectExecutionCapabilities } from '../../execution/hooks/useProjectExecutionCapabilities'

type AccessLoad = { project: ProjectDto; assignment: SupervisorAssignmentDto } | null
const isActive = (status: string) => status.replaceAll('_', '').toUpperCase() === 'ACTIVE'
const readableStatuses: ReadonlySet<BackendProjectStatus> = new Set(['Active', 'FinalSubmission', 'Completed', 'Archived'])
const isReadable = (status: string) => [...readableStatuses].some(value => value.toUpperCase() === status.replaceAll('_', '').toUpperCase())

/** Verifies the current, unended primary assignment before exposing supervisor execution routes. */
export function SupervisorExecutionRoute() {
  const { projectId } = useParams()
  const { session } = useAuthSession()
  const id = Number(projectId)
  const [data, setData] = useState<AccessLoad>(null)
  const [team, setTeam] = useState<TeamDto | undefined>()
  const [teamLoadError, setTeamLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accessProblem, setAccessProblem] = useState<string | null>(null)
  const executionCapabilities = useProjectExecutionCapabilities(data?.project.id)

  const loadTeam = useCallback(async (teamId: number) => {
    setTeamLoadError(null)
    try { setTeam(await services.team.getTeam(teamId)) }
    catch { setTeam(undefined); setTeamLoadError('Chưa tải được danh sách thành viên nhóm. Bạn vẫn xem được công việc nhưng chưa giao được người phụ trách.') }
  }, [])

  const load = useCallback(async () => {
    if (!Number.isInteger(id) || id < 1) { setLoading(false); setError('Đường dẫn đồ án không hợp lệ.'); return }
    setLoading(true); setError(null); setAccessProblem(null); setData(null); setTeam(undefined)
    try {
      const [project, assignments] = await Promise.all([
        services.project.getProject(id),
        loadOwnSupervisorAssignments({ status: 'ACTIVE' }),
      ])
      if (project.id !== id) { setData(null); setAccessProblem('Dữ liệu đồ án không khớp đường dẫn đang mở.'); return }
      const assignment = assignments.find((item) => item.projectId === id && item.isPrimary && !item.endedAt)
      if (!assignment) { setData(null); setAccessProblem('Không có phân công hướng dẫn đang hiệu lực cho đồ án này.'); return }
      if (!isReadable(project.status)) { setData(null); setAccessProblem('Đồ án chưa ở giai đoạn cho phép truy cập khu vực thực hiện.'); return }
      setData({ project, assignment }); await loadTeam(project.teamId)
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 401) setError('Phiên đăng nhập đã hết hạn.')
      else if (reason instanceof HttpError && reason.status === 403) setError('Bạn không có quyền truy cập đồ án này.')
      else setError('Chưa tải được đồ án được phân công. Hãy thử lại.')
    } finally { setLoading(false) }
  }, [id, loadTeam])

  useEffect(() => { void load() }, [load])
  if (loading) return <PageLoading />
  if (error) return <ExState message={error} retry={() => void load()} />
  if (!data) return <ExState title="Không thể mở khu vực thực hiện" message={accessProblem ?? 'Không xác nhận được quyền truy cập đồ án này.'} action={<Link className="ex-button" to="/supervisor/workspace">Về danh sách đồ án</Link>} />
  return <ExecutionAccessProvider value={{ project: data.project, team, teamLoadError, retryTeam: () => void loadTeam(data.project.teamId), supervisor: data.assignment, currentUserId: session?.user.id, actor: 'supervisor', canManageStructure: false, readOnly: !isActive(data.project.status), executionCapabilities, routeBase: `/supervisor/projects/${id}` }}><ProjectSectionNavigation /><Outlet /></ExecutionAccessProvider>
}
