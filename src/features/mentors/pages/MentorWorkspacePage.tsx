import { SpotlightLink } from '../../../components/ui/SpotlightLink'
import { ButtonLink } from '../../../components/ui/ButtonLink'
import { projectStatusLabel } from '../../projects/utils/project-status'
import { Button } from '../../../components/ui/Button'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { ListLoading } from '../../../components/ui/ListLoading'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'
import { services } from '../../../services/service-gateway'
import type { ProjectDto, SupervisorAssignmentDto } from '../../../types/backend'
import { loadOwnSupervisorAssignments } from '../../supervisors/utils/loadOwnSupervisorAssignments'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { AuthSessionContext } from '../../auth/context/auth-session-context'
import { getAcademicHierarchy } from '../../academic/api/academic-api'
import type { AcademicHierarchyOrganization } from '../../academic/types/academic.types'
import { createAcademicNameResolver } from '../../projects/components/academic-name-resolver'

type AssignmentProject = { assignment: SupervisorAssignmentDto; project: ProjectDto | null; error: string | null }
const isMentor = (assignment: SupervisorAssignmentDto) => assignment.assignmentType === 'DISCIPLINE_MENTOR' && assignment.majorId != null && !assignment.endedAt

export function MentorWorkspacePage() {
  const [items, setItems] = useState<AssignmentProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const authSession = useContext(AuthSessionContext)
  const token = authSession?.session?.accessToken
  const [hierarchy, setHierarchy] = useState<AcademicHierarchyOrganization[]>([])

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    getAcademicHierarchy(token, { search: '', includeInactive: true }, controller.signal)
      .then(items => { if (!controller.signal.aborted) setHierarchy(items) })
      .catch(() => { /* silent fallback */ })
    return () => controller.abort()
  }, [token])

  const academicResolver = useMemo(() => createAcademicNameResolver(hierarchy), [hierarchy])

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const assignments = (await loadOwnSupervisorAssignments({ status: 'ACTIVE' })).filter(isMentor)
      const resolved = await Promise.all(assignments.map(async assignment => {
        try { return { assignment, project: await services.project.getProject(assignment.projectId), error: null } }
        catch (reason) { return { assignment, project: null, error: reason instanceof HttpError && reason.status === 403 ? 'Hệ thống không cấp quyền đọc đồ án này.' : 'Không thể tải đồ án.' } }
      }))
      setItems(resolved)
    } catch (reason) {
      setItems([])
      setError(reason instanceof HttpError && reason.status === 403 ? 'Bạn chưa có quyền xem phân công hướng dẫn chuyên ngành.' : 'Chưa tải được phân công hướng dẫn chuyên ngành.')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  return <WorkspacePage className="space-y-6" title="Hướng dẫn chuyên ngành" eyebrow="Phân công chuyên ngành" description="Theo dõi công việc và tiến độ của các chuyên ngành bạn được phân công hướng dẫn." action={<Button variant="secondary" icon="refresh" disabled={loading} onClick={() => void load()}>Tải lại</Button>}>

    {error && <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{error} <button type="button" onClick={() => void load()} className="ml-2 min-h-11 font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Thử lại</button></section>}
    {loading && <ListLoading label="Đang tải phân công hướng dẫn…" />}
    {!loading && !error && !items.length && <section className="workspace-surface p-5 text-sm text-ink-soft"><h2 className="font-semibold text-ink">Chưa có phân công hướng dẫn chuyên ngành</h2><p className="mt-1 leading-6">Bạn sẽ thấy đồ án ở đây khi được phân công hướng dẫn chuyên ngành.</p></section>}
    {!loading && items.length ? (
      <>
        <div className="rounded-xl border border-status-info-border bg-status-info-bg p-4 text-xs text-status-info-text shadow-2xs">
          <strong>Thông tin điều phối Đồ án Liên ngành:</strong> Giảng viên hướng dẫn chuyên ngành (Discipline Mentor) theo dõi, đôn đốc và ký duyệt các nội dung công việc trong phạm vi chuyên môn được phân công. Tiến độ chung và đánh giá toàn diện do Giảng viên hướng dẫn chính (Primary Supervisor) và Hội đồng thẩm định quản trị.
        </div>
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map(({ assignment, project, error: projectError }) => {
            const majorName = assignment.majorId ? academicResolver.major(assignment.majorId) : `Chuyên ngành #${assignment.majorId}`
            const isInterdisciplinary = project?.academicScope?.projectMode === 'INTERDISCIPLINARY'
            return (
              <li key={assignment.id} className="min-w-0 workspace-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    Phân công: {majorName}
                  </p>
                  {isInterdisciplinary && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-status-info-bg px-2.5 py-0.5 text-xs font-bold text-status-info-text border border-status-info-border">
                      <span className="material-symbols-outlined text-sm" aria-hidden="true">hub</span>
                      Liên ngành
                    </span>
                  )}
                </div>
                <h2 className="mt-2 break-words text-lg font-bold text-ink">
                  {project?.title ?? `Đồ án #${assignment.projectId}`}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {project?.code ?? `#${assignment.projectId}`} · {project?.status ? projectStatusLabel(project.status) : 'Chưa tải trạng thái'}
                </p>
                {projectError ? (
                  <p role="alert" className="mt-4 text-sm text-status-error-text">{projectError}</p>
                ) : project?.status?.replaceAll('_', '').toUpperCase() !== 'ACTIVE' ? (
                  <p className="mt-4 text-sm text-ink-muted">Đồ án hiện không trong giai đoạn thực hiện. Chưa thể mở không gian theo dõi.</p>
                ) : (
                  <nav className="mt-4 flex flex-wrap gap-2" aria-label="Chức năng hướng dẫn chuyên ngành">
                    <ButtonLink variant="primary" to={`/mentor/projects/${assignment.projectId}/majors/${assignment.majorId}/workspace`}>Mở phạm vi theo dõi</ButtonLink>
                    <ButtonLink to={`/mentor/projects/${assignment.projectId}/majors/${assignment.majorId}/tasks`}>Công việc</ButtonLink>
                    <ButtonLink to={`/mentor/projects/${assignment.projectId}/majors/${assignment.majorId}/reports`}>Báo cáo tiến độ</ButtonLink>
                    <ButtonLink to={`/mentor/projects/${assignment.projectId}/majors/${assignment.majorId}/meetings`}>Lịch họp</ButtonLink>
                  </nav>
                )}
              </li>
            )
          })}
        </ul>
      </>
    ) : null}
  </WorkspacePage>
}

export function MentorProjectWorkspacePage() {
  const access = useExecutionAccess()
  const areas = [
    ['tasks', 'Công việc theo phạm vi', 'Theo dõi phần việc trong chuyên ngành được phân công.'],
    ['reports', 'Báo cáo tiến độ', 'Theo dõi báo cáo và kết quả thực hiện của nhóm.'],
    ['meetings', 'Cuộc họp', 'Xem lịch trao đổi và nội dung đã thống nhất.'],
    ['evidence', 'Sổ minh chứng', 'Đối chiếu tài liệu và kết quả theo nguồn, chuyên ngành.'],
  ] as const
  return <WorkspacePage className="space-y-6" title={access.project.title} eyebrow="Theo dõi theo chuyên ngành" description="Theo dõi công việc, báo cáo và minh chứng trong phạm vi bạn được phân công." backTo="/mentor/workspace"><section className="grid overflow-hidden workspace-surface sm:grid-cols-2"><div className="border-b border-hairline p-5 sm:border-b-0 sm:border-r"><h2 className="font-bold text-ink">Phạm vi hướng dẫn</h2><p className="mt-2 text-sm leading-6 text-ink-muted">Bạn có thể theo dõi phần việc của chuyên ngành. Kế hoạch chung và kết quả đánh giá do người phụ trách đồ án quản lý.</p></div><div className="p-5"><h2 className="font-bold text-ink">Phân công chuyên ngành</h2><p className="mt-2 text-sm leading-6 text-ink-muted">Mở công việc để xem ngành phụ trách và phần việc của thành viên. Các thao tác được hiển thị theo quyền của bạn.</p></div></section><nav className="workspace-launchpad grid overflow-hidden workspace-surface sm:grid-cols-2" aria-label="Khu vực hướng dẫn chuyên ngành">{areas.map(([path, title, description]) => <SpotlightLink key={path} to={`${access.routeBase}/${path}`} className="flex flex-col gap-3 min-w-0 border-b border-hairline p-5 hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary sm:odd:border-r"><span className="block break-words font-semibold text-ink">{title}</span><span className="mt-1 block break-words text-sm leading-6 text-ink-muted">{description}</span><span className="workspace-action-link mt-3">Xem chi tiết<span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></span></SpotlightLink>)}</nav></WorkspacePage>
}
