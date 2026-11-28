import { projectStatusLabel } from '../utils/project-status'
import { dateTimeLabel } from '../../execution/execution-utils'
import { displayLabel } from '../../../components/ui/display-label'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BackLink } from '../../../components/ui/BackLink'
import { Button } from '../../../components/ui/Button'
import { ActionVerdict } from '../../../components/ui/ActionVerdict'
import { ChangeDiff } from '../../../components/ui/ChangeDiff'
import { FilterToolbar } from '../../../components/ui/FilterToolbar'
import { HistoryTimeline } from '../../../components/ui/HistoryTimeline'
import { Pagination } from '../../../components/ui/Pagination'
import { Modal } from '../../../components/ui/Modal'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useAcademicStructure } from '../../academic/hooks/useAcademicStructure'
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
import { ListLoading } from '../../../components/ui/ListLoading'
import { schemeStatusTone } from '../../../components/ui/status-badge-tone'

const pendingActionLabel: Record<string, string> = {
  begin: 'bắt đầu thẩm định',
  approve: 'phê duyệt đề cương',
  'lead-override': 'phê duyệt vượt quyền (Lead Override)',
  reject: 'từ chối đề cương',
  revision: 'yêu cầu chỉnh sửa',
  department: 'ghi nhận ý kiến bộ môn',
  'department-revision': 'ghi nhận yêu cầu chỉnh sửa từ bộ môn',
  requirements: 'cập nhật yêu cầu theo ngành',
}

type QueueStatusFilter = 'ALL' | 'SUBMITTED' | 'UNDER_REVIEW' | 'REVISION_REQUIRED'
type QueueSortKey = 'newest' | 'title'

function queueStatusTone(status: string): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
  const s = status.replaceAll('_', '').toUpperCase()
  if (s === 'APPROVED' || s === 'ACTIVE') return 'success'
  if (s === 'REJECTED') return 'danger'
  if (s === 'UNDERREVIEW' || s === 'SUBMITTED' || s === 'REVISIONREQUIRED') return 'warning'
  return 'neutral'
}

function ScopeSummary({ review, names }: { review: ReturnType<typeof useProjectReview>; names: AcademicNameResolver }) {
  const scope = review.detail?.academicScope ?? review.detail?.latestSubmission?.evidence.scope
  const evidence = review.detail?.latestSubmission?.evidence
  if (!scope) return <p>Chưa có phạm vi học thuật cho đề cương này.</p>

  return (
    <>
      <ProjectAcademicScopePanel scope={scope} names={names} members={evidence?.members} />
      {evidence ? <section aria-labelledby="review-scope-heading">
        <h2 id="review-scope-heading">Minh chứng đăng ký</h2>
        <dl className="review-page__facts">
          <div><dt>Bản nộp gần nhất</dt><dd>{review.detail?.latestSubmission?.submittedAt ? `Nộp lúc ${dateTimeLabel(review.detail.latestSubmission.submittedAt)}` : 'Chưa có thông tin thời gian nộp'}</dd></div>
          <div><dt>Điều kiện đội hình</dt><dd>{evidence.policy.minMembers}–{evidence.policy.maxMembers} thành viên · tối thiểu {evidence.policy.minDistinctMajors} ngành</dd></div>
        </dl>
      </section> : <p>Chưa có phiên bản đăng ký để thẩm định.</p>}
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
    <section aria-labelledby="proposal-details-heading" className="space-y-4">
      <h2 id="proposal-details-heading">Nội dung đề cương</h2>
      <dl className="review-page__facts">
        <div><dt>Nhóm</dt><dd>{project.teamName}</dd></div>
        <div><dt>Ngành</dt><dd>{(project.majors ?? []).map((major) => `${major.majorCode} — ${major.majorName}`).join(', ') || '—'}</dd></div>
        <div><dt>Lĩnh vực</dt><dd>{tags('DOMAIN').join(', ') || '—'}</dd></div>
        <div><dt>Công nghệ</dt><dd>{tags('TECHNOLOGY').join(', ') || '—'}</dd></div>
        <div><dt>Từ khóa</dt><dd>{tags('KEYWORD').join(', ') || '—'}</dd></div>
        <div><dt>Ngày nộp</dt><dd>{project.submittedAt ? dateTimeLabel(project.submittedAt) : '—'}</dd></div>
        <div><dt>Nguồn đề cương</dt><dd>{project.proposalSource === 'PUBLISHED_TOPIC'
          ? <>Đề tài đã công bố{project.selectedTopic ? ` · ${project.selectedTopic.code} — ${project.selectedTopic.title}` : ''}</>
          : 'Đề xuất của sinh viên'}</dd></div>
      </dl>
      <div className="space-y-3 border-t border-hairline pt-4 text-sm">
        <div><h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft">Mô tả</h3><p className="mt-1 whitespace-pre-line text-ink-muted">{project.description || 'Chưa có mô tả.'}</p></div>
        <div><h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft">Bối cảnh và vấn đề</h3><p className="mt-1 whitespace-pre-line text-ink-muted">{project.problemStatement || 'Chưa có nội dung bối cảnh và vấn đề.'}</p></div>
        <div><h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft">Mục tiêu</h3><p className="mt-1 whitespace-pre-line text-ink-muted">{project.objectives || 'Chưa có mục tiêu.'}</p></div>
        <div><h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft">Sản phẩm kỳ vọng</h3><p className="mt-1 whitespace-pre-line text-ink-muted">{project.expectedOutput || 'Chưa có sản phẩm kỳ vọng.'}</p></div>
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
  const [statusFilter, setStatusFilter] = useState<QueueStatusFilter>('ALL')
  const [majorFilter, setMajorFilter] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<QueueSortKey>('newest')

  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [overrideModalOpen, setOverrideModalOpen] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideError, setOverrideError] = useState<string | null>(null)

  const queueItems = review.queue?.items ?? []
  const queueMajors = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of queueItems) {
      for (const m of p.majors ?? []) {
        map.set(m.majorCode, `${m.majorCode} — ${m.majorName}`)
      }
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [queueItems])

  const queueCounts = useMemo(() => {
    const c = { ALL: queueItems.length, SUBMITTED: 0, UNDER_REVIEW: 0, REVISION_REQUIRED: 0 }
    for (const p of queueItems) {
      const s = p.status.replaceAll('_', '').toUpperCase()
      if (s === 'SUBMITTED') c.SUBMITTED += 1
      else if (s === 'UNDERREVIEW') c.UNDER_REVIEW += 1
      else if (s === 'REVISIONREQUIRED') c.REVISION_REQUIRED += 1
    }
    return c
  }, [queueItems])

  const visibleQueueItems = useMemo(() => {
    const list = queueItems.filter((p) => {
      const s = p.status.replaceAll('_', '').toUpperCase()
      if (statusFilter === 'SUBMITTED' && s !== 'SUBMITTED') return false
      if (statusFilter === 'UNDER_REVIEW' && s !== 'UNDERREVIEW') return false
      if (statusFilter === 'REVISION_REQUIRED' && s !== 'REVISIONREQUIRED') return false
      if (majorFilter !== 'ALL' && !(p.majors ?? []).some((m) => m.majorCode === majorFilter)) return false
      return true
    })
    if (sortBy === 'title') {
      return [...list].sort((a, b) => a.title.localeCompare(b.title, 'vi'))
    }
    return list
  }, [majorFilter, queueItems, sortBy, statusFilter])

  if (review.isUnauthorized) return <div className="workspace-page review-page mk-page-enter"><div className="rounded-xl border border-hairline bg-card p-5 text-sm text-ink-soft"><Link className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4" to="/login">Đăng nhập lại để tiếp tục.</Link></div></div>
  if (review.loading) return <div className="workspace-page review-page mk-page-enter"><ListLoading label="Đang tải danh sách thẩm định…" /></div>
  if (review.isForbidden) return <div className="workspace-page review-page mk-page-enter"><div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-warning-border bg-status-warning-bg p-5 text-sm text-status-warning-text"><p>Bạn không có quyền thẩm định đề cương trong bộ môn này.</p><Button className="min-h-11" onClick={() => void review.refresh()}>Thử lại</Button></div></div>
  if (review.error) return <div className="workspace-page review-page mk-page-enter"><div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-error-border bg-status-error-bg p-5 text-sm text-status-error-text"><p>{review.error.message}</p><Button className="min-h-11" onClick={() => void review.refresh()}>Làm mới</Button></div></div>

  if (!id) {
    const queue = review.queue
    const activeChips = [
      ...(search.trim() ? [{ id: 'search', label: 'Từ khóa', value: search.trim() }] : []),
      ...(statusFilter !== 'ALL' ? [{ id: 'status', label: 'Trạng thái', value: projectStatusLabel(statusFilter) }] : []),
      ...(majorFilter !== 'ALL' ? [{ id: 'major', label: 'Ngành', value: majorFilter }] : []),
    ]
    const clearQueueFilters = () => {
      setSearch('')
      review.setSearch('')
      setStatusFilter('ALL')
      setMajorFilter('ALL')
      setSortBy('newest')
    }

    return (
      <div className="workspace-page workspace-page--wide review-page mk-page-enter">
        <header className="workspace-heading review-page__header">
          <div className="workspace-heading-copy">
            <span className="workspace-kicker">Thẩm định đề cương</span>
            <h1>Danh sách đề cương chờ xử lý</h1>
            <p className="mt-1 text-sm text-ink-muted">Tìm và mở hồ sơ đề cương thuộc phạm vi bộ môn của bạn.</p>
          </div>
          <Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại" onClick={() => void review.refresh()} />
        </header>

        <StatTileRow
          tiles={[
            { icon: 'fact_check', label: 'Tổng hồ sơ trong hàng đợi', value: queue?.totalCount ?? 0, hero: true },
            { icon: 'inbox', label: 'Đã nộp mới', value: queueCounts.SUBMITTED, tone: queueCounts.SUBMITTED > 0 ? 'warning' : 'neutral' },
            { icon: 'rate_review', label: 'Đang thẩm định', value: queueCounts.UNDER_REVIEW },
          ]}
        />

        <FilterToolbar
          search={search}
          onSearchChange={(val) => { setSearch(val); review.setSearch(val) }}
          searchPlaceholder="Tìm theo mã, tên đề cương hoặc nhóm…"
          searchLabel="Tìm đề cương"
          activeTab={statusFilter}
          onTabChange={(val) => setStatusFilter(val as QueueStatusFilter)}
          tabsLabel="Lọc theo trạng thái thẩm định"
          tabs={[
            { value: 'ALL', label: 'Tất cả', count: queueCounts.ALL },
            { value: 'SUBMITTED', label: 'Đã nộp', count: queueCounts.SUBMITTED },
            { value: 'UNDER_REVIEW', label: 'Đang thẩm định', count: queueCounts.UNDER_REVIEW },
            ...(queueCounts.REVISION_REQUIRED > 0 ? [{ value: 'REVISION_REQUIRED', label: 'Cần chỉnh sửa', count: queueCounts.REVISION_REQUIRED }] : []),
          ]}
          controls={
            queueMajors.length > 0 ? (
              <label className="ft-select-wrap">
                <span className="sr-only">Lọc theo ngành</span>
                <select aria-label="Lọc theo ngành" value={majorFilter} onChange={(e) => setMajorFilter(e.target.value)} className="ft-select">
                  <option value="ALL">Tất cả ngành</option>
                  {queueMajors.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                </select>
              </label>
            ) : undefined
          }
          sort={{
            value: sortBy,
            onChange: (val) => setSortBy(val as QueueSortKey),
            options: [
              { value: 'newest', label: 'Mới nộp nhất' },
              { value: 'title', label: 'Tên đề cương A–Z' },
            ],
          }}
          activeChips={activeChips}
          onRemoveChip={(chipId) => {
            if (chipId === 'search') { setSearch(''); review.setSearch('') }
            if (chipId === 'status') setStatusFilter('ALL')
            if (chipId === 'major') setMajorFilter('ALL')
          }}
          onClearAll={clearQueueFilters}
          hasActiveFilters={activeChips.length > 0}
          resultSummary={activeChips.length > 0 ? `Hiển thị ${visibleQueueItems.length} / ${queueItems.length} đề cương` : undefined}
          pagination={queue ? { page: queue.page, pages: queue.totalPages ?? Math.max(1, Math.ceil(queue.totalCount / Math.max(1, queue.pageSize))), total: queue.totalCount, pageSize: queue.pageSize, onPage: review.goToPage } : undefined}
        />

        <div className="grid items-stretch gap-4 md:grid-cols-2">
          {visibleQueueItems.map((project) => (
            <article key={project.id} className="flex h-full flex-col justify-between gap-3 rounded-xl border border-hairline bg-card p-5 shadow-xs transition-all hover:border-primary/40">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-primary">{project.code}</span>
                  <StatusBadge tone={queueStatusTone(project.status)} label={projectStatusLabel(project.status)} />
                </div>
                <h2 className="mt-2 font-heading text-base font-bold text-ink">{project.title}</h2>
                <p className="mt-1 text-xs text-ink-muted">
                  {project.teamName} · {(project.majors ?? []).map((major) => major.majorCode).join(', ') || 'Chưa xác định ngành'}
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-hairline pt-3">
                <span className="text-xs text-ink-muted">{project.submittedAt ? `Nộp ${dateTimeLabel(project.submittedAt)}` : 'Chờ xử lý'}</span>
                <Link className="review-page__open-link !mt-0 !min-h-10" to={`/department/projects/review/${project.id}`}>Mở hồ sơ</Link>
              </div>
            </article>
          ))}
        </div>

        {queue && queue.items.length === 0 ? <p className="review-page__empty">Không có đề cương nào trong phạm vi bộ môn ở thời điểm này.</p> : null}
        {queue && queue.items.length > 0 && visibleQueueItems.length === 0 ? (
          <div className="review-page__empty space-y-3">
            <p>Không tìm thấy đề cương phù hợp với bộ lọc hiện tại.</p>
            <Button variant="secondary" onClick={clearQueueFilters}>Xóa bộ lọc</Button>
          </div>
        ) : null}
        {queue && (queue.totalCount > queue.pageSize || (queue.totalPages ?? 1) > 1) ? (
          <Pagination
            page={queue.page}
            pages={queue.totalPages ?? Math.max(1, Math.ceil(queue.totalCount / Math.max(1, queue.pageSize)))}
            total={queue.totalCount}
            pageSize={queue.pageSize}
            onPage={review.goToPage}
            onPageSizeChange={typeof review.setPageSize === 'function' ? review.setPageSize : undefined}
          />
        ) : null}
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
    setMessage(ok
      ? (kind === 'approve'
        ? 'Đề cương đã được phê duyệt và cập nhật trạng thái đồ án thành công.'
        : kind === 'reject'
          ? 'Đã ghi nhận quyết định từ chối đề cương.'
          : 'Đã gửi yêu cầu chỉnh sửa đề cương cho nhóm.')
      : 'Không thể ghi nhận thao tác. Vui lòng tải lại và thử lại.')
    if (ok) setReason('')
  }

  const submitDepartment = async (decision: 'APPROVED' | 'REVISION_REQUIRED' | 'REJECTED') => {
    if ((decision === 'REJECTED' || decision === 'REVISION_REQUIRED') && !reason.trim()) {
      setMessage('Lý do là bắt buộc khi bộ môn yêu cầu chỉnh sửa hoặc không chấp thuận.')
      return
    }
    const title = decision === 'APPROVED'
      ? 'Đồng ý với tư cách bộ môn tham gia?'
      : decision === 'REVISION_REQUIRED'
        ? 'Yêu cầu chỉnh sửa với tư cách bộ môn tham gia?'
        : 'Từ chối với tư cách bộ môn tham gia?'
    const confirmLabel = decision === 'APPROVED'
      ? 'Ghi nhận đồng ý'
      : decision === 'REVISION_REQUIRED'
        ? 'Ghi nhận yêu cầu chỉnh sửa'
        : 'Ghi nhận từ chối'
    if (await requestConfirmation({ title, description: 'Quyết định của bộ môn được ghi nhận cho phiên bản đăng ký hiện tại; Khoa chủ trì sẽ tổng hợp phản hồi (POL-02) hoặc quyết định cuối.', confirmLabel, danger: decision === 'REJECTED' }) === null) return
    const ok = await review.decideParticipatingDepartment(decision, reason.trim() || undefined)
    setMessage(ok ? 'Đã ghi nhận quyết định của bộ môn và cập nhật hồ sơ.' : 'Không thể ghi nhận thao tác. Vui lòng tải lại và thử lại.')
    if (ok) setReason('')
  }

  const submitLeadOverride = async () => {
    const trimmed = overrideReason.trim()
    if (trimmed.length < 20) {
      setOverrideError('Lý do phê duyệt vượt quyền (Lead Override) phải có ít nhất 20 ký tự.')
      return
    }
    setOverrideError(null)
    const ok = await review.leadOverrideApprove(trimmed)
    if (ok) {
      setOverrideModalOpen(false)
      setOverrideReason('')
      setMessage('Đã thực hiện phê duyệt vượt quyền (Lead Override - POL-02) và thông báo cho các Khoa liên quan.')
    } else {
      setOverrideError(review.error?.message ?? 'Không thể phê duyệt vượt quyền lúc này.')
    }
  }

  const decisions = review.detail?.latestSubmission?.decisions ?? []
  const scope = review.detail?.academicScope ?? review.detail?.latestSubmission?.evidence.scope
  const isInterdisciplinary = scope?.projectMode === 'INTERDISCIPLINARY'
  const departmentIds = review.detail?.latestSubmission?.evidence.departmentIds ?? []
  const participatingSummary = summarizeParticipatingDecisions(departmentIds, decisions)
  const mayPresentFinalApproval = review.canApprove && (!isInterdisciplinary || participatingSummary === 'ALL_APPROVED')
  const snapshots = [...(review.reviewSnapshots?.items ?? [])].sort((a, b) => b.submissionNumber - a.submissionNumber)
  const [currentSnapshot, previousSnapshot] = snapshots
  const normalizedCurrentStatus = (review.workflow?.status ?? review.project?.status ?? '').replaceAll('_', '').toUpperCase()
  const isPostReviewApproved = ['APPROVED', 'SUPERVISORPENDING', 'ACTIVE', 'FINALSUBMISSION', 'COMPLETED', 'ARCHIVED'].includes(normalizedCurrentStatus)
  const isPostReviewRejected = ['REJECTED', 'CANCELLED'].includes(normalizedCurrentStatus)
  const isPostReviewFinalized = isPostReviewApproved || isPostReviewRejected
  const hasBackendApproval = !isPostReviewFinalized && (review.workflow?.actions?.some(action => action.code === 'approve_project') ?? false)

  return (
    <div className="workspace-page workspace-page--wide review-page mk-page-enter">
      <header className="workspace-heading review-page__header">
        <div className="workspace-heading-copy">
          <div className="workspace-context">
            <BackLink className="workspace-back-inline" fallback="/department/projects/review">
              <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
              <span>Danh sách thẩm định</span>
            </BackLink>
            <span className="workspace-context-sep" aria-hidden="true" />
            <span className="workspace-kicker">Hội đồng bộ môn</span>
          </div>
          <h1>Thẩm định đề cương</h1>
        </div>
        <Link className="review-page__open-link !mt-0" to={`/department/projects/${id}/result`}>
          Theo dõi đánh giá và công bố kết quả →
        </Link>
      </header>

      <section className="space-y-4">
        <h2 className="!mb-0 text-xl font-bold">{review.project?.title ?? (review.project?.code ? `${review.project.code} — Chưa có tên đề cương` : 'Hồ sơ đề cương')}</h2>
        <EntityIdentityStrip
          chips={[
            { icon: 'tag', label: 'Mã đồ án', value: review.project?.code ?? 'Đang cập nhật' },
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
      </section>

      <div className="review-page__detail-grid">
        <div className="review-page__detail-main">
          <ProjectProposalDetails review={review} />
          <ScopeSummary review={review} names={names} />
          {currentSnapshot?.evidence && previousSnapshot?.evidence && <section aria-label="So sánh hai lần nộp" className="space-y-3">
            <h2>Thay đổi ở lần nộp #{currentSnapshot.submissionNumber}</h2>
            <ChangeDiff beforeLabel={`LẦN NỘP #${previousSnapshot.submissionNumber}`} afterLabel={`LẦN NỘP #${currentSnapshot.submissionNumber}`} rows={[
              { label: 'Chế độ đồ án', before: displayLabel(previousSnapshot.evidence.scope.projectMode), after: displayLabel(currentSnapshot.evidence.scope.projectMode) },
              { label: 'Ngành chính', before: previousSnapshot.evidence.scope.primaryMajorId ? names.major(previousSnapshot.evidence.scope.primaryMajorId) : 'Không áp dụng', after: currentSnapshot.evidence.scope.primaryMajorId ? names.major(currentSnapshot.evidence.scope.primaryMajorId) : 'Không áp dụng' },
              { label: 'Số thành viên tối đa', before: previousSnapshot.evidence.policy.maxMembers, after: currentSnapshot.evidence.policy.maxMembers },
              { label: 'Số ngành tối thiểu', before: previousSnapshot.evidence.policy.minDistinctMajors, after: currentSnapshot.evidence.policy.minDistinctMajors },
              { label: 'Số thành viên', before: previousSnapshot.evidence.members.length, after: currentSnapshot.evidence.members.length },
              { label: 'Số bộ môn', before: previousSnapshot.evidence.departmentIds.length, after: currentSnapshot.evidence.departmentIds.length },
            ]} />
            <p className="text-sm text-ink-muted">So sánh dữ liệu bản ghi đăng ký; nội dung đề cương không nằm trong bản tổng hợp này.</p>
          </section>}
          <MajorRequirementEditor
            requirements={review.requirements?.requirements ?? scope?.requirements ?? []}
            projectMode={scope?.projectMode ?? ''}
            majors={majorOptions}
            busy={review.pending !== null}
            readOnly={!['DRAFT', 'REVISION_REQUIRED'].includes((review.workflow?.status ?? review.project?.status ?? '').toUpperCase())}
            onSave={review.replaceRequirements}
          />
          <section className="space-y-4">
            <h2>Lịch sử xử lý</h2>
            <HistoryTimeline items={review.history.map(item => ({ at: item.changedAt, actor: item.changedByName,
              action: <p>{item.oldStatus ? projectStatusLabel(item.oldStatus) : 'Khởi tạo'} → {projectStatusLabel(item.newStatus)}</p>, note: item.reason }))}
              emptyLabel="Chưa có lịch sử trạng thái." />
          </section>
          <DepartmentDecisionHistory
            snapshots={review.reviewSnapshots}
            departmentName={names.department}
            onPageChange={review.goToReviewSnapshotPage}
          />
        </div>

        <aside className="review-page__detail-rail">
          {review.detail?.slaState && review.detail.slaState !== 'ON_TIME' && (
            <div role="status" className={`rounded-xl border p-3.5 text-xs font-medium ${review.detail.slaState === 'ESCALATED_3WD' ? 'border-status-error-border bg-status-error-bg text-status-error-text' : 'border-status-warning-border bg-status-warning-bg text-status-warning-text'}`}>
              <p className="font-bold">
                {review.detail.slaState === 'ESCALATED_3WD'
                  ? `Quá hạn SLA đồng duyệt (${review.detail.elapsedWorkingDays ?? 3} ngày làm việc)`
                  : `Nhắc SLA thẩm định (${review.detail.elapsedWorkingDays ?? 2} ngày làm việc)`}
              </p>
              <p className="mt-1">
                {review.detail.slaState === 'ESCALATED_3WD'
                  ? 'Đơn vị phối hợp chưa phản hồi quá 3 ngày làm việc. Khoa chủ trì có thể phê duyệt vượt quyền (Lead Override) theo POL-02.'
                  : 'Hồ sơ đã chờ phản hồi từ 2 ngày làm việc trở lên.'}
              </p>
            </div>
          )}
          {review.detail?.consolidatedRevisionNotes && (
            <section className="rounded-xl border border-status-warning-border bg-status-warning-bg p-4 text-xs text-status-warning-text space-y-1">
              <h3 className="font-bold uppercase tracking-wider">Tổng hợp góp ý chỉnh sửa (POL-02)</h3>
              <p className="whitespace-pre-line">{review.detail.consolidatedRevisionNotes}</p>
            </section>
          )}
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
          <section className="space-y-4">
            <h2>Phản hồi thẩm định</h2>
            {isPostReviewFinalized ? (
              <div
                role="status"
                className={`rounded-xl border p-4 text-sm ${
                  isPostReviewApproved
                    ? 'border-status-success-border bg-status-success-bg text-status-success-text'
                    : 'border-status-error-border bg-status-error-bg text-status-error-text'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined mt-0.5 text-[20px]" aria-hidden="true">
                    {isPostReviewApproved ? 'verified' : 'cancel'}
                  </span>
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {isPostReviewApproved ? 'Đề cương đã hoàn tất thẩm định' : 'Đề cương đã bị từ chối'}
                    </p>
                    <p className="text-xs leading-relaxed opacity-90">
                      {isPostReviewApproved
                        ? `Đề cương đã được phê duyệt và đồ án hiện đang ở trạng thái "${projectStatusLabel(review.workflow?.status ?? review.project?.status ?? '')}". Không cần thao tác thẩm định thêm.`
                        : 'Đề cương đã kết thúc quy trình thẩm định với kết quả từ chối.'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to="/department/projects/review"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-hairline bg-card px-3 py-1.5 text-xs font-semibold text-ink hover:border-primary hover:text-primary"
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span>
                    Về danh sách chờ duyệt
                  </Link>
                  {isPostReviewApproved && (
                    <Link
                      to={`/department/projects/${id}/result`}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover"
                    >
                      Theo dõi đánh giá →
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <>
                <label className="sr-only" htmlFor="review-reason">Lý do thẩm định</label>
                {(review.canStart || review.canRequestRevision || review.canApprove || review.canReject || review.canApproveDepartment || review.canRejectDepartment) ? <textarea id="review-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Nhập lý do khi yêu cầu chỉnh sửa hoặc từ chối" /> : <p className="text-sm text-ink-muted">Hồ sơ hiện không có bước thẩm định cần xử lý.</p>}
                <div className="review-page__actions">
                  {review.canStart ? <Button disabled={review.pending !== null} onClick={() => void review.beginReview()}>Bắt đầu thẩm định</Button> : null}
                  {review.canRequestRevision ? <Button className="btn-revision" variant="secondary" disabled={review.pending !== null} onClick={() => void submit('revision')}>Yêu cầu chỉnh sửa</Button> : null}
                  {!hasBackendApproval && mayPresentFinalApproval ? <Button className="btn-approve" variant="primary" disabled={review.pending !== null} onClick={() => void submit('approve')}>Phê duyệt đề cương</Button> : null}
                  {!hasBackendApproval && review.canReject ? <Button className="btn-reject" variant="danger" disabled={review.pending !== null} onClick={() => void submit('reject')}>Từ chối đề cương</Button> : null}
                </div>
                {hasBackendApproval && <ActionVerdict actions={review.workflow!.actions} actionCode="approve_project" status="ready" okLabel="Điều kiện phê duyệt hợp lệ" blockedLabel="Chưa thể phê duyệt đề cương">
                  <ActionVerdict.Decision primary={{ label: 'Phê duyệt đề cương', onClick: () => void submit('approve'), disabled: review.pending !== null || !mayPresentFinalApproval }}
                    secondary={review.canReject ? { label: 'Từ chối đề cương', onClick: () => void submit('reject'), disabled: review.pending !== null } : undefined} />
                </ActionVerdict>}
                {isInterdisciplinary && review.canApprove && participatingSummary !== 'ALL_APPROVED' ? <p className="mt-2 text-sm text-ink-muted">Chỉ có thể phê duyệt cuối khi tất cả bộ môn tham gia đã đồng ý với phiên bản hiện tại.</p> : null}
                {isInterdisciplinary && review.canApprove && review.detail?.canLeadOverride && (
                  <div className="mt-3 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 space-y-2">
                    <p className="text-xs font-semibold text-status-warning-text">Quyền xử lý ngoại lệ Khoa chủ trì (POL-02)</p>
                    <Button variant="secondary" disabled={review.pending !== null} onClick={() => { setOverrideError(null); setOverrideModalOpen(true) }}>
                      Phê duyệt vượt quyền (Lead Override)
                    </Button>
                  </div>
                )}
              </>
            )}
            {review.pending ? <p role="status" className="text-sm text-ink-muted">Đang xử lý {pendingActionLabel[review.pending] ?? displayLabel(review.pending)}…</p> : null}
            {message ? <p role="status" className="rounded-lg border border-hairline bg-canvas p-3 text-sm font-medium text-ink">{message}</p> : null}
          </section>
        </aside>
      </div>
      {overrideModalOpen && (
        <Modal
          open
          title="Phê duyệt vượt quyền (Lead Override — POL-02)"
          description="Khoa chủ trì chịu trách nhiệm quyết định cuối sau khi quá 3 ngày làm việc hoặc khi có bất đồng ý kiến với Khoa phối hợp. Hành động này sẽ được ghi nhật ký kiểm toán và thông báo cho các bên."
          busy={review.pending === 'lead-override'}
          onClose={() => setOverrideModalOpen(false)}
        >
          <div className="space-y-3">
            <label htmlFor="lead-override-reason" className="block text-xs font-semibold text-ink-soft">
              Lý do phê duyệt vượt quyền (tối thiểu 20 ký tự) *
            </label>
            <textarea
              id="lead-override-reason"
              rows={4}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Nêu rõ căn cứ chuyên môn và trách nhiệm điều phối của Khoa chủ trì..."
              className="w-full rounded-lg border border-line-strong bg-card p-3 text-sm text-ink"
            />
            {overrideError && <p role="alert" className="text-xs font-medium text-status-error-text">{overrideError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" disabled={review.pending === 'lead-override'} onClick={() => setOverrideModalOpen(false)}>Hủy</Button>
              <Button type="button" disabled={review.pending === 'lead-override'} onClick={() => void submitLeadOverride()}>
                {review.pending === 'lead-override' ? 'Đang xử lý…' : 'Xác nhận Lead Override'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {confirmationDialog}
    </div>
  )
}
