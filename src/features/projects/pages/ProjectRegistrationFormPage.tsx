import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { RevisionAlert } from '../components/RevisionAlert'
import { normalizeProjectStatus, useProjectRegistration } from '../hooks/useProjectRegistration'

export function ProjectRegistrationFormPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const journey = useStudentJourney()
  const registeringNewAfterRejection = normalizeProjectStatus(journey.project?.status) === 'REJECTED'
    && location.pathname.includes('/project/register')
  const registrationProject = registeringNewAfterRejection ? null : journey.project
  const registration = useProjectRegistration({
    ...journey,
    project: registrationProject,
    projectActions: registeringNewAfterRejection ? null : journey.projectActions,
  })
  const hasProject = Boolean(registrationProject)
  const revision = registration.status === 'REVISIONREQUIRED'
  const editable = !hasProject || registration.canEdit
  const submitting = registration.submitting || registration.resubmitting

  const save = async () => {
    const saved = await registration.saveDraft()
    if (saved && !hasProject) navigate('/project/edit', { replace: true })
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const result = revision ? await registration.resubmit() : await registration.submit()
    if (result) navigate('/project/status')
  }

  if (journey.isLoading) return <LoadingState />
  if (journey.error) return <FailureState message={journey.error} onRetry={() => void journey.refreshAll()} />

  if (hasProject && !editable && !revision) {
    return (
      <section className="mx-auto max-w-3xl rounded-2xl border border-blue-200 bg-white p-8 text-center shadow-xs">
        <span className="material-symbols-outlined text-4xl text-blue-600" aria-hidden="true">task_alt</span>
        <h1 className="mt-3 text-xl font-bold text-slate-900">Đề cương đang ở chế độ chỉ xem</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">Backend đang báo trạng thái <strong>{journey.project?.status}</strong> và không cấp action chỉnh sửa cho bạn.</p>
        <button type="button" onClick={() => navigate('/project/status')} className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700">Xem trạng thái đề cương</button>
      </section>
    )
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 pb-16">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <button type="button" onClick={() => navigate(-1)} className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Quay lại
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{revision ? 'Chỉnh sửa và nộp lại đề cương' : hasProject ? 'Chỉnh sửa đề cương đồ án' : 'Tạo bản nháp đề cương'}</h1>
          <p className="mt-1 text-xs text-slate-500">Nhóm: <strong className="text-slate-700">{journey.team?.name ?? 'Chưa có nhóm'}</strong>. Project Mode, Major và Department được backend quản trị.</p>
        </div>
        <button type="button" onClick={() => navigate('/project/status')} className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Xem trạng thái</button>
      </header>

      {!hasProject && !registration.canCreate && <FailureState message="Chưa thể tạo bản nháp: backend yêu cầu eligibility PASS và action create_project_draft cho Trưởng nhóm." onRetry={() => void journey.refreshAll()} />}
      {registeringNewAfterRejection && <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800"><strong>Đăng ký đề tài mới sau khi đề tài trước bị từ chối.</strong><p className="mt-1">Biểu mẫu này tạo một bản nháp hoàn toàn mới; đề cương cũ vẫn được giữ trong lịch sử.</p></section>}
      {revision && registration.latestRevision && <RevisionAlert reason={registration.latestRevision.reason} reviewerName={registration.latestRevision.changedByName || 'Hệ thống'} timestamp={registration.latestRevision.changedAt} onEdit={() => {}} />}
      <GovernedScope scope={registration.academicScope} requiredMajorIds={registration.requiredMajorIds} />

      <form onSubmit={submit} className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <TextField id="project-title" label="Tên đề tài" value={registration.form.title} required disabled={!editable} onChange={(value) => registration.setField('title', value)} />
        <TextArea id="project-description" label="Mô tả ngắn" value={registration.form.description} disabled={!editable} onChange={(value) => registration.setField('description', value)} />
        <TextArea id="project-problem" label="Bối cảnh và vấn đề cần giải quyết" value={registration.form.problemStatement} required disabled={!editable} onChange={(value) => registration.setField('problemStatement', value)} />
        <TextArea id="project-objectives" label="Mục tiêu đề tài" value={registration.form.objectives} required disabled={!editable} onChange={(value) => registration.setField('objectives', value)} />
        <TextArea id="project-output" label="Sản phẩm kỳ vọng" value={registration.form.expectedOutput} required disabled={!editable} onChange={(value) => registration.setField('expectedOutput', value)} />
        <div className="grid gap-4 md:grid-cols-3">
          <TextField id="project-domain" label="Lĩnh vực (Domain)" value={registration.form.domain} required disabled={!editable} onChange={(value) => registration.setField('domain', value)} />
          <TextField id="project-technologies" label="Công nghệ (phân cách bằng dấu phẩy)" value={registration.form.technologies} disabled={!editable} onChange={(value) => registration.setField('technologies', value)} />
          <TextField id="project-keywords" label="Từ khóa (phân cách bằng dấu phẩy)" value={registration.form.keywords} disabled={!editable} onChange={(value) => registration.setField('keywords', value)} />
        </div>
        {registration.error && <ErrorMessage kind={registration.error.kind} message={registration.error.message} onRetry={registration.error.kind === 'system' ? () => void journey.refreshAll() : undefined} />}
        <footer className="flex flex-col justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
          <button type="button" onClick={() => void save()} disabled={!registration.canEdit || registration.creating || registration.saving || submitting} className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            {registration.creating ? 'Đang tạo nháp...' : registration.saving ? 'Đang lưu...' : hasProject ? 'Lưu thay đổi' : 'Tạo bản nháp'}
          </button>
          {hasProject ? <button type="submit" disabled={submitting || registration.saving || (revision ? !registration.canResubmit : !registration.canSubmit)} className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">{registration.submitting ? 'Đang nộp...' : registration.resubmitting ? 'Đang nộp lại...' : revision ? 'Nộp lại sau chỉnh sửa' : 'Nộp đề cương'}</button> : <p className="text-xs text-slate-500">Sau khi tạo bản nháp thành công, bạn có thể rà soát và nộp bằng thao tác riêng.</p>}
        </footer>
      </form>
    </div>
  )
}

function GovernedScope({ scope, requiredMajorIds }: { scope: ReturnType<typeof useProjectRegistration>['academicScope']; requiredMajorIds: number[] }) {
  return <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Phạm vi học thuật do backend quản trị</p>{scope ? <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3"><p><strong>Project Mode:</strong> {scope.projectMode}</p><p><strong>Lead Department:</strong> #{scope.leadDepartmentId}</p><p><strong>Primary Major:</strong> {scope.primaryMajorId ? `#${scope.primaryMajorId}` : 'Không áp dụng'}</p><p className="sm:col-span-3"><strong>Major requirements:</strong> {scope.requirements.map((item) => `#${item.majorId} (min ${item.minMembers}, max ${item.maxMembers})`).join(' · ') || 'Backend chưa trả requirement'}</p></div> : <p className="mt-2 text-xs text-slate-600">Backend chưa trả Academic Scope trên Team/Project. Form không cho phép nhập Project Mode, Major hoặc Department tự do.</p>}<p className="mt-3 text-[11px] text-slate-500">Required Major IDs gửi theo dữ liệu backend: {requiredMajorIds.length ? requiredMajorIds.join(', ') : 'không có dữ liệu để suy diễn'}.</p></section>
}

function TextField({ id, label, value, required, disabled, onChange }: { id: string; label: string; value: string; required?: boolean; disabled: boolean; onChange: (value: string) => void }) { return <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-slate-700">{label}{required ? ' *' : ''}<input id={id} value={value} required={required} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm normal-case tracking-normal disabled:bg-slate-100" /></label> }
function TextArea({ id, label, value, required, disabled, onChange }: { id: string; label: string; value: string; required?: boolean; disabled: boolean; onChange: (value: string) => void }) { return <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-slate-700">{label}{required ? ' *' : ''}<textarea id={id} value={value} required={required} disabled={disabled} rows={3} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm normal-case tracking-normal disabled:bg-slate-100" /></label> }
function LoadingState() { return <div className="mx-auto flex max-w-4xl flex-col gap-5 animate-pulse"><div className="h-8 w-1/3 rounded bg-slate-200" /><div className="h-96 rounded-2xl bg-slate-200" /></div> }
function FailureState({ message, onRetry }: { message: string; onRetry: () => void }) { return <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950" role="alert"><p>{message}</p><button type="button" onClick={onRetry} className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold">Tải lại</button></section> }
function ErrorMessage({ kind, message, onRetry }: { kind: string; message: string; onRetry?: () => void }) { return <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800" role="alert"><strong>{kind.toUpperCase()}:</strong> {message}{onRetry && <button type="button" onClick={onRetry} className="ml-2 font-bold underline">Thử lại</button>}</div> }
