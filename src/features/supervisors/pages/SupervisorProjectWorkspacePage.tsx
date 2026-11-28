import { TeamReflectionPanel } from '../../student-collaboration/TeamReflectionPanel'
import { Link } from 'react-router-dom'
import { env } from '../../../app/config/env'
import { Button } from '../../../components/ui/Button'
import { HealthPulseBadge } from '../../../components/ui/HealthPulseBadge'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { ProjectProgressAnalysisPanel } from '../../ai/components/ProjectProgressAnalysisPanel'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { formatMeetingTime } from '../../meetings/meeting-utils'
import { projectStatusLabel } from '../../projects/utils/project-status'
import { useSupervisorOperationalSummary, type SupervisorOperationalResource } from '../hooks/useSupervisorOperationalSummary'
import { useSupervisorProgressReview } from '../hooks/useSupervisorProgressReview'

type QuickLinkItem = { key: string; icon: string; title: string; path: string }

const quickLinks: QuickLinkItem[] = [
  { key: 'progress', icon: 'monitoring', title: 'Tiến độ & Báo cáo', path: 'progress' },
  { key: 'review-gates', icon: 'fact_check', title: 'Cổng kiểm duyệt', path: 'review-gates' },
  { key: 'individual-process', icon: 'grade', title: 'Điểm quá trình 20% (G1–G3)', path: 'individual-process' },
  { key: 'tasks', icon: 'checklist', title: 'Công việc & mốc', path: 'tasks' },
  { key: 'meetings', icon: 'groups', title: 'Cuộc họp', path: 'meetings' },
  { key: 'deliverables', icon: 'inventory_2', title: 'Hạng mục bàn giao', path: 'deliverables' },
  { key: 'files', icon: 'folder_open', title: 'Kho tệp đồ án', path: 'files' },
  { key: 'evidence', icon: 'verified', title: 'Sổ minh chứng', path: 'evidence' },
  { key: 'contributions', icon: 'analytics', title: 'Đóng góp', path: 'contributions' },
  { key: 'final', icon: 'task_alt', title: 'Bàn giao cuối kỳ', path: 'final-submission' },
]

/** Assignment-scoped, evidence-first cockpit. It does not invent a supervisor role or a write capability. */
export function SupervisorProjectWorkspacePage() {
  const access = useExecutionAccess()
  const operational = useSupervisorOperationalSummary(access.project.id)
  const progress = useSupervisorProgressReview(access.project.id)
  const evaluatorAssigned = operational.evaluator.state === 'ready' && operational.evaluator.data

  const availableQuickLinks: QuickLinkItem[] = [
    ...quickLinks,
    ...(env.weeklyAssessmentEnabled ? [{ key: 'weekly', icon: 'calendar_view_week', title: 'Nhận xét tuần (Tham khảo)', path: 'weekly-assessments' }] : []),
    ...(env.gatesEnabled ? [{ key: 'checkpoints', icon: 'flag', title: 'Mốc kiểm soát', path: 'checkpoints' }] : []),
    ...(env.aiAdvisoryEnabled || env.aiProgressRiskEnabled ? [{ key: 'ai', icon: 'auto_awesome', title: 'Rủi ro & AI', path: 'ai' }] : []),
    ...(env.defenseScheduleEnabled ? [{ key: 'defense', icon: 'school', title: 'Lịch bảo vệ', path: 'defense' }] : []),
    ...(evaluatorAssigned ? [{ key: 'evaluation', icon: 'grading', title: 'Đánh giá', path: '/evaluator/workspace' }] : []),
  ]

  const progressSummary = progress.summary?.state === 'ready' ? progress.summary.data : null
  const overdueTasks = progress.attention.state === 'ready' ? progress.attention.data.overdueTasks : []
  const blockedTasks = progress.attention.state === 'ready' ? progress.attention.data.blockedTasks : []
  const normalizedStatus = access.project.status.replaceAll('_', '').toUpperCase()

  return (
    <WorkspacePage
      size="wide"
      eyebrow={`Giảng viên hướng dẫn · ${access.project.code}`}
      backTo="/supervisor/workspace"
      backLabel="Danh sách đồ án"
      title="Tổng quan đồ án"
      description="Theo dõi tiến độ, nội dung cần phản hồi và các điểm cần lưu ý của nhóm được phân công."
      action={
        <Button
          variant="secondary"
          size="sm"
          icon="refresh"
          aria-label="Làm mới dữ liệu"
          onClick={() => { progress.reload(); void operational.reload() }}
        />
      }
      className="pb-12"
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs" aria-labelledby="supervision-project-summary">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="font-mono text-xs font-medium text-ink-muted">{access.project.code} · {access.project.teamName ?? 'Chưa có thông tin nhóm'}</p>
              <h2 id="supervision-project-summary" className="mt-1 font-heading text-xl font-bold text-ink">{access.project.title}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                tone={normalizedStatus === 'ACTIVE' ? 'success' : normalizedStatus === 'FINALSUBMISSION' ? 'info' : 'neutral'}
                label={projectStatusLabel(access.project.status)}
              />
              {progressSummary && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-subtle px-3 py-1 font-mono text-xs font-bold text-primary">
                  {progressSummary.progressPercentage}% công việc
                </span>
              )}
              {progress.attention.state === 'ready' && (
                <HealthPulseBadge
                  healthPulseStatus={blockedTasks.length >= 2 ? 'RED' : blockedTasks.length === 1 || overdueTasks.length > 0 ? 'YELLOW' : 'GREEN'}
                />
              )}
            </div>
          </div>
          <dl className="grid divide-y divide-hairline sm:grid-cols-2 lg:grid-cols-5 sm:divide-x sm:divide-y-0">
            <Metric label="Trạng thái" value={projectStatusLabel(access.project.status)} />
            <Metric label="Nhóm" value={access.project.teamName ?? 'Chưa có thông tin'} />
            <Metric label="GVHD" value={access.supervisor?.supervisorName ?? 'Chưa có thông tin'} />
            <ResourceMetric label="Mốc đang thực hiện" resource={operational.milestone} render={(data) => data.current?.title ?? (data.count ? 'Chưa có mốc đang thực hiện' : 'Chưa có mốc')} />
            <ResourceMetric label="Hạng mục bàn giao" resource={operational.deliverables} render={(data) => `${data.count} hạng mục`} />
          </dl>
        </section>

        <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs" aria-labelledby="supervision-attention">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-5 py-4 sm:px-6">
            <div>
              <h2 id="supervision-attention" className="font-heading text-base font-bold text-ink">Cần chú ý ngay</h2>
              <p className="mt-0.5 text-xs text-ink-muted">Các mục cần theo dõi hoặc phản hồi trong tiến độ hiện tại của đồ án.</p>
            </div>
          </div>
          <div className="grid divide-y divide-hairline sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
            <AttentionItem
              icon="assignment_late"
              title="Báo cáo chờ phản hồi"
              link={`${access.routeBase}/progress`}
              resource={operational.pendingReports}
              render={(data) => data.count ? `${data.count} báo cáo chờ phản hồi` : 'Không có báo cáo chờ phản hồi'}
            />
            <AttentionItem
              icon="warning"
              title="Việc quá hạn / vướng mắc"
              link={`${access.routeBase}/tasks?overdue=true`}
              resource={progress.attention}
              render={(data) => `${data.overdueTasks.length} quá hạn · ${data.blockedTasks.length} vướng mắc`}
            />
            <AttentionItem
              icon="videocam"
              title="Cuộc họp sắp tới"
              link={operational.meeting.state === 'ready' && operational.meeting.data.next ? `${access.routeBase}/meetings/${operational.meeting.data.next.id}` : `${access.routeBase}/meetings`}
              resource={operational.meeting}
              render={(data) => data.next ? `${data.next.title} · ${formatMeetingTime(data.next.startAt)}` : 'Chưa có lịch họp sắp tới'}
            />
          </div>
          {(overdueTasks.length > 0 || blockedTasks.length > 0) && (
            <div className="border-t border-hairline bg-canvas/60 px-5 py-3.5 sm:px-6">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Công việc cần nhắc nhóm</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[...overdueTasks.slice(0, 3), ...blockedTasks.slice(0, 2)].map((task) => (
                  <Link
                    key={task.id}
                    to={`${access.routeBase}/tasks/${task.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-status-warning-border bg-card px-2.5 py-1.5 text-xs font-medium text-ink hover:border-primary hover:text-primary"
                  >
                    <span className="max-w-[260px] truncate">{task.title || `Công việc #${task.id}`}</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs" aria-labelledby="supervision-navigation">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="supervision-navigation" className="font-heading text-sm font-bold uppercase tracking-wider text-ink-soft">Lối tắt nhanh trong đồ án</h2>
            </div>
            {operational.evaluator.state === 'error' && (
              <p role="alert" className="text-xs text-status-error-text">{operational.evaluator.message} Chức năng chấm điểm xuất hiện khi bạn được phân công đánh giá.</p>
            )}
          </div>
          <nav className="flex flex-wrap gap-2" aria-label="Chức năng hướng dẫn đồ án">
            {availableQuickLinks.map((area) => {
              const to = area.path.startsWith('/') ? area.path : `${access.routeBase}/${area.path}`
              return (
                <Link
                  key={area.key}
                  to={to}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-hairline bg-canvas px-3.5 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">{area.icon}</span>
                  <span>{area.title}</span>
                </Link>
              )
            })}
          </nav>
        </section>

        <div className="grid gap-6 xl:grid-cols-2 xl:items-stretch">
          {(env.aiAdvisoryEnabled || env.aiProgressRiskEnabled) && <ProjectProgressAnalysisPanel projectId={access.project.id} compact />}
          <TeamReflectionPanel
            projectId={access.project.id}
            audience="primary"
            canManagePeer={access.supervisor?.assignmentType === 'PRIMARY' && access.supervisor.isPrimary && !access.supervisor.endedAt && ['ACTIVE', 'FINALSUBMISSION'].includes(normalizedStatus)}
          />
        </div>
      </div>
    </WorkspacePage>
  )
}

function AttentionItem<T>({ icon, title, link, resource, render }: { icon: string; title: string; link: string; resource: SupervisorOperationalResource<T>; render: (data: T) => string }) {
  const content = resource.state === 'loading' ? 'Đang tải…' : resource.state === 'error' ? resource.message : render(resource.data)
  return (
    <div className="min-w-0 px-5 py-4 sm:px-6">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
        <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">{icon}</span>
        {title}
      </p>
      {resource.state === 'error' ? (
        <p role="alert" className="mt-1 break-words text-sm leading-6 text-status-error-text">{content}</p>
      ) : (
        <Link className="mt-1 inline-flex min-h-11 items-center break-words text-sm font-semibold leading-6 text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to={link}>{content}</Link>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="px-5 py-4 sm:px-6"><dt className="text-xs text-ink-muted">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-ink">{value}</dd></div>
}

function ResourceMetric<T>({ label, resource, render }: { label: string; resource: SupervisorOperationalResource<T>; render: (data: T) => string }) {
  return <div className="px-5 py-4 sm:px-6"><dt className="text-xs text-ink-muted">{label}</dt><dd className={resource.state === 'error' ? 'mt-1 break-words text-sm text-status-error-text' : 'mt-1 break-words text-sm font-semibold text-ink'}>{resource.state === 'loading' ? 'Đang tải…' : resource.state === 'error' ? resource.message : render(resource.data)}</dd></div>
}
