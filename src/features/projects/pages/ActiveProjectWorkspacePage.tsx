import { Navigate } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import type { ProjectDto, SupervisorAssignmentDto, TeamDto } from '../../../types/backend'
import { resolveStudentNextAction } from '../../auth/utils/resolve-student-next-action'
import { getActivePrimaryAssignment } from '../utils/project-resolution.utils'

export function ActiveProjectWorkspacePage() {
  const journey = useStudentJourney()
  const fallback = resolveStudentNextAction({
    journeyState: journey.journeyState,
    projectStatus: journey.project?.status,
  })

  if (journey.isLoading) return <WorkspaceState message="Đang xác minh trạng thái đồ án từ Backend…" />
  if (journey.error) return <WorkspaceState message={journey.error} retry={journey.refreshAll} error />

  // A URL must not bypass the Backend-derived journey. ACTIVE is the only entry state.
  if (journey.journeyState !== 'ACTIVE' || !journey.project) {
    return <Navigate to={fallback.route} replace />
  }

  return (
    <ProjectWorkspaceSummary
      project={journey.project}
      team={journey.team}
      supervisor={getActivePrimaryAssignment(journey.assignments)}
      audience="student"
    />
  )
}

export function ProjectWorkspaceSummary({
  project,
  team,
  supervisor,
  audience,
}: {
  project: ProjectDto
  team?: TeamDto | null
  supervisor?: SupervisorAssignmentDto | null
  audience: 'student' | 'supervisor'
}) {
  const projectMode = team?.academicScope?.projectMode ?? project.academicScope?.projectMode ?? 'Backend chưa cung cấp'
  const teamName = team?.name ?? project.teamName ?? 'Backend chưa cung cấp'

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 pb-12">
      <header className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-xs sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800">Backend-verified ACTIVE handoff</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Không gian đồ án ACTIVE</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">Project chỉ được mở tại đây sau khi Backend xác nhận phân công GVHD và trạng thái ACTIVE. F9 bàn giao ngữ cảnh; không tạo milestone, task, tiến độ hoặc workflow thực thi mới.</p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs" aria-labelledby="active-project-summary">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{audience === 'student' ? 'Không gian sinh viên' : 'Không gian GVHD được phân công'}</p>
          <h2 id="active-project-summary" className="mt-1 text-xl font-bold tracking-tight text-slate-900">{project.title}</h2>
          <p className="mt-1 text-xs text-slate-500">{project.code} • {teamName}</p>
        </div>
        <dl className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Trạng thái" value={project.status} />
          <Metric label="Nhóm" value={teamName} />
          <Metric label="Project mode" value={projectMode} />
          <Metric label="GVHD chính" value={supervisor?.supervisorName || 'Backend chưa cung cấp'} />
        </dl>
        <div className="grid gap-5 border-t border-slate-100 px-5 py-5 sm:px-6 lg:grid-cols-2">
          <TextBlock title="Mô tả" value={project.description} />
          <TextBlock title="Mục tiêu" value={project.objectives} />
          <TextBlock title="Vấn đề cần giải quyết" value={project.problemStatement} />
          <TextBlock title="Sản phẩm dự kiến" value={project.expectedOutput} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <h2 className="text-base font-bold text-slate-900">Ranh giới handoff</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">Các mô-đun thực thi sau ACTIVE (milestone, task, tiến độ, nhận xét, deliverable và chấm điểm) chưa thuộc F9. Không gian này không giả lập dữ liệu hoặc quyền cho các mô-đun đó.</p>
      </section>
    </main>
  )
}

function WorkspaceState({ message, retry, error = false }: { message: string; retry?: () => Promise<void>; error?: boolean }) {
  return <section role={error ? 'alert' : 'status'} className={`mx-auto max-w-3xl rounded-2xl border p-5 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-slate-200 bg-white text-slate-600'}`}><p>{message}</p>{retry ? <button type="button" onClick={() => void retry()} className="mt-3 rounded-lg border border-current px-3 py-2 text-xs font-bold">Tải lại</button> : null}</section>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="bg-white px-5 py-4"><dt className="text-[11px] text-slate-500">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd></div>
}

function TextBlock({ title, value }: { title: string; value?: string | null }) {
  return <div><h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h3><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{value || 'Backend chưa cung cấp nội dung.'}</p></div>
}
