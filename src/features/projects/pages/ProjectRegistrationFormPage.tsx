import { useEffect, useRef, type FormEvent, type RefObject } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { RevisionAlert } from '../components/RevisionAlert'
import { normalizeProjectStatus, useProjectRegistration, type ProjectRegistrationField } from '../hooks/useProjectRegistration'
import { projectStatusLabel } from '../utils/project-status'

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
  const validationSummaryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (registration.error?.kind === 'validation') validationSummaryRef.current?.focus()
  }, [registration.error])

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
    <section className="mx-auto max-w-3xl rounded-md border border-slate-200 bg-white p-6 text-center">
        <span className="material-symbols-outlined text-4xl text-blue-600" aria-hidden="true">task_alt</span>
        <h1 className="mt-3 text-xl font-bold text-slate-900">Đề cương đang ở chế độ chỉ xem</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">Hồ sơ đang ở trạng thái <strong>{projectStatusLabel(journey.project?.status ?? '')}</strong> và hiện chưa thể chỉnh sửa.</p>
        <button type="button" onClick={() => navigate('/project/status')} className="mt-5 rounded-md bg-primary px-5 py-2.5 text-xs font-bold text-white hover:bg-primary/90">Xem trạng thái đề cương</button>
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
          <p className="mt-1 text-xs text-slate-500">Nhóm: <strong className="text-slate-700">{journey.team?.name ?? 'Chưa có nhóm'}</strong>. Hình thức đồ án, ngành và bộ môn được quản lý theo thông tin học vụ.</p>
        </div>
        <button type="button" onClick={() => navigate('/project/status')} className="rounded-md border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Xem trạng thái</button>
      </header>

      {!hasProject && !registration.canCreate && <FailureState message="Chưa thể tạo bản nháp. Nhóm cần đủ điều kiện đăng ký và bạn cần là trưởng nhóm." onRetry={() => void journey.refreshAll()} />}
      {registeringNewAfterRejection && <section className="rounded-md border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800"><strong>Đăng ký đề tài mới sau khi đề tài trước bị từ chối.</strong><p className="mt-1">Biểu mẫu này tạo một bản nháp hoàn toàn mới; đề cương cũ vẫn được giữ trong lịch sử.</p></section>}
      {revision && registration.latestRevision && <RevisionAlert reason={registration.latestRevision.reason} reviewerName={registration.latestRevision.changedByName || 'Hệ thống'} timestamp={registration.latestRevision.changedAt} onEdit={() => {}} />}
      {registrationProject ? <ProjectProvenance project={registrationProject} /> : null}
      <GovernedScope scope={registration.academicScope} requiredMajorIds={registration.requiredMajorIds} />

      <form onSubmit={submit} className="flex flex-col gap-6 rounded-md border border-slate-200 bg-white p-5">
        <p className="text-xs text-slate-500"><span aria-hidden="true">*</span> Trường bắt buộc</p>
        {registration.error?.kind === 'validation' && <ValidationSummary summaryRef={validationSummaryRef} fields={registration.error.fields} message={registration.error.message} />}
        <TextField id="project-title" label="Tên đề tài" value={registration.form.title} required disabled={!editable} error={registration.error?.fields?.title} onChange={(value) => registration.setField('title', value)} />
        <TextArea id="project-description" label="Mô tả ngắn" value={registration.form.description} disabled={!editable} onChange={(value) => registration.setField('description', value)} />
        <TextArea id="project-problem" label="Bối cảnh và vấn đề cần giải quyết" value={registration.form.problemStatement} disabled={!editable} onChange={(value) => registration.setField('problemStatement', value)} />
        <TextArea id="project-objectives" label="Mục tiêu đề tài" value={registration.form.objectives} disabled={!editable} onChange={(value) => registration.setField('objectives', value)} />
        <TextArea id="project-output" label="Sản phẩm kỳ vọng" value={registration.form.expectedOutput} disabled={!editable} onChange={(value) => registration.setField('expectedOutput', value)} />
        <div className="grid gap-4 md:grid-cols-3">
          <TextField id="project-domain" label="Lĩnh vực" value={registration.form.domain} required disabled={!editable} error={registration.error?.fields?.domain} onChange={(value) => registration.setField('domain', value)} />
          <TextField id="project-technologies" label="Công nghệ" hint="Phân cách bằng dấu phẩy" value={registration.form.technologies} disabled={!editable} error={registration.error?.fields?.technologies} onChange={(value) => registration.setField('technologies', value)} />
          <TextField id="project-keywords" label="Từ khóa" hint="Phân cách bằng dấu phẩy" value={registration.form.keywords} disabled={!editable} error={registration.error?.fields?.keywords} onChange={(value) => registration.setField('keywords', value)} />
        </div>
        {registration.error && registration.error.kind !== 'validation' && <ErrorMessage kind={registration.error.kind} message={registration.error.message} onRetry={registration.error.kind === 'system' ? () => void journey.refreshAll() : undefined} />}
        <footer className="flex flex-col justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
          <button type="button" onClick={() => void save()} disabled={!registration.canEdit || registration.creating || registration.saving || submitting} className="rounded-md border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            {registration.creating ? 'Đang tạo nháp...' : registration.saving ? 'Đang lưu...' : hasProject ? 'Lưu thay đổi' : 'Tạo bản nháp'}
          </button>
          {hasProject ? <button type="submit" disabled={submitting || registration.saving || (revision ? !registration.canResubmit : !registration.canSubmit)} className="rounded-md bg-primary px-5 py-2.5 text-xs font-bold text-white hover:bg-primary/90 disabled:opacity-50">{registration.submitting ? 'Đang nộp...' : registration.resubmitting ? 'Đang nộp lại...' : revision ? 'Nộp lại sau chỉnh sửa' : 'Nộp đề cương'}</button> : <p className="text-xs text-slate-500">Sau khi tạo bản nháp thành công, bạn có thể rà soát và nộp bằng thao tác riêng.</p>}
        </footer>
      </form>
    </div>
  )
}

function ProjectProvenance({ project }: { project: NonNullable<ReturnType<typeof useStudentJourney>['project']> }) {
  const source = project.proposalSource ?? 'STUDENT_PROPOSAL'
  return <section className="rounded-md border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950"><p className="text-[11px] font-bold uppercase tracking-wider">Nguồn đề tài</p>{source === 'PUBLISHED_TOPIC' ? <p className="mt-2 text-xs"><strong>Đề tài đã công bố</strong> · {project.selectedTopic ? `${project.selectedTopic.code} · ${project.selectedTopic.title}` : 'Chưa tải được thông tin chi tiết của đề tài đã chọn.'}</p> : <p className="mt-2 text-xs"><strong>Đề xuất của sinh viên</strong> · Hồ sơ này được khởi tạo từ đề xuất của nhóm.</p>}<p className="mt-2 text-[11px]">Nội dung đề cương được nhóm rà soát và cập nhật riêng trong biểu mẫu này.</p></section>
}

function GovernedScope({ scope }: { scope: ReturnType<typeof useProjectRegistration>['academicScope']; requiredMajorIds: number[] }) {
  const modeLabel = scope?.projectMode === 'INTERDISCIPLINARY' ? 'Liên ngành' : 'Đơn ngành'
  return <section className="rounded-md border border-slate-200 bg-slate-50 p-5"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Phạm vi đăng ký</p>{scope ? <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3"><p><strong>Hình thức:</strong> {modeLabel}</p><p><strong>Bộ môn phụ trách:</strong> Mã tham chiếu #{scope.leadDepartmentId}</p><p><strong>Ngành chính:</strong> {scope.primaryMajorId ? `Mã tham chiếu #${scope.primaryMajorId}` : 'Không áp dụng'}</p><p className="sm:col-span-3"><strong>Ngành tham gia:</strong> {scope.requirements.map((item) => `Ngành #${item.majorId} (${item.minMembers}–${item.maxMembers} thành viên)`).join(' · ') || 'Chưa có thông tin ngành tham gia'}</p></div> : <p className="mt-2 text-xs text-slate-600">Chưa tải được phạm vi đăng ký của nhóm. Thông tin này được xác định trong quá trình lập nhóm.</p>}</section>
}

function TextField({ id, label, hint, value, required, disabled, error, onChange }: { id: string; label: string; hint?: string; value: string; required?: boolean; disabled: boolean; error?: string; onChange: (value: string) => void }) { const helpId = `${id}-help`; return <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-slate-700">{label}{required ? <span aria-hidden="true"> *</span> : ''}<input id={id} value={value} disabled={disabled} aria-invalid={Boolean(error)} aria-describedby={hint || error ? helpId : undefined} onChange={(event) => onChange(event.target.value)} className={`mt-1.5 w-full rounded-md border px-3.5 py-2.5 text-sm normal-case tracking-normal disabled:bg-slate-100 ${error ? 'border-rose-600' : 'border-slate-300'}`} />{error ? <span id={helpId} className="mt-1 block text-xs font-medium normal-case tracking-normal text-rose-700">{error}</span> : hint ? <span id={helpId} className="mt-1 block text-xs font-normal normal-case tracking-normal text-slate-500">{hint}</span> : null}</label> }
function TextArea({ id, label, value, disabled, onChange }: { id: string; label: string; value: string; disabled: boolean; onChange: (value: string) => void }) { return <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-slate-700">{label}<textarea id={id} value={value} disabled={disabled} rows={3} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 px-3.5 py-2.5 text-sm normal-case tracking-normal disabled:bg-slate-100" /></label> }
function ValidationSummary({ fields = {}, message, summaryRef }: { fields?: Partial<Record<ProjectRegistrationField, string>>; message: string; summaryRef: RefObject<HTMLDivElement | null> }) {
  const labels: Record<ProjectRegistrationField, string> = {
    title: 'Tên đề tài', domain: 'Lĩnh vực', technologies: 'Công nghệ', keywords: 'Từ khóa',
  }
  return <div ref={summaryRef} role="alert" tabIndex={-1} className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
    <p className="font-bold">{message}</p>
    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
      {Object.entries(fields).map(([field, detail]) => <li key={field}><a className="underline underline-offset-2" href={`#project-${field}`}>{labels[field as ProjectRegistrationField]}: {detail}</a></li>)}
    </ul>
  </div>
}
function LoadingState() { return <div className="mx-auto flex max-w-4xl flex-col gap-5 animate-pulse"><div className="h-8 w-1/3 rounded-md bg-slate-200" /><div className="h-96 rounded-md bg-slate-200" /></div> }
function FailureState({ message, onRetry }: { message: string; onRetry: () => void }) { return <section className="rounded-md border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950" role="alert"><p>{message}</p><button type="button" onClick={onRetry} className="mt-3 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold">Tải lại</button></section> }
function ErrorMessage({ kind: _kind, message, onRetry }: { kind: string; message: string; onRetry?: () => void }) { return <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800" role="alert">{message}{onRetry && <button type="button" onClick={onRetry} className="ml-2 font-bold underline">Thử lại</button>}</div> }
