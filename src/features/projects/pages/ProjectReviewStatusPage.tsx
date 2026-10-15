import { projectStatusLabel } from '../utils/project-status'
import { dateTimeLabel } from '../../execution/execution-utils'
import { useNavigate } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { RegistrationReadinessChecklist } from '../components/RegistrationReadinessChecklist'
import { RevisionAlert } from '../components/RevisionAlert'
import { useProjectRegistration } from '../hooks/useProjectRegistration'
import { PageLoading } from '../../../components/ui/PageLoading'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { Button } from '../../../components/ui/Button'
import { InlineAlert } from '../../../components/ui/InlineAlert'

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
  const rejection = registration.history.filter((item) => normalizeStatus(item.newStatus) === 'REJECTED').at(-1)

  if (journey.isLoading) return <div className="mx-auto max-w-4xl"><PageLoading label="Đang tải trạng thái đề cương…" /></div>
  if (journey.error) return <div className="mx-auto max-w-4xl"><InlineAlert tone="danger" onRetry={() => void journey.refreshAll()}>{journey.error}</InlineAlert></div>
  if (!project) return <section className="mx-auto max-w-3xl rounded-2xl border border-hairline bg-card p-8 text-center"><h1 className="text-xl font-bold text-slate-900">Chưa có đề cương</h1><p className="mt-2 text-sm text-slate-600">Nhóm hiện chưa có hồ sơ đề cương.</p><Button className="mt-5" onClick={() => navigate('/project/register')}>Tạo bản nháp</Button></section>

  return <WorkspacePage title="Trạng thái đề cương" eyebrow="Đề tài và đăng ký" description={`${project.code} · ${project.teamName}`} action={<Button variant="outline" onClick={() => void journey.refreshAll()}>Tải lại thông tin</Button>} className="space-y-6">
    <section className={`rounded-2xl border p-5 ${rejected ? 'border-status-error-border bg-status-error-bg' : 'border-status-success-border bg-status-success-bg'}`}><p className={`text-xs font-bold uppercase tracking-wider ${rejected ? 'text-status-error-text' : 'text-status-success-text'}`}>Hồ sơ đồ án</p><h2 className="mt-1 text-lg font-bold text-slate-950">{state.title}</h2><p className="mt-1 text-sm text-slate-700">{state.detail}</p>{rejection?.reason && <p className="mt-3 rounded-lg border border-status-error-border bg-card/70 p-3 text-sm text-status-error-text"><strong>Lý do:</strong> {rejection.reason}</p>}{registration.status === 'DRAFT' && registration.canEdit && <Button className="mt-4" onClick={() => navigate('/project/edit')}>Tiếp tục chỉnh sửa</Button>}{registration.status === 'REVISIONREQUIRED' && registration.canEdit && <Button className="mt-4" onClick={() => navigate('/project/edit')}>Xem phản hồi và chỉnh sửa</Button>}{rejected && registration.canCreate && <Button className="mt-4" onClick={() => navigate('/project/register')}>Đăng ký đề tài mới</Button>}{registration.canContinueToSupervisor && <Button className="mt-4" onClick={() => navigate('/project/supervisor')}>{registration.status === 'APPROVED' ? 'Tiếp tục đến Giảng viên hướng dẫn' : 'Mời Giảng viên hướng dẫn / Mentor'}</Button>}</section>
    {registration.status === 'REVISIONREQUIRED' && registration.latestRevision && <RevisionAlert reason={registration.latestRevision.reason} reviewerName={registration.latestRevision.changedByName || 'Hệ thống'} timestamp={registration.latestRevision.changedAt} onEdit={() => navigate('/project/edit')} />}
    <RegistrationReadinessChecklist reasons={registration.submitReasons} />
    {registration.error && <InlineAlert tone="danger" onRetry={() => void registration.loadHistory()}>{registration.error.kind === 'system' ? 'Không thể tải lịch sử đồ án. Hãy thử lại.' : registration.error.message}</InlineAlert>}
    <section className="rounded-2xl border border-hairline bg-card p-5"><h2 className="text-base font-bold text-slate-900">Lịch sử thay đổi trạng thái</h2>{registration.historyLoading ? <p className="mt-3 text-sm text-slate-500">Đang tải lịch sử…</p> : registration.error && !registration.history.length ? <p className="mt-3 text-sm text-slate-500">Lịch sử chưa tải được.</p> : registration.history.length ? <ol className="mt-4 space-y-3">{registration.history.map((item) => <li key={item.id} className="workspace-record-row text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{item.oldStatus ? projectStatusLabel(item.oldStatus) : 'Khởi tạo'} → {projectStatusLabel(item.newStatus)}</strong><time className="text-xs text-slate-500">{dateTimeLabel(item.changedAt)}</time></div><p className="mt-1 text-xs text-slate-600">{item.changedByName || 'Hệ thống'}{item.reason ? ` · ${item.reason}` : ''}</p></li>)}</ol> : <p className="mt-3 text-sm text-slate-500">Chưa có lịch sử thay đổi trạng thái.</p>}</section>
  </WorkspacePage>
}
function normalizeStatus(status: string) { return status.replaceAll('_', '').toUpperCase() }
