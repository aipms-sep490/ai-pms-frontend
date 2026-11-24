import { projectStatusLabel } from '../utils/project-status'
import { dateTimeLabel } from '../../execution/execution-utils'
import { displayLabel } from '../../../components/ui/display-label'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { ActionVerdict } from '../../../components/ui/ActionVerdict'
import { ChangeDiff } from '../../../components/ui/ChangeDiff'
import { HistoryTimeline } from '../../../components/ui/HistoryTimeline'
import { Pagination, StatTileRow, StatusBadge, useClientPagination } from '../../../components/ui'
import { useAcademicStructure } from '../../academic/hooks/useAcademicStructure'
import type { ReviewProjectSummary } from '../api/project-review-api'
import { createAcademicNameResolver, type AcademicNameResolver } from '../components/academic-name-resolver'
import { DepartmentDecisionHistory } from '../components/DepartmentDecisionHistory'
import { MajorRequirementEditor, type MajorOption } from '../components/MajorRequirementEditor'
import { ParticipatingDepartmentPanel } from '../components/ParticipatingDepartmentPanel'
import { ProjectAcademicScopePanel } from '../components/ProjectAcademicScopePanel'
import { summarizeParticipatingDecisions } from '../components/participating-decision-summary'
import { useProjectReview } from '../hooks/useProjectReview'
import './project-review.css'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { EntityIdentityStrip } from '../../../components/ui/EntityIdentityStrip'
import { schemeStatusTone } from '../../../components/ui/status-badge-tone'

function ScopeSummary({ review, names }: { review: ReturnType<typeof useProjectReview>; names: AcademicNameResolver }) {
  const scope = review.detail?.academicScope ?? review.detail?.latestSubmission?.evidence.scope
  const evidence = review.detail?.latestSubmission?.evidence
  if (!scope) return <p className="rounded-xl border border-hairline bg-card p-5 text-sm text-ink-muted">Chưa có phạm vi học thuật cho đề cương này.</p>

  return (
    <>
      <ProjectAcademicScopePanel scope={scope} names={names} members={evidence?.members} />
      {evidence ? (
        <section className="review-page__card" aria-labelledby="review-scope-heading">
          <div className="review-page__card-header">
            <h2 id="review-scope-heading">Minh chứng đăng ký</h2>
            <span className="rounded-full border border-hairline bg-card px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
              {evidence.members.length} thành viên
            </span>
          </div>
          <div className="review-page__card-body">
            <dl className="review-page__facts">
              <div><dt>Bản nộp gần nhất</dt><dd>{review.detail?.latestSubmission?.submittedAt ? `Nộp lúc ${dateTimeLabel(review.detail.latestSubmission.submittedAt)}` : 'Chưa có thông tin thời gian nộp'}</dd></div>
              <div><dt>Điều kiện đội hình</dt><dd>{evidence.policy.minMembers}–{evidence.policy.maxMembers} thành viên · tối thiểu {evidence.policy.minDistinctMajors} ngành</dd></div>
            </dl>
          </div>
        </section>
      ) : (
        <p className="rounded-xl border border-hairline bg-card p-5 text-sm text-ink-muted">Chưa có phiên bản đăng ký để thẩm định.</p>
      )}
    </>
  )
}

function ProjectProposalDetails({ review }: { review: ReturnType<typeof useProjectReview> }) {
  const project = review.project
  if (!project) return null
  const tags = (type: string) => (project.tags ?? [])
    .filter((tag) => tag.tagType.toUpperCase() === type)
    .map((tag) => tag.name)

  return (
    <section className="review-page__card" aria-labelledby="proposal-details-heading">
      <div className="review-page__card-header">
        <h2 id="proposal-details-heading">Nội dung đề cương</h2>
        <span className="text-xs font-medium text-ink-muted">{project.teamName}</span>
      </div>
      <div className="review-page__card-body">
        <dl className="review-page__facts">
          <div><dt>Nhóm</dt><dd>{project.teamName}</dd></div>
          <div><dt>Ngành</dt><dd>{(project.majors ?? []).map((major) => `${major.majorCode} — ${major.majorName}`).join(', ') || '—'}</dd></div>
          <div><dt>Lĩnh vực</dt><dd>{tags('DOMAIN').join(', ') || '—'}</dd></div>
          <div><dt>Công nghệ</dt><dd>{tags('TECHNOLOGY').join(', ') || '—'}</dd></div>
          <div><dt>Từ khóa</dt><dd>{tags('KEYWORD').join(', ') || '—'}</dd></div>
          <div><dt>Ngày nộp</dt><dd>{project.submittedAt ? dateTimeLabel(project.submittedAt) : '—'}</dd></div>
          <div><dt>Nguồn đề cương</dt><dd>{project.proposalSource === 'PUBLISHED_TOPIC'
            ? <>Đề tài đã công bố{project.selectedTopic ? ` · #${project.topicId ?? project.selectedTopic.id} · ${project.selectedTopic.code} — ${project.selectedTopic.title}` : project.topicId ? ` · #${project.topicId}` : ''}</>
            : 'Đề xuất của sinh viên'}</dd></div>
        </dl>
        <h3>Mô tả</h3>
        <p>{project.description || 'Chưa có mô tả.'}</p>
        <h3>Bối cảnh và vấn đề</h3>
        <p>{project.problemStatement || 'Chưa có nội dung bối cảnh và vấn đề.'}</p>
        <h3>Mục tiêu</h3>
        <p>{project.objectives || 'Chưa có mục tiêu.'}</p>
        <h3>Sản phẩm kỳ vọng</h3>
        <p>{project.expectedOutput || 'Chưa có sản phẩm kỳ vọng.'}</p>
      </div>
    </section>
  )
}

export function ProjectReviewPage() {
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const { id } = useParams()
  const review = useProjectReview(id ? Number(id) : undefined)
  const academic = useAcademicStructure({ search: '', includeInactive: true })
  const names = useMemo(() => createAcademicNameResolver(academic.hierarchy), [academic.hierarchy])
  const majorOptions = useMemo<MajorOption[]>(() => (academic.hierarchy ?? []).flatMap((organization) => organization.departments.flatMap((department) => department.majors.map((major) => ({ id: major.id, code: major.code, name: major.name })))), [academic.hierarchy])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [allQueueItems, setAllQueueItems] = useState<ReviewProjectSummary[] | null>(null)
  const [loadingFilteredQueue, setLoadingFilteredQueue] = useState(false)
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')

  const queueItems = useMemo(() => review.queue?.items ?? [], [review.queue])
  const queueTotalCount = review.queue?.totalCount ?? 0
  const loadAllQueue = review.loadAllQueue

  useEffect(() => {
    if (id || statusFilter === 'ALL' || queueTotalCount <= queueItems.length || !loadAllQueue) {
      setAllQueueItems(null)
      setLoadingFilteredQueue(false)
      return
    }
    let cancelled = false
    setLoadingFilteredQueue(true)
    loadAllQueue()
      .then((items) => {
        if (!cancelled) setAllQueueItems(items)
      })
      .catch(() => {
        if (!cancelled) setAllQueueItems(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingFilteredQueue(false)
      })
    return () => { cancelled = true }
  }, [id, statusFilter, queueTotalCount, queueItems.length, loadAllQueue])

  const filteredSource = statusFilter === 'ALL' ? queueItems : (allQueueItems ?? queueItems)
  const filteredQueue = useMemo(() => {
    if (statusFilter === 'ALL') return queueItems
    return filteredSource.filter((project) => project.status.replaceAll('_', '').toUpperCase() === statusFilter)
  }, [queueItems, filteredSource, statusFilter])
  const filteredPagination = useClientPagination(filteredQueue, 10)
  const historyPagination = useClientPagination(review.history ?? [], 8)

  if (review.isUnauthorized) return <div className="workspace-page review-page mk-page-enter"><div className="rounded-xl border border-hairline bg-card p-5 text-sm text-ink-soft"><Link className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4" to="/login">Đăng nhập lại để tiếp tục.</Link></div></div>
  if (review.loading) return <div className="workspace-page review-page mk-page-enter"><p role="status" className="rounded-xl border border-hairline bg-card p-5 text-sm text-ink-muted">Đang tải danh sách thẩm định…</p></div>
  if (review.isForbidden) return <div className="workspace-page review-page mk-page-enter"><div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-warning-border bg-status-warning-bg p-5 text-sm text-status-warning-text"><p>Bạn không có quyền thẩm định đề cương trong bộ môn này.</p><Button className="min-h-11" onClick={() => void review.refresh()}>Thử lại</Button></div></div>
  if (review.error) return <div className="workspace-page review-page mk-page-enter"><div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-error-border bg-status-error-bg p-5 text-sm text-status-error-text"><p>{review.error.message}</p><Button className="min-h-11" onClick={() => void review.refresh()}>Làm mới</Button></div></div>

  if (!id) {
    const queue = review.queue
    const submittedCount = queueItems.filter((item) => item.status.replaceAll('_', '').toUpperCase() === 'SUBMITTED').length
    const underReviewCount = queueItems.filter((item) => item.status.replaceAll('_', '').toUpperCase() === 'UNDERREVIEW').length
    const revisionCount = queueItems.filter((item) => item.status.replaceAll('_', '').toUpperCase() === 'REVISIONREQUIRED').length
    const totalPages = queue?.totalPages ?? (queue ? Math.max(1, Math.ceil(queue.totalCount / Math.max(1, queue.pageSize))) : 1)

    return (
      <div className="workspace-page review-page mk-page-enter">
        <header className="workspace-heading review-page__header">
          <div className="workspace-heading-copy">
            <span className="workspace-kicker">Thẩm định đề cương</span>
            <h1>Danh sách đề cương chờ xử lý</h1>
            <p className="mt-1 max-w-3xl text-sm text-ink-muted">Tìm và mở hồ sơ đề cương thuộc phạm vi bộ môn của bạn.</p>
          </div>
          <Button variant="secondary" className="min-h-11" onClick={() => void review.refresh()}>Làm mới</Button>
        </header>

        <StatTileRow
          tiles={[
            {
              icon: 'assignment_turned_in',
              label: 'Tổng hồ sơ thẩm định',
              value: queue?.totalCount ?? 0,
              caption: 'Trong phạm vi bộ môn',
              hero: true,
            },
            {
              icon: 'mark_email_unread',
              label: 'Mới nộp (trang này)',
              value: submittedCount,
              caption: 'Chờ bắt đầu thẩm định',
              tone: submittedCount > 0 ? 'warning' : 'neutral',
              onClick: () => setStatusFilter(statusFilter === 'SUBMITTED' ? 'ALL' : 'SUBMITTED'),
              active: statusFilter === 'SUBMITTED',
            },
            {
              icon: 'rate_review',
              label: 'Đang thẩm định',
              value: underReviewCount,
              caption: 'Đang chờ quyết định',
              tone: 'info',
              onClick: () => setStatusFilter(statusFilter === 'UNDERREVIEW' ? 'ALL' : 'UNDERREVIEW'),
              active: statusFilter === 'UNDERREVIEW',
            },
            {
              icon: 'edit_note',
              label: 'Yêu cầu chỉnh sửa',
              value: revisionCount,
              caption: 'Chờ nhóm cập nhật lại',
              tone: 'neutral',
              onClick: () => setStatusFilter(statusFilter === 'REVISIONREQUIRED' ? 'ALL' : 'REVISIONREQUIRED'),
              active: statusFilter === 'REVISIONREQUIRED',
            },
          ]}
        />

        <form className="rounded-xl border border-hairline bg-card p-4 shadow-xs" onSubmit={(event) => { event.preventDefault(); review.setSearch(search) }}>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1 space-y-1.5">
              <label htmlFor="review-search" className="block text-xs font-semibold text-ink-soft">Tìm đề cương</label>
              <input
                id="review-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Mã, tên đề cương hoặc nhóm"
                className="min-h-11 w-full rounded-lg border border-line-strong bg-card px-3.5 py-2 text-sm text-ink focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <label className="w-full space-y-1.5 text-xs font-semibold text-ink-soft sm:w-56">
              <span>Trạng thái hồ sơ</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="min-h-11 w-full rounded-lg border border-line-strong bg-card px-3 py-2 text-sm font-normal text-ink focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="SUBMITTED">Đã nộp đề cương</option>
                <option value="UNDERREVIEW">Đang thẩm định</option>
                <option value="REVISIONREQUIRED">Yêu cầu chỉnh sửa</option>
              </select>
            </label>
            <Button type="submit" className="min-h-11 shrink-0">Tìm kiếm</Button>
          </div>
        </form>

        <section className="review-page__card" aria-label="Danh sách hồ sơ đề cương">
          <div className="review-page__card-header">
            <div className="flex items-center gap-2.5">
              <h2>Hàng đợi thẩm định</h2>
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-primary">
                {statusFilter === 'ALL' ? (queue?.totalCount ?? filteredQueue.length) : filteredQueue.length}
              </span>
            </div>
            {statusFilter !== 'ALL' && (
              <button type="button" onClick={() => setStatusFilter('ALL')} className="text-xs font-semibold text-primary underline underline-offset-4">
                Hiển thị tất cả
              </button>
            )}
          </div>

          {loadingFilteredQueue ? (
            <div className="p-5">
              <p role="status" className="text-sm text-ink-muted">Đang lọc hồ sơ trên toàn bộ hàng đợi…</p>
            </div>
          ) : filteredQueue.length > 0 ? (
            <div className="divide-y divide-hairline">
              {(statusFilter === 'ALL' ? queueItems : filteredPagination.paginatedItems).map((project) => (
                <article key={project.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-canvas/60">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="rounded-md border border-primary/20 bg-primary-subtle px-2 py-0.5 font-mono text-xs font-bold text-primary">{project.code}</b>
                      <StatusBadge status={project.status} label={displayLabel(project.status)} tone={schemeStatusTone(project.status)} />
                      {project.majors.map((major) => (
                        <span key={major.majorCode} className="rounded-md border border-hairline bg-canvas px-2 py-0.5 text-xs font-medium text-ink-soft">
                          {major.majorCode}
                        </span>
                      ))}
                    </div>
                    <h2 className="m-0 text-base font-bold text-ink">{project.title}</h2>
                    <p className="m-0 text-xs text-ink-muted">
                      Nhóm: {project.teamName}
                      {project.submittedAt ? ` · Nộp lúc ${dateTimeLabel(project.submittedAt)}` : ''}
                    </p>
                  </div>
                  <Link className="review-page__open-link mt-0 shrink-0" to={`/department/projects/review/${project.id}`}>Mở hồ sơ</Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-5">
              <p className="review-page__empty">Không có đề cương nào trong phạm vi bộ môn ở thời điểm này.</p>
            </div>
          )}

          {statusFilter === 'ALL' ? (
            queue && totalPages > 1 ? (
              <div className="border-t border-hairline bg-canvas/50 px-5 py-3.5">
                <Pagination
                  page={queue.page}
                  pages={totalPages}
                  total={queue.totalCount}
                  pageSize={queue.pageSize}
                  onPage={review.goToPage}
                />
              </div>
            ) : null
          ) : filteredPagination.showPagination ? (
            <div className="border-t border-hairline bg-canvas/50 px-5 py-3.5">
              <Pagination
                page={filteredPagination.page}
                pages={filteredPagination.totalPages}
                total={filteredPagination.total}
                pageSize={filteredPagination.pageSize}
                pageSizeOptions={[10, 20, 50]}
                onPage={filteredPagination.setPage}
                onPageSizeChange={filteredPagination.setPageSize}
              />
            </div>
          ) : null}
        </section>
      </div>
    )
  }

  const submit = async (kind: 'revision' | 'approve' | 'reject') => {
    if ((kind === 'revision' || kind === 'reject') && !reason.trim()) {
      setMessage('Lý do là bắt buộc khi yêu cầu chỉnh sửa hoặc từ chối.')
      return
    }
    if ((kind === 'approve' || kind === 'reject') && await requestConfirmation({ title: kind === 'approve' ? 'Phê duyệt đề cương?' : 'Từ chối đề cương?', description: review.project?.title ?? 'Xác nhận quyết định thẩm định đề cương này.', confirmLabel: kind === 'approve' ? 'Phê duyệt đề cương' : 'Từ chối đề cương', danger: kind === 'reject' }) === null) return
    const ok = await review.decide(kind, reason.trim() || undefined)
    setMessage(ok ? 'Đã ghi nhận quyết định và cập nhật hồ sơ thẩm định.' : 'Không thể ghi nhận thao tác. Vui lòng tải lại và thử lại.')
    if (ok) setReason('')
  }

  const submitDepartment = async (decision: 'APPROVED' | 'REJECTED') => {
    if (decision === 'REJECTED' && !reason.trim()) {
      setMessage('Lý do là bắt buộc khi bộ môn từ chối.')
      return
    }
    if (await requestConfirmation({ title: decision === 'REJECTED' ? 'Từ chối với tư cách bộ môn tham gia?' : 'Đồng ý với tư cách bộ môn tham gia?', description: 'Quyết định của bộ môn được ghi nhận cho phiên bản đăng ký hiện tại; quyết định này không thay thế phê duyệt cuối của bộ môn chủ trì.', confirmLabel: decision === 'REJECTED' ? 'Ghi nhận từ chối' : 'Ghi nhận đồng ý', danger: decision === 'REJECTED' }) === null) return
    const ok = await review.decideParticipatingDepartment(decision, reason.trim() || undefined)
    setMessage(ok ? 'Đã ghi nhận quyết định của bộ môn và cập nhật hồ sơ.' : 'Không thể ghi nhận thao tác. Vui lòng tải lại và thử lại.')
    if (ok) setReason('')
  }

  const decisions = review.detail?.latestSubmission?.decisions ?? []
  const scope = review.detail?.academicScope ?? review.detail?.latestSubmission?.evidence.scope
  const isInterdisciplinary = scope?.projectMode === 'INTERDISCIPLINARY'
  const departmentIds = review.detail?.latestSubmission?.evidence.departmentIds ?? []
  const participatingSummary = summarizeParticipatingDecisions(departmentIds, decisions)
  const mayPresentFinalApproval = review.canApprove && (!isInterdisciplinary || participatingSummary === 'ALL_APPROVED')
  const snapshots = [...(review.reviewSnapshots?.items ?? [])].sort((a, b) => b.submissionNumber - a.submissionNumber)
  const [currentSnapshot, previousSnapshot] = snapshots
  const hasBackendApproval = review.workflow?.actions?.some(action => action.code === 'approve_project') ?? false

  return (
    <div className="workspace-page review-page mk-page-enter">
      <header className="workspace-heading review-page__header">
        <div className="workspace-heading-copy">
          <Link className="review-page__back-link" to="/department/projects/review">← Danh sách thẩm định</Link>
          <span className="workspace-kicker">Hội đồng bộ môn</span>
          <h1>Thẩm định đề cương</h1>
        </div>
        <Link className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-primary underline underline-offset-4 hover:text-primary-hover" to={`/department/projects/${id}/result`}>
          Theo dõi đánh giá và công bố kết quả →
        </Link>
      </header>

      <section className="review-page__card">
        <div className="review-page__card-header">
          <h2 className="text-lg font-bold text-ink">
            {review.project?.title ?? (review.project?.code ? `${review.project.code} — Chưa có tên đề cương` : `Đồ án #${id}`)}
          </h2>
          <StatusBadge
            status={review.workflow?.status ?? review.project?.status}
            label={projectStatusLabel(review.workflow?.status ?? review.project?.status ?? '')}
            tone={schemeStatusTone(review.workflow?.status ?? review.project?.status)}
          />
        </div>
        <div className="review-page__card-body">
          <EntityIdentityStrip
            chips={[
              { icon: 'tag', label: 'Mã đồ án', value: review.project?.code ?? `PRJ-${id}` },
              { icon: 'groups', label: 'Nhóm', value: review.project?.teamName ?? '—' },
              {
                icon: 'verified',
                label: 'Trạng thái',
                value: projectStatusLabel(review.workflow?.status ?? review.project?.status ?? ''),
                tone: schemeStatusTone(review.workflow?.status ?? review.project?.status),
              },
              ...(review.project?.majors?.length ? [{
                icon: 'school',
                label: 'Ngành',
                value: review.project.majors.map((m) => m.majorCode).join(', '),
              }] : []),
            ]}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
        <div className="flex flex-col gap-5 xl:col-span-8">
          <ProjectProposalDetails review={review} />
          <ScopeSummary review={review} names={names} />
          {currentSnapshot?.evidence && previousSnapshot?.evidence && (
            <section aria-label="So sánh hai lần nộp" className="review-page__card">
              <div className="review-page__card-header">
                <h2>Thay đổi ở lần nộp #{currentSnapshot.submissionNumber}</h2>
                <span className="text-xs font-medium text-ink-muted">So với lần nộp #{previousSnapshot.submissionNumber}</span>
              </div>
              <div className="review-page__card-body space-y-3">
                <ChangeDiff beforeLabel={`LẦN NỘP #${previousSnapshot.submissionNumber}`} afterLabel={`LẦN NỘP #${currentSnapshot.submissionNumber}`} rows={[
                  { label: 'Chế độ đồ án', before: displayLabel(previousSnapshot.evidence.scope.projectMode), after: displayLabel(currentSnapshot.evidence.scope.projectMode) },
                  {
                    label: 'Ngành chính',
                    before: previousSnapshot.evidence.scope.primaryMajorId != null ? names.major(previousSnapshot.evidence.scope.primaryMajorId) : '—',
                    after: currentSnapshot.evidence.scope.primaryMajorId != null ? names.major(currentSnapshot.evidence.scope.primaryMajorId) : '—',
                  },
                  { label: 'Số thành viên tối đa', before: previousSnapshot.evidence.policy.maxMembers, after: currentSnapshot.evidence.policy.maxMembers },
                  { label: 'Số ngành tối thiểu', before: previousSnapshot.evidence.policy.minDistinctMajors, after: currentSnapshot.evidence.policy.minDistinctMajors },
                  { label: 'Số thành viên', before: previousSnapshot.evidence.members.length, after: currentSnapshot.evidence.members.length },
                  { label: 'Số bộ môn', before: previousSnapshot.evidence.departmentIds.length, after: currentSnapshot.evidence.departmentIds.length },
                ]} />
                <p className="text-sm text-ink-muted">So sánh dữ liệu snapshot đăng ký; nội dung đề cương không có trong bản tổng hợp này.</p>
              </div>
            </section>
          )}
          <MajorRequirementEditor
            requirements={review.requirements?.requirements ?? scope?.requirements ?? []}
            projectMode={scope?.projectMode ?? ''}
            majors={majorOptions}
            busy={review.pending !== null}
            readOnly={!['DRAFT', 'REVISION_REQUIRED'].includes((review.workflow?.status ?? review.project?.status ?? '').toUpperCase())}
            onSave={review.replaceRequirements}
          />
        </div>

        <aside className="flex flex-col gap-5 xl:sticky xl:top-20 xl:col-span-4" aria-label="Quyết định thẩm định và lịch sử">
          <ParticipatingDepartmentPanel
            mode={scope?.projectMode ?? ''}
            snapshotId={review.detail?.latestSubmission?.id}
            departmentIds={departmentIds}
            decisions={decisions}
            names={names}
            canApprove={review.canApproveDepartment}
            canReject={review.canRejectDepartment}
            pending={review.pending !== null}
            onDecide={(decision) => void submitDepartment(decision)}
          />

          <section className="review-page__card">
            <div className="review-page__card-header">
              <h2>Phản hồi thẩm định</h2>
            </div>
            <div className="review-page__card-body space-y-4">
              <label className="sr-only" htmlFor="review-reason">Lý do thẩm định</label>
              {(review.canStart || review.canRequestRevision || review.canApprove || review.canReject || review.canApproveDepartment || review.canRejectDepartment)
                ? <textarea id="review-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Nhập lý do khi yêu cầu chỉnh sửa hoặc từ chối" />
                : <p className="text-sm text-ink-muted">Hồ sơ hiện không có bước thẩm định cần xử lý.</p>}
              <div className="review-page__actions">
                {review.canStart ? <Button disabled={review.pending !== null} onClick={() => void review.beginReview()}>Bắt đầu thẩm định</Button> : null}
                {review.canRequestRevision ? <Button className="btn-revision" variant="secondary" disabled={review.pending !== null} onClick={() => void submit('revision')}>Yêu cầu chỉnh sửa</Button> : null}
                {!hasBackendApproval && mayPresentFinalApproval ? <Button className="btn-approve" variant="primary" disabled={review.pending !== null} onClick={() => void submit('approve')}>Phê duyệt đề cương</Button> : null}
                {!hasBackendApproval && review.canReject ? <Button className="btn-reject" variant="danger" disabled={review.pending !== null} onClick={() => void submit('reject')}>Từ chối đề cương</Button> : null}
              </div>
              {hasBackendApproval && (
                <ActionVerdict actions={review.workflow!.actions} actionCode="approve_project" status="ready" okLabel="Điều kiện phê duyệt hợp lệ" blockedLabel="Chưa thể phê duyệt đề cương">
                  <ActionVerdict.Decision
                    primary={{ label: 'Phê duyệt đề cương', onClick: () => void submit('approve'), disabled: review.pending !== null || !mayPresentFinalApproval }}
                    secondary={review.canReject ? { label: 'Từ chối đề cương', onClick: () => void submit('reject'), disabled: review.pending !== null } : undefined}
                  />
                </ActionVerdict>
              )}
              {isInterdisciplinary && review.canApprove && participatingSummary !== 'ALL_APPROVED' ? <p className="text-sm text-ink-muted">Chỉ có thể phê duyệt cuối khi tất cả bộ môn tham gia đã đồng ý với phiên bản hiện tại.</p> : null}
              {review.pending ? <p role="status">Đang xử lý {review.pending}…</p> : null}
              {message ? <p role="status">{message}</p> : null}
            </div>
          </section>

          <details className="review-page__card group">
            <summary className="review-page__card-header cursor-pointer list-none select-none">
              <span className="flex items-center gap-2 text-base font-bold text-ink">
                <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">history</span>
                Lịch sử xử lý
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-primary">
                  {review.history.length}
                </span>
                <span className="material-symbols-outlined text-[18px] text-ink-muted transition-transform group-open:rotate-180" aria-hidden="true">expand_more</span>
              </span>
            </summary>
            <div className="review-page__card-body space-y-4">
              <HistoryTimeline
                items={historyPagination.paginatedItems.map(item => ({
                  at: item.changedAt,
                  actor: item.changedByName,
                  action: <p>{item.oldStatus ? projectStatusLabel(item.oldStatus) : 'Khởi tạo'} → {projectStatusLabel(item.newStatus)}</p>,
                  note: item.reason,
                }))}
                emptyLabel="Chưa có lịch sử trạng thái."
              />
              {historyPagination.showPagination && (
                <div className="border-t border-hairline pt-3">
                  <Pagination
                    page={historyPagination.page}
                    pages={historyPagination.totalPages}
                    total={historyPagination.total}
                    pageSize={historyPagination.pageSize}
                    onPage={historyPagination.setPage}
                  />
                </div>
              )}
            </div>
          </details>

          <details className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs group">
            <summary className="flex cursor-pointer list-none select-none items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
              <span className="flex items-center gap-2 text-base font-bold text-ink">
                <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">fact_check</span>
                Lịch sử thẩm định bộ môn
              </span>
              <span className="inline-flex items-center gap-1.5">
                {review.reviewSnapshots && (
                  <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-primary">
                    {review.reviewSnapshots.totalCount}
                  </span>
                )}
                <span className="material-symbols-outlined text-[18px] text-ink-muted transition-transform group-open:rotate-180" aria-hidden="true">expand_more</span>
              </span>
            </summary>
            <div className="p-3">
              <DepartmentDecisionHistory
                snapshots={review.reviewSnapshots}
                departmentName={names.department}
                onPageChange={review.goToReviewSnapshotPage}
              />
            </div>
          </details>
        </aside>
      </div>
      {confirmationDialog}
    </div>
  )
}
