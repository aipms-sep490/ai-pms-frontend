import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { useProjectReview } from '../hooks/useProjectReview'
import './project-review.css'

function ScopeSummary({ review }: { review: ReturnType<typeof useProjectReview> }) {
  const scope = review.detail?.academicScope ?? review.detail?.latestSubmission?.evidence.scope
  const evidence = review.detail?.latestSubmission?.evidence
  if (!scope || !evidence) return <p>Backend chưa cung cấp academic scope hoặc registration snapshot.</p>

  return (
    <section aria-labelledby="review-scope-heading">
      <h2 id="review-scope-heading">Academic scope & evidence</h2>
      <dl className="review-page__facts">
        <div><dt>Project mode</dt><dd>{scope.projectMode}</dd></div>
        <div><dt>Lead department</dt><dd>Department #{scope.leadDepartmentId}</dd></div>
        <div><dt>Primary major</dt><dd>{scope.primaryMajorId ?? 'Không áp dụng'}</dd></div>
        <div><dt>Snapshot</dt><dd>#{review.detail?.latestSubmission?.id}</dd></div>
        <div><dt>Policy</dt><dd>{evidence.policy.minMembers}–{evidence.policy.maxMembers} members · {evidence.policy.minDistinctMajors} distinct majors</dd></div>
        <div><dt>Project source</dt><dd>Backend contract chưa cung cấp provenance.</dd></div>
      </dl>
      <h3>Major requirements</h3>
      {scope.requirements.length ? <ul>{scope.requirements.map((requirement) => <li key={requirement.majorId}>Major #{requirement.majorId}: {requirement.minMembers}–{requirement.maxMembers} · {requirement.responsibility}</li>)}</ul> : <p>Không có major requirement trong contract.</p>}
      <h3>Team roster</h3>
      <ul>{evidence.members.map((member) => <li key={member.userId}>{member.fullName} · Major #{member.majorId}{member.isLeader ? ' · Leader' : ''}</li>)}</ul>
    </section>
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
  return (
    <div className="review-page">
      <Link className="review-page__back-link" to="/department/projects/review">← Queue</Link>
      <h1>Project Review</h1>
      <section>
        <h2>{review.project?.code ?? `Project #${id}`} · {review.project?.title ?? 'Backend không cung cấp title'}</h2>
        <p>Team: {review.project?.teamName ?? '—'} · Status: {review.workflow?.status ?? review.project?.status ?? '—'}</p>
      </section>
      <ProjectProposalDetails review={review} />
      <ScopeSummary review={review} />
      <section>
        <h2>Participating department decisions</h2>
        {decisions.length ? <ul>{decisions.map((decision) => <li key={decision.departmentId}>Department #{decision.departmentId}: <strong>{decision.decision}</strong>{decision.reason ? ` · ${decision.reason}` : ''}</li>)}</ul> : <p>Không có participating department decision trong snapshot này.</p>}
      </section>
      <section>
        <h2>Review feedback</h2>
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Lý do bắt buộc khi revision, reject hoặc Department reject" />
        <div className="review-page__actions">
          {review.canStart ? <Button disabled={review.pending !== null} onClick={() => void review.beginReview()}>Start review</Button> : null}
          {review.canRequestRevision ? <Button className="btn-revision" variant="secondary" disabled={review.pending !== null} onClick={() => void submit('revision')}>Request revision</Button> : null}
          {review.canApproveDepartment ? <Button disabled={review.pending !== null} onClick={() => void submitDepartment('APPROVED')}>Approve as participating department</Button> : null}
          {review.canRejectDepartment ? <Button className="btn-reject" variant="danger" disabled={review.pending !== null} onClick={() => void submitDepartment('REJECTED')}>Reject as participating department</Button> : null}
          {review.canApprove ? <Button className="btn-approve" variant="primary" disabled={review.pending !== null} onClick={() => void submit('approve')}>Approve project</Button> : null}
          {review.canReject ? <Button className="btn-reject" variant="danger" disabled={review.pending !== null} onClick={() => void submit('reject')}>Reject project</Button> : null}
        </div>
        {review.pending ? <p role="status">Đang xử lý {review.pending}…</p> : null}
        {message ? <p role="status">{message}</p> : null}
      </section>
      <section>
        <h2>History</h2>
        {review.history.length ? review.history.map((item, index) => <p key={`${item.changedAt}-${index}`}>{item.oldStatus ?? '—'} → {item.newStatus} · {item.changedByName} · {item.reason ?? '—'}</p>) : <p>Chưa có lịch sử status.</p>}
      </section>
    </div>
  )
}
