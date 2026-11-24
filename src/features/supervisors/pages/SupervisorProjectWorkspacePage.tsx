import { SpotlightLink } from '../../../components/ui/SpotlightLink'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { TeamReflectionPanel } from '../../student-collaboration/TeamReflectionPanel'
import { Link } from 'react-router-dom'
import { env } from '../../../app/config/env'
import { ProjectProgressAnalysisPanel } from '../../ai/components/ProjectProgressAnalysisPanel'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { formatMeetingTime } from '../../meetings/meeting-utils'
import { projectStatusLabel } from '../../projects/utils/project-status'
import { useSupervisorOperationalSummary, type SupervisorOperationalResource } from '../hooks/useSupervisorOperationalSummary'
import { useSupervisorProgressReview } from '../hooks/useSupervisorProgressReview'

type WorkspaceArea = { key: string; title: string; description: string; path: string; icon: string }

const areas: WorkspaceArea[] = [
  { key: 'progress', title: 'Tiến độ', description: 'Tiến độ, vướng mắc và phản hồi.', path: 'progress', icon: 'trending_up' },
  { key: 'review-gates', title: 'Tiến trình Gates', description: 'Theo dõi thẩm định hồ sơ, minh chứng và hướng dẫn khắc phục.', path: 'review-gates', icon: 'view_timeline' },
  { key: 'tasks', title: 'Công việc & mốc', description: 'Hạn, phụ trách và trạng thái.', path: 'tasks', icon: 'checklist' },
  { key: 'meetings', title: 'Cuộc họp', description: 'Lịch, biên bản, kết luận và việc sau họp.', path: 'meetings', icon: 'groups' },
  { key: 'deliverables', title: 'Hạng mục bàn giao', description: 'Phiên bản nộp và phản hồi.', path: 'deliverables', icon: 'inventory_2' },
  { key: 'files', title: 'Kho tệp đồ án', description: 'Tài liệu theo từng hạng mục.', path: 'files', icon: 'folder_open' },
  { key: 'evidence', title: 'Sổ minh chứng', description: 'Nguồn phát sinh và trạng thái xác minh.', path: 'evidence', icon: 'fact_check' },
  { key: 'contributions', title: 'Đóng góp', description: 'Chỉ số hoạt động có chứng cứ.', path: 'contributions', icon: 'bar_chart' },
  { key: 'final', title: 'Bàn giao cuối kỳ', description: 'Kiểm tra hồ sơ và xem bản bàn giao.', path: 'final-submission', icon: 'school' },
]

/** Assignment-scoped, evidence-first cockpit. It does not invent a supervisor role or a write capability. */
export function SupervisorProjectWorkspacePage() {
  const access = useExecutionAccess()
  const operational = useSupervisorOperationalSummary(access.project.id)
  const progress = useSupervisorProgressReview(access.project.id)
  const evaluatorAssigned = operational.evaluator.state === 'ready' && operational.evaluator.data
  const availableAreas: WorkspaceArea[] = [
    ...areas,
    ...(env.weeklyAssessmentEnabled ? [{ key: 'weekly', title: 'Điểm cá nhân theo tuần', description: 'Chấm tham khảo theo tuần, không vào kết quả chính thức.', path: 'weekly-assessments', icon: 'calendar_view_week' }] : []),
    ...(env.gatesEnabled ? [{ key: 'checkpoints', title: 'Checkpoint theo dõi', description: 'Kế hoạch theo dõi và kết luận từng giai đoạn.', path: 'checkpoints', icon: 'flag' }] : []),
    ...(env.aiAdvisoryEnabled || env.aiProgressRiskEnabled ? [{ key: 'ai', title: 'Rủi ro và AI', description: 'Phân tích tham khảo từ dữ liệu tiến độ.', path: 'ai', icon: 'auto_awesome' }] : []),
  ]

  const overdueCount = progress.attention.state === 'ready' ? progress.attention.data.overdueTasks.length : 0
  const blockedCount = progress.attention.state === 'ready' ? progress.attention.data.blockedTasks.length : 0
  const attentionTotal = progress.attention.state === 'ready' ? overdueCount + blockedCount : null
  const pendingReportsCount = operational.pendingReports.state === 'ready' ? operational.pendingReports.data.count : null
  const deliverablesCount = operational.deliverables.state === 'ready' ? operational.deliverables.data.count : null
  const meetingsCount = operational.meeting.state === 'ready' ? operational.meeting.data.count : null

  return (
    <div className="workspace-page space-y-5 pb-10">
      <header className="workspace-heading">
        <div className="workspace-heading-copy">
          <div className="workspace-context"><span className="workspace-kicker">Giảng viên hướng dẫn</span></div>
          <h1>Tổng quan đồ án</h1>
          <p>Theo dõi tiến độ, nội dung cần phản hồi và toàn bộ tài liệu của đồ án được phân công.</p>
        </div>
        <div className="workspace-heading-actions flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-primary bg-card px-4 text-sm font-semibold text-primary hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={() => { progress.reload(); void operational.reload() }}
          >
            Làm mới dữ liệu
          </button>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-primary bg-card px-4 text-sm font-semibold text-primary hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            to="/supervisor/workspace"
          >
            Đổi đồ án
          </Link>
        </div>
      </header>

      <StatTileRow
        tiles={[
          {
            icon: 'inventory_2',
            label: 'Hạng mục bàn giao',
            value: deliverablesCount,
            caption: `${access.project.code} · ${projectStatusLabel(access.project.status)}`,
            hero: true,
          },
          {
            icon: 'rate_review',
            label: 'Báo cáo chờ phản hồi',
            value: pendingReportsCount,
            tone: pendingReportsCount && pendingReportsCount > 0 ? 'warning' : 'neutral',
            caption: pendingReportsCount && pendingReportsCount > 0 ? 'Cần nhận xét tiến độ từ GVHD' : 'Không có báo cáo tồn đọng',
          },
          {
            icon: 'warning',
            label: 'Quá hạn & vướng mắc',
            value: attentionTotal,
            tone: attentionTotal && attentionTotal > 0 ? 'danger' : 'success',
            caption: progress.attention.state === 'ready'
              ? `${overdueCount} quá hạn · ${blockedCount} vướng mắc`
              : 'Theo dõi rủi ro công việc',
          },
          {
            icon: 'event',
            label: 'Lịch họp đã lập',
            value: meetingsCount,
            tone: 'info',
            caption: operational.meeting.state === 'ready' && operational.meeting.data.next
              ? operational.meeting.data.next.title
              : 'Chưa có cuộc họp sắp tới',
          },
        ]}
      />

      {/* Project Identity Summary Strip */}
      <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs" aria-labelledby="supervision-project-summary">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-canvas/70 border-b border-hairline px-5 py-3.5">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-muted">{access.project.code} · {access.project.teamName ?? 'Chưa có thông tin nhóm'}</p>
            <h2 id="supervision-project-summary" className="mt-0.5 text-lg font-bold text-ink">{access.project.title}</h2>
          </div>
          <StatusBadge
            tone={access.project.status?.replaceAll('_', '').toUpperCase() === 'ACTIVE' ? 'success' : 'neutral'}
            label={projectStatusLabel(access.project.status)}
          />
        </div>
        <dl className="grid divide-y divide-hairline sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 sm:divide-x sm:divide-y-0">
          <Metric label="Trạng thái" value={projectStatusLabel(access.project.status)} />
          <Metric label="Nhóm" value={access.project.teamName ?? 'Chưa có thông tin'} />
          <Metric label="GVHD" value={access.supervisor?.supervisorName ?? 'Chưa có thông tin'} />
          <ResourceMetric label="Mốc đang thực hiện" resource={operational.milestone} render={(data) => data.current?.title ?? (data.count ? 'Chưa có mốc đang thực hiện' : 'Chưa có mốc')} />
          <ResourceMetric label="Hạng mục bàn giao" resource={operational.deliverables} render={(data) => `${data.count} hạng mục`} />
        </dl>
      </section>

      {/* Bento 2-column layout: Left 7 cols (Cần chú ý / Tiến độ & AI / Reflection) | Right 5 cols (Tài liệu & Hoạt động) */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-start">
        <div className="xl:col-span-7 space-y-5">
          <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs" aria-labelledby="supervision-attention">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
              <div>
                <h2 id="supervision-attention" className="text-base font-bold text-ink">Cần chú ý</h2>
                <p className="mt-0.5 text-xs text-ink-muted">Các mục cần theo dõi trong tiến độ hiện tại của đồ án.</p>
              </div>
              <StatusBadge tone={attentionTotal && attentionTotal > 0 ? 'warning' : 'success'} label={attentionTotal && attentionTotal > 0 ? `${attentionTotal} cảnh báo` : 'Ổn định'} />
            </div>
            <div className="grid divide-y divide-hairline sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <AttentionItem title="Báo cáo chờ phản hồi" link={`${access.routeBase}/progress`} resource={operational.pendingReports} render={(data) => data.count ? `${data.count} báo cáo chờ phản hồi` : 'Không có báo cáo chờ phản hồi'} />
              <AttentionItem title="Việc quá hạn / vướng mắc" link={`${access.routeBase}/tasks?overdue=true`} resource={progress.attention} render={(data) => `${data.overdueTasks.length} quá hạn · ${data.blockedTasks.length} vướng mắc`} />
              <AttentionItem title="Cuộc họp sắp tới" link={operational.meeting.state === 'ready' && operational.meeting.data.next ? `${access.routeBase}/meetings/${operational.meeting.data.next.id}` : `${access.routeBase}/meetings`} resource={operational.meeting} render={(data) => data.next ? `${data.next.title} · ${formatMeetingTime(data.next.startAt)}` : 'Chưa có lịch họp sắp tới'} />
            </div>
          </section>

          {(env.aiAdvisoryEnabled || env.aiProgressRiskEnabled) && <ProjectProgressAnalysisPanel projectId={access.project.id} compact />}

          {/* PeerEvaluationService permits writes in ACTIVE and FINAL_SUBMISSION for the current primary assignment. */}
          <TeamReflectionPanel
            projectId={access.project.id}
            audience="primary"
            canManagePeer={access.supervisor?.assignmentType === 'PRIMARY' && access.supervisor.isPrimary && !access.supervisor.endedAt && ['ACTIVE', 'FINALSUBMISSION'].includes(access.project.status.replaceAll('_', '').toUpperCase())}
          />

          <p className="text-xs leading-6 text-ink-muted">Phản hồi, người tham gia, biên bản, kết luận và công việc sau họp được quản lý trong chi tiết từng cuộc họp.</p>
        </div>

        <section className="xl:col-span-5 overflow-hidden rounded-xl border border-hairline bg-card shadow-xs" aria-labelledby="supervision-navigation">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
            <div>
              <h2 id="supervision-navigation" className="text-base font-bold text-ink">Tài liệu và hoạt động</h2>
              <p className="mt-0.5 text-xs text-ink-muted">Truy cập nội dung cần xem hoặc phản hồi cho nhóm.</p>
            </div>
            <StatusBadge tone="neutral" label={`${availableAreas.length + (evaluatorAssigned ? 1 : 0)} khu vực`} />
          </div>
          <nav className="workspace-launchpad grid sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2" aria-label="Chức năng hướng dẫn đồ án">
            {availableAreas.map((area) => <WorkspaceLink key={area.key} area={area} routeBase={access.routeBase} />)}
            {evaluatorAssigned && <WorkspaceLink area={{ key: 'evaluation', title: 'Đánh giá', description: 'Mở phân công đánh giá hiện tại.', path: '/evaluator/evaluations', icon: 'grading' }} routeBase="" />}
          </nav>
          {operational.evaluator.state === 'error' && <p role="alert" className="border-t border-hairline px-5 py-3 text-sm text-status-error-text">{operational.evaluator.message} Chức năng chấm điểm xuất hiện khi bạn được phân công đánh giá.</p>}
        </section>
      </div>
    </div>
  )
}

function WorkspaceLink({ area, routeBase }: { area: WorkspaceArea; routeBase: string }) {
  const to = area.path.startsWith('/') ? area.path : `${routeBase}/${area.path}`
  return (
    <SpotlightLink
      className="group flex flex-col gap-2 min-w-0 border-b border-hairline px-5 py-4 last:border-b-0 hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary sm:odd:border-r xl:odd:border-r-0 2xl:odd:border-r"
      to={to}
    >
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-base text-primary" aria-hidden="true">{area.icon}</span>
        <span className="block break-words font-semibold text-ink group-hover:text-primary">{area.title}</span>
      </div>
      <span className="block break-words text-xs leading-5 text-ink-muted">{area.description}</span>
      <span className="workspace-action-link mt-1 text-xs">Xem chi tiết<span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></span>
    </SpotlightLink>
  )
}

function AttentionItem<T>({ title, link, resource, render }: { title: string; link: string; resource: SupervisorOperationalResource<T>; render: (data: T) => string }) {
  const content = resource.state === 'loading' ? 'Đang tải…' : resource.state === 'error' ? resource.message : render(resource.data)
  return (
    <div className="min-w-0 px-5 py-4">
      <p className="text-xs font-medium text-ink-muted">{title}</p>
      {resource.state === 'error'
        ? <p role="alert" className="mt-1 break-words text-sm leading-6 text-status-error-text">{content}</p>
        : <Link className="mt-1 inline-flex min-h-11 items-center break-words text-sm font-semibold leading-6 text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to={link}>{content}</Link>}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="px-5 py-3.5"><dt className="text-xs text-ink-muted">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-ink">{value}</dd></div>
}

function ResourceMetric<T>({ label, resource, render }: { label: string; resource: SupervisorOperationalResource<T>; render: (data: T) => string }) {
  return <div className="px-5 py-3.5"><dt className="text-xs text-ink-muted">{label}</dt><dd className={resource.state === 'error' ? 'mt-1 break-words text-sm text-status-error-text' : 'mt-1 break-words text-sm font-semibold text-ink'}>{resource.state === 'loading' ? 'Đang tải…' : resource.state === 'error' ? resource.message : render(resource.data)}</dd></div>
}
