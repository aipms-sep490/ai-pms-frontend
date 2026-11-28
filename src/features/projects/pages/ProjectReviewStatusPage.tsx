import { projectStatusLabel } from '../utils/project-status'
import { getActivePrimaryAssignment } from '../utils/project-resolution.utils'
import { Button } from '../../../components/ui/Button'
import { HistoryTimeline } from '../../../components/ui/HistoryTimeline'
import { useNavigate } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { RegistrationReadinessChecklist } from '../components/RegistrationReadinessChecklist'
import { RevisionAlert } from '../components/RevisionAlert'
import { useProjectRegistration } from '../hooks/useProjectRegistration'
import { PageLoading } from '../../../components/ui/PageLoading'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { TeamReflectionPanel } from '../../student-collaboration/TeamReflectionPanel'

const statusCopy: Record<string, { title: string; detail: string; surface: 'error' | 'warning' | 'success' | 'neutral' }> = {
  DRAFT: { title: 'Bản nháp', detail: 'Rà soát đề cương và nộp để bộ môn xét duyệt khi đủ điều kiện.', surface: 'neutral' },
  SUBMITTED: { title: 'Đã nộp', detail: 'Đề cương đang chờ Bộ môn xử lý.', surface: 'warning' },
  UNDERREVIEW: { title: 'Đang thẩm định', detail: 'Bộ môn đang xem xét nội dung đề cương. Kết quả và yêu cầu bổ sung sẽ được cập nhật tại đây.', surface: 'warning' },
  REVISIONREQUIRED: { title: 'Cần chỉnh sửa', detail: 'Chỉnh sửa theo nhận xét bên dưới rồi nộp lại đề cương.', surface: 'warning' },
  REJECTED: { title: 'Không được chấp thuận', detail: 'Xem lý do trong lịch sử xét duyệt để chuẩn bị đề tài phù hợp hơn.', surface: 'error' },
  ACTIVE: { title: 'Đang thực hiện', detail: 'Đồ án đã được phân công hướng dẫn. Theo dõi công việc, các mốc và phản hồi trong không gian đồ án.', surface: 'success' },
  SUPERVISORPENDING: { title: 'Chờ phân công giảng viên', detail: 'Đề cương đã được duyệt. Nhóm đang chờ hoàn tất phân công hướng dẫn.', surface: 'warning' },
  FINALSUBMISSION: { title: 'Đang bàn giao', detail: 'Nhóm đang chuẩn bị hồ sơ và sản phẩm cho đợt đánh giá cuối.', surface: 'success' },
  COMPLETED: { title: 'Đã hoàn thành', detail: 'Đồ án đã hoàn thành. Bạn có thể xem lại hồ sơ và kết quả đánh giá.', surface: 'success' },
  ARCHIVED: { title: 'Đã lưu trữ', detail: 'Hồ sơ đồ án được lưu để tra cứu.', surface: 'neutral' },
  APPROVED: { title: 'Đã được phê duyệt', detail: 'Đề cương đã được thông qua. Nhóm có thể tiếp tục chọn giảng viên khi đủ điều kiện.', surface: 'success' },
}

const surfaceClasses = {
  error: { box: 'border-status-error-border bg-status-error-bg', kicker: 'text-status-error-text' },
  warning: { box: 'border-status-warning-border bg-status-warning-bg', kicker: 'text-status-warning-text' },
  success: { box: 'border-hairline border-l-4 border-l-status-success-text bg-card', kicker: 'text-status-success-text' },
  neutral: { box: 'border-hairline bg-card', kicker: 'text-ink-muted' },
} as const

export function ProjectReviewStatusPage() {
  const navigate = useNavigate()
  const journey = useStudentJourney()
  const registration = useProjectRegistration(journey)
  const project = journey.project
  const hasPrimarySupervisor = Boolean(getActivePrimaryAssignment(journey.assignments))
  const baseState = statusCopy[registration.status] ?? {
    title: project ? projectStatusLabel(project.status) : 'Chưa có đề cương',
    detail: 'Theo dõi kết quả xét duyệt và lịch sử đồ án tại đây.',
    surface: 'neutral' as const,
  }
  const state = registration.status === 'SUPERVISORPENDING' && hasPrimarySupervisor
    ? {
        title: 'Chờ ký Cam kết nhóm',
        detail: 'Đề cương và GVHD đã được xác nhận. Tất cả thành viên trong nhóm cần ký Cam kết nhóm để kích hoạt đồ án sang trạng thái Đang thực hiện.',
        surface: 'warning' as const,
      }
    : baseState
  const rejected = registration.status === 'REJECTED'
  const rejection = registration.history.filter((item) => normalizeStatus(item.newStatus) === 'REJECTED').at(-1)
  const tone = surfaceClasses[state.surface]

  if (journey.isLoading) return <WorkspacePage size="standard" eyebrow="Theo dõi xét duyệt" backTo="/project/overview" backLabel="Tổng quan đồ án" title="Trạng thái đề cương"><PageLoading label="Đang tải trạng thái đề cương…" /></WorkspacePage>
  if (journey.error) return <WorkspacePage size="standard" eyebrow="Theo dõi xét duyệt" backTo="/project/overview" backLabel="Tổng quan đồ án" title="Trạng thái đề cương"><StatusError message={journey.error} onRetry={() => void journey.refreshAll()} /></WorkspacePage>
  if (!project) return (
    <WorkspacePage size="standard" eyebrow="Theo dõi xét duyệt" backTo="/project/overview" backLabel="Tổng quan đồ án" title="Chưa có đề cương">
      <section className="mx-auto max-w-3xl rounded-2xl border border-hairline bg-card p-8 text-center shadow-xs">
        <p className="text-sm text-ink-muted">Nhóm hiện chưa có hồ sơ đề cương.</p>
        <button type="button" onClick={() => navigate('/project/register')} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary-hover">Tạo bản nháp</button>
      </section>
    </WorkspacePage>
  )

  return (
    <WorkspacePage
      size="standard"
      eyebrow="Theo dõi xét duyệt"
      backTo="/project/overview"
      backLabel="Tổng quan đồ án"
      title="Trạng thái đề cương"
      description={`${project.code} · ${project.teamName}`}
      action={
        <Button
          variant="secondary"
          size="sm"
          icon="refresh"
          aria-label="Tải lại thông tin"
          onClick={() => void journey.refreshAll()}
        />
      }
      className="pb-16"
    >
      <div className="flex flex-col gap-6">
        <section className={`rounded-2xl border p-5 shadow-xs ${tone.box}`}>
          <p className={`text-xs font-bold uppercase tracking-wider ${tone.kicker}`}>Hồ sơ đồ án</p>
          <h2 className="mt-1 font-heading text-lg font-bold text-ink">{state.title}</h2>
          <p className="mt-1 text-sm text-ink-soft">{state.detail}</p>
          {rejection?.reason && <p className="mt-3 rounded-lg border border-status-error-border bg-card p-3 text-sm text-status-error-text"><strong>Lý do:</strong> {rejection.reason}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {registration.status === 'DRAFT' && registration.canEdit && <button type="button" onClick={() => navigate('/project/edit')} className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-hover">Tiếp tục chỉnh sửa</button>}
            {registration.status === 'REVISIONREQUIRED' && registration.canEdit && <button type="button" onClick={() => navigate('/project/edit')} className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-hover">Xem phản hồi và chỉnh sửa</button>}
            {rejected && registration.canCreate && <button type="button" onClick={() => navigate('/project/register')} className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-hover">Đăng ký đề tài mới</button>}
            {registration.status === 'SUPERVISORPENDING' && hasPrimarySupervisor && (
              <button type="button" onClick={() => navigate('/project/agreement')} className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-hover">
                Mở Cam kết nhóm để ký
              </button>
            )}
            {registration.canContinueToSupervisor && <button type="button" onClick={() => navigate('/project/supervisor')} className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-hover">{registration.status === 'APPROVED' ? 'Tiếp tục đến Giảng viên hướng dẫn' : 'Mời Giảng viên hướng dẫn / Mentor'}</button>}
          </div>
        </section>
        {registration.status === 'REVISIONREQUIRED' && registration.latestRevision && <RevisionAlert reason={registration.latestRevision.reason} reviewerName={registration.latestRevision.changedByName || 'Hệ thống'} timestamp={registration.latestRevision.changedAt} onEdit={() => navigate('/project/edit')} />}
        {(registration.status === 'DRAFT' || registration.status === 'REVISIONREQUIRED') && <RegistrationReadinessChecklist reasons={registration.submitReasons} />}
        {registration.error && <StatusError message={registration.error.kind === 'system' ? 'Không thể tải lịch sử đồ án. Hãy thử lại.' : registration.error.message} onRetry={() => void registration.loadHistory()} />}
        <section className="rounded-2xl border border-hairline bg-card p-5 shadow-xs"><h2 className="font-heading text-base font-bold text-ink">Lịch sử thay đổi trạng thái</h2>{registration.historyLoading ? <p className="mt-3 text-sm text-ink-muted">Đang tải lịch sử…</p> : registration.error && !registration.history.length ? <p className="mt-3 text-sm text-ink-muted">Lịch sử chưa tải được.</p> : <HistoryTimeline items={registration.history.map(item => ({ at: item.changedAt, actor: item.changedByName || 'Hệ thống', action: `${item.oldStatus ? projectStatusLabel(item.oldStatus) : 'Khởi tạo'} → ${projectStatusLabel(item.newStatus)}`, note: item.reason }))} emptyLabel="Chưa có lịch sử thay đổi trạng thái." />}</section>
        <TeamReflectionPanel projectId={project.id} audience="preactivation" />
      </div>
    </WorkspacePage>
  )
}

function StatusError({ message, onRetry }: { message: string; onRetry: () => void }) { return <section className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-status-error-border bg-status-error-bg p-5 text-sm text-status-error-text" role="alert"><span>{message}</span><button type="button" onClick={onRetry} className="min-h-11 font-bold underline">Thử lại</button></section> }
function normalizeStatus(status: string) { return status.replaceAll('_', '').toUpperCase() }
