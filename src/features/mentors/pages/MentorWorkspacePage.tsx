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
        catch (reason) { return { assignment, project: null, error: reason instanceof HttpError && reason.status === 403 ? 'Backend không cấp quyền đọc project này.' : 'Không thể tải project.' } }
      }))
      setItems(resolved)
    } catch (reason) {
      setError(reason instanceof HttpError && reason.status === 403 ? 'Backend không cấp quyền xem assignment mentor.' : 'Không thể tải assignment mentor.')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  return <main className="mx-auto max-w-6xl space-y-6 pb-12">
    <header className="rounded-xl border border-hairline bg-primary-subtle p-5 shadow-xs sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Phân công chuyên ngành</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Không gian Discipline Mentor</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">Chỉ hiển thị project và major có assignment `DISCIPLINE_MENTOR` còn hiệu lực. Đây là không gian theo dõi; không cấp quyền lập kế hoạch, đánh giá hay công bố kết quả.</p></header>
    {error && <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{error} <button type="button" onClick={() => void load()} className="ml-2 min-h-11 font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Thử lại</button></section>}
    {loading && <p role="status" className="rounded-xl border border-hairline bg-card p-5 text-sm text-slate-700">Đang tải phạm vi mentor…</p>}
    {!loading && !error && !items.length && <section className="rounded-xl border border-hairline bg-card p-5 text-sm text-slate-700"><h2 className="font-semibold text-slate-900">Chưa có phân công mentor đang hiệu lực</h2><p className="mt-1 leading-6">Primary Supervisor hoặc evaluator assignment không tự tạo quyền Mentor.</p></section>}
    {!loading && items.length ? <ul className="grid gap-4 md:grid-cols-2">{items.map(({ assignment, project, error: projectError }) => <li key={assignment.id} className="min-w-0 rounded-xl border border-hairline bg-card p-5 shadow-xs"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">DISCIPLINE_MENTOR · Major #{assignment.majorId}</p><h2 className="mt-2 break-words text-lg font-bold text-slate-900">{project?.title ?? `Project #${assignment.projectId}`}</h2><p className="mt-1 text-sm text-slate-600">{project?.code ?? `#${assignment.projectId}`} · {project?.status ?? 'Chưa tải trạng thái'}</p>{projectError ? <p role="alert" className="mt-4 text-sm text-status-error-text">{projectError}</p> : project?.status?.replaceAll('_', '').toUpperCase() !== 'ACTIVE' ? <p className="mt-4 text-sm text-slate-600">Project không ACTIVE; workspace thực thi không được mở.</p> : <Link className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to={`/mentor/projects/${assignment.projectId}/majors/${assignment.majorId}/workspace`}>Mở phạm vi theo dõi</Link>}</li>)}</ul> : null}
  </main>
}

export function MentorProjectWorkspacePage() {
  const access = useExecutionAccess()
  const majorId = access.supervisor?.majorId
  const areas = [
    ['tasks', 'Công việc theo phạm vi', 'Đọc danh sách; từng task vẫn phải do Backend cho phép.'],
    ['reports', 'Báo cáo tiến độ', 'Đọc tiến độ khi endpoint Backend cho phép.'],
    ['meetings', 'Cuộc họp', 'Đọc lịch và biên bản khi endpoint Backend cho phép.'],
    ['evidence', 'Evidence Ledger', 'Lọc theo nguồn/major, không có quyền ghi phía client.'],
  ] as const
  return <main className="mx-auto max-w-6xl space-y-6 pb-12"><header className="rounded-xl border border-hairline bg-primary-subtle p-5 shadow-xs sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Theo dõi theo major</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{access.project.title}</h1><p className="mt-2 text-sm leading-6 text-slate-700">Assignment `DISCIPLINE_MENTOR` · Major #{majorId}. Mọi resource dưới đây vẫn do Backend quyết định khi tải.</p></header><section className="grid overflow-hidden rounded-xl border border-hairline bg-card shadow-xs sm:grid-cols-2"><div className="border-b border-hairline p-5 sm:border-b-0 sm:border-r"><h2 className="font-bold text-slate-900">Giới hạn authority</h2><p className="mt-2 text-sm leading-6 text-slate-600">Không có quyền structural plan, chuyển trạng thái project, thay GVHD, evaluation, grading hoặc công bố kết quả.</p></div><div className="p-5"><h2 className="font-bold text-slate-900">Kỷ luật / trách nhiệm</h2><p className="mt-2 text-sm leading-6 text-slate-600">Mở một Task để xem discipline hiện có. Chỉ capability task-scoped do Backend trả về mới có thể hiện hành động.</p></div></section><nav className="grid overflow-hidden rounded-xl border border-hairline bg-card shadow-xs sm:grid-cols-2" aria-label="Khu vực theo dõi mentor">{areas.map(([path, title, description]) => <Link key={path} to={`${access.routeBase}/${path}`} className="min-w-0 border-b border-hairline p-5 hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary sm:odd:border-r"><span className="block break-words font-semibold text-slate-900">{title}</span><span className="mt-1 block break-words text-sm leading-6 text-slate-600">{description}</span><span className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">Mở vùng này</span></Link>)}</nav></main>
}
