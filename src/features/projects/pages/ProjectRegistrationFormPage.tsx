import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { RegistrationAcademicScope } from '../components/RegistrationAcademicScope'
import { RegistrationReadinessChecklist } from '../components/RegistrationReadinessChecklist'
import { RevisionAlert } from '../components/RevisionAlert'
import { normalizeProjectStatus, splitProjectTags, useProjectRegistration, type ProjectRegistrationField } from '../hooks/useProjectRegistration'
import { projectStatusLabel } from '../utils/project-status'
import { PageLoading } from '../../../components/ui/PageLoading'
import { services } from '../../../services/service-gateway'
import type { TopicSimilarityResultDto } from '../../../types/backend'

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
  const [similarity, setSimilarity] = useState<{ title: string; result: TopicSimilarityResultDto } | null>(null)
  const [similarityLoading, setSimilarityLoading] = useState(false)
  // A result only applies to the title it was computed for — once the title changes again,
  // it's stale and hidden without needing a separate effect to clear it out.
  const currentSimilarity = similarity?.title === registration.form.title.trim() ? similarity.result : null

  useEffect(() => {
    if (registration.error?.kind === 'validation') validationSummaryRef.current?.focus()
  }, [registration.error])

  const checkSimilarity = async () => {
    const title = registration.form.title.trim()
    if (!title) return
    setSimilarityLoading(true)
    try {
      const result = await services.topic.getTopicSimilarity({
        title, keywords: splitProjectTags(registration.form.keywords),
        leadDepartmentId: registration.academicScope?.leadDepartmentId,
      })
      setSimilarity({ title, result })
    } catch { setSimilarity(null) }
    finally { setSimilarityLoading(false) }
  }

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
      {registeringNewAfterRejection && <section className="rounded-md border border-status-error-border bg-status-error-bg p-4 text-xs text-status-error-text"><strong>Đăng ký đề tài mới sau khi đề tài trước bị từ chối.</strong><p className="mt-1">Biểu mẫu này tạo một bản nháp hoàn toàn mới; đề cương cũ vẫn được giữ trong lịch sử.</p></section>}
      {revision && registration.latestRevision && <RevisionAlert reason={registration.latestRevision.reason} reviewerName={registration.latestRevision.changedByName || 'Hệ thống'} timestamp={registration.latestRevision.changedAt} onEdit={() => {}} />}
      {registrationProject ? <ProjectProvenance project={registrationProject} /> : null}
      <RegistrationAcademicScope scope={registration.academicScope} organizationId={journey.semester?.organizationId} />

      <form onSubmit={submit} className="flex flex-col gap-6 rounded-md border border-slate-200 bg-white p-5">
        <p className="text-xs text-slate-500"><span aria-hidden="true">*</span> Trường bắt buộc</p>
        {registration.error?.kind === 'validation' && <ValidationSummary summaryRef={validationSummaryRef} fields={registration.error.fields} message={registration.error.message} />}
        <TextField id="project-title" label="Tên đề tài" value={registration.form.title} required disabled={!editable} error={registration.error?.fields?.title} onChange={(value) => registration.setField('title', value)} />
        {editable && <div>
          <button type="button" onClick={() => void checkSimilarity()} disabled={!registration.form.title.trim() || similarityLoading} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            {similarityLoading ? 'Đang kiểm tra…' : 'Kiểm tra trùng đề tài'}
          </button>
          <SimilarityResult result={currentSimilarity} />
        </div>}
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
        {hasProject && <RegistrationReadinessChecklist reasons={registration.submitReasons} />}
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
  return <section className="rounded-md border border-status-success-border bg-status-success-bg p-5 text-sm text-status-success-text"><p className="text-xs font-bold uppercase tracking-wider">Nguồn đề tài</p>{source === 'PUBLISHED_TOPIC' ? <p className="mt-2 text-xs"><strong>Đề tài đã công bố</strong> · {project.selectedTopic ? `${project.selectedTopic.code} · ${project.selectedTopic.title}` : 'Chưa tải được thông tin chi tiết của đề tài đã chọn.'}</p> : <p className="mt-2 text-xs"><strong>Đề xuất của sinh viên</strong> · Hồ sơ này được khởi tạo từ đề xuất của nhóm.</p>}<p className="mt-2 text-xs">Nội dung đề cương được nhóm rà soát và cập nhật riêng trong biểu mẫu này.</p></section>
}

/** Soft, client-side pre-check only — the backend is the sole enforcer (422
 * DUPLICATE_TOPIC_TITLE on submit). An exact match is called out as a strong warning;
 * near matches are informational so the student can judge for themselves. */
function SimilarityResult({ result }: { result: TopicSimilarityResultDto | null }) {
  if (!result || (!result.exactMatch && result.similar.length === 0)) return null
  return <div className="mt-2 space-y-2">
    {result.exactMatch && <p role="alert" className="rounded-md border border-status-error-border bg-status-error-bg p-3 text-xs text-status-error-text">
      Tên đề tài trùng với đề tài đã có: <strong>{result.exactMatch.title}</strong>. Hệ thống sẽ từ chối khi nộp nếu không đổi tên.
    </p>}
    {result.similar.length > 0 && <div className="rounded-md border border-status-warning-border bg-status-warning-bg p-3 text-xs text-status-warning-text">
      <p className="font-semibold">Có thể gần giống các đề tài sau:</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4">
        {result.similar.map((item) => <li key={item.id}>{item.title} · kỳ {item.semesterCode} · giống {Math.round(item.score * 100)}%</li>)}
      </ul>
    </div>}
  </div>
}

function TextField({ id, label, hint, value, required, disabled, error, onChange }: { id: string; label: string; hint?: string; value: string; required?: boolean; disabled: boolean; error?: string; onChange: (value: string) => void }) { const helpId = `${id}-help`; return <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-slate-700">{label}{required ? <span aria-hidden="true"> *</span> : ''}<input id={id} value={value} disabled={disabled} aria-invalid={Boolean(error)} aria-describedby={hint || error ? helpId : undefined} onChange={(event) => onChange(event.target.value)} className={`mt-1.5 w-full rounded-md border px-3.5 py-2.5 text-sm normal-case tracking-normal disabled:bg-slate-100 ${error ? 'border-rose-600' : 'border-slate-300'}`} />{error ? <span id={helpId} className="mt-1 block text-xs font-medium normal-case tracking-normal text-rose-700">{error}</span> : hint ? <span id={helpId} className="mt-1 block text-xs font-normal normal-case tracking-normal text-slate-500">{hint}</span> : null}</label> }
function TextArea({ id, label, value, disabled, onChange }: { id: string; label: string; value: string; disabled: boolean; onChange: (value: string) => void }) { return <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-slate-700">{label}<textarea id={id} value={value} disabled={disabled} rows={3} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 px-3.5 py-2.5 text-sm normal-case tracking-normal disabled:bg-slate-100" /></label> }
function ValidationSummary({ fields = {}, message, summaryRef }: { fields?: Partial<Record<ProjectRegistrationField, string>>; message: string; summaryRef: RefObject<HTMLDivElement | null> }) {
  const labels: Record<ProjectRegistrationField, string> = {
    title: 'Tên đề tài', domain: 'Lĩnh vực', technologies: 'Công nghệ', keywords: 'Từ khóa',
  }
  return <div ref={summaryRef} role="alert" tabIndex={-1} className="rounded-md border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">
    <p className="font-bold">{message}</p>
    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
      {Object.entries(fields).map(([field, detail]) => <li key={field}><a className="underline underline-offset-2" href={`#project-${field}`}>{labels[field as ProjectRegistrationField]}: {detail}</a></li>)}
    </ul>
  </div>
}
function LoadingState() { return <div className="mx-auto max-w-4xl"><PageLoading label="Đang tải biểu mẫu đề cương…" /></div> }
function FailureState({ message, onRetry }: { message: string; onRetry: () => void }) { return <section className="rounded-md border border-status-warning-border bg-status-warning-bg p-5 text-sm text-status-warning-text" role="alert"><p>{message}</p><button type="button" onClick={onRetry} className="mt-3 rounded-md border border-status-warning-border bg-white px-3 py-1.5 text-xs font-bold">Tải lại</button></section> }
function ErrorMessage({ kind: _kind, message, onRetry }: { kind: string; message: string; onRetry?: () => void }) {
  const needsEligibility = message.includes('kiểm tra điều kiện còn hiệu lực')
  return <div className="rounded-md border border-status-error-border bg-status-error-bg p-3 text-xs text-status-error-text" role="alert">
    <span>{message}</span>
    {needsEligibility && <Link to="/team" className="ml-2 inline-block font-bold underline">Mở kiểm tra điều kiện nhóm</Link>}
    {onRetry && <button type="button" onClick={onRetry} className="ml-2 font-bold underline">Thử lại</button>}
  </div>
}
