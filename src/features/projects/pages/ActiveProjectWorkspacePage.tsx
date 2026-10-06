import { Link, Navigate } from 'react-router-dom'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useStudentJourney } from '../../../app/context'
import type { ProjectDto, SupervisorAssignmentDto, TeamDto } from '../../../types/backend'
import { resolveStudentNextAction } from '../../auth/utils/resolve-student-next-action'
import { getActivePrimaryAssignment } from '../utils/project-resolution.utils'
import { services } from '../../../services/service-gateway'
import { HttpError } from '../../../services/http/http-client'
import { CollaborationWorkspace } from './CollaborationWorkspace'
import { PageLoading } from '../../../components/ui/PageLoading'
import { projectStatusLabel } from '../utils/project-status'
import { useProjectExecutionCapabilities } from '../../execution/hooks/useProjectExecutionCapabilities'

export function ActiveProjectWorkspacePage() {
  const journey = useStudentJourney()
  const executionCapabilities = useProjectExecutionCapabilities(journey.project?.id)
  const fallback = resolveStudentNextAction({
    journeyState: journey.journeyState,
    projectStatus: journey.project?.status,
  })

  if (journey.isLoading) return <PageLoading />
  if (journey.error) return <WorkspaceState message="Chưa tải được thông tin đồ án. Hãy thử lại." retry={journey.refreshAll} error />

  // A URL must not bypass the Backend-derived journey. ACTIVE is the only entry state.
  if (journey.journeyState !== 'ACTIVE' || !journey.project) {
    return <Navigate to={fallback.route} replace />
  }

  return (
    <CollaborationWorkspace
      project={journey.project}
      team={journey.team}
      supervisor={getActivePrimaryAssignment(journey.assignments)}
      currentUserId={journey.profile?.id}
      executionCapabilities={executionCapabilities}
    />
  )
}

export function ExecutionEntry({ projectId, routeBase = '/project' }: { projectId: number; routeBase?: string }) {
  const [state, setState] = useState<{ count: number; progress: number | null; timelineMilestones: number; overdue: number; blocked: number; error: HttpError | null } | null>(null)
  const load = useCallback(() => {
    let current = true
    void Promise.all([
      services.milestone.getProjectMilestones(projectId),
      services.task.getProjectProgressSummary(projectId),
      services.task.getProjectTimeline(projectId),
      services.task.getOverdueBlockedTasks(projectId),
    ])
      .then(([milestones, progress, timeline, attention]) => current && setState({ count: milestones.length, progress: progress.progressPercentage, timelineMilestones: timeline.milestones.length, overdue: attention.overdueTasks.length, blocked: attention.blockedTasks.length, error: null }))
      .catch((error: unknown) => current && setState({ count: 0, progress: null, timelineMilestones: 0, overdue: 0, blocked: 0, error: error instanceof HttpError ? error : new HttpError('Không thể tải dữ liệu thực thi.', 500) }))
    return () => { current = false }
  }, [projectId])
  useEffect(() => load(), [load])
  if (!state) return <PageLoading />
  if (state.error) return <WorkspaceState error message={state.error.status === 403 ? 'Bạn chưa có quyền xem công việc của đồ án này.' : 'Chưa tải được tiến độ đồ án. Hãy thử lại.'} />
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5  sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Công việc và tiến độ</h2>
          <p className="mt-1 text-sm text-slate-600">{state.count === 0 ? 'Chưa có mốc đồ án.' : `${state.count} mốc đồ án.`}</p>
          <p className="mt-1 text-xs text-slate-500">Tiến độ chung: {state.progress === null ? 'chưa có dữ liệu' : `${state.progress}%`}. Có {state.overdue} việc quá hạn và {state.blocked} việc đang vướng mắc.</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link className="ex-button" to={`${routeBase}/milestones`}>Mốc đồ án</Link>
          <Link className="ex-button" to={`${routeBase}/tasks`}>Công việc</Link>
          <Link className="ex-button" to={`${routeBase}/gantt`}>Lịch thực hiện</Link>
        </div>
      </div>
    </section>
  )
}

export function ProjectWorkspaceSummary({
  project,
  team,
  supervisor,
  audience,
  children,
}: {
  project: ProjectDto
  team?: TeamDto | null
  supervisor?: SupervisorAssignmentDto | null
  audience: 'student' | 'supervisor'
  children?: ReactNode
}) {
  const mode = team?.academicScope?.projectMode ?? project.academicScope?.projectMode
  const projectMode = mode === 'SINGLE_MAJOR' ? 'Đơn ngành' : mode === 'INTERDISCIPLINARY' ? 'Liên ngành' : 'Chưa có thông tin'
  const teamName = team?.name ?? project.teamName ?? 'Chưa có thông tin nhóm'

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 pb-12">
      <header className="rounded-md border border-emerald-200 bg-emerald-50 p-5  sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-600">Đồ án đang thực hiện</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Không gian đồ án</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">Theo dõi công việc, tiến độ và trao đổi với nhóm trong quá trình thực hiện đồ án.</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link
              to={audience === 'student' ? '/project/meetings' : `/supervisor/projects/${project.id}/meetings`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f5b4e] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0a493f]"
            >
              <span className="material-symbols-outlined text-[16px]">calendar_month</span>
              Lịch họp và biên bản
            </Link>
            <Link
              to={audience === 'student' ? '/project/reports' : `/supervisor/projects/${project.id}/reports`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700  hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-[16px]">assignment</span>
              Báo cáo tiến độ
            </Link>
            <Link
              to={audience === 'student' ? '/project/deliverables' : `/supervisor/projects/${project.id}/deliverables`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700  hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-[16px]">folder_open</span>
              Hạng mục cần nộp
            </Link>
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white " aria-labelledby="active-project-summary">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{audience === 'student' ? 'Không gian sinh viên' : 'Không gian GVHD được phân công'}</p>
          <h2 id="active-project-summary" className="mt-1 text-xl font-bold tracking-tight text-slate-900">{project.title}</h2>
          <p className="mt-1 text-xs text-slate-500">{project.code} • {teamName}</p>
        </div>
        <dl className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Trạng thái" value={projectStatusLabel(project.status)} />
          <Metric label="Nhóm" value={teamName} />
          <Metric label="Hình thức đồ án" value={projectMode} />
          <Metric label="Giảng viên hướng dẫn" value={supervisor?.supervisorName || 'Chưa có thông tin'} />
        </dl>
        <div className="grid gap-5 border-t border-slate-100 px-5 py-5 sm:px-6 lg:grid-cols-2">
          <TextBlock title="Mô tả" value={project.description} />
          <TextBlock title="Mục tiêu" value={project.objectives} />
          <TextBlock title="Vấn đề cần giải quyết" value={project.problemStatement} />
          <TextBlock title="Sản phẩm dự kiến" value={project.expectedOutput} />
        </div>
      </section>

      {children}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="flex flex-col justify-between rounded-md border border-slate-200 bg-white p-5  sm:p-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0f5b4e]">calendar_month</span>
              <h2 className="text-base font-bold text-slate-900">Lịch họp và biên bản</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Thống nhất lịch trao đổi với GVHD, mời thành viên và lưu kết luận, điểm danh, nhận xét sau mỗi buổi họp.</p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100">
            <Link className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f5b4e] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0a493f]" to={audience === 'student' ? '/project/meetings' : `/supervisor/projects/${project.id}/meetings`}>
              Mở lịch họp →
            </Link>
          </div>
        </section>

        <section className="flex flex-col justify-between rounded-md border border-slate-200 bg-white p-5  sm:p-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600">assignment</span>
              <h2 className="text-base font-bold text-slate-900">Báo cáo tiến độ & phản hồi</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{audience === 'student' ? 'Tổng hợp kết quả theo tuần hoặc tháng. Cả nhóm cùng soạn bản nháp, trưởng nhóm nộp và theo dõi nhận xét từ giảng viên hướng dẫn.' : 'Đọc báo cáo theo từng kỳ, kiểm tra kết quả và gửi nhận xét để nhóm hoàn thiện các bước tiếp theo.'}</p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100">
            <Link className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700  hover:bg-slate-50" to={audience === 'student' ? '/project/reports' : `/supervisor/projects/${project.id}/reports`}>
              Mở báo cáo tiến độ →
            </Link>
          </div>
        </section>

        <section className="flex flex-col justify-between rounded-md border border-slate-200 bg-white p-5  sm:p-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-violet-600">folder_open</span>
              <h2 className="text-base font-bold text-slate-900">Deliverables & phiên bản</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Theo dõi các sản phẩm cần nộp, phiên bản đã gửi và nhận xét của giảng viên.</p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100">
            <Link className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700  hover:bg-slate-50" to={audience === 'student' ? '/project/deliverables' : `/supervisor/projects/${project.id}/deliverables`}>
              Xem hạng mục cần nộp →
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}

function WorkspaceState({ message, retry, error = false }: { message: string; retry?: () => Promise<void>; error?: boolean }) {
  return <section role={error ? 'alert' : 'status'} className={`mx-auto max-w-3xl rounded-md border p-5 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-slate-200 bg-white text-slate-600'}`}><p>{message}</p>{retry ? <button type="button" onClick={() => void retry()} className="ex-button mt-3">Thử lại</button> : null}</section>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="bg-white px-5 py-4"><dt className="text-[11px] text-slate-500">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd></div>
}

function TextBlock({ title, value }: { title: string; value?: string | null }) {
  return <div><h3 className="text-xs font-semibold text-slate-500">{title}</h3><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{value || 'Chưa có nội dung.'}</p></div>
}
