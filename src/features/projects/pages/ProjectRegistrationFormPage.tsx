import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { RegistrationReadinessChecklist } from '../components/RegistrationReadinessChecklist'
import { RevisionAlert } from '../components/RevisionAlert'
import { normalizeProjectStatus, splitProjectTags, useProjectRegistration, type ProjectRegistrationField } from '../hooks/useProjectRegistration'
import { projectStatusLabel } from '../utils/project-status'
import { PageLoading } from '../../../components/ui/PageLoading'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { Button } from '../../../components/ui/Button'
import { InlineAlert } from '../../../components/ui/InlineAlert'
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
  if (journey.error) return <div className="mx-auto max-w-4xl"><InlineAlert tone="warning" onRetry={() => void journey.refreshAll()}>{journey.error}</InlineAlert></div>

  if (hasProject && !editable && !revision) {
    return (
    <section className="mx-auto max-w-3xl rounded-md border border-slate-200 bg-white p-6 text-center">
        <span className="material-symbols-outlined text-4xl text-blue-600" aria-hidden="true">task_alt</span>
        <h1 className="mt-3 text-xl font-bold text-slate-900">Đề cương đang ở chế độ chỉ xem</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">Hồ sơ đang ở trạng thái <strong>{projectStatusLabel(journey.project?.status ?? '')}</strong> và hiện chưa thể chỉnh sửa.</p>
        <Button className="mt-5" onClick={() => navigate('/project/status')}>Xem trạng thái đề cương</Button>
      </section>
    )
  }

  return (
    <WorkspacePage
      backTo="/project/status"
      eyebrow="Đề tài và đăng ký"
      title={revision ? 'Chỉnh sửa và nộp lại đề cương' : hasProject ? 'Chỉnh sửa đề cương đồ án' : 'Tạo bản nháp đề cương'}
      description={<>Nhóm: <strong className="text-slate-700">{journey.team?.name ?? 'Chưa có nhóm'}</strong>. Hình thức đồ án, ngành và bộ môn được quản lý theo thông tin học vụ.</>}
      action={<Button variant="outline" onClick={() => navigate('/project/status')}>Xem trạng thái</Button>}
      className="space-y-6"
    >
      {!hasProject && !registration.canCreate && <InlineAlert tone="warning" onRetry={() => void journey.refreshAll()}>Chưa thể tạo bản nháp. Nhóm cần đủ điều kiện đăng ký và bạn cần là trưởng nhóm.</InlineAlert>}
      {registeringNewAfterRejection && <InlineAlert tone="danger" title="Đăng ký đề tài mới sau khi đề tài trước bị từ chối.">Biểu mẫu này tạo một bản nháp hoàn toàn mới; đề cương cũ vẫn được giữ trong lịch sử.</InlineAlert>}
      {revision && registration.latestRevision && <RevisionAlert reason={registration.latestRevision.reason} reviewerName={registration.latestRevision.changedByName || 'Hệ thống'} timestamp={registration.latestRevision.changedAt} onEdit={() => {}} />}
      {registrationProject ? <ProjectProvenance project={registrationProject} /> : null}
      <GovernedScope scope={registration.academicScope} requiredMajorIds={registration.requiredMajorIds} />

      <form onSubmit={submit} className="flex flex-col gap-6 rounded-md border border-slate-200 bg-white p-5">
        <p className="text-xs text-slate-500"><span aria-hidden="true">*</span> Trường bắt buộc</p>
        {registration.error?.kind === 'validation' && <ValidationSummary summaryRef={validationSummaryRef} fields={registration.error.fields} message={registration.error.message} />}
        <TextField id="project-title" label="Tên đề tài" value={registration.form.title} required disabled={!editable} error={registration.error?.fields?.title} onChange={(value) => registration.setField('title', value)} />
        {editable && <div>
          <Button variant="secondary" size="sm" onClick={() => void checkSimilarity()} disabled={!registration.form.title.trim() || similarityLoading}>
            {similarityLoading ? 'Đang kiểm tra…' : 'Kiểm tra trùng đề tài'}
          </Button>
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
        {registration.error && registration.error.kind !== 'validation' && <InlineAlert tone={registration.error.kind === 'forbidden' ? 'warning' : 'danger'} onRetry={registration.error.kind === 'system' ? () => void journey.refreshAll() : undefined}>{registration.error.message}</InlineAlert>}
        {hasProject && <RegistrationReadinessChecklist reasons={registration.submitReasons} />}
        <footer className="flex flex-col justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
          <Button variant="secondary" onClick={() => void save()} disabled={!registration.canEdit || registration.creating || registration.saving || submitting}>
            {registration.creating ? 'Đang tạo nháp...' : registration.saving ? 'Đang lưu...' : hasProject ? 'Lưu thay đổi' : 'Tạo bản nháp'}
          </Button>
          {hasProject ? <Button type="submit" disabled={submitting || registration.saving || (revision ? !registration.canResubmit : !registration.canSubmit)}>{registration.submitting ? 'Đang nộp...' : registration.resubmitting ? 'Đang nộp lại...' : revision ? 'Nộp lại sau chỉnh sửa' : 'Nộp đề cương'}</Button> : <p className="text-xs text-slate-500">Sau khi tạo bản nháp thành công, bạn có thể rà soát và nộp bằng thao tác riêng.</p>}
        </footer>
      </form>
    </WorkspacePage>
  )
}

function ProjectProvenance({ project }: { project: NonNullable<ReturnType<typeof useStudentJourney>['project']> }) {
  const source = project.proposalSource ?? 'STUDENT_PROPOSAL'
  return <section className="rounded-md border border-status-success-border bg-status-success-bg p-5 text-sm text-status-success-text"><p className="text-xs font-bold uppercase tracking-wider">Nguồn đề tài</p>{source === 'PUBLISHED_TOPIC' ? <p className="mt-2 text-xs"><strong>Đề tài đã công bố</strong> · {project.selectedTopic ? `${project.selectedTopic.code} · ${project.selectedTopic.title}` : 'Chưa tải được thông tin chi tiết của đề tài đã chọn.'}</p> : <p className="mt-2 text-xs"><strong>Đề xuất của sinh viên</strong> · Hồ sơ này được khởi tạo từ đề xuất của nhóm.</p>}<p className="mt-2 text-xs">Nội dung đề cương được nhóm rà soát và cập nhật riêng trong biểu mẫu này.</p></section>
}

function GovernedScope({ scope }: { scope: ReturnType<typeof useProjectRegistration>['academicScope']; requiredMajorIds: number[] }) {
  const modeLabel = scope?.projectMode === 'INTERDISCIPLINARY' ? 'Liên ngành' : 'Đơn ngành'
  return <section className="rounded-md border border-slate-200 bg-slate-50 p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Phạm vi đăng ký</p>{scope ? <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3"><p><strong>Hình thức:</strong> {modeLabel}</p><p><strong>Bộ môn phụ trách:</strong> Mã tham chiếu #{scope.leadDepartmentId}</p><p><strong>Ngành chính:</strong> {scope.primaryMajorId ? `Mã tham chiếu #${scope.primaryMajorId}` : 'Không áp dụng'}</p><p className="sm:col-span-3"><strong>Ngành tham gia:</strong> {scope.requirements.map((item) => `Ngành #${item.majorId} (${item.minMembers}–${item.maxMembers} thành viên)`).join(' · ') || 'Chưa có thông tin ngành tham gia'}</p></div> : <p className="mt-2 text-xs text-slate-600">Chưa tải được phạm vi đăng ký của nhóm. Thông tin này được xác định trong quá trình lập nhóm.</p>}</section>
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
