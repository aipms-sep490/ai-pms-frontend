import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { useAcademicStructure } from '../../academic/hooks/useAcademicStructure'
import { createAcademicNameResolver, type AcademicNameResolver } from '../components/academic-name-resolver'
import { DepartmentDecisionHistory } from '../components/DepartmentDecisionHistory'
import { ParticipatingDepartmentPanel } from '../components/ParticipatingDepartmentPanel'
import { ProjectAcademicScopePanel } from '../components/ProjectAcademicScopePanel'
import { summarizeParticipatingDecisions } from '../components/participating-decision-summary'
import { useProjectReview } from '../hooks/useProjectReview'
import './project-review.css'

function ScopeSummary({ review, names }: { review: ReturnType<typeof useProjectReview>; names: AcademicNameResolver }) {
  const scope = review.detail?.academicScope ?? review.detail?.latestSubmission?.evidence.scope
  const evidence = review.detail?.latestSubmission?.evidence
  if (!scope) return <p>Backend chưa cung cấp academic scope.</p>

  return (
    <>
      <ProjectAcademicScopePanel scope={scope} names={names} members={evidence?.members} />
      {evidence ? <section aria-labelledby="review-scope-heading">
      <h2 id="review-scope-heading">Registration evidence</h2>
      <dl className="review-page__facts">
        <div><dt>Snapshot</dt><dd>#{review.detail?.latestSubmission?.id}</dd></div>
        <div><dt>Policy</dt><dd>{evidence.policy.minMembers}–{evidence.policy.maxMembers} members · {evidence.policy.minDistinctMajors} distinct majors</dd></div>
      </dl>
    </section> : <p>Backend chưa cung cấp registration snapshot.</p>}
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
        <div><dt>Project source</dt><dd>{project.proposalSource === 'PUBLISHED_TOPIC'
          ? <>Published Topic{project.selectedTopic ? ` · #${project.topicId ?? project.selectedTopic.id} · ${project.selectedTopic.code} — ${project.selectedTopic.title}` : project.topicId ? ` · #${project.topicId}` : ''}</>
          : 'Student Proposal'}</dd></div>
      </dl>
      <h3>Mô tả</h3>
      <p>{project.description || 'Backend chưa cung cấp mô tả.'}</p>
      <h3>Bối cảnh và vấn đề</h3>
      <p>{project.problemStatement || 'Backend chưa cung cấp problem statement.'}</p>
      <h3>Mục tiêu</h3>
      <p>{project.objectives || 'Backend chưa cung cấp mục tiêu.'}</p>
      <h3>Sản phẩm kỳ vọng</h3>
      <p>{project.expectedOutput || 'Backend chưa cung cấp sản phẩm kỳ vọng.'}</p>
    </section>
  )
}

export function ProjectReviewPage() {
  const { id } = useParams()
  const review = useProjectReview(id ? Number(id) : undefined)
  const academic = useAcademicStructure({ search: '', includeInactive: true })
  const names = useMemo(() => createAcademicNameResolver(academic.hierarchy), [academic.hierarchy])
  const [search, setSearch] = useState('')
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')

  if (review.isUnauthorized) return <p><Link to="/login">Đăng nhập lại để tiếp tục.</Link></p>
  if (review.loading) return <p>Đang tải Department Review…</p>
  if (review.isForbidden) return <p>Backend từ chối quyền hoặc Department scope. <Button onClick={() => void review.refresh()}>Thử lại</Button></p>
  if (review.error) return <p role="alert">{review.error.message} <Button onClick={() => void review.refresh()}>Refresh</Button></p>

  if (!id) {
    const queue = review.queue
    return (
      <div className="review-page">
        <h1>Department Project Review</h1>
        <form className="review-page__search" onSubmit={(event) => { event.preventDefault(); review.setSearch(search) }}>
          <label htmlFor="review-search">Search project</label>
          <input id="review-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Code, title, team" />
          <Button type="submit">Search</Button>
        </form>
        {(queue?.items ?? []).map((project) => (
          <article key={project.id}>
            <b>{project.code}</b>
            <h2>{project.title}</h2>
            <p>{project.teamName} · {project.status} · {project.majors.map((major) => major.majorCode).join(', ')}</p>
            <Link className="review-page__open-link" to={`/department/projects/review/${project.id}`}>Mở review</Link>
          </article>
        ))}
        {queue && queue.items.length === 0 ? <p>Không có project trong Department scope này.</p> : null}
        {queue && queue.totalPages && queue.totalPages > 1 ? <nav className="review-page__actions" aria-label="Queue pagination">
          <Button disabled={queue.page <= 1} onClick={() => review.goToPage(queue.page - 1)}>Previous</Button>
          <span>Page {queue.page} / {queue.totalPages}</span>
          <Button disabled={queue.page >= queue.totalPages} onClick={() => review.goToPage(queue.page + 1)}>Next</Button>
        </nav> : null}
      </div>
    )
  }

  const submit = async (kind: 'revision' | 'approve' | 'reject') => {
    if ((kind === 'revision' || kind === 'reject') && !reason.trim()) {
      setMessage('Lý do là bắt buộc cho revision hoặc reject.')
      return
    }
    if ((kind === 'approve' || kind === 'reject') && !confirm(`Xác nhận ${kind} project?`)) return
    const ok = await review.decide(kind, reason.trim() || undefined)
    setMessage(ok ? 'Backend đã xác nhận; dữ liệu review đã được làm mới.' : 'Thao tác không được Backend chấp nhận.')
    if (ok) setReason('')
  }

  const submitDepartment = async (decision: 'APPROVED' | 'REJECTED') => {
    if (decision === 'REJECTED' && !reason.trim()) {
      setMessage('Lý do là bắt buộc khi Department reject.')
      return
    }
    if (decision === 'REJECTED' && !confirm('Xác nhận từ chối với tư cách participating department?')) return
    const ok = await review.decideParticipatingDepartment(decision, reason.trim() || undefined)
    setMessage(ok ? 'Backend đã ghi nhận quyết định Department; dữ liệu đã được làm mới.' : 'Thao tác không được Backend chấp nhận.')
    if (ok) setReason('')
  }

  const decisions = review.detail?.latestSubmission?.decisions ?? []
  const scope = review.detail?.academicScope ?? review.detail?.latestSubmission?.evidence.scope
  const isInterdisciplinary = scope?.projectMode === 'INTERDISCIPLINARY'
  const departmentIds = review.detail?.latestSubmission?.evidence.departmentIds ?? []
  const participatingSummary = summarizeParticipatingDecisions(departmentIds, decisions)
  const mayPresentFinalApproval = review.canApprove && (!isInterdisciplinary || participatingSummary === 'ALL_APPROVED')
  return (
    <div className="review-page">
      <Link className="review-page__back-link" to="/department/projects/review">← Queue</Link>
      <h1>Project Review</h1>
      <section>
        <h2>{review.project?.code ?? `Project #${id}`} · {review.project?.title ?? 'Backend không cung cấp title'}</h2>
        <p>Team: {review.project?.teamName ?? '—'} · Status: {review.workflow?.status ?? review.project?.status ?? '—'}</p>
        <Link className="review-page__open-link" to={`/department/projects/${id}/result`}>Theo dõi Evaluation & công bố kết quả</Link>
      </section>
      <ProjectProposalDetails review={review} />
      <ScopeSummary review={review} names={names} />
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
        <h2>Review feedback</h2>
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Lý do bắt buộc khi revision, reject hoặc Department reject" />
        <div className="review-page__actions">
          {review.canStart ? <Button disabled={review.pending !== null} onClick={() => void review.beginReview()}>Start review</Button> : null}
          {review.canRequestRevision ? <Button className="btn-revision" variant="secondary" disabled={review.pending !== null} onClick={() => void submit('revision')}>Request revision</Button> : null}
          {mayPresentFinalApproval ? <Button className="btn-approve" variant="primary" disabled={review.pending !== null} onClick={() => void submit('approve')}>Approve project</Button> : null}
          {review.canReject ? <Button className="btn-reject" variant="danger" disabled={review.pending !== null} onClick={() => void submit('reject')}>Reject project</Button> : null}
        </div>
        {isInterdisciplinary && review.canApprove && participatingSummary !== 'ALL_APPROVED' ? <p className="mt-2 text-sm text-slate-600">Final approval is unavailable until every required participating Department has approved the current snapshot. A rejected decision does not change project state in the frontend.</p> : null}
        {review.pending ? <p role="status">Đang xử lý {review.pending}…</p> : null}
        {message ? <p role="status">{message}</p> : null}
      </section>
      <DepartmentDecisionHistory />
      <section>
        <h2>History</h2>
        {review.history.length ? review.history.map((item, index) => <p key={`${item.changedAt}-${index}`}>{item.oldStatus ?? '—'} → {item.newStatus} · {item.changedByName} · {item.reason ?? '—'}</p>) : <p>Chưa có lịch sử status.</p>}
      </section>
    </div>
  )
}
