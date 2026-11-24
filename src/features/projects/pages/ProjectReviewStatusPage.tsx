import { projectStatusLabel } from '../utils/project-status'
import { HistoryTimeline } from '../../../components/ui/HistoryTimeline'
import { Pagination, StatusBadge, useClientPagination } from '../../../components/ui'
import { useNavigate } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { RegistrationReadinessChecklist } from '../components/RegistrationReadinessChecklist'
import { RevisionAlert } from '../components/RevisionAlert'
import { useProjectRegistration } from '../hooks/useProjectRegistration'
import { PageLoading } from '../../../components/ui/PageLoading'
import { TeamReflectionPanel } from '../../student-collaboration/TeamReflectionPanel'

const statusCopy: Record<string, { title: string; detail: string }> = {
  DRAFT: { title: 'Bản nháp', detail: 'Rà soát đề cương và nộp để bộ môn xét duyệt khi đủ điều kiện.' },
  SUBMITTED: { title: 'Đã nộp', detail: 'Đề cương đang chờ Bộ môn xử lý.' },
  UNDERREVIEW: { title: 'Đang thẩm định', detail: 'Bộ môn đang xem xét nội dung đề cương. Kết quả và yêu cầu bổ sung sẽ được cập nhật tại đây.' },
  REVISIONREQUIRED: { title: 'Cần chỉnh sửa', detail: 'Chỉnh sửa theo nhận xét bên dưới rồi nộp lại đề cương.' },
  REJECTED: { title: 'Không được chấp thuận', detail: 'Xem lý do trong lịch sử xét duyệt để chuẩn bị đề tài phù hợp hơn.' },
  ACTIVE: { title: 'Đang thực hiện', detail: 'Đồ án đã được phân công hướng dẫn. Theo dõi công việc, các mốc và phản hồi trong không gian đồ án.' },
  SUPERVISORPENDING: { title: 'Chờ phân công giảng viên', detail: 'Đề cương đã được duyệt. Nhóm đang chờ hoàn tất phân công hướng dẫn.' },
  FINALSUBMISSION: { title: 'Đang bàn giao', detail: 'Nhóm đang chuẩn bị hồ sơ và sản phẩm cho đợt đánh giá cuối.' },
  COMPLETED: { title: 'Đã hoàn thành', detail: 'Đồ án đã hoàn thành. Bạn có thể xem lại hồ sơ và kết quả đánh giá.' },
  ARCHIVED: { title: 'Đã lưu trữ', detail: 'Hồ sơ đồ án được lưu để tra cứu.' },
  APPROVED: { title: 'Đã được phê duyệt', detail: 'Đề cương đã được thông qua. Nhóm có thể tiếp tục chọn giảng viên khi đủ điều kiện.' },
}

export function ProjectReviewStatusPage() {
  const navigate = useNavigate()
  const journey = useStudentJourney()
  const registration = useProjectRegistration(journey)
  const project = journey.project
  const state = statusCopy[registration.status] ?? { title: project ? projectStatusLabel(project.status) : 'Chưa có đề cương', detail: 'Theo dõi kết quả xét duyệt và lịch sử đồ án tại đây.' }
  const rejected = registration.status === 'REJECTED'
  const needsRevision = registration.status === 'REVISIONREQUIRED'
  const rejection = registration.history.filter((item) => normalizeStatus(item.newStatus) === 'REJECTED').at(-1)
  const historyPagination = useClientPagination(registration.history, 8)

  if (journey.isLoading) return <div className="workspace-page"><PageLoading label="Đang tải trạng thái đề cương…" /></div>
  if (journey.error) return <StatusError message={journey.error} onRetry={() => void journey.refreshAll()} />
  if (!project) return <section className="mx-auto max-w-3xl rounded-2xl border border-hairline bg-card p-8 text-center shadow-xs"><h1 className="font-heading text-xl font-bold text-ink">Chưa có đề cương</h1><p className="mt-2 text-sm text-ink-muted">Nhóm hiện chưa có hồ sơ đề cương.</p><button type="button" onClick={() => navigate('/project/register')} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary-hover">Tạo bản nháp</button></section>

  const badgeTone = rejected ? 'danger' : needsRevision ? 'warning' : ['APPROVED', 'ACTIVE', 'COMPLETED'].includes(registration.status) ? 'success' : 'info'

  return (
    <div className="workspace-page flex flex-col gap-5 pb-12">
      <header className="workspace-heading">
        <div className="workspace-heading-copy">
          <span className="workspace-kicker">Theo dõi xét duyệt</span>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">Trạng thái đề cương</h1>
          <p className="text-sm text-ink-muted">{project.code} · {project.teamName}</p>
        </div>
        <button type="button" onClick={() => void journey.refreshAll()} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-hairline bg-card px-3.5 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary">
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">refresh</span>
          Tải lại thông tin
        </button>
      </header>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
        <div className="flex flex-col gap-5 xl:col-span-7">
          <section className={`overflow-hidden rounded-xl border shadow-xs ${rejected ? 'border-status-error-border bg-status-error-bg' : needsRevision ? 'border-status-warning-border bg-status-warning-bg' : 'border-status-success-border bg-status-success-bg'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline/60 bg-card/60 px-5 py-3.5">
              <p className={`text-xs font-bold uppercase tracking-wider ${rejected ? 'text-status-error-text' : needsRevision ? 'text-status-warning-text' : 'text-status-success-text'}`}>Hồ sơ đồ án</p>
              <StatusBadge tone={badgeTone} label={state.title} />
            </div>
            <div className="p-5">
              <h2 className="text-xl font-bold text-ink">{state.title}</h2>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink-soft">{state.detail}</p>
              {rejection?.reason && <p className="mt-3 rounded-lg border border-status-error-border bg-card p-3.5 text-sm text-status-error-text"><strong>Lý do:</strong> {rejection.reason}</p>}
              <div className="mt-4 flex flex-wrap gap-2.5">
                {registration.status === 'DRAFT' && registration.canEdit && <button type="button" onClick={() => navigate('/project/edit')} className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-hover">Tiếp tục chỉnh sửa</button>}
                {registration.status === 'REVISIONREQUIRED' && registration.canEdit && <button type="button" onClick={() => navigate('/project/edit')} className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-hover">Xem phản hồi và chỉnh sửa</button>}
                {rejected && registration.canCreate && <button type="button" onClick={() => navigate('/project/register')} className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-hover">Đăng ký đề tài mới</button>}
                {registration.canContinueToSupervisor && <button type="button" onClick={() => navigate('/project/supervisor')} className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-hover">{registration.status === 'APPROVED' ? 'Tiếp tục đến Giảng viên hướng dẫn' : 'Mời Giảng viên hướng dẫn / Mentor'}</button>}
              </div>
            </div>
          </section>

          {registration.status === 'REVISIONREQUIRED' && registration.latestRevision && <RevisionAlert reason={registration.latestRevision.reason} reviewerName={registration.latestRevision.changedByName || 'Hệ thống'} timestamp={registration.latestRevision.changedAt} onEdit={() => navigate('/project/edit')} />}
          {(registration.status === 'DRAFT' || registration.status === 'REVISIONREQUIRED') && <RegistrationReadinessChecklist reasons={registration.submitReasons} />}
          {registration.error && <StatusError message={registration.error.kind === 'system' ? 'Không thể tải lịch sử đồ án. Hãy thử lại.' : registration.error.message} onRetry={() => void registration.loadHistory()} />}
          <TeamReflectionPanel projectId={project.id} audience="preactivation" />
        </div>

        <aside className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs xl:col-span-5">
          <div className="flex items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
            <h2 className="text-base font-bold text-ink">Lịch sử thay đổi trạng thái</h2>
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-primary">
              {registration.history.length}
            </span>
          </div>
          <div className="p-5">
            {registration.historyLoading ? (
              <p className="text-sm text-ink-muted">Đang tải lịch sử…</p>
            ) : registration.error && !registration.history.length ? (
              <p className="text-sm text-ink-muted">Lịch sử chưa tải được.</p>
            ) : (
              <>
                <HistoryTimeline
                  items={historyPagination.paginatedItems.map(item => ({
                    at: item.changedAt,
                    actor: item.changedByName || 'Hệ thống',
                    action: `${item.oldStatus ? projectStatusLabel(item.oldStatus) : 'Khởi tạo'} → ${projectStatusLabel(item.newStatus)}`,
                    note: item.reason,
                  }))}
                  emptyLabel="Chưa có lịch sử thay đổi trạng thái."
                />
                {historyPagination.showPagination && (
                  <div className="mt-4 border-t border-hairline pt-3">
                    <Pagination
                      page={historyPagination.page}
                      pages={historyPagination.totalPages}
                      total={historyPagination.total}
                      pageSize={historyPagination.pageSize}
                      pageSizeOptions={[8, 16, 30]}
                      onPage={historyPagination.setPage}
                      onPageSizeChange={historyPagination.setPageSize}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

function StatusError({ message, onRetry }: { message: string; onRetry: () => void }) { return <section className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-status-error-border bg-status-error-bg p-5 text-sm text-status-error-text" role="alert"><span>{message}</span><button type="button" onClick={onRetry} className="min-h-11 font-bold underline">Thử lại</button></section> }
function normalizeStatus(status: string) { return status.replaceAll('_', '').toUpperCase() }
