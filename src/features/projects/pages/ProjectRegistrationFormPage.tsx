import { useEffect, useMemo, useRef, useState, type FormEvent, type RefObject } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { RegistrationAcademicScope } from '../components/RegistrationAcademicScope'
import { RegistrationReadinessChecklist } from '../components/RegistrationReadinessChecklist'
import { RevisionAlert } from '../components/RevisionAlert'
import { normalizeProjectStatus, splitProjectTags, toProjectForm, useProjectRegistration, type ProjectRegistrationField } from '../hooks/useProjectRegistration'
import { projectStatusLabel } from '../utils/project-status'
import { PageLoading } from '../../../components/ui/PageLoading'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { services } from '../../../services/service-gateway'
import type { TopicSimilarityResultDto } from '../../../types/backend'
import { AiTopicSimilarityCheck } from '../components/AiTopicSimilarityCheck'

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
  const [deselectingTopic, setDeselectingTopic] = useState(false)
  const [deselectError, setDeselectError] = useState<string | null>(null)
  const isPublishedTopic = registrationProject?.proposalSource === 'PUBLISHED_TOPIC'
  const isInterdisciplinaryScope = registration.academicScope?.projectMode === 'INTERDISCIPLINARY'
  const hasMarketingScope = Boolean(
    isInterdisciplinaryScope
    || registrationProject?.majors?.some((m) => m.majorCode.toUpperCase().includes('MKT') || m.majorName.toLowerCase().includes('marketing')),
  )
  // A result only applies to the title it was computed for — once the title changes again,
  // it's stale and hidden without needing a separate effect to clear it out.
  const currentSimilarity = similarity?.title === registration.form.title.trim() ? similarity.result : null

  const handleDeselectTopic = async () => {
    if (!registrationProject || !editable || !isPublishedTopic) return
    setDeselectError(null)
    setDeselectingTopic(true)
    try {
      await services.project.deselectTopic(registrationProject.id, registrationProject.concurrencyToken)
      await journey.refreshAll()
    } catch (reason) {
      setDeselectError(reason instanceof Error ? reason.message : 'Không thể hủy chọn đề tài lúc này.')
    } finally {
      setDeselectingTopic(false)
    }
  }

  const baselineForm = useMemo(() => toProjectForm(registrationProject), [registrationProject])
  const isDirty = useMemo(
    () => editable && JSON.stringify(registration.form) !== JSON.stringify(baselineForm),
    [baselineForm, editable, registration.form],
  )

  useEffect(() => {
    if (!isDirty && !registration.saving && !registration.creating && !submitting) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [isDirty, registration.creating, registration.saving, submitting])

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
      <WorkspacePage
        size="standard"
        eyebrow="Đăng ký đề cương đồ án"
        title="Đề cương đang ở chế độ chỉ xem"
        backTo="/project/overview"
      >
        <section className="mx-auto max-w-3xl rounded-xl border border-hairline bg-card p-6 text-center shadow-xs">
          <span className="material-symbols-outlined text-4xl text-primary" aria-hidden="true">task_alt</span>
          <h2 className="mt-3 font-heading text-xl font-bold text-ink">Hồ sơ đã khóa chỉnh sửa</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-muted">Hồ sơ đang ở trạng thái <strong>{projectStatusLabel(journey.project?.status ?? '')}</strong> và hiện chưa thể chỉnh sửa.</p>
          <button type="button" onClick={() => navigate('/project/status')} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary-hover">Xem trạng thái đề cương</button>
        </section>
      </WorkspacePage>
    )
  }

  const aiScopeKey = JSON.stringify([
    journey.profile?.id ?? null,
    journey.team?.id ?? null,
    registrationProject?.id ?? null,
    registration.academicScope?.leadDepartmentId ?? null,
    registration.academicScope?.projectMode ?? null,
  ])

  return (
    <WorkspacePage
      size="wide"
      eyebrow="Đăng ký đề cương đồ án"
      title={revision ? 'Chỉnh sửa và nộp lại đề cương' : hasProject ? 'Chỉnh sửa đề cương đồ án' : 'Tạo bản nháp đề cương'}
      description={`Nhóm: ${journey.team?.name ?? 'Chưa có nhóm'}. Hình thức đồ án, ngành và bộ môn được quản lý theo thông tin học vụ.`}
      backTo="/project/overview"
      action={
        <div className="flex flex-wrap items-center gap-2">
          {isDirty && <StatusBadge tone="warning" label="Có thay đổi chưa lưu" />}
          <button type="button" onClick={() => navigate('/project/status')} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-hairline bg-card px-3.5 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary">Xem trạng thái</button>
        </div>
      }
      className="pb-16"
    >
      <div className="flex flex-col gap-6">

      {!hasProject && !registration.canCreate && <FailureState message="Chưa thể tạo bản nháp. Nhóm cần đủ điều kiện đăng ký và bạn cần là trưởng nhóm." onRetry={() => void journey.refreshAll()} />}
      {registeringNewAfterRejection && <section className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-xs text-status-error-text"><strong>Đăng ký đề tài mới sau khi đề tài trước bị từ chối.</strong><p className="mt-1">Biểu mẫu này tạo một bản nháp hoàn toàn mới; đề cương cũ vẫn được giữ trong lịch sử.</p></section>}
      {revision && registration.latestRevision && <RevisionAlert reason={registration.latestRevision.reason} reviewerName={registration.latestRevision.changedByName || 'Hệ thống'} timestamp={registration.latestRevision.changedAt} />}
      {registrationProject ? (
        <ProjectProvenance
          project={registrationProject}
          canDeselect={editable && isPublishedTopic}
          deselecting={deselectingTopic}
          deselectError={deselectError}
          onDeselect={() => void handleDeselectTopic()}
        />
      ) : null}
      <RegistrationAcademicScope scope={registration.academicScope} organizationId={journey.semester?.organizationId} />
      {(isInterdisciplinaryScope || hasMarketingScope) && (
        <section className="rounded-xl border border-hairline border-l-4 border-l-primary bg-card p-4 text-xs text-ink-soft shadow-xs space-y-1.5">
          <p className="font-bold uppercase tracking-wider text-primary">Lưu ý quy chuẩn học vụ (POL-04 &amp; POL-05)</p>
          {isInterdisciplinaryScope && (
            <p>
              <strong>Tích hợp liên ngành (POL-05 / INT-*):</strong> Nhóm liên ngành IT × MKT cần mô tả rõ hạng mục tích hợp giữa sản phẩm kỹ thuật và chiến dịch/phân tích Marketing (ví dụ <code>INT-1</code> Tracking/Analytics, <code>INT-2</code> Conversion Funnel) trong mục <em>Sản phẩm kỳ vọng</em>.
            </p>
          )}
          {hasMarketingScope && (
            <p>
              <strong>Giới hạn ghi nhận dữ liệu (POL-04 / Attribution Limits):</strong> Không yêu cầu cam kết doanh số tài chính thực tế; hãy nêu rõ phạm vi dữ liệu đo lường (khảo sát, A/B test, traffic thử nghiệm) trong <em>Mục tiêu đề tài</em>.
            </p>
          )}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.9fr)] lg:items-start">
        <form onSubmit={submit} className="flex flex-col gap-6 rounded-xl border border-hairline bg-card p-5 shadow-xs sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
            <div>
              <h2 className="font-heading text-base font-bold text-ink">Nội dung đề cương</h2>
              <p className="text-xs text-ink-muted"><span aria-hidden="true">*</span> Trường bắt buộc</p>
            </div>
            {isDirty && <span className="text-xs font-medium text-status-warning-text">Nhớ lưu bản nháp trước khi nộp hoặc rời trang</span>}
          </div>
          {registration.error?.kind === 'validation' && <ValidationSummary summaryRef={validationSummaryRef} fields={registration.error.fields} message={registration.error.message} />}
          <TextField id="project-title" label="Tên đề tài" hint={isPublishedTopic ? 'Tên đề tài đã công bố được khóa theo danh mục Khoa. Hủy chọn đề tài nếu muốn tự đề xuất tên khác.' : undefined} value={registration.form.title} required disabled={!editable || isPublishedTopic} error={registration.error?.fields?.title} onChange={(value) => registration.setField('title', value)} />
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
          <footer className="flex flex-col justify-between gap-3 border-t border-hairline pt-4 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void save()}
              disabled={!registration.canEdit || registration.creating || registration.saving || submitting}
              className={hasProject
                ? 'inline-flex min-h-11 items-center justify-center rounded-lg border border-line-strong bg-card px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary disabled:opacity-50'
                : 'inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover shadow-primary disabled:opacity-50'}
            >
              {registration.creating ? 'Đang tạo nháp...' : registration.saving ? 'Đang lưu...' : hasProject ? 'Lưu thay đổi' : 'Tạo bản nháp'}
            </button>
            {hasProject ? <button type="submit" disabled={submitting || registration.saving || (revision ? !registration.canResubmit : !registration.canSubmit)} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover shadow-primary disabled:opacity-50">{registration.submitting ? 'Đang nộp...' : registration.resubmitting ? 'Đang nộp lại...' : revision ? 'Nộp lại sau chỉnh sửa' : 'Nộp đề cương'}</button> : <p className="text-xs text-ink-muted">Sau khi tạo bản nháp thành công, bạn có thể rà soát và nộp bằng thao tác riêng.</p>}
          </footer>
        </form>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-6">
          {hasProject && <RegistrationReadinessChecklist reasons={registration.submitReasons} />}
          {editable && (
            <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs">
              <div className="mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">fact_check</span>
                <h2 className="font-heading text-base font-bold text-ink">Kiểm tra trùng đề tài &amp; Ý tưởng</h2>
              </div>
              <AiTopicSimilarityCheck key={aiScopeKey} input={{
                teamId: journey.team?.id ?? 0,
                ...(registrationProject ? { projectId: registrationProject.id } : {}),
                title: registration.form.title.trim(),
                problemStatement: registration.form.problemStatement,
                objectives: registration.form.objectives,
                expectedOutput: registration.form.expectedOutput,
                domain: registration.form.domain,
                keywords: splitProjectTags(registration.form.keywords),
              }}>
                <button type="button" onClick={() => void checkSimilarity()} disabled={!registration.form.title.trim() || similarityLoading} className="min-h-11 rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50">
                  {similarityLoading ? 'Đang kiểm tra…' : 'Kiểm tra trùng đề tài'}
                </button>
              </AiTopicSimilarityCheck>
              <SimilarityResult result={currentSimilarity} />
            </section>
          )}
        </aside>
      </div>
      </div>
    </WorkspacePage>
  )
}

function ProjectProvenance({
  project,
  canDeselect,
  deselecting,
  deselectError,
  onDeselect,
}: {
  project: NonNullable<ReturnType<typeof useStudentJourney>['project']>
  canDeselect: boolean
  deselecting: boolean
  deselectError: string | null
  onDeselect: () => void
}) {
  const source = project.proposalSource ?? 'STUDENT_PROPOSAL'
  return (
    <section className="rounded-xl border border-hairline border-l-4 border-l-status-success-text bg-card p-5 text-sm text-ink shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-status-success-text" aria-hidden="true">check_circle</span>
          <p className="text-xs font-bold uppercase tracking-wider text-status-success-text">Nguồn đề tài</p>
        </div>
        {canDeselect && (
          <button
            type="button"
            disabled={deselecting}
            onClick={onDeselect}
            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-status-error-border bg-card px-3 py-1.5 text-xs font-semibold text-status-error-text hover:bg-status-error-bg disabled:opacity-50"
          >
            {deselecting ? 'Đang hủy chọn…' : 'Hủy chọn đề tài'}
          </button>
        )}
      </div>
      {source === 'PUBLISHED_TOPIC' ? (
        <p className="mt-2 text-xs text-ink-soft">
          <strong className="text-ink">Đề tài đã công bố</strong> · {project.selectedTopic ? `${project.selectedTopic.code} · ${project.selectedTopic.title}` : 'Chưa tải được thông tin chi tiết của đề tài đã chọn.'}
        </p>
      ) : (
        <p className="mt-2 text-xs text-ink-soft">
          <strong className="text-ink">Đề xuất của sinh viên</strong> · Hồ sơ này được khởi tạo từ đề xuất của nhóm.
        </p>
      )}
      <p className="mt-1.5 text-xs text-ink-muted">Nội dung đề cương được nhóm rà soát và cập nhật riêng trong biểu mẫu này.</p>
      {deselectError && <p role="alert" className="mt-2 text-xs font-medium text-status-error-text">{deselectError}</p>}
    </section>
  )
}

/** Soft, client-side pre-check only — the backend is the sole enforcer (422
 * DUPLICATE_TOPIC_TITLE on submit). An exact match is called out as a strong warning;
 * near matches are informational so the student can judge for themselves. */
function SimilarityResult({ result }: { result: TopicSimilarityResultDto | null }) {
  if (!result) return null
  if (!result.exactMatch && result.similar.length === 0) {
    return (
      <p role="status" className="mt-3 flex items-start gap-2 rounded-lg border border-hairline border-l-4 border-l-status-success-text bg-card p-3 text-xs text-ink shadow-2xs">
        <span className="material-symbols-outlined text-[16px] shrink-0 text-status-success-text" aria-hidden="true">check_circle</span>
        <span>Chưa phát hiện tên đề tài trùng khớp trực tiếp trong danh mục hiện tại.</span>
      </p>
    )
  }
  return <div className="mt-3 space-y-2">
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

function TextField({ id, label, hint, value, required, disabled, error, onChange }: { id: string; label: string; hint?: string; value: string; required?: boolean; disabled: boolean; error?: string; onChange: (value: string) => void }) { const helpId = `${id}-help`; return <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-ink-soft">{label}{required ? <span aria-hidden="true"> *</span> : ''}<input id={id} value={value} disabled={disabled} aria-invalid={Boolean(error)} aria-describedby={hint || error ? helpId : undefined} onChange={(event) => onChange(event.target.value)} className={`mt-1.5 min-h-11 w-full rounded-lg border bg-card px-3.5 py-2.5 text-sm font-normal text-ink normal-case tracking-normal focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 disabled:bg-canvas disabled:text-ink-muted ${error ? 'border-status-error-border' : 'border-line-strong'}`} />{error ? <span id={helpId} className="mt-1 block text-xs font-medium normal-case tracking-normal text-status-error-text">{error}</span> : hint ? <span id={helpId} className="mt-1 block text-xs font-normal normal-case tracking-normal text-ink-muted">{hint}</span> : null}</label> }
function TextArea({ id, label, value, disabled, onChange }: { id: string; label: string; value: string; disabled: boolean; onChange: (value: string) => void }) { return <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-ink-soft">{label}<textarea id={id} value={value} disabled={disabled} rows={3} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border border-line-strong bg-card px-3.5 py-2.5 text-sm font-normal text-ink normal-case tracking-normal focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 disabled:bg-canvas disabled:text-ink-muted" /></label> }
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
function LoadingState() { return <WorkspacePage size="wide" eyebrow="Đăng ký đề cương đồ án" title="Đề cương đồ án"><PageLoading label="Đang tải biểu mẫu đề cương…" /></WorkspacePage> }
function FailureState({ message, onRetry }: { message: string; onRetry: () => void }) { return <section className="rounded-xl border border-status-warning-border bg-status-warning-bg p-5 text-sm text-status-warning-text" role="alert"><p>{message}</p><button type="button" onClick={onRetry} className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-status-warning-border bg-card px-3.5 py-2 text-xs font-bold text-status-warning-text hover:bg-canvas">Tải lại</button></section> }
function ErrorMessage({ kind: _kind, message, onRetry }: { kind: string; message: string; onRetry?: () => void }) {
  const needsEligibility = message.includes('kiểm tra điều kiện còn hiệu lực')
  return <div className="rounded-md border border-status-error-border bg-status-error-bg p-3 text-xs text-status-error-text" role="alert">
    <span>{message}</span>
    {needsEligibility && <Link to="/team" className="ml-2 inline-block font-bold underline">Mở kiểm tra điều kiện nhóm</Link>}
    {onRetry && <button type="button" onClick={onRetry} className="ml-2 font-bold underline">Thử lại</button>}
  </div>
}
