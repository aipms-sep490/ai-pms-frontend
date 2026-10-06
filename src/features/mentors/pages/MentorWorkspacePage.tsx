import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { services } from '../../../services/service-gateway'
import type { ProjectDto, SupervisorAssignmentDto } from '../../../types/backend'
import { loadOwnSupervisorAssignments } from '../../supervisors/utils/loadOwnSupervisorAssignments'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'

type AssignmentProject = { assignment: SupervisorAssignmentDto; project: ProjectDto | null; error: string | null }
const isMentor = (assignment: SupervisorAssignmentDto) => assignment.assignmentType === 'DISCIPLINE_MENTOR' && assignment.majorId != null && !assignment.endedAt

export function MentorWorkspacePage() {
  const [items, setItems] = useState<AssignmentProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
      setError(reason instanceof HttpError && reason.status === 403 ? 'Bạn chưa có quyền xem phân công hướng dẫn chuyên ngành.' : 'Chưa tải được phân công hướng dẫn chuyên ngành.')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  return <main className="mx-auto max-w-6xl space-y-6 pb-12">
    <header className="rounded-xl border border-hairline bg-primary-subtle p-5 shadow-xs sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Phân công chuyên ngành</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Hướng dẫn chuyên ngành</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">Theo dõi công việc và tiến độ của các chuyên ngành bạn được phân công hướng dẫn.</p></header>
    {error && <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{error} <button type="button" onClick={() => void load()} className="ml-2 min-h-11 font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Thử lại</button></section>}
    {loading && <p role="status" className="rounded-xl border border-hairline bg-card p-5 text-sm text-slate-700">Đang tải phân công hướng dẫn…</p>}
    {!loading && !error && !items.length && <section className="rounded-xl border border-hairline bg-card p-5 text-sm text-slate-700"><h2 className="font-semibold text-slate-900">Chưa có phân công hướng dẫn chuyên ngành</h2><p className="mt-1 leading-6">Bạn sẽ thấy đồ án ở đây khi được phân công hướng dẫn chuyên ngành.</p></section>}
    {!loading && items.length ? <ul className="grid gap-4 md:grid-cols-2">{items.map(({ assignment, project, error: projectError }) => <li key={assignment.id} className="min-w-0 rounded-xl border border-hairline bg-card p-5 shadow-xs"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Hướng dẫn chuyên ngành #{assignment.majorId}</p><h2 className="mt-2 break-words text-lg font-bold text-slate-900">{project?.title ?? `Đồ án #${assignment.projectId}`}</h2><p className="mt-1 text-sm text-slate-600">{project?.code ?? `#${assignment.projectId}`} · {project?.status ?? 'Chưa tải trạng thái'}</p>{projectError ? <p role="alert" className="mt-4 text-sm text-status-error-text">{projectError}</p> : project?.status?.replaceAll('_', '').toUpperCase() !== 'ACTIVE' ? <p className="mt-4 text-sm text-slate-600">Đồ án hiện không trong giai đoạn thực hiện. Chưa thể mở không gian theo dõi.</p> : <Link className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to={`/mentor/projects/${assignment.projectId}/majors/${assignment.majorId}/workspace`}>Mở phạm vi theo dõi</Link>}</li>)}</ul> : null}
  </main>
}

export function MentorProjectWorkspacePage() {
  const access = useExecutionAccess()
  const majorId = access.supervisor?.majorId
  const areas = [
    ['tasks', 'Công việc theo phạm vi', 'Theo dõi phần việc trong chuyên ngành được phân công.'],
    ['reports', 'Báo cáo tiến độ', 'Theo dõi báo cáo và kết quả thực hiện của nhóm.'],
    ['meetings', 'Cuộc họp', 'Xem lịch trao đổi và nội dung đã thống nhất.'],
    ['evidence', 'Sổ minh chứng', 'Đối chiếu tài liệu và kết quả theo nguồn, chuyên ngành.'],
  ] as const
  return <main className="mx-auto max-w-6xl space-y-6 pb-12"><header className="rounded-xl border border-hairline bg-primary-subtle p-5 shadow-xs sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Theo dõi theo chuyên ngành</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{access.project.title}</h1><p className="mt-2 text-sm leading-6 text-slate-700">Phân công hướng dẫn chuyên ngành #{majorId}. Theo dõi công việc, báo cáo và minh chứng trong phạm vi được phân công.</p></header><section className="grid overflow-hidden rounded-xl border border-hairline bg-card shadow-xs sm:grid-cols-2"><div className="border-b border-hairline p-5 sm:border-b-0 sm:border-r"><h2 className="font-bold text-slate-900">Phạm vi hướng dẫn</h2><p className="mt-2 text-sm leading-6 text-slate-600">Bạn có thể theo dõi phần việc của chuyên ngành. Kế hoạch chung và kết quả đánh giá do người phụ trách đồ án quản lý.</p></div><div className="p-5"><h2 className="font-bold text-slate-900">Phân công chuyên ngành</h2><p className="mt-2 text-sm leading-6 text-slate-600">Mở công việc để xem ngành phụ trách và phần việc của thành viên. Các thao tác được hiển thị theo quyền của bạn.</p></div></section><nav className="grid overflow-hidden rounded-xl border border-hairline bg-card shadow-xs sm:grid-cols-2" aria-label="Khu vực hướng dẫn chuyên ngành">{areas.map(([path, title, description]) => <Link key={path} to={`${access.routeBase}/${path}`} className="min-w-0 border-b border-hairline p-5 hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary sm:odd:border-r"><span className="block break-words font-semibold text-slate-900">{title}</span><span className="mt-1 block break-words text-sm leading-6 text-slate-600">{description}</span><span className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">Xem chi tiết</span></Link>)}</nav></main>
}
