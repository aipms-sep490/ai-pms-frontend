import {
  DashboardHeader,
  DashboardMetrics,
  MilestoneTimeline,
  TaskList,
  AiPreview,
  ContributionPreview,
  StudentJourneyHero,
} from '../../features/dashboard/components'
import { dashboardPreviewData } from '../../features/dashboard/fixtures/dashboard-preview'
import { useStudentJourney } from '../context'
import { useNavigate } from 'react-router-dom'

const journeySteps = [
  { label: 'Tuyển quân', icon: 'group_add' },
  { label: 'Đề cương', icon: 'description' },
  { label: 'Thẩm định', icon: 'fact_check' },
  { label: 'Ghép GVHD', icon: 'school' },
  { label: 'Thực hiện', icon: 'rocket_launch' },
] as const

export function OverviewPage() {
  const data = dashboardPreviewData
  const { journeyState, error } = useStudentJourney()
  const navigate = useNavigate()
  const stageIndex = {
    NO_TEAM: 0,
    TEAM_FORMING: 0,
    TEAM_ELIGIBLE: 1,
    PROJECT_PENDING: 2,
    REVISION_REQUIRED: 2,
    SUPERVISOR_PENDING: 3,
    ACTIVE: 4,
    FINAL_SUBMISSION: 4,
    COMPLETED: 4,
  }[journeyState]
  const nextAction = {
    NO_TEAM: { label: 'Quản lý nhóm', route: '/team', detail: 'Tạo nhóm hoặc phản hồi lời mời đang chờ.' },
    TEAM_FORMING: { label: 'Hoàn thiện đội hình', route: '/team', detail: 'Cấu hình ngành, mời thành viên và kiểm tra điều kiện.' },
    TEAM_ELIGIBLE: { label: 'Soạn đề cương', route: '/project/register', detail: 'Chọn đề tài tham khảo hoặc tạo bản đăng ký mới.' },
    PROJECT_PENDING: { label: 'Theo dõi thẩm định', route: '/project/status', detail: 'Xem trạng thái và phản hồi mới nhất từ Bộ môn.' },
    REVISION_REQUIRED: { label: 'Xử lý yêu cầu sửa', route: '/project/status', detail: 'Đọc phản hồi, cập nhật đề cương và nộp lại.' },
    SUPERVISOR_PENDING: { label: 'Chọn giảng viên', route: '/project/supervisor', detail: 'Tìm và gửi yêu cầu tới giảng viên phù hợp.' },
    ACTIVE: { label: 'Xem tiến độ', route: '/project/milestones/M3', detail: 'Theo dõi công việc và cột mốc hiện tại.' },
    FINAL_SUBMISSION: { label: 'Hoàn thiện bàn giao', route: '/projects/lifecycle', detail: 'Kiểm tra hồ sơ và sản phẩm trước khi nộp bản cuối.' },
    COMPLETED: { label: 'Xem hồ sơ đồ án', route: '/projects/lifecycle', detail: 'Đồ án đã hoàn thành; hồ sơ và kết quả vẫn được lưu tại đây.' },
  }[journeyState]
  const showProjectWorkspace = journeyState === 'ACTIVE' || journeyState === 'FINAL_SUBMISSION' || journeyState === 'COMPLETED'

  return (
    <div className="flex flex-col gap-6">
      {/* Dynamic Student Journey Banner */}
      <StudentJourneyHero />

      {!showProjectWorkspace && !error ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs" aria-labelledby="journey-next-step">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Lộ trình đăng ký đồ án</p>
            <h2 id="journey-next-step" className="mt-1 text-lg font-bold tracking-tight text-slate-900">Bước tiếp theo của nhóm</h2>
          </div>
          <ol className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-5">
            {journeySteps.map((step, index) => (
              <li key={step.label} className={`bg-white px-4 py-4 ${index === stageIndex ? 'text-blue-700' : index < stageIndex ? 'text-emerald-700' : 'text-slate-400'}`}>
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[19px] ${index === stageIndex ? 'text-blue-600' : index < stageIndex ? 'text-emerald-600' : 'text-slate-300'}`} aria-hidden="true">
                    {index < stageIndex ? 'check_circle' : step.icon}
                  </span>
                  <span className="text-xs font-semibold">{step.label}</span>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-col gap-4 bg-slate-50/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{nextAction.label}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{nextAction.detail}</p>
            </div>
            <button type="button" onClick={() => navigate(nextAction.route)}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
              Tiếp tục
              <span className="material-symbols-outlined text-[17px]" aria-hidden="true">arrow_forward</span>
            </button>
          </div>
        </section>
      ) : showProjectWorkspace ? (
        <>

      {/* 1. Header with simulation banner & project metadata */}
      <DashboardHeader
        projectCode={data.projectCode}
        groupCode={data.groupCode}
        semester={data.semester}
        projectName={data.projectName}
        teamLeader={data.teamLeader}
        supervisor={data.supervisor}
        currentMilestone={data.currentMilestone}
      />

      {/* 2. 4-Grid Telemetry KPIs */}
      <DashboardMetrics metrics={data.metrics} />

      {/* 3. 6-Milestone Academic Roadmap */}
      <MilestoneTimeline milestones={data.milestones} />

      {/* 4. Two-Column Workspace (60/40 Split) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Task Stream (7 cols) */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          <TaskList tasks={data.tasks} />
        </section>

        {/* Right Column: AI Assistant & Member Contribution (5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          <AiPreview insight={data.aiInsight} />
          <ContributionPreview contributions={data.contributions} />
        </section>
      </div>
        </>
      ) : null}
    </div>
  )
}
