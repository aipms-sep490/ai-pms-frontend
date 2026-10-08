import { displayLabel } from '../../../components/ui/display-label'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
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
        <div><dt>Phiên bản nộp</dt><dd>#{review.detail?.latestSubmission?.id}</dd></div>
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
    <section aria-labelledby="proposal-details-heading">
      <h2 id="proposal-details-heading">Nội dung đề cương</h2>
      <dl className="review-page__facts">
        <div><dt>Nhóm</dt><dd>{project.teamName}</dd></div>
        <div><dt>Ngành</dt><dd>{(project.majors ?? []).map((major) => `${major.majorCode} — ${major.majorName}`).join(', ') || '—'}</dd></div>
        <div><dt>Lĩnh vực</dt><dd>{tags('DOMAIN').join(', ') || '—'}</dd></div>
        <div><dt>Công nghệ</dt><dd>{tags('TECHNOLOGY').join(', ') || '—'}</dd></div>
        <div><dt>Từ khóa</dt><dd>{tags('KEYWORD').join(', ') || '—'}</dd></div>
        <div><dt>Ngày nộp</dt><dd>{project.submittedAt ? new Date(project.submittedAt).toLocaleString('vi-VN') : '—'}</dd></div>
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
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')

  if (review.isUnauthorized) return <p><Link to="/login">Đăng nhập lại để tiếp tục.</Link></p>
  if (review.loading) return <p>Đang tải danh sách thẩm định…</p>
  if (review.isForbidden) return <p>Bạn không có quyền thẩm định đề cương trong bộ môn này. <Button onClick={() => void review.refresh()}>Thử lại</Button></p>
  if (review.error) return <p role="alert">{review.error.message} <Button onClick={() => void review.refresh()}>Làm mới</Button></p>

  if (!id) {
    const queue = review.queue
    return (
      <div className="review-page mk-page-enter">
        <header className="review-page__header">
          <p>THẨM ĐỊNH ĐỀ CƯƠNG</p>
          <h1>Danh sách đề cương chờ xử lý</h1>
          <span>Tìm và mở hồ sơ đề cương thuộc phạm vi bộ môn của bạn.</span>
        </header>
        <form className="review-page__search" onSubmit={(event) => { event.preventDefault(); review.setSearch(search) }}>
          <label htmlFor="review-search">Tìm đề cương</label>
          <input id="review-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Mã, tên đề cương hoặc nhóm" />
          <Button type="submit">Tìm kiếm</Button>
        </form>
        {(queue?.items ?? []).map((project) => (
          <article key={project.id}>
            <b>{project.code}</b>
            <h2>{project.title}</h2>
            <p>{project.teamName} · {displayLabel(project.status)} · {project.majors.map((major) => major.majorCode).join(', ')}</p>
            <Link className="review-page__open-link" to={`/department/projects/review/${project.id}`}>Mở hồ sơ</Link>
          </article>
        ))}
        {queue && queue.items.length === 0 ? <p className="review-page__empty">Không có đề cương nào trong phạm vi bộ môn ở thời điểm này.</p> : null}
        {queue && queue.totalPages && queue.totalPages > 1 ? <nav className="review-page__actions" aria-label="Phân trang danh sách đề cương">
          <Button disabled={queue.page <= 1} onClick={() => review.goToPage(queue.page - 1)}>Trang trước</Button>
          <span>Trang {queue.page} / {queue.totalPages}</span>
          <Button disabled={queue.page >= queue.totalPages} onClick={() => review.goToPage(queue.page + 1)}>Trang sau</Button>
        </nav> : null}
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
  return (
    <div className="review-page mk-page-enter">
      <Link className="review-page__back-link" to="/department/projects/review">← Danh sách thẩm định</Link>
      <h1>Thẩm định đề cương</h1>
      <section>
        <h2>{review.project?.code ?? `Đồ án #${id}`} · {review.project?.title ?? 'Chưa có tên đề cương'}</h2>
        <p>Nhóm: {review.project?.teamName ?? '—'} · Trạng thái: {review.workflow?.status ?? review.project?.status ?? '—'}</p>
        <Link className="review-page__open-link" to={`/department/projects/${id}/result`}>Theo dõi đánh giá và công bố kết quả</Link>
      </section>
      <ProjectProposalDetails review={review} />
      <ScopeSummary review={review} names={names} />
      <MajorRequirementEditor
        requirements={review.requirements?.requirements ?? scope?.requirements ?? []}
        projectMode={scope?.projectMode ?? ''}
        majors={majorOptions}
        busy={review.pending !== null}
        readOnly={!['DRAFT', 'REVISION_REQUIRED'].includes((review.workflow?.status ?? review.project?.status ?? '').toUpperCase())}
        onSave={review.replaceRequirements}
      />
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
      <section>
        <h2>Phản hồi thẩm định</h2>
        <textarea aria-label="Phản hồi thẩm định" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Nhập lý do khi yêu cầu chỉnh sửa hoặc từ chối" />
        <div className="review-page__actions">
          {review.canStart ? <Button disabled={review.pending !== null} onClick={() => void review.beginReview()}>Bắt đầu thẩm định</Button> : null}
          {review.canRequestRevision ? <Button className="btn-revision" variant="secondary" disabled={review.pending !== null} onClick={() => void submit('revision')}>Yêu cầu chỉnh sửa</Button> : null}
          {mayPresentFinalApproval ? <Button className="btn-approve" variant="primary" disabled={review.pending !== null} onClick={() => void submit('approve')}>Phê duyệt đề cương</Button> : null}
          {review.canReject ? <Button className="btn-reject" variant="danger" disabled={review.pending !== null} onClick={() => void submit('reject')}>Từ chối đề cương</Button> : null}
        </div>
        {isInterdisciplinary && review.canApprove && participatingSummary !== 'ALL_APPROVED' ? <p className="mt-2 text-sm text-slate-600">Chỉ có thể phê duyệt cuối khi tất cả bộ môn tham gia đã đồng ý với phiên bản hiện tại.</p> : null}
        {review.pending ? <p role="status">Đang xử lý {review.pending}…</p> : null}
        {message ? <p role="status">{message}</p> : null}
      </section>
      <section>
        <h2>Lịch sử xử lý</h2>
        {review.history.length ? review.history.map((item, index) => <p key={`${item.changedAt}-${index}`}>{item.oldStatus ?? '—'} → {item.newStatus} · {item.changedByName} · {item.reason ?? '—'}</p>) : <p>Chưa có lịch sử trạng thái.</p>}
      </section>
      <DepartmentDecisionHistory
        snapshots={review.reviewSnapshots}
        departmentName={names.department}
        onPageChange={review.goToReviewSnapshotPage}
      />
      {confirmationDialog}
    </div>
  )
}
