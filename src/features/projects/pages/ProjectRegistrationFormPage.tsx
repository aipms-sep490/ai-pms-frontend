import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { RegistrationAcademicScope } from '../components/RegistrationAcademicScope'
import { RegistrationReadinessChecklist } from '../components/RegistrationReadinessChecklist'
import { RevisionAlert } from '../components/RevisionAlert'
import { normalizeProjectStatus, splitProjectTags, useProjectRegistration, type ProjectRegistrationField } from '../hooks/useProjectRegistration'
import { projectStatusLabel } from '../utils/project-status'
import { PageLoading } from '../../../components/ui/PageLoading'
import { BackLink } from '../../../components/ui/BackLink'
import { Pagination, useClientPagination } from '../../../components/ui'
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
      <section className="mx-auto max-w-3xl rounded-xl border border-hairline bg-card p-6 text-center shadow-xs">
        <span className="material-symbols-outlined text-4xl text-primary" aria-hidden="true">task_alt</span>
        <h1 className="mt-3 font-heading text-xl font-bold text-ink">Đề cương đang ở chế độ chỉ xem</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-muted">Hồ sơ đang ở trạng thái <strong>{projectStatusLabel(journey.project?.status ?? '')}</strong> và hiện chưa thể chỉnh sửa.</p>
        <button type="button" onClick={() => navigate('/project/status')} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary-hover">Xem trạng thái đề cương</button>
      </section>
    )
  }

  return (
    <div className="workspace-page flex flex-col gap-5 pb-12">
      <header className="workspace-heading">
        <div className="workspace-heading-copy">
          <BackLink fallback="/project/overview" className="mb-1 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-ink-muted hover:text-primary">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span> Quay lại
          </BackLink>
          <span className="workspace-kicker">Đăng ký đề cương đồ án</span>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">{revision ? 'Chỉnh sửa và nộp lại đề cương' : hasProject ? 'Chỉnh sửa đề cương đồ án' : 'Tạo bản nháp đề cương'}</h1>
          <p className="max-w-3xl text-sm text-ink-muted">Nhóm: <strong className="text-ink-soft">{journey.team?.name ?? 'Chưa có nhóm'}</strong>. Hình thức đồ án, ngành và bộ môn được quản lý theo thông tin học vụ.</p>
        </div>
        <button type="button" onClick={() => navigate('/project/status')} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-hairline bg-card px-3.5 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary">Xem trạng thái</button>
      </header>

      {!hasProject && !registration.canCreate && <FailureState message="Chưa thể tạo bản nháp. Nhóm cần đủ điều kiện đăng ký và bạn cần là trưởng nhóm." onRetry={() => void journey.refreshAll()} />}
      {registeringNewAfterRejection && <section className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-xs text-status-error-text"><strong>Đăng ký đề tài mới sau khi đề tài trước bị từ chối.</strong><p className="mt-1">Biểu mẫu này tạo một bản nháp hoàn toàn mới; đề cương cũ vẫn được giữ trong lịch sử.</p></section>}
      {revision && registration.latestRevision && <RevisionAlert reason={registration.latestRevision.reason} reviewerName={registration.latestRevision.changedByName || 'Hệ thống'} timestamp={registration.latestRevision.changedAt} />}

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
        <form onSubmit={submit} className="flex flex-col gap-5 xl:col-span-8">
          {registration.error?.kind === 'validation' && <ValidationSummary summaryRef={validationSummaryRef} fields={registration.error.fields} message={registration.error.message} />}

          <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">edit_document</span>
                <h2 className="text-sm font-bold text-ink">1. Thông tin cơ bản đề tài</h2>
              </div>
              <p className="text-xs text-ink-muted"><span aria-hidden="true">*</span> Trường bắt buộc</p>
            </div>
            <div className="flex flex-col gap-5 p-5">
              <TextField id="project-title" label="Tên đề tài" value={registration.form.title} required disabled={!editable} error={registration.error?.fields?.title} onChange={(value) => registration.setField('title', value)} />
              <TextArea id="project-description" label="Mô tả ngắn" value={registration.form.description} disabled={!editable} onChange={(value) => registration.setField('description', value)} />
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
            <div className="flex items-center gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
              <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">subject</span>
              <h2 className="text-sm font-bold text-ink">2. Nội dung chuyên môn</h2>
            </div>
            <div className="flex flex-col gap-5 p-5">
              <TextArea id="project-problem" label="Bối cảnh và vấn đề cần giải quyết" value={registration.form.problemStatement} disabled={!editable} onChange={(value) => registration.setField('problemStatement', value)} />
              <TextArea id="project-objectives" label="Mục tiêu đề tài" value={registration.form.objectives} disabled={!editable} onChange={(value) => registration.setField('objectives', value)} />
              <TextArea id="project-output" label="Sản phẩm kỳ vọng" value={registration.form.expectedOutput} disabled={!editable} onChange={(value) => registration.setField('expectedOutput', value)} />
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
            <div className="flex items-center gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
              <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">category</span>
              <h2 className="text-sm font-bold text-ink">3. Phân loại, công nghệ & từ khóa</h2>
            </div>
            <div className="flex flex-col gap-5 p-5">
              <div className="grid gap-4 md:grid-cols-3">
                <TextField id="project-domain" label="Lĩnh vực" value={registration.form.domain} required disabled={!editable} error={registration.error?.fields?.domain} onChange={(value) => registration.setField('domain', value)} />
                <TextField id="project-technologies" label="Công nghệ" hint="Phân cách bằng dấu phẩy" value={registration.form.technologies} disabled={!editable} error={registration.error?.fields?.technologies} onChange={(value) => registration.setField('technologies', value)} />
                <TextField id="project-keywords" label="Từ khóa" hint="Phân cách bằng dấu phẩy" value={registration.form.keywords} disabled={!editable} error={registration.error?.fields?.keywords} onChange={(value) => registration.setField('keywords', value)} />
              </div>

              {registration.error && registration.error.kind !== 'validation' && <ErrorMessage kind={registration.error.kind} message={registration.error.message} onRetry={registration.error.kind === 'system' ? () => void journey.refreshAll() : undefined} />}

              <footer className="flex flex-col justify-between gap-3 border-t border-hairline pt-4 sm:flex-row sm:items-center">
                <button type="button" onClick={() => void save()} disabled={!registration.canEdit || registration.creating || registration.saving || submitting} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line-strong bg-card px-4 py-2.5 text-xs font-semibold text-ink-soft transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary disabled:opacity-50">
                  {registration.creating ? 'Đang tạo nháp...' : registration.saving ? 'Đang lưu...' : hasProject ? 'Lưu thay đổi' : 'Tạo bản nháp'}
                </button>
                {hasProject ? <button type="submit" disabled={submitting || registration.saving || (revision ? !registration.canResubmit : !registration.canSubmit)} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-50">{registration.submitting ? 'Đang nộp...' : registration.resubmitting ? 'Đang nộp lại...' : revision ? 'Nộp lại sau chỉnh sửa' : 'Nộp đề cương'}</button> : <p className="text-xs text-ink-muted">Sau khi tạo bản nháp thành công, bạn có thể rà soát và nộp bằng thao tác riêng.</p>}
              </footer>
            </div>
          </section>
        </form>

        <aside className="flex flex-col gap-5 xl:sticky xl:top-20 xl:col-span-4" aria-label="Hỗ trợ rà soát đề cương">
          {hasProject && <RegistrationReadinessChecklist reasons={registration.submitReasons} />}

          {editable && (
            <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
              <div className="flex items-center gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
                <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">fact_check</span>
                <h2 className="text-sm font-bold text-ink">Kiểm tra trùng lặp & đối chiếu AI</h2>
              </div>
              <div className="p-5">
                <AiTopicSimilarityCheck key={JSON.stringify([
                  journey.profile?.id ?? null,
                  journey.team?.id ?? null,
                  registrationProject?.id ?? null,
                  registration.academicScope?.leadDepartmentId ?? null,
                  registration.academicScope?.projectMode ?? null,
                  registration.form.title.trim(),
                  registration.form.problemStatement,
                  registration.form.objectives,
                  registration.form.expectedOutput,
                  registration.form.domain,
                  registration.form.keywords,
                ])} input={{
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
              </div>
            </section>
          )}

          {registrationProject ? <ProjectProvenance project={registrationProject} /> : null}
          <RegistrationAcademicScope scope={registration.academicScope} organizationId={journey.semester?.organizationId} />
        </aside>
      </div>
    </div>
  )
}

function ProjectProvenance({ project }: { project: NonNullable<ReturnType<typeof useStudentJourney>['project']> }) {
  const source = project.proposalSource ?? 'STUDENT_PROPOSAL'
  return <section className="rounded-xl border border-status-success-border bg-status-success-bg p-5 text-sm text-status-success-text"><p className="text-xs font-bold uppercase tracking-wider">Nguồn đề tài</p>{source === 'PUBLISHED_TOPIC' ? <p className="mt-2 text-xs"><strong>Đề tài đã công bố</strong> · {project.selectedTopic ? `${project.selectedTopic.code} · ${project.selectedTopic.title}` : 'Chưa tải được thông tin chi tiết của đề tài đã chọn.'}</p> : <p className="mt-2 text-xs"><strong>Đề xuất của sinh viên</strong> · Hồ sơ này được khởi tạo từ đề xuất của nhóm.</p>}<p className="mt-2 text-xs">Nội dung đề cương được nhóm rà soát và cập nhật riêng trong biểu mẫu này.</p></section>
}

/** Soft, client-side pre-check only — the backend is the sole enforcer (422
 * DUPLICATE_TOPIC_TITLE on submit). An exact match is called out as a strong warning;
 * near matches are informational so the student can judge for themselves. */
function SimilarityResult({ result }: { result: TopicSimilarityResultDto | null }) {
  const similarItems = result?.similar ?? []
  const pagination = useClientPagination(similarItems, 8)
  if (!result || (!result.exactMatch && similarItems.length === 0)) return null
  return <div className="mt-2 space-y-2">
    {result.exactMatch && <p role="alert" className="rounded-md border border-status-error-border bg-status-error-bg p-3 text-xs text-status-error-text">
      Tên đề tài trùng với đề tài đã có: <strong>{result.exactMatch.title}</strong>. Hệ thống sẽ từ chối khi nộp nếu không đổi tên.
    </p>}
    {similarItems.length > 0 && <div className="rounded-md border border-status-warning-border bg-status-warning-bg p-3 text-xs text-status-warning-text">
      <p className="font-semibold">Có thể gần giống các đề tài sau ({similarItems.length}):</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4">
        {pagination.paginatedItems.map((item) => <li key={item.id}>{item.title} · kỳ {item.semesterCode} · giống {Math.round(item.score * 100)}%</li>)}
      </ul>
      {pagination.showPagination && (
        <div className="mt-2.5 border-t border-status-warning-border pt-2">
          <Pagination
            page={pagination.page}
            pages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
            onPage={pagination.setPage}
          />
        </div>
      )}
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
function LoadingState() { return <div className="workspace-page"><PageLoading label="Đang tải biểu mẫu đề cương…" /></div> }
function FailureState({ message, onRetry }: { message: string; onRetry: () => void }) { return <section className="rounded-xl border border-status-warning-border bg-status-warning-bg p-5 text-sm text-status-warning-text" role="alert"><p>{message}</p><button type="button" onClick={onRetry} className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-status-warning-border bg-card px-3.5 py-2 text-xs font-bold text-status-warning-text hover:bg-canvas">Tải lại</button></section> }
function ErrorMessage({ kind: _kind, message, onRetry }: { kind: string; message: string; onRetry?: () => void }) {
  const needsEligibility = message.includes('kiểm tra điều kiện còn hiệu lực')
  return <div className="rounded-md border border-status-error-border bg-status-error-bg p-3 text-xs text-status-error-text" role="alert">
    <span>{message}</span>
    {needsEligibility && <Link to="/team" className="ml-2 inline-block font-bold underline">Mở kiểm tra điều kiện nhóm</Link>}
    {onRetry && <button type="button" onClick={onRetry} className="ml-2 font-bold underline">Thử lại</button>}
  </div>
}
