import { useNavigate } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { RevisionAlert } from '../components/RevisionAlert'
import { useProjectRegistration } from '../hooks/useProjectRegistration'

const statusCopy: Record<string, { title: string; detail: string }> = {
  DRAFT: { title: 'Bản nháp', detail: 'Rà soát nội dung rồi nộp khi backend cấp action submit_project.' },
  SUBMITTED: { title: 'Đã nộp', detail: 'Đề cương đang chờ Bộ môn xử lý.' },
  UNDERREVIEW: { title: 'Đang thẩm định', detail: 'Bộ môn đang thực hiện quy trình review. Sinh viên không có thao tác quyết định ở màn hình này.' },
  REVISIONREQUIRED: { title: 'Cần chỉnh sửa', detail: 'Phản hồi của reviewer bên dưới vẫn hiển thị đến khi đề cương được nộp lại thành công.' },
  REJECTED: { title: 'Không được chấp thuận', detail: 'Xem lý do trong lịch sử trạng thái; không có chuyển trạng thái cục bộ.' },
  APPROVED: { title: 'Đã được phê duyệt', detail: 'Bước lựa chọn giảng viên thuộc luồng riêng. Màn hình này không tự thay đổi trạng thái.' },
}

export function ProjectReviewStatusPage() {
  const navigate = useNavigate()
  const journey = useStudentJourney()
  const registration = useProjectRegistration(journey)
  const project = journey.project
  const state = statusCopy[registration.status] ?? { title: project?.status ?? 'Chưa có đề cương', detail: 'Trạng thái được backend cung cấp.' }

  if (journey.isLoading) return <div className="mx-auto max-w-4xl animate-pulse"><div className="h-8 w-1/3 rounded bg-slate-200" /><div className="mt-5 h-80 rounded-2xl bg-slate-200" /></div>
  if (journey.error) return <StatusError message={journey.error} onRetry={() => void journey.refreshAll()} />
  if (!project) return <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center"><h1 className="text-xl font-bold text-slate-900">Chưa có đề cương</h1><p className="mt-2 text-sm text-slate-600">Backend chưa trả Project trong phạm vi của nhóm hiện tại.</p><button type="button" onClick={() => navigate('/project/register')} className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white">Tạo bản nháp</button></section>

  return <div className="mx-auto flex max-w-4xl flex-col gap-6 pb-16">
    <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h1 className="text-2xl font-bold text-slate-900">Trạng thái đề cương</h1><p className="mt-1 text-xs text-slate-500">{project.code} · {project.teamName}</p></div><button type="button" onClick={() => void journey.refreshAll()} className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Tải lại dữ liệu backend</button></header>
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5"><p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">{project.status}</p><h2 className="mt-1 text-lg font-bold text-slate-950">{state.title}</h2><p className="mt-1 text-sm text-slate-700">{state.detail}</p>{registration.status === 'DRAFT' && registration.canEdit && <button type="button" onClick={() => navigate('/project/edit')} className="mt-4 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white">Tiếp tục chỉnh sửa</button>}{registration.status === 'REVISIONREQUIRED' && registration.canEdit && <button type="button" onClick={() => navigate('/project/edit')} className="mt-4 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-bold text-white">Xem phản hồi và chỉnh sửa</button>}{registration.status === 'APPROVED' && registration.canContinueToSupervisor && <button type="button" onClick={() => navigate('/project/supervisor')} className="mt-4 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white">Tiếp tục đến Giảng viên hướng dẫn</button>}</section>
    {registration.status === 'REVISIONREQUIRED' && registration.latestRevision && <RevisionAlert reason={registration.latestRevision.reason} reviewerName={registration.latestRevision.changedByName || 'Hệ thống'} timestamp={registration.latestRevision.changedAt} onEdit={() => navigate('/project/edit')} />}
    {registration.error && <StatusError message={registration.error.message} onRetry={() => void registration.loadHistory()} />}
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-base font-bold text-slate-900">Lịch sử trạng thái từ backend</h2>{registration.historyLoading ? <p className="mt-3 text-sm text-slate-500">Đang tải lịch sử…</p> : registration.history.length ? <ol className="mt-4 space-y-3">{registration.history.map((item) => <li key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{item.oldStatus || 'Khởi tạo'} → {item.newStatus}</strong><time className="text-xs text-slate-500">{new Date(item.changedAt).toLocaleString('vi-VN')}</time></div><p className="mt-1 text-xs text-slate-600">{item.changedByName || 'Hệ thống'}{item.reason ? ` · ${item.reason}` : ''}</p></li>)}</ol> : <p className="mt-3 text-sm text-slate-500">Backend chưa trả lịch sử trạng thái.</p>}</section>
  </div>
}

function StatusError({ message, onRetry }: { message: string; onRetry: () => void }) { return <section className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900" role="alert">{message}<button type="button" onClick={onRetry} className="ml-3 font-bold underline">Thử lại</button></section> }
