import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { Button } from '../../components/ui/Button'
import { PageLoading } from '../../components/ui/PageLoading'
import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { HttpError } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import { CollaborationIntro, CollaborationPager, collaborationDate, collaborationError } from '../student-collaboration/collaboration-ui'
import * as api from './peer-eval-api'
import type { PeerEvaluationSubmission, PeerRound } from './peer-eval-types'

const peerStatusLabel: Record<string, string> = { OPEN: 'Đang mở', SCHEDULED: 'Sắp mở', EXPIRED: 'Đã hết hạn', CLOSED: 'Đã đóng' }

export function SupervisorPeerRoundsPage() {
  const { project, supervisor, routeBase } = useExecutionAccess()
  const canCreate = supervisor?.assignmentType === 'PRIMARY' && supervisor.isPrimary && !supervisor.endedAt
    && ['ACTIVE', 'FINAL_SUBMISSION'].includes(project.status.toUpperCase())
  return <WorkspacePage title="Đánh giá đồng đội" eyebrow="Theo dõi đóng góp" backTo={`${routeBase}/workspace`} description="Mở đợt phản hồi, theo dõi bài đã gửi và hiểu cách nhóm đang phối hợp.">
    <PeerRoundWorkspace key={project.id} projectId={project.id} canCreate={canCreate} />
  </WorkspacePage>
}

export function DepartmentPeerEvaluationsPage() {
  const projectId = Number(useParams().projectId)
  return <WorkspacePage title="Phản hồi đồng đội" eyebrow="Minh chứng đóng góp">{Number.isSafeInteger(projectId) && projectId > 0
    ? <PeerRoundWorkspace key={projectId} projectId={projectId} /> : <p>Đường dẫn đồ án không hợp lệ.</p>}</WorkspacePage>
}

export function PeerRoundWorkspace({ projectId, canCreate = false }: { projectId: number; canCreate?: boolean }) {
  const [page, setPage] = useState(1), [rounds, setRounds] = useState<PagedResult<PeerRound> | null>(null)
  const [selected, setSelected] = useState<PeerRound | null>(null), [revision, setRevision] = useState(0)
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false)
  const [formOpen, setFormOpen] = useState(false), [form, setForm] = useState({ title: '', opensAt: '', closesAt: '' })
  const mutation = useRef(false)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  useEffect(() => {
    const abort = new AbortController(); setRounds(null); setSelected(null)
    void api.getPeerRounds(projectId, page, 10, abort.signal).then(data => {
      if (abort.signal.aborted) return
      setRounds(data); setSelected(data.items[0] ?? null)
    }).catch(reason => { if (!abort.signal.aborted) setError(collaborationError(reason)) })
    return () => abort.abort()
  }, [projectId, page, revision])
  async function run(action: () => Promise<PeerRound>, success: string) {
    if (mutation.current) return
    mutation.current = true; setBusy(true); setError(''); setNotice('')
    try { await action(); setNotice(success); setFormOpen(false); setForm({ title: '', opensAt: '', closesAt: '' }); setPage(1); setRevision(value => value + 1) }
    catch (reason) { setError(collaborationError(reason)); if (reason instanceof HttpError && reason.status === 409) setRevision(value => value + 1) }
    finally { mutation.current = false; setBusy(false) }
  }
  function create(event: FormEvent) {
    event.preventDefault()
    const start = Date.parse(form.opensAt), end = Date.parse(form.closesAt)
    if (!canCreate) return
    if (!form.title.trim() || !Number.isFinite(start) || !Number.isFinite(end) || start >= end || end <= Date.now() || end - start > 90 * 86400000) {
      setError('Nhập tên đợt, thời điểm mở trước đóng, hạn đóng trong tương lai và khoảng thời gian tối đa 90 ngày.'); return
    }
    void run(() => api.createPeerRound(projectId, { title: form.title.trim(), opensAt: new Date(start).toISOString(), closesAt: new Date(end).toISOString() }), 'Đã tạo đợt đánh giá và chốt danh sách thành viên.')
  }
  async function close(round: PeerRound) {
    if (!round.canManage || busy) return
    if (await requestConfirmation({ title: `Đóng đợt “${round.title}”?`, description: 'Sinh viên không thể gửi thêm bài. Các bài đã gửi được giữ lại; thay đổi danh sách nhóm cần một đợt mới.', confirmLabel: 'Đóng đợt', danger: true }) === null) return
    void run(() => api.closePeerRound(projectId, round.id, round.concurrencyToken), 'Đã đóng đợt đánh giá.')
  }
  return <div className="collab">{confirmationDialog}
    <CollaborationIntro icon="forum" title="Lắng nghe từ từng thành viên">Phản hồi là minh chứng tham khảo, không cộng vào điểm chính thức. Bạn chỉ thấy bài và người được đánh giá trong phạm vi được cấp.</CollaborationIntro>
    {error && <div role="alert" className="collab-error">{error} <Button variant="ghost" onClick={() => { setError(''); setRevision(value => value + 1) }}>Tải lại</Button></div>}
    {notice && <p role="status" className="collab-note">{notice}</p>}
    {canCreate && <div><Button icon="add" disabled={busy || !rounds} onClick={() => setFormOpen(value => !value)} aria-expanded={formOpen}>Tạo đợt đánh giá</Button></div>}
    {formOpen && canCreate && <form className="collab-card collab-form" onSubmit={create}><h2>Một đợt phản hồi mới</h2>
      <label>Tên đợt<input required maxLength={200} value={form.title} disabled={busy} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Ví dụ: Nhìn lại sprint tháng 10" /></label>
      <div className="collab-score-grid"><label>Mở lúc<input required type="datetime-local" value={form.opensAt} disabled={busy} onChange={event => setForm({ ...form, opensAt: event.target.value })} /></label><label>Đóng lúc<input required type="datetime-local" value={form.closesAt} disabled={busy} onChange={event => setForm({ ...form, closesAt: event.target.value })} /></label></div>
      <p className="collab-muted">Thời gian theo múi giờ thiết bị ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Cần đóng đợt trước, kể cả đã hết hạn, trước khi tạo đợt mới.</p>
      <div className="collab-actions"><Button type="submit" disabled={busy}>Lưu đợt đánh giá</Button><Button variant="ghost" disabled={busy} onClick={() => setFormOpen(false)}>Hủy</Button></div>
    </form>}
    {!rounds && !error ? <PageLoading /> : rounds && <div className="collab-grid"><section className="collab-card collab-stack"><h2>Các đợt đánh giá</h2>
      {!rounds.items.length && <p className="collab-empty">Chưa có đợt đánh giá nào.</p>}
      {rounds.items.map(round => <div key={round.id} className="collab-section"><div className="collab-row"><Button variant={selected?.id === round.id ? 'secondary' : 'ghost'} aria-pressed={selected?.id === round.id} disabled={busy} onClick={() => setSelected(round)}>{round.title}</Button><span className="collab-muted">{peerStatusLabel[round.status] ?? round.status}</span></div><p className="collab-muted">{collaborationDate(round.opensAt)} — {collaborationDate(round.closesAt)}</p></div>)}
      <CollaborationPager page={page} total={rounds.totalCount} busy={busy} onChange={setPage} />
    </section><aside className="collab-card collab-stack"><h2>Danh sách được chốt</h2>{selected ? <><p className="collab-muted">{selected.memberCount} thành viên trong phạm vi được xem.</p>{selected.roster.map(member => <div key={member.userId}><strong>{member.fullName}</strong><p className="collab-muted">Ngành #{member.majorId}</p></div>)}{selected.canManage && selected.status !== 'CLOSED' && <Button variant="outline" disabled={busy} onClick={() => void close(selected)}>Đóng đợt này</Button>}</> : <p className="collab-muted">Chọn đợt để xem danh sách.</p>}</aside></div>}
    {selected && rounds && <PeerSubmissionList key={`${selected.id}:${revision}`} projectId={projectId} round={selected} />}
  </div>
}

function PeerSubmissionList({ projectId, round }: { projectId: number; round: PeerRound }) {
  const [page, setPage] = useState(1), [data, setData] = useState<PagedResult<PeerEvaluationSubmission> | null>(null), [error, setError] = useState(''), [retry, setRetry] = useState(0)
  useEffect(() => {
    const abort = new AbortController(); setData(null); setError('')
    void api.getPeerSubmissions(projectId, round.id, page, 10, abort.signal).then(result => { if (!abort.signal.aborted) setData(result) }).catch(reason => { if (!abort.signal.aborted) setError(collaborationError(reason)) })
    return () => abort.abort()
  }, [projectId, round.id, page, retry])
  const name = (id: number) => round.roster.find(member => member.userId === id)?.fullName ?? `Thành viên #${id}`
  return <section className="collab-card collab-stack"><div className="collab-row"><h2>Bài đã gửi · {round.title}</h2>{data && <span className="collab-muted">{data.totalCount} bài trong phạm vi được xem</span>}</div>
    {error ? <p role="alert" className="collab-error">{error} <Button variant="ghost" onClick={() => setRetry(value => value + 1)}>Thử lại</Button></p> : !data ? <PageLoading /> : <>
      {!data.items.length && <p className="collab-empty">Chưa có bài đã gửi trong phạm vi của bạn.</p>}
      {data.items.map(submission => <article className="collab-section collab-stack" key={submission.id}><div><h3>{name(submission.authorId)}</h3><p className="collab-muted">Gửi lúc {collaborationDate(submission.submittedAt)}</p></div>
        <div className="collab-score-grid">{submission.items.map(item => <div className="collab-score" key={item.targetUserId}><div className="collab-row"><h3>{name(item.targetUserId)}</h3><strong>{item.rating}<small>/5</small></strong></div><p className="whitespace-pre-wrap">{item.comment || 'Không có nhận xét.'}</p></div>)}</div>
      </article>)}<CollaborationPager page={page} total={data.totalCount} onChange={setPage} />
    </>}
  </section>
}
