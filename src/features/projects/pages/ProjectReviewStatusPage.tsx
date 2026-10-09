import { projectStatusLabel } from '../utils/project-status'
import { dateTimeLabel } from '../../execution/execution-utils'
import { useNavigate } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { RevisionAlert } from '../components/RevisionAlert'
import { useProjectRegistration } from '../hooks/useProjectRegistration'

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

  if (journey.isLoading) return <div className="mx-auto max-w-4xl animate-pulse"><div className="h-8 w-1/3 rounded bg-slate-200" /><div className="mt-5 h-80 rounded-2xl bg-slate-200" /></div>
  if (journey.error) return <StatusError message={journey.error} onRetry={() => void journey.refreshAll()} />
  if (!project) return <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center"><h1 className="text-xl font-bold text-slate-900">Chưa có đề cương</h1><p className="mt-2 text-sm text-slate-600">Nhóm hiện chưa có hồ sơ đề cương.</p><button type="button" onClick={() => navigate('/project/register')} className="mt-5 rounded-xl bg-[#0f5b4e] px-5 py-2.5 text-xs font-bold text-white">Tạo bản nháp</button></section>

  return <div className="mx-auto flex max-w-4xl flex-col gap-6 pb-16">
    <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h1 className="text-2xl font-bold text-slate-900">Trạng thái đề cương</h1><p className="mt-1 text-xs text-slate-500">{project.code} · {project.teamName}</p></div><button type="button" onClick={() => void journey.refreshAll()} className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Tải lại thông tin</button></header>
    <section className={`rounded-2xl border p-5 ${rejected ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}><p className={`text-[11px] font-bold uppercase tracking-wider ${rejected ? 'text-rose-700' : 'text-emerald-700'}`}>Hồ sơ đồ án</p><h2 className="mt-1 text-lg font-bold text-slate-950">{state.title}</h2><p className="mt-1 text-sm text-slate-700">{state.detail}</p>{rejection?.reason && <p className="mt-3 rounded-lg border border-rose-200 bg-white/70 p-3 text-sm text-rose-900"><strong>Lý do:</strong> {rejection.reason}</p>}{registration.status === 'DRAFT' && registration.canEdit && <button type="button" onClick={() => navigate('/project/edit')} className="mt-4 rounded-lg bg-[#0f5b4e] px-3.5 py-2 text-xs font-bold text-white">Tiếp tục chỉnh sửa</button>}{registration.status === 'REVISIONREQUIRED' && registration.canEdit && <button type="button" onClick={() => navigate('/project/edit')} className="mt-4 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-bold text-white">Xem phản hồi và chỉnh sửa</button>}{rejected && registration.canCreate && <button type="button" onClick={() => navigate('/project/register')} className="mt-4 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-bold text-white">Đăng ký đề tài mới</button>}{registration.status === 'APPROVED' && registration.canContinueToSupervisor && <button type="button" onClick={() => navigate('/project/supervisor')} className="mt-4 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white">Tiếp tục đến Giảng viên hướng dẫn</button>}</section>
    {registration.status === 'REVISIONREQUIRED' && registration.latestRevision && <RevisionAlert reason={registration.latestRevision.reason} reviewerName={registration.latestRevision.changedByName || 'Hệ thống'} timestamp={registration.latestRevision.changedAt} onEdit={() => navigate('/project/edit')} />}
    {registration.error && <StatusError message={registration.error.kind === 'system' ? 'Không thể tải lịch sử đồ án. Hãy thử lại.' : registration.error.message} onRetry={() => void registration.loadHistory()} />}
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-base font-bold text-slate-900">Lịch sử thay đổi trạng thái</h2>{registration.historyLoading ? <p className="mt-3 text-sm text-slate-500">Đang tải lịch sử…</p> : registration.error && !registration.history.length ? <p className="mt-3 text-sm text-slate-500">Lịch sử chưa tải được.</p> : registration.history.length ? <ol className="mt-4 space-y-3">{registration.history.map((item) => <li key={item.id} className="workspace-record-row text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{item.oldStatus ? projectStatusLabel(item.oldStatus) : 'Khởi tạo'} → {projectStatusLabel(item.newStatus)}</strong><time className="text-xs text-slate-500">{dateTimeLabel(item.changedAt)}</time></div><p className="mt-1 text-xs text-slate-600">{item.changedByName || 'Hệ thống'}{item.reason ? ` · ${item.reason}` : ''}</p></li>)}</ol> : <p className="mt-3 text-sm text-slate-500">Chưa có lịch sử thay đổi trạng thái.</p>}</section>
  </div>
}

function StatusError({ message, onRetry }: { message: string; onRetry: () => void }) { return <section className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900" role="alert">{message}<button type="button" onClick={onRetry} className="ml-3 font-bold underline">Thử lại</button></section> }
function normalizeStatus(status: string) { return status.replaceAll('_', '').toUpperCase() }
